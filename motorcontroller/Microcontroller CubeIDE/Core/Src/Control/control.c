#include "Control/control.h"

float reference_thrust[4] = {0};


//


ControlErrorCode control_init()
{
	Debug_Print("Hello, world!");
	return ControlErrorCode.SUCCESS;
}

ControlErrorCode control_allocate_thrust(float wrench[6])
{
	reference_thrust[0] = 101;
	return ControlErrorCode.SUCCESS;
}

ControlErrorCode control_regulator_step(float deltaSeconds, ThrusterMeasurements* measurements, int16_t output_throttle[4])
{
	output_throttle[0] = 1337;
	return ControlErrorCode.SUCCESS;
}
