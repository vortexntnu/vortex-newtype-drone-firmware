/**
  ******************************************************************************
  * @file    led_pwm.c
  * @brief   This file contains the implementation of the LED PWM part driver.
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


/* Includes ------------------------------------------------------------------*/
#include "led_pwm.h"

#if defined(USE_HAL_TIM_DMA) && (USE_HAL_TIM_DMA == 1)
/**
  * @brief pattern array used to generate a fading pattern.
  */
static const uint16_t PWM_Sine_Pattern[LED_PWM_PATTERN_SIZE] =
{
  0, 1, 5, 11, 20, 31, 44, 60, 78, 98, 121, 146, 173, 202, 232, 265,
  300, 336, 374, 414, 455, 498, 541, 586, 632, 679, 727, 775, 824, 874, 924, 974,
  1024, 1074, 1124, 1174, 1224, 1273, 1321, 1369, 1416, 1462, 1507, 1550, 1593, 1634, 1674, 1712,
  1748, 1783, 1816, 1846, 1875, 1902, 1927, 1950, 1970, 1988, 2004, 2017, 2028, 2037, 2043, 2047,
  2048, 2047, 2043, 2037, 2028, 2017, 2004, 1988, 1970, 1950, 1927, 1902, 1875, 1846, 1816, 1783,
  1748, 1712, 1674, 1634, 1593, 1550, 1507, 1462, 1416, 1369, 1321, 1273, 1224, 1174, 1124, 1074,
  1024, 974, 924, 874, 824, 775, 727, 679, 632, 586, 541, 498, 455, 414, 374, 336,
  300, 265, 232, 202, 173, 146, 121, 98, 78, 60, 44, 31, 20, 11, 5, 1
};

/**
  * @brief pattern array used to generate a square pattern.
  */
static const uint16_t PWM_Square_Pattern[LED_PWM_PATTERN_SIZE] =
{
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2048, 2048, 2048, 2048, 2048, 2048, 2048,
  2048, 2048, 2048, 2048, 2048, 2048, 2048, 2048, 2048, 2048, 2048, 2048, 2048, 2048, 2048, 2048, 2048, 2048, 2048,
  2048, 2048, 2048, 2048, 2048, 2048, 2048, 2048, 2048, 2048, 2048, 2048, 2048, 2048, 2048, 2048, 2048, 2048, 2048,
  2048, 2048, 2048, 2048, 2048, 2048, 2048, 2048, 2048, 2048, 2048, 2048, 2048, 2048, 2048, 2048, 2048, 2048, 2048
};
#endif /* USE_HAL_TIM_DMA */

/* Private functions prototype -----------------------------------------------*/
#if defined(USE_HAL_TIM_DMA) && (USE_HAL_TIM_DMA == 1)
static led_pwm_status_t start_led_pwm_dma_pattern_alt(led_pwm_t *pled, uint32_t period_ms);
#endif /* USE_HAL_TIM_DMA */

static led_pwm_status_t stop_led_dma_pattern(led_pwm_t *pled);

/* Private functions ----------------------------------------------------------*/
#if defined(USE_HAL_TIM_DMA) && (USE_HAL_TIM_DMA == 1)
static led_pwm_status_t start_led_pwm_dma_pattern_alt(led_pwm_t *pled, uint32_t period_ms)
{
  const hal_tim_oc_compare_unit_t compare_unit = hal_tim_oc_channel_to_compare_unit(pled->pwm_channel);
  const hal_tim_oc_compare_unit_config_t oc_compare_unit_config = {.mode = HAL_TIM_OC_PWM1, .pulse = pled->ppattern[0]};

  if (LED_PWM_OK != stop_led_dma_pattern(pled))
  {
    return LED_PWM_ERROR;
  }

  const uint32_t update_event_freq = (1000UL * LED_PWM_PATTERN_SIZE) / period_ms;
  if (update_event_freq == 0UL)
  {
    return LED_PWM_ERROR; /* When period_ms is too big, update_event_freq can be rounded down to 0. */
  }
  const uint32_t prescaler = ((HAL_TIM_GetClockFreq(pled->htim) / update_event_freq) / LED_PWM_PATTERN_MAX_VALUE) - 1UL;
  if (HAL_OK != HAL_TIM_SetPrescaler(pled->htim, prescaler))
  {
    return LED_PWM_ERROR;
  }

  if (HAL_OK != HAL_TIM_OC_SetConfigCompareUnit(pled->htim, compare_unit, &oc_compare_unit_config))
  {
    return LED_PWM_ERROR;
  }

  if (HAL_OK != HAL_TIM_OC_StartChannel_DMA(pled->htim,
                                            pled->pwm_channel,
                                            (const uint8_t *)pled->ppattern,
                                            LED_PWM_PATTERN_SIZE * sizeof(pled->ppattern[0])))
  {
    return LED_PWM_ERROR;
  }

  pled->is_running = 1;
  return LED_PWM_OK;
}
#endif /* USE_HAL_TIM_DMA */

