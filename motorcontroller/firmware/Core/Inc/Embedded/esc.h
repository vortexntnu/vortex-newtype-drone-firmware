#ifndef ESC_H_
#define ESC_H_

#include <debug.h>
#include <converter.h>
#include <stdbool.h>


//


typedef struct {
    uint8_t  temperature;
    float    voltage;
    float    current;
    uint16_t consumption; //mah
    uint32_t erpm;
} EscTelemetry;


//


void esc_init(UART_HandleTypeDef *huart);
EscTelemetry esc_fetch_latest_telemetry();

#endif
