"""
Adaptive thruster test that plans for unexplored voltage/DShot cells.

The planner uses historical CSV files as a coverage map. At each dwell it
chooses the DShot value with the most expected new coverage per second, while
penalizing large DShot changes.
"""

from __future__ import annotations

import argparse
import csv
import math
import queue
import statistics
import threading
import time
from dataclasses import dataclass
from pathlib import Path

import matplotlib.pyplot as plt

import test_script as base


DEFAULT_VOLTAGE_BIN = 0.05
DEFAULT_DSHOT_STEP = 8
DEFAULT_SLEW_PENALTY = 0.35
DEFAULT_BATTERY_RESISTANCE = 0.02
DEFAULT_MAX_DURATION = 3600.0
DEFAULT_BATTERY_CAPACITY_MAH = 8500.0


@dataclass(frozen=True)
class HistoricalPoint:
    voltage: float
    current: float
    consumption: float
    dshot: int
    elapsed_s: float
    source: str


def read_historical_points(folder: Path) -> list[HistoricalPoint]:
    """Read valid voltage/DShot/time points from all CSV files in a folder."""
    paths = sorted(folder.glob("*.csv"))
    if not paths:
        raise ValueError(f"Data folder contains no CSV files: {folder}")

    points: list[HistoricalPoint] = []
    for path in paths:
        with path.open(newline="", encoding="utf-8-sig") as file:
            rows = csv.DictReader(line for line in file if not line.startswith("#"))
            required = {
                "voltage",
                "current_draw",
                "consumption",
                "dshot_value",
                "elapsed_s",
            }
            if rows.fieldnames is None or not required.issubset(rows.fieldnames):
                continue
            for row in rows:
                try:
                    voltage = float(row["voltage"])
                    current = float(row["current_draw"])
                    consumption = float(row["consumption"])
                    dshot = int(float(row["dshot_value"]))
                    elapsed_s = float(row["elapsed_s"])
                except (TypeError, ValueError):
                    continue
                if (
                    math.isfinite(voltage)
                    and math.isfinite(current)
                    and current >= 0
                    and math.isfinite(consumption)
                    and consumption >= 0
                    and math.isfinite(elapsed_s)
                    and base.MINIMUM_THROTTLE_VALUE <= dshot <= base.MAXIMUM_DSHOT_VALUE
                ):
                    points.append(
                        HistoricalPoint(
                            voltage,
                            current,
                            consumption,
                            dshot,
                            elapsed_s,
                            path.name,
                        )
                    )
    if not points:
        raise ValueError(f"No valid voltage/DShot data found in {folder}")
    return points


class CoverageMap:
    """Track sampled voltage/DShot cells and score unexplored candidates."""

    def __init__(
        self,
        points: list[HistoricalPoint],
        voltage_bin: float,
        dshot_bin: int,
    ) -> None:
        self.voltage_bin = voltage_bin
        self.dshot_bin = dshot_bin
        self.counts: dict[tuple[int, int], int] = {}
        self.voltage_min = min(point.voltage for point in points)
        self.voltage_max = max(point.voltage for point in points)
        for point in points:
            self.add(point.voltage, point.dshot)

    def voltage_index(self, voltage: float) -> int:
        return round(voltage / self.voltage_bin)

    def dshot_index(self, dshot: int) -> int:
        return dshot // self.dshot_bin

    def add(self, voltage: float, dshot: int) -> None:
        cell = (self.voltage_index(voltage), self.dshot_index(dshot))
        self.counts[cell] = self.counts.get(cell, 0) + 1

    def count(self, voltage: float, dshot: int) -> int:
        return self.counts.get(
            (self.voltage_index(voltage), self.dshot_index(dshot)),
            0,
        )

    def novelty(self, voltage: float, dshot: int) -> float:
        count = self.count(voltage, dshot)
        return 1.0 / (1.0 + count)


def estimate_k(points: list[HistoricalPoint]) -> float:
    """Estimate K in dV/dt ~= -K*u² from consecutive recorded samples."""
    estimates: list[float] = []
    ordered = sorted(points, key=lambda point: (point.source, point.elapsed_s))
    for previous, current in zip(ordered, ordered[1:]):
        dt = current.elapsed_s - previous.elapsed_s
        du = max(abs(previous.dshot), abs(current.dshot))
        drop = previous.voltage - current.voltage
        if dt > 0 and drop > 0 and du > 0:
            estimates.append(drop / (dt * du * du))
    if not estimates:
        return 0.0
    return statistics.median(estimates)


