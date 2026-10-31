#ifndef BRIDGE_H_
#define BRIDGE_H_


//


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


//


float bridge_lookup_eRPM(float thrust);

int16_t bridge_lookup_DShot(float thrust_force, float voltage);

float bridge_lookup_max_thrust(float voltage, bool direction);

#endif
