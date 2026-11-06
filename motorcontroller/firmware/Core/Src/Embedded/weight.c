#include <debug.h>
#include <weight.h>
#include <converter.h>

extern SPI_HandleTypeDef hspi1;
extern SPI_HandleTypeDef hspi2;

typedef struct {
	SPI_HandleTypeDef *hspi;
	int32_t tare;
	int32_t scale;
	int32_t raw_readings[10];
} LoadChannel;

#define LOAD_CHANNEL_COUNT 1

LoadChannel LoadChannels[LOAD_CHANNEL_COUNT] = {
	{ .hspi = &hspi1, .tare = -113300, .scale = 1 }
//	{ .hspi = hspi2 }
};


//


static void append_raw_reading(LoadChannel *Channel, uint32_t raw_reading)
{
	for (uint8_t i = sizeof(Channel->raw_readings) - 2; i > 0; i--)
	{
		Channel->raw_readings[i] = Channel->raw_readings[i + 1];
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

bool weight_read(int32_t *output)
{
	for (uint8_t i = 0; i < LOAD_CHANNEL_COUNT; i++)
	{
		int32_t weight = fetch_weight(&LoadChannels[i]);
		*output = weight;
	}

	return true;
}

bool weight_tare(uint8_t channel)
{
	LoadChannel *Channel = &LoadChannels[channel];
	int32_t count = sizeof(Channel->raw_readings);
	int32_t sum = 0;

	for (int32_t i = 0; i < count; i ++)
	{
		sum += Channel->raw_readings[i];
	}

	int32_t average = sum / count;

	char string[11];
	converter_int_to_string(string, average);
	debug_print("Average: %", string);

	return true;
}

bool weight_tareall()
{

	return true;
}
