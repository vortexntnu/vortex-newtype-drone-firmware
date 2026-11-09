#include <Embedded/dshot.h>

extern TIM_HandleTypeDef htim1;

static DShotChannel channels[DSHOT_CHANNEL_COUNT] = {
	{ .htim = &htim1, .channel = TIM_CHANNEL_1, .telemetry = false },
//	{ .htim = &htim1, .channel = TIM_CHANNEL_2 },
//	{ .htim = &htim1, .channel = TIM_CHANNEL_3 },
//	{ .htim = &htim1, .channel = TIM_CHANNEL_4 },
};


// Statics


static uint16_t calculate_checksum(uint16_t data)
{
	uint16_t shift4 = data >> 4;
	uint16_t shift8 = data >> 8;
	uint16_t combined = data ^ shift4 ^ shift8;

	return combined & 0xF;
}

static uint16_t calculate_packet(uint16_t throttle, bool telemetry)
{
	uint16_t data = (throttle << 1) | (telemetry ? 1 : 0);
	uint16_t packet = (data << 4) | calculate_checksum(data);

	return packet;
}

static void write_to_buffer(DShotChannel* Channel, uint16_t packet)
{
	for (int i = 0; i < DSHOT_BIT_COUNT; i++)
	{
		bool is_one = (packet & 0x8000) != 0;
		Channel->buffer[i] = is_one ? Channel->BIT1 : Channel->BIT0;
		packet <<= 1;
	}
	Channel->buffer[DSHOT_BIT_COUNT] = 0; // Make sure it'll end low no matter what disturbs the buffer
}

static void send_packet(DShotChannel *Channel)
{
	if (Channel->hdma->State != HAL_DMA_STATE_READY) return;

    uint16_t packet = calculate_packet(Channel->throttle, Channel->telemetry);

    write_to_buffer(Channel, packet);

    HAL_DMA_Start_IT(
    		Channel->hdma,
			(uint32_t)Channel->buffer,
			(uint32_t)Channel->capture_compare_register,
			DSHOT_BIT_COUNT + 1);

	__HAL_TIM_ENABLE_DMA(Channel->htim, Channel->dma_source);
}


// STM32 callbacks


static void dma_finished(DMA_HandleTypeDef *hdma)
{
	for (uint8_t i = 0; i < DSHOT_CHANNEL_COUNT; i++)
	{
		DShotChannel *Channel = &channels[i];
		if (Channel->hdma != hdma) continue;

		__HAL_TIM_DISABLE_DMA(Channel->htim, Channel->dma_source);
		break;
	}
}


// External interface


void dshot_init()
{
	for (uint8_t i = 0; i < DSHOT_CHANNEL_COUNT; i++)
	{
		DShotChannel* Channel = &channels[i];
		uint16_t period = __HAL_TIM_GET_AUTORELOAD(Channel->htim) + 1; // 107 ved ARR = 106

		Channel->BIT0 = (period * 3 + 4) / 8;   // 40
		Channel->BIT1 = (period * 3 + 2) / 4;   // 80

		uint32_t index = Channel->channel >> 2;
		Channel->hdma = Channel->htim->hdma[TIM_DMA_ID_CC1 + index];
		Channel->dma_source = TIM_DMA_CC1 << index;
		Channel->capture_compare_register = &Channel->htim->Instance->CCR1 + index;

		Channel->hdma->XferCpltCallback = dma_finished;

		__HAL_TIM_SET_COMPARE(Channel->htim, Channel->channel, 0); // Check this
		HAL_TIM_PWM_Start(Channel->htim, Channel->channel);
	}
}

void dshot_update()
{
	for (uint8_t i = 0; i < DSHOT_CHANNEL_COUNT; i++)
	{
		send_packet(&channels[i]);
	}
}

void dshot_set_throttle(uint8_t channel, uint16_t throttle)
{
	if (channel >= DSHOT_CHANNEL_COUNT) return;
	channels[channel].throttle = throttle;
}

void dshot_set_telemetry(uint8_t channel, bool telemetry)
{
	if (channel >= DSHOT_CHANNEL_COUNT) return;
	channels[channel].telemetry = telemetry;
}

DShotChannel *dshot_get_channel(uint8_t channel)
{
//	if (channel >= DSHOT_CHANNEL_COUNT) return;
	return &channels[channel];
}
