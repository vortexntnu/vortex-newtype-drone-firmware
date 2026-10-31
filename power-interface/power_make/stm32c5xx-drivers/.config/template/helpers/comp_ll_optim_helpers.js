/**
 * @file Helpers functions used to optimize the LL code in COMP
 * @license
 * Copyright (c) 2024 STMicroelectronics.
 * All rights reserved.
 *
 * This software is licensed under terms that can be found in the LICENSE file
 * in the root directory of this software component.
 * If no LICENSE file comes with this software, it is provided AS-IS.
 */

const LL_COMP_functionsV1 = {
  LL_COMP_SetPowerMode: ["LL_COMP_POWERMODE_HIGH_SPEED"],
/* COMP input minus without default value: INMSEL field default value requires VrefInt scaler enabled
  LL_COMP_ConfigInputs: ["input_minus, LL_COMP_INPUT_PLUS_IO1"],
  LL_COMP_SetInputMinus: ["input_minus"], */
  LL_COMP_SetInputPlus: ["LL_COMP_INPUT_PLUS_IO1"],
  LL_COMP_SetInputHysteresis: ["LL_COMP_HYSTERESIS_NONE"],
  LL_COMP_SetFilteringAnalog: ["LL_COMP_FILT_ANA_DISABLE"],
  LL_COMP_SetFilteringDigital: ["LL_COMP_FILT_DIG_DISABLE"],
  LL_COMP_SetOutputPolarity: ["LL_COMP_OUTPUTPOL_NONINVERTED"],
  LL_COMP_SetOutputBlankingSource: ["LL_COMP_BLANKINGSRC_NONE"],
  LL_COMP_SetFilteringAnalog: ["LL_COMP_FILT_ANA_DISABLE"],
  LL_COMP_DisableIT_OutputTrig: [],
  LL_COMP_SetCommonWindowMode: ["LL_COMP_WINDOW_DISABLE"],
  LL_COMP_SetCommonWindowOutput: ["LL_COMP_WINDOW_OUTPUT_INDEPT"]
};

/**
 * Get the LUT table to optimize the LL code
 * @param {string} ip_version IP version to select the correct LUT table
 * @returns LUT table based on the IP version
 */
function helper_comp_get_lut_table(ip_version) {
  let selectedTable;
  if (ip_version === "COMP_V1") {
    selectedTable = LL_COMP_functionsV1;
  }
  else {
    selectedTable = null;
  }
  return selectedTable;
}

module.exports = {
  helper_comp_get_lut_table,
};
