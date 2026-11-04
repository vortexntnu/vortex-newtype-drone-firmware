#include <stdint.h>

#include <stm32c5xx_hal_gpio.h>

#include "spi.h"
#include "sdcard.h"

// debug mostly
#include "power.h"

#define CSHI HAL_GPIO_WritePin(HAL_GPIOC, HAL_GPIO_PIN_9, HAL_GPIO_PIN_SET)
#define CSLO HAL_GPIO_WritePin(HAL_GPIOC, HAL_GPIO_PIN_9, HAL_GPIO_PIN_RESET)

int sdcard_startup(void);
int sdcard_startup_val(void);
int sdcard_cmd0(void);
int sdcard_cmd0_val(void);
int sdcard_cmd8(void);
int sdcard_cmd8_val(void);
int sdcard_cmd55(void);
int sdcard_cmd55_val(void);
int sdcard_cmd58(void);
int sdcard_cmd58_val(void);
int sdcard_cmd24(void);
int sdcard_cmd24_val(void);

int sdcard_acmd41(void);
int sdcard_acmd41_val(void);

int sdcard_senddata(void);
int sdcard_senddata_val(void);
int sdcard_wait_busy(void);
int sdcard_wait_busy_val(void);

int state = 0;
enum SDCARD_FNS
{
	SDCARD_STARTUP,
	SDCARD_STARTUP_VAL,
	SDCARD_CMD0,
	SDCARD_CMD0_VAL,
	SDCARD_CMD8,
	SDCARD_CMD8_VAL,
	SDCARD_CMD55,
	SDCARD_CMD55_VAL,
	SDCARD_CMD58,
	SDCARD_CMD58_VAL,
	SDCARD_CMD24,
	SDCARD_CMD24_VAL,

	SDCARD_ACMD41,
	SDCARD_ACMD41_VAL,

	SDCARD_SENDDATA,
	SDCARD_SENDDATA_VAL,
	SDCARD_WAIT_BUSY,
	SDCARD_WAIT_BUSY_VAL,
};
int (*sdcard_fns[])(void) =
{
	sdcard_startup,
	sdcard_startup_val,
	sdcard_cmd0,
	sdcard_cmd0_val,
	sdcard_cmd8,
	sdcard_cmd8_val,
	sdcard_cmd55,
	sdcard_cmd55_val,
	sdcard_cmd58,
	sdcard_cmd58_val,
	sdcard_cmd24,
	sdcard_cmd24_val,

	sdcard_acmd41,
	sdcard_acmd41_val,

	sdcard_senddata,
	sdcard_senddata_val,
	sdcard_wait_busy,
	sdcard_wait_busy_val,
};

char sd_response[0x400];

int waitbytes = 0;
int waitstate = 0;
int sdcard_wait() // wait for response
{
	CSLO;
	char dummy = 0xff;
	spi_sdm_send(&dummy, 1);
	return 2;
}
int sdcard_waited() // if we haven't got real data, wait some more
{
	uint8_t data = spi_sdm_getdata()[0];
	power_can_spong(1, data);
	if(data == 0xff)
		return sdcard_wait();
	sd_response[0] = data;
	--waitbytes;
	if(!waitbytes)
	{
		waitstate = 0;
		return sdcard_do();
	}
	char dummies[waitbytes];
	spi_sdm_send(dummies, waitbytes); // wait for long response
	return 3;
}
int sdcard_done_waiting() // if the response is long, get it
{
	char* data = spi_sdm_getdata();
	for(int i = 0; i < waitbytes; ++i)
	{
		sd_response[i + 1] = data[i];
	}
	waitbytes = 0;
	CSHI;
	char dummy = 0xff;
	spi_sdm_send(&dummy, 1); // clocks after transmission
	return 4;
}
int sdcard_waited_more() // waited for dummy clocks after transmission
{
	sdcard_do();
	return 0;
}

char* response;
int sdcard_do(void)
{
//	power_can_spong(1, waitstate);
	if(waitstate == 1)
		return waitstate = sdcard_wait();
	if(waitstate == 2)
		return waitstate = sdcard_waited();
	if(waitstate == 3)
		return waitstate = sdcard_done_waiting();
	if(waitstate == 4)
		return waitstate = sdcard_waited_more();
	if(!~state)
		power_can_spong(1, 0x789);
	state = sdcard_fns[state]();
	return 0;
}
int sdcard_startup(void)
{
	CSHI;
	// has to be at least 74 bits, so 10 bytes, so 16 for good measure
	uint8_t dummies[16];
	for(int i = 0; i < 4; ++i)
	{
		((uint32_t*)dummies)[i] = 0xffffffff;
	}
	spi_sdm_send((char*)dummies, 16);
	return SDCARD_STARTUP_VAL;
}
int sdcard_startup_val(void)
{
	// nothing to validate
	return sdcard_cmd0();
}

