#ifndef DSHOT_H_
#define DSHOT_H_

#include <Embedded/debug.h>
#include <stdbool.h>
#include <stdint.h>
#include <main.h>

#define DSHOT_BIT_COUNT 16
#define DSHOT_CHANNEL_COUNT 4

typedef struct {
	TIM_HandleTypeDef *htim;

	uint16_t BIT0;
	uint16_t BIT1;

	uint16_t buffer[DSHOT_BIT_COUNT + 1];
	uint16_t channel;
	uint16_t throttle;

	bool		  telemetry;
	volatile bool busy;
} DShotChannel;


//


void dshot_set_throttle(uint8_t channel, uint16_t duty);
void dshot_set_telemetry(uint8_t channel, bool telemetry);
void dshot_update();
void dshot_init();

#endif
