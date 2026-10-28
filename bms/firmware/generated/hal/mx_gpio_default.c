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

  /*
    GPIO pin labels :
    PA1   ---------> EFUSE_FAULT_N
    PA3   ---------> USB_VBUS_SENSE
    PA4   ---------> BQ_ALERT
    */
  /* Configure PA1, PA3, PA4 GPIO pins in input mode */
  gpio_config.mode            = HAL_GPIO_MODE_INPUT;
  gpio_config.pull            = HAL_GPIO_PULL_NO;
  if (HAL_GPIO_Init(HAL_GPIOA, EFUSE_FAULT_N_PIN | USB_VBUS_SENSE_PIN | BQ_ALERT_PIN, &gpio_config) != HAL_OK)
  {
    return SYSTEM_PERIPHERAL_ERROR;
  }

  /*
    GPIO pin labels :
    PA2   ---------> BQ_WAKE
    PA8   ---------> SOC_LED_4
    */
  /* Configure PA2, PA8 GPIO pins in output mode */
  gpio_config.mode            = HAL_GPIO_MODE_OUTPUT;
  gpio_config.speed           = HAL_GPIO_SPEED_FREQ_LOW;
  gpio_config.pull            = HAL_GPIO_PULL_NO;
  gpio_config.output_type     = HAL_GPIO_OUTPUT_PUSHPULL;
  gpio_config.init_state      = HAL_GPIO_PIN_RESET;
  if (HAL_GPIO_Init(HAL_GPIOA, BQ_WAKE_PIN | SOC_LED_4_PIN, &gpio_config) != HAL_OK)
  {
    return SYSTEM_PERIPHERAL_ERROR;
  }

  /*
    GPIO pin labels :
    PA15  ---------> STATUS_LED_GREEN
    */
  /* Configure PA15 GPIO pin in input mode */
  gpio_config.mode            = HAL_GPIO_MODE_INPUT;
  gpio_config.pull            = HAL_GPIO_PULL_UP;
  if (HAL_GPIO_Init(STATUS_LED_GREEN_PORT, STATUS_LED_GREEN_PIN, &gpio_config) != HAL_OK)
  {
    return SYSTEM_PERIPHERAL_ERROR;
  }

  /*
    GPIO pin labels :
    PB0   ---------> BQ_SPI_CHIPSLCT
    PB12  ---------> BQ_RST_SHUT
    PB13  ---------> SOC_LED_1
    PB14  ---------> SOC_LED_2
    PB15  ---------> SOC_LED_3
    */
  /* Configure PB0, PB12, PB13, PB14, PB15 GPIO pins in output mode */
  gpio_config.mode            = HAL_GPIO_MODE_OUTPUT;
  gpio_config.speed           = HAL_GPIO_SPEED_FREQ_LOW;
  gpio_config.pull            = HAL_GPIO_PULL_NO;
  gpio_config.output_type     = HAL_GPIO_OUTPUT_PUSHPULL;
  gpio_config.init_state      = HAL_GPIO_PIN_RESET;
  if (HAL_GPIO_Init(HAL_GPIOB, BQ_SPI_CHIPSLCT_PIN | BQ_RST_SHUT_PIN | SOC_LED_1_PIN | SOC_LED_2_PIN | SOC_LED_3_PIN, &gpio_config) != HAL_OK)
  {
    return SYSTEM_PERIPHERAL_ERROR;
  }

  /*
    GPIO pin labels :
    PB1   ---------> BQ_BOTHOFF
    PB2   ---------> BQ_CHG_DISABLED
    PB10  ---------> BQ_DSG_DISABLED
    */
  /* Configure PB1, PB2, PB10 GPIO pins in input mode */
  gpio_config.mode            = HAL_GPIO_MODE_INPUT;
  gpio_config.pull            = HAL_GPIO_PULL_NO;
  if (HAL_GPIO_Init(HAL_GPIOB, BQ_BOTHOFF_PIN | BQ_CHG_DISABLED_PIN | BQ_DSG_DISABLED_PIN, &gpio_config) != HAL_OK)
  {
    return SYSTEM_PERIPHERAL_ERROR;
  }

  /*
    GPIO pin labels :
    PB4   ---------> CAN_STB
    */
  /* Configure PB4 GPIO pin in output mode */
  gpio_config.mode            = HAL_GPIO_MODE_OUTPUT;
  gpio_config.speed           = HAL_GPIO_SPEED_FREQ_LOW;
  gpio_config.pull            = HAL_GPIO_PULL_UP;
  gpio_config.output_type     = HAL_GPIO_OUTPUT_PUSHPULL;
  gpio_config.init_state      = CAN_STB_INIT_STATE;
  if (HAL_GPIO_Init(CAN_STB_PORT, CAN_STB_PIN, &gpio_config) != HAL_OK)
  {
    return SYSTEM_PERIPHERAL_ERROR;
  }

  /*
    GPIO pin labels :
    PC13  ---------> STATUS_LED_YELLOW
    */
  /* Configure PC13 GPIO pin in input mode */
  gpio_config.mode            = HAL_GPIO_MODE_INPUT;
  gpio_config.pull            = HAL_GPIO_PULL_NO;
  if (HAL_GPIO_Init(STATUS_LED_YELLOW_PORT, STATUS_LED_YELLOW_PIN, &gpio_config) != HAL_OK)
  {
    return SYSTEM_PERIPHERAL_ERROR;
  }

  /*
    GPIO pin labels :
    PE2   ---------> STATUS_LED_RED
    */
  /* Configure PE2 GPIO pin in input mode */
  gpio_config.mode            = HAL_GPIO_MODE_INPUT;
  gpio_config.pull            = HAL_GPIO_PULL_NO;
  if (HAL_GPIO_Init(STATUS_LED_RED_PORT, STATUS_LED_RED_PIN, &gpio_config) != HAL_OK)
  {
    return SYSTEM_PERIPHERAL_ERROR;
  }

  return SYSTEM_OK;
}

system_status_t mx_gpio_default_deinit(void)
{
  /* De-initialize pins of GPIOA port */
  HAL_GPIO_DeInit(HAL_GPIOA, EFUSE_FAULT_N_PIN | BQ_WAKE_PIN | USB_VBUS_SENSE_PIN | BQ_ALERT_PIN | SOC_LED_4_PIN | STATUS_LED_GREEN_PIN);

  /* De-initialize pins of GPIOB port */
  HAL_GPIO_DeInit(HAL_GPIOB, BQ_SPI_CHIPSLCT_PIN | BQ_BOTHOFF_PIN | BQ_CHG_DISABLED_PIN | CAN_STB_PIN | BQ_DSG_DISABLED_PIN | BQ_RST_SHUT_PIN | SOC_LED_1_PIN | SOC_LED_2_PIN | SOC_LED_3_PIN);

  /* De-initialize pins of GPIOC port */
  HAL_GPIO_DeInit(STATUS_LED_YELLOW_PORT, STATUS_LED_YELLOW_PIN);

  /* De-initialize pins of GPIOE port */
  HAL_GPIO_DeInit(STATUS_LED_RED_PORT, STATUS_LED_RED_PIN);

  return SYSTEM_OK;
}
