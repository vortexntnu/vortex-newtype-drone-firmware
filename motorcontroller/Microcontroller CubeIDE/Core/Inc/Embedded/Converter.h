#ifndef CONVERTER_H_
#define CONVERTER_H_

#include <stdint.h>
#include <stdbool.h>

uint8_t Converter_UIntToStringLength(uint32_t number);
uint8_t Converter_UIntToString(char *Output, uint32_t number);
uint8_t Converter_StringToUInt(uint32_t *Output, const char String[]);

#endif
