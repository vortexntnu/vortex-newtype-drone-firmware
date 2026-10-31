/**
  * @file Helpers functions used to optimize the LL code in DAC
  * @attention
  *
  * Copyright (c) 2025 STMicroelectronics.
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
 *  LL_DAC_Function1: ["ARG1"],         // LL_DAC_Function1(..., ARG1)
 *  LL_DAC_Function2: ["ARG1", "ARG2"], // LL_DAC_Function2(..., ARG1, ARG2)
 *  LL_DAC_Function3: [],               // LL_DAC_Function3(...)
 *  LL_DAC_Function4: [["ARG1_OPT1", "ARG1_OPT2"]]
 *      // LL_DAC_Function3 (..., ARG1_OPT1) or LL_DAC_Function3 (..., ARG1_OPT3)
 * }
 * This LUT table is based on IP version.
 */
/* LUT table defines for IP version V1 */
const LL_DAC_Functions_dacif = {
  LL_DAC_SetHighFrequencyMode: ["LL_DAC_HIGH_FREQ_MODE_DISABLED"],
  LL_DAC_SetTriggerSource: ["LL_DAC_TRIGGER_SOFTWARE"],
  LL_DAC_ConfigOutput: ["LL_DAC_OUTPUT_MODE_NORMAL", "LL_DAC_OUTPUT_BUFFER_ENABLE", "LL_DAC_OUTPUT_CONNECT_EXTERNAL"],
  LL_DAC_SetSignedFormat: ["LL_DAC_SIGN_FORMAT_UNSIGNED"],
  LL_DAC_SetWaveAutoGeneration: ["LL_DAC_WAVE_AUTO_GENERATION_NONE"],
  LL_DAC_SetWaveSawtoothStepTriggerSource: ["LL_DAC_INC_TRIGGER_SOFTWARE"],
  LL_DAC_SetWaveSawtoothResetTriggerSource: ["LL_DAC_TRIGGER_SOFTWARE"],
  LL_DAC_SetWaveSawtoothDirection: ["LL_DAC_SAWTOOTH_DIRECTION_DECREMENT"],
  LL_DAC_SetWaveSawtoothStepData: [0],
  LL_DAC_SetWaveSawtoothResetData: [0],
  LL_DAC_SetWaveTriangleAmplitude: ["LL_DAC_TRIANGLE_AMPLITUDE_1"],
  LL_DAC_SetWaveNoiseLFSR: ["LL_DAC_NOISE_LFSR_UNMASK_BIT0"],
  LL_DAC_SetSampleAndHoldSampleTime: ["0U"],
  LL_DAC_SetSampleAndHoldHoldTime: ["1U"],
  LL_DAC_SetSampleAndHoldRefreshTime: ["1U"],
  LL_DAC_EnableTrigger: [],
  LL_DAC_DisableTrigger: [],
  LL_DAC_EnableDMAReq: [],
  LL_DAC_DisableDMAReq: [],
};

/**
 * Get the LUT table to optimize the LL code
 * @param {string} ip_version IP version to select the correct LUT table
 * @returns LUT table based on the IP version
 */
function helper_dac_get_lut_table(ip_version) {
  let selectedTable;
  selectedTable = LL_DAC_Functions_dacif;
  return selectedTable;
}

module.exports = {
  helper_dac_get_lut_table,
};
