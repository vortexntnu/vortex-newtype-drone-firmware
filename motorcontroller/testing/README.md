# Thruster testing tools

These scripts run DShot thruster tests, record telemetry to CSV, and plot
recorded measurements. Commands are sent to the STM32 as complete UART
messages; no delay between individual bytes is required.

- `test_script.py` runs a test and saves measurements.
- `plot_thruster_csv.py` creates a configurable 3D plot from one or more CSV
  files.
- `plot_efficiency_csv.py` plots thrust-per-power efficiency.
- `plan_thruster_test.py` adaptively explores unexplored voltage/DShot cells.

## Requirements

Install the Python dependencies from the `motorcontroller` directory:

```powershell
pip install -r tools\requirements.txt
```

Connect the STM32 to the PC-facing serial port. On Windows this is usually a
port such as `COM12`.

## Safety

Secure the thruster and clear the test area before starting a test. The script
automatically:

1. Sends DShot `0` to stop the thruster.
2. Waits for the thruster to stop.
3. Sends `weight tareall`.
4. Waits for tare completion.
5. Starts the test.

DShot values `0–47` are reserved commands. Test values must be in the range
`48–2047`:

- `48–1047` uses `weight1` and produces positive thrust.
- `1048–2047` uses `weight2` and produces negative thrust.

The script sends DShot `0` again when the test ends.

## Running a test

### Continuous random test

Use `--direction 1` to continuously test random values in the positive
direction:

```powershell
python testing\test_script.py `
  --port COM12 `
  --direction 1
```

Use `--direction -1` for the negative direction:

```powershell
python testing\test_script.py `
  --port COM12 `
  --direction -1
```

In direction mode:

- A new random DShot value is selected for each measurement.
- The default dwell time is one second.
- The default cycle count is zero, so the test runs until Ctrl+C or a safety
  shutdown.

### Deterministic sweep

Without `--direction`, the script runs a repeatable sweep:

```powershell
python testing\test_script.py `
  --port COM12 `
  --channel 0 `
  --start 48 `
  --stop 2047 `
  --step 48 `
  --dwell 1 `
  --cycles 1
```

The sweep reverses direction after reaching `--stop`. Use a negative `--step`
when starting above `--stop`, for example:

```powershell
python testing\test_script.py `
  --port COM12 `
  --start 2047 `
  --stop 48 `
  --step -48 `
  --dwell 1 `
  --cycles 1
```

Use `--cycles 0` (the default) to repeat indefinitely.

### Live plot

Plotting is disabled by default. Add `--plot` to display the live 3D plot
during a test:

```powershell
python testing\test_script.py `
  --port COM12 `
  --direction 1 `
  --plot
```

### Output files

If `--output` is omitted, the script creates a timestamped filename such as:

```text
thruster_test_20261109_162310.csv
```

Specify a path explicitly with:

```powershell
python testing\test_script.py `
  --port COM12 `
  --direction 1 `
  --output data\positive_direction.csv
```

The CSV starts with `# key=value` metadata lines containing the test settings.
Measurements are averaged over each dwell period and written in batches of
25 rows. Any remaining rows are written when the test ends.

## Telemetry

The default telemetry format is text. The STM32 should send JSON such as:

```json
{
  "temperature": 31,
  "voltage": 16.10,
  "current": 5.00,
  "consumption": 12,
  "erpm": 4200,
  "throttle": 512,
  "weight1": 300,
  "weight2": 238
}
```

The `throttle` value is the command currently applied by the microcontroller.
It is used for the recorded `dshot_value` and for selecting the active weight
cell, rather than the command requested by the PC. The script also accepts
terminal-wrapped JSON and `key=value` telemetry.
Every valid telemetry sample received during a dwell is recorded; samples with
different reported throttle values are not filtered or averaged.
Select binary ESC frames with:

```powershell
python testing\test_script.py `
  --port COM12 `
  --direction 1 `
  --telemetry-format binary
