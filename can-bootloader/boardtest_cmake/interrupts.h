/*
 * interrupts.h
 *
 *  Created on: Sep 25, 2026
 *      Author: elias-gravdal
 */

#ifndef INTERRUPTS_H_
#define INTERRUPTS_H_

enum FUNCTION_INDICES
{
	FI_CAN_RECVD,
	FI_CAN_SENT,
	FI_CAN_ERR,
	FI_FLASH_ERASED,
	FI_FLASH_PROGD,
	FI_FLASH_ERR,
};

int push_interrupt(uint8_t type, uint8_t index, void* payload);
int interrupt_loop(void);

#endif /* INTERRUPTS_H_ */
