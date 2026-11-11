"""
Adaptive thruster test that plans for unexplored voltage/DShot cells.

The planner uses historical CSV files as a coverage map. At each dwell it
chooses the DShot value with the most expected new coverage per second, while
penalizing large DShot changes.
"""

from __future__ import annotations

import argparse
import bisect
import csv
import math
import os
import queue
import statistics
import sys
import threading
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable

import matplotlib.pyplot as plt

import test_script as base


DEFAULT_VOLTAGE_BIN = 0.05
DEFAULT_DSHOT_STEP = 8
DEFAULT_SLEW_PENALTY = 1.0
DEFAULT_SLEW_TIME_FACTOR = 0.75
DEFAULT_BATTERY_RESISTANCE = 0.02
DEFAULT_MAX_DURATION = 14400.0
DEFAULT_BATTERY_CAPACITY_MAH = 8500.0
DEFAULT_COMMAND_INTERVAL = 0.5
DEFAULT_MAX_DSHOT_CHANGE = 256


def _style(text: str, code: str, enabled: bool) -> str:
    return f"\033[{code}m{text}\033[0m" if enabled else text


def _measurement_value(value: object, decimals: int = 2) -> str:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return "--"
    if not math.isfinite(number):
        return "--"
    return f"{number:.{decimals}f}"


def _print_measurement(
    row: dict[str, object],
    command_dshot: int,
    sample_count: int,
    predicted_voltage: float,
    estimated_seconds: float,
    estimated_consumption: float,
    consumed_mah: float,
    battery_capacity_mah: float,
    color: bool,
) -> None:
    remaining = max(0.0, battery_capacity_mah - consumed_mah)
    plan = _style(
        f"plan {_measurement_value(predicted_voltage)}V/"
        f"{_measurement_value(estimated_seconds, 1)}s",
        "33",
        color,
    )
    measured = _style(
        f"ESC {_measurement_value(row['voltage'])}V "
        f"BAT {_measurement_value(row['battery_voltage_estimate'])}V",
        "32",
        color,
    )
    budget = _style(
        f"used {_measurement_value(consumed_mah, 1)}mAh "
        f"left {_measurement_value(remaining, 1)}mAh",
        "36",
        color,
    )
    print(
        f"[{int(row['id']):04d}] "
        f"CMD {command_dshot:4d} "
        f"reported {int(row['dshot_value']):4d} "
        f"({sample_count} samples) | "
        f"{plan} | {measured} | "
        f"thrust {_measurement_value(row['thrust'])}N | "
        f"eRPM {_measurement_value(row['erpm'], 0):>6} | "
        f"I {_measurement_value(row['current_draw'])}A | "
        f"T {_measurement_value(row['temperature'], 1)}C | "
        f"{budget} (+{_measurement_value(estimated_consumption, 1)}mAh)"
    )


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
        self.occupied = set()
        self.voltage_buckets: dict[int, set[int]] = {}
        self.occupied_voltage_indices: list[int] = []
        for point in points:
            self.add(point.voltage, point.dshot)

    def voltage_index(self, voltage: float) -> int:
        return round(voltage / self.voltage_bin)

    def dshot_index(self, dshot: int) -> int:
        return dshot // self.dshot_bin

    def add(self, voltage: float, dshot: int) -> None:
        cell = (self.voltage_index(voltage), self.dshot_index(dshot))
        self.counts[cell] = self.counts.get(cell, 0) + 1
        if cell in self.occupied:
            return
        self.occupied.add(cell)
        voltage_index, dshot_index = cell
        bucket = self.voltage_buckets.get(voltage_index)
        if bucket is None:
            self.voltage_buckets[voltage_index] = {dshot_index}
            bisect.insort(self.occupied_voltage_indices, voltage_index)
        else:
            bucket.add(dshot_index)

    def count(self, voltage: float, dshot: int) -> int:
        return self.counts.get(
            (self.voltage_index(voltage), self.dshot_index(dshot)),
            0,
        )

    def novelty(self, voltage: float, dshot: int) -> float:
        count = self.count(voltage, dshot)
        voltage_cell = self.voltage_index(voltage)
        dshot_cell = self.dshot_index(dshot)
        if not self.occupied:
            distance = 1.0
        else:
            distance_squared = math.inf
            position = bisect.bisect_left(
                self.occupied_voltage_indices,
                voltage_cell,
            )
            left = position - 1
            right = position
            while left >= 0 or right < len(self.occupied_voltage_indices):
                left_delta = (
                    abs(voltage_cell - self.occupied_voltage_indices[left])
                    if left >= 0
                    else math.inf
                )
                right_delta = (
                    abs(self.occupied_voltage_indices[right] - voltage_cell)
                    if right < len(self.occupied_voltage_indices)
                    else math.inf
                )
                if min(left_delta, right_delta) * 0.5 > math.sqrt(distance_squared):
                    break
                if left_delta <= right_delta:
                    voltage_index = self.occupied_voltage_indices[left]
                    left -= 1
                else:
                    voltage_index = self.occupied_voltage_indices[right]
                    right += 1
                voltage_distance = (voltage_cell - voltage_index) * 0.5
                for known_dshot in self.voltage_buckets[voltage_index]:
                    dshot_distance = dshot_cell - known_dshot
                    distance_squared = min(
                        distance_squared,
                        voltage_distance * voltage_distance
                        + dshot_distance * dshot_distance,
                    )
            distance = math.sqrt(distance_squared)
        return distance / (1.0 + count)

    def clone(self) -> CoverageMap:
        cloned = object.__new__(CoverageMap)
        cloned.voltage_bin = self.voltage_bin
        cloned.dshot_bin = self.dshot_bin
        cloned.counts = self.counts.copy()
        cloned.occupied = self.occupied.copy()
        cloned.voltage_buckets = {
            voltage: dshots.copy()
            for voltage, dshots in self.voltage_buckets.items()
        }
        cloned.occupied_voltage_indices = self.occupied_voltage_indices.copy()
        cloned.voltage_min = self.voltage_min
        cloned.voltage_max = self.voltage_max
        return cloned


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


