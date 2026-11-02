/**
 * @file Helpers functions used to optimize the LL code in ADC
 * @license
 * Copyright (c) 2024 STMicroelectronics.
 * All rights reserved.
 *
 * This software is licensed under terms that can be found in the LICENSE file
 * in the root directory of this software component.
 * If no LICENSE file comes with this software, it is provided AS-IS.
 */

const LL_ADC_functionsV1 = {
  LL_ADC_REG_SetContinuousMode: ["LL_ADC_REG_CONV_SINGLE"],
  LL_ADC_REG_SetTriggerSource: ["LL_ADC_REG_TRIG_SOFTWARE"],
  LL_ADC_REG_SetSequencerDiscont: ["LL_ADC_REG_SEQ_DISCONT_DISABLE"],
  LL_ADC_REG_SetOverrun: ["LL_ADC_REG_OVR_DATA_PRESERVED"],
  LL_ADC_SetResolution: ["LL_ADC_RESOLUTION_12B"],
  LL_ADC_SetLeftBitShift: ["LL_ADC_LEFT_BIT_SHIFT_NONE"],
  LL_ADC_SetLeftBitShiftReg: ["LL_ADC_LEFT_BIT_SHIFT_NONE"],
  LL_ADC_SetLeftBitShiftInj: ["LL_ADC_LEFT_BIT_SHIFT_NONE"],
  LL_ADC_SetLowPowerMode: ["LL_ADC_LP_MODE_NONE"],
  LL_ADC_SetGainCompensation: [4096],
  LL_ADC_SetSamplingMode: ["LL_ADC_SAMPLING_MODE_NORMAL"],
  LL_ADC_REG_SetSequencerLength:["LL_ADC_REG_SEQ_SCAN_DISABLE"],
  LL_ADC_REG_SetDataTransferMode: ["LL_ADC_REG_DR_TRANSFER"],
  LL_ADC_INJ_SetTriggerSource: ["LL_ADC_INJ_TRIG_SOFTWARE"],
  LL_ADC_INJ_SetSequencerLength: ["LL_ADC_INJ_SEQ_SCAN_DISABLE"],
  LL_ADC_INJ_SetSequencerDiscont: ["LL_ADC_INJ_SEQ_DISCONT_DISABLE"],
  LL_ADC_INJ_SetTrigAuto: ["LL_ADC_INJ_TRIG_INDEPENDENT"],
  LL_ADC_SetOverSamplingScope: ["LL_ADC_OVS_DISABLE"],
  LL_ADC_SetOverSamplingInstScope: ["LL_ADC_OVS_1","LL_ADC_OVS_DISABLE"],
  LL_ADC_SetOverSamplingDiscont: ["LL_ADC_OVS_CONT"],
  LL_ADC_SetOverSamplingInjDiscont: ["LL_ADC_OVS_CONT"],
  LL_ADC_SetOverSamplingInjIntermAcc: ["LL_ADC_OVS_INTERM_ACC_DISABLE"],
  LL_ADC_SetAnalogWDFiltering: ["LL_ADC_AWD_1","LL_ADC_AWD_FILTERING_NONE"],
  LL_ADC_SetAnalogWDFiltering: ["LL_ADC_AWD_2","LL_ADC_AWD_FILTERING_NONE"],
  LL_ADC_SetAnalogWDFiltering: ["LL_ADC_AWD_3","LL_ADC_AWD_FILTERING_NONE"]
};

/**
 * Get the LUT table to optimize the LL code
 * @param {string} ip_version IP version to select the correct LUT table
 * @returns LUT table based on the IP version
 */
function helper_adc_get_lut_table(ip_version) {
  let selectedTable = LL_ADC_functionsV1;
  return selectedTable;
}

module.exports = {
  helper_adc_get_lut_table,
};
