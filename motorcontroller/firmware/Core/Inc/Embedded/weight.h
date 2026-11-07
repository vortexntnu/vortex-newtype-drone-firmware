#ifndef WEIGHT_H_
#define WEIGHT_H_

#include <main.h>
#include <stdbool.h>

void weight_init();
bool weight_read(int32_t *output);
bool weight_tare(uint8_t channel);
bool weight_tareall();

#endif
