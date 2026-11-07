#include "main.h"
#include "stm32c5xx_hal_rcc.h"
#include "stm32c5xx_hal_gpio.h"

// this is simple, really;
int init_gpio(void)
{
	hal_gpio_config_t  gpio_config;

	HAL_RCC_GPIOA_EnableClock();

	HAL_RCC_GPIOC_EnableClock();

	/*
	 *     GPIO pin labels :
	 *         PA5   ---------> PA5
	 *             */
	/* Configure PA5 GPIO pin in output mode */
	gpio_config.mode            = HAL_GPIO_MODE_OUTPUT;
	gpio_config.speed           = HAL_GPIO_SPEED_FREQ_LOW;
	gpio_config.pull            = HAL_GPIO_PULL_UP;
	gpio_config.output_type     = HAL_GPIO_OUTPUT_PUSHPULL;
	gpio_config.init_state      = HAL_GPIO_PIN_RESET;
	if (HAL_GPIO_Init(HAL_GPIOA, HAL_GPIO_PIN_5, &gpio_config) != HAL_OK)
	{
		return -1;
	}

	/*
	 *     GPIO pin labels :
	 *         PC13  ---------> PC13
	 *             */
	/* Configure PC13 GPIO pin in input mode */
	gpio_config.mode            = HAL_GPIO_MODE_INPUT;
	gpio_config.pull            = HAL_GPIO_PULL_UP;
	if (HAL_GPIO_Init(HAL_GPIOC, HAL_GPIO_PIN_13, &gpio_config) != HAL_OK)
	{
		return -1;
	}
	return 0;
}
