# STM32 debugging + ITM/SWO in VS Code — quick setup

A reusable checklist for **normal ST-LINK debugging** and **ITM/SWO logging with OpenOCD**. The values labeled *STM32C542 example* were used on an STM32C542 Nucleo with STLINK-V3EC; replace them for other boards.

## 1. Tools and hardware

- VS Code with **Cortex-Debug** (for OpenOCD) and optionally **STM32Cube VS Code extensions** (for normal ST-LINK debugging).
- ARM GNU toolchain/GDB, STM32CubeProgrammer CLI, and a working Debug ELF (`-g`, ideally `-Og`).
- OpenOCD supporting your MCU and probe. For STM32C5 we built [ST's OpenOCD fork](https://github.com/STMicroelectronics/OpenOCD):

```bash
git clone https://github.com/STMicroelectronics/OpenOCD.git
cd OpenOCD
./bootstrap
./configure --enable-stlink --enable-cmsis-dap CFLAGS='-O2 -g -Wno-error'
make -j"$(nproc)"
```

Check the MCU/reference manual and board schematic: **ITM/SWO support, SWO pin, probe wiring, trace clock, and CoreSight access port** are device-dependent. STM32C542 example: PB3 configured as `DEBUG_TRACESWO`; 144 MHz trace clock, 2 MHz SWO.

## 2. Firmware trace setup (only when using SWO)

After HAL/system clock and pin initialization, for the **STM32C542 example**:

```c
#define ENABLE_ITM_TRACE 1

static void Trace_Init(void)
{
#if ENABLE_ITM_TRACE
    CoreDebug->DEMCR |= CoreDebug_DEMCR_TRCENA_Msk;
    DBGMCU->CR &= ~(3UL << 6);                 // Asynchronous SWO mode
    DBGMCU->CR |= (1UL << 4) | (1UL << 5);     // Trace IO + trace clock
#endif
}

// After mx_system_init():
Trace_Init();

while (1) {
#if ENABLE_ITM_TRACE
    ITM_TrySendChar('H');                       // Nonblocking helper
#endif
    HAL_GPIO_TogglePin(USR_LED_PORT, USR_LED_PIN);
    HAL_Delay(1000);
}
```

**Do not copy the DBGMCU bits to other STM32 models** without checking the reference manual. Cortex-Debug's `SWO_Init` sets standard ITM/TPIU registers during the debug session; MCU-specific trace clock/pin routing may still be required in firmware. An ITM write succeeding does **not** prove SWO data reached the PC.

## 3. OpenOCD TPIU file (only if the target does not already define one)

Check the target file for `tpiu create`, or query a running OpenOCD using `monitor tpiu names` in the Debug Console.

For the **STM32C542 example**, create `.vscode/stm32c5-swo.cfg` containing:

```tcl
tpiu create stm32c5x.tpiu \
    -dap stm32c5x.dap \
    -ap-num 1 \
    -baseaddr 0xE0040000
```

The DAP name, AP number, and base address are **target-specific**, not general defaults. Omit this extra file if the target already provides TPIU setup.

## 4. Build and flash tasks (when OpenOCD cannot flash)

Create `.vscode/tasks.json`, changing paths/build names:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Build firmware",
      "type": "shell",
      "command": "cmake",
      "args": ["--build", "${workspaceFolder}/<build-dir>"],
      "problemMatcher": ["$gcc"]
    },
    {
      "label": "Flash firmware",
      "type": "shell",
      "command": "/path/to/STM32_Programmer_CLI",
      "args": [
        "-c", "port=SWD", "mode=UR", "freq=1000",
        "-w", "${workspaceFolder}/<build-dir>/<firmware>.elf",
        "-v", "-rst"
      ],
      "dependsOn": "Build firmware",
      "problemMatcher": []
    }
  ]
}
```

The STM32C542 OpenOCD build originally lacked a usable flash loader, so we used **CubeProgrammer CLI for flashing** and **OpenOCD for SWO debugging**.

## 5. Two VS Code launch configurations

Keep **both** configurations inside the same `.vscode/launch.json`. Replace all placeholders and use your own device configuration.

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Normal debug — STM32Cube ST-LINK",
      "type": "stlinkgdbtarget",
      "request": "launch",
      "cwd": "${workspaceFolder}",
      "preBuild": "${command:st-stm32-ide-debug-launch.build}",
      "runEntry": "main",
      "imagesAndSymbols": [
        {
          "imageFileName": "${command:st-stm32-ide-debug-launch.get-projects-binary-from-context1}"
        }
      ]
    },
    {
      "name": "SWO debug — OpenOCD",
      "type": "cortex-debug",
      "request": "attach",
      "servertype": "openocd",
      "cwd": "${workspaceFolder}",
      "executable": "${workspaceFolder}/<build-dir>/<firmware>.elf",
      "preLaunchTask": "Flash firmware",
      "serverpath": "/path/to/OpenOCD/src/openocd",
      "searchDir": ["/path/to/OpenOCD/tcl"],
      "configFiles": [
        "interface/stlink-dap.cfg",
        "target/stm32c5x.cfg",
        ".vscode/stm32c5-swo.cfg"
      ],
      "openOCDLaunchCommands": [
        "adapter speed 1000",
        "gdb_memory_map disable",
        "gdb_flash_program disable",
        "gdb_breakpoint_override hard"
      ],
      "gdbPath": "/path/to/arm-none-eabi-gdb",
      "armToolchainPath": "/path/to/arm-toolchain/bin",
      "swoConfig": {
        "enabled": true,
        "source": "probe",
        "cpuFrequency": 144000000,
        "swoFrequency": 2000000,
        "decoders": [
          {"port": 0, "type": "console", "label": "ITM Console"}
        ]
      }
    }
  ]
}
```

