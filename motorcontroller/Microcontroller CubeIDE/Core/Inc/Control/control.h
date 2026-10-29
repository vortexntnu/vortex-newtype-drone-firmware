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


#endif
