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
DEFAULT_COMMAND_INTERVAL = 0.1
DEFAULT_MAX_DSHOT_CHANGE = 256
DEFAULT_COMMAND_ACK_TIMEOUT = 1.0
DEFAULT_COMMAND_RETRIES = 3
DEFAULT_SHUTDOWN_TIMEOUT = 5.0
DEFAULT_SHUTDOWN_CONFIRMATIONS = 3
DEFAULT_STOP_CURRENT_A = 0.2
DEFAULT_STOP_ERPM = 100.0
DEFAULT_MPC_HORIZON = 3


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


def _stop_thruster(
    port: base.serial.Serial,
    channel: int,
    color: bool,
    telemetry_queue: queue.Queue[base.Telemetry] | None = None,
    timeout: float = DEFAULT_SHUTDOWN_TIMEOUT,
    command_interval: float = DEFAULT_COMMAND_INTERVAL,
) -> bool:
    """Send zero throttle and confirm that telemetry reports the motor stopped."""
    command = base.make_dshot_command(
        "dshot setthrottle {channel} 0",
        channel,
        0,
    )
    deadline = time.monotonic() + timeout
    stopped_samples = 0
    saw_stop_metric = False
    last_send = 0.0
    attempt = 0
    while time.monotonic() < deadline:
        now = time.monotonic()
        if attempt == 0 or now - last_send >= command_interval:
            attempt += 1
            last_send = now
            try:
                base.send_command(port, command)
                print(
                    _style(
                        f"Shutdown: sent DShot 0 ({attempt})",
                        "1;31",
                        color,
                    ),
                    flush=True,
                )
            except (OSError, base.serial.SerialException) as exc:
                print(
                    _style(f"Shutdown command failed: {exc}", "1;31", color),
                    flush=True,
                )
                return False
        if telemetry_queue is None:
            continue
        try:
            sample = telemetry_queue.get(timeout=0.05)
        except queue.Empty:
            continue
        current = sample.values.get("current_draw")
        erpm = sample.values.get("erpm")
        metrics_present = False
        motor_stopped = True
        if current is not None and math.isfinite(current):
            metrics_present = True
            motor_stopped = (
                motor_stopped
                and 0.0 <= current <= DEFAULT_STOP_CURRENT_A
            )
        if erpm is not None and math.isfinite(erpm):
            metrics_present = True
            motor_stopped = motor_stopped and 0.0 <= erpm <= DEFAULT_STOP_ERPM
        if not metrics_present:
            continue
        saw_stop_metric = True
        if motor_stopped:
            stopped_samples += 1
            if stopped_samples >= DEFAULT_SHUTDOWN_CONFIRMATIONS:
                print(
                    _style(
                        "Shutdown confirmed by consecutive low-current/eRPM telemetry.",
                        "1;32",
                        color,
                    ),
                    flush=True,
                )
                return True
        else:
            stopped_samples = 0
    message = (
        "Shutdown could not be confirmed from telemetry"
        if saw_stop_metric
        else "Shutdown could not be confirmed because telemetry had no current/eRPM"
    )
    print(_style(f"WARNING: {message}.", "1;31", color), flush=True)
    return False


class _SafeSerial:
    """Keep the thruster stopped even when setup or planning is interrupted."""

    def __init__(
        self,
        port_name: str,
        baudrate: int,
        channel: int,
        color: bool,
        telemetry_queue: queue.Queue[base.Telemetry],
        stop_event: threading.Event,
        shutdown_timeout: float,
        command_interval: float,
    ) -> None:
        self.port_name = port_name
        self.baudrate = baudrate
        self.channel = channel
        self.color = color
        self.telemetry_queue = telemetry_queue
        self.stop_event = stop_event
        self.shutdown_timeout = shutdown_timeout
        self.command_interval = command_interval
        self.port: base.serial.Serial | None = None

    def __enter__(self) -> base.serial.Serial:
        self.port = base.serial.Serial(self.port_name, self.baudrate, timeout=0.1)
        return self.port

    def __exit__(self, exc_type: object, exc_value: object, traceback: object) -> None:
        if self.port is not None:
            while True:
                try:
                    self.telemetry_queue.get_nowait()
                except queue.Empty:
                    break
            _stop_thruster(
                self.port,
                self.channel,
                self.color,
                self.telemetry_queue,
                self.shutdown_timeout,
                self.command_interval,
            )
            self.stop_event.set()
            self.port.close()


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


