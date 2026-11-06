#include <debug.h>
#include <weight.h>
#include <converter.h>

extern SPI_HandleTypeDef hspi1;


//


bool weight_read(uint8_t cell, int32_t *output)
{
	uint32_t frame = 0;

	if (HAL_SPI_Receive(&hspi1, (uint8_t*)&frame, 1, 10) != HAL_OK) return false;

	*output = (int32_t)(frame << 7) >> 8;
	return true;
}
