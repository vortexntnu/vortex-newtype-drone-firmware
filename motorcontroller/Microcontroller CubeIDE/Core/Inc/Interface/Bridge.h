#ifndef BRIDGE_H_
#define BRIDGE_H_

#include <s>

float bridge_lookup_eRPM(float thrust, float current, float voltage, int16_t DShot);

int16_t bridge_lookup_DShot(float thrust, float current, float voltage);

float bridge_lookup_min_max_thrust(float voltage);



#endif
