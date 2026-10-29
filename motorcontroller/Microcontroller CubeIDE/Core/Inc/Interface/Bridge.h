#ifndef BRIDGE_H_
#define BRIDGE_H_

#include <stdbool.h>

float bridge_lookup_eRPM(float thrust, float current, float voltage);

int16_t bridge_lookup_DShot(float thrust, float current, float voltage);

float bridge_lookup_max_thrust(float voltage, bool direction);

#endif
