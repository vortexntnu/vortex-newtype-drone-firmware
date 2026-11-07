/**
 * @file Helpers functions used to optimize the LL code in EXTI
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

const LL_EXTI_functionsV1 = {
  LL_EXTI_DisableRisingTrig_0_31: [],
  LL_EXTI_DisableFallingTrig_0_31: [],
  LL_EXTI_DisableRisingTrig_32_63: [],
  LL_EXTI_DisableFallingTrig_32_63: [],
  LL_EXTI_DisableRisingTrig_64_95: [],
  LL_EXTI_DisableFallingTrig_64_95: [],
  LL_EXTI_SetEXTISource: [["LL_EXTI_GPIO_PORTA"], ["LL_EXTI_GPIO_LINE0", "LL_EXTI_GPIO_LINE1", "LL_EXTI_GPIO_LINE2", "LL_EXTI_GPIO_LINE3", "LL_EXTI_GPIO_LINE4", "LL_EXTI_GPIO_LINE5", "LL_EXTI_GPIO_LINE6", "LL_EXTI_GPIO_LINE7", "LL_EXTI_GPIO_LINE8", "LL_EXTI_GPIO_LINE9", "LL_EXTI_GPIO_LINE10", "LL_EXTI_GPIO_LINE11", "LL_EXTI_GPIO_LINE12", "LL_EXTI_GPIO_LINE13", "LL_EXTI_GPIO_LINE14", "LL_EXTI_GPIO_LINE15"]],
};

/**
 * Get the LUT table to optimize the LL code
 * @param {string} ip_version IP version to select the correct LUT table
 * @returns LUT table based on the IP version
 */
function helper_exti_get_lut_table(ip_version) {
  let selectedTable = LL_EXTI_functionsV1;
  return selectedTable;
}

module.exports = {
  helper_exti_get_lut_table,
};