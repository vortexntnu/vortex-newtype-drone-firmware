/**
  * @file Helpers functions used to optimize the LL code in USART
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
 *  LL_USART_Function1: ["ARG1"],         // LL_USART_Function1(..., ARG1)
 *  LL_USART_Function2: ["ARG1", "ARG2"], // LL_USART_Function2(..., ARG1, ARG2)
 *  LL_USART_Function3: [],               // LL_USART_Function3(...)
 *  LL_USART_Function4: [["ARG1_OPT1", "ARG1_OPT2"]]
 *      // LL_USART_Function3 (..., ARG1_OPT1) or LL_USART_Function3 (..., ARG1_OPT3)
 * }
 * This LUT table is based on IP version.
 */
/* LUT table defines for IP version V1 */
const LL_USART_Functions_usartif = {
  LL_USART_SetPrescaler: ["LL_USART_PRESCALER_DIV1"],
  LL_USART_SetTXFIFOThreshold: ["LL_USART_FIFO_THRESHOLD_1_8"],
  LL_USART_SetRXFIFOThreshold: ["LL_USART_FIFO_THRESHOLD_1_8"]
};

/**
 * Get the LUT table to optimize the LL code
 * @param {string} ip_version IP version to select the correct LUT table
 * @returns LUT table based on the IP version
 */
function helper_usart_get_lut_table(ip_version) {
  let selectedTable;
  selectedTable = LL_USART_Functions_usartif;
  return selectedTable;
}

module.exports = {
  helper_usart_get_lut_table,
};