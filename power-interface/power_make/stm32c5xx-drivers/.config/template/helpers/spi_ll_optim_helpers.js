/**
  * @file Helpers functions used to optimize the LL code in SPI
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
 *  LL_SPI_Function1: ["ARG1"],         // LL_SPI_Function1(..., ARG1)
 *  LL_SPI_Function2: ["ARG1", "ARG2"], // LL_SPI_Function2(..., ARG1, ARG2)
 *  LL_SPI_Function3: [],               // LL_SPI_Function3(...)
 *  LL_SPI_Function4: [["ARG1_OPT1", "ARG1_OPT2"]]
 *      // LL_SPI_Function3 (..., ARG1_OPT1) or LL_SPI_Function3 (..., ARG1_OPT3)
 * }
 * This LUT table is based on IP version.
 */
/* LUT table defines for IP version V1 */
const LL_SPI_Functions_V1 = {
  /* SPI related */
  LL_SPI_SetUDRConfiguration: ["LL_SPI_UNDERRUN_CONFIG_REGISTER_PATTERN"],
  LL_SPI_SetStandard: ["LL_SPI_PROTOCOL_MOTOROLA"],
  LL_SPI_SetCRCInitPattern: ["LL_SPI_CRC_TX_INIT_PATTERN_ALL_ZERO", "LL_SPI_CRC_RX_INIT_PATTERN_ALL_ZERO"],
  LL_SPI_SetInterDataIdleness: ["LL_SPI_MIDI_DELAY_0_CYCLE"],
  LL_SPI_SetReadyPinPolarity: ["LL_SPI_READY_PIN_POLARITY_HIGH"],
  LL_SPI_SetFIFOThreshold: ["LL_SPI_FIFO_THRESHOLD_1_DATA"],

  /* I2S related */
  LL_I2S_SetTransferMode: ["LL_I2S_MODE_SLAVE_TX"],
  LL_I2S_SetStandard: ["LL_I2S_STANDARD_PHILIPS"],
  LL_I2S_SetDataFormat: ["LL_I2S_DATA_FORMAT_16_BIT"],
  LL_I2S_SetDataAlignmentRight: [],
  LL_I2S_SetClockPolarity: ["LL_I2S_CLOCK_POLARITY_LOW"],
  LL_I2S_SetTransferBitOrder: ["LL_I2S_MSB_FIRST"],
  LL_I2S_SetPrescalerLinear: ["0"],
  LL_I2S_SetPrescalerParity: ["LL_I2S_PRESCALER_PARITY_EVEN"],
  LL_I2S_SetFIFOThreshold: ["LL_I2S_FIFO_THRESHOLD_1_DATA"],
};

/**
 * Get the LUT table to optimize the LL code
 * @param {string} ip_version IP version to select the correct LUT table
 * @returns LUT table based on the IP version
 */
function helper_spi_get_lut_table(ip_version) {
  let selectedTable = LL_SPI_Functions_V1;
  return selectedTable;
}

module.exports = {
  helper_spi_get_lut_table,
};
