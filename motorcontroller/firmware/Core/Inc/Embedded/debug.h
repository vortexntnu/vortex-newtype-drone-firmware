#ifndef DEBUG_H_
#define DEBUG_H_

#include "Embedded/commands.h"
#include "main.h"
#include <string.h>
#include <stdarg.h>
#include <stdbool.h>

void debug_print_raw(const char message[]);
void debug_print(const char message[], ...);
void debug_read_uart();

#endif
