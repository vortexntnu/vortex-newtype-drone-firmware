#ifndef DEBUG_H_
#define DEBUG_H_

#include <Embedded/Commands.h>
#include "main.h"
#include <string.h>
#include <stdarg.h>
#include <stdbool.h>

void Debug_PrintRaw(const char message[]);
void Debug_Print(const char message[], ...);
void Debug_ReadUART();

#endif
