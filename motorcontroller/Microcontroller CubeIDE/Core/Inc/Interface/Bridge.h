#ifndef BRIDGE_H_
#define BRIDGE_H_


#include <stdbool.h>


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

typedef struct {
	float voltage;
	float current_draw;
	float esc_current_draw;
	float other_current_draw;
} BmsMeasurement;

float bridge_lookup_eRPM(float thrust);

int16_t bridge_lookup_DShot(float thrust_force, float voltage);

float bridge_lookup_max_thrust(float esc_voltage, bool direction);

float bridge_calculate_esc_voltage(float esc_current_draw, float );

#endif