def _effective_dshot(dshot: int, direction: int) -> int:
    minimum = (
        base.MINIMUM_THROTTLE_VALUE
        if direction > 0
        else base.DIRECTION_TWO_MIN_DSHOT
    )
    return max(0, dshot - minimum)


def estimate_k(points: list[HistoricalPoint], direction: int) -> float:
    """Estimate K in dV/dt ~= -K*u² from consecutive recorded samples."""
    estimates: list[float] = []
    directional = [
        point
        for point in points
        if (
            (direction > 0 and point.dshot <= base.DIRECTION_ONE_MAX_DSHOT)
            or (direction < 0 and point.dshot >= base.DIRECTION_TWO_MIN_DSHOT)
        )
    ]
    ordered = sorted(
        directional,
        key=lambda point: (point.source, point.elapsed_s),
    )
    for previous, current in zip(ordered, ordered[1:]):
        dt = current.elapsed_s - previous.elapsed_s
        du = max(
            _effective_dshot(previous.dshot, direction),
            _effective_dshot(current.dshot, direction),
        )
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


def estimate_timing(points: list[HistoricalPoint]) -> float:
    """Estimate the median telemetry interval from historical samples."""
    durations: list[float] = []
    for source in {point.source for point in points}:
        ordered = sorted(
            (point for point in points if point.source == source),
            key=lambda point: point.elapsed_s,
        )
        for previous, current in zip(ordered, ordered[1:]):
            duration = current.elapsed_s - previous.elapsed_s
            if duration > 0:
                durations.append(duration)
    if not durations:
        raise ValueError("Historical data has no usable elapsed-time intervals")
    return statistics.median(durations)


def estimate_consumption_model(
    points: list[HistoricalPoint],
    direction: int,
) -> tuple[float, float]:
    """Fit battery drain in mAh/s against effective DShot from each file."""
    rates: list[tuple[float, float]] = []
    for source in {point.source for point in points}:
        ordered = sorted(
            (point for point in points if point.source == source),
            key=lambda point: point.elapsed_s,
        )
        if len(ordered) < 2:
            continue
        start = ordered[0]
        end = ordered[-1]
        duration = end.elapsed_s - start.elapsed_s
        consumed = end.consumption - start.consumption
        if duration <= 0 or consumed < 0:
            continue
        effective_dshots = [
            _effective_dshot(point.dshot, direction)
            for point in ordered
        ]
        mean_dshot = statistics.mean(effective_dshots)
        rates.append((mean_dshot, consumed / duration))
    if not rates:
        return 0.0, 0.0
    mean_dshot = statistics.mean(dshot for dshot, _ in rates)
    mean_rate = statistics.mean(rate for _, rate in rates)
    denominator = sum((dshot - mean_dshot) ** 2 for dshot, _ in rates)
    if denominator == 0:
        return max(0.0, mean_rate), 0.0
    slope = sum(
        (dshot - mean_dshot) * (rate - mean_rate)
        for dshot, rate in rates
    ) / denominator
    intercept = mean_rate - slope * mean_dshot
    return max(0.0, intercept), max(0.0, slope)


def estimate_current_model(
    points: list[HistoricalPoint],
    direction: int,
) -> tuple[float, float]:
    """Estimate current from throttle above the selected direction's minimum."""
    directional = [
        point
        for point in points
        if (
            (direction > 0 and point.dshot <= base.DIRECTION_ONE_MAX_DSHOT)
            or (direction < 0 and point.dshot >= base.DIRECTION_TWO_MIN_DSHOT)
        )
    ]
    if not directional:
        return 0.0, 0.0
    effective_dshots = [
        _effective_dshot(point.dshot, direction) for point in directional
    ]
    mean_dshot = statistics.mean(effective_dshots)
    mean_current = statistics.mean(point.current for point in directional)
    denominator = sum((dshot - mean_dshot) ** 2 for dshot in effective_dshots)
    if denominator == 0:
        return 0.0, 0.0
    slope = sum(
        (dshot - mean_dshot) * (point.current - mean_current)
        for dshot, point in zip(effective_dshots, directional)
    ) / denominator
    return max(0.0, mean_current - slope * mean_dshot), max(0.0, slope)


class BatteryVoltageEstimator:
    """Estimate unloaded battery voltage from loaded ESC voltage and current."""

    def __init__(self, resistance_ohms: float) -> None:
        self.resistance_ohms = resistance_ohms

    def estimate(self, esc_voltage: float, current: float) -> float:
        return esc_voltage + self.resistance_ohms * current


