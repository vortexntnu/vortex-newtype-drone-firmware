"""Plot thrust-per-power efficiency against DShot value from a test CSV.

Power is calculated as voltage times current_draw. Efficiency is defined here
as thrust divided by power, with units of newton per watt.

Example:

    python testing\\plot_efficiency_csv.py thruster_test.csv
"""

from __future__ import annotations

import argparse
import csv
import math
from pathlib import Path

import matplotlib.pyplot as plt


def read_rows(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8-sig") as file:
        data_lines = (line for line in file if not line.startswith("#"))
        reader = csv.DictReader(data_lines)
        if reader.fieldnames is None:
            raise ValueError("CSV file has no header row")
        required = {"dshot_value", "thrust", "voltage", "current_draw"}
        missing = sorted(required - set(reader.fieldnames))
        if missing:
            raise ValueError(
                f"CSV is missing required columns: {', '.join(missing)}"
            )
        return list(reader)


def calculate_efficiency(rows: list[dict[str, str]]) -> tuple[list[float], list[float]]:
    dshot_values: list[float] = []
    efficiencies: list[float] = []
    for row_number, row in enumerate(rows, start=2):
        try:
            dshot = float(row["dshot_value"])
            thrust = float(row["thrust"])
            voltage = float(row["voltage"])
            current = float(row["current_draw"])
        except (TypeError, ValueError) as exc:
            raise ValueError(f"Non-numeric value on CSV row {row_number}") from exc

        if not all(math.isfinite(value) for value in (dshot, thrust, voltage, current)):
            raise ValueError(f"Non-finite value on CSV row {row_number}")
        power = voltage * current
        if thrust == 0 or power == 0:
            continue
        efficiency = thrust / power
        if not math.isfinite(efficiency):
            raise ValueError(f"Non-finite efficiency on CSV row {row_number}")
        dshot_values.append(dshot)
        efficiencies.append(efficiency)
    return dshot_values, efficiencies


def plot_efficiency(path: Path, connect_points: bool) -> None:
    rows = read_rows(path)
    if not rows:
        raise ValueError("CSV file contains no data rows")
    dshot_values, efficiencies = calculate_efficiency(rows)

    figure, axes = plt.subplots()
    axes.scatter(dshot_values, efficiencies, s=12)
    if connect_points:
        axes.plot(dshot_values, efficiencies, alpha=0.5)
    axes.set_xlabel("DShot value")
    axes.set_ylabel("Thrust / power (N/W)")
    axes.set_title(f"Efficiency: {path.name}")
    axes.grid(True, alpha=0.3)
    figure.tight_layout()
    plt.show()


def make_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("csv_file", type=Path, help="Thruster-test CSV file")
    parser.add_argument(
        "--line",
        action="store_true",
        help="Connect points in CSV order with a line",
    )
    return parser


def main() -> None:
    args = make_parser().parse_args()
    try:
        plot_efficiency(args.csv_file, args.line)
    except (OSError, ValueError) as exc:
        raise SystemExit(f"Could not plot efficiency: {exc}") from exc


if __name__ == "__main__":
    main()
