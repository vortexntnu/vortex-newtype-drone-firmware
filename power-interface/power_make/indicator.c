#include <stdint.h>

#include <stm32c5xx_hal_spi.h>

#include "spi.h"

// 144 MHz base clock freq / 7
// gives 20.571428.. MHz clock freq
// gives 0.048611.. us per period
// gives 25.714285.. periods per bit
// gives 617.142857.. bits per message
// and at least 1028.571428.. cycles per break
// or 1645.714285.. bits in total
// or 205.714285.. bytes in total
// so let's round up to 206 since SPI uses whole bytes
// of these, there are some constants:
uint8_t buf[206] =
{
	0xFF, 0x80, 0x00, 0x3F, 0xC0, 0x00, 0x1F, 0xF0,
	0x00, 0x07, 0xFC, 0x00, 0x01, 0xFF, 0x00, 0x00,
	0x7F, 0x80, 0x00, 0x3F, 0xE0, 0x00, 0x0F, 0xF8,
	0x00, 0x03, 0xFC, 0x00, 0x01, 0xFF, 0x00, 0x00,
	0x7F, 0xC0, 0x00, 0x1F, 0xF0, 0x00, 0x07, 0xF8,
	0x00, 0x03, 0xFE, 0x00, 0x00, 0xFF, 0x80, 0x00,
	0x3F, 0xC0, 0x00, 0x1F, 0xF0, 0x00, 0x07, 0xFC,
	0x00, 0x01, 0xFF, 0x00, 0x00, 0x7F, 0x80, 0x00,
	0x3F, 0xE0, 0x00, 0x0F, 0xF8, 0x00, 0x03, 0xFC,
	0x00, 0x01, 0xFF, 0x00, 0x00, 0x00,
};
// there are also some bit-indices and their sizes
// these determine the position of the bit value
// and the number of ones to be written
uint16_t bit_indices[24] =
{
	0x009, 0x022, 0x03C, 0x056, 0x070, 0x089, 0x0A3, 0x0BD,
	0x0D6, 0x0F0, 0x10A, 0x124, 0x13D, 0x157, 0x171, 0x18A,
	0x1A4, 0x1BE, 0x1D8, 0x1F1, 0x20B, 0x225, 0x23E, 0x258,
};
uint8_t sizes[24] =
{
	8, 9, 8, 8, 8, 9, 8, 8,
	9, 8, 8, 8, 9, 8, 8, 9,
	8, 8, 8, 9, 8, 8, 9, 8,
};
// if it is currently sending
int in_transmission = 0;
// if call was made while still sending another
int pending = 0;
uint8_t pending_r = 0, pending_g = 0, pending_b = 0;
// is this neccesary or can I pass NULL to HAL_?
uint8_t recvdummy[206];
int indicator_send(uint8_t r, uint8_t g, uint8_t b)
{
	if(in_transmission)
	{
		pending = 1;
		pending_r = r;
		pending_g = g;
		pending_b = b;
		return 1;
	}
	in_transmission = 1;
	uint32_t v = (g << 16) + (r << 8) + b;
	for(int i = 23; v; v >>= 1, --i)
	{
		for(int j = 0; j < sizes[i]; ++j)
		{
			buf[(bit_indices[i] + j) >> 3] |= (v & 1) << (7 - ((bit_indices[i] + j) & 7)); // big endian bit order
			buf[(bit_indices[i] + j) >> 3] &= ~(!(v & 1) << (7 - ((bit_indices[i] + j) & 7))); // same here
		}
	}
	HAL_SPI_TransmitReceive_IT(pinspim, buf, recvdummy, 206);
	return 0;
}

int indicator_send_done(void)
{
	in_transmission = 0;
	if(pending)
	{
		pending = 0;
		return indicator_send(pending_r, pending_g, pending_b);
	}
	return 0;
}
