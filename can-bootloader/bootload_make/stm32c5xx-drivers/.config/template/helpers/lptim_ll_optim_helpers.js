/**
 * @file Helpers functions used to optimize the LL code in LPTIM
 * @license
 * Copyright (c) 2024 STMicroelectronics.
 * All rights reserved.
 *
 * This software is licensed under terms that can be found in the LICENSE file
 * in the root directory of this software component.
 * If no LICENSE file comes with this software, it is provided AS-IS.
 */

const LL_LPTIM_functionsV1 = {
  LL_LPTIM_SetClockSource: ["LL_LPTIM_CLK_SOURCE_INTERNAL"],
  LL_LPTIM_SetCounterMode: ["LL_LPTIM_COUNTER_MODE_INTERNAL"],
  LL_LPTIM_SetEncoderMode: ["LL_LPTIM_ENCODER_MODE_RISING"],
  LL_LPTIM_SetPrescaler: ["LL_LPTIM_PRESCALER_DIV1"],
  LL_LPTIM_SetRemap: [["LL_LPTIM_LPTIM1_IC1_RMP_GPIO","LL_LPTIM_LPTIM1_IC2_RMP_GPIO"]],
  LL_LPTIM_SetPrescaler: ["LL_LPTIM_PRESCALER_DIV1"],
  LL_LPTIM_IC_SetPolarity: [["LL_LPTIM_CHANNEL_CH1","LL_LPTIM_CHANNEL_CH2"],["LL_LPTIM_ICPOLARITY_RISING"]],
  LL_LPTIM_IC_SetFilter: [["LL_LPTIM_CHANNEL_CH1","LL_LPTIM_CHANNEL_CH2"],["LL_LPTIM_ICFLT_CLOCK_DIV1"]],
  LL_LPTIM_IC_SetPrescaler: [["LL_LPTIM_CHANNEL_CH1","LL_LPTIM_CHANNEL_CH2"],["LL_LPTIM_ICPSC_DIV1"]],
  LL_LPTIM_OC_SetPolarity: [["LL_LPTIM_CHANNEL_CH1","LL_LPTIM_CHANNEL_CH2"],["LL_LPTIM_OCPOLARITY_HIGH"]],
  LL_LPTIM_CC_SetChannelMode: [["LL_LPTIM_CHANNEL_CH1","LL_LPTIM_CHANNEL_CH2"],["LL_LPTIM_CCMODE_OUTPUT_PWM"]],
  LL_LPTIM_SetInput1Source: ["LL_LPTIM_INPUT1_SRC_GPIO"],
  LL_LPTIM_SetInput2Source: ["LL_LPTIM_INPUT2_SRC_GPIO"],
  LL_LPTIM_SetClockFilter: ["LL_LPTIM_CLK_FILTER_NONE"],
  LL_LPTIM_ConfigClock: [["LL_LPTIM_CLK_FILTER_NONE"],["LL_LPTIM_CLK_POLARITY_RISING"]],
  LL_LPTIM_SetWaveform: ["LL_LPTIM_OC_WAVEFORM_PWM"],
  LL_LPTIM_SetUpdateMode: ["LL_LPTIM_PRELOAD_DISABLED"],
};

/**
 * Get the LUT table to optimize the LL code
 * @param {string} ip_version IP version to select the correct LUT table
 * @returns LUT table based on the IP version
 */
function helper_lptim_get_lut_table(ip_version) {
  let selectedTable = LL_LPTIM_functionsV1;
  return selectedTable;
}

module.exports = {
  helper_lptim_get_lut_table,
};