```

Use `--validate-telemetry-crc` to validate the CRC byte in binary frames.

Thrust is calculated from the active load-cell reading in grams:

```text
thrust = weight_grams / 1000 * 9.80665 * 0.230 / 0.505
```

## Safety shutdown

The test stops immediately when battery voltage drops below `12.0 V`. It also
stops when voltage is at or below the configured low-voltage limit (default
`12.5 V`) for the configured number of consecutive telemetry samples (default
`5`).

Configure these thresholds with:

```powershell
python testing\test_script.py `
  --port COM12 `
  --direction 1 `
  --low-voltage-limit 12.5 `
  --low-voltage-samples 5
```

The test also stops safely when Ctrl+C is pressed. In all cases it commands
DShot `0` and writes pending CSV data.

## Plotting recorded data

### 3D thruster plot

Plot one CSV with the default axes:

```powershell
python testing\plot_thruster_csv.py data\positive_direction.csv
```

The default axes are:

```text
X = voltage
Y = dshot_value
Z = thrust
```

Plot all CSV files in a folder on one figure:

```powershell
python testing\plot_thruster_csv.py data
```

Files are plotted in alphabetical order with one legend entry per file.

Choose different columns:

```powershell
python testing\plot_thruster_csv.py data `
  --x erpm `
  --y current_draw `
  --z temperature `
  --color voltage
```

Connect points in CSV order with `--line`:

```powershell
python testing\plot_thruster_csv.py data\positive_direction.csv --line
```

The plotter can calculate derived columns without changing the CSV:

```powershell
python testing\plot_thruster_csv.py data\positive_direction.csv `
  --x dshot_value `
  --y voltage `
  --z power
```

Power is calculated as:

```text
power = voltage * current_draw
```

Efficiency can be plotted as:

```powershell
python testing\plot_thruster_csv.py data\positive_direction.csv `
  --x dshot_value `
  --y voltage `
  --z efficiency
```

Efficiency is calculated as `thrust / power` in `N/W`. Rows with zero thrust
or zero power are ignored.

List the available columns, including derived columns:

```powershell
python testing\plot_thruster_csv.py data\positive_direction.csv `
  --include-power `
  --include-efficiency `
  --list-columns
```

### Efficiency plot

Plot thrust-per-power efficiency against DShot value:

```powershell
python testing\plot_efficiency_csv.py data\positive_direction.csv
```

Use `--line` to connect points in CSV order:

```powershell
python testing\plot_efficiency_csv.py data\positive_direction.csv --line
```

Efficiency is expressed in newtons per watt (`N/W`). Rows with zero thrust or
zero power are ignored.

## Adaptive coverage test

`plan_thruster_test.py` reads every CSV in `data` and precomputes a finite
path from the existing voltage/DShot coverage. Candidate points farther from
known data are more valuable. The planner estimates voltage dynamics using
`dV/dt ~= -K * dshot^2` plus current-dependent ESC sag, uses a quadratic
DShot-change cost, and scores expected new coverage per unit time. Power cost
is not penalized.

Run it in the positive direction:

```powershell
python testing\plan_thruster_test.py `
  --port COM12 `
  --direction 1
```

Use `--direction -1` for DShot values `1048–2047`. The test continues until
Ctrl+C or a safety shutdown. Add `--plot` to show historical coverage together
with the planned and actual path:

```powershell
python testing\plan_thruster_test.py `
  --port COM12 `
  --direction 1 `
  --plot
```

The planner is a model-based heuristic, not a mathematically guaranteed
optimum. Adjust its resolution and penalties when needed:

```powershell
python testing\plan_thruster_test.py `
  --port COM12 `
  --direction 1 `
  --voltage-bin 0.05 `
  --dshot-step 8 `
  --slew-penalty 0.35
```

Use `--data-folder` to select another historical-data folder and `--output`
to choose the new CSV path. The planner estimates loaded-battery sag as
`V_battery ~= V_ESC + R_internal * current_draw`; use
`--battery-resistance` to provide a calibrated resistance in ohms.

