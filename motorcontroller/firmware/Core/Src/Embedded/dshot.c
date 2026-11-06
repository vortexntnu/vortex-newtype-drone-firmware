#include <Embedded/dshot.h>

extern TIM_HandleTypeDef htim1;

static DShotChannel channels[DSHOT_CHANNEL_COUNT] = {
	{ .htim = &htim1, .channel = TIM_CHANNEL_1 },
	{ .htim = &htim1, .channel = TIM_CHANNEL_2 },
	{ .htim = &htim1, .channel = TIM_CHANNEL_3 },
	{ .htim = &htim1, .channel = TIM_CHANNEL_4 },
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

static void send_packet(DShotChannel* Channel)
{
	if (Channel->busy) return; // Deadlock if callback isn't called

    uint16_t packet = calculate_packet(Channel->throttle, Channel->telemetry);

    Channel->busy = true;
    write_to_buffer(Channel, packet);

    HAL_StatusTypeDef status = HAL_TIM_PWM_Start_DMA(Channel->htim, Channel->channel, (uint32_t*)Channel->buffer, DSHOT_BIT_COUNT + 1);
    if (status != HAL_OK) {
    	Channel->busy = false;
    }

//    if (status == HAL_ERROR) {
//    	debug_print("Hal error");
//    }
//    if (status == HAL_BUSY) {
//		debug_print("Hal busy");
//        }
//    if (status == HAL_TIMEOUT) {
//		debug_print("Hal timeout");
//	}
}


// STM32 callbacks


void HAL_TIM_PWM_PulseFinishedCallback(TIM_HandleTypeDef *htim)
{
	uint32_t channel;

    switch (htim->Channel) {
    	case HAL_TIM_ACTIVE_CHANNEL_1: channel = TIM_CHANNEL_1; break;
    	case HAL_TIM_ACTIVE_CHANNEL_2: channel = TIM_CHANNEL_2; break;
    	case HAL_TIM_ACTIVE_CHANNEL_3: channel = TIM_CHANNEL_3; break;
    	case HAL_TIM_ACTIVE_CHANNEL_4: channel = TIM_CHANNEL_4; break;
    	default: return;
    }

    HAL_TIM_PWM_Stop_DMA(htim, channel);

    for (int i = 0; i < DSHOT_CHANNEL_COUNT; i++)
    {
    	DShotChannel* Channel = &channels[i];
    	if (Channel->htim != htim) continue;
    	if (Channel->channel != channel) continue;

    	Channel->busy = false;
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