/**
  * @brief Stop a timer's output channel that was started in DMA mode.
  * @param pled pointer to the LED PWM object
  * @retval error status
  */
static led_pwm_status_t stop_led_dma_pattern(led_pwm_t *pled)
{
#if defined(USE_HAL_TIM_DMA) && (USE_HAL_TIM_DMA == 1)
  if (pled->is_running == 1u)
  {
    if (HAL_OK != HAL_TIM_OC_StopChannel_DMA(pled->htim, pled->pwm_channel))
    {
      return LED_PWM_ERROR;
    }
    pled->is_running = 0;
  }
#endif /* USE_HAL_TIM_DMA */
  return LED_PWM_OK;
}


/* Exported functions ----------------------------------------------------------*/

/**
  * @brief Initializes the LED PWM object.
  * @param pled pointer to the LED PWM object
  * @param id configuration ID
  * @retval error status
  */
led_pwm_status_t led_pwm_init(led_pwm_t *pled, uint32_t id)
{
  pled->id = id;
  pled->is_running = 0;

  if (led_pwm_io_init(pled) != 0)
  {
    return LED_PWM_ERROR;
  }

  /* Configure the TIM period (this period is an invariant across the driver) */
  if (HAL_OK != HAL_TIM_SetPeriod(pled->htim, LED_PWM_PATTERN_MAX_VALUE - 1UL))
  {
    return LED_PWM_ERROR;
  }

  /* Configure the channel to "off" as initial state */
  if (led_pwm_off(pled) != LED_PWM_OK)
  {
    return LED_PWM_ERROR;
  }

  /* Start timer  */
  if (HAL_OK != HAL_TIM_Start(pled->htim))
  {
    return LED_PWM_ERROR;
  }

  return LED_PWM_OK;
}

/**
  * @brief Assigns resources to the LED PWM object.
  * @param pled pointer to the LED PWM object
  * @retval error status: 0=success, -1=error
  * @note This function must be overridden in codegen or otherwise with a proper implementation.
  */
__WEAK int32_t led_pwm_io_init(led_pwm_t *pled)
{
  (void)pled;
  return -1; /* always fails */
}

/**
  * @brief Turns the LED on.
  * @param pled pointer to the LED PWM object
  * @retval error status
  */
led_pwm_status_t led_pwm_on(led_pwm_t *pled)
{
  const hal_tim_oc_compare_unit_t compare_unit = hal_tim_oc_channel_to_compare_unit(pled->pwm_channel);
  const hal_tim_oc_compare_unit_config_t oc_compare_unit_config = {.mode = HAL_TIM_OC_FORCED_ACTIVE};

  if (LED_PWM_OK != stop_led_dma_pattern(pled))
  {
    return LED_PWM_ERROR;
  }

  if (HAL_OK != HAL_TIM_OC_SetConfigCompareUnit(pled->htim, compare_unit, &oc_compare_unit_config))
  {
    return LED_PWM_ERROR;
  }
  if (HAL_OK != HAL_TIM_OC_StartChannel(pled->htim, pled->pwm_channel))
  {
    return LED_PWM_ERROR;
  }

  return LED_PWM_OK;
}

/**
  * @brief Turns the LED off.
  * @param pled pointer to the LED PWM object
  * @retval error status
  */
led_pwm_status_t led_pwm_off(led_pwm_t *pled)
{
  const hal_tim_oc_compare_unit_t compare_unit = hal_tim_oc_channel_to_compare_unit(pled->pwm_channel);
  const hal_tim_oc_compare_unit_config_t oc_compare_unit_config = {.mode = HAL_TIM_OC_FORCED_INACTIVE};

  if (LED_PWM_OK != stop_led_dma_pattern(pled))
  {
    return LED_PWM_ERROR;
  }

  if (HAL_OK != HAL_TIM_OC_SetConfigCompareUnit(pled->htim, compare_unit, &oc_compare_unit_config))
  {
    return LED_PWM_ERROR;
  }
  if (HAL_OK != HAL_TIM_OC_StartChannel(pled->htim, pled->pwm_channel))
  {
    return LED_PWM_ERROR;
  }

  return LED_PWM_OK;
}

/**
  * @brief Toggles the LED.
  *        If the LED is fully off, it is turned on.
  *        In all other cases, it is turned off.
  * @param pled pointer to the LED PWM object
  * @retval error status
  */
