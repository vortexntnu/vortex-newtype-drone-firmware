/**
  ******************************************************************************
  * @file    led.h
  * @brief   This file contains all the functions prototypes for the board LEDs
  *          driven by GPIO, whatever the STM32 family.
  ******************************************************************************
  * @attention
  *
  * Copyright (c) 2026 STMicroelectronics.
  * All rights reserved.
  *
  * This software is licensed under terms that can be found in the LICENSE file
  * in the root directory of this software component.
  * If no LICENSE file comes with this software, it is provided AS-IS.
  *
  ******************************************************************************
  */

/* Define to prevent recursive inclusion -------------------------------------*/
#ifndef LED_H
#define LED_H

/* Includes ------------------------------------------------------------------*/
#include "stm32_hal.h"

/* Macros --------------------------------------------------------------------*/

/**
  * As opposed to other part drivers (including other LED drivers), there is no `led_init()` function.
  * The reasoning is that the HAL GPIO initialization already covers all the required settings;
  * cf. @ref `init_state` in the @ref `hal_gpio_config_t` structure.
  */

#define led_on(inst) HAL_GPIO_WritePin(inst##_GPIO_PORT, inst##_PIN, inst##_ACTIVE_STATE)
#define led_off(inst) HAL_GPIO_WritePin(inst##_GPIO_PORT, inst##_PIN, inst##_INACTIVE_STATE)
#define led_toggle(inst) HAL_GPIO_TogglePin(inst##_GPIO_PORT, inst##_PIN)

#ifdef __cplusplus
extern "C" {
#endif

/* Exported function ---------------------------------------------------------*/
/* Exported constants --------------------------------------------------------*/

/* (none) */

#ifdef __cplusplus
} /* extern "C" */
#endif

#endif /* LED_H */