def estimate_battery_resistance(points: list[HistoricalPoint]) -> float:
    """Estimate voltage sag resistance from per-file voltage/current trends."""
    resistances: list[float] = []
    for source in {point.source for point in points}:
        file_points = [point for point in points if point.source == source]
        if len(file_points) < 3:
            continue
        mean_current = statistics.mean(point.current for point in file_points)
        mean_voltage = statistics.mean(point.voltage for point in file_points)
        denominator = sum(
            (point.current - mean_current) ** 2 for point in file_points
        )
        if denominator == 0:
            continue
        slope = sum(
            (point.current - mean_current) * (point.voltage - mean_voltage)
            for point in file_points
        ) / denominator
        resistance = -slope
        if 0 < resistance <= 0.2:
            resistances.append(resistance)
    return statistics.median(resistances) if resistances else DEFAULT_BATTERY_RESISTANCE


def estimate_timing(points: list[HistoricalPoint]) -> tuple[float, float]:
    """Estimate seconds and consumption units per recorded measurement."""
    durations: list[float] = []
    consumption_rates: list[float] = []
    for source in {point.source for point in points}:
        ordered = sorted(
            (point for point in points if point.source == source),
            key=lambda point: point.elapsed_s,
        )
        for previous, current in zip(ordered, ordered[1:]):
            duration = current.elapsed_s - previous.elapsed_s
            consumption_delta = current.consumption - previous.consumption
            if duration > 0:
                durations.append(duration)
                if consumption_delta >= 0:
                    consumption_rates.append(consumption_delta / duration)
    if not durations:
        raise ValueError("Historical data has no usable elapsed-time intervals")
    return (
        statistics.median(durations),
        statistics.median(consumption_rates) if consumption_rates else 0.0,
    )


class BatteryVoltageEstimator:
    """Estimate unloaded battery voltage from loaded ESC voltage and current."""

    def __init__(self, resistance_ohms: float) -> None:
        self.resistance_ohms = resistance_ohms

    def estimate(self, esc_voltage: float, current: float) -> float:
        return esc_voltage + self.resistance_ohms * current


def dshot_candidates(direction: int, step: int) -> list[int]:
    if direction > 0:
        minimum, maximum = base.MINIMUM_THROTTLE_VALUE, base.DIRECTION_ONE_MAX_DSHOT
    else:
        minimum, maximum = base.DIRECTION_TWO_MIN_DSHOT, base.MAXIMUM_DSHOT_VALUE
    values = list(range(minimum, maximum + 1, step))
    if values[-1] != maximum:
        values.append(maximum)
    return values


class AdaptivePlanner:
    """Choose DShot values using coverage, voltage prediction, and slew penalty."""

    def __init__(
        self,
        coverage: CoverageMap,
        direction: int,
        dwell: float,
        dshot_step: int,
        slew_penalty: float,
        k: float,
        sample_seconds: float,
        consumption_rate: float,
        battery_capacity_mah: float,
    ) -> None:
        self.coverage = coverage
        self.direction = direction
        self.dwell = dwell
        self.candidates = dshot_candidates(direction, dshot_step)
        self.slew_penalty = slew_penalty
        self.k = k
        self.sample_seconds = sample_seconds
        self.consumption_rate = consumption_rate
        self.battery_capacity_mah = battery_capacity_mah

    def predicted_voltage(self, voltage: float, dshot: int) -> float:
        return voltage - self.k * dshot * dshot * self.dwell

    def choose(
        self,
        voltage: float,
        previous_dshot: int,
        consumed_mah: float,
    ) -> tuple[int, float, float, float]:
        scores: list[tuple[float, int, float, float, float]] = []
        scale = max(self.candidates)
        for dshot in self.candidates:
            predicted = self.predicted_voltage(voltage, dshot)
            novelty = self.coverage.novelty(predicted, dshot)
            slew = abs(dshot - previous_dshot) / scale
            estimated_seconds = self.sample_seconds * (1.0 + slew)
            score = novelty / estimated_seconds - self.slew_penalty * slew
            estimated_consumption = self.consumption_rate * estimated_seconds
            if consumed_mah + estimated_consumption > self.battery_capacity_mah:
                continue
            scores.append(
                (
                    score,
                    dshot,
                    predicted,
                    estimated_seconds,
                    estimated_consumption,
                )
            )
        _, selected, predicted, estimated_seconds, estimated_consumption = max(scores)
        return selected, predicted, estimated_seconds, estimated_consumption


