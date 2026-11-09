/**
  ******************************************************************************
  * @file           : mx_gpio_default.h
  * @brief          : Header for mx_gpio_default.c file.
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
#ifndef MX_GPIO_DEFAULT_H
#define MX_GPIO_DEFAULT_H

#ifdef __cplusplus
extern "C" {
#endif /* __cplusplus */

/* Includes ------------------------------------------------------------------*/
#include "stm32_hal.h"
#include "mx_def.h"

/* Exported types ------------------------------------------------------------*/
/* Exported constants --------------------------------------------------------*/
/******************************************************************************/
/* Exported defines for gpio_default in HAL layer                             */
/******************************************************************************/

/* Primary aliases for GPIO PA5 pin */
#define USR_LED_PORT                                    HAL_GPIOA
#define USR_LED_PIN                                     HAL_GPIO_PIN_5
#define USR_LED_INIT_STATE                              HAL_GPIO_PIN_RESET
#define USR_LED_ACTIVE_STATE                            HAL_GPIO_PIN_SET
#define USR_LED_INACTIVE_STATE                          HAL_GPIO_PIN_RESET

/* Primary aliases for GPIO PC13 pin */
#define USR_BTN_PORT                                    HAL_GPIOC
#define USR_BTN_PIN                                     HAL_GPIO_PIN_13
#define USR_BTN_INIT_STATE                              HAL_GPIO_PIN_RESET
#define USR_BTN_ACTIVE_STATE                            HAL_GPIO_PIN_SET
#define USR_BTN_INACTIVE_STATE                          HAL_GPIO_PIN_RESET

/* Primary aliases for GPIO PE2 pin */
#define CAN_STB_PORT                                    HAL_GPIOE
#define CAN_STB_PIN                                     HAL_GPIO_PIN_2
#define CAN_STB_INIT_STATE                              HAL_GPIO_PIN_RESET
#define CAN_STB_ACTIVE_STATE                            HAL_GPIO_PIN_SET
#define CAN_STB_INACTIVE_STATE                          HAL_GPIO_PIN_RESET

/* Exported macros -----------------------------------------------------------*/
/* Exported variables --------------------------------------------------------*/
/* Exported functions ------------------------------------------------------- */
/******************************************************************************/
/* Exported functions for gpio_default in HAL layer                           */
/******************************************************************************/
/**
  * @brief mx_gpio_default init function
  * This function configures the hardware resources used in this example
  * @retval 0  GPIO group correctly initialized
  * @retval -1 Issue detected during GPIO group initialization
  */
system_status_t mx_gpio_default_init(void);

/**
  * @brief  De-initialize gpio_default instance.
  */
system_status_t mx_gpio_default_deinit(void);

#ifdef __cplusplus
}
#endif /* __cplusplus */

#endif /* MX_GPIO_DEFAULT_H */
