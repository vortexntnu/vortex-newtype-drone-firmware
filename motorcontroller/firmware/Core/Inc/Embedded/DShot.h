#ifndef DSHOT_H_
#define DSHOT_H_

#include <stdbool.h>

void DShot_SetDuty(uint16_t duty, bool telemetry);
void DShot_Update();

#endif
