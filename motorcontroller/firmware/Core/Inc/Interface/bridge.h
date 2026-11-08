#ifndef BRIDGE_H_
#define BRIDGE_H_


#include <stdbool.h>
#include <stdint.h>


typedef struct {
	float eRPM;
	float current;
	float voltage;
	float temp;
	float consumption;
} ThrusterMeasurement;

typedef struct {
	float total_current_draw;
	float common_voltage;
	float total_consumption;
	ThrusterMeasurement thruster_measurements[4];
} ThrusterMeasurementSet;

typedef struct {
	float voltage;
	float current_draw;
	float esc_current_draw;
	float other_current_draw;;
} BmsMeasurement;

float bridge_lookup_eRPM(float thrust);

/* Signed thrust (N) and ESC voltage (V) to normalized duty [-1, 1].
   Returns false when calibration data cannot produce a valid result. */
bool bridge_lookup_duty(float thrust_force, float voltage, float *duty);

// Convert normalized duty to the 11-bit DShot throttle field for an ESC
bool bridge_duty_to_dshot(float duty, uint16_t *throttle);

float bridge_lookup_thrust(float esc_voltage, float duty);

float bridge_lookup_max_thrust(float esc_voltage, bool direction);

float bridge_calculate_esc_voltage(float esc_current_draw, float other_current_draw);

#endif