led_pwm_status_t led_pwm_toggle(led_pwm_t *pled)
{
  const hal_tim_oc_compare_unit_t compare_unit = hal_tim_oc_channel_to_compare_unit(pled->pwm_channel);
  hal_tim_oc_compare_unit_config_t oc_compare_unit_config;

  if (LED_PWM_OK != stop_led_dma_pattern(pled))
  {
    return LED_PWM_ERROR;
  }

  HAL_TIM_OC_GetConfigCompareUnit(pled->htim, compare_unit, &oc_compare_unit_config);
  if (oc_compare_unit_config.mode == HAL_TIM_OC_FORCED_INACTIVE)
  {
    oc_compare_unit_config.mode = HAL_TIM_OC_FORCED_ACTIVE;
  }
  else
  {
    /** When the timer mode is different from inactive (led off), the LED is considered as "active" (led on, dimming...)
      * so we toggle the mode to forced inactive (led off).
      */
    oc_compare_unit_config.mode = HAL_TIM_OC_FORCED_INACTIVE;
  }

  if (HAL_OK != HAL_TIM_OC_SetConfigCompareUnit(pled->htim, compare_unit, &oc_compare_unit_config))
  {
    return LED_PWM_ERROR;
  }
  if (HAL_OK != HAL_TIM_OC_StartChannel(pled->htim, pled->pwm_channel))
  {
    return LED_PWM_ERROR;
  }

  return LED_PWM_OK;
}

/**
  * @brief Sets the brightness of the LED.
  * @param pled pointer to the LED PWM object
  * @param brightness brightness level, 0 - @ref LED_PWM_PATTERN_MAX_VALUE
  * @retval error status
  */
led_pwm_status_t led_pwm_set_brightness(led_pwm_t *pled, uint32_t brightness)
{
  if (LED_PWM_OK != stop_led_dma_pattern(pled))
  {
    return LED_PWM_ERROR;
  }

  const hal_tim_oc_compare_unit_t compare_unit = hal_tim_oc_channel_to_compare_unit(pled->pwm_channel);
  const hal_tim_oc_compare_unit_config_t oc_compare_unit_config = {.mode = HAL_TIM_OC_PWM1, .pulse = brightness};

  if (HAL_OK != HAL_TIM_OC_SetConfigCompareUnit(pled->htim, compare_unit, &oc_compare_unit_config))
  {
    return LED_PWM_ERROR;
  }
  if (HAL_OK != HAL_TIM_OC_StartChannel(pled->htim, pled->pwm_channel))
  {
    return LED_PWM_ERROR;
  }

  return LED_PWM_OK;
}

#if defined(USE_HAL_TIM_DMA) && (USE_HAL_TIM_DMA == 1)

/**
  * @brief Starts a fading pattern.
  * @param pled pointer to the LED PWM object
  * @param speed speed selection
  * @retval error status
  */
led_pwm_status_t led_pwm_fade(led_pwm_t *pled, led_speed_t speed)
{
  pled->ppattern = PWM_Sine_Pattern;
  return start_led_pwm_dma_pattern_alt(pled, (uint32_t)speed);
}

/**
  * @brief Starts a fading pattern.
  * @param pled pointer to the LED PWM object
  * @param period_ms duration for the full pattern in ms
  * @retval error status
  */
led_pwm_status_t led_pwm_fade_alt(led_pwm_t *pled, uint16_t period_ms)
{
  pled->ppattern = PWM_Sine_Pattern;
  return start_led_pwm_dma_pattern_alt(pled, period_ms);
}

/**
  * @brief Starts a blinking pattern.
  * @param pled pointer to the LED PWM object
  * @param speed speed selection
  * @retval error status
  */
led_pwm_status_t led_pwm_blink(led_pwm_t *pled, led_speed_t speed)
{
  pled->ppattern = PWM_Square_Pattern;
  return start_led_pwm_dma_pattern_alt(pled, (uint32_t)speed);
}

/**
  * @brief Starts a blinking pattern.
  * @param pled pointer to the LED PWM object
  * @param period_ms duration for the full pattern in ms
  * @retval error status
  */
led_pwm_status_t led_pwm_blink_alt(led_pwm_t *pled, uint16_t period_ms)
{
  pled->ppattern = PWM_Square_Pattern;
  return start_led_pwm_dma_pattern_alt(pled, period_ms);
}

/**
  * @brief Starts a custom pattern.
  * @param pled pointer to the LED PWM object
  * @param pattern pointer to a buffer of pulse values to feed to the TIM channel.
  *                The timer has a period of @ref LED_PWM_PATTERN_MAX_VALUE;
  *                a buffer value of 0 turns the LED off,
  *                and a value of @ref LED_PWM_PATTERN_MAX_VALUE turns it fully on.
  *                The pattern must have a length of @ref LED_PWM_PATTERN_SIZE elements.
  * @param period_ms duration for the full pattern in ms
  * @retval error status
  */
led_pwm_status_t led_pwm_play_pattern(led_pwm_t *pled, const uint16_t *pattern, uint16_t period_ms)
{
  pled->ppattern = pattern;
  return start_led_pwm_dma_pattern_alt(pled, period_ms);
}

#endif /* USE_HAL_TIM_DMA */
