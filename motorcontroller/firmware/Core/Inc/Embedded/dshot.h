#ifndef DSHOT_H_
#define DSHOT_H_

#include <stdbool.h>

void dshot_set_duty(uint16_t duty, bool telemetry);
void dshot_update();
void dshot_init();

#endif
