#ifndef BMS_CAN_PROTOCOL_H
#define BMS_CAN_PROTOCOL_H

#include <stdint.h>
#include <stdbool.h>

#define BMS_PAYLOAD_SIZE 20

typedef struct {
    /* 32 bit = 4 byte | 16 bit = 2 byte | 8 bit = 1 byte 
       The datafields (except timestamp) should be divided by 100 to retrieve the correct data format. */ 
    uint32_t timestamp_ms;          // 4  
    uint32_t pack_voltage_mV;       // 4  48000 / 100 mV = 48.000 mV
    int32_t  pack_current_mA;       // 4. Negative -> discharge, Positive -> charge
    int16_t  temperature_C;         // 2.
    uint16_t soc_percent;           // 2.
    uint8_t  valid_flags;           // 1. Bits indicate which readings are valid
    /*                         Total: 17 bytes */
} FdcanPayload;

bool CAN_protocol_gen_payload(uint8_t *payload, uint32_t timestamp_ms, uint32_t pack_voltage_mV, int32_t pack_current_mA, int16_t temperature_C, uint16_t soc, uint8_t valid_flags);

#endif