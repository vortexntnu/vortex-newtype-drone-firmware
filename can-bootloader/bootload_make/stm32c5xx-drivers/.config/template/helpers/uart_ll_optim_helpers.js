/**
  * @file Helpers functions used to optimize the LL code in UART
  * @attention
  *
  * Copyright (c) 2026 STMicroelectronics.
  * All rights reserved.
  *
  * This software is licensed under terms that can be found in the LICENSE file
  * in the root directory of this software component.
  * If no LICENSE file comes with this software, it is provided AS-IS.
  *
 */

/**
 * LUT table used to detect if the LL code must be commented or not
 * Format is:
 * - a key of LL function
 * - for each key, define the list of arguments which link to reset values
 * {
 *  LL_UART_Function1: ["ARG1"],         // LL_UART_Function1(..., ARG1)
 *  LL_UART_Function2: ["ARG1", "ARG2"], // LL_UART_Function2(..., ARG1, ARG2)
 *  LL_UART_Function3: [],               // LL_UART_Function3(...)
 *  LL_UART_Function4: [["ARG1_OPT1", "ARG1_OPT2"]]
 *      // LL_UART_Function3 (..., ARG1_OPT1) or LL_UART_Function3 (..., ARG1_OPT3)
 * }
 * This LUT table is based on IP version.
 */
/* LUT table defines for IP version V1 */
const LL_UART_Functions_uartif = {
  LL_USART_SetPrescaler: ["LL_USART_PRESCALER_DIV1"],
  LL_USART_SetHWFlowCtrl: ["LL_USART_HWCONTROL_NONE"],
  LL_USART_SetWakeUpMethod: ["LL_USART_WAKEUP_METHOD_IDLE_LINE"],
  LL_USART_SetLINBrkDetectionLen: ["LL_USART_LIN_BREAK_DETECT_10_BIT"],
  LL_USART_SetDESignalPolarity: ["LL_USART_DE_POLARITY_HIGH"],
  LL_USART_ConfigDETime: [["0U"],"0U"],
  LL_USART_SetTXFIFOThreshold: ["LL_USART_FIFO_THRESHOLD_1_8"],
  LL_USART_SetRXFIFOThreshold: ["LL_USART_FIFO_THRESHOLD_1_8"],
  LL_USART_SetRxTimeout: ["0U"],
  LL_USART_SetAutoBaudRateMode: ["LL_USART_AUTO_BAUD_DETECT_ON_START_BIT"],
  LL_USART_SetIrdaPowerMode: ["LL_USART_IRDA_POWER_MODE_NORMAL"]
};

/**
 * Get the LUT table to optimize the LL code
 * @param {string} ip_version IP version to select the correct LUT table
 * @returns LUT table based on the IP version
 */
function helper_uart_get_lut_table(ip_version) {
  let selectedTable;
  selectedTable = LL_UART_Functions_uartif;
  return selectedTable;
}

module.exports = {
  helper_uart_get_lut_table,
};