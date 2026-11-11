#include "main.h"
#include "can.h"
#include "power.h"
#include "spi.h"
#include "sdcard.h"
#include "indicator.h"

enum canide
{
	CAN_ID_BASE = 0x080,
	CAN_PING = 0x080,
	CAN_PONG = 0x081,
	CAN_IND_LIGHT = 0x082,
	CAN_ID_END,
};
enum sendide
{
	CAN_SEND_PING = 0x084,
	CAN_SEND_PONG = 0x085,
	CAN_SEND_ERR = 0x086,
};

uint8_t cansbuf[8];

int power_can_senderror(uint32_t code)
{
	((uint32_t*)cansbuf)[0] = 0xefbeadde; // deadbeef
	((uint32_t*)cansbuf)[1] = code;
	can_senddata(1, cansbuf, 8, CAN_SEND_ERR);
//	err(2);
	return 1;
}
int pingc = 0;
int power_can_spong(int caninst, int code)
{
	++pingc;
	((uint32_t*)cansbuf)[0] = 0xefbeafde; // deafbeef;
	((uint16_t*)cansbuf)[2] = pingc;
	((uint16_t*)cansbuf)[3] = code;
	can_senddata(caninst, cansbuf, 8, CAN_SEND_PONG);
	return 0;
}

uint8_t canrbuf[8];
uint8_t spibuf[8];
int power_can_rping(int caninst)
{
	((uint32_t*)spibuf)[0] = 0xadde;
	spi_sdm_send((char*)spibuf, 8);
	power_can_spong(caninst, 0x42);
	return 0;
}

int power_can_ind_send(int caninst)
{
	uint8_t r = canrbuf[0], g = canrbuf[1], b = canrbuf[2];
	indicator_send(r, g, b);
	return 0;
}

int (*canrfns[])(int caninst) =
{
	[CAN_PING - CAN_ID_BASE] = power_can_rping,
	[CAN_PONG - CAN_ID_BASE] = NULL,
	[CAN_IND_LIGHT - CAN_ID_BASE] = power_can_ind_send,
};

int power_can_recvdcallback(void* canhan)
{
	char size = 0;
	int id = 0;
	can_getdata(1 + (canhan == pcanhan2), canrbuf, &size, &id);

	if(id < CAN_ID_BASE && id > CAN_ID_END)
	{
		power_can_senderror(0x42);
		return 0;
	}
	if(canrfns[id - CAN_ID_BASE])
		canrfns[id - CAN_ID_BASE](1 + (canhan == pcanhan2));
	return 0;
}

int power_can_sentcallback(void* unused)
{
//	power_can_senderror(0x67);
	return 0;
}

int power_can_errcallback(void* unused)
{
	power_can_senderror(0xf35); // does it make sense to send over can when can just errored? // might have been the other can
	return 0;
}

int power_spi_sdmcallback(void* unused)
{
	power_can_spong(1, 0x32);
	sdcard_do();

	return 0;
}

int power_spi_inmcallback(void* unused)
{
//	int* c = (int*)spi_inm_getgata(); // can't do this, as not implemented, as not needed, as indicator lights are send-only;
	indicator_send_done();
	power_can_spong(1, 0x43);// c[0]);

	return 0;
}

int power_spi_errcallback(void* unused)
{
	power_can_spong(1, 0x12);

	return 0;
}

// this function runs automatically once in a while
int power_stick_callback(void* stock)
{
	++*(uint32_t*)stock;
	uint32_t stick = *(uint32_t*)stock;
	power_can_spong(1, stick);
	return 0;
}
