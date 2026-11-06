#ifndef WEIGHT_H_
#define WEIGHT_H_

#include <main.h>
#include <stdbool.h>

void weight_init();
bool weight_read(uint8_t cell, int32_t* output);

#endif
