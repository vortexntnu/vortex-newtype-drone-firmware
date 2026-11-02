/**
  ******************************************************************************
  * @file           : mx_lpuart1.c
  * @brief          : LPUART1 Peripheral initialization
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
#include "mx_lpuart1.h"

/* Private typedef -----------------------------------------------------------*/
/* Private define ------------------------------------------------------------*/
/* Private macro -------------------------------------------------------------*/
/* Private variables ---------------------------------------------------------*/
/* Private functions prototype------------------------------------------------*/
/* Exported variables by reference--------------------------------------------*/
/* Handle for UART */
static hal_uart_handle_t hLPUART1;

/* Exported function definition ----------------------------------------------*/
/******************************************************************************/
/* Exported functions for UART in HAL layer */
/******************************************************************************/

hal_uart_handle_t *mx_lpuart1_uart_init(void)
{
  hal_uart_config_t uart_config;

  /* Basic configuration */
  if (HAL_UART_Init(&hLPUART1, HAL_LPUART1) != HAL_OK)
  {
    return NULL;
  }

  HAL_RCC_LPUART1_EnableClock();

  if (HAL_RCC_LPUART1_SetKernelClkSource(HAL_RCC_LPUART1_CLK_SRC_LSE) != HAL_OK)
  {
    return NULL;
  }

  uart_config.baud_rate = 9600;
  uart_config.clock_prescaler = HAL_UART_PRESCALER_DIV1;
  uart_config.word_length = HAL_UART_WORD_LENGTH_8_BIT;
  uart_config.stop_bits = HAL_UART_STOP_BIT_1;
  uart_config.parity = HAL_UART_PARITY_NONE;
  uart_config.direction = HAL_UART_DIRECTION_TX_RX;
  uart_config.hw_flow_ctl = HAL_UART_HW_CONTROL_NONE;
  uart_config.oversampling = HAL_UART_OVERSAMPLING_16;
  uart_config.one_bit_sampling = HAL_UART_ONE_BIT_SAMPLE_DISABLE;

  if (HAL_UART_SetConfig(&hLPUART1, &uart_config) != HAL_OK)
  {
    return NULL;
  }

  /* ### LPUART1 GPIO Configuration ########################### */
  /* GPIO Clocks activation */
  HAL_RCC_GPIOA_EnableClock();

  hal_gpio_config_t  gpio_config;

  /**
    [GPIO Pin] ------> [Signal Name] ------> [Labels]

       PA10    ------>   LPUART1_RX   ------>  DEBUG_UART_RX
       PA9     ------>   LPUART1_TX   ------>  DEBUG_UART_TX
    **/
  gpio_config.mode        = HAL_GPIO_MODE_ALTERNATE;
  gpio_config.output_type = HAL_GPIO_OUTPUT_PUSHPULL;
  gpio_config.pull        = HAL_GPIO_PULL_NO;
  gpio_config.speed       = HAL_GPIO_SPEED_FREQ_LOW;
  gpio_config.alternate   = HAL_GPIO_AF_3;
  HAL_GPIO_Init(HAL_GPIOA, DEBUG_UART_RX_PIN | DEBUG_UART_TX_PIN, &gpio_config);

  return &hLPUART1;
}

void mx_lpuart1_uart_deinit(void)
{
(void)HAL_UART_DeInit(&hLPUART1);

  HAL_RCC_LPUART1_Reset();

  HAL_RCC_LPUART1_DisableClock();

  /* De-initialize all GPIOA pins associated with LPUART1 */
  HAL_GPIO_DeInit(HAL_GPIOA, DEBUG_UART_TX_PIN | DEBUG_UART_RX_PIN);
}
hal_uart_handle_t *mx_lpuart1_uart_gethandle(void)
{
  return &hLPUART1;
}
