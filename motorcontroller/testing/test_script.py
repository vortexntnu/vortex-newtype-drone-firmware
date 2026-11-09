"""Live DShot thruster sweep and telemetry logger.

The board must forward telemetry to the PC while this program runs. Text
telemetry can be JSON, for example:

    {"thrust": 1.2, "erpm": 4200, "voltage": 16.1, "current_draw": 4.8,
     "temperature": 31, "consumption": 12}

The ESC binary frame is also supported with ``--telemetry-format binary``.
The current ESC firmware receives that frame on the STM32; it must explicitly
forward it over the PC-facing UART before this script can decode it.

The two load-cell readings measure opposing thrust directions. DShot values
48-1047 use ``weight1`` and produce positive thrust. DShot values 1048-2047
use ``weight2`` and produce negative thrust. The weights are tared before the
sweep.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import queue
import re
import struct
import threading
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Mapping

import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D  # noqa: F401 - registers the 3D projection
import serial


# Physical setup and telemetry protocol constants.
GRAVITY_M_S2 = 9.80665
THRUSTER_PIVOT_DISTANCE_M = 0.51
WEIGHT_PIVOT_DISTANCE_M = 0.230

WEIGHT_CALIBRATION_FACTOR = 587.0/1310.0  # Actual weight / measured weight in grams

DEFAULT_CHARACTER_DELAY_S = 0.05
MINIMUM_CHARACTER_DELAY_S = 0.05
MINIMUM_THROTTLE_VALUE = 48
MAXIMUM_DSHOT_VALUE = 2047
DIRECTION_ONE_MAX_DSHOT = 1047
DIRECTION_TWO_MIN_DSHOT = 1048
THRUSTER_STOP_SETTLE_S = 1.0
TARE_SETTLE_S = 1.0
LOW_VOLTAGE_LIMIT_V = 12.5
LOW_VOLTAGE_SAMPLE_LIMIT = 5
IMMEDIATE_LOW_VOLTAGE_LIMIT_V = 12.0
CSV_WRITE_BATCH_SIZE = 25   


FIELD_ALIASES = {
    "thrust": ("thrust", "thrust_force", "force"),
    "weight1": ("weight1", "weight_1", "load1", "load_1"),
    "weight2": ("weight2", "weight_2", "load2", "load_2"),
    "erpm": ("erpm", "e_rpm", "electrical_rpm"),
    "voltage": ("voltage", "esc_voltage", "bus_voltage"),
    "current_draw": ("current_draw", "current", "esc_current_draw"),
    "temperature": ("temperature", "temp", "esc_temperature"),
    "consumption": ("consumption", "consumption_mah", "mah"),
}


ESC_FRAME_SIZE = 10
CSV_FIELDS = (
    "id",
    "timestamp",
    "elapsed_s",
    "channel",
    "dshot_value",
    "thrust",
    "erpm",
    "voltage",
    "current_draw",
    "temperature",
    "consumption",
    "weight_difference",
    "weight1",
    "weight2",
    "raw_telemetry",
)


@dataclass(frozen=True)
class Telemetry:
    """One decoded telemetry sample and its original source data."""

    values: dict[str, float]
    raw: str


# Telemetry decoding ---------------------------------------------------------


def parse_number(value: Any) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) else None


def signed_weight_grams_to_thrust_newtons(signed_weight_grams: float) -> float:
    """Convert signed opposing load-cell readings to thrust in newtons."""
    weight_force_newtons = signed_weight_grams / 1000.0 * GRAVITY_M_S2
    return weight_force_newtons * WEIGHT_CALIBRATION_FACTOR #WEIGHT_PIVOT_DISTANCE_M / THRUSTER_PIVOT_DISTANCE_M


def thrust_from_directional_weights(
    values: Mapping[str, float], dshot: int
) -> float:
    """Convert the load cell for the active DShot direction to thrust."""
    if dshot <= DIRECTION_ONE_MAX_DSHOT:
        weight_grams = values.get("weight1", math.nan)
        direction = 1.0
    else:
        weight_grams = values.get("weight2", math.nan)
        direction = -1.0
    if not math.isfinite(weight_grams):
        return math.nan
    return direction * signed_weight_grams_to_thrust_newtons(weight_grams)


def parse_text_payload(text: str) -> Mapping[str, Any] | None:
    """Extract a mapping from JSON, terminal-wrapped JSON, or key=value text."""
    try:
        decoded = json.loads(text)
    except json.JSONDecodeError:
        json_match = re.search(r"\{.*\}", text)
        if json_match is not None:
            try:
                decoded = json.loads(json_match.group())
            except json.JSONDecodeError:
                decoded = None
            if isinstance(decoded, dict):
                return {str(key).lower(): value for key, value in decoded.items()}
            else:
                return None
        else:
            payload: dict[str, Any] = {}
            for token in text.replace(",", " ").split():
                if "=" not in token:
                    continue
                key, value = token.split("=", 1)
                payload[key.strip().lower()] = value.strip()
            if not payload:
                return None
    else:
        if not isinstance(decoded, dict):
            return None
        return {str(key).lower(): value for key, value in decoded.items()}
    return payload


def values_from_payload(payload: Mapping[str, Any]) -> dict[str, float]:
    values: dict[str, float] = {}
    for field, aliases in FIELD_ALIASES.items():
        for alias in aliases:
            if alias in payload:
                number = parse_number(payload[alias])
                if number is not None:
                    values[field] = number
                break
    if "weight1" in values and "weight2" in values:
        values["weight_difference"] = values["weight1"] - values["weight2"]
    return values


def parse_telemetry(line: str) -> Telemetry | None:
    """Parse one line of firmware telemetry."""
    text = line.strip()
    if not text:
        return None
    payload = parse_text_payload(text)
    if payload is None:
        return None
    values = values_from_payload(payload)
    return Telemetry(values, text) if values else None


def crc8(data: bytes) -> int:
    """Calculate the CRC-8 used by the ESC telemetry protocol."""
    crc = 0
    for byte in data:
        crc ^= byte
        for _ in range(8):
            crc = ((crc << 1) ^ 0xD5) & 0xFF if crc & 0x80 else (crc << 1) & 0xFF
    return crc


def parse_binary_telemetry(frame: bytes, validate_crc: bool) -> Telemetry:
    """Decode the 10-byte ESC frame used by esc.c."""
    if len(frame) != ESC_FRAME_SIZE:
        raise ValueError(f"Expected {ESC_FRAME_SIZE} telemetry bytes, received {len(frame)}")
    if validate_crc and crc8(frame[:9]) != frame[9]:
        raise ValueError("Invalid ESC telemetry CRC")

    temperature, voltage, current, consumption, erpm_raw, _crc = struct.unpack(
        ">BHHHHB", frame
    )
    return Telemetry(
        {
            "temperature": float(temperature),
            "voltage": voltage / 100.0,
            "current_draw": current / 100.0,
            "consumption": float(consumption),
            "erpm": float(erpm_raw * 100),
        },
        frame.hex(),
    )


def serial_reader(
    port: serial.Serial,
    telemetry_queue: queue.Queue[Telemetry],
    stop_event: threading.Event,
    telemetry_format: str,
    validate_crc: bool,
) -> None:
    """Read telemetry in a background thread until stopped."""
    while not stop_event.is_set():
        try:
            if telemetry_format == "binary":
                frame = port.read(ESC_FRAME_SIZE)
                if len(frame) != ESC_FRAME_SIZE:
                    continue
                telemetry_queue.put(parse_binary_telemetry(frame, validate_crc))
            else:
                line = port.readline().decode("utf-8", errors="replace")
                telemetry = parse_telemetry(line)
                if telemetry is not None:
                    telemetry_queue.put(telemetry)
        except serial.SerialException as exc:
            print(f"Serial read failed: {exc}")
            stop_event.set()
            return
        except ValueError as exc:
            print(f"Telemetry frame rejected: {exc}")


def send_command(
    port: serial.Serial,
    command: str,
    character_delay: float = DEFAULT_CHARACTER_DELAY_S,
) -> None:
    """Send one command slowly enough for the STM32 command receiver."""
    if len(command) > 30:
        raise ValueError("Command exceeds the firmware's 30-character input limit")
    if character_delay < MINIMUM_CHARACTER_DELAY_S:
        raise ValueError(
            f"Character delay must be at least {MINIMUM_CHARACTER_DELAY_S:.2f} seconds"
        )

    command_line = command.rstrip("\r\n") + "\r"
    for index, character in enumerate(command_line):
        port.write(character.encode("ascii"))
        port.flush()
        if index < len(command_line) - 1:
            time.sleep(character_delay)


def make_dshot_command(template: str, channel: int, dshot: int) -> str:
    return template.format(channel=channel, throttle=dshot, dshot=dshot)


def value_or_nan(values: Mapping[str, float], field: str) -> float:
    return values.get(field, math.nan)


# Data storage and plotting --------------------------------------------------


class SweepLogger:
    """Buffer measurements and write them to disk in batches."""

    def __init__(self, path: Path, metadata: Mapping[str, object]) -> None:
        self.file = path.open("w", newline="", encoding="utf-8")
        for key, value in metadata.items():
            self.file.write(f"# {key}={value}\n")
        self.writer = csv.DictWriter(self.file, fieldnames=CSV_FIELDS)
        self.writer.writeheader()
        self.pending_rows: list[dict[str, Any]] = []

    def append(self, row: dict[str, Any]) -> None:
        self.pending_rows.append(row)
        if len(self.pending_rows) >= CSV_WRITE_BATCH_SIZE:
            self.write_pending()

    def write_pending(self) -> None:
        if not self.pending_rows:
            return
        self.writer.writerows(self.pending_rows)
        self.pending_rows.clear()
        self.file.flush()

    def close(self) -> None:
        try:
            self.write_pending()
        finally:
            self.file.close()


class LivePlot:
    """Display accumulated sweep data in a live 3D scatter plot."""

    def __init__(self) -> None:
        self.rows: list[dict[str, Any]] = []
        self.figure = plt.figure("Live thruster sweep")
        self.axes = self.figure.add_subplot(111, projection="3d")
        plt.ion()
        plt.show(block=False)

    def update(self, row: dict[str, Any]) -> None:
        self.rows.append(row)
        valid = [
            item for item in self.rows
            if all(math.isfinite(float(item[field])) for field in ("voltage", "thrust"))
        ]
        self.axes.clear()
        self.axes.set_xlabel("Voltage (V)")
        self.axes.set_ylabel("DShot value")
        self.axes.set_zlabel("Thrust")
        if valid:
            self.axes.scatter(
                [item["voltage"] for item in valid],
                [item["dshot_value"] for item in valid],
                [item["thrust"] for item in valid],
                c=[item["current_draw"] for item in valid],
                cmap="viridis",
            )
        self.figure.canvas.draw_idle()
        self.figure.canvas.flush_events()
        plt.pause(0.001)


def dshot_values(start: int, stop: int, step: int, bidirectional: bool) -> list[int]:
    if step == 0:
        raise ValueError("step cannot be zero")
    values = list(range(start, stop + (1 if step > 0 else -1), step))
    return values + (values[-2:0:-1] if bidirectional and len(values) > 2 else [])


# Sweep execution ------------------------------------------------------------


def build_data_row(
    sample_id: int,
    started_at: float,
    channel: int,
    dshot: int,
    telemetry: Telemetry | None,
) -> dict[str, Any]:
    """Combine the requested DShot value with the latest telemetry sample."""
    values = telemetry.values if telemetry is not None else {}
    thrust = value_or_nan(values, "thrust")
    if not math.isfinite(thrust):
        thrust = thrust_from_directional_weights(values, dshot)
    voltage = value_or_nan(values, "voltage")
    current_draw = value_or_nan(values, "current_draw")
    return {
        "id": sample_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "elapsed_s": round(time.monotonic() - started_at, 3),
        "channel": channel,
        "dshot_value": dshot,
        "thrust": thrust,
        "erpm": value_or_nan(values, "erpm"),
        "voltage": voltage,
        "current_draw": current_draw,
        "temperature": value_or_nan(values, "temperature"),
        "consumption": value_or_nan(values, "consumption"),
        "weight1": value_or_nan(values, "weight1"),
        "weight2": value_or_nan(values, "weight2"),
        "weight_difference": value_or_nan(values, "weight_difference"),
        "raw_telemetry": telemetry.raw if telemetry is not None else "",
    }


def average_telemetry(samples: list[Telemetry]) -> Telemetry | None:
    """Return the field-by-field average of all samples in one dwell period."""
    if not samples:
        return None

    fields = set().union(*(sample.values for sample in samples))
    values = {
        field: sum(
            sample.values[field]
            for sample in samples
            if field in sample.values
        )
        / sum(field in sample.values for sample in samples)
        for field in fields
    }
    return Telemetry(values, samples[-1].raw)


def wait_for_telemetry(
    telemetry_queue: queue.Queue[Telemetry],
    duration: float,
    stop_event: threading.Event,
    low_voltage_count: list[int],
    low_voltage_limit: float,
    low_voltage_sample_limit: int,
) -> tuple[Telemetry | None, bool, bool]:
    """Average one dwell period and apply the battery safety cutoffs."""
    deadline = time.monotonic() + duration
    samples: list[Telemetry] = []
    battery_cutoff = False
    immediate_cutoff = False
    while time.monotonic() < deadline and not stop_event.is_set():
        try:
            sample = telemetry_queue.get(timeout=0.1)
            samples.append(sample)
            voltage = sample.values.get("voltage")
            if voltage is not None and voltage < IMMEDIATE_LOW_VOLTAGE_LIMIT_V:
                battery_cutoff = True
                immediate_cutoff = True
                stop_event.set()
                break
            if voltage is not None and voltage <= low_voltage_limit:
                low_voltage_count[0] += 1
                if low_voltage_count[0] >= low_voltage_sample_limit:
                    battery_cutoff = True
                    stop_event.set()
                    break
            else:
                low_voltage_count[0] = 0
        except queue.Empty:
            pass
    return average_telemetry(samples), battery_cutoff, immediate_cutoff


def print_data_row(row: Mapping[str, Any]) -> None:
    print(
        f"id={row['id']} dshot={row['dshot_value']} thrust={row['thrust']} "
        f"erpm={row['erpm']} voltage={row['voltage']} "
        f"current={row['current_draw']} consumption={row['consumption']} "
        f"temperature={row['temperature']}"
    )


def prepare_thruster_test(
    port: serial.Serial,
    channel: int,
    command_template: str,
    character_delay: float,
) -> None:
    """Stop the thruster and tare both load cells before sweeping."""
    send_command(
        port,
        make_dshot_command(command_template, channel, 0),
        character_delay,
    )
    time.sleep(THRUSTER_STOP_SETTLE_S)
    send_command(port, "weight tareall", character_delay)
    time.sleep(TARE_SETTLE_S)


def automatic_output_path(args: argparse.Namespace) -> Path:
    """Build a short timestamped output filename."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    return Path(f"thruster_test_{timestamp}.csv")


