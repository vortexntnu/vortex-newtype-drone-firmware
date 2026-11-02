#include <stdbool.h>
#include <stdint.h>
#include "main.h"

extern TIM_HandleTypeDef htim1;

static uint16_t BIT0, BIT1;

static DShotChannel channels[DSHOT_CHANNEL_COUNT] = {
	{ .htim = &htim1, .channel = TIM_CHANNEL_1 },
};


//


void dshot_init()
{
	uint16_t period = __HAL_TIM_GET_AUTORELOAD(&htim1) + 1;  // 107 ved ARR = 106
	BIT0 = (period * 3 + 4) / 8;   // 40
	BIT1 = (period * 3 + 2) / 4;   // 80
}

uint16_t dshot_calculate_checksum(uint16_t data)
{
	uint16_t shift4 = data >> 4;
	uint16_t shift8 = data >> 8;
	uint16_t combined = data ^ shift4 ^ shift8;

	return combined & 0xF;
}

uint16_t dshot_calculate_packet(uint16_t throttle, bool telemetry)
{
	uint16_t data = (throttle << 1) | (telemetry ? 1 : 0);
	uint16_t packet = (data << 4) | dshot_calculate_checksum(data);

	return packet;
}

void dshot_write_to_buffer(DShotChannel* Channel, uint16_t packet)
{
	for (int i = 0; i < DSHOT_BIT_COUNT; i++)
	{
		bool is_one = (packet & 0x8000) != 0;
		Channel->buffer[i] = is_one ? BIT1 : BIT0;
		packet <<= 1;
	}
	Channel->buffer[DSHOT_BIT_COUNT] = 0; // Make sure it'll end low no matter what disturbs the buffer
}

void dshot_send_packet(DShotChannel* Channel, uint16_t throttle, bool telemetry)
{
    uint16_t packet = dshot_calculate_packet(throttle, telemetry);

    dshot_write_to_buffer(Channel, packet);
    HAL_TIM_PWM_Start_DMA(Channel->htim, Channel->channel, (uint32_t*)Channel->buffer, DSHOT_BIT_COUNT + 1);
}

void HAL_TIM_PWM_PulseFinishedCallback(TIM_HandleTypeDef *htim)
{
    if (htim->Instance != TIM1) return;
	HAL_TIM_PWM_Stop_DMA(htim, TIM_CHANNEL_1);
}


//


void dshot_update()
{
	for (uint8_t i = 0; i < DSHOT_CHANNEL_COUNT; i++)
	{
		DShotChannel* Channel = &channels[i];
		dshot_send_packet(Channel, Channel->throttle, false);
	}
}

void dshot_set_duty(uint16_t throttle, bool telemetry)
{
	DShotChannel* Channel = &channels[0];
	Channel->throttle = throttle;
}
