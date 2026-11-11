/**
  * @file Helpers functions used to optimize the LL code in CORDIC
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
 *  LL_CORDIC_Function1: ["ARG1"],         // LL_CORDIC_Function1(..., ARG1)
 *  LL_CORDIC_Function2: ["ARG1", "ARG2"], // LL_CORDIC_Function2(..., ARG1, ARG2)
 *  LL_CORDIC_Function3: [],               // LL_CORDIC_Function3(...)
 *  LL_CORDIC_Function4: [["ARG1_OPT1", "ARG1_OPT2"]]
 *      // LL_CORDIC_Function3 (..., ARG1_OPT1) or LL_CORDIC_Function3 (..., ARG1_OPT3)
 * }
 * This LUT table is based on IP version.
 */
/* LUT table defines for IP version V1 */
const LL_CORDIC_Functions_V1 = {
  LL_CORDIC_SetFunction:  ["LL_CORDIC_FUNCTION_COSINE"],
  LL_CORDIC_SetPrecision: ["LL_CORDIC_PRECISION_5_CYCLE"],
  LL_CORDIC_SetScale:     ["LL_CORDIC_SCALING_FACTOR_0"],
  LL_CORDIC_SetNbWrite:   ["LL_CORDIC_NBWRITE_1"],
  LL_CORDIC_SetNbRead:    ["LL_CORDIC_NBREAD_1"],
  LL_CORDIC_SetInWidth:   ["LL_CORDIC_INWIDTH_32_BIT"],
  LL_CORDIC_SetOutWidth:  ["LL_CORDIC_OUTWIDTH_32_BIT"],
};

/**
 * Get the LUT table to optimize the LL code
 * @param {string} ip_version IP version to select the correct LUT table
 * @returns LUT table based on the IP version
 */
function helper_cordic_get_lut_table(ip_version) {
  let selectedTable;
  if (ip_version === "V1") {
  selectedTable = LL_CORDIC_Functions_V1;
  }
  return selectedTable;
}

module.exports = {
  helper_cordic_get_lut_table,
};