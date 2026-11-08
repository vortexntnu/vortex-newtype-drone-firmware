#include <debug.h>
#include <weight.h>
#include <converter.h>

extern SPI_HandleTypeDef hspi1;
extern SPI_HandleTypeDef hspi3;


#define LOAD_CHANNEL_COUNT 2
#define RAW_READING_HISTORY_LENGTH 10

typedef struct {
	SPI_HandleTypeDef *hspi;
	int32_t tare;
	int32_t scale;
	int32_t raw_readings[RAW_READING_HISTORY_LENGTH];
} LoadChannel;


LoadChannel LoadChannels[LOAD_CHANNEL_COUNT] = {
	{ .hspi = &hspi1, .tare = -113658, .scale = 211 },
	{ .hspi = &hspi3, .tare = -113658, .scale = 211 }
};

//


static void append_raw_reading(LoadChannel *Channel, int32_t raw_reading)
{
	for (uint8_t i = RAW_READING_HISTORY_LENGTH - 1; i > 0; i--)
	{
		Channel->raw_readings[i] = Channel->raw_readings[i - 1];
	}

	Channel->raw_readings[0] = raw_reading;
}

static int32_t fetch_weight(LoadChannel *Channel)
{
	uint32_t raw = 0;

	bool success = HAL_SPI_Receive(Channel->hspi, (uint8_t*)&raw, 1, 10) == HAL_OK;
	if (!success) return false;

	int32_t shifted = (int32_t)(raw << 7) >> 8;
	int32_t zeroed = shifted - Channel->tare;
	int32_t weight = zeroed / Channel->scale;

	append_raw_reading(Channel, shifted);

	return weight;
}
// 1272g 0
// 268500
bool weight_read(int32_t *output)
{
	for (uint8_t i = 0; i < LOAD_CHANNEL_COUNT; i++)
	{
		int32_t weight = fetch_weight(&LoadChannels[i]);
		output[i] = weight;
	}

	return true;
}

bool weight_tare(uint8_t channel)
{
	LoadChannel *Channel = &LoadChannels[channel];
	int32_t sum = 0;

	for (int32_t i = 0; i < RAW_READING_HISTORY_LENGTH; i++)
	{
		sum += Channel->raw_readings[i];
	}

	int32_t average = sum / RAW_READING_HISTORY_LENGTH;
	Channel->tare = average;

	return true;
}

bool weight_tareall()
{
	for (uint8_t i = 0; i < LOAD_CHANNEL_COUNT; i++)
	{
		weight_tare(i);
	}
	return true;
}
