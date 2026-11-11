/*
 * flash.h
 *
 *  Created on: Sep 30, 2026
 *      Author: elias-gravdal
 */

#ifndef FLASH_H_
#define FLASH_H_

#include <stdint.h>

int flash_init(void);
int flash_deinit(void);
int flash_swap_banks_and_die();
int flash_prog_addr(uint32_t where, uint32_t* data);
int flash_erase_addr(uint32_t where, uint32_t cnt);

#endif /* FLASH_H_ */
