#ifndef CONTROL_H_
#define CONTROL_H_

#include "Interface/bridge.h"
#include "Embedded/debug.h"
#include "Control/thrust_allocator.h"
#include <stdbool.h>
#include <stdint.h>

typedef enum
{
	CONTROL_SUCCESS,
	CONTROL_FAILED_TO_INITIALIZE,
	CONTROL_INVALID_INPUT,
	CONTROL_LOOKUP_FAILED,
} ControlStatus;

typedef struct {
	float integral[4];
} ControlRegulator;

typedef struct{
	/* Nonnegative force limits in N*/
	float max_thrust_forward[8];
	float max_thrust_reverse[8];

	float current_draw_at_max[8]; // Ampere
	BmsMeasurement bms_measurements[2];
} AllocatorParams;

// Called once during startup.
ControlStatus control_init();


/* Pass previous_forces from the last successful call to warm-start the solver,
   NULL on the first call. output_thrust is written only on success.
 */
AllocatorStatus control_allocate_thrust(float wrench[6], AllocatorParams allocator_parameters,
		const float previous_forces[8], float output_thrust[8]);

/* Reset the PI state when disarmed or before the first control step. */
void control_regulator_reset(ControlRegulator *regulator);

/* Run at a fixed period.
   Measurements and references use the same eRPM sign convention.
   On failure output_duty is zeroed and regulator state is unchanged.
 */
ControlStatus control_regulator_step(ControlRegulator *regulator, float delta_seconds,
		const ThrusterMeasurementSet *measurements, const float reference_thrust[4],
		const float reference_erpm[4], float output_duty[4]);


#endif
