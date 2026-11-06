#ifndef CONTROLLER_H_
#define CONTROLLER_H_

#include <converter.h>
#include <debug.h>
#include <dshot.h>
#include <weight.h>
#include <main.h>
#include <stdbool.h>

void controller_init();
uint32_t controller_main();
uint32_t controller_dshot();
uint32_t controller_weight();

#endif