def test_metadata(args: argparse.Namespace) -> dict[str, object]:
    """Return all settings that should be recorded with the measurements."""
    return {
        "created_at": datetime.now(timezone.utc).isoformat(),
        "port": args.port,
        "baudrate": args.baudrate,
        "channel": args.channel,
        "start": args.start,
        "stop": args.stop,
        "step": args.step,
        "dwell": args.dwell,
        "cycles": args.cycles,
        "character_delay": args.character_delay,
        "telemetry_format": args.telemetry_format,
        "validate_telemetry_crc": args.validate_telemetry_crc,
        "low_voltage_limit": args.low_voltage_limit,
        "low_voltage_samples": args.low_voltage_samples,
        "immediate_low_voltage_limit": IMMEDIATE_LOW_VOLTAGE_LIMIT_V,
        "command_template": args.command_template,
        "telemetry_command": args.telemetry_command or "",
    }


def make_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", required=True, help="UART port, e.g. COM7 or /dev/ttyACM0")
    parser.add_argument("--baudrate", type=int, default=115200)
    parser.add_argument(
        "--character-delay",
        type=float,
        default=DEFAULT_CHARACTER_DELAY_S,
        help="Seconds between command characters; minimum is 0.05 for this firmware",
    )
    parser.add_argument(
        "--telemetry-format",
        choices=("text", "binary"),
        default="text",
        help="Telemetry received from the STM32; text matches controller_weight() JSON",
    )
    parser.add_argument(
        "--validate-telemetry-crc",
        action="store_true",
        help="Validate byte 10 using the CRC-8 polynomial from esc.c",
    )
    parser.add_argument("--channel", type=int, default=0)
    parser.add_argument(
        "--start", type=int, default=48, help="First throttle value (48-2047)"
    )
    parser.add_argument(
        "--stop", type=int, default=2047, help="Last throttle value (48-2047)"
    )
    parser.add_argument("--step", type=int, default=48)
    parser.add_argument(
        "--dwell",
        type=float,
        default=1.0,
        help="Seconds collecting measurements at each value; all are averaged",
    )
    parser.add_argument(
        "--low-voltage-limit",
        type=float,
        default=LOW_VOLTAGE_LIMIT_V,
        help="Stop at or below this voltage after the sample limit",
    )
    parser.add_argument(
        "--low-voltage-samples",
        type=int,
        default=LOW_VOLTAGE_SAMPLE_LIMIT,
        help="Consecutive low-voltage samples required for an emergency stop",
    )
    parser.add_argument("--cycles", type=int, default=0, help="0 means repeat until Ctrl-C")
    parser.add_argument(
        "--command-template",
        default="dshot setthrottle {channel} {dshot}",
        help=(
            "Command sent for each point; placeholders: channel, dshot, throttle. "
            "Default matches the firmware command interface."
        ),
    )
    parser.add_argument(
        "--telemetry-command",
        help="Optional command requested before each point, e.g. 'telemetry read'",
    )
    parser.add_argument(
        "--output",
        type=Path,
        help="Output CSV path; otherwise a timestamped settings filename is generated",
    )
    return parser


