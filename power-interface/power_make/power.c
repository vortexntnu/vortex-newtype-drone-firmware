#include "main.h"
#include "can.h"
#include "power.h"
#include "spi.h"
#include "sdcard.h"

enum canide
{
	CAN_PING,
	CAN_PONG,
};
int canids[] =
{
	[CAN_PING] = 0x080,
	[CAN_PONG] = 0x081,
};
enum sendide
{
	CAN_SEND_PING,
	CAN_SEND_PONG,
	CAN_SEND_ERR,
};
int sendids[] =
{
	[CAN_SEND_PING] = 0x084,
	[CAN_SEND_PONG] = 0x085,
	[CAN_SEND_ERR] = 0x086,
};

uint8_t cansbuf[8];

int power_can_senderror(uint32_t code)
{
	((uint32_t*)cansbuf)[0] = 0xefbeadde; // deadbeef
	((uint32_t*)cansbuf)[1] = code;
	can_senddata(1, cansbuf, 8, sendids[CAN_SEND_ERR]);
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
	can_senddata(caninst, cansbuf, 8, sendids[CAN_SEND_PONG]);
	return 0;
}

uint8_t canrbuf[8];
uint8_t spibuf[8];
int power_can_rping(int caninst)
{
//	spi_slave_recv(8); // this is currently not init
	((uint32_t*)spibuf)[0] = 0xadde;
	spi_master_send((char*)spibuf, 8);
	power_can_spong(caninst, 0x42);
	return 0;
}

int (*canrfns[])(int caninst) =
{
	[CAN_PING] = power_can_rping,
};

int power_can_recvdcallback(void* canhan)
{
	int type = -1;
	char size = 0;
	int id = 0;
	can_getdata(1 + (canhan == pcanhan2), canrbuf, &size, &id);
	for(unsigned long i = 0; i < sizeof(canids)/sizeof(canids[0]); ++i)
	{
		if(canids[i] == id)
		{
			type = i;
			break;
		}
	}
	if(!~id)
	{
		power_can_senderror(0x42);
		return 0;
	}
	canrfns[type](1 + (canhan == pcanhan2));
	return 0;
}

int power_can_sentcallback(void* unused)
{
//	power_can_senderror(0x67);
	return 0;
}

int power_can_errcallback(void* unused)
{
	power_can_senderror(0xf35);
	return 0;
}

int power_spi_slavecallback(void* unused)
{
	int* c = (int*)spi_slave_getgata();
	power_can_spong(1, c[0]);

	return 0;
}

int power_spi_mastercallback(void* unused)
{
	power_can_spong(1, 0x32);
	sdcard_do();

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
	uint32_t stick = *(uint32_t*)stock;
	power_can_spong(1, stick);
	return 0;
}