class PlannerPlot:
    """Show historical coverage and the planned/actual adaptive path."""

    def __init__(self, points: list[HistoricalPoint]) -> None:
        self.points = points
        self.planned: list[tuple[float, int]] = []
        self.actual: list[tuple[float, int]] = []
        self.figure, self.axes = plt.subplots(num="Adaptive thruster plan")
        plt.ion()
        plt.show(block=False)

    def update_plan(
        self,
        voltage: float,
        estimated_battery_voltage: float,
        dshot: int,
        predicted: float,
    ) -> None:
        self.planned.append((predicted, dshot))
        self.actual.append((voltage, dshot))
        self.axes.clear()
        self.axes.scatter(
            [point.voltage for point in self.points],
            [point.dshot for point in self.points],
            s=4,
            alpha=0.2,
            label="historical",
        )
        planned_voltages, planned_dshots = zip(*self.planned)
        actual_voltages, actual_dshots = zip(*self.actual)
        self.axes.plot(planned_voltages, planned_dshots, "r--", label="planned")
        self.axes.plot(actual_voltages, actual_dshots, "b-", label="actual")
        self.axes.scatter(
            [estimated_battery_voltage],
            [dshot],
            color="green",
            label="estimated battery voltage",
        )
        self.axes.set_xlabel("Voltage (V)")
        self.axes.set_ylabel("DShot value")
        self.axes.set_title("Adaptive voltage/DShot coverage")
        self.axes.legend()
        self.figure.tight_layout()
        self.figure.canvas.draw_idle()
        self.figure.canvas.flush_events()
        plt.pause(0.001)


def make_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", required=True, help="UART port, e.g. COM12")
    parser.add_argument("--data-folder", type=Path, default=Path("data"))
    parser.add_argument("--direction", type=int, choices=(-1, 1), required=True)
    parser.add_argument("--channel", type=int, default=0)
    parser.add_argument("--dwell", type=float, default=1.0)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--baudrate", type=int, default=115200)
    parser.add_argument("--character-delay", type=float, default=base.DEFAULT_CHARACTER_DELAY_S)
    parser.add_argument("--telemetry-format", choices=("text", "binary"), default="text")
    parser.add_argument("--validate-telemetry-crc", action="store_true")
    parser.add_argument("--telemetry-command")
    parser.add_argument("--low-voltage-limit", type=float, default=base.LOW_VOLTAGE_LIMIT_V)
    parser.add_argument("--low-voltage-samples", type=int, default=base.LOW_VOLTAGE_SAMPLE_LIMIT)
    parser.add_argument("--voltage-bin", type=float, default=DEFAULT_VOLTAGE_BIN)
    parser.add_argument("--dshot-step", type=int, default=DEFAULT_DSHOT_STEP)
    parser.add_argument("--slew-penalty", type=float, default=DEFAULT_SLEW_PENALTY)
    parser.add_argument(
        "--max-duration",
        type=float,
        default=DEFAULT_MAX_DURATION,
        help="Stop after this many seconds; use 0 for no time limit",
    )
    parser.add_argument(
        "--battery-capacity",
        type=float,
        default=DEFAULT_BATTERY_CAPACITY_MAH,
        help="Battery capacity in mAh; stop before exceeding it",
    )
    parser.add_argument(
        "--battery-resistance",
        type=float,
        help="Override estimated battery resistance in ohms",
    )
    parser.add_argument("--plot", action="store_true")
    return parser


