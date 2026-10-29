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
	BOOT_PING = 0x040,
	BOOT_INIT = 0x041,
	BOOT_RESET = 0x042,
	BOOT_DATA = 0x043,
};
enum sendide
{
	BOOT_SEND_PING = 0x044,
	BOOT_SEND_READY = 0x045,
	BOOT_SEND_RESEND = 0x046,
	BOOT_SEND_FINISH = 0x047,
};
int boot_ping(void);
int boot_init(void);
int boot_reset(void);
int boot_data(void);
// subtract base (BOOT_PING) when indexing this
int (*boot_recvfns[])(void) =
{
		boot_ping,
		boot_init,
		boot_reset,
		boot_data,
};

int boot_can_senderror(uint32_t code)
{
	uint32_t errsig = 0xdeadbeef;
	memcpy(BufferA, &errsig, 4);
	memcpy(&BufferA[4], &code, 4);
	can_senddata(BufferA, 8, BOOT_SEND_PING);
	err(2);
	return 1;
}
int boot_can_resendfrom(uint32_t idx)
{
	((uint64_t*)BufferA)[0] = idx;
	can_senddata(BufferA, 8, BOOT_SEND_RESEND);
	noerr(2);
	return 0;
}
int boot_can_readyfor(uint32_t idx)
{
	((uint64_t*)BufferA)[0] = idx;
	can_senddata(BufferA, 8, BOOT_SEND_READY);
	return 0;
}

// starts at 0, goes to 1 on init, goes to 2 when erase is done, goes to 3 when programming of last address is done;
enum bootstate
{
	BOOTSTATE_START,
	BOOTSTATE_INIT,
	BOOTSTATE_ERASE_DONE,
	BOOTSTATE_PROGGED,
} bootstate = BOOTSTATE_START;
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
#define NUMBER_OF_BYTES_PER_PAGE_AND_THEN_SOME 0x2026 // this, as well as NUMBER_OF_BYTES_PER_PAGE, will probably differ on the H7
char progbuf[NUMBER_OF_BYTES_PER_PAGE_AND_THEN_SOME]; // must be at least large enough for 8KiB, plus some for misalignment when sending 6 bytes at a time
int boot_ping(void)
{
	((uint64_t*)BufferA)[0] = ((uint64_t*)recvbuf)[0] + 1;
	can_senddata(BufferA, 8, BOOT_SEND_PING);
	noerr(1);
	return 0;
}
int boot_init(void)
{
	if(bootstate != BOOTSTATE_START)
	{
		boot_can_senderror(1);
		return 1;
	}
	bootstate = BOOTSTATE_INIT;

#define LOG_2_OF_NUMBER_OF_BYTES_PER_PAGE 13
#define NUMBER_OF_BYTES_PER_GET 6
#define NUMBER_OF_BYTES_PER_PAGE 0x2000
	getsleft = ((int32_t*)recvbuf)[0];
	progsleft = (getsleft*NUMBER_OF_BYTES_PER_GET + NUMBER_OF_BYTES_PER_PAGE - 1) >> LOG_2_OF_NUMBER_OF_BYTES_PER_PAGE; // this basically clamps upwards and then divides by NUMBER_OF_BYTES_PER_PAGE
	progcallsleft = progsleft;
	erasesleft = progsleft;
	flash_erase_addr(curaddr, NUMBER_OF_BYTES_PER_PAGE);
	return 0;
}
int boot_reset(void) // this is not really implemented, but it's not implemented server side either, not sure if having this is even a good idea, might be better to make restarting midways possible
{
	if(erasesleft)
	{
		boot_can_senderror(2);
		return 1;
	}
	if(bootstate != BOOTSTATE_ERASE_DONE)
	{
		boot_can_senderror(4);
		return 1;
	}
	return 0;
}
int boot_data(void)
{
	if(bootstate != BOOTSTATE_ERASE_DONE)
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
	memcpy(&progbuf[pageidx], recvbuf, NUMBER_OF_BYTES_PER_GET);
	--getsleft;
	pageidx += NUMBER_OF_BYTES_PER_GET;
	if(pageidx >= NUMBER_OF_BYTES_PER_PAGE)
	{
		pageidx -= NUMBER_OF_BYTES_PER_PAGE;
		flash_prog_addr(curaddr, NUMBER_OF_BYTES_PER_PAGE, (uint32_t*)progbuf);
		--progcallsleft;
		curaddr += NUMBER_OF_BYTES_PER_PAGE;
	}
	else if(!getsleft)
	{
		for(int i = pageidx; i < NUMBER_OF_BYTES_PER_PAGE; ++i)
		{
			progbuf[i] = 0xff;
		}
		flash_prog_addr(curaddr, NUMBER_OF_BYTES_PER_PAGE, (uint32_t*)progbuf);
	}
	else
	{
		((uint32_t*)BufferA)[0] = getsleft;
		can_senddata(BufferA, 8, BOOT_SEND_READY);
	}
	return 0;
}
int boot_can_recvdcallback(void* unused)
{
	char size = 0;
	int id = 0;
	can_getdata(recvbuf, &size, &id);
	if(id != BOOT_PING &&
	   id != BOOT_INIT &&
	   id != BOOT_RESET &&
	   id != BOOT_DATA)
	{
		boot_can_senderror(0);
		return 1;
	}
	return boot_recvfns[id - BOOT_PING]();
}

