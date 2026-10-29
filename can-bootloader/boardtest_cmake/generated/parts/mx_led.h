/**
  ******************************************************************************
  * file           : mx_led.h
  * brief          : Code generation for the LED part driver.
  ******************************************************************************
  * attention
  *
  * Copyright (c) 2026 STMicroelectronics.
  * All rights reserved.
  *
  * This software is licensed under terms that can be found in the mx_led_license.md file
  * in the same directory as the generated code.
  * If no mx_led_license.md file comes with this software, it is provided AS-IS.
  *
  ******************************************************************************
  */

/* Define to prevent recursive inclusion ----------------------------------- */
#ifndef MX_LED_H
#define MX_LED_H

#ifdef __cplusplus
extern "C" {
#endif

/* Includes ---------------------------------------------------------------- */
#include "led.h"
#include "mx_hal_def.h"

/* Exported macros --------------------------------------------------------- */
/* LED names - GPIO flavor */
/* These names are just identifiers without a value.
 * The LED part driver uses those names to construct pin property macros.
 * e.g. `led_on(LED_0)` translates to
 * `HAL_GPIO_WritePin(LED_0_GPIO_PORT, LED_0_PIN, LED_0_ACTIVE_STATE)`.
 */

#define LED_0                    0 /* Main label */

/* No label has been defined for this part driver instance,
 * so no alias is generated for LED_0. */

/* Resource bindings */
#define LED_0_GPIO_PORT          HAL_GPIOA
#define LED_0_PIN                HAL_GPIO_PIN_5
#define LED_0_ACTIVE_STATE       HAL_GPIO_PIN_SET
#define LED_0_INACTIVE_STATE     HAL_GPIO_PIN_RESET





#ifdef __cplusplus
}
#endif

#endif /* MX_LED_H */
