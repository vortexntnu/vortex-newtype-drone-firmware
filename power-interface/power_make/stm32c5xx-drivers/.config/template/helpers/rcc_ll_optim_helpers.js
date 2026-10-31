/**
 * @file Helpers functions used to optimize the LL code in RCC
 * @license
 * Copyright (c) 2025 STMicroelectronics.
 * All rights reserved.
 *
 * This software is licensed under terms that can be found in the LICENSE file
 * in the root directory of this software component.
 * If no LICENSE file comes with this software, it is provided AS-IS.
 */

const LL_RCC_functions = {
  LL_RCC_LSE_SetDriveCapability: ["LL_RCC_LSEDRIVE_LOW"],
  LL_RCC_ConfigPSI: ["LL_RCC_PSIFREQ_100MHz", "LL_RCC_PSIREF_32768Hz", "LL_RCC_PSISOURCE_HSE"],
  LL_RCC_SetADCDACPrescaler: ["LL_RCC_ADCDAC_PRESCALER_1"],
  LL_RCC_SetETH1Prescaler: ["LL_RCC_ETH1_PRESCALER_1"],

  LL_RCC_ConfigMCO: [["LL_RCC_MCO1SOURCE_SYSCLK", "LL_RCC_MCO2SOURCE_SYSCLK"], ["LL_RCC_MCO1_NO_CLK", "LL_RCC_MCO2_NO_CLK"]],
  LL_RCC_ConfigLSCO: [["LL_RCC_LSCO_CLKSOURCE_LSI"],["", "LL_RCC_LSCO_OUTPUT_PB0"]],

  LL_RCC_SetSysClkSource: [["LL_RCC_SYS_CLKSOURCE_HSIDIV3", "LL_RCC_SYS_CLKSOURCE_HSIDIV4"]],

  LL_RCC_SetSystickClockSource: ["LL_RCC_SYSTICK_CLKSOURCE_HCLKDIV8"],
  LL_RCC_SetUSARTClockSource: [["LL_RCC_USART1_CLKSOURCE_PCLK2","LL_RCC_USART2_CLKSOURCE_PCLK1", "LL_RCC_USART3_CLKSOURCE_PCLK1"]],
  LL_RCC_SetUARTClockSource: [["LL_RCC_UART4_CLKSOURCE_PCLK1", "LL_RCC_UART5_CLKSOURCE_PCLK1", "LL_RCC_UART7_CLKSOURCE_PCLK1"]],
  LL_RCC_SetLPUARTClockSource: ["LL_RCC_LPUART1_CLKSOURCE_PCLK3"],
  LL_RCC_SetSPIClockSource: [["LL_RCC_SPI1_CLKSOURCE_PCLK2", "LL_RCC_SPI2_CLKSOURCE_PCLK1", "LL_RCC_SPI3_CLKSOURCE_PCLK1"]],
  LL_RCC_SetFDCANClockSource: ["LL_RCC_FDCAN_CLKSOURCE_PCLK1"],
  LL_RCC_SetI2CClockSource: [["LL_RCC_I2C1_CLKSOURCE_PCLK1", "LL_RCC_I2C2_CLKSOURCE_PCLK1"]],
  LL_RCC_SetI3CClockSource: ["LL_RCC_I3C1_CLKSOURCE_PCLK1"],
  LL_RCC_SetADCDACClockSource: ["LL_RCC_ADCDAC_CLKSOURCE_HCLK"],
  LL_RCC_SetDACSHClockSource: [["LL_RCC_DACSH_CLKSOURCE_LSE", "LL_RCC_DAC1SH_CLKSOURCE_LSE"]],
  LL_RCC_SetLPTIMClockSource: ["LL_RCC_LPTIM1_CLKSOURCE_PCLK3"],
  LL_RCC_SetCK48ClockSource: [["LL_RCC_CK48_CLKSOURCE_PSIDIV3", "LL_RCC_CK48_CLKSOURCE_PSIDIV4"]],
  LL_RCC_SetXSPIClockSource: ["LL_RCC_XSPI1_CLKSOURCE_HCLK"],
  LL_RCC_SetETH1ClockSource: [["LL_RCC_ETH1REF_CLKSOURCE_RMII", "LL_RCC_ETH1PTP_CLKSOURCE_NONE", "LL_RCC_ETH1_CLKSOURCE_NONE"]],
  LL_RCC_SetPLAY1ClockSource: ["LL_RCC_PLAY1_CLKSOURCE_LSE"],
  LL_RCC_SetRTCClockSource: ["LL_RCC_RTC_CLKSOURCE_NONE"],

};

/**
 * Get the LUT table to optimize the LL code
 * @returns LUT table based on the IP version
 */
function helper_rcc_get_lut_table() {
  let selectedTable = LL_RCC_functions;
  return selectedTable;
}

module.exports = {
  helper_rcc_get_lut_table,
};