class ExponentialMovingAverage:
    """Low-pass filter for noisy telemetry values."""

    def __init__(self, alpha: float, initial: float) -> None:
        self.alpha = alpha
        self.value = initial

    def update(self, sample: float) -> float:
        self.value += self.alpha * (sample - self.value)
        return self.value


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
        consumption_intercept: float,
        consumption_slope: float,
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
        self.consumption_intercept = consumption_intercept
        self.consumption_slope = consumption_slope
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
        # ``voltage`` is the already-loaded ESC voltage. Applying modeled
        # battery sag on top of it double-counts the load effect, especially
        # when the historical current-vs-DShot fit is sparse or nonlinear.
        effective_dshot = _effective_dshot(dshot, self.direction)
        return voltage - self.k * effective_dshot * effective_dshot * self.dwell

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
            slew = (
                0.0
                if previous_dshot == 0
                else abs(dshot - previous_dshot) / scale
            )
            estimated_seconds = self.sample_seconds * (
                1.0 + DEFAULT_SLEW_TIME_FACTOR * slew
            )
            score = novelty / estimated_seconds - self.slew_penalty * slew * slew
            estimated_consumption = self.estimate_consumption(
                dshot,
                estimated_seconds,
            )
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

    def choose_mpc(
        self,
        voltage: float,
        previous_dshot: int,
        consumed_mah: float,
        horizon: int,
    ) -> tuple[int, float, float, float]:
        """Choose the first action of a short receding-horizon rollout."""
        if horizon <= 1:
            return self.choose(voltage, previous_dshot, consumed_mah)
        first_choice: tuple[float, int, float, float, float] | None = None
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
            seconds, consumption = self.estimate_step(dshot, previous_dshot)
            if consumed_mah + consumption > self.battery_capacity_mah:
                continue
            novelty = self.coverage.novelty(predicted, dshot)
            score = novelty / seconds
            simulated = AdaptivePlanner(
                self.coverage.clone(),
                self.direction,
                self.dwell,
                self.dshot_step,
                self.slew_penalty,
                self.k,
                self.sample_seconds,
                self.consumption_intercept,
                self.consumption_slope,
                self.battery_capacity_mah,
                self.battery_resistance,
                self.current_intercept,
                self.current_slope,
                self.max_dshot_change,
            )
            simulated.coverage.add(predicted, dshot)
            rollout_voltage = predicted
            rollout_dshot = dshot
            rollout_consumed = consumed_mah + consumption
            for _ in range(horizon - 1):
                try:
                    next_dshot, next_voltage, next_seconds, next_consumption = (
                        simulated.choose(
                            rollout_voltage,
                            rollout_dshot,
                            rollout_consumed,
                        )
                    )
                except ValueError:
                    break
                score += simulated.coverage.novelty(
                    next_voltage,
                    next_dshot,
                ) / next_seconds
                simulated.coverage.add(next_voltage, next_dshot)
                rollout_voltage = next_voltage
                rollout_dshot = next_dshot
                rollout_consumed += next_consumption
            slew = (
                0.0
                if previous_dshot == 0
                else abs(dshot - previous_dshot) / scale
            )
            score -= self.slew_penalty * slew * slew
            candidate = (score, dshot, predicted, seconds, consumption)
            if first_choice is None or candidate > first_choice:
                first_choice = candidate
        if first_choice is None:
            raise ValueError(
                "No safe DShot candidate remains above the "
                f"{base.IMMEDIATE_LOW_VOLTAGE_LIMIT_V:.1f} V planning floor"
            )
        _, dshot, predicted, seconds, consumption = first_choice
        return dshot, predicted, seconds, consumption

    def estimate_step(
        self,
        dshot: int,
        previous_dshot: int,
    ) -> tuple[float, float]:
        if previous_dshot == 0:
            return self.sample_seconds, self.estimate_consumption(
                dshot,
                self.sample_seconds,
            )
        scale = max(self.candidates)
        slew = abs(dshot - previous_dshot) / scale
        seconds = self.sample_seconds * (1.0 + DEFAULT_SLEW_TIME_FACTOR * slew)
        return seconds, self.estimate_consumption(dshot, seconds)

    def estimate_consumption(self, dshot: int, seconds: float) -> float:
        effective_dshot = _effective_dshot(dshot, self.direction)
        rate = self.consumption_intercept + (
            self.consumption_slope * effective_dshot
        )
        return max(0.0, rate * seconds)

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
            self.consumption_intercept,
            self.consumption_slope,
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


