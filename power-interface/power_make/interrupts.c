/*
 * interrupts.c
 *
 *  Created on: Sep 25, 2026
 *      Author: elias-gravdal
 */

#include <stdint.h>
#include "main.h"
#include "power.h"
#include "can.h"
#include "interrupts.h"

static int (*ifns[])(void* payload) =
{
	[FI_CAN_RECVD] = power_can_recvdcallback,
	[FI_CAN_SENT] = power_can_sentcallback,
	[FI_CAN_RESEND] = can_resend,
	[FI_CAN_ERR] = power_can_errcallback,
	[FI_SPI_SDM] = power_spi_sdmcallback,
	[FI_SPI_INM] = power_spi_inmcallback,
	[FI_SPI_ERR] = power_spi_errcallback,
	[FI_STICK] = power_stick_callback,
	[FI_I2C_READ] = power_i2c_readcallback,
	[FI_I2C_WRITE] = power_i2c_wrotecallback,
};
static int interrupted = 0; // 0 for no interrupt, n for interrupt vector, large n for break (over 0xffff);
static uint8_t indices[256];
static void* payloads[256];
static uint8_t start = 0;
static uint8_t end = 0;
static uint8_t full = 0;

// they are chars, so will overflow on 256, this is intentional;
int push_interrupt(uint8_t type, uint8_t index, void* payload)
{
	interrupted += type;
	if(full)
	{
		return -1;
	}
	indices[end] = index;
	payloads[end++] = payload;
	if(end == start)
	{
		full = 1;
	}
	return 0;
}

// don't push if an interrupt of same type is already queued
int push_new_interrupt(uint8_t type, uint8_t index, void* payload)
{
	for(uint8_t i = start; i != end; ++i)
		if(indices[i] == index)
			return -1;
	if(full)
		for(int i = 0; i < 256; ++i)
			if(indices[i] == index)
				return -1;
	return push_interrupt(type, index, payload);
}

int interrupt_loop(void)
{
	for(;1;)
	{
		if(!interrupted)
		{
			__WFI();

			if(!interrupted)
			{
				continue;
			}
			if(interrupted > 0xffff)
				break;
		}
		interrupted = 0;
		for(; start != end || full; start++)
		{
			ifns[indices[start]](payloads[start]);
		}
	}
	err(2);

	return 0;
}
