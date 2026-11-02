#ifndef EXAMPLE_H_
#define EXAMPLE_H_

#include <bridge.h>
#include <debug.h>
#include <stdint.h>

typedef enum
{
	SUCCESS,
	FAILED_TO_INITIALIZE,
} ControlErrorCode;

typedef struct{
	float max_thrust_forward[8];
	float max_thrust_reverse[8];
	float current_draw_at_max[8];
	BmsMeasurement bms_measurements[2];
} AllocatorParams;

// Kjøres én gang under oppstart
ControlErrorCode control_init();


// Kjøres hver gang vi får ny wrench melding
// output thrust muteres
ControlErrorCode control_allocate_thrust(float wrench[6], AllocatorParams allocator_parameters, float output_thrust[8]);

// Kjøres med en bestemt frekvens
// output duty er tall fra -1 til 1
ControlErrorCode control_regulator_step(float delta_seconds, ThrusterMeasurementSet* measurements, float reference_thrust[4], float reference_erpm[4], float output_duty[4]);


#endif
