/*
 * spi.h
 *
 *  Created on: Oct 10, 2026
 *      Author: elias-gravdal
 */

#ifndef SPI_H_
#define SPI_H_

#include <stm32c5xx_hal_spi.h>

int spi_init_master(void);
int spi_init_slave(void);
int spi_master_send(char* data, int len);
char* spi_master_getdata(void);
char* spi_slave_getgata(void);
int spi_slave_recv(int len);

extern hal_spi_handle_t* pindicator_spi;

#endif /* SPI_H_ */
