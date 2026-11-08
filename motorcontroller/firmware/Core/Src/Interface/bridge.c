#include "Interface/bridge.h"

#include <math.h>
#include <stddef.h>

//Implement
bool bridge_lookup_duty(float thrust_force, float voltage, float *duty)
{
	return false;
}
//Implement
bool bridge_duty_to_dshot(float duty, uint16_t *throttle)
{
	return true;
}

struct MotorValues
{
	uint32_t eRPM;
};







// V_BMS

// Get thurst, need eRPM
// Get DShot, need V_ESC
