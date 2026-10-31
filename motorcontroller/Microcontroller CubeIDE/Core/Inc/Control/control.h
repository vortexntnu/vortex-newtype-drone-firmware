#ifndef EXAMPLE_H_
#define EXAMPLE_H_

#include <stdint.h>
#include <Interface/Bridge.h>
#include <Embedded/Debug.h>

typedef enum
{
	SUCCESS,
	FAILED_TO_INITIALIZE,
} CONTROL_ERROR_CODE;

// Kjøres én gang under oppstart
CONTROL_ERROR_CODE control_init();


// Kjøres hver gang vi får ny wrench melding
CONTROL_ERROR_CODE control_allocate_thrust(float wrench[6], float output_thrust[8]);

// Kjøres med en bestemt frekvens
CONTROL_ERROR_CODE control_regulator_step(float deltaSeconds, ThrusterMeasurements* measurements, float reference_thrust[4], int16_t output_throttle[4]);


#endif
