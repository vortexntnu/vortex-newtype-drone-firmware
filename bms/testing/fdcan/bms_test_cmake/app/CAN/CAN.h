#ifndef CAN_H
#define CAN_H

#include "stm32c5xx_hal_fdcan.h"
#include <stdint.h>
#include <stdbool.h>

bool CAN_init(void);
void CAN_deInit(void);
bool CAN_start(void);
bool CAN_send(uint16_t id, const uint8_t *data);
bool CAN_recieve(hal_fdcan_rx_header_t *rx_header, uint8_t *rx_data);

#endif