int sdcard_command(uint8_t b0, uint8_t b1, uint8_t b2, uint8_t b3, uint8_t b4, uint8_t b5, int rlen)
{
	CSLO;
	uint8_t seq[] =
	{
		0x40 | b0, b1, b2, b3, b4, b5,
	};
	waitstate = 1;
	waitbytes = rlen;
	return spi_sdm_send((char*)seq, 6);
}

// from section 7.3.2.1 of the sd card spec
#define SPI_IN_IDLE_STATE 0x01

int sdcard_cmd0(void)
{
	sdcard_command(0, 0x00, 0x00, 0x00, 0x00, 0x95, 1); // command, from sec 7.2.2
	return SDCARD_CMD0_VAL;
}
int sdcard_cmd0_val(void)
{
	power_can_spong(1, 0x63);
	if(sd_response[0] == SPI_IN_IDLE_STATE)
	{
		return sdcard_cmd8();
	}
	power_can_spong(1, 0x123);
	return SDCARD_CMD0_VAL;
}

int sdcard_cmd8(void)
{
	// r7 is 5 bytes
	sdcard_command(8, 0x00, 0x00, 0x01, 0xAA, 0x87, 5); // apparently this also needs the crc, got this from some example
	return SDCARD_CMD8_VAL;
}
int acmdstate = 0;
int sdcard_cmd8_val(void)
{
	CSLO;
	uint8_t check = sd_response[4];
	if(check != 0xaa)
	{
		power_can_spong(1, 0x45);
	}
	uint8_t vrange = sd_response[3] & 0xf;
	if(vrange != 0x01) // 2.7-3.6, section 4.9.6
	{
		power_can_spong(1, 0x46);
	}
	acmdstate = SDCARD_ACMD41;
	return sdcard_cmd55();
}
int sdcard_cmd55(void)
{
	// CMD55, don't need the crc as it is off by default, 1 on the end is stop bit
	// r1 is 1 byte
	sdcard_command(55, 0x00, 0x00, 0x00, 0x00, 0x01, 1);
	return SDCARD_CMD55_VAL;
}
int sdcard_cmd55_val(void)
{
	uint8_t r1 = sd_response[0];
	if(r1 != 0x01) // first bit is idle state, sec 7.3.2.1
	{
		power_can_spong(1, 0x47);
	}
	return sdcard_fns[acmdstate]();
}
int sdcard_acmd41(void)
{
	sdcard_command(41, 0x40, 0x00, 0x00, 0x00, 0x01, 1); // ACMD41, the 1 bit in arg is HCS, high capacity support.
	return SDCARD_ACMD41_VAL;
}
int sdcard_acmd41_val(void)
{
	uint8_t r1 = sd_response[0]; // acmd41 responds with r1, sec 7.3.1.3
	if(r1 != 0x00) // idle bit clear means init is comlete, sec 7.2.1, fig 7-2
	{
		acmdstate = SDCARD_ACMD41;
		return sdcard_cmd55();
	}
	return sdcard_cmd58();
}
int sdcard_cmd58(void)
{
	sdcard_command(0x7a, 0x00, 0x00, 0x00, 0x00, 0x01, 5); // CMD58, only stuff bits
	return SDCARD_CMD58_VAL;
}
uint32_t ocr;
int sdcard_cmd58_val(void)
{
	uint8_t r1 = sd_response[0]; // the r3 response is a r1 with OCR after
	ocr = *(uint32_t*)&sd_response[1];
	if(r1 != 0x00) // no error
	{
		power_can_spong(1, 0x48);
	}
	return -1;
}

uint32_t wraddr = 0;
char* wrdata = NULL;
int sdcard_write_block(uint32_t addr, char* data)
{
	wraddr = addr;
	wrdata = data;
	sdcard_cmd24();

	return 0;
}
int sdcard_cmd24(void)
{
	sdcard_command(24, wraddr >> 24, wraddr >> 16, wraddr >> 8, wraddr, 0x01, 1); // r1 response
	return SDCARD_CMD24_VAL;
}
int sdcard_cmd24_val(void)
{
	uint8_t r1 = sd_response[0]; // response from write is r1
	if(r1)
		power_can_spong(1, 0x49);
	return sdcard_senddata();
}
int sdcard_senddata(void)
{
	CSLO;
	uint8_t starttok = 0xfe; // start of write single or read single or multiple, sec 7.3.3.2
	uint16_t nocrc = 0x0000; // crc is disabled by default, and is not enabled explicitly
	spi_sdm_send((char*)&starttok, 1);
	spi_sdm_send(wrdata, 512);
	spi_sdm_send((char*)&nocrc, 2);
	return SDCARD_SENDDATA_VAL;
}
int sdcard_senddata_val(void)
{
	uint8_t r1 = sd_response[0];
	if(r1)
		power_can_spong(1, 0x4a);
	return sdcard_wait_busy();
}
int sdcard_wait_busy(void)
{
	CSLO;
	uint8_t dummy = 0xff;
	spi_sdm_send((char*)&dummy, 1);
	return SDCARD_WAIT_BUSY_VAL;
}
int sdcard_wait_busy_val(void)
{
	if(sd_response[0])
		return -1;
	return sdcard_wait_busy();
}
