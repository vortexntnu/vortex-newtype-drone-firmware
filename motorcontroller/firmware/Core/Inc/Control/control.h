#ifndef EXAMPLE_H_
#define EXAMPLE_H_

#include <debug.h>
#include <stdint.h>
#include <Interface/bridge.h>

typedef enum
{
	SUCCESS,
	FAILED_TO_INITIALIZE,
} ControlErrorCode;

typedef struct{
	float max_thrust_forward[8];
	float max_thrust_bakwards[8];
	float current_draw_at_max[8];
	BmsMeasurement bms_measurements[2];
} AllocatorParams;

// Kjøres én gang under oppstart
ControlErrorCode control_init();


// Kjøres hver gang vi får ny wrench melding
// allocator parameters og output thrust muteres
ControlErrorCode control_allocate_thrust(float wrench[6], AllocatorParams allocator_parameters, float output_thrust[8]);

// Kjøres med en bestemt frekvens
// output duty er tall fra -1 til 1
ControlErrorCode control_regulator_step(float deltaSeconds, ThrusterMeasurements* measurements, float reference_eRPM[4] , float output_duty[4]);


#endif
