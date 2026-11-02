# __button Part Drivers__

![tag](https://img.shields.io/badge/tag-v2.0.0-brightgreen.svg)
[![release note](https://img.shields.io/badge/release_note-view_html-gold.svg)](https://htmlpreview.github.io/?https://github.com/STMicroelectronics/stm32-button-part-drivers/blob/main/Release_Notes.html)

## Overview

The button part driver provides APIs to drive buttons and switches through a GPIO.


## Description and Usage

### Peripherals initialization:

The button part driver assumes that the initialization of all needed peripherals (GPIO, optionally EXTI) is done by the main application.
After the MCU IPs have been initialized, the selected resources can be assigned to button objects. This is done in `button_io_init()`, which the user application must override.
That function is called by `button_init()`; the `.id` field of the `button_obj_t` structure should be used to discriminate the resources to be assigned.

### GPIO flavor

The GPIO flavor drives a button through a simple GPIO (plus EXTI). Optionally, it implements software debounce.

Software debounce is implemented at the driver level (applies to all button objects). It is based on interrupts management and requires EXTI resources to function.
This is all transparent to the application: the driver always exposes the same API (`button_get_state()`, ...) but features several implementations to handle this choice.

Debounce support is enabled by default and can be disabled by defining `BUTTON_DEBOUNCE` to `0` in the project's build settings.
EXTI must be configured on the button pin when software debounce is enabled.
In addition, debounce settings can be tuned for each button object via the `.debounce_duration` field. Typically, setting that field to `0` effectively disables debounce for that object.

To use the button GPIO part API, the application should define the `button_object_t` object and the `button_io_init()` function to assign HAL hardware resources (and debounce settings when relevant) to it.
The link between the two is made by `button_init()`, which should be called after all the MCU peripherals have been initialized.

In addition, after calling `button_init()`, the application should call `button_enableit()` to activate interrput-related functions.
This is especially relevant when debounce is enabled at the driver level (`BUTTON_DEBOUNCE != 0`), as the part driver is event-based in that configuration.

Once this is successfully done, all the other part APIs can be used freely.