def run(args: argparse.Namespace) -> None:
    if (
        args.dwell <= 0
        or args.voltage_bin <= 0
        or args.dshot_step <= 0
        or args.max_duration < 0
        or args.battery_capacity <= 0
    ):
        raise ValueError(
            "dwell, voltage-bin, dshot-step, and battery-capacity must be positive; "
            "max-duration cannot be negative"
        )
    points = read_historical_points(args.data_folder)
    sample_seconds, consumption_rate = estimate_timing(points)
    coverage = CoverageMap(points, args.voltage_bin, args.dshot_step)
    resistance = (
        args.battery_resistance
        if args.battery_resistance is not None
        else estimate_battery_resistance(points)
    )
    if resistance < 0:
        raise ValueError("battery-resistance cannot be negative")
    battery_estimator = BatteryVoltageEstimator(resistance)
    planner = AdaptivePlanner(
        coverage,
        args.direction,
        args.dwell,
        args.dshot_step,
        args.slew_penalty,
        estimate_k(points),
        sample_seconds,
        consumption_rate,
        args.battery_capacity,
    )
    plot = PlannerPlot(points) if args.plot else None
    output = (args.output or Path(f"adaptive_thruster_{time.strftime('%Y%m%d_%H%M%S')}.csv")).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    stop_event = threading.Event()
    telemetry_queue: queue.Queue[base.Telemetry] = queue.Queue()
    low_voltage_count = [0]
    previous_dshot = planner.candidates[0]
    started = time.monotonic()
    record_id = 0
    consumed_mah = 0.0
    with base.serial.Serial(args.port, args.baudrate, timeout=0.1) as port:
        base.prepare_thruster_test(port, args.channel, "dshot setthrottle {channel} {dshot}", args.character_delay)
        reader = threading.Thread(
            target=base.serial_reader,
            args=(port, telemetry_queue, stop_event, args.telemetry_format, args.validate_telemetry_crc),
            daemon=True,
        )
        reader.start()
        logger = base.SweepLogger(
            output,
            {
                "planner": "adaptive_coverage",
                "data_folder": args.data_folder,
                "direction": args.direction,
                "dwell": args.dwell,
                "voltage_bin": args.voltage_bin,
                "dshot_step": args.dshot_step,
                "estimated_k": planner.k,
                "estimated_seconds_per_sample": sample_seconds,
                "estimated_consumption_per_second": consumption_rate,
                "battery_capacity_mah": args.battery_capacity,
                "battery_resistance_ohms": resistance,
            },
        )
        try:
            while not stop_event.is_set() and (
                args.max_duration == 0
                or time.monotonic() - started < args.max_duration
            ):
                if (
                    consumed_mah >= args.battery_capacity
                    or consumed_mah + planner.consumption_rate * planner.sample_seconds
                    > args.battery_capacity
                ):
                    print(
                        f"Battery capacity limit of {args.battery_capacity:.0f}mAh "
                        "would be exceeded by the next measurement; stopping."
                    )
                    break
                voltage = coverage.voltage_max if record_id == 0 else last_voltage
                dshot, predicted, estimated_seconds, estimated_consumption = planner.choose(
                    voltage,
                    previous_dshot,
                    consumed_mah,
                )
                base.send_command(
                    port,
                    base.make_dshot_command("dshot setthrottle {channel} {dshot}", args.channel, dshot),
                    args.character_delay,
                )
                average, battery_cutoff, immediate_cutoff = base.wait_for_telemetry(
                    telemetry_queue,
                    args.dwell,
                    stop_event,
                    low_voltage_count,
                    args.low_voltage_limit,
                    args.low_voltage_samples,
                )
                row = base.build_data_row(record_id, started, args.channel, dshot, average)
                if math.isfinite(row["voltage"]) and math.isfinite(row["current_draw"]):
                    row["battery_voltage_estimate"] = battery_estimator.estimate(
                        row["voltage"],
                        row["current_draw"],
                    )
                logger.append(row)
                if math.isfinite(row["consumption"]):
                    consumed_mah = max(consumed_mah, row["consumption"])
                else:
                    consumed_mah += estimated_consumption
                last_voltage = row["voltage"] if math.isfinite(row["voltage"]) else voltage
                coverage.add(last_voltage, dshot)
                if plot is not None:
                    plot.update_plan(
                        last_voltage,
                        row["battery_voltage_estimate"],
                        dshot,
                        predicted,
                    )
                print(
                    f"planned_voltage={predicted:.3f} "
                    f"estimated_step_time={estimated_seconds:.1f}s "
                    f"estimated_consumption={estimated_consumption:.1f} "
                    f"consumed={consumed_mah:.1f}mAh "
                    f"remaining={max(0.0, args.battery_capacity - consumed_mah):.1f}mAh ",
                    end="",
                )
                base.print_data_row(row)
                record_id += 1
                previous_dshot = dshot
                if battery_cutoff:
                    print("Battery safety cutoff reached; stopping.")
                    break
            if (
                args.max_duration > 0
                and time.monotonic() - started >= args.max_duration
                and not stop_event.is_set()
            ):
                print(f"Maximum test duration of {args.max_duration:.0f}s reached; stopping.")
            if consumed_mah >= args.battery_capacity:
                print(
                    f"Battery capacity limit of {args.battery_capacity:.0f}mAh reached; stopping."
                )
        finally:
            base.send_command(port, base.make_dshot_command("dshot setthrottle {channel} 0", args.channel, 0), args.character_delay)
            logger.close()
            stop_event.set()


def main() -> None:
    args = make_parser().parse_args()
    try:
        run(args)
    except KeyboardInterrupt:
        print("\nAdaptive thruster test stopped by user.")
    except (OSError, base.serial.SerialException, ValueError) as exc:
        raise SystemExit(f"Adaptive thruster test failed: {exc}") from exc


if __name__ == "__main__":
    main()
