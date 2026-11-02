/**
  ******************************************************************************
  * @file           : mx_lpuart1.h
  * @brief          : Header for mx_lpuart1.c file.
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

/* Define to prevent recursive inclusion -------------------------------------*/
#ifndef MX_LPUART1_H
#define MX_LPUART1_H

#ifdef __cplusplus
extern "C" {
#endif /* __cplusplus */

/* Includes ------------------------------------------------------------------*/
#include "stm32_hal.h"

/* Exported types ------------------------------------------------------------*/
/* Exported constants --------------------------------------------------------*/

/** Primary aliases for LPUART1_RX pin */
#define DEBUG_UART_RX_PORT                    HAL_GPIOA
#define DEBUG_UART_RX_PIN                     HAL_GPIO_PIN_10

/** Primary aliases for LPUART1_TX pin */
#define DEBUG_UART_TX_PORT                    HAL_GPIOA
#define DEBUG_UART_TX_PIN                     HAL_GPIO_PIN_9

/* Exported macros -----------------------------------------------------------*/
/* Exported variables --------------------------------------------------------*/
/* Exported functions ------------------------------------------------------- */

/******************************************************************************/
/* Exported functions for UART in HAL layer */
/******************************************************************************/
/**
  * @brief mx_lpuart1_uart init function
  * This function configures the hardware resources used in this example
  * @retval pointer to handle or NULL in case of failure
  */
hal_uart_handle_t *mx_lpuart1_uart_init(void);

/**
  * @brief  De-initialize mx_lpuart1_uart instance and return it.
  * @retval None
  */
void mx_lpuart1_uart_deinit(void);

/**
  * @brief  Get the mx_lpuart1_uart object.
  * @retval Pointer on the mx_lpuart1_uartHandle
  */
hal_uart_handle_t *mx_lpuart1_uart_gethandle(void);

#ifdef __cplusplus
}
#endif /* __cplusplus */

#endif /* MX_LPUART1_H */
