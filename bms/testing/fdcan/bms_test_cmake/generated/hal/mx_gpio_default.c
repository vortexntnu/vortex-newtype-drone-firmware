/**
  ******************************************************************************
  * @file           : mx_gpio_default.c
  * @brief          : gpio_default Peripheral initialization
  ******************************************************************************
  * @attention
  *
  * Copyright (c) 2026 STMicroelectronics.
  * All rights reserved.
  *
  * This software is licensed under terms that can be found in the mx_stm32c5xx_hal_drivers_license.md file
  * in the same directory as the generated code.
  * If no mx_stm32c5xx_hal_drivers_license.md file comes with this software, it is provided AS-IS.
  *
  ******************************************************************************
  */

/* Includes ------------------------------------------------------------------*/
#include "mx_gpio_default.h"

/* Exported types ------------------------------------------------------------*/
/* Exported constants --------------------------------------------------------*/
/* Private define ------------------------------------------------------------*/
/* Private functions ---------------------------------------------------------*/
/* Exported variables by reference -------------------------------------------*/

/******************************************************************************/
/* Exported functions for GPIO in HAL layer                                   */
/******************************************************************************/
system_status_t mx_gpio_default_init(void)
{
  hal_gpio_config_t  gpio_config;

  HAL_RCC_GPIOA_EnableClock();

  HAL_RCC_GPIOB_EnableClock();

  HAL_RCC_GPIOC_EnableClock();

  HAL_RCC_GPIOE_EnableClock();

  /* Configure PA5 GPIO pin in output mode */
  gpio_config.mode            = HAL_GPIO_MODE_OUTPUT;
  gpio_config.speed           = HAL_GPIO_SPEED_FREQ_LOW;
  gpio_config.pull            = HAL_GPIO_PULL_NO;
  gpio_config.output_type     = HAL_GPIO_OUTPUT_PUSHPULL;
  gpio_config.init_state      = HAL_GPIO_PIN_RESET;
  if (HAL_GPIO_Init(HAL_GPIOA, HAL_GPIO_PIN_5, &gpio_config) != HAL_OK)
  {
    return SYSTEM_PERIPHERAL_ERROR;
  }

  /* Configure PB4 GPIO pin in output mode */
  gpio_config.mode            = HAL_GPIO_MODE_OUTPUT;
  gpio_config.speed           = HAL_GPIO_SPEED_FREQ_LOW;
  gpio_config.pull            = HAL_GPIO_PULL_UP;
  gpio_config.output_type     = HAL_GPIO_OUTPUT_PUSHPULL;
  gpio_config.init_state      = HAL_GPIO_PIN_RESET;
  if (HAL_GPIO_Init(HAL_GPIOB, HAL_GPIO_PIN_4, &gpio_config) != HAL_OK)
  {
    return SYSTEM_PERIPHERAL_ERROR;
  }

  /* Configure PC13 GPIO pin in output mode */
  gpio_config.mode            = HAL_GPIO_MODE_OUTPUT;
  gpio_config.speed           = HAL_GPIO_SPEED_FREQ_LOW;
  gpio_config.pull            = HAL_GPIO_PULL_DOWN;
  gpio_config.output_type     = HAL_GPIO_OUTPUT_PUSHPULL;
  gpio_config.init_state      = HAL_GPIO_PIN_RESET;
  if (HAL_GPIO_Init(HAL_GPIOC, HAL_GPIO_PIN_13, &gpio_config) != HAL_OK)
  {
    return SYSTEM_PERIPHERAL_ERROR;
  }

  /*
    GPIO pin labels :
    PE2   ---------> CAN_STB
    */
  /* Configure PE2 GPIO pin in output mode */
  gpio_config.mode            = HAL_GPIO_MODE_OUTPUT;
  gpio_config.speed           = HAL_GPIO_SPEED_FREQ_LOW;
  gpio_config.pull            = HAL_GPIO_PULL_NO;
  gpio_config.output_type     = HAL_GPIO_OUTPUT_PUSHPULL;
  gpio_config.init_state      = CAN_STB_INIT_STATE;
  if (HAL_GPIO_Init(CAN_STB_PORT, CAN_STB_PIN, &gpio_config) != HAL_OK)
  {
    return SYSTEM_PERIPHERAL_ERROR;
  }

  return SYSTEM_OK;
}

system_status_t mx_gpio_default_deinit(void)
{
  /* De-initialize pins of GPIOA port */
  HAL_GPIO_DeInit(HAL_GPIOA, HAL_GPIO_PIN_5);

  /* De-initialize pins of GPIOB port */
  HAL_GPIO_DeInit(HAL_GPIOB, HAL_GPIO_PIN_4);

  /* De-initialize pins of GPIOC port */
  HAL_GPIO_DeInit(HAL_GPIOC, HAL_GPIO_PIN_13);

  /* De-initialize pins of GPIOE port */
  HAL_GPIO_DeInit(CAN_STB_PORT, CAN_STB_PIN);

  return SYSTEM_OK;
}
