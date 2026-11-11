/**
 * @file Helpers functions used to optimize the LL code in DMA
 * @license
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

const LL_DMA_functionsDMA3 = {
  LL_DMA_SetDataTransferDirection: ["LL_DMA_DIRECTION_PERIPH_TO_MEMORY"],

  LL_DMA_SetChannelPriorityLevel:  ["LL_DMA_PRIORITY_LOW_WEIGHT_LOW"],

  LL_DMA_ConfigDataHandling:       ["LL_DMA_DEST_DATA_TRUNC_LEFT_PADD_ZERO"],

  LL_DMA_SetBlkDataLength:         ["0U"],

  LL_DMA_SetTransferEventMode:     ["LL_DMA_LINKEDLIST_XFER_EVENT_Q"],

  LL_DMA_ConfigControl:            ["LL_DMA_PRIORITY_LOW_WEIGHT_LOW | LL_DMA_LINKEDLIST_EXECUTION_Q"],

  LL_DMA_ConfigTransfer:           ["LL_DMA_SRC_ADDR_FIXED | LL_DMA_SRC_DATA_WIDTH_BYTE | LL_DMA_DEST_ADDR_FIXED | LL_DMA_DEST_DATA_WIDTH_BYTE"],
};

/**
 * Get the LUT table to optimize the LL code
 * @param {string} ip_version IP version to select the correct LUT table
 * @returns LUT table based on the IP version
 */
function helper_dma_get_lut_table(ip_version) {
  const selectedTable = LL_DMA_functionsDMA3;
  return selectedTable;
}

module.exports = {
  helper_dma_get_lut_table,
};
