#ifndef EXAMPLE_H_
#define EXAMPLE_H_

#include <stdint.h>
#include <Embedded/Debug.h>

typedef enum
{
	SUCCESS,
	FAILED_TO_INITIALIZE,
} ControlErrorCode;

// Kjøres én gang under oppstart
ControlErrorCode control_init();


// Kjøres hver gang vi får ny wrench melding
ControlErrorCode control_allocate_thrust(float wrench[6]);

// Kjøres med en bestemt frekvens
ControlErrorCode control_regulator_step(float deltaSeconds, ThrusterMeasurements* measurements, int16_t output_throttle[4]);


#endif
