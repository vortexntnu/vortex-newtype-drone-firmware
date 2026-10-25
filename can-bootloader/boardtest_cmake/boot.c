/*
 * boot.c
 *
 *  Created on: Sep 26, 2026
 *      Author: elias-gravdal
 */

#include <string.h>

#include "main.h"
#include "can.h"
#include "flash.h"
#include "boot.h"

#define TX_BUFFER_SIZE 8
static uint8_t BufferA[TX_BUFFER_SIZE] = {0x10, 0x32, 0x54, 0x76, 0x98, 0xBA, 0xDC, 0xFE};
//static const uint8_t BufferB[TX_BUFFER_SIZE*2] =
//{0x04, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, 0x99, 0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff};

uint8_t recvbuf[64];

enum canide
{
	BOOT_PING,
	BOOT_INIT,
	BOOT_RESET,
	BOOT_DATA,
};
int canids[] =
{
		[BOOT_PING] = 0x040,
		[BOOT_INIT] = 0x041,
		[BOOT_RESET] = 0x042,
		[BOOT_DATA] = 0x043,
};
enum sendide
{
	BOOT_SEND_PING,
	BOOT_SEND_READY,
	BOOT_SEND_RESEND,
	BOOT_SEND_FINISH,
};
int sendids[] =
{
		[BOOT_SEND_PING] = 0x044,
		[BOOT_SEND_READY] = 0x045,
		[BOOT_SEND_RESEND] = 0x046,
		[BOOT_SEND_FINISH] = 0x047,
};

int boot_can_senderror(uint32_t code)
{
	((uint32_t*)BufferA)[0] = 0xdeadbeef;
	((uint32_t*)BufferA)[1] = code;
	can_senddata(BufferA, 8, sendids[BOOT_SEND_PING]);
	err(2);
	return 1;
}
int boot_can_resendfrom(uint32_t idx)
{
	((uint64_t*)BufferA)[0] = idx;
	can_senddata(BufferA, 8, sendids[BOOT_SEND_RESEND]);
	noerr(2);
	return 0;
}
int boot_can_readyfor(uint32_t idx)
{
	((uint64_t*)BufferA)[0] = idx;
	can_senddata(BufferA, 8, sendids[BOOT_SEND_READY]);
	return 0;
}

// starts at 0, goes to 1 on init, goes to 2 when erase is done, goes to 3 when programming of last address is done;
int bootstate = 0;
// the adress of the second bank (the one we write to);
uint32_t curaddr = 0x8020000;// + (FLASH_SIZE/2);
// set to number of erases on init, decremented by one for every one done;
int erasesleft = 0;

// number of progs, that is, number of prog messages to receive;
int progsleft = 0;


uint16_t lastidx = 0xffff;
int pageidx = 0;
int progcallsleft = 0;
int getsleft = 0;
int getsgot = 0;
char progbuf[0x2026];
int boot_can_recvdcallback(void* unused)
{
	char size = 0;
	int id = 0;
	can_getdata(recvbuf, &size, &id);
	int type = -1;
	for(int i = 0; i < sizeof(canids) / sizeof(canids[0]); ++i)
	{
		if(canids[i] == id)
		{
			type = i;
			break;
		}
	}
	if(!~type)
	{
		boot_can_senderror(0);
		return 1;
	}
	else if(type == BOOT_PING)
	{
		((uint64_t*)BufferA)[0] = ((uint64_t*)recvbuf)[0] + 1;
		can_senddata(BufferA, 8, sendids[BOOT_SEND_PING]);
		noerr(1);
	}
	else if(type == BOOT_INIT)
	{
		if(bootstate)
		{
			boot_can_senderror(1);
			return 1;
		}
		bootstate = 1;

		getsleft = ((int32_t*)recvbuf)[0];
		progsleft = (getsleft*6 + 0x2000 - 6) >> 13;
		progcallsleft = progsleft;
		erasesleft = progsleft;
		flash_erase_addr(curaddr, 0x2000);
	}
	else if(type == BOOT_RESET)
	{
		if(erasesleft)
		{
			boot_can_senderror(2);
			return 1;
		}
		if(bootstate != 2)
		{
			boot_can_senderror(4);
			return 1;
		}
	}
	else if(type == BOOT_DATA)
	{
		if(bootstate != 2)
		{
			boot_can_senderror(3);
			return 1;
		}
		++lastidx;
		uint16_t idx = ((uint16_t*)recvbuf)[3];
		if(idx != lastidx)
		{
			--lastidx;
			boot_can_resendfrom(lastidx);
			return 1;
		}
		memcpy(&progbuf[pageidx], recvbuf, 6);
		--getsleft;
		pageidx += 6;
		if(pageidx >= 0x2000)
		{
			pageidx -= 0x2000;
			flash_prog_addr(curaddr, 0x2000, (uint32_t*)progbuf);
			--progcallsleft;
			curaddr += 0x2000;
		}
		else if(!getsleft)
		{
			for(int i = pageidx; i < 0x2000; ++i)
			{
				progbuf[i] = 0xff;
			}
			flash_prog_addr(curaddr, 0x2000, (uint32_t*)progbuf);
		}
		else
		{
			((uint32_t*)BufferA)[0] = getsleft;
			can_senddata(BufferA, 8, sendids[BOOT_SEND_READY]);
		}
	}
	return 0;
}

int boot_can_sentcallback(void* unused)
{
	if(bootstate == 3)
	{
		noerr(5);
//		bootstate = 0; // not needed, as system reboots anyway
		flash_swap_banks_and_die();
	}
	return 0;
}

/** brief:  This function is executed in case of a data transfer error.
  * param hal_status:  HAL status of the FDCAN TX/RX operations.
  * param FDCAN_error_code:  FDCAN Error Code.
  * retval: example status
  */

int boot_can_errcallback(void* unused)
{
	err(3);
	return 1;//HandleTransferError(0, 0);
}

int erasesdone = 0;
int boot_flash_erasedcallback(void* unused)
{
//	can_senderror(erasesleft + 0xee0000);
//	can_senderror(erasesdone + 0xdd0000);
	++erasesdone;
	--erasesleft;
	if(erasesleft <= 0)
	{
		curaddr = FLASH_BASE + FLASH_SIZE/2;
		bootstate = 2;
		BufferA[0] = erasesdone;
		can_senddata(BufferA, 8, sendids[BOOT_SEND_READY]);
//		noerr(2);
		return 0;
	}
	curaddr += 0x2000;
	flash_erase_addr(curaddr, 0x2000);
	return 0;
}

int boot_flash_progdcallback(void* unused)
{
	memcpy(progbuf, &progbuf[0x2000], 0x26);
	--progsleft;
	if(!progsleft)
	{
		((uint32_t*)BufferA)[0] = getsleft;
		can_senddata(BufferA, 8, sendids[BOOT_SEND_FINISH]);
		bootstate = 3;
		return 0;
	}
	else
	{
		BufferA[0] = 0x67;
		can_senddata(BufferA, 8, sendids[BOOT_SEND_READY]);
	}
//	noerr(1);
//	noerr(*(char*)(FLASH_BASE + FLASH_SIZE - 0x2000));
//	BufferA[0] = *(char*)(FLASH_BASE + FLASH_SIZE - 0x2000);
//	can_senddata(BufferA, 8);
	return 0;
}

int boot_flash_errcallback(void* unused)
{
	err(2);
	return 0;
}
