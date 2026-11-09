#ifndef DSHOT_H_
#define DSHOT_H_

#include <Embedded/debug.h>
#include <stdbool.h>
#include <stdint.h>
#include <main.h>

#define DSHOT_BIT_COUNT 16
#define DSHOT_CHANNEL_COUNT 1

typedef struct {
	TIM_HandleTypeDef *htim;

	uint16_t BIT0;
	uint16_t BIT1;

	uint16_t buffer[DSHOT_BIT_COUNT + 1];
	uint32_t channel;
	uint16_t throttle;

	DMA_HandleTypeDef *hdma;
	uint32_t dma_source;
	volatile uint32_t *capture_compare_register;

	bool telemetry;
} DShotChannel;


//


void dshot_set_throttle(uint8_t channel, uint16_t duty);
void dshot_set_telemetry(uint8_t channel, bool telemetry);
DShotChannel *dshot_get_channel(uint8_t channel);
void dshot_update();
void dshot_init();

#endif
