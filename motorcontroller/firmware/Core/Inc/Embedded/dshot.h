#ifndef DSHOT_H_
#define DSHOT_H_

#include <stdbool.h>

#define DSHOT_BIT_COUNT 16
#define DSHOT_CHANNEL_COUNT 4

typedef struct {
	TIM_HandleTypeDef *htim;
	uint16_t 		   buffer[DSHOT_BIT_COUNT + 1];
	uint16_t		   channel;
	uint16_t		   throttle;
	bool			   telemetry;
	volatile bool	   busy;
} DShotChannel;


//


void dshot_set_duty(uint16_t duty, bool telemetry);
void dshot_update();
void dshot_init();

#endif
