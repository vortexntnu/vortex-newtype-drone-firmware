#include "control.h"


ControlErrorCode control_init()
{
	debug_print("Hello, world!");
	return CONTROL_SUCCESS;
}

ControlErrorCode control_allocate_thrust(float wrench[6], AllocatorParams allocator_parameters, float output_thrust[8])
{
	output_thrust[0] = 69;
	return CONTROL_SUCCESS;
}

ControlErrorCode control_regulator_step(float delta_seconds, ThrusterMeasurementSet* measurements, float reference_thrust[4], float reference_erpm[4], float output_duty[4])
{
	output_duty[0] = 69;
	return CONTROL_SUCCESS;
}
