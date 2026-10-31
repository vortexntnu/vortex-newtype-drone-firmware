/**
  * @file Helpers functions used to optimize the LL code in I2C
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

/**
 * LUT table used to detect if the LL code must be commented or not
 * Format is:
 * - a key of LL function
 * - for each key, define the list of arguments which link to reset values
 * {
 *  LL_TIM_Function1: ["ARG1"],         // LL_TIM_Function1(..., ARG1)
 *  LL_TIM_Function2: ["ARG1", "ARG2"], // LL_TIM_Function2(..., ARG1, ARG2)
 *  LL_TIM_Function3: [],               // LL_TIM_Function3(...)
 *  LL_TIM_Function4: [["ARG1_OPT1", "ARG1_OPT2"]]
 *      // LL_TIM_Function4 (..., ARG1_OPT1) or LL_TIM_Function4 (..., ARG1_OPT2)
 * }
 *
 * Matching rules:
 * - string values are matched exactly
 * - RegExp values are matched strictly against the whole argument value
 * - array values mean that one of the listed candidates is accepted for this argument
 * - arguments containing bitwise OR ('|') must be written explicitly in the LUT
 * - RegExp values must not be used to match only part of an argument or to infer
 * - bitwise OR combinations implicitly
 *
 * This LUT table is based on IP version.
 */

/* Common LUT table defines for IP version Vx_y */
const LL_TIM_functionsCommon = {
  LL_TIM_SetPrescaler: [0],
  LL_TIM_SetCounterMode: ["LL_TIM_COUNTERMODE_UP"],
  LL_TIM_SetClockDivision: ["LL_TIM_CLOCKDIVISION_DIV1"],
  LL_TIM_SetClockDivision2: ["LL_TIM_CLOCKDIVISION2_DIV1"],
  LL_TIM_SetRepetitionCounter: [0],
  LL_TIM_SetClockSource: ["LL_TIM_CLK_INTERNAL"],
  LL_TIM_SetTriggerInput: ["LL_TIM_TS_ITR0"],
  LL_TIM_SetETRSource: [/^LL_TIM_TIM\d+_ETR_IN_GPIO$/],
  LL_TIM_OC_SetPolarity: ["LL_TIM_OCPOLARITY_HIGH"],
  LL_TIM_OC_SetIdleState: ["LL_TIM_OCIDLESTATE_RESET"],
  LL_TIM_OC_SetOverrideState: ["LL_TIM_OCOVERRIDE_RESET"],
  LL_TIM_OC_SetBreakMode: ["LL_TIM_OCBREAKMODE_IMMEDIATE"],
  LL_TIM_OC_SetMode: ["LL_TIM_OCMODE_FROZEN"],
  LL_TIM_OC_SetCompareValue: [[0, "(0 << 4U) | 0"]],
  LL_TIM_IC_SetSource: [/^LL_TIM_TIM\d+_TI\d+_GPIO$/],
  LL_TIM_SetUpdateSource: ["LL_TIM_UPDATESOURCE_REGULAR"],
  LL_TIM_EnableUpdateEvent: [],
  LL_TIM_IC_SetXORGatePosition: ["LL_TIM_IC_XOR_GATE_POS_DIRECT"],
  LL_TIM_SetSlaveMode: ["LL_TIM_SLAVEMODE_DISABLED"],
  LL_TIM_SetTriggerOutput: ["LL_TIM_TRGO_RESET"],
  LL_TIM_SetTriggerOutput2: ["LL_TIM_TRGO2_RESET"],
  LL_TIM_SetTriggerOutput2Postscaler: [0],
  LL_TIM_SetSMSPreloadSource: ["LL_TIM_SLAVE_MODE_PRELOAD_UPDATE"],
  LL_TIM_CC_SetUpdate: ["LL_TIM_CCUPDATESOURCE_SOFTWARE"],
  LL_TIM_SetOffStates: ["LL_TIM_OSSI_DISABLE", "LL_TIM_OSSR_DISABLE"],
  LL_TIM_SetBreakDelay: [["LL_TIM_BREAK_DELAY1", "LL_TIM_BREAK_DELAY2"], 0],
  LL_TIM_SetBreakInputSourcePolarity: [[/LL_TIM_TIM\d+_BRK_[A-Z0-9_]+/, /LL_TIM_TIM\d+_BRK2_[A-Z0-9_]+/], "LL_TIM_BREAK_INPUT_SRC_NONINVERTED"],
  LL_TIM_EnableBreakInputSource: [[/^LL_TIM_TIM\d+_BRK_GPIO$/, /^LL_TIM_TIM\d+_BRK2_GPIO$/]],
  LL_TIM_OC_SetDeadTime: [0],
  LL_TIM_SetFallingDeadTime: [0],
  LL_TIM_OC_SetPulseWidth: [0],
  LL_TIM_OC_SetPulseWidthPrescaler: ["LL_TIM_PWPRSC_DIV1"],
  LL_TIM_CC_SetDMAReqTrigger: ["LL_TIM_CCDMAREQUEST_CC"],
  LL_TIM_CC_SetLockLevel: ["LL_TIM_LOCKLEVEL_OFF"]
};