def estimate_current_model(points: list[HistoricalPoint]) -> tuple[float, float]:
    """Estimate current = intercept + slope * |DShot| from historical data."""
    mean_dshot = statistics.mean(abs(point.dshot) for point in points)
    mean_current = statistics.mean(point.current for point in points)
    denominator = sum((abs(point.dshot) - mean_dshot) ** 2 for point in points)
    if denominator == 0:
        return 0.0, 0.0
    slope = sum(
        (abs(point.dshot) - mean_dshot) * (point.current - mean_current)
        for point in points
    ) / denominator
    return max(0.0, mean_current - slope * mean_dshot), max(0.0, slope)


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
        battery_resistance: float,
        current_intercept: float,
        current_slope: float,
        max_dshot_change: int,
    ) -> None:
        self.coverage = coverage
        self.direction = direction
        self.dwell = dwell
        self.dshot_step = dshot_step
        self.candidates = dshot_candidates(direction, dshot_step)
        self.slew_penalty = slew_penalty
        self.k = k
        self.sample_seconds = sample_seconds
        self.consumption_rate = consumption_rate
        self.battery_capacity_mah = battery_capacity_mah
        self.battery_resistance = battery_resistance
        self.current_intercept = current_intercept
        self.current_slope = current_slope
        self.max_dshot_change = max_dshot_change
        self.battery_capacity_mah = battery_capacity_mah

    def predicted_voltage(
        self,
        voltage: float,
        dshot: int,
        previous_dshot: int,
    ) -> float:
        previous_current = self.current_intercept + self.current_slope * abs(previous_dshot)
        target_current = self.current_intercept + self.current_slope * abs(dshot)
        battery_voltage = voltage + self.battery_resistance * previous_current
        return (
            battery_voltage
            - self.battery_resistance * target_current
            - self.k * dshot * dshot * self.dwell
        )

    def choose(
        self,
        voltage: float,
        previous_dshot: int,
        consumed_mah: float,
    ) -> tuple[int, float, float, float]:
        scores: list[tuple[float, int, float, float, float]] = []
        scale = max(self.candidates)
        for dshot in self.candidates:
            if (
                previous_dshot != 0
                and abs(dshot - previous_dshot) > self.max_dshot_change
            ):
                continue
            predicted = self.predicted_voltage(voltage, dshot, previous_dshot)
            if predicted < base.IMMEDIATE_LOW_VOLTAGE_LIMIT_V:
                continue
            novelty = self.coverage.novelty(predicted, dshot)
            slew = abs(dshot - previous_dshot) / scale
            estimated_seconds = self.sample_seconds * (
                1.0 + DEFAULT_SLEW_TIME_FACTOR * slew
            )
            score = novelty / estimated_seconds - self.slew_penalty * slew * slew
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
        if not scores:
            raise ValueError(
                "No safe DShot candidate remains above the "
                f"{base.IMMEDIATE_LOW_VOLTAGE_LIMIT_V:.1f} V planning floor"
            )
        _, selected, predicted, estimated_seconds, estimated_consumption = max(scores)
        return selected, predicted, estimated_seconds, estimated_consumption

    def precompute_path(
        self,
        voltage: float,
        previous_dshot: int,
        steps: int,
        battery_capacity: float,
        initial_consumed: float = 0.0,
        progress: Callable[[int, int], None] | None = None,
    ) -> list[tuple[int, float]]:
        """Greedily precompute a finite-horizon path from historical coverage."""
        path: list[tuple[int, float]] = []
        simulated = AdaptivePlanner(
            self.coverage.clone(),
            self.direction,
            self.dwell,
            self.dshot_step,
            self.slew_penalty,
            self.k,
            self.sample_seconds,
            self.consumption_rate,
            self.battery_capacity_mah,
            self.battery_resistance,
            self.current_intercept,
            self.current_slope,
            self.max_dshot_change,
        )
        consumed = initial_consumed
        for _ in range(steps):
            try:
                dshot, predicted, seconds, consumption = simulated.choose(
                    voltage,
                    previous_dshot,
                    consumed,
                )
            except ValueError:
                break
            path.append((dshot, predicted))
            consumed += consumption
            simulated.coverage.add(predicted, dshot)
            voltage = predicted
            previous_dshot = dshot
            if progress is not None:
                progress(len(path), steps)
        return path


