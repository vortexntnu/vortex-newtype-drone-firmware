# Newtype-drone AUV Firmware Repo

<p align="center">
  <img src="common/Vortex Logo/Vortex-Logo-3.png" alt="Logo" width="100%"/>
</p>

![Status](https://img.shields.io/badge/status-in%20development-yellow)

---

## Overview

This is where all the firmware and firmware related files are

---

## Projects

| Project | MCU | Location | Task Description | Responsible Member | Status |
|---------|-----|----------|------------------|--------------------|--------|
| [Acoustics](acoustics) | [STM32H753] | Acoustics black box | Acoustics you know | Alvar | Doing stuff |
| [Sensor Interface](sensor-interface) | [STM32H753] | Control house | Provide an interface so you can interface with the sensors| Georg | IDK |
| [Power Interface](power-interface) | [STM32C542] | Control house | Provide an interface to the actuator houses + some more| Elias | Conceptualized |
| [Torpedo/dropper Controller](torpedokontroller) | [STM32C542] | Actuator house | Provide an interface to the torpedo or marker dropper | Simon | PCB first |
| [BMS](bms) | [STM32C542] | Actuator house | A system for managing the battery | Stian | Good |
| [Motorcontroller](motorkontroller) | [STM32H753] | Actuator house | Provide a way to control the thrusters | Espen/Filip | DShot working |
| [CAN-bootloader](can-bootloader) | [Both] | Everywhere | Provide a way to program the MCUs over CAN-bus | Elias | Seems good |

## Structure
Each project folder must contain a README.md and the following folders:
- firmware
- hardware
- experimental
- testdata (only if applicable)

## Libraries/Dependencies

The main external dependencies we depend on are:
- CMSIS
- freeRTOS

## License

Software licensed under [MIT](LICENSE).
