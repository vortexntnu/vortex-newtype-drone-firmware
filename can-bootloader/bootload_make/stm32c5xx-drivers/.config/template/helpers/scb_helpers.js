/**
 * @file CORTEX/SCB Helpers functions to provide service to the HAL components
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
 * @brief Generate SCB enabled faults configuration string based on fault_management object and driver level.
 *
 * @param {object} fault_management  Object with boolean properties enable_usage_fault, enable_bus_fault, etc.
 * @param {string} driverLevel       Driver level string: 'LL' or 'HAL'.
 * @param {string} is_mpu_enabled    Indicates if MPU is enabled.
 *
 * @returns {string} Bitwise OR '|' joined string of enabled faults, or 'NONE' if all faults are disabled.
 *
 * @note
 * - Fault enabled = true means the corresponding fault enable should be set.
 * - Fault disabled = false means do not set that fault.
 * - The returned string can be used directly in C code to configure SCB fault enable bits.
 */
function helper_cortex_scb_get_enable_fault(fault_management, driverLevel, is_mpu_enabled) {
  console.info(`helper_cortex_scb_get_enable_fault`);

  try {
    if (typeof fault_management !== 'object' || fault_management === null) {
      console.warn(`helper_cortex_scb_get_enable_fault: invalid input`);
      return '';
    }

    if (typeof driverLevel !== 'string' || (driverLevel.toUpperCase() !== 'LL' && driverLevel.toUpperCase() !== 'HAL')) {
      throw new Error("Invalid or missing driverLevel argument: expected 'LL' or 'HAL'");
    }

    // Define enabled faults map for LL driver
    const enableFaultsMapLL = {
      enable_usage_fault:         'SCB_SHCSR_USGFAULTENA_Msk',
      enable_bus_fault:           'SCB_SHCSR_BUSFAULTENA_Msk',
      enable_mem_management_fault: 'SCB_SHCSR_MEMFAULTENA_Msk',
    };

    // Define enabled faults map for HAL driver (placeholders, adjust as needed)
    const enableFaultsMapHAL = {
      enable_usage_fault:         'HAL_CORTEX_SCB_USAGE_FAULT',
      enable_bus_fault:           'HAL_CORTEX_SCB_BUS_FAULT',
      enable_mem_management_fault: 'HAL_CORTEX_SCB_MEM_MANAGEMENT_FAULT',
    };

    // Select map based on driverLevel argument (case-insensitive)
    let enableFaultsMap;
    switch (driverLevel.toUpperCase()) {
      case 'HAL':
        enableFaultsMap = enableFaultsMapHAL;
        break;
      case 'LL':
      default:
        enableFaultsMap = enableFaultsMapLL;
        break;
    }

    let enabledFaults = [];

    // If a fault is enabled (true), add the corresponding symbol
    for (const [key, symbol] of Object.entries(enableFaultsMap)) {
      // For memory management fault, only consider it if MPU is not enabled
      if (!(key === 'enable_mem_management_fault' && is_mpu_enabled === true)) {
        if (fault_management[key] === true) {
          enabledFaults.push(symbol);
        }
      }
    }

    if (enabledFaults.length === 0) {
      return 'NONE';
    }

    const result = enabledFaults.join(' | ');
    console.info(`helper_cortex_scb_get_enable_fault: enabledFaults = ${result}`);
    return result;

  } catch (e) {
    console.error(`helper_cortex_scb_get_enable_fault: ${e}`);
    return '';
  }
}

module.exports = {
  helper_cortex_scb_get_enable_fault
};
