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
#include "stm32c5xx_hal_gpio.h"
#include "stm32c5xx_hal_cortex.h"

/* Private typedef -----------------------------------------------------------*/
/* Private define ------------------------------------------------------------*/
/* Private macro -------------------------------------------------------------*/
/* Private variables ---------------------------------------------------------*/
/* Private functions prototype -----------------------------------------------*/

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

#include "init.h"
#include "gpio.h"
#include "can.h"
#include "flash.h"
#include "interrupts.h"

void SysTick_Handler(void)
{
	HAL_IncTick();
	HAL_CORTEX_SYSTICK_IRQHandler();
}

void HardFault_Handler(void)
{
	HAL_GPIO_WritePin(HAL_GPIOA, HAL_GPIO_PIN_5, HAL_GPIO_PIN_SET);
	while(1);
}

/**
  * brief:  The application entry point.
  * retval: none but we specify int to comply with C99 standard
  */

int main(void)
{
	// This was done after mpu, but it seems to work before too;
	if(HAL_Init() != HAL_OK)
	{
		return -1;
	}
	// these are in the same file, init.c
	init_mpu();
	init_icache();
	// don't know where to put this, it's too smol for own function;
	HAL_CORTEX_NVIC_SetPriorityGrouping(HAL_CORTEX_NVIC_PRIORITY_GROUP_4);
	init_rcc();
	// after this is done we can use err, noerr, etc;
	init_gpio();
	/** System Init: this code placed in targets folder initializes your system.
	 * It calls the initialization (and sets the initial configuration) of the peripherals.
	 * You can use STM32CubeMX to generate and call this code or not in this project.
	 * It also contains the HAL initialization and the initial clock configuration.
	 */
//	if (mx_system_init() != SYSTEM_OK)
//	{
//		return (-1);
//	}

	/*
	 * You can start your application code here
	 */

	noerr(3);
	can_init();
	flash_init();
	noerr(3);

	push_interrupt(1, FI_SEND_INIT, NULL);
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

		HAL_Delay(1);
	}
} /* end main */