class RealtimePathMatcher:
    """Advance through a plan by nearest voltage/DShot state, not elapsed time."""

    def __init__(
        self,
        planned_path: list[tuple[int, float]],
        voltage_bin: float,
        dshot_step: int,
        max_dshot_change: int,
    ) -> None:
        self.planned_path = planned_path
        self.voltage_bin = voltage_bin
        self.dshot_step = dshot_step
        self.max_dshot_change = max_dshot_change
        self.index = 0

    def next(
        self,
        voltage: float,
        previous_dshot: int,
    ) -> tuple[int, float, int] | None:
        if self.index >= len(self.planned_path):
            return None
        candidates = [
            index
            for index in range(self.index, len(self.planned_path))
            if (
                previous_dshot == 0
                or abs(self.planned_path[index][0] - previous_dshot)
                <= self.max_dshot_change
            )
        ]
        if not candidates:
            return None
        best_index = min(
            candidates,
            key=lambda index: (
                abs(self.planned_path[index][1] - voltage) / self.voltage_bin
                + abs(self.planned_path[index][0] - previous_dshot)
                / self.dshot_step
            ),
        )
        dshot, predicted = self.planned_path[best_index]
        return dshot, predicted, best_index

    def advance(self, index: int) -> None:
        self.index = max(self.index, index + 1)


