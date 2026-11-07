/**
 * @file Helpers functions used to optimize the LL code in ICACHE
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

const LL_ICACHE_functionsV1 = {
  LL_ICACHE_SetMode: ["ICACHE", "LL_ICACHE_2WAYS"]
};

/**
 * Get the LUT table to optimize the LL code
 * @param {string} ip_version IP version to select the correct LUT table
 * @returns LUT table based on the IP version
 */
function helper_icache_get_lut_table(ip_version) {
  let selectedTable = LL_ICACHE_functionsV1;
  return selectedTable;
}

module.exports = {
  helper_icache_get_lut_table,
};
