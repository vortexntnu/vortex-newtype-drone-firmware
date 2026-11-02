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

static void spi_tx_rx_master_cplt_callback(hal_spi_handle_t *hspi);
static void spi_error_callback(hal_spi_handle_t *hspi);
static void spi_tx_rx_slave_cplt_callback(hal_spi_handle_t *hspi);

hal_spi_handle_t spislave;
hal_spi_handle_t* pspislave;

hal_spi_handle_t spimaster;
hal_spi_handle_t* pspimaster;

void SPI1_IRQHandler(void)
{
	HAL_SPI_IRQHandler(pspimaster);
}

void SPI2_IRQHandler(void)
{
	HAL_SPI_IRQHandler(pspislave);
}

// this is all pretty standard, from examples and docs
int spi_init_master(void)
{
	pspimaster = &spimaster;
	parserr(HAL_SPI_Init(pspimaster, HAL_SPI1));
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
	parserr(HAL_SPI_SetConfig(pspimaster, &spiconf));
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

	parserr(HAL_SPI_RegisterTxRxCpltCallback(pspimaster, spi_tx_rx_master_cplt_callback));
	parserr(HAL_SPI_RegisterErrorCallback(pspimaster, spi_error_callback));

	return 0;
}

int spi_init_slave(void)
{
	pspislave = &spislave;
	parserr(HAL_SPI_Init(pspislave, HAL_SPI2));
	HAL_RCC_SPI2_EnableClock();
	parserr(HAL_RCC_SPI2_SetKernelClkSource(HAL_RCC_SPI2_CLK_SRC_PCLK1));
	hal_spi_config_t spiconf =
	{
		.mode = HAL_SPI_MODE_SLAVE,
		.direction = HAL_SPI_DIRECTION_FULL_DUPLEX,
		.data_width = HAL_SPI_DATA_WIDTH_8_BIT,
		.clock_polarity = HAL_SPI_CLOCK_POLARITY_LOW,
		.clock_phase = HAL_SPI_CLOCK_PHASE_1_EDGE,
		.baud_rate_prescaler = HAL_SPI_BAUD_RATE_PRESCALER_2, // why is this 2?
		.first_bit = HAL_SPI_MSB_FIRST,
		.nss_pin_management = HAL_SPI_NSS_PIN_MGMT_INTERNAL,
	};
	parserr(HAL_SPI_SetConfig(pspislave, &spiconf));
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

	parserr(HAL_SPI_RegisterTxRxCpltCallback(pspislave, spi_tx_rx_slave_cplt_callback));
	parserr(HAL_SPI_RegisterErrorCallback(pspislave, spi_error_callback));

	return 0;
}

char mrecvbuf[0x1000];
int spi_master_send(char* data, int len)
{
	// if I understand correctly, data is copied in this function, so it doesen't matter if it goes out of scope
	HAL_SPI_TransmitReceive_IT(pspimaster, data, mrecvbuf, len);
	return 0;
}
char* spi_master_getdata(void)
{
	return mrecvbuf;
}

char ssendbuf[0x1000];
char srecvbuf[0x1000];
char* spi_slave_getgata()
{
	return srecvbuf;
}
int spi_slave_recv(int len)
{
	for(int i = 0; i < len; ++i)
	{
		ssendbuf[i] = 0x42;
	}
	HAL_SPI_TransmitReceive_IT(pspislave, ssendbuf, srecvbuf, len);
	return 0;
}


static void spi_tx_rx_master_cplt_callback(hal_spi_handle_t *hspi)
{
	push_interrupt(1, FI_SPI_SENT, hspi);;
}
static void spi_error_callback(hal_spi_handle_t *hspi)
{
	push_interrupt(1, FI_SPI_ERR, hspi);;
}
static void spi_tx_rx_slave_cplt_callback(hal_spi_handle_t *hspi)
{
	push_interrupt(1, FI_SPI_RECVD, hspi);;
}

