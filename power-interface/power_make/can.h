/*
 * can.h
 *
 *  Created on: Sep 25, 2026
 *      Author: elias-gravdal
 */

#ifndef CAN_H_
#define CAN_H_

#include "stm32c5xx_hal_fdcan.h"

int can_init(int caninst, int hal_gpio_port, unsigned long hal_gpio_pin1, unsigned long hal_gpio_pin2);

extern hal_fdcan_handle_t* pcanhan1;
extern hal_fdcan_handle_t* pcanhan2;

int can_resend(void* caninstfp);

int can_getdata(int caninst, uint8_t* data, char* size, int* id);
int can_senddata(int caninst, uint8_t* data, char size, uint16_t id);

#endif /* CAN_H_ */
