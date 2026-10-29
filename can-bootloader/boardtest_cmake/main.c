/**
  ******************************************************************************
  * file           : main.c
  * brief          : Main program body
  *                  Calls target system initialization then loop in main.
  ******************************************************************************
  *
  * Copyright (c) 2025 STMicroelectronics.
  * All rights reserved.
  *
  * This software is licensed under terms that can be found in the LICENSE file
  * in the root directory of this software component.
  * If no LICENSE file comes with this software, it is provided AS-IS.
  *
  ******************************************************************************
  */
/* Includes ------------------------------------------------------------------*/

#include "main.h"

#include "stm32c5xx_hal.h"
#include "stm32c5xx_hal_flash.h"
#include "stm32c5xx_hal_flash_itf.h"
#include "stm32c5xx_hal_fdcan.h"

/* Private typedef -----------------------------------------------------------*/
/* Private define ------------------------------------------------------------*/
/* Private macro -------------------------------------------------------------*/
/* Private variables ---------------------------------------------------------*/
/* Private functions prototype -----------------------------------------------*/

#include "mx_button.h"

button_t* btn;

int err(int num)
{
	for(int i = 0; i < 2*num; ++i)
	{
		HAL_GPIO_TogglePin(HAL_GPIOA, HAL_GPIO_PIN_5);
		HAL_Delay(300);
	}
	HAL_Delay(1000);
	return 0;
}

int noerr(int num)
{
	for(int i = 0; i < 2*num; ++i)
	{
		HAL_GPIO_TogglePin(HAL_GPIOA, HAL_GPIO_PIN_5);
		HAL_Delay(100);
	}
	HAL_Delay(500);
	return 0;
}

int parserr(hal_status_t stat)
{
	int i = 0;
	if(stat != HAL_OK)
	{
		switch(stat)
		{
		case HAL_ERROR: /* HAL operation completed with error   */
			++i;
		case HAL_BUSY: /* HAL concurrent process ongoing       */
			++i;
		case HAL_INVALID_PARAM: /* HAL invalid parameter                */
			++i;
		case HAL_TIMEOUT: /* HAL operation exceeds user timeout   */
			++i;
		default:
			err(i);
		}
	}
	return 0;
}

#include "can.h"
#include "flash.h"
#include "interrupts.h"

/**
  * brief:  The application entry point.
  * retval: none but we specify int to comply with C99 standard
  */

int main(void)
{
	/** System Init: this code placed in targets folder initializes your system.
	 * It calls the initialization (and sets the initial configuration) of the peripherals.
	 * You can use STM32CubeMX to generate and call this code or not in this project.
	 * It also contains the HAL initialization and the initial clock configuration.
	 */
	if (mx_system_init() != SYSTEM_OK)
	{
		return (-1);
	}

	/*
	 * You can start your application code here
	 */

	can_init();
	flash_init();
	noerr(3);

//	push_interrupt(1, FI_CAN_RECVD, NULL);
	interrupt_loop();
//	app_process();
	noerr(10);

	char nprev = 1;
	while (1) {
		int b = HAL_GPIO_ReadPin (HAL_GPIOC, HAL_GPIO_PIN_13) == HAL_GPIO_PIN_RESET;
		if(b == HAL_GPIO_PIN_RESET && nprev)
		{
			//Turn LED ON
			HAL_GPIO_TogglePin(HAL_GPIOA, HAL_GPIO_PIN_5);
			nprev = 0;
			HAL_Delay(10);
		}
		else if(!(b == HAL_GPIO_PIN_RESET))
		{
			//Turn LED OFF
			nprev = 1;
			HAL_Delay(10);
		}

//			HAL_GPIO_TogglePin(HAL_GPIOA, HAL_GPIO_PIN_5);
//			HAL_Delay(100);
//		}

		HAL_Delay(1);

//		if((b & BUTTON_UNPRESSED) == BUTTON_PRESSED && nprev)
//		{
//				HAL_GPIO_TogglePin(HAL_GPIOA, HAL_GPIO_PIN_5);
//				HAL_Delay(500);
//				HAL_GPIO_TogglePin(HAL_GPIOA, HAL_GPIO_PIN_5);
//				HAL_Delay(500);
//
//				nprev = 0;
//		}
//		else if(!((b & BUTTON_PRESSED) == BUTTON_PRESSED))
//		{
//			nprev = 1;
//			HAL_Delay(10);
//		}
//		HAL_Delay(1);
	}
} /* end main */

