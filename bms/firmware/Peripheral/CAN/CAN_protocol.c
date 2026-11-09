#include "CAN_protocol.h"

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>


bool CAN_protocol_gen_payload(uint8_t *payload, uint32_t timestamp_ms, uint32_t pack_voltage_mV, int32_t pack_current_mA, int16_t temperature_C, uint16_t soc_centiPercent, uint8_t valid_flags) {
  if (payload == NULL) return false;

  uint16_t temp_centiC = (uint16_t)(temperature_C * 100);
  
  for (int i = 0; i < 4; i++) {
    payload[i]   = (uint8_t)(timestamp_ms >> (8*i));
    payload[i+4] = (uint8_t)(pack_voltage_mV >> (8*i));
    payload[i+8] = (uint8_t)((uint32_t)pack_current_mA >> (8*i));
  }

  payload[12] = (uint8_t)(temp_centiC);
  payload[13] = (uint8_t)(temp_centiC >> 8);
  payload[14] = (uint8_t)(soc_centiPercent);
  payload[15] = (uint8_t)(soc_centiPercent >> 8);
  payload[16] = valid_flags;
  /* Unused bits for a 20 bit FDCAN frame */
  payload[17] = 0;
  payload[18] = 0;
  payload[19] = 0;
 
  return true;
}