
/**
  ******************************************************************************
  * @file           : mx_rcc.c
  * @brief          : STM32 RCC program body
  ******************************************************************************
  * @attention
  *
  * Copyright (c) 2026 STMicroelectronics.
  * All rights reserved.
  *
  * This software is licensed under terms that can be found in the mx_stm32c5xx_hal_drivers_license.md file
  * in the same directory as the generated code.
  * If no mx_stm32c5xx_hal_drivers_license.md file comes with this software, it is provided AS-IS.
  *
  ******************************************************************************
  */

/* Includes ------------------------------------------------------------------*/
#include "mx_rcc.h"

/* Private typedef -----------------------------------------------------------*/
/* Private define ------------------------------------------------------------*/
/* Private macro -------------------------------------------------------------*/
/* Private variables ---------------------------------------------------------*/
/* Private functions prototype------------------------------------------------*/

/******************************************************************************/
/* Exported functions for RCC in HAL layer */
/******************************************************************************/

/**
  * Configure the system core clock only and activate it using the HAL RCC unitary APIs (footprint optimization)
  *         The system Clock is configured as follow :
  *            System Clock source            = HSE
  *            SYSCLK(Hz)                     = 16000000
  *            HCLK(Hz)                       = 16000000
  *            AHB Prescaler                  = 1
  *            APB1 Prescaler                 = 1
  *            APB2 Prescaler                 = 1
  *            APB3 Prescaler                 = 1
  *            Flash Latency(WS)              = 4
  */
system_status_t mx_rcc_init(void)
{
  if (HAL_RCC_HSE_Enable(HAL_RCC_HSE_ON) != HAL_OK)
  {
    return SYSTEM_CLOCK_ERROR;
  }

  /** Initializes the CPU, AHB and APB busses clocks */
  hal_rcc_bus_clk_config_t config_bus;
  config_bus.hclk_prescaler  = HAL_RCC_HCLK_PRESCALER1;
  config_bus.pclk1_prescaler = HAL_RCC_PCLK_PRESCALER1;
  config_bus.pclk2_prescaler = HAL_RCC_PCLK_PRESCALER1;
  config_bus.pclk3_prescaler = HAL_RCC_PCLK_PRESCALER1;
  if (HAL_RCC_SetBusClockConfig(&config_bus) != HAL_OK)
  {
    return SYSTEM_CLOCK_ERROR;
  }

  if (HAL_RCC_SetSYSCLKSource(HAL_RCC_SYSCLK_SRC_HSE) != HAL_OK)
  {
    return SYSTEM_CLOCK_ERROR;
  }

  /** Frequency will be decreased */
  HAL_FLASH_ITF_SetLatency(HAL_FLASH, HAL_FLASH_ITF_LATENCY_4);
  HAL_FLASH_ITF_SetProgrammingDelay(HAL_FLASH, HAL_FLASH_ITF_PROGRAM_DELAY_2);

  if (HAL_UpdateCoreClock() != HAL_OK)
  {
    return SYSTEM_CLOCK_ERROR;
  }

  /* No GPIO configuration required for RCC */

  return SYSTEM_OK;
}

void mx_rcc_deinit(void)
{
  HAL_RCC_Reset();
}

/**
  * configures and activate the clocks used by all the peripherals selected within the project
  */
system_status_t mx_rcc_peripherals_clock_config(void)
{
  /* Peripherals using HCLK (16 MHz):
    ADC1
  */

  /* Peripherals using PCLK1 (16 MHz):
    I2C1
  */

  /* Peripherals using PCLK2 (16 MHz):
    SPI1
  */

  /* Peripherals using PSIDIV3 (48 MHz):
    USB_DRD_FS
  */
  hal_rcc_psi_config_t config_psi;
  config_psi.psi_source = HAL_RCC_PSI_SRC_HSE;
  config_psi.psi_ref = HAL_RCC_PSI_REF_16MHZ;
  config_psi.psi_out = HAL_RCC_PSI_OUT_144MHZ;
  if (HAL_RCC_PSI_SetConfig(&config_psi) != HAL_OK)
  {
    return SYSTEM_CLOCK_ERROR;
  }

  if (HAL_RCC_PSIDIV3_Enable() != HAL_OK)
  {
    return SYSTEM_CLOCK_ERROR;
  }

  /* Peripherals using HSE (16 MHz):
    FDCAN2
  */
  /* HSE already enabled inside mx_rcc_init() */

  /* Peripherals using LSE (32.768 kHz):
    LPUART1
  */

  /* Disable RTC Domain Write Protection */
  HAL_PWR_DisableRTCDomainWriteProtection();

  if (HAL_RCC_LSE_Enable(HAL_RCC_LSE_ON, HAL_RCC_LSE_DRIVE_LOW) != HAL_OK)
  {
    /* In order to simplify the code generation and management for the user, the write protection is not enabled by
       default. In real case application, we advise to enable it once all the necessary configurations are done. */
    /* Enable RTC Domain Write Protection */
    /* HAL_PWR_EnableRTCDomainWriteProtection(); */

    return SYSTEM_CLOCK_ERROR;
  }

  /* In order to simplify the code generation and management for the user, the write protection is not enabled by
     default. In real case application, we advise to enable it once all the necessary configurations are done. */
  /* Enable RTC Domain Write Protection */
  /* HAL_PWR_EnableRTCDomainWriteProtection(); */

  /* Peripherals using LSI (32 kHz):
    RTC
  */
  if (HAL_RCC_LSI_Enable() != HAL_OK)
  {
    return SYSTEM_CLOCK_ERROR;
  }

  /* Peripherals using ADC_DAC_DIV (125 kHz):
    ADC1
  */
  if (HAL_RCC_ADCDAC_SetKernelClkPrescaler(HAL_RCC_ADCDAC_PRESCALER128) != HAL_OK)
  {
    return SYSTEM_CLOCK_ERROR;
  }

  return SYSTEM_OK;
}
