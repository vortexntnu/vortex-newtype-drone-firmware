/*
 * flash.c
 *
 *  Created on: Sep 25, 2026
 *      Author: elias-gravdal
 */

#include <stm32c5xx_hal_flash.h>
#include <string.h>

#include "interrupts.h"
#include "main.h"
#include "flash.h"

static void flash_erase_done_callback(hal_flash_handle_t *hflash, uint32_t what, uint32_t isthis);
static void flash_program_cplt_callback(hal_flash_handle_t *hflash, uint32_t what, uint32_t isthis);
static void flash_error_callback(hal_flash_handle_t *hflash, hal_flash_bank_t bank);

hal_flash_handle_t flash_handle;
hal_flash_handle_t* pflashhan;

void FLASH_IRQHandler(void)
{
	HAL_FLASH_IRQHandler(&flash_handle);
}

int flash_init(void)
{
	pflashhan = &flash_handle;
	HAL_CORTEX_NVIC_SetPriority(FLASH_IRQn, HAL_CORTEX_NVIC_PREEMP_PRIORITY_0, HAL_CORTEX_NVIC_SUB_PRIORITY_0);
	HAL_CORTEX_NVIC_EnableIRQ(FLASH_IRQn);
	HAL_RCC_FLASH_EnableClock();
	/*hal_flash_t flash = */HAL_FLASH_Init(&flash_handle, HAL_FLASH);
	parserr(HAL_FLASH_ITF_Unlock(HAL_FLASH));

	parserr(HAL_FLASH_SetProgrammingMode(&flash_handle, HAL_FLASH_PROGRAM_QUADWORD));
	parserr(HAL_FLASH_RegisterEraseByAddrCpltCallback(&flash_handle, flash_erase_done_callback));
	parserr(HAL_FLASH_RegisterProgramCpltCallback(&flash_handle, flash_program_cplt_callback));
	parserr(HAL_FLASH_RegisterErrorCallback(&flash_handle, flash_error_callback));

	return 0;
}

int flash_deinit(void)
{
	HAL_FLASH_ITF_Lock(HAL_FLASH);
	HAL_FLASH_DeInit(&flash_handle);

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
	hal_flash_itf_ob_bank_swap_t bs = HAL_FLASH_ITF_OB_GetBankSwap(HAL_FLASH);
	HAL_FLASH_ITF_OB_Unlock(HAL_FLASH);
	if(bs == HAL_FLASH_ITF_OB_BANK_NO_SWAP)
	{
		HAL_FLASH_ITF_OB_SetBankSwap(HAL_FLASH, HAL_FLASH_ITF_OB_BANK_SWAP);
	}
	else if(bs == HAL_FLASH_ITF_OB_BANK_SWAP)
	{
		HAL_FLASH_ITF_OB_SetBankSwap(HAL_FLASH, HAL_FLASH_ITF_OB_BANK_NO_SWAP);
	}
	else
	{
		err(12);
		HAL_FLASH_ITF_OB_Lock(HAL_FLASH);
		return 1;
	}
	// this writes?
	HAL_FLASH_ITF_OB_Program(HAL_FLASH);
	// needn't lock? when reboot anyway?
	HAL_FLASH_ITF_OB_Lock(HAL_FLASH);

	HAL_CORTEX_NVIC_SystemReset();

	return 0;
}

int flash_prog_addr(uint32_t where, uint32_t cnt, uint32_t* data)
{
	hal_status_t stat = HAL_FLASH_ProgramByAddr_IT(&flash_handle, where, data, (cnt + 15) & (uint32_t)0xfffffff0);
	parserr(stat);
	return 0;
}

int flash_erase_addr(uint32_t where, uint32_t cnt)
{
	hal_status_t stat = HAL_FLASH_EraseByAddr_IT(&flash_handle, where, (cnt + 15) & (uint32_t)0xfffffff0);
	parserr(stat);
	return 0;
}

static void flash_erase_done_callback(hal_flash_handle_t *hflash, uint32_t what, uint32_t isthis)
{
	push_interrupt(1, FI_FLASH_ERASED, hflash);
}

static void flash_program_cplt_callback(hal_flash_handle_t *hflash, uint32_t what, uint32_t isthis)
{
	push_interrupt(1, FI_FLASH_PROGD, hflash);
}

static void flash_error_callback(hal_flash_handle_t *hflash, hal_flash_bank_t bank)
{
	push_interrupt(1, FI_FLASH_ERR, hflash);
}
