#ifndef POWER_H_
#define POWER_H_

#include <stdint.h>

int power_can_spong(int caninst, int code);

int power_can_recvdcallback(void* unused);
int power_can_sentcallback(void* unused);
int power_can_errcallback(void* unused);
int power_spi_sdmcallback(void* unused);
int power_spi_inmcallback(void* unused);
int power_spi_errcallback(void* unused);
int power_stick_callback(void* stock);

#endif
