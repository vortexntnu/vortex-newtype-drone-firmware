/*
 * interrupts.c
 *
 *  Created on: Sep 25, 2026
 *      Author: elias-gravdal
 */

#include <stdint.h>
#include "main.h"
#include "boot.h"
#include "interrupts.h"

int (*ifns[])(void* payload) =
{
		[FI_CAN_RECVD] = boot_can_recvdcallback,
		[FI_CAN_SENT] = boot_can_sentcallback,
		[FI_CAN_ERR] = boot_can_errcallback,
		[FI_FLASH_ERASED] = boot_flash_erasedcallback,
		[FI_FLASH_PROGD] = boot_flash_progdcallback,
		[FI_FLASH_ERR] = boot_flash_errcallback,
};
int interrupted; // 0 for no interrupt, n for interrupt vector, large n for break (over 0xffff);
uint8_t indices[256];
void* payloads[256];
uint8_t start;
uint8_t end;
uint8_t full;

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
	interrupted = 0;
	start = 0;
	end = 0;
	full = 0;
	for(;1;)
	{
		__WFI();

		if(!interrupted)
		{
			continue;
		}
		if(interrupted > 0xffff)
			break;
		for(; start != end; start++)
		{
			ifns[indices[start]](payloads[start]);
		}
	}
	err(2);

	return 0;
}
