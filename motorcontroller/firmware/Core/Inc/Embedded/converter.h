#ifndef CONVERTER_H_
#define CONVERTER_H_

#include <stdint.h>
#include <stdbool.h>

uint8_t converter_uint_to_string_length(uint32_t number);
uint8_t converter_uint_to_string(char *output, uint32_t number);

uint8_t converter_int_to_string(char *output, int32_t number);
bool converter_int_to_byte_string(char *output, int32_t number);

uint8_t converter_string_to_uint(uint32_t *output, const char String[]);

uint8_t converter_float_to_string(char *output, float number, uint8_t decimals);

#endif