This is only an estimate: the historical files contain ESC voltage, not a
direct battery-side voltage reference, and battery open-circuit voltage also
changes over time. The estimated value is written as
`battery_voltage_estimate` in the adaptive CSV and shown in green when
`--plot` is enabled. Safety shutdown always uses the measured ESC voltage:
the test stops immediately below `12.0 V`, regardless of the estimate.

The planner uses historical `elapsed_s` intervals to estimate the time cost of
each measurement and historical `consumption` changes to report projected
consumption. Consumption is not used as a penalty, so high-power measurements
remain eligible when they reveal more data. The default maximum duration is
four hours and the battery capacity is limited to `8500 mAh`:

```powershell
python testing\plan_thruster_test.py `
  --port COM12 `
  --direction 1 `
  --max-duration 14400
```

Use `--max-duration 0` for no time limit. The limit is a planning/operator
limit and does not replace the immediate measured-ESC-voltage shutdown. The
planner stops when measured cumulative `consumption` reaches the configured
capacity. Change it with `--battery-capacity`; the default is `8500`.

Before planning, the script holds DShot at zero and collects startup
telemetry. The averaged ESC voltage is used as the initial voltage for the
planned path, so a partially charged battery does not start from the highest
historical voltage. Voltage alone is not a reliable mAh state-of-charge
measurement, so provide capacity already used when starting with a partially
discharged battery:

```powershell
python testing\plan_thruster_test.py `
  --port COM12 `
  --direction 1 `
  --initial-consumed-mah 4250
```

For the default `8500 mAh` battery, `4250` represents an assumed half-used
pack. The startup voltage is still used for voltage planning and safety
checks.

The program reports planning progress with completed steps, percentage,
elapsed time, and an estimated time remaining before the test begins. The
progress line is updated in place in an interactive terminal.
The planner uses an indexed CPU coverage search rather than scanning every
historical point for every candidate, so no GPU or CUDA installation is
required.
No nonzero DShot command is sent until startup telemetry has been collected
and path planning has completed. The terminal then reports each DShot command
as it is sent and indicates when it is waiting for telemetry.
Telemetry samples may arrive much faster than commands. The planner therefore
uses the dwell time or `--command-interval`, whichever is longer, as the
minimum duration of a planned command step. The default minimum interval
between DShot commands is 100 ms:

```powershell
python testing\plan_thruster_test.py `
  --port COM12 `
  --direction 1 `
  --command-interval 0.1
```

This rate limit is enforced with a monotonic timer before every DShot command,
while the final shutdown command is sent immediately for safety.
The planner also applies a stronger quadratic cost to large DShot changes and
adds more time cost to large slews. The defaults are equivalent to
`--slew-penalty 1.0`; override this when deliberately testing more aggressive
transitions. It also limits a single command transition to 256 DShot units by
default; change this with `--max-dshot-change` if the ESC supports larger
steps. The initial command from stopped (`DShot 0`) is exempt so direction
`-1` can enter its valid range starting at `1048`; the limit applies after
that first command.
All telemetry samples are still written to the CSV, but the terminal prints
only one summary per command. This prevents terminal output from becoming a
processing bottleneck and causing stale telemetry to accumulate in the queue.
The summary shows both the commanded and firmware-reported DShot values.

The CSV comment header records the run configuration and planning context,
including the startup ESC/battery-voltage estimates, startup current and
temperature, initial and available capacity, historical point count, timing
and consumption estimates, battery-resistance estimate, telemetry settings,
and voltage safety limits.

Telemetry is sent automatically by the firmware when ESC telemetry arrives.
Every telemetry sample received during a dwell is saved as its own CSV row;
samples with different reported DShot values are not filtered or averaged.
The planner stops with an explicit error if no valid telemetry arrives during
a dwell, rather than recording `nan` measurements.

When `--plot` is enabled, the historical coverage, precomputed path, actual
ESC-voltage path, and estimated battery-voltage path are shown together. The
plot keeps its zoom and window state while new samples arrive.
