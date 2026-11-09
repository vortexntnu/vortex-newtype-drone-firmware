"""Plot thruster-test CSV data as a configurable 3D scatter plot.

Examples:

    python testing\\plot_thruster_csv.py thruster_test.csv
    python testing\\plot_thruster_csv.py thruster_test.csv --x dshot_value --y voltage --z thrust
    python testing\\plot_thruster_csv.py thruster_test.csv --list-columns
"""

from __future__ import annotations

import argparse
import csv
import math
from pathlib import Path
from typing import Iterable

import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D  # noqa: F401 - registers 3D projection


def read_csv(path: Path) -> tuple[list[str], list[dict[str, str]]]:
    """Read the CSV header and rows."""
    with path.open(newline="", encoding="utf-8-sig") as file:
        data_lines = (line for line in file if not line.startswith("#"))
        reader = csv.DictReader(data_lines)
        if reader.fieldnames is None:
            raise ValueError("CSV file has no header row")
        return list(reader.fieldnames), list(reader)


def numeric_column(rows: Iterable[dict[str, str]], column: str) -> list[float]:
    """Convert one CSV column to finite numeric values."""
    values: list[float] = []
    for row_number, row in enumerate(rows, start=2):
        raw_value = row.get(column, "")
        try:
            value = float(raw_value)
        except (TypeError, ValueError) as exc:
            raise ValueError(
                f"Column '{column}' contains a non-numeric value on CSV row "
                f"{row_number}: {raw_value!r}"
            ) from exc
        if not math.isfinite(value):
            raise ValueError(
                f"Column '{column}' contains a non-finite value on CSV row "
                f"{row_number}: {raw_value!r}"
            )
        values.append(value)
    return values


def validate_columns(columns: list[str], requested: Iterable[str]) -> None:
    missing = [column for column in requested if column not in columns]
    if missing:
        available = ", ".join(columns)
        raise ValueError(
            f"Unknown column(s): {', '.join(missing)}. Available columns: {available}"
        )


def add_derived_columns(rows: list[dict[str, str]], columns: list[str]) -> None:
    """Add calculated columns that do not need to be stored in the CSV."""
    if "power" not in columns and "efficiency" not in columns:
        return
    for row_number, row in enumerate(rows, start=2):
        try:
            voltage = float(row["voltage"])
            current = float(row["current_draw"])
        except (KeyError, TypeError, ValueError) as exc:
            raise ValueError(
                f"Power requires numeric voltage and current_draw values "
                f"on CSV row {row_number}"
            ) from exc
        power = voltage * current
        if not math.isfinite(power):
            raise ValueError(f"Power is non-finite on CSV row {row_number}")
        if "power" in columns:
            row["power"] = str(power)
        if "efficiency" in columns:
            try:
                thrust = float(row["thrust"])
            except (KeyError, TypeError, ValueError) as exc:
                raise ValueError(
                    f"Efficiency requires a numeric thrust value on CSV row {row_number}"
                ) from exc
            if not math.isfinite(thrust):
                raise ValueError(f"Thrust is non-finite on CSV row {row_number}")
            row["efficiency"] = "" if thrust == 0 or power == 0 else str(thrust / power)


def plot_csv(
    path: Path,
    x_column: str,
    y_column: str,
    z_column: str,
    color_column: str | None,
    line: bool,
) -> None:
    columns, rows = read_csv(path)
    requested_columns = (x_column, y_column, z_column, color_column)
    for derived_column in ("power", "efficiency"):
        if derived_column in requested_columns and derived_column not in columns:
            columns.append(derived_column)
    add_derived_columns(rows, columns)
    if "efficiency" in requested_columns:
        rows = [row for row in rows if row.get("efficiency", "") != ""]
    validate_columns(columns, (x_column, y_column, z_column))
    if color_column is not None:
        validate_columns(columns, (color_column,))
    if not rows:
        raise ValueError("CSV file contains no data rows")

    x_values = numeric_column(rows, x_column)
    y_values = numeric_column(rows, y_column)
    z_values = numeric_column(rows, z_column)
    color_values = numeric_column(rows, color_column) if color_column else None

    figure = plt.figure("Thruster CSV plot")
    axes = figure.add_subplot(111, projection="3d")
    if color_values is None:
        axes.scatter(x_values, y_values, z_values)
    else:
        points = axes.scatter(
            x_values,
            y_values,
            z_values,
            c=color_values,
            cmap="viridis",
        )
        figure.colorbar(points, ax=axes, label=color_column)
    if line:
        axes.plot(x_values, y_values, z_values, alpha=0.5)

    axes.set_xlabel(x_column)
    axes.set_ylabel(y_column)
    axes.set_zlabel(z_column)
    axes.set_title(path.name)
    figure.tight_layout()
    plt.show()


def make_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("csv_file", type=Path, help="Thruster-test CSV file")
    parser.add_argument("--x", default="voltage", help="Column for the X axis")
    parser.add_argument("--y", default="dshot_value", help="Column for the Y axis")
    parser.add_argument("--z", default="thrust", help="Column for the Z axis")
    parser.add_argument(
        "--color",
        help="Optional numeric column used to color the points",
    )
    parser.add_argument(
        "--line",
        action="store_true",
        help="Connect points in CSV order with a line",
    )
    parser.add_argument(
        "--list-columns",
        action="store_true",
        help="Print available columns and exit",
    )
    parser.add_argument(
        "--include-power",
        action="store_true",
        help="Add calculated power (watts) from voltage x current_draw",
    )
    parser.add_argument(
        "--include-efficiency",
        action="store_true",
        help="Add calculated efficiency (N/W) from thrust / power",
    )
    return parser


def main() -> None:
    args = make_parser().parse_args()
    try:
        columns, rows = read_csv(args.csv_file)
        if args.include_power:
            if "power" not in columns:
                columns.append("power")
        if args.include_efficiency:
            if "efficiency" not in columns:
                columns.append("efficiency")
        if args.include_power or args.include_efficiency:
            add_derived_columns(rows, columns)
        if args.list_columns:
            print("\n".join(columns))
            return
        plot_csv(args.csv_file, args.x, args.y, args.z, args.color, args.line)
    except (OSError, ValueError) as exc:
        raise SystemExit(f"Could not plot CSV: {exc}") from exc


if __name__ == "__main__":
    main()