The **normal debug** configuration is for ST's VS Code extension and does not require SWO. The **SWO debug** configuration uses Cortex-Debug + OpenOCD; its target script, optional TPIU script, and frequencies must match your hardware. Use `ENABLE_ITM_TRACE=1` when you want ITM logs. Never run two debug servers against the same ST-LINK simultaneously.

The three `gdb_*` OpenOCD commands shown above are **workarounds for the STM32C542 flash-loader issue**; do not apply them automatically to other MCUs. They disable flash probing/programming through OpenOCD and force hardware breakpoints.

### If OpenOCD can flash your MCU

Use Cortex-Debug `"request": "launch"` and a **build-only** `preLaunchTask`. Remove `gdb_memory_map disable`, `gdb_flash_program disable`, and the external CubeProgrammer flash task. Only switch after verifying OpenOCD flash programming on your target. *Finding a loader file or successful `init` alone is not proof that flash programming works.*

## 6. Using and troubleshooting

1. Choose **Normal debug** for firmware without SWO, or **SWO debug** when ITM tracing is enabled and configured.
2. Press **F5** to build/flash/connect; disable breakpoints and **Continue** to collect repeated ITM characters in the **ITM Console**.
3. If ITM is silent: check SWO pin/probe wiring, actual clock and bitrate, `tpiu names`, and OpenOCD's **gdb-server Terminal**. `ITM_TrySendChar()` returning success only confirms acceptance by the ITM port.
4. `SWO/RTT Initialization failed: Protocol error with Rcmd: FB` means OpenOCD rejected/failed the SWO monitor command; inspect **gdb-server** errors. Do not assume `HAL_Delay()` is stuck just because a manual pause lands there.
5. If debugging fails with `No STLDR loader` / `auto_probe failed`, retain the CubeProgrammer flash task and OpenOCD attach workaround until flash support is confirmed.

**Files to carry to another project:** `.vscode/launch.json`, `.vscode/tasks.json` (if needed), optional target-specific `.vscode/*-swo.cfg`, firmware trace setup, and the correct tool paths/clock/pin settings.