class PlannerPlot:
    """Show historical coverage and the planned/actual adaptive path."""

    def __init__(
        self,
        points: list[HistoricalPoint],
        planned_path: list[tuple[int, float]],
    ) -> None:
        self.points = points
        self.planned = [(voltage, dshot) for dshot, voltage in planned_path]
        self.actual: list[tuple[float, int]] = []
        self.battery: list[tuple[float, int]] = []
        self.figure, self.axes = plt.subplots(num="Adaptive thruster plan")
        self.axes.scatter(
            [point.voltage for point in self.points],
            [point.dshot for point in self.points],
            s=4,
            alpha=0.2,
            label="historical",
        )
        planned_voltages, planned_dshots = zip(*self.planned) if self.planned else ([], [])
        (self.planned_line,) = self.axes.plot(
            planned_voltages,
            planned_dshots,
            "r--",
            label="precomputed path",
        )
        (self.actual_line,) = self.axes.plot([], [], "b-", label="actual ESC path")
        (self.battery_line,) = self.axes.plot(
            [],
            [],
            "g:",
            label="estimated battery path",
        )
        self.axes.set_xlabel("Voltage (V)")
        self.axes.set_ylabel("DShot value")
        self.axes.set_title("Adaptive voltage/DShot coverage")
        self.axes.legend()
        self.figure.tight_layout()
        plt.ion()
        plt.show(block=False)

    def update_plan(
        self,
        voltage: float,
        estimated_battery_voltage: float,
        dshot: int,
        predicted: float,
    ) -> None:
        self.actual.append((voltage, dshot))
        self.battery.append((estimated_battery_voltage, dshot))
        actual_voltages, actual_dshots = zip(*self.actual)
        self.actual_line.set_data(actual_voltages, actual_dshots)
        battery_voltages, battery_dshots = zip(*self.battery)
        self.battery_line.set_data(battery_voltages, battery_dshots)
        self.figure.canvas.draw_idle()
        self.figure.canvas.flush_events()


