/*
 * boot.h
 *
 *  Created on: Sep 26, 2026
 *      Author: elias-gravdal
 */

#ifndef BOOT_H_
#define BOOT_H_

int boot_can_recvdcallback(void* unused);
int boot_can_sentcallback(void* unused);
int boot_can_errcallback(void* unused);

int boot_flash_erasedcallback(void* unused);
int boot_flash_progdcallback(void* unused);
int boot_flash_errcallback(void* unused);

#endif /* BOOT_H_ */