// data sent successfully
int boot_can_sentcallback(void* unused)
{
	if(bootstate == BOOTSTATE_PROGGED)
	{
		noerr(5);
//		bootstate = BOOTSTATE_START; // not needed, as system reboots anyway
		flash_swap_banks_and_die();
	}
	return 0;
}

// error in transfer, not handled, never happened, might happen if more bus traffic, idk
int boot_can_errcallback(void* unused)
{
	err(3);
	return 1;//HandleTransferError(0, 0);
}

int erasesdone = 0;
// erased flashmem page
int boot_flash_erasedcallback(void* unused)
{
//	can_senderror(erasesleft + 0xee0000);
//	can_senderror(erasesdone + 0xdd0000);
	++erasesdone;
	--erasesleft;
	if(erasesleft <= 0)
	{
		curaddr = FLASH_BASE + FLASH_SIZE/2;
		bootstate = BOOTSTATE_ERASE_DONE;
		BufferA[0] = erasesdone;
		can_senddata(BufferA, 8, BOOT_SEND_READY);
//		noerr(2);
		return 0;
	}
	curaddr += NUMBER_OF_BYTES_PER_PAGE;
	flash_erase_addr(curaddr, NUMBER_OF_BYTES_PER_PAGE);
	return 0;
}

// wrote a page to flash
int boot_flash_progdcallback(void* unused)
{
	memcpy(progbuf, &progbuf[NUMBER_OF_BYTES_PER_PAGE], NUMBER_OF_BYTES_PER_PAGE_AND_THEN_SOME-NUMBER_OF_BYTES_PER_PAGE); // copy whatever didn't get flashed
	--progsleft;
	if(!progsleft)
	{
		((uint32_t*)BufferA)[0] = getsleft;
		can_senddata(BufferA, 8, BOOT_SEND_FINISH);
		bootstate = BOOTSTATE_PROGGED;
		return 0;
	}
	else
	{
		BufferA[0] = 0x67; // just a status code
		can_senddata(BufferA, 8, BOOT_SEND_READY);
	}
//	noerr(1);
//	noerr(*(char*)(FLASH_BASE + FLASH_SIZE - 0x2000));
//	BufferA[0] = *(char*)(FLASH_BASE + FLASH_SIZE - 0x2000);
//	can_senddata(BufferA, 8);
	return 0;
}

// error in flash, not handled, never happened
int boot_flash_errcallback(void* unused)
{
	err(2);
	return 0;
}
