/*
 * can.h
 *
 *  Created on: Sep 25, 2026
 *      Author: elias-gravdal
 */

#ifndef CAN_H_
#define CAN_H_

int can_init(void);
int app_process(void);

int can_getdata(uint8_t* data, char* size, int* id);
int can_senddata(const uint8_t* data, char size, int id);

#endif /* CAN_H_ */
