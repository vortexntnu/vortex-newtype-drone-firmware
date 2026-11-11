#include "main.h"
#include "stm32c5xx_hal_cortex.h"
#include "stm32c5xx_hal_icache.h"
#include "stm32c5xx_hal_rcc.h"
#include "stm32c5xx_hal_flash_itf.h"
// might move these to separate files, they are taken from generated anyway;
// anyway this is much organizeder;

int init_mpu(void)
{
	/* Disables the MPU */
	HAL_CORTEX_MPU_Disable();

	/*
	 *      Initializes and configures the MPU attributes
	 *        */
	HAL_CORTEX_MPU_SetCacheMemAttr(HAL_CORTEX_MPU_MEM_ATTR_0, HAL_CORTEX_MPU_NORMAL_MEM_NCACHEABLE);

	/*
	 *      Initializes and configures the MPU Region
	 *        */
	hal_cortex_mpu_region_config_t p_region_config = {0};

	p_region_config.base_addr = 0x8FFE000;
	p_region_config.limit_addr = 0x8FFFFFF;
	p_region_config.access_attr = HAL_CORTEX_MPU_REGION_ALL_RO;
	p_region_config.exec_attr = HAL_CORTEX_MPU_EXECUTION_ATTR_DISABLE;
	p_region_config.attr_idx = HAL_CORTEX_MPU_MEM_ATTR_0;
	HAL_CORTEX_MPU_SetConfigRegion(HAL_CORTEX_MPU_REGION_0, &p_region_config);

	HAL_CORTEX_MPU_EnableRegion(HAL_CORTEX_MPU_REGION_0);

	/* Enables the MPU */
	HAL_CORTEX_MPU_Enable(HAL_CORTEX_MPU_HARDFAULT_NMI_DISABLE, HAL_CORTEX_MPU_ACCESS_FAULT_ONLY_PRIV);
	return 0;
}

// dunno what an icache is, instruction cache maybe? for faster instruction fetch?;
int init_icache(void)
{
	hal_icache_handle_t hICACHE;
	if (HAL_ICACHE_Init(&hICACHE, HAL_ICACHE) != HAL_OK)
	{
		return -1;
	}
	if (HAL_ICACHE_Start(&hICACHE, HAL_ICACHE_IT_NONE) != HAL_OK)
	{
		return -1;
	}
	return 0;
}

// rcc has to do with clocks?
int init_rcc(void)
{
	if (HAL_RCC_HSE_Enable(HAL_RCC_HSE_ON) != HAL_OK)
	{
		return -1;
	}

	hal_rcc_psi_config_t config_psi;
	config_psi.psi_source = HAL_RCC_PSI_SRC_HSE;
	config_psi.psi_ref = HAL_RCC_PSI_REF_24MHZ;
	config_psi.psi_out = HAL_RCC_PSI_OUT_144MHZ;
	if (HAL_RCC_PSI_SetConfig(&config_psi) != HAL_OK)
	{
		return -1;
	}

	if (HAL_RCC_PSIS_Enable() != HAL_OK)
	{
		return -1;
	}

	/** Initializes the CPU, AHB and APB busses clocks */
	hal_rcc_bus_clk_config_t config_bus;
	config_bus.hclk_prescaler  = HAL_RCC_HCLK_PRESCALER1;
	config_bus.pclk1_prescaler = HAL_RCC_PCLK_PRESCALER1;
	config_bus.pclk2_prescaler = HAL_RCC_PCLK_PRESCALER1;
	config_bus.pclk3_prescaler = HAL_RCC_PCLK_PRESCALER1;
	if (HAL_RCC_SetBusClockConfig(&config_bus) != HAL_OK)
	{
		return -1;
	}

	/** Frequency will be increased */
	HAL_FLASH_ITF_SetLatency(HAL_FLASH, HAL_FLASH_ITF_LATENCY_4);

	if (HAL_RCC_SetSYSCLKSource(HAL_RCC_SYSCLK_SRC_PSIS) != HAL_OK)
	{
		return -1;
	}

	HAL_FLASH_ITF_SetProgrammingDelay(HAL_FLASH, HAL_FLASH_ITF_PROGRAM_DELAY_2);

	if (HAL_UpdateCoreClock() != HAL_OK)
	{
		return -1;
	}
	return 0;
}
