/*
 * boot.c
 *
 *  Created on: Sep 26, 2026
 *      Author: elias-gravdal
 */

#include <string.h>

#include "main.h"
#include "flash.h"
#include "boot.h"

//#define TX_BUFFER_SIZE 8
//static uint8_t BufferA[TX_BUFFER_SIZE] = {0x10, 0x32, 0x54, 0x76, 0x98, 0xBA, 0xDC, 0xFE};
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
	uint64_t errsig = 0xdeadbeef + ((uint64_t)code << 32);
	can_senddata((uint8_t*)&errsig, 8, BOOT_SEND_PING);
	err(1);
	return 1;
}
int boot_can_resendfrom(uint32_t idx)
{
	uint64_t send = idx;
	can_senddata((uint8_t*)&send, 8, BOOT_SEND_RESEND);
	noerr(2);
	return 0;
}
int boot_can_readyfor(uint32_t idx)
{
	uint64_t send = idx;
	can_senddata((uint8_t*)&send, 8, BOOT_SEND_READY);
	return 0;
}

// tell server ready
int boot_send_init(void* unused)
{
	boot_ping();
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
// the adress of the second bank (the one we write to); h7: 1MiB of flash per bank, 0x100000;
uint32_t curaddr = 0x8100000;// + (FLASH_SIZE/2);
// set to number of erases on init, decremented by one for every one done; h7: only one erase, that erases all sectors;
int erasesleft = 0;

// number of progs, that is, number of pages left to prog; h7: flashwords instead of pages, 1fw = 32B;
int progsleft = 0;

// number of messages left to get
uint64_t getsleft = 0;
#define NUMBER_OF_BYTES_PER_FLASHWORD_AND_THEN_SOME 0x26 // this, as well as NUMBER_OF_BYTES_PER_PAGE, will probably differ on the H7
char progbuf[NUMBER_OF_BYTES_PER_FLASHWORD_AND_THEN_SOME]; // must be at least large enough for 8KiB, plus some for misalignment when sending 6 bytes at a time
int boot_ping(void)
{
	uint64_t resend = 0;
	memcpy(&resend, recvbuf, 8);
	++resend;
	can_senddata((uint8_t*)&resend, 8, BOOT_SEND_PING);
//	noerr(1);
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

#define LOG_2_OF_NUMBER_OF_BYTES_PER_FLASHWORD 5
#define NUMBER_OF_BYTES_PER_GET 6
#define NUMBER_OF_BYTES_PER_FLASHWORD 0x20
	memcpy(&getsleft, recvbuf, 4);
	progsleft = (getsleft*NUMBER_OF_BYTES_PER_GET + NUMBER_OF_BYTES_PER_FLASHWORD - 1) >> LOG_2_OF_NUMBER_OF_BYTES_PER_FLASHWORD; // this basically clamps upwards and then divides by NUMBER_OF_BYTES_PER_FLASHWORD
#define LOG_2_OF_NUMBER_OF_BYTES_PER_SECTOR 17
#define NUMBER_OF_BYTES_PER_SECTOR 0x20000
	erasesleft = (getsleft*NUMBER_OF_BYTES_PER_GET + NUMBER_OF_BYTES_PER_SECTOR - 1) >> LOG_2_OF_NUMBER_OF_BYTES_PER_SECTOR;
	flash_erase_addr(curaddr, erasesleft);
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
	// this is checked to see if the packet really is the next one
	static uint16_t lastidx = 0xffff;
	// where on the page buffer to copy to
	static int pageidx = 0;
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
	if(pageidx >= NUMBER_OF_BYTES_PER_FLASHWORD)
	{
		pageidx -= NUMBER_OF_BYTES_PER_FLASHWORD;
		flash_prog_addr(curaddr, (uint32_t*)progbuf);
		curaddr += NUMBER_OF_BYTES_PER_FLASHWORD;
	}
	else if(!getsleft)
	{
		for(int i = pageidx; i < NUMBER_OF_BYTES_PER_FLASHWORD; ++i)
		{
			progbuf[i] = 0xff;
		}
		flash_prog_addr(curaddr, (uint32_t*)progbuf);
	}
	else
	{
		can_senddata((uint8_t*)&getsleft, 8, BOOT_SEND_READY);
	}
	return 0;
}
int boot_can_recvdcallback(void* unused)
{
	uint8_t size = 0;
	uint16_t id = 0;
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
		noerr(3);
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

// erased flashmem pages; // sectors;
int boot_flash_erasedcallback(void* unused)
{
//	can_senderror(erasesleft + 0xee0000);
//	can_senderror(erasesdone + 0xdd0000);
	curaddr = FLASH_BASE + FLASH_SIZE/2;
	bootstate = BOOTSTATE_ERASE_DONE;
	can_senddata((uint8_t*)&erasesleft, 8, BOOT_SEND_READY);
//	noerr(2);
	return 0;
}

// wrote a page to flash; // flashword;
int boot_flash_progdcallback(void* unused)
{
	memcpy(progbuf, &progbuf[NUMBER_OF_BYTES_PER_FLASHWORD], NUMBER_OF_BYTES_PER_FLASHWORD_AND_THEN_SOME-NUMBER_OF_BYTES_PER_FLASHWORD); // copy whatever didn't get flashed
	--progsleft;
	if(!progsleft)
	{
		can_senddata((uint8_t*)&getsleft, 8, BOOT_SEND_FINISH);
		bootstate = BOOTSTATE_PROGGED;
		return 0;
	}
	else
	{
		uint64_t status = 0x67; // just a status code;
		can_senddata((uint8_t*)&status, 8, BOOT_SEND_READY);
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
