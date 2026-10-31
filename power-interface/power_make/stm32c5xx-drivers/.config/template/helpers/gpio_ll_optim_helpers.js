/**
 * @file Helpers functions used to optimize the LL code in GPIO
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

const LL_GPIO_functions_common = {
  LL_GPIO_SetPinSpeed: ["LL_GPIO_SPEED_FREQ_LOW"],
  LL_GPIO_SetPinOutputType: ["LL_GPIO_OUTPUT_PUSHPULL"],
  LL_GPIO_SetPinPull: ["LL_GPIO_PULL_NO"],
  LL_GPIO_SetAFPin_0_7: ["LL_GPIO_AF_0"],
  LL_GPIO_SetAFPin_8_15: ["LL_GPIO_AF_0"],
  LL_GPIO_SetPinMode: ["LL_GPIO_MODE_ANALOG"],
  LL_GPIO_WriteOutputPin: ["LL_GPIO_PIN_RESET"],
};

const LL_GPIO_functions_PA13 = {
  LL_GPIO_SetPinSpeed: ["LL_GPIO_SPEED_FREQ_VERY_HIGH"],
  LL_GPIO_SetPinOutputType: ["LL_GPIO_OUTPUT_PUSHPULL"],
  LL_GPIO_SetPinPull: ["LL_GPIO_PULL_UP"],
  LL_GPIO_SetAFPin_0_7: ["LL_GPIO_AF_0"],
  LL_GPIO_SetAFPin_8_15: ["LL_GPIO_AF_0"],
  LL_GPIO_SetPinMode: ["LL_GPIO_MODE_ALTERNATE"],
  LL_GPIO_WriteOutputPin: ["LL_GPIO_PIN_RESET"],
};

const LL_GPIO_functions_PA14 = {
  LL_GPIO_SetPinSpeed: ["LL_GPIO_SPEED_FREQ_LOW"],
  LL_GPIO_SetPinOutputType: ["LL_GPIO_OUTPUT_PUSHPULL"],
  LL_GPIO_SetPinPull: ["LL_GPIO_PULL_DOWN"],
  LL_GPIO_SetAFPin_0_7: ["LL_GPIO_AF_0"],
  LL_GPIO_SetAFPin_8_15: ["LL_GPIO_AF_0"],
  LL_GPIO_SetPinMode: ["LL_GPIO_MODE_ALTERNATE"],
  LL_GPIO_WriteOutputPin: ["LL_GPIO_PIN_RESET"],
};

const LL_GPIO_functions_PA15_B4 = {
  LL_GPIO_SetPinSpeed: ["LL_GPIO_SPEED_FREQ_LOW"],
  LL_GPIO_SetPinOutputType: ["LL_GPIO_OUTPUT_PUSHPULL"],
  LL_GPIO_SetPinPull: ["LL_GPIO_PULL_UP"],
  LL_GPIO_SetAFPin_0_7: ["LL_GPIO_AF_0"],
  LL_GPIO_SetAFPin_8_15: ["LL_GPIO_AF_0"],
  LL_GPIO_SetPinMode: ["LL_GPIO_MODE_ALTERNATE"],
  LL_GPIO_WriteOutputPin: ["LL_GPIO_PIN_RESET"],
};

const LL_GPIO_functions_PB3 = {
  LL_GPIO_SetPinSpeed: ["LL_GPIO_SPEED_FREQ_VERY_HIGH"],
  LL_GPIO_SetPinOutputType: ["LL_GPIO_OUTPUT_PUSHPULL"],
  LL_GPIO_SetPinPull: ["LL_GPIO_PULL_NO"],
  LL_GPIO_SetAFPin_0_7: ["LL_GPIO_AF_0"],
  LL_GPIO_SetAFPin_8_15: ["LL_GPIO_AF_0"],
  LL_GPIO_SetPinMode: ["LL_GPIO_MODE_ALTERNATE"],
  LL_GPIO_WriteOutputPin: ["LL_GPIO_PIN_RESET"],
};

/**
 * Get the LUT table to optimize the LL code
 * @param {string} ip_version IP version to select the correct LUT table
 * @returns LUT table based on the IP version
 */
function helper_gpio_get_lut_table(ip_version) {
  let selectedTable = LL_GPIO_functions_common;

  if (ip_version === "PA13_lut") {
    selectedTable = LL_GPIO_functions_PA13;
  } else if (ip_version === "PA14_lut") {
    selectedTable = LL_GPIO_functions_PA14;
  } else if (ip_version === "PA15_PB4_lut") {
    selectedTable = LL_GPIO_functions_PA15_B4;
  } else if (ip_version === "PB3_lut") {
    selectedTable = LL_GPIO_functions_PB3;
  }

  return selectedTable;
}

module.exports = {
    helper_gpio_get_lut_table,
};