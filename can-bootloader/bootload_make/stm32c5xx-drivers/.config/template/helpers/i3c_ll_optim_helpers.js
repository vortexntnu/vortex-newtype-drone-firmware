/**
  * @file Helpers functions used to optimize the LL code in I3C
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
 *  LL_I3C_Function1: ["ARG1"],         // LL_I3C_Function1(..., ARG1)
 *  LL_I3C_Function2: ["ARG1", "ARG2"], // LL_I3C_Function2(..., ARG1, ARG2)
 *  LL_I3C_Function3: [],               // LL_I3C_Function3(...)
 *  LL_I3C_Function4: [["ARG1_OPT1", "ARG1_OPT2"]]
 *      // LL_I3C_Function3 (..., ARG1_OPT1) or LL_I3C_Function3 (..., ARG1_OPT3)
 * }
 * This LUT table is based on IP version.
 */
/* LUT table defines for IP version V1 */
const LL_I3C_Functions_V1 = {
  LL_I3C_SetMode: ["LL_I3C_MODE_TARGET"],
  LL_I3C_ConfigClockWaveForm: ["0x00000000U"],
  LL_I3C_SetBusCharacteristic: ["0x00000000U"],
  LL_I3C_ConfigStallTime: ["0U", "LL_I3C_CTRL_STALL_NONE"],
  LL_I3C_ConfigCtrlFifo: ["LL_I3C_RXFIFO_THRESHOLD_1_8", "LL_I3C_TXFIFO_THRESHOLD_1_8", "LL_I3C_CTRL_FIFO_NONE"],
  LL_I3C_SetDeviceCharacteristics: ["0U"],
  LL_I3C_SetMIPIInstanceID: ["0U"],
  LL_I3C_ConfigPayloadEntDAA: ["LL_I3C_NO_DATA_SPEED_LIMITATION", "LL_I3C_IBI_NO_ADDITIONAL_DATA", "LL_I3C_DEVICE_ROLE_AS_TARGET"],
  LL_I3C_SetNbIBIAddData: ["LL_I3C_PAYLOAD_EMPTY"],
  LL_I3C_SetGrpAddrHandoffSupport: ["LL_I3C_HANDOFF_GRP_ADDR_NOT_SUPPORTED"],
  LL_I3C_SetMaxReadLength: ["0U"],
  LL_I3C_SetMaxWriteLength: ["0U"],
  LL_I3C_ConfigTgtFifo: ["LL_I3C_RXFIFO_THRESHOLD_1_8", "LL_I3C_TXFIFO_THRESHOLD_1_8"],
  LL_I3C_SetConfigGETMXDS: ["LL_I3C_HANDOFF_ACTIVITY_STATE_0", "LL_I3C_GETMXDS_FORMAT_1", "LL_I3C_TURNAROUND_TIME_TSCO_LESS_12NS", "0U"]
};

/**
 * Get the LUT table to optimize the LL code
 * @param {string} ip_version IP version to select the correct LUT table
 * @returns LUT table based on the IP version
 */
function helper_i3c_get_lut_table(ip_version) {
  let selectedTable = LL_I3C_Functions_V1;
  return selectedTable;
}

module.exports = {
  helper_i3c_get_lut_table,
};
