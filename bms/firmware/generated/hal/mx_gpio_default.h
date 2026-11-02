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

/* Primary aliases for GPIO PA1 pin */
#define EFUSE_FAULT_N_PORT                              HAL_GPIOA
#define EFUSE_FAULT_N_PIN                               HAL_GPIO_PIN_1

/* Primary aliases for GPIO PA2 pin */
#define BQ_WAKE_PORT                                    HAL_GPIOA
#define BQ_WAKE_PIN                                     HAL_GPIO_PIN_2
#define BQ_WAKE_INIT_STATE                              HAL_GPIO_PIN_RESET
#define BQ_WAKE_ACTIVE_STATE                            HAL_GPIO_PIN_SET
#define BQ_WAKE_INACTIVE_STATE                          HAL_GPIO_PIN_RESET

/* Primary aliases for GPIO PA3 pin */
#define USB_VBUS_SENSE_PORT                             HAL_GPIOA
#define USB_VBUS_SENSE_PIN                              HAL_GPIO_PIN_3

/* Primary aliases for GPIO PA4 pin */
#define BQ_ALERT_PORT                                   HAL_GPIOA
#define BQ_ALERT_PIN                                    HAL_GPIO_PIN_4

/* Primary aliases for GPIO PA8 pin */
#define SOC_LED_4_PORT                                  HAL_GPIOA
#define SOC_LED_4_PIN                                   HAL_GPIO_PIN_8
#define SOC_LED_4_INIT_STATE                            HAL_GPIO_PIN_RESET
#define SOC_LED_4_ACTIVE_STATE                          HAL_GPIO_PIN_SET
#define SOC_LED_4_INACTIVE_STATE                        HAL_GPIO_PIN_RESET

/* Primary aliases for GPIO PA15(JTDI) pin */
#define STATUS_LED_GREEN_PORT                           HAL_GPIOA
#define STATUS_LED_GREEN_PIN                            HAL_GPIO_PIN_15

/* Primary aliases for GPIO PB0 pin */
#define BQ_SPI_CHIPSLCT_PORT                            HAL_GPIOB
#define BQ_SPI_CHIPSLCT_PIN                             HAL_GPIO_PIN_0
#define BQ_SPI_CHIPSLCT_INIT_STATE                      HAL_GPIO_PIN_RESET
#define BQ_SPI_CHIPSLCT_ACTIVE_STATE                    HAL_GPIO_PIN_SET
#define BQ_SPI_CHIPSLCT_INACTIVE_STATE                  HAL_GPIO_PIN_RESET

/* Primary aliases for GPIO PB1 pin */
#define BQ_BOTHOFF_PORT                                 HAL_GPIOB
#define BQ_BOTHOFF_PIN                                  HAL_GPIO_PIN_1

/* Primary aliases for GPIO PB2 pin */
#define BQ_CHG_DISABLED_PORT                            HAL_GPIOB
#define BQ_CHG_DISABLED_PIN                             HAL_GPIO_PIN_2

/* Primary aliases for GPIO PB4(NJTRST) pin */
#define CAN_STB_PORT                                    HAL_GPIOB
#define CAN_STB_PIN                                     HAL_GPIO_PIN_4
#define CAN_STB_INIT_STATE                              HAL_GPIO_PIN_RESET
#define CAN_STB_ACTIVE_STATE                            HAL_GPIO_PIN_SET
#define CAN_STB_INACTIVE_STATE                          HAL_GPIO_PIN_RESET

/* Primary aliases for GPIO PB10 pin */
#define BQ_DSG_DISABLED_PORT                            HAL_GPIOB
#define BQ_DSG_DISABLED_PIN                             HAL_GPIO_PIN_10

/* Primary aliases for GPIO PB12 pin */
#define BQ_RST_SHUT_PORT                                HAL_GPIOB
#define BQ_RST_SHUT_PIN                                 HAL_GPIO_PIN_12
#define BQ_RST_SHUT_INIT_STATE                          HAL_GPIO_PIN_RESET
#define BQ_RST_SHUT_ACTIVE_STATE                        HAL_GPIO_PIN_SET
#define BQ_RST_SHUT_INACTIVE_STATE                      HAL_GPIO_PIN_RESET

/* Primary aliases for GPIO PB13 pin */
#define SOC_LED_1_PORT                                  HAL_GPIOB
#define SOC_LED_1_PIN                                   HAL_GPIO_PIN_13
#define SOC_LED_1_INIT_STATE                            HAL_GPIO_PIN_RESET
#define SOC_LED_1_ACTIVE_STATE                          HAL_GPIO_PIN_SET
#define SOC_LED_1_INACTIVE_STATE                        HAL_GPIO_PIN_RESET

/* Primary aliases for GPIO PB14 pin */
#define SOC_LED_2_PORT                                  HAL_GPIOB
#define SOC_LED_2_PIN                                   HAL_GPIO_PIN_14
#define SOC_LED_2_INIT_STATE                            HAL_GPIO_PIN_RESET
#define SOC_LED_2_ACTIVE_STATE                          HAL_GPIO_PIN_SET
#define SOC_LED_2_INACTIVE_STATE                        HAL_GPIO_PIN_RESET

/* Primary aliases for GPIO PB15 pin */
#define SOC_LED_3_PORT                                  HAL_GPIOB
#define SOC_LED_3_PIN                                   HAL_GPIO_PIN_15
#define SOC_LED_3_INIT_STATE                            HAL_GPIO_PIN_RESET
#define SOC_LED_3_ACTIVE_STATE                          HAL_GPIO_PIN_SET
#define SOC_LED_3_INACTIVE_STATE                        HAL_GPIO_PIN_RESET

/* Primary aliases for GPIO PC13 pin */
#define STATUS_LED_YELLOW_PORT                          HAL_GPIOC
#define STATUS_LED_YELLOW_PIN                           HAL_GPIO_PIN_13

/* Primary aliases for GPIO PE2 pin */
#define STATUS_LED_RED_PORT                             HAL_GPIOE
#define STATUS_LED_RED_PIN                              HAL_GPIO_PIN_2

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
