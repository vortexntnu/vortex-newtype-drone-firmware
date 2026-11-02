#include "Control/control.h"

float reference_thrust[4] = {0};


//


ControlErrorCode control_init()
{
	debug_print("Hello, world!");
	return ControlErrorCode.SUCCESS;
}

allocat_thrust_task(wrench){
	max_thrust = are_thrusters_cooked()
	max_thrust ,output_thrust = control_allocate_thrust()
}


ControlErrorCode control_allocate_thrust(float wrench[6], float max_thrust[8], float output_thrust[8])
{
	reference_thrust[0] = 101;
	return ControlErrorCode.SUCCESS;
}

ControlErrorCode control_regulator_step(float deltaSeconds, ThrusterMeasurements* measurements, float reference_eRPM[4] , float output_duty[4])
{
	output_throttle[0] = 1337;
	return ControlErrorCode.SUCCESS;
}
