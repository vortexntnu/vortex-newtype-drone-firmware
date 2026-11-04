/*
 * spi.h
 *
 *  Created on: Oct 10, 2026
 *      Author: elias-gravdal
 */

#ifndef SPI_H_
#define SPI_H_

#include <stm32c5xx_hal_spi.h>

int spi_sdm_init(void); // sd card spi
int spi_inm_init(void); // indicator spi
int spi_sdm_send(char* data, int len);
char* spi_sdm_getdata(void);
int spi_inm_recv(int len);
char* spi_inm_getgata(void);

extern hal_spi_handle_t* psdspim; // pointer to secure digital serial peripheral interface master
extern hal_spi_handle_t* pinspim; // pointer to indicator serial peripheral interface master

#endif /* SPI_H_ */