class PlannerPlot:
    """Show historical coverage and the planned/actual adaptive path."""

    def __init__(
        self,
        points: list[HistoricalPoint],
        planned_path: list[tuple[int, float]],
        stop_event: threading.Event,
    ) -> None:
        self.points = points
        self.stop_event = stop_event
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
        self.figure.canvas.mpl_connect("key_press_event", self._on_key_press)
        self.figure.canvas.mpl_connect("close_event", self._on_close)
        plt.ion()
        plt.show(block=False)

    def _on_key_press(self, event: object) -> None:
        key = getattr(event, "key", None)
        if key in {"ctrl+c", "escape", "q"}:
            self.stop_event.set()

    def _on_close(self, _event: object) -> None:
        self.stop_event.set()

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
        "--voltage-filter-alpha",
        type=float,
        default=0.2,
        help="Telemetry low-pass factor for voltage values (0 < alpha <= 1)",
    )
    parser.add_argument(
        "--command-interval",
        type=float,
        default=DEFAULT_COMMAND_INTERVAL,
        help="Minimum seconds between DShot commands (default: 0.1)",
    )
    parser.add_argument(
        "--command-ack-timeout",
        type=float,
        default=DEFAULT_COMMAND_ACK_TIMEOUT,
        help="Seconds to wait for matching throttle telemetry",
    )
    parser.add_argument(
        "--command-retries",
        type=int,
        default=DEFAULT_COMMAND_RETRIES,
        help="Maximum command transmissions when throttle acknowledgement is missed",
    )
    parser.add_argument(
        "--shutdown-timeout",
        type=float,
        default=DEFAULT_SHUTDOWN_TIMEOUT,
        help="Maximum seconds to send zero and confirm stopped telemetry",
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
    parser.add_argument(
        "--mpc-horizon",
        type=int,
        default=DEFAULT_MPC_HORIZON,
        help="Number of command steps considered by each real-time rollout",
    )
    return parser


def run(args: argparse.Namespace) -> None:
    if (
        args.dwell <= 0
        or not 0 < args.voltage_filter_alpha <= 1
        or args.command_interval <= 0
        or args.command_ack_timeout <= 0
        or args.command_retries <= 0
        or args.shutdown_timeout <= 0
        or args.max_dshot_change <= 0
        or args.voltage_bin <= 0
        or args.dshot_step <= 0
        or args.mpc_horizon <= 0
        or args.max_duration < 0
        or args.battery_capacity <= 0
        or args.initial_consumed_mah < 0
        or args.initial_consumed_mah >= args.battery_capacity
    ):
        raise ValueError(
            "dwell, voltage-filter-alpha, command-interval, "
            "command-ack-timeout, command-retries, "
            "shutdown-timeout, "
            "max-dshot-change, voltage-bin, dshot-step, and "
            "mpc-horizon, "
            "battery-capacity must be positive; "
            "max-duration cannot be negative and initial-consumed-mah must be "
            "between zero and battery-capacity"
        )
    points = read_historical_points(args.data_folder)
    telemetry_seconds = estimate_timing(points)
    consumption_intercept, consumption_slope = estimate_consumption_model(
        points,
        args.direction,
    )
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
    current_intercept, current_slope = estimate_current_model(
        points,
        args.direction,
    )
    planner = AdaptivePlanner(
        coverage,
        args.direction,
        args.dwell,
        args.dshot_step,
        args.slew_penalty,
        estimate_k(points, args.direction),
        step_seconds,
        consumption_intercept,
        consumption_slope,
        args.battery_capacity,
        resistance,
        current_intercept,
        current_slope,
        args.max_dshot_change,
    )
    available_capacity = args.battery_capacity - args.initial_consumed_mah
    estimated_step_consumption = planner.estimate_consumption(
        max(planner.candidates),
        step_seconds,
    )
    estimated_steps = int(
        available_capacity / max(estimated_step_consumption, 1e-9)
    )
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
    with _SafeSerial(
        args.port,
        args.baudrate,
        args.channel,
        color_output,
        telemetry_queue,
        stop_event,
        args.shutdown_timeout,
        args.command_interval,
    ) as port:
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
        startup_samples = [
            sample
            for sample in initial_samples
            if (
                base.telemetry_throttle(sample) is None
                or base.telemetry_throttle(sample) == 0
            )
        ]
        initial_telemetry = base.average_telemetry(startup_samples)
        if initial_cutoff:
            stop_event.clear()
            raise RuntimeError(
                "Battery voltage is already at the safety cutoff before testing starts."
            )
        if initial_telemetry is None:
            raise RuntimeError(
                "No valid startup telemetry received with reported throttle 0. "
                "Check the serial port, baud rate, telemetry format, "
                "firmware telemetry forwarding, and that the ESC accepted "
                "the startup stop command."
            )
        initial_voltage = initial_telemetry.values.get("voltage", math.nan)
        if not math.isfinite(initial_voltage):
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
        startup_consumption = initial_telemetry.values.get(
            "consumption",
            0.0,
        )
        if not math.isfinite(startup_consumption):
            startup_consumption = 0.0
        consumption_baseline = startup_consumption
        esc_voltage_filter = ExponentialMovingAverage(
            args.voltage_filter_alpha,
            initial_voltage,
        )
        battery_voltage_filter = ExponentialMovingAverage(
            args.voltage_filter_alpha,
            initial_battery_voltage,
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

        if args.plot:
            print(
                _style(
                    f"Building MPC preview from {initial_voltage:.2f} V "
                    f"({estimated_steps:,} candidate steps)...",
                    "1;33",
                    color_output,
                ),
                flush=True,
            )
        planned_path = (
            planner.precompute_path(
                initial_voltage,
                previous_dshot,
                max(1, estimated_steps),
                args.battery_capacity,
                consumed_mah,
                report_planning_progress,
            )
            if args.plot
            else []
        )
        print(
            "\r"
            + _style(
                f"MPC preview complete: {len(planned_path):,} steps in "
                f"{time.monotonic() - planning_started:.1f}s"
                + " " * 20,
                "1;32",
                color_output,
            )
        )
        plot = (
            PlannerPlot(points, planned_path, stop_event)
            if args.plot
            else None
        )
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
                "mpc_horizon": args.mpc_horizon,
                "voltage_filter_alpha": args.voltage_filter_alpha,
                "command_interval_s": args.command_interval,
                "shutdown_timeout_s": args.shutdown_timeout,
                "command_ack_timeout_s": args.command_ack_timeout,
                "command_retries": args.command_retries,
                "max_duration_s": args.max_duration,
                "voltage_bin": args.voltage_bin,
                "dshot_step": args.dshot_step,
                "slew_penalty": args.slew_penalty,
                "max_dshot_change": args.max_dshot_change,
                "estimated_k": planner.k,
                "estimated_telemetry_interval_s": telemetry_seconds,
                "estimated_seconds_per_command": step_seconds,
                "consumption_model_intercept_mah_per_second": (
                    consumption_intercept
                ),
                "consumption_model_slope_mah_per_second_per_dshot": (
                    consumption_slope
                ),
                "battery_capacity_mah": args.battery_capacity,
                "initial_consumed_mah": args.initial_consumed_mah,
                "available_capacity_mah": available_capacity,
                "estimated_planned_steps": len(planned_path),
                "startup_esc_voltage": initial_voltage,
                "startup_sample_count": len(startup_samples),
                "startup_discarded_sample_count": (
                    len(initial_samples) - len(startup_samples)
                ),
                "startup_current_a": initial_current,
                "startup_temperature_c": initial_telemetry.values.get(
                    "temperature",
                    math.nan,
                ),
                "startup_consumption": startup_consumption,
                "consumption_baseline": consumption_baseline,
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
                    or consumed_mah + planner.estimate_consumption(
                        max(planner.candidates),
                        planner.sample_seconds,
                    )
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
                voltage = (
                    initial_voltage
                    if record_id == 0
                    else esc_voltage_filter.value
                )
                dshot, predicted, estimated_seconds, estimated_consumption = (
                    planner.choose_mpc(
                        voltage,
                        previous_dshot,
                        consumed_mah,
                        args.mpc_horizon,
                    )
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
                attempts_remaining = args.command_retries
                while True:
                    try:
                        while True:
                            telemetry_queue.get_nowait()
                    except queue.Empty:
                        pass
                    print(
                        _style(
                            f"Sending DShot {dshot} "
                            f"(planned voltage {predicted:.2f} V); "
                            f"awaiting acknowledgement...",
                            "36",
                            color_output,
                        ),
                        flush=True,
                    )
                    base.send_command(
                        port,
                        base.make_dshot_command(
                            "dshot setthrottle {channel} {dshot}",
                            args.channel,
                            dshot,
                        ),
                    )
                    next_command_time = time.monotonic() + args.command_interval
                    acknowledged = False
                    acknowledgement_deadline = (
                        time.monotonic() + args.command_ack_timeout
                    )
                    while time.monotonic() < acknowledgement_deadline:
                        try:
                            sample = telemetry_queue.get(timeout=0.1)
                        except queue.Empty:
                            continue
                        reported_dshot = base.telemetry_throttle(sample)
                        voltage_sample = sample.values.get("voltage")
                        if (
                            voltage_sample is not None
                            and voltage_sample < base.IMMEDIATE_LOW_VOLTAGE_LIMIT_V
                        ):
                            raise RuntimeError(
                                "Battery voltage crossed the immediate safety cutoff "
                                "while waiting for DShot acknowledgement."
                            )
                        if reported_dshot == dshot:
                            acknowledged = True
                            break
                    if acknowledged:
                        print(
                            _style(
                                f"DShot {dshot} acknowledged; collecting telemetry "
                                f"for {args.dwell:.1f}s...",
                                "36",
                                color_output,
                            ),
                            flush=True,
                        )
                        break
                    attempts_remaining -= 1
                    if attempts_remaining <= 0:
                        raise RuntimeError(
                            f"DShot {dshot} was not acknowledged after "
                            f"{args.command_retries} attempts"
                        )
                    retry_wait = max(0.0, next_command_time - time.monotonic())
                    if retry_wait > 0:
                        print(
                            _style(
                                f"Waiting {retry_wait:.2f}s before acknowledgement retry...",
                                "33",
                                color_output,
                            ),
                            flush=True,
                        )
                        if stop_event.wait(retry_wait):
                            break
                    print(
                        _style(
                            f"DShot {dshot} was not acknowledged; retrying "
                            f"({attempts_remaining} attempts left)...",
                            "1;33",
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
                    if math.isfinite(row["voltage"]):
                        esc_voltage_filter.update(float(row["voltage"]))
                    if (
                        math.isfinite(row["voltage"])
                        and math.isfinite(row["current_draw"])
                    ):
                        raw_battery_voltage = battery_estimator.estimate(
                            float(row["voltage"]),
                            float(row["current_draw"]),
                        )
                        row["battery_voltage_estimate"] = (
                            battery_voltage_filter.update(raw_battery_voltage)
                        )
                    logger.append(row)
                    if math.isfinite(row["consumption"]):
                        measured_consumption = max(
                            0.0,
                            float(row["consumption"]) - consumption_baseline,
                        )
                        consumed_mah = max(
                            consumed_mah,
                            args.initial_consumed_mah + measured_consumption,
                        )
                    else:
                        consumed_mah += estimated_consumption / len(samples)
                    last_voltage = (
                        esc_voltage_filter.value
                        if math.isfinite(row["voltage"])
                        else voltage
                    )
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
                    stop_event.clear()
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
            logger.close()


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
