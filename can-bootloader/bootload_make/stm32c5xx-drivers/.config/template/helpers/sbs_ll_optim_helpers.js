/**
 * @file Helpers functions used to optimize the LL code in SBS
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

const LL_SBS_functionsV1 = {
  LL_SBS_SetAnalogIOSwitchSupply: ["LL_SBS_VDDA_SUPPLY"],
  LL_SBS_SetCompensationCellCodeSrc: [["LL_SBS_CCELL_VDDIO", "LL_SBS_CCELL_VDDXSPI1IO", "LL_SBS_CCELL_VDDXSPI2IO"], ["LL_SBS_CCELL_CODE_DEFAULT"]],
  LL_SBS_SetxMOSVddIOCompensationCellCode: [[7], [8]],
  LL_SBS_SetxMOSVddXSPI1IOCompensationCellCode: [[7], [8]],
  LL_SBS_SetxMOSVddXSPI2IOCompensationCellCode: [[7], [8]],
  LL_SBS_SetEPOCHSelection: ["LL_SBS_EPOCH_SEL_NONSECURE"],
  LL_SBS_SetETHExternalPHYInterruptPolarity: [["LL_SBS_PERIPH_ETH1"], ["LL_SBS_ETHPHY_IT_POL_ACTIVE_HIGH"]],
  LL_SBS_SetETHPHYInterface: [["LL_SBS_PERIPH_ETH1"], ["LL_SBS_ETHPHY_ITF_GMII_MII"]],
  LL_SBS_SetEXTISource: [["LL_SBS_EXTI_GPIO_PORTA"], [/LL_SBS_EXTI_GPIO_LINE\d/]],
};

/**
 * Get the LUT table to optimize the LL code
 * @param {string} ip_version IP version to select the correct LUT table
 * @returns LUT table based on the IP version
 */
function helper_sbs_get_lut_table(ip_version) {
  let selectedTable = LL_SBS_functionsV1;
  return selectedTable;
}

module.exports = {
  helper_sbs_get_lut_table,
};