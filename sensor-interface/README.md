# Sensor Interface Firmware

<p align="center">
  <img src="../common/Vortex Logo/Vortex-Logo-3.png" alt="Logo" width="100%"/>
</p>

![Status](https://img.shields.io/badge/status-in%20development-yellow)

---

## Overview

Firmware for the drone's sensor interface board, currently using an STM32H753ZI on a NUCLEO devboard running **FreeRTOS** (CMSIS-RTOS v2).
The board reads the navigation sensors, timestamps each sample against a local microsecond clock,
and forwards the data over Ethernet (UDP) to the Nvidia Orin, where the control team will implement sensor fusion.

Sensors:

| Sensor | Interface | Status |
|---|---|---|
| Safran STIM300 IMU | USART2, 921600 baud, circular DMA | Implemented, testing on hardware, 90% complete |
| Nortek DVL1000 | | Planned |
| MMC5983MA magnetometer board | CAN | Planned |
| Blue Robotics Bar30 pressure sensor | I2C | Planned |

## Architecture

```
 STIM300 ──┐
 DVL1000 ──┤                     ┌─────────────┐   UDP
 Mag (CAN)─┼──► sensor_queue ───►│ ethernet.c  │──────► Orin
 Bar30 ────┘  (FreeRTOS queue)   └─────────────┘
                     ▲
            timebase (TIM2, 1 MHz, 64-bit)
            pwm (Orin PWM edge capture on TIM2)
```

- Each sensor driver receives and decodes its own data, mostly from interrupts, and pushes a
  `sensor_msg_t` into `sensor_queue`. A message holds a sensor ID, a 64-bit microsecond timestamp
  and a union with the decoded sample (see `sensor_msg.h`).
- `ethernet.c` is the only consumer of the queue. It packs the messages and sends them to the Orin
  over UDP, together with sync messages.
- `timebase` provides the shared clock. TIM2 runs at 1 MHz and is extended in software to 64 bits so it never wraps in practice.
  `pwm` captures PWM edges from the Orin on TIM2 so the board's clock can be related to the Orin's. The PWM will function as external triggers that synchronize sensordata.
- `main.c` initializes the peripherals, creates the queue (64 messages deep for now, to absorb Ethernet
  delays) and the tasks, and sends the HAL callbacks on to the right driver.
- `printf` goes out on USART3 (115200 baud), which is the ST-LINK virtual COM port. Used for debugging.

> **Note:** `timebase`, `pwm`, `dvl`, `mag`, `bar30` and `ethernet` are currently empty, and
> the STIM samples are not yet pushed into the queue.

## Code structure


| Header (`Core/Inc`) | Source (`Core/Src`) | Purpose |
|---|---|---|
| `sensor_msg.h` | | Declares the queue all sensors push into. Defined and created in main.c |
| | `main.c` | Init, task creation, HAL callback dispatch |
| `timebase.h` | `timebase.c` | Local 1 MHz TIM2 clock, extended to 64-bits |
| `pwm.h` | `pwm.c` | Orin PWM edge capture on TIM2 |
| `stim.h` | `stim.c` | STIM300 driver |
| `dvl.h` | `dvl.c` | Nortek DVL1000 driver |
| `mag.h` | `mag.c` | CAN frame parser for the MMC5983MA magnetometer board |
| `bar30.h` | `bar30.c` | Bluerobotics Bar30 pressure sensor over I2C |
| `ethernet.h` | `ethernet.c` | Queue consumer, packing, UDP send to the Orin, sync messages |

## STIM300 driver

- **Reception** USART2 runs at 921600 baud and runs `HAL_UARTEx_ReceiveToIdle_DMA` into a 1024-byte circular buffer.
  An interrupt run `stim_on_rx_event()`, which passes whatever bytes have arrived since the last interrupt to the frame parser.
- **Framing:** a small state machine (`HUNT` / `COLLECT`) waits for the Normal Mode datagram ID `0xAF`,
  collects 63 bytes, and checks the CRC-32. If the check fails, the frame is
  dropped and the parser starts hunting again. CRC errors are only counted after the first good
  frame, since reception can start mid-frame.
- **Decoding:** gyro, accelerometer and inclinometer values (24-bit signed), their temperatures
  (16-bit signed), aux, counter and latency are decoded into raw counts in `stim_sample_t`.
  `valid` is set when all 7 status bytes are 0. The values are not scaled to physical units yet.
- **Configuration on boot:** once the first valid frame arrives, `stim_configure()` enters Service Mode,
  configures all settings, and returns to Normal Mode **without saving**.
  Our STIM300 is an older unit without Utility Mode. And we do not want to save/flash the STIM as it is
  only rated for 10,000 saves. Not all settings have been implemented yet.
- **Reading data:** `stim_get_latest()` and `stim_get_stats()` copy inside a critical section, so a
  interrupt cannot cause a sample that is half from one frame and half from the next.
- **Errors:** any UART error is counted and DMA reception is restarted.
- **Self-test:** at startup, `stim_self_test()` runs the CRC and decoder on a stored frame (expected
  CRC `9E9ED1D9`) and prints the result.

Sampling at 2000 Hz needs a higher baud rate, which would mean reflashing the STIM. The STIM's USB
connector (USB 2.0) also doesn't support the highest baud rate, so keep it at 1000 Hz or lower.

## Building and flashing

1. Open the `firmware/` folder as a project in **STM32CubeIDE**. The peripheral setup is in `STIM300dev.ioc`.
2. Build, then flash and debug over the on-board ST-LINK.
3. Open a serial terminal on the ST-LINK virtual COM port at **115200 baud** to see the self-test
   output and the once-per-second STIM statistics: bytes/s, frames/s, CRC errors and UART errors.
   I recommend using tio /dev/tty*** instead of multicom/picocom. (It's way better!)

## Libraries/Dependencies

- STM32CubeH7 HAL (in `Drivers/`)
- FreeRTOS with the CMSIS-RTOS v2 wrapper (in `Middlewares/`)
- STM32CubeIDE for building and flashing

## License

Software licensed under [MIT](LICENSE).
