/**
 * @file Helpers functions used to optimize the LL code in I2C
 * @license
 * Copyright (c) 2024 STMicroelectronics.
 * All rights reserved.
 *
 * This software is licensed under terms that can be found in the LICENSE file
 * in the root directory of this software component.
 * If no LICENSE file comes with this software, it is provided AS-IS.
 */

const LL_I2C_functionsV1 = {
  LL_I2C_SetTiming: ["0x00000000"],
  LL_I2C_ConfigOwnAddress1: ["0 << 1U", "LL_I2C_OWNADDRESS1_7BIT"],

  LL_I2C_SetConfigAutonomousModeTrigger: [
    ["LL_I2C_GRP1_GPDMA_CH0_TCF_TRG", "LL_I2C_GRP2_LPDMA_CH0_TCF_TRG"],
    "LL_I2C_TRIG_POLARITY_RISING",
  ],
  LL_I2C_SetDigitalFilter: ["0"],
  LL_I2C_SetOwnAddress2: ["0", "LL_I2C_OWNADDRESS2_NOMASK"],
  LL_I2C_DisableOwnAddress2: [],
  LL_I2C_SetMasterAddressingMode: ["LL_I2C_ADDRESSING_MODE_7BIT"],
};

/**
 * Get the LUT table to optimize the LL code
 * @param {string} ip_version IP version to select the correct LUT table
 * @returns LUT table based on the IP version
 */
function helper_i2c_get_lut_table(ip_version) {
  let selectedTable = LL_I2C_functionsV1;
  return selectedTable;
}

module.exports = {
  helper_i2c_get_lut_table,
};