def run(args: argparse.Namespace) -> None:
    """Run the configured sweep and save every measurement."""
    if (
        args.start < MINIMUM_THROTTLE_VALUE
        or args.start > MAXIMUM_DSHOT_VALUE
        or args.stop < MINIMUM_THROTTLE_VALUE
        or args.stop > MAXIMUM_DSHOT_VALUE
        or args.start == args.stop
    ):
        raise ValueError(
            "Sweep values must be different and satisfy 48 <= start/stop <= 2047; "
            "DShot values 0-47 are reserved commands"
        )
    if args.step == 0:
        raise ValueError("step cannot be zero")
    if (args.start < args.stop and args.step < 0) or (
        args.start > args.stop and args.step > 0
    ):
        raise ValueError("step must move from start toward stop")
    if (
        args.dwell <= 0
        or args.cycles < 0
        or args.low_voltage_samples <= 0
        or args.low_voltage_limit <= 0
    ):
        raise ValueError(
            "dwell, voltage limit, and voltage sample count must be positive; "
            "cycles cannot be negative"
        )

    values = dshot_values(args.start, args.stop, args.step, bidirectional=True)
    output = (args.output or automatic_output_path(args)).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    stop_event = threading.Event()
    telemetry_queue: queue.Queue[Telemetry] = queue.Queue()
    live_plot = LivePlot()
    started = time.monotonic()
    record_id = 0
    low_voltage_count = [0]

    with serial.Serial(args.port, args.baudrate, timeout=0.1) as port:
        prepare_thruster_test(
            port,
            args.channel,
            args.command_template,
            args.character_delay,
        )
        reader = threading.Thread(
            target=serial_reader,
            args=(
                port,
                telemetry_queue,
                stop_event,
                args.telemetry_format,
                args.validate_telemetry_crc,
            ),
            daemon=True,
        )
        reader.start()
        logger = SweepLogger(output, test_metadata(args))
        try:
            while not stop_event.is_set() and (args.cycles == 0 or record_id < args.cycles * len(values)):
                dshot = values[record_id % len(values)]
                command = make_dshot_command(args.command_template, args.channel, dshot)
                send_command(port, command, args.character_delay)
                if args.telemetry_command:
                    send_command(port, args.telemetry_command, args.character_delay)

                average, battery_cutoff, immediate_cutoff = wait_for_telemetry(
                    telemetry_queue,
                    args.dwell,
                    stop_event,
                    low_voltage_count,
                    args.low_voltage_limit,
                    args.low_voltage_samples,
                )
                row = build_data_row(record_id, started, args.channel, dshot, average)
                logger.append(row)
                live_plot.update(row)
                record_id += 1
                print_data_row(row)
                if battery_cutoff:
                    last_voltage = average.values.get("voltage") if average else None
                    if immediate_cutoff:
                        print(
                            f"Battery voltage dropped below "
                            f"{IMMEDIATE_LOW_VOLTAGE_LIMIT_V:.2f} V; stopping test."
                        )
                    else:
                        print(
                            f"Battery voltage stayed at or below "
                            f"{args.low_voltage_limit:.2f} V for "
                            f"{args.low_voltage_samples} samples; stopping test."
                        )
                    break
        finally:
            send_command(
                port,
                make_dshot_command(args.command_template, args.channel, 0),
                args.character_delay,
            )
            logger.close()
            stop_event.set()


def main() -> None:
    args = make_parser().parse_args()
    try:
        run(args)
    except KeyboardInterrupt:
        print("\nThruster test stopped by user.")
    except (OSError, serial.SerialException, ValueError) as exc:
        raise SystemExit(f"Thruster test failed: {exc}") from exc


if __name__ == "__main__":
    main()