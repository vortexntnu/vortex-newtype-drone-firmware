#include "CAN_protocol.h"

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>


bool CAN_protocol_gen_payload(uint8_t *payload, uint32_t timestamp_ms, uint32_t pack_voltage_mV, int32_t pack_current_mA, int16_t temperature_C, uint16_t soc_centiPercent, uint8_t valid_flags) {
  if (payload == NULL) return false;

  uint16_t temp_centiC = (uint16_t)(temperature_C);
  
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


static uint32_t _read_u32_le(const uint8_t *starting_byte) {
  return (uint32_t)starting_byte[0] | 
         ((uint32_t)starting_byte[1] << 8) | 
         ((uint32_t)starting_byte[2] << 16) | 
         ((uint32_t)starting_byte[3] << 24);
}

static uint16_t _read_u16_le(const uint8_t *starting_byte) {
  return ((uint16_t)starting_byte[0]) |
         ((uint16_t)starting_byte[1] << 8);
}

/* NOTE: Not used in used in the BMS. Used on whichever node recieves BMS telemtric messages */
bool CAN_protocol_decode_telemetric_msg(const uint8_t *src_data, size_t src_len, FdcanPayload *dst_data) {
  if (src_data == NULL || dst_data == NULL || src_len != BMS_PAYLOAD_SIZE) 
    return false;
  
  dst_data->timestamp_ms       = _read_u32_le(&src_data[0]);
  dst_data->pack_voltage_mV    = _read_u32_le(&src_data[4]);
  dst_data->pack_current_mA    = (int32_t)_read_u32_le(&src_data[8]);
  dst_data->temperature_C      = (int16_t)_read_u16_le(&src_data[12]);
  dst_data->soc_percent        = _read_u16_le(&src_data[14]);
  dst_data->valid_flags        = src_data[16];

  return true;
}
