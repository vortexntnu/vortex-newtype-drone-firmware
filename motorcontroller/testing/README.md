# Thruster testing tools

These programs test a DShot-controlled thruster and plot the resulting CSV
data:

- `test_script.py` runs a live DShot sweep, reads telemetry, displays a live
  3D plot, and saves measurements.
- `plot_thruster_csv.py` plots a previously recorded CSV file.

## Requirements

From the `motorcontroller` directory, install the Python dependencies:

```powershell
pip install -r tools\requirements.txt
```

The STM32 must be connected to a serial port. On Windows this is usually a
port such as `COM12`.

## Safety

Secure the thruster and clear the test area before running a test. The script
automatically:

1. Sends DShot `0` to stop the thruster.
2. Waits for the thruster to stop.
3. Sends `weight tareall`.
4. Waits for tare completion.
5. Starts the sweep.

DShot values `0–47` are reserved commands. Sweep values must be in the
throttle range `48–2047`. DShot `1047` is maximum throttle in one direction;
DShot `1048` is minimum throttle in the other direction.

## Running a live sweep

Run one sweep on `COM12`, channel 0:

```powershell
python test_script.py `
  --port COM12 `
  --channel 0 `
  --start 48 `
  --stop 2047 `
  --step 1 `
  --dwell 1 `
  --cycles 1 `
```

The sweep goes from `start` to `stop` and then reverses. Use a positive step
for an upward sweep or a negative step for a downward sweep. For example, to
start at maximum throttle:

```powershell
python testing\test_script.py `
  --port COM12 `
  --channel 1 `
  --start 2047 `
  --stop 48 `
  --step -1 `
  --dwell 1 `
  --cycles 1
```

Use `--cycles 0` (the default) to continue until Ctrl+C.

If `--output` is omitted, the program generates a short timestamped filename:

```text
thruster_test_20261108_014600.csv
```

All test settings, including port, baud rate, channel, sweep range, step,
dwell, cycles, character delay, telemetry format, CRC setting, and low-voltage
cutoff, are stored as `# key=value` metadata lines at the top of the CSV.
Providing `--output` explicitly changes only the filename; metadata is still
written. The plotting programs ignore these metadata lines automatically.

Each command character is sent with a default delay of 50 ms because of the
microcontroller input limitation. This can be changed with
`--character-delay`, but values below 50 ms are rejected.

## Telemetry and measurements

The default telemetry format is text. The STM32 should send JSON such as:

```json
{
  "temperature": 31,
  "voltage": 16.10,
  "current": 5.00,
  "consumption": 12,
  "erpm": 4200,
  "weight1": 300,
  "weight2": 238
}
```

The script also accepts terminal-wrapped JSON and `key=value` telemetry.
Binary ESC frames can be selected with:

```powershell
--telemetry-format binary
```

`weight1` and `weight2` measure opposite thrust directions:

- DShot `48–1047` uses `weight1` and produces positive thrust.
- DShot `1048–2047` uses `weight2` and produces negative thrust.

Thrust is calculated in newtons using the load-cell reading in grams:

```text
thrust = weight_grams / 1000 * 9.80665 * 0.230 / 0.505
```

## Safety shutdown

The test stops immediately when battery voltage drops below `12.0 V`. It also
stops when voltage is at or below the configured low-voltage limit (default
`12.5 V`) for the configured number of consecutive telemetry samples (default
`5`). It also stops safely when Ctrl+C is pressed. In all cases the script
commands DShot `0` and writes pending CSV data.

Configure the cutoff with:

```powershell
--low-voltage-limit 12.5 --low-voltage-samples 5
```

## CSV output

Measurements are averaged over each `--dwell` period. The CSV contains fields
including:

```text
id, timestamp, dshot_value, thrust, erpm, voltage,
current_draw, temperature, consumption, weight1, weight2
```

Rows are written in batches of 25 to avoid slowing the live plot. Any partial
batch is written when the test ends.

## Plotting a recorded CSV

Plot the default 3D graph:

```powershell
python testing\plot_thruster_csv.py thruster_test.csv
```

To plot every CSV file in a folder, pass the folder path instead:

```powershell
python testing\plot_thruster_csv.py data
```

All files are plotted in alphabetical order on the same plot, with one
legend entry per file.

The default axes are:

```text
X = voltage
Y = dshot_value
Z = thrust
```

Choose different columns:

```powershell
python testing\plot_thruster_csv.py thruster_test.csv `
  --x erpm `
  --y current_draw `
  --z temperature `
  --color voltage
```

Power can be calculated by the plotter without changing the CSV:

```powershell
python testing\plot_thruster_csv.py thruster_test.csv `
  --x dshot_value `
  --y voltage `
  --z power
```

Power is calculated in watts as:

```text
power = voltage * current_draw
```

Use `--include-power` with `--list-columns` to show the derived `power`
column in the available-column list.

The 3D plotter also supports derived efficiency:

```powershell
python testing\plot_thruster_csv.py thruster_test.csv `
  --x dshot_value `
  --y voltage `
  --z efficiency
```

Efficiency is calculated as `thrust / power` in `N/W`. Rows with zero thrust
or zero power are ignored when efficiency is plotted. Use
`--include-efficiency --list-columns` to display the derived column.

List available CSV columns:

```powershell
python testing\plot_thruster_csv.py thruster_test.csv --list-columns
```

Connect points in CSV order:

```powershell
python testing\plot_thruster_csv.py thruster_test.csv --line
```

## Plotting efficiency

Plot power divided by thrust against DShot value:

```powershell
python testing\plot_efficiency_csv.py thruster_test.csv
```

Power is calculated from the CSV as:

```text
power = voltage * current_draw
```

Efficiency is calculated as:

```text
efficiency = thrust / power
```

Rows with zero thrust or zero power are ignored. The efficiency unit is newtons
per watt (`N/W`). Use `--line` to connect points in CSV order:

```powershell
python testing\plot_efficiency_csv.py thruster_test.csv --line
```