/* LUT table defines for IP version V3_x */
const LL_TIM_functionsV3_x = {
  ...LL_TIM_functionsCommon,
  LL_TIM_ConfigETR: ["LL_TIM_ETR_POLARITY_NONINVERTED", "LL_TIM_ETR_PRESCALER_DIV1", "LL_TIM_ETR_FILTER_FDIV1"],
  LL_TIM_ConfigEncoderIndex: ["LL_TIM_INDEX_UP_DOWN | LL_TIM_INDEX_ALL | LL_TIM_INDEX_POSITION_DOWN_DOWN"],
  LL_TIM_ConfigBRK: ["LL_TIM_BREAK_POLARITY_LOW", "LL_TIM_BREAK_FILTER_FDIV1", "LL_TIM_BREAK_AFMODE_INPUT"],
  LL_TIM_ConfigBRK2: ["LL_TIM_BREAK2_POLARITY_LOW", "LL_TIM_BREAK2_FILTER_FDIV1", "LL_TIM_BREAK2_AFMODE_INPUT"],
  LL_TIM_ConfigDMABurst: ["LL_TIM_DMABURST_BASEADDR_CR1", "LL_TIM_DMABURST_LENGTH_1TRANSFER"],
};

/* LUT table defines for IP version V4_x */
const LL_TIM_functionsV4_x = {
  ...LL_TIM_functionsCommon,
  LL_TIM_ConfigETR: ["LL_TIM_ETR_POLARITY_NONINVERTED", "LL_TIM_ETR_PRESCALER_DIV1", "LL_TIM_ETR_FILTER_FDIV1"],
  LL_TIM_ConfigEncoderIndex: ["LL_TIM_INDEX_UP_DOWN | LL_TIM_INDEX_BLANK_ALWAYS | LL_TIM_INDEX_ALL | LL_TIM_INDEX_POSITION_DOWN_DOWN"],
  LL_TIM_ConfigBRK: ["LL_TIM_BREAK_POLARITY_LOW", "LL_TIM_BREAK_FILTER_FDIV1", "LL_TIM_BREAK_AFMODE_INPUT"],
  LL_TIM_ConfigBRK2: ["LL_TIM_BREAK2_POLARITY_LOW", "LL_TIM_BREAK2_FILTER_FDIV1", "LL_TIM_BREAK2_AFMODE_INPUT"],
  LL_TIM_ConfigDMABurst: ["LL_TIM_DMABURST_BASEADDR_CR1", "LL_TIM_DMABURST_LENGTH_1TRANSFER", "LL_TIM_DMABURST_UPD"],
};

/* LUT table defines for IP version V5_x */
const LL_TIM_functionsV5_x = {
  ...LL_TIM_functionsCommon,
  LL_TIM_ConfigETR: ["LL_TIM_ETR_POLARITY_NONINVERTED", "LL_TIM_ETR_PRESCALER_DIV1 | LL_TIM_ETR_SYNC_PRESCALER_DIV1", "LL_TIM_ETR_FILTER_FDIV1"],
  LL_TIM_ConfigEncoderIndex: ["LL_TIM_INDEX_UP_DOWN | LL_TIM_INDEX_BLANK_ALWAYS | LL_TIM_INDEX_ALL | LL_TIM_INDEX_POSITION_DOWN_DOWN"],
  LL_TIM_ConfigBRK: ["LL_TIM_BREAK_POLARITY_LOW", "LL_TIM_BREAK_FILTER_FDIV1", "LL_TIM_BREAK_AFMODE_INPUT"],
  LL_TIM_ConfigBRK2: ["LL_TIM_BREAK2_POLARITY_LOW", "LL_TIM_BREAK2_FILTER_FDIV1", "LL_TIM_BREAK2_AFMODE_INPUT"],
  LL_TIM_ConfigDMABurst: ["LL_TIM_DMABURST_BASEADDR_CR1", "LL_TIM_DMABURST_LENGTH_1TRANSFER", "LL_TIM_DMABURST_UPD"],
};

/**
 * Get the LUT table to optimize the LL code
 * @param {string|number} ip_version IP version to select the correct LUT table
 * @note The IP version must start with the major version (e.g. "4.5", 4.5, 4)
 * @returns LUT table based on the IP version
 */
function helper_tim_get_lut_table(ip_version) {
  const major_version = parseInt(ip_version, 10); // Get the major version (e.g. 5 from 5.0, 10 from 10.2)
  if (!Number.isInteger(major_version)) {
    return null;
  }
  const tables = {
    3: LL_TIM_functionsV3_x,
    4: LL_TIM_functionsV4_x,
    5: LL_TIM_functionsV5_x,
  };
  return tables[major_version] || null;
}

module.exports = {
  helper_tim_get_lut_table
};