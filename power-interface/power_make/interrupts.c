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

int (*ifns[])(void* payload) =
{
	[FI_CAN_RECVD] = power_can_recvdcallback,
	[FI_CAN_SENT] = power_can_sentcallback,
	[FI_CAN_RESEND] = can_resend,
	[FI_CAN_ERR] = power_can_errcallback,
	[FI_SPI_SDM] = power_spi_sdmcallback,
	[FI_SPI_INM] = power_spi_inmcallback,
	[FI_SPI_ERR] = power_spi_errcallback,
	[FI_STICK] = power_stick_callback,
};
int interrupted = 0; // 0 for no interrupt, n for interrupt vector, large n for break (over 0xffff);
uint8_t indices[256];
void* payloads[256];
uint8_t start = 0;
uint8_t end = 0;
uint8_t full = 0;

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
		for(; start != end || full; start++)
		{
			ifns[indices[start]](payloads[start]);
		}
	}
	err(2);

	return 0;
}
