# Your project name

<p align="center">
  <img src="../common/Vortex Logo/Vortex-Logo-3.png" alt="Logo" width="100%"/>
</p>

![Status](https://img.shields.io/badge/status-in%20development-yellow)

---

## Overview

Can-bootloader for stm32c5.

## IDK

Currently configured to work on stm32c542RC, probably needs other ports on CC.

To build:
make

To flash:
make flash

To flash to secondary bank:
make flash-secondary

To flash to both banks (for when you don't know what bank you are on):
make flash-both

## Libraries/Dependencies

<ul>
<li>CMake</li>
<li>The correct version of arm-none-eabi-Everything-Basically</li>
</ul>

## License

Software licensed under [MIT](LICENSE).
