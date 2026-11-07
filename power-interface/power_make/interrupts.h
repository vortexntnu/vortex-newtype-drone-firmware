/*
 * interrupts.h
 *
 *  Created on: Sep 25, 2026
 *      Author: elias-gravdal
 */

#ifndef INTERRUPTS_H_
#define INTERRUPTS_H_

#include <stdint.h>

enum FUNCTION_INDICES
{
	FI_CAN_RECVD,
	FI_CAN_SENT,
	FI_CAN_RESEND,
	FI_CAN_ERR,
	FI_SPI_SDM,
	FI_SPI_INM,
	FI_SPI_ERR,
	FI_STICK,
};

int push_interrupt(uint8_t type, uint8_t index, void* payload);
int push_new_interrupt(uint8_t type, uint8_t index, void* payload);
int interrupt_loop(void);

#endif /* INTERRUPTS_H_ */
