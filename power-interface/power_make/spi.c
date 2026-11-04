/*
 * spi.c
 *
 *  Created on: Oct 7, 2026
 *      Author: elias-gravdal
 */

#include <stm32c5xx_hal_spi.h>

#include "main.h"
#include "stm32c5xx_hal_gpio.h"
#include "stm32c5xx_hal_rcc.h"

#include "interrupts.h"
#include "spi.h"

static void spi_tx_rx_sdm_cplt_callback(hal_spi_handle_t *hspi);
static void spi_tx_rx_inm_cplt_callback(hal_spi_handle_t *hspi);
static void spi_error_callback(hal_spi_handle_t *hspi);

hal_spi_handle_t sdspim;
hal_spi_handle_t* psdspim;

hal_spi_handle_t inspim;
hal_spi_handle_t* pinspim;

void SPI1_IRQHandler(void)
{
	HAL_SPI_IRQHandler(psdspim);
}

void SPI2_IRQHandler(void)
{
	HAL_SPI_IRQHandler(pinspim);
}

// this is all pretty standard, from examples and docs
int spi_sdm_init(void)
{
	psdspim = &sdspim;
	parserr(HAL_SPI_Init(psdspim, HAL_SPI1));
	parserr(HAL_RCC_PSIK_Enable(HAL_RCC_PSIK_DIV1_5)); // 144 MHz / 1.5 = 96 MHz, see below
	HAL_RCC_SPI1_EnableClock();
	parserr(HAL_RCC_SPI1_SetKernelClkSource(HAL_RCC_SPI1_CLK_SRC_PSIK));
	hal_spi_config_t spiconf =
	{
		.mode = HAL_SPI_MODE_MASTER,
		.direction = HAL_SPI_DIRECTION_FULL_DUPLEX,
		.data_width = HAL_SPI_DATA_WIDTH_8_BIT,
		.clock_polarity = HAL_SPI_CLOCK_POLARITY_LOW,
		.clock_phase = HAL_SPI_CLOCK_PHASE_1_EDGE,
		.baud_rate_prescaler = HAL_SPI_BAUD_RATE_PRESCALER_256, // 96 MHz / 256 = 384 kHz, in range of 100-400kHz
		.first_bit = HAL_SPI_MSB_FIRST,
		.nss_pin_management = HAL_SPI_NSS_PIN_MGMT_INTERNAL,
	};
	parserr(HAL_SPI_SetConfig(psdspim, &spiconf));
	HAL_RCC_GPIOA_EnableClock();
	hal_gpio_config_t gpioconf =
	{
		.mode = HAL_GPIO_MODE_ALTERNATE,
		.output_type = HAL_GPIO_OUTPUT_PUSHPULL,
		.pull = HAL_GPIO_PULL_NO,
		.speed = HAL_GPIO_SPEED_FREQ_MEDIUM,
		.alternate = HAL_GPIO_AF_6,
	};
	// dont do pin 5a, that is blinky
	HAL_GPIO_Init(HAL_GPIOB, HAL_GPIO_PIN_6 | HAL_GPIO_PIN_7 | HAL_GPIO_PIN_15, &gpioconf);

	HAL_CORTEX_NVIC_SetPriority(SPI1_IRQn, HAL_CORTEX_NVIC_PREEMP_PRIORITY_0, HAL_CORTEX_NVIC_SUB_PRIORITY_0);
	HAL_CORTEX_NVIC_EnableIRQ(SPI1_IRQn);

	parserr(HAL_SPI_RegisterTxRxCpltCallback(psdspim, spi_tx_rx_sdm_cplt_callback));
	parserr(HAL_SPI_RegisterErrorCallback(psdspim, spi_error_callback));

	return 0;
}

int spi_inm_init(void)
{
	pinspim = &inspim;
	parserr(HAL_SPI_Init(pinspim, HAL_SPI2));
	parserr(HAL_RCC_HSIK_Enable(HAL_RCC_HSIK_DIV7)); // 144 MHz / 7 = 20.571428.. MHz
	HAL_RCC_SPI2_EnableClock();
	parserr(HAL_RCC_SPI2_SetKernelClkSource(HAL_RCC_SPI2_CLK_SRC_HSIK));
	hal_spi_config_t spiconf =
	{
		.mode = HAL_SPI_MODE_MASTER,
		.direction = HAL_SPI_DIRECTION_FULL_DUPLEX,
		.data_width = HAL_SPI_DATA_WIDTH_8_BIT,
		.clock_polarity = HAL_SPI_CLOCK_POLARITY_LOW,
		.clock_phase = HAL_SPI_CLOCK_PHASE_1_EDGE,
		.baud_rate_prescaler = HAL_SPI_BAUD_RATE_PRESCALER_BYPASS,
		.first_bit = HAL_SPI_MSB_FIRST,
		.nss_pin_management = HAL_SPI_NSS_PIN_MGMT_INTERNAL,
	};
	parserr(HAL_SPI_SetConfig(pinspim, &spiconf));
	HAL_RCC_GPIOB_EnableClock();
	HAL_RCC_GPIOC_EnableClock();
	hal_gpio_config_t gpioconf =
	{
		.mode = HAL_GPIO_MODE_ALTERNATE,
		.output_type = HAL_GPIO_OUTPUT_PUSHPULL,
		.pull = HAL_GPIO_PULL_NO,
		.speed = HAL_GPIO_SPEED_FREQ_MEDIUM,
		.alternate = HAL_GPIO_AF_5, // alternate function 5 seems to be spi
	};
	HAL_GPIO_Init(HAL_GPIOC, HAL_GPIO_PIN_2 | HAL_GPIO_PIN_3, &gpioconf);
	HAL_GPIO_Init(HAL_GPIOB, HAL_GPIO_PIN_13, &gpioconf);

	HAL_CORTEX_NVIC_SetPriority(SPI2_IRQn, HAL_CORTEX_NVIC_PREEMP_PRIORITY_0, HAL_CORTEX_NVIC_SUB_PRIORITY_0);
	HAL_CORTEX_NVIC_EnableIRQ(SPI2_IRQn);

	parserr(HAL_SPI_RegisterTxRxCpltCallback(pinspim, spi_tx_rx_inm_cplt_callback));
	parserr(HAL_SPI_RegisterErrorCallback(pinspim, spi_error_callback));

	return 0;
}

char mrecvbuf[0x1000];
int spi_sdm_send(char* data, int len)
{
	// if I understand correctly, data is copied in this function, so it doesen't matter if it goes out of scope
	HAL_SPI_TransmitReceive_IT(psdspim, data, mrecvbuf, len);
	return 0;
}
char* spi_sdm_getdata(void)
{
	return mrecvbuf;
}

char ssendbuf[0x1000];
char srecvbuf[0x1000];
char* spi_inm_getgata()
{
	return srecvbuf;
}
int spi_inm_recv(int len)
{
	for(int i = 0; i < len; ++i)
	{
		ssendbuf[i] = 0x42;
	}
	HAL_SPI_TransmitReceive_IT(pinspim, ssendbuf, srecvbuf, len);
	return 0;
}


static void spi_tx_rx_sdm_cplt_callback(hal_spi_handle_t *hspi)
{
	push_interrupt(1, FI_SPI_SDM, hspi);;
}
static void spi_tx_rx_inm_cplt_callback(hal_spi_handle_t *hspi)
{
	push_interrupt(1, FI_SPI_INM, hspi);;
}
static void spi_error_callback(hal_spi_handle_t *hspi)
{
	push_interrupt(1, FI_SPI_ERR, hspi);;
}

