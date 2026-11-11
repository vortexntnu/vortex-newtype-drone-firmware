/*
 * flash.c
 *
 *  Created on: Sep 25, 2026
 *      Author: elias-gravdal
 */

#include <string.h>

#include "main.h"
#include "interrupts.h"
#include "flash.h"

#include "stm32h7xx_hal_rcc.h"
#include "stm32h7xx_hal_cortex.h"
#include "stm32h7xx_hal_flash.h"
#include "stm32h7xx_hal_flash_ex.h"

void HAL_FLASH_EndOfOperationCallback(uint32_t ReturnValue);
void HAL_FLASH_OperationErrorCallback(uint32_t ReturnValue);

//hal_flash_handle_t flash_handle;
//hal_flash_handle_t* pflashhan;

void FLASH_IRQHandler(void)
{
	HAL_FLASH_IRQHandler();
}

int flash_init(void)
{
//	pflashhan = &flash_handle;
//	HAL_CORTEX_NVIC_SetPriority(FLASH_IRQn, HAL_CORTEX_NVIC_PREEMP_PRIORITY_0, HAL_CORTEX_NVIC_SUB_PRIORITY_0);
//	HAL_CORTEX_NVIC_EnableIRQ(FLASH_IRQn);
//	HAL_RCC_FLASH_EnableClock();
//	/*hal_flash_t flash = */HAL_FLASH_Init(&flash_handle, HAL_FLASH);
	parserr(HAL_FLASH_Unlock());

//	parserr(HAL_FLASH_SetProgrammingMode(&flash_handle, HAL_FLASH_PROGRAM_QUADWORD));
//	parserr(HAL_FLASH_RegisterEraseByAddrCpltCallback(&flash_handle, flash_erase_done_callback));
//	parserr(HAL_FLASH_RegisterProgramCpltCallback(&flash_handle, flash_program_cplt_callback));
//	parserr(HAL_FLASH_RegisterErrorCallback(&flash_handle, flash_error_callback));

	return 0;
}

int flash_deinit(void)
{
	HAL_FLASH_Lock();
//	HAL_FLASH_DeInit(&flash_handle);

	return 0;
}

// might need to memcpy this to ram // seems like not maybe?
int flash_swap_banks_and_die()
{
	// it doesn't activate before reboot? so this is not needed?
//	if(!fromself)
//	{
//		// add one because of thumb mode, the blx instruction takes the mode from bit 0 of the register into which this address is loaded
//		int (*sbad)(int) = (int(*)(int))0x0a000001; // don't know if this address is free, first ram address,
//		uint8_t arr[0x100];// why not copy to stack?;
//		sbad = (int(*)(int))(arr + 1); // still lsb one to jump in thumb mode (T32)
//		// the branch with link instruction (bl) is pc-relative, so can't use memcpy
//		memcpy(arr, swap_banks_and_die, 0x100); // may need to increase should this function become larger, read the elf for size
//		sbad(1);
//	}
//	don't know how to swap banks here yet
//	seems like it needs the flash ext
	FLASH_OBProgramInitTypeDef conf;
	HAL_FLASHEx_OBGetConfig(&conf);
	uint32_t swapstatus = conf.USERConfig & OB_SWAP_BANK_ENABLE;
	HAL_FLASH_OB_Unlock();
	if(swapstatus == OB_SWAP_BANK_ENABLE)
	{
		conf.USERConfig &= ~OB_SWAP_BANK_ENABLE;
	}
	else if(swapstatus == OB_SWAP_BANK_DISABLE)
	{
		conf.USERConfig |= OB_SWAP_BANK_ENABLE;
	}
	else
	{
		err(12);
		HAL_FLASH_OB_Lock();
		return 1;
	}
	// this writes?
	HAL_FLASHEx_OBProgram(&conf);
	// needn't lock? when reboot anyway?
	HAL_FLASH_OB_Lock();

	NVIC_SystemReset();

	return 0;
}

int flash_prog_addr(uint32_t where, uint32_t* data)
{
	HAL_StatusTypeDef stat = HAL_FLASH_Program_IT(FLASH_TYPEPROGRAM_FLASHWORD, where, (size_t)data);
	parserr(stat);
	return 0;
}

// a sector is 128KiB here
int flash_erase_addr(uint32_t where, uint32_t cnt)
{
	FLASH_EraseInitTypeDef conf =
	{
		.TypeErase = FLASH_TYPEERASE_SECTORS,
		.Banks = 0,
		.Sector = where,
		.NbSectors = cnt,
		.VoltageRange = FLASH_VOLTAGE_RANGE_3, // why is this here, and is this correct? // was 3 in example
	};
	HAL_StatusTypeDef stat = HAL_FLASHEx_Erase_IT(&conf);
	parserr(stat);
	return 0;
}

extern enum bootstate
{
	BOOTSTATE_START,
	BOOTSTATE_INIT,
	BOOTSTATE_ERASE_DONE,
	BOOTSTATE_PROGGED,
} bootstate;
void HAL_FLASH_EndOfOperationCallback(uint32_t ReturnValue)
{
	size_t ret_val = ReturnValue;
	if(bootstate == BOOTSTATE_INIT)
		push_interrupt(1, FI_FLASH_ERASED, (void*)ret_val);
	else if(bootstate == BOOTSTATE_ERASE_DONE)
		push_interrupt(1, FI_FLASH_PROGD, (void*)ret_val);
}
void HAL_FLASH_OperationErrorCallback(uint32_t ReturnValue)
{
	size_t ret_val = ReturnValue;
	push_interrupt(1, FI_FLASH_ERR, (void*)ret_val);
}