def make_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", required=True, help="UART port, e.g. COM12")
    parser.add_argument("--data-folder", type=Path, default=Path("data"))
    parser.add_argument("--direction", type=int, choices=(-1, 1), required=True)
    parser.add_argument("--channel", type=int, default=0)
    parser.add_argument("--dwell", type=float, default=1.0)
    parser.add_argument(
        "--command-interval",
        type=float,
        default=DEFAULT_COMMAND_INTERVAL,
        help="Minimum seconds between DShot commands",
    )
    parser.add_argument("--output", type=Path)
    parser.add_argument("--baudrate", type=int, default=115200)
    parser.add_argument("--telemetry-format", choices=("text", "binary"), default="text")
    parser.add_argument("--validate-telemetry-crc", action="store_true")
    parser.add_argument("--low-voltage-limit", type=float, default=base.LOW_VOLTAGE_LIMIT_V)
    parser.add_argument("--low-voltage-samples", type=int, default=base.LOW_VOLTAGE_SAMPLE_LIMIT)
    parser.add_argument("--voltage-bin", type=float, default=DEFAULT_VOLTAGE_BIN)
    parser.add_argument("--dshot-step", type=int, default=DEFAULT_DSHOT_STEP)
    parser.add_argument("--slew-penalty", type=float, default=DEFAULT_SLEW_PENALTY)
    parser.add_argument(
        "--max-dshot-change",
        type=int,
        default=DEFAULT_MAX_DSHOT_CHANGE,
        help="Maximum DShot change per command",
    )
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
        "--initial-consumed-mah",
        type=float,
        default=0.0,
        help="Capacity already used before this run; reduces the available budget",
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
        or args.command_interval <= 0
        or args.max_dshot_change <= 0
        or args.voltage_bin <= 0
        or args.dshot_step <= 0
        or args.max_duration < 0
        or args.battery_capacity <= 0
        or args.initial_consumed_mah < 0
        or args.initial_consumed_mah >= args.battery_capacity
    ):
        raise ValueError(
            "dwell, command-interval, max-dshot-change, voltage-bin, dshot-step, and "
            "battery-capacity must be positive; "
            "max-duration cannot be negative and initial-consumed-mah must be "
            "between zero and battery-capacity"
        )
    points = read_historical_points(args.data_folder)
    telemetry_seconds, consumption_rate = estimate_timing(points)
    step_seconds = max(args.dwell, args.command_interval)
    coverage = CoverageMap(points, args.voltage_bin, args.dshot_step)
    resistance = (
        args.battery_resistance
        if args.battery_resistance is not None
        else estimate_battery_resistance(points)
    )
    if resistance < 0:
        raise ValueError("battery-resistance cannot be negative")
    battery_estimator = BatteryVoltageEstimator(resistance)
    current_intercept, current_slope = estimate_current_model(points)
    planner = AdaptivePlanner(
        coverage,
        args.direction,
        args.dwell,
        args.dshot_step,
        args.slew_penalty,
        estimate_k(points),
        step_seconds,
        consumption_rate,
        args.battery_capacity,
        resistance,
        current_intercept,
        current_slope,
        args.max_dshot_change,
    )
    available_capacity = args.battery_capacity - args.initial_consumed_mah
    estimated_steps = int(available_capacity / max(consumption_rate, 1e-9))
    if args.max_duration > 0:
        estimated_steps = min(
            estimated_steps,
            int(args.max_duration / step_seconds),
        )
    output = (args.output or Path(f"adaptive_thruster_{time.strftime('%Y%m%d_%H%M%S')}.csv")).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    stop_event = threading.Event()
    telemetry_queue: queue.Queue[base.Telemetry] = queue.Queue()
    low_voltage_count = [0]
    previous_dshot = 0
    record_id = 0
    command_id = 0
    consumed_mah = args.initial_consumed_mah
    next_command_time = 0.0
    color_output = sys.stdout.isatty() and "NO_COLOR" not in os.environ
    print(
        _style(
            "Adaptive thruster test | reading startup telemetry | "
            "Ctrl+C to stop",
            "1;36",
            color_output,
        )
    )
    print(
        "  id   command/reported DShot | plan       | measured             | "
        "thrust    | eRPM   | current | temp   | battery"
    )
    with base.serial.Serial(args.port, args.baudrate, timeout=0.1) as port:
        base.prepare_thruster_test(port, args.channel, "dshot setthrottle {channel} {dshot}")
        print(
            _style(
                f"ESC stopped and startup telemetry collection running for "
                f"{args.dwell:.1f}s...",
                "36",
                color_output,
            ),
            flush=True,
        )
        reader = threading.Thread(
            target=base.serial_reader,
            args=(port, telemetry_queue, stop_event, args.telemetry_format, args.validate_telemetry_crc),
            daemon=True,
        )
        reader.start()
        initial_samples, initial_cutoff, _ = base.collect_telemetry(
            telemetry_queue,
            args.dwell,
            stop_event,
            low_voltage_count,
            args.low_voltage_limit,
            args.low_voltage_samples,
        )
        initial_telemetry = base.average_telemetry(initial_samples)
        if initial_cutoff:
            stop_event.set()
            raise RuntimeError(
                "Battery voltage is already at the safety cutoff before testing starts."
            )
        if initial_telemetry is None:
            stop_event.set()
            raise RuntimeError(
                "No valid startup telemetry received at zero throttle. "
                "Check the serial port, baud rate, telemetry format, "
                "and firmware telemetry forwarding."
            )
        initial_voltage = initial_telemetry.values.get("voltage", math.nan)
        if not math.isfinite(initial_voltage):
            stop_event.set()
            raise RuntimeError(
                "Startup telemetry did not contain a valid ESC voltage."
            )
        initial_current = initial_telemetry.values.get("current_draw", 0.0)
        if not math.isfinite(initial_current):
            initial_current = 0.0
        initial_battery_voltage = battery_estimator.estimate(
            initial_voltage,
            initial_current,
        )
        planning_started = time.monotonic()
        last_planning_update = planning_started

        def report_planning_progress(completed: int, total: int) -> None:
            nonlocal last_planning_update
            now = time.monotonic()
            if (
                completed != total
                and completed % 50 != 0
                and now - last_planning_update < 0.5
            ):
                return
            last_planning_update = now
            elapsed = now - planning_started
            rate = completed / elapsed if elapsed > 0 else 0.0
            eta = (total - completed) / rate if rate > 0 else 0.0
            print(
                "\r"
                + _style(
                    f"Planning path: {completed:,}/{total:,} steps "
                    f"({100.0 * completed / max(1, total):5.1f}%) | "
                    f"{elapsed:.1f}s elapsed | ETA {eta:.1f}s",
                    "1;33",
                    color_output,
                ),
                end="",
                flush=True,
            )

        print(
            _style(
                f"Planning path from {initial_voltage:.2f} V "
                f"({estimated_steps:,} candidate steps)...",
                "1;33",
                color_output,
            ),
            flush=True,
        )
        planned_path = planner.precompute_path(
            initial_voltage,
            previous_dshot,
            max(1, estimated_steps),
            args.battery_capacity,
            consumed_mah,
            report_planning_progress,
        )
        print(
            "\r"
            + _style(
                f"Planning complete: {len(planned_path):,} steps in "
                f"{time.monotonic() - planning_started:.1f}s"
                + " " * 20,
                "1;32",
                color_output,
            )
        )
        plot = PlannerPlot(points, planned_path) if args.plot else None
        started = time.monotonic()
        print(
            _style(
                "Planning finished; beginning DShot commands.",
                "1;32",
                color_output,
            ),
            flush=True,
        )
        print(
            _style(
                f"Startup ESC voltage: {initial_voltage:.2f} V | "
                f"estimated battery voltage: "
                f"{initial_battery_voltage:.2f} V | "
                f"available capacity: {available_capacity:.0f} mAh | "
                f"planned steps: {len(planned_path)} | "
                f"planning floor: {base.IMMEDIATE_LOW_VOLTAGE_LIMIT_V:.1f} V | "
                f"command interval: {args.command_interval:.2f}s",
                "1;32",
                color_output,
            )
        )
        logger = base.SweepLogger(
            output,
            {
                "created_at": datetime.now(timezone.utc).isoformat(),
                "planner": "adaptive_coverage",
                "data_folder": args.data_folder,
                "historical_point_count": len(points),
                "port": args.port,
                "baudrate": args.baudrate,
                "channel": args.channel,
                "direction": args.direction,
                "telemetry_format": args.telemetry_format,
                "validate_telemetry_crc": args.validate_telemetry_crc,
                "dwell": args.dwell,
                "command_interval_s": args.command_interval,
                "max_duration_s": args.max_duration,
                "voltage_bin": args.voltage_bin,
                "dshot_step": args.dshot_step,
                "slew_penalty": args.slew_penalty,
                "max_dshot_change": args.max_dshot_change,
                "estimated_k": planner.k,
                "estimated_telemetry_interval_s": telemetry_seconds,
                "estimated_seconds_per_command": step_seconds,
                "estimated_consumption_per_second": consumption_rate,
                "battery_capacity_mah": args.battery_capacity,
                "initial_consumed_mah": args.initial_consumed_mah,
                "available_capacity_mah": available_capacity,
                "estimated_planned_steps": len(planned_path),
                "startup_esc_voltage": initial_voltage,
                "startup_current_a": initial_current,
                "startup_temperature_c": initial_telemetry.values.get(
                    "temperature",
                    math.nan,
                ),
                "startup_consumption": initial_telemetry.values.get(
                    "consumption",
                    math.nan,
                ),
                "startup_battery_voltage_estimate": initial_battery_voltage,
                "battery_resistance_ohms": resistance,
                "current_model_intercept_a": current_intercept,
                "current_model_slope_a_per_dshot": current_slope,
                "low_voltage_limit_v": args.low_voltage_limit,
                "low_voltage_samples": args.low_voltage_samples,
                "immediate_low_voltage_limit_v": base.IMMEDIATE_LOW_VOLTAGE_LIMIT_V,
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
                        _style(
                            f"Battery capacity limit of {args.battery_capacity:.0f}mAh "
                            "would be exceeded by the next measurement; stopping.",
                            "1;31",
                            color_output,
                        )
                    )
                    break
                voltage = initial_voltage if record_id == 0 else last_voltage
                if command_id < len(planned_path):
                    dshot, predicted = planned_path[command_id]
                    _, _, estimated_seconds, estimated_consumption = planner.choose(
                        voltage,
                        previous_dshot,
                        consumed_mah,
                    )
                else:
                    dshot, predicted, estimated_seconds, estimated_consumption = planner.choose(
                        voltage,
                        previous_dshot,
                        consumed_mah,
                    )
                wait_seconds = max(0.0, next_command_time - time.monotonic())
                if wait_seconds > 0:
                    print(
                        _style(
                            f"Command rate limit: waiting {wait_seconds:.2f}s...",
                            "33",
                            color_output,
                        ),
                        flush=True,
                    )
                    if stop_event.wait(wait_seconds):
                        break
                print(
                    _style(
                        f"Sending DShot {dshot} "
                        f"(planned voltage {predicted:.2f} V); "
                        f"collecting telemetry for {args.dwell:.1f}s...",
                        "36",
                        color_output,
                    ),
                    flush=True,
                )
                base.send_command(
                    port,
                    base.make_dshot_command("dshot setthrottle {channel} {dshot}", args.channel, dshot),
                )
                next_command_time = time.monotonic() + args.command_interval
                print(
                    _style(
                        f"DShot {dshot} command sent; waiting for telemetry...",
                        "36",
                        color_output,
                    ),
                    flush=True,
                )
                samples, battery_cutoff, immediate_cutoff = base.collect_telemetry(
                    telemetry_queue,
                    args.dwell,
                    stop_event,
                    low_voltage_count,
                    args.low_voltage_limit,
                    args.low_voltage_samples,
                )
                if not samples:
                    raise RuntimeError(
                        "No valid telemetry received during the dwell. "
                        "Check the serial port, baud rate, telemetry format, "
                        "and firmware telemetry forwarding."
                    )
                last_row: dict[str, object] | None = None
                for sample in samples:
                    row = base.build_data_row(
                        record_id,
                        started,
                        args.channel,
                        dshot,
                        sample,
                    )
                    if math.isfinite(row["voltage"]) and math.isfinite(row["current_draw"]):
                        row["battery_voltage_estimate"] = battery_estimator.estimate(
                            row["voltage"],
                            row["current_draw"],
                        )
                    logger.append(row)
                    if math.isfinite(row["consumption"]):
                        consumed_mah = max(consumed_mah, row["consumption"])
                    else:
                        consumed_mah += estimated_consumption / len(samples)
                    last_voltage = row["voltage"] if math.isfinite(row["voltage"]) else voltage
                    actual_dshot = int(row["dshot_value"])
                    coverage.add(last_voltage, actual_dshot)
                    if plot is not None and math.isfinite(row["battery_voltage_estimate"]):
                        plot.update_plan(
                            last_voltage,
                            row["battery_voltage_estimate"],
                            actual_dshot,
                            predicted,
                        )
                    last_row = row
                    record_id += 1
                    previous_dshot = actual_dshot
                if last_row is not None:
                    _print_measurement(
                        last_row,
                        dshot,
                        len(samples),
                        predicted,
                        estimated_seconds,
                        estimated_consumption,
                        consumed_mah,
                        args.battery_capacity,
                        color_output,
                    )
                command_id += 1
                if battery_cutoff:
                    print(_style("Battery safety cutoff reached; stopping.", "1;31", color_output))
                    break
            if (
                args.max_duration > 0
                and time.monotonic() - started >= args.max_duration
                and not stop_event.is_set()
            ):
                print(
                    _style(
                        f"Maximum test duration of {args.max_duration:.0f}s reached; stopping.",
                        "1;33",
                        color_output,
                    )
                )
            if consumed_mah >= args.battery_capacity:
                print(
                    _style(
                        f"Battery capacity limit of {args.battery_capacity:.0f}mAh "
                        "reached; stopping.",
                        "1;31",
                        color_output,
                    )
                )
        finally:
            base.send_command(port, base.make_dshot_command("dshot setthrottle {channel} 0", args.channel, 0))
            logger.close()
            stop_event.set()


def main() -> None:
    args = make_parser().parse_args()
    try:
        run(args)
    except KeyboardInterrupt:
        print("\nAdaptive thruster test stopped by user.")
    except (OSError, base.serial.SerialException, RuntimeError, ValueError) as exc:
        raise SystemExit(f"Adaptive thruster test failed: {exc}") from exc


if __name__ == "__main__":
    main()
