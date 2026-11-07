#include "Control/control.h"

#include <math.h>
#include <stddef.h>

/* TODO: Replace with tuned gains. Zero disables PI correction for now. */
static const float REGULATOR_KP = 0.0f;
static const float REGULATOR_KI = 0.0f;


ControlStatus control_init()
{
	debug_print("Thrust allocation initialization");
	return CONTROL_SUCCESS;
}

AllocatorStatus control_allocate_thrust(float wrench[6], AllocatorParams allocator_parameters,
		const float previous_forces[8], float output_thrust[8])
{
	if (wrench == NULL || output_thrust == NULL) {
		return THRUST_ALLOCATOR_INVALID_INPUT;
	}

	AllocatorInputs inputs = {0};
	for (int i = 0; i < 6; ++i) {
		inputs.tau[i] = wrench[i];
	}
	for (int i = 0; i < 8; ++i) {
		float forward_max = allocator_parameters.max_thrust_forward[i];
		float reverse_max = allocator_parameters.max_thrust_reverse[i];
		if (forward_max < 0.0f || reverse_max < 0.0f) {
			return THRUST_ALLOCATOR_INVALID_INPUT;
		}
		/* Reverse thrust is negative. Both maximum magnitudes above are positive. */
		inputs.lower_force_bound[i] = -reverse_max;
		inputs.upper_force_bound[i] = forward_max;
		double initial = previous_forces != NULL ? previous_forces[i] : 0.0;
		if (!isfinite(initial)) {
			return THRUST_ALLOCATOR_INVALID_INPUT;
		}

		//Might be unecessary if we use constant bounds
		if (initial < inputs.lower_force_bound[i]) initial = inputs.lower_force_bound[i];
		if (initial > inputs.upper_force_bound[i]) initial = inputs.upper_force_bound[i];
		inputs.x0[i] = initial;
	}

	double forces[8];
	double cost;
	AllocatorStatus status = thrust_allocator_solve(&inputs, forces, &cost);
	if (status != THRUST_ALLOCATOR_OK) {
		return status;
	}
	for (int i = 0; i < 8; ++i) {
		output_thrust[i] = (float)forces[i];
	}
	return THRUST_ALLOCATOR_OK;
}

void control_regulator_reset(ControlRegulator *regulator)
{
	if (regulator == NULL) {
		return;
	}
	for (int i = 0; i < 4; ++i) {
		regulator->integral[i] = 0.0f;
	}
}

static float clamp_duty(float value)
{
	if (value > 1.0f) return 1.0f;
	if (value < -1.0f) return -1.0f;
	return value;
}

ControlStatus control_regulator_step(ControlRegulator *regulator, float delta_seconds,
		const ThrusterMeasurementSet *measurements, const float reference_thrust[4],
		const float reference_erpm[4], float output_duty[4])
{
	if (output_duty != NULL) {
		for (int i = 0; i < 4; ++i) {
			output_duty[i] = 0.0f;
		}
	}
	if (regulator == NULL || measurements == NULL || reference_thrust == NULL ||
		reference_erpm == NULL || output_duty == NULL ||
		!isfinite(delta_seconds) || delta_seconds <= 0.0f ||
		!isfinite(measurements->common_voltage) || measurements->common_voltage <= 0.0f) {
		return CONTROL_INVALID_INPUT;
	}
	float next_integral[4];
	float next_duty[4];
	for (int i = 0; i < 4; ++i) {
		float measured_erpm = measurements->thruster_measurements[i].eRPM;
		if (!isfinite(reference_thrust[i]) || !isfinite(reference_erpm[i]) ||
			!isfinite(measured_erpm) || !isfinite(regulator->integral[i])) {
			return CONTROL_INVALID_INPUT;
		}

		float feedforward;
		if (!bridge_lookup_duty(reference_thrust[i],
			measurements->common_voltage, &feedforward) ||
			!isfinite(feedforward) || feedforward < -1.0f || feedforward > 1.0f) {
			return CONTROL_LOOKUP_FAILED;
		}

		float error = reference_erpm[i] - measured_erpm;
		float proportional = REGULATOR_KP * error;
		float integral = regulator->integral[i] + REGULATOR_KI * error * delta_seconds;
		float raw_duty = feedforward + proportional + integral;
		if (!isfinite(raw_duty) || !isfinite(integral)) {
			return CONTROL_INVALID_INPUT;
		}

		/*Integrator windup: clamping*/
		if ((raw_duty > 1.0f && error > 0.0f) ||
			(raw_duty < -1.0f && error < 0.0f)) {
			integral = regulator->integral[i];
			raw_duty = feedforward + proportional + integral;
		}
		if (!isfinite(raw_duty)) {
			return CONTROL_INVALID_INPUT;
		}
		next_integral[i] = integral;
		next_duty[i] = clamp_duty(raw_duty);
	}

	for (int i = 0; i < 4; ++i) {
		regulator->integral[i] = next_integral[i];
		output_duty[i] = next_duty[i];
	}
	return CONTROL_SUCCESS;
}
