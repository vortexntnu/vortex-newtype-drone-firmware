/* USER CODE BEGIN Header */
/**
  ******************************************************************************
  * @file           : main.h
  * @brief          : Header for main.c file.
  *                   This file contains the common defines of the application.
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
/* USER CODE END Header */

/* Define to prevent recursive inclusion -------------------------------------*/
#ifndef __MAIN_H
#define __MAIN_H

#ifdef __cplusplus
extern "C" {
#endif

/* Includes ------------------------------------------------------------------*/
#include "stm32h7xx_hal.h"

#include "stm32h7xx_nucleo.h"
#include <stdio.h>

/* Private includes ----------------------------------------------------------*/
/* USER CODE BEGIN Includes */

/* USER CODE END Includes */

/* Exported types ------------------------------------------------------------*/
/* USER CODE BEGIN ET */

/* USER CODE END ET */

/* Exported constants --------------------------------------------------------*/
/* USER CODE BEGIN EC */

/* USER CODE END EC */

/* Exported macro ------------------------------------------------------------*/
/* USER CODE BEGIN EM */

/* USER CODE END EM */

void HAL_TIM_MspPostInit(TIM_HandleTypeDef *htim);

/* Exported functions prototypes ---------------------------------------------*/
void Error_Handler(void);

/* USER CODE BEGIN EFP */

/* USER CODE END EFP */

/* Private defines -----------------------------------------------------------*/
#define SPI5_MOSI___WEIGHT_CELL_AMPLIFIER_Pin GPIO_PIN_9
#define SPI5_MOSI___WEIGHT_CELL_AMPLIFIER_GPIO_Port GPIOF
#define MOTORCONTROLLER_4___SPI4_MOSI_Pin GPIO_PIN_14
#define MOTORCONTROLLER_4___SPI4_MOSI_GPIO_Port GPIOE
#define SPI2_MOSI___MOTORCONTROLLER_2_Pin GPIO_PIN_15
#define SPI2_MOSI___MOTORCONTROLLER_2_GPIO_Port GPIOB
#define MOTORCONTROLLER_1___SPI1_MOSI_Pin GPIO_PIN_7
#define MOTORCONTROLLER_1___SPI1_MOSI_GPIO_Port GPIOD
#define SPI3_MOSI___MOTORCONTROLLER_3_Pin GPIO_PIN_5
#define SPI3_MOSI___MOTORCONTROLLER_3_GPIO_Port GPIOB

/* USER CODE BEGIN Private defines */

/* USER CODE END Private defines */

#ifdef __cplusplus
}
#endif

#endif /* __MAIN_H */
