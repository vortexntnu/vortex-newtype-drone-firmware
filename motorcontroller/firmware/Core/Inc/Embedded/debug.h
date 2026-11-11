#ifndef DEBUG_H_
#define DEBUG_H_

#include "Embedded/commands.h"
#include "main.h"
#include <string.h>
#include <stdarg.h>
#include <stdbool.h>

void debug_print_raw(const char message[]);
void debug_proccess_input_buffer();
void debug_init();
void debug_print(const char message[], ...);

void Debug_HAL_UART_ErrorCallback(UART_HandleTypeDef *huart);

#endif
