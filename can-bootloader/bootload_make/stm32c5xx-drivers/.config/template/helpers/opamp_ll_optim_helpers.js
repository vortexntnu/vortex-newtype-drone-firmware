/**
 * @file Helpers functions used to optimize the LL code in OPAMP
 * @license
 * Copyright (c) 2024 STMicroelectronics.
 * All rights reserved.
 *
 * This software is licensed under terms that can be found in the LICENSE file
 * in the root directory of this software component.
 * If no LICENSE file comes with this software, it is provided AS-IS.
 */

const LL_OPAMP_functionsV1 = {
  LL_OPAMP_SetSpeedMode: ["LL_OPAMP_SPEED_MODE_NORMAL"],
  LL_OPAMP_SetMode: ["LL_OPAMP_MODE_FUNCTIONAL"],
  LL_OPAMP_SetConfigurationMode: ["LL_OPAMP_MODE_STANDALONE"],
  LL_OPAMP_SetPGAGain: ["LL_OPAMP_PGA_GAIN_2"],
  LL_OPAMP_SetPGAExternalMode: ["LL_OPAMP_PGA_EXT_NONE"],
  LL_OPAMP_SetInputNonInverting: ["LL_OPAMP_INPUT_NONINVERT_IO0"],
  LL_OPAMP_SetInputs: ["LL_OPAMP_INPUT_NONINVERT_IO0","LL_OPAMP_INPUT_INVERT_IO0"],
  LL_OPAMP_SetTrimmingMode: ["LL_OPAMP_TRIMMING_FACTORY"],
  LL_OPAMP_SetInputMuxNonInvertingSecondary: ["LL_OPAMP_INPUT_NONINVERT_IO0"],
  LL_OPAMP_SetInputMuxInvertingSecondary: ["LL_OPAMP_INPUT_INVERT_IO0"],
  LL_OPAMP_SetInputsMuxSecondary: ["LL_OPAMP_INPUT_NONINVERT_IO0","LL_OPAMP_INPUT_INVERT_IO0"],
  LL_OPAMP_SetMuxInputCtrl: ["LL_OPAMP_MUX_INPUT_CTRL_DISABLE"],
  LL_OPAMP_SetPGAGainMuxSecondary: ["LL_OPAMP_PGA_GAIN_2"],
  LL_OPAMP_SetMuxPGAGainCtrl: ["LL_OPAMP_MUX_PGA_GAIN_CTRL_DISABLE"],
  LL_OPAMP_SetOutputConnection: ["LL_OPAMP_OUTPUT_CONNECT_EXTERNAL"]
};

/**
 * Get the LUT table to optimize the LL code
 * @param {string} ip_version IP version to select the correct LUT table
 * @returns LUT table based on the IP version
 */
function helper_opamp_get_lut_table(ip_version) {
  let selectedTable = LL_OPAMP_functionsV1;
  return selectedTable;
}

module.exports = {
  helper_opamp_get_lut_table,
};
