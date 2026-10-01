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
| [Gripper](gripper) | [STM32C542] | Gripper | Provide a way to control the gripper | IDK | Eirik knows |

## Structure
Each project folder must contain a README.md and the following folders:
- firmware
- hardware
- documentation
- testing (only if applicable)
- misc

The code that is actually flashed onto the microcontroller goes into the firmware folder. 
All relevant hardware stuff like schematics, datasheets, application notes and so on goes into the hardware folder.
Documentation for your project/task goes into the documentation folder.
Test data or test related scripts and code goes into testing.
Anything that doesn't fit the categories above goes into either its own folder or misc. This can literally be anything remotely related to the project.

## Libraries/Dependencies

The main external dependencies we depend on are:
- CMSIS
- freeRTOS

## License

Software licensed under [MIT](LICENSE).
