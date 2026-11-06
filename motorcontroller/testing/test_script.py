"""Live DShot thruster sweep and telemetry logger.

The board must emit one telemetry record per line while this program runs.
JSON is recommended, for example:

    {"thrust": 1.2, "erpm": 4200, "voltage": 16.1, "current_draw": 4.8, "temperature": 31}

Simple ``key=value`` records are also accepted.  The command format defaults
to the command interface in the motor-controller application.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import queue
import threading
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Mapping

import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D  # noqa: F401 - registers the 3D projection
import serial


FIELD_ALIASES = {
    "thrust": ("thrust", "thrust_force", "force"),
    "erpm": ("erpm", "e_rpm", "electrical_rpm"),
    "voltage": ("voltage", "esc_voltage", "bus_voltage"),
    "current_draw": ("current_draw", "current", "esc_current_draw"),
    "temperature": ("temperature", "temp", "esc_temperature"),
}
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
    "raw_telemetry",
)


@dataclass(frozen=True)
class Telemetry:
    values: dict[str, float]
    raw: str


def parse_number(value: Any) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) else None


def parse_telemetry(line: str) -> Telemetry | None:
    """Parse JSON or whitespace/comma-separated key=value telemetry."""
    text = line.strip()
    if not text:
        return None

    payload: Mapping[str, Any]
    try:
        decoded = json.loads(text)
    except json.JSONDecodeError:
        payload = {}
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
        payload = {str(key).lower(): value for key, value in decoded.items()}

    values: dict[str, float] = {}
    for field, aliases in FIELD_ALIASES.items():
        for alias in aliases:
            if alias in payload:
                number = parse_number(payload[alias])
                if number is not None:
                    values[field] = number
                break
    return Telemetry(values, text) if values else None


def serial_reader(
    port: serial.Serial, telemetry_queue: queue.Queue[Telemetry], stop_event: threading.Event
) -> None:
    while not stop_event.is_set():
        try:
            line = port.readline().decode("utf-8", errors="replace")
        except serial.SerialException as exc:
            print(f"Serial read failed: {exc}")
            stop_event.set()
            return
        telemetry = parse_telemetry(line)
        if telemetry is not None:
            telemetry_queue.put(telemetry)


def send_command(port: serial.Serial, command: str) -> None:
    port.write((command.rstrip("\r\n") + "\r").encode("ascii"))
    port.flush()


def value_or_nan(values: Mapping[str, float], field: str) -> float:
    return values.get(field, math.nan)


class SweepLogger:
    def __init__(self, path: Path, flush_interval: float) -> None:
        self.file = path.open("w", newline="", encoding="utf-8")
        self.writer = csv.DictWriter(self.file, fieldnames=CSV_FIELDS)
        self.writer.writeheader()
        self.flush_interval = flush_interval
        self.last_flush = time.monotonic()
        self.rows: list[dict[str, Any]] = []

    def append(self, row: dict[str, Any]) -> None:
        self.writer.writerow(row)
        self.rows.append(row)
        now = time.monotonic()
        if now - self.last_flush >= self.flush_interval:
            self.file.flush()
            self.last_flush = now

    def close(self) -> None:
        self.file.flush()
        self.file.close()


class LivePlot:
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
    values = list(range(start, stop + (1 if step > 0 else -1), step))
    return values + (values[-2:0:-1] if bidirectional and len(values) > 2 else [])


def make_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", required=True, help="UART port, e.g. COM7 or /dev/ttyACM0")
    parser.add_argument("--baudrate", type=int, default=115200)
    parser.add_argument("--channel", type=int, default=0)
    parser.add_argument("--start", type=int, default=48, help="First DShot value")
    parser.add_argument("--stop", type=int, default=2047, help="Last DShot value")
    parser.add_argument("--step", type=int, default=48)
    parser.add_argument("--dwell", type=float, default=1.0, help="Seconds at each value")
    parser.add_argument("--cycles", type=int, default=0, help="0 means repeat until Ctrl-C")
    parser.add_argument(
        "--command-template",
        default="dshot setthrottle {channel} {dshot}",
        help="Command sent for each point; placeholders: channel, dshot",
    )
    parser.add_argument(
        "--telemetry-command",
        help="Optional command requested before each point, e.g. 'telemetry read'",
    )
    parser.add_argument("--output", type=Path, default=Path("thruster_test.csv"))
    parser.add_argument("--flush-interval", type=float, default=2.0)
    return parser


def run(args: argparse.Namespace) -> None:
    if args.start < 0 or args.stop > 2047 or args.start > args.stop:
        raise ValueError("DShot values must satisfy 0 <= start <= stop <= 2047")
    if args.step <= 0 or args.dwell <= 0 or args.cycles < 0:
        raise ValueError("step and dwell must be positive; cycles cannot be negative")

    values = dshot_values(args.start, args.stop, args.step, bidirectional=True)
    output = args.output.resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    stop_event = threading.Event()
    telemetry_queue: queue.Queue[Telemetry] = queue.Queue()
    live_plot = LivePlot()
    started = time.monotonic()
    record_id = 0

    with serial.Serial(args.port, args.baudrate, timeout=0.1) as port:
        reader = threading.Thread(
            target=serial_reader, args=(port, telemetry_queue, stop_event), daemon=True
        )
        reader.start()
        logger = SweepLogger(output, args.flush_interval)
        try:
            while not stop_event.is_set() and (args.cycles == 0 or record_id < args.cycles * len(values)):
                dshot = values[record_id % len(values)]
                command = args.command_template.format(channel=args.channel, dshot=dshot)
                send_command(port, command)
                if args.telemetry_command:
                    send_command(port, args.telemetry_command)

                deadline = time.monotonic() + args.dwell
                latest: Telemetry | None = None
                while time.monotonic() < deadline and not stop_event.is_set():
                    try:
                        latest = telemetry_queue.get(timeout=0.1)
                    except queue.Empty:
                        pass
                telemetry_values = latest.values if latest else {}
                row = {
                    "id": record_id,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "elapsed_s": round(time.monotonic() - started, 3),
                    "channel": args.channel,
                    "dshot_value": dshot,
                    "thrust": value_or_nan(telemetry_values, "thrust"),
                    "erpm": value_or_nan(telemetry_values, "erpm"),
                    "voltage": value_or_nan(telemetry_values, "voltage"),
                    "current_draw": value_or_nan(telemetry_values, "current_draw"),
                    "temperature": value_or_nan(telemetry_values, "temperature"),
                    "raw_telemetry": latest.raw if latest else "",
                }
                logger.append(row)
                live_plot.update(row)
                record_id += 1
                print(
                    f"id={row['id']} dshot={dshot} thrust={row['thrust']} "
                    f"erpm={row['erpm']} voltage={row['voltage']} "
                    f"current={row['current_draw']}"
                    f" temperature={row['temperature']}"
                )
        finally:
            send_command(port, args.command_template.format(channel=args.channel, dshot=0))
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