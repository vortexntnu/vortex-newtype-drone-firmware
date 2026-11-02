/**
  ******************************************************************************
  * @file    led_pwm.h
  * @brief   This file contains the public interface of the LED PWM part driver.
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
#ifndef LED_PWM_H
#define LED_PWM_H

#ifdef __cplusplus
extern "C"
{
#endif

/* Includes ------------------------------------------------------------------*/
#include "stm32_hal.h"

/* Exported macros ------------------------------------------------------------------*/
#define LED_PWM_PATTERN_SIZE 128UL       /*!< Length of a pattern buffer */
#define LED_PWM_PATTERN_MAX_VALUE 2048U /*!< maximum value for a pattern element */

/* Exported types ------------------------------------------------------------*/
/**
  * @brief Status enum for LED PWM operations.
  */
typedef enum
{
  LED_PWM_OK = 0,
  LED_PWM_ERROR = 1
} led_pwm_status_t;

/**
  * @brief Structure defining the properties for a LED PWM object.
  */
typedef struct
{
  uint32_t id;                   /*!< device ID to ensure correct initialization */
  hal_tim_handle_t *htim;        /*!< handle of the timer used to drive the LED */
  hal_tim_channel_t pwm_channel; /*!< Timer PWM CHANNEL used to drive the LED  */
  const uint16_t *ppattern;      /*!< pointer to the pattern buffer for DMA usage */
  uint8_t is_running;            /*!< boolean: DMA operation ongoing on the channel */
} led_pwm_t;

/**
  * @brief Enumeration defining 3 possible speeds for the LED dynamic features, such as fading and blinking.
  */
typedef enum
{
  LED_SPEED_FAST = 500,    /*!< pattern speed: fast (500 ms / buffer) */
  LED_SPEED_MEDIUM = 1000, /*!< pattern speed: medium (1000 ms / buffer) */
  LED_SPEED_SLOW = 2000    /*!< pattern speed: slow (2000 ms / buffer) */
} led_speed_t;

/* Exported functions ---------------------------------------------------------*/

led_pwm_status_t led_pwm_init(led_pwm_t *pled, uint32_t id);

int32_t led_pwm_io_init(led_pwm_t *pled);

led_pwm_status_t led_pwm_on(led_pwm_t *pled);
led_pwm_status_t led_pwm_off(led_pwm_t *pled);
led_pwm_status_t led_pwm_toggle(led_pwm_t *pled);

led_pwm_status_t led_pwm_set_brightness(led_pwm_t *pled, uint32_t brightness);

#if defined(USE_HAL_TIM_DMA) && (USE_HAL_TIM_DMA == 1)
led_pwm_status_t led_pwm_blink(led_pwm_t *pled, led_speed_t speed);
led_pwm_status_t led_pwm_blink_alt(led_pwm_t *pled, uint16_t period_ms);

led_pwm_status_t led_pwm_fade(led_pwm_t *pled, led_speed_t speed);
led_pwm_status_t led_pwm_fade_alt(led_pwm_t *pled, uint16_t period_ms);
led_pwm_status_t led_pwm_play_pattern(led_pwm_t *pled, const uint16_t *pattern, uint16_t period_ms);
#endif /* USE_HAL_TIM_DMA */

#ifdef __cplusplus
} /* extern "C" */
#endif

#endif /* LED_PWM_H */
