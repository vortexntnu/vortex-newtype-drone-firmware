#ifndef EXAMPLE_H_
#define EXAMPLE_H_

#include <stdint.h>

typedef enum
{
	SUCCESS,
	FAILED_TO_INITIALIZE,
} CONTROL_ERROR_CODE;

typedef struct {
	float eRPM;
	float current;
	float voltage;
	float temp;
} ThrusterMeasurement;

typedef struct {
	float total_current_draw;
	float common_voltage;
	float total_consumption;
	ThrusterMeasurement thruster_measurements[4];
} ThrusterMeasurements;



#include <Embedded/Debug.h>

// Kjøres en gang under oppstart
CONTROL_ERROR_CODE Control_Init();


// Kjøres hver gang vi får ny wrench melding
CONTROL_ERROR_CODE control_allocate_thrust(float wrench[6], float output_thrust[8]);

// Kjøres med en bestemt frekvens
CONTROL_ERROR_CODE control_regulator_step(float deltaSeconds, ThrusterMeasurements* measurements, float reference_thrust[4], int16_t output_throttle[4]);


#endif
