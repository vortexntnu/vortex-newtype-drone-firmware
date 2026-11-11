# Your project name

<p align="center">
  <img src="../common/Vortex Logo/Vortex-Logo-3.png" alt="Logo" width="100%"/>
</p>

![Status](https://img.shields.io/badge/status-in%20development-yellow)

---

## Overview

Can-bootloader for stm32c5 and stm32h7.

## Descriptions

### STM32C5

Exists in the bootload_make/ subdirectory.
Currently configured to work on stm32c542RC, probably needs other ports on CC.

The following assumes bootload_make/ as working directory.
To build:
~ make

To flash:
~ make flash

To flash to secondary bank:
~ make flash-secondary

To flash to both banks (for when you don't know what bank you are on):
~ make flash-both

### STM32H7

Exists in the bootload_h7_hal1/ subdirectory.

The following assumes bootload_h7_hal1/ as working directory.
To build:
~ make

To flash:
~ cd build/
~ make flash

To flash to secondary bank:
~ cd build/
~ make flash-secondary

To flash to both banks:
~ cd build/
~ make flash-both

## Libraries/Dependencies

<ul>
<li>A version of arm-none-eabi-gcc capable of compiling the programs, and arm-none-eabi-objcopy, probably bundled with the aforementioned gcc.</li>
</ul>

## License

Software licensed under [MIT](LICENSE).
