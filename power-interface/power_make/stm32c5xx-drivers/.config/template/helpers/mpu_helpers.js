/**
 * @file CORTEX/MPU Helpers functions to provide service to the HAL components
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
 * @brief Retrieve the list of MPU attributes actually used by regions.
 *
 * @param {Array<object>} regions     Array of MPU region objects, each potentially referencing an attribute number.
 * @param {Array<object>} attributes  Array of all attribute objects.
 *
 * @returns {Array<object>} Filtered array of attribute objects that are referenced by at least one used region.
 *
 * @note
 * - Only regions with 'use_region' set to true are considered.
 * - attributes not referenced by any region are excluded.
 * - Returned attributes retain all their original properties for code generation.
 *
 * Usage:
 * - Use the returned filtered attributes to generate MPU attribute configuration code.
 */
function helper_cortex_mpu_get_used_attributes(regions, attributes) {
  console.info(`helper_cortex_mpu_get_used_attributes`);

  let filteredAttributes = [];

  try {
    console.info(`helper_cortex_mpu_get_used_attributes: regions=${JSON.stringify(regions)}`);

    // Collect unique attribute numbers referenced by used regions
    const usedattribute_numbers = new Set();

    regions.forEach(region => {
      if (region.use_region && region.attribute_number !== undefined && region.attribute_number !== null) {
        usedattribute_numbers.add(region.attribute_number);
      }
    });

    // Convert to sorted array of attribute keys matching '_foreignKey' format
    const usedKeys = Array.from(usedattribute_numbers)
      .sort((a, b) => a - b)
      .map(num => `ATTR_${num}`);

    console.info(`helper_cortex_mpu_get_used_attributes: usedKeys=${JSON.stringify(usedKeys)}`);

    // Filter attributes to only those used by regions
    filteredAttributes = attributes.filter(attr => usedKeys.includes(attr._foreignKey));

  } catch (e) {
    console.error(`helper_cortex_mpu_get_used_attributes: ${e}`);
  }

  console.info(`helper_cortex_mpu_get_used_attributes: filteredAttributes=${JSON.stringify(filteredAttributes)}`);

  return filteredAttributes;
}

/**
  * @brief Check whether the declared MPU region is overlapping with other regions.
  *
  * @param {object} thisRegion: The MPU region to check for overlaps. Should have 'base_address' and 'limit_address' properties.
  * @param {Array<object>} otherRegions: Array of other MPU region objects to check against.
  *
  * @returns {boolean} True if overlapping with any other region, false otherwise.
  */
function helper_cortex_is_overlapping(thisRegion, otherRegions) {
  const parseAddress = (val, label, regionId) => {
    let n = Number(val);
    console.info(`The region address type is ${typeof val} for ${label}='${val}'`);
    if (Number.isNaN(n)) {
      console.error(`Failed to parse ${label}='${val}' for region id=${regionId}`);
      return undefined;
    }
    return n;
  };

  try {
    console.info(`thisRegion raw=${JSON.stringify(thisRegion)}`);
    if (!thisRegion || typeof thisRegion !== 'object') {
      console.warn(`helper_cortex_is_overlapping: invalid thisRegion`);
      return false;
    }

    console.info(`otherRegions length=${otherRegions.length}`);
    console.info(`otherRegions raw=${JSON.stringify(otherRegions)}`);

    if (!thisRegion.use_region) {
      console.info(`helper_cortex_is_overlapping: thisRegion is not used, skipped`);
      return false;
    }

    const thisBase = parseAddress(thisRegion.base_address, 'this.base_address', thisRegion._foreignKey);
    const thisLimit = parseAddress(thisRegion.limit_address, 'this.limit_address', thisRegion._foreignKey);

    console.info(`thisRegion parsed: base=${thisBase} limit=${thisLimit}`);

    if (thisBase === undefined || thisLimit === undefined) {
      console.warn(`helper_cortex_is_overlapping: thisRegion has invalid addresses`);
      return false;
    }

    let checkedCount = 0;

    for (const otherRegion of otherRegions) {
      if (otherRegion._foreignKey === thisRegion._foreignKey) {
        console.info(`helper_cortex_is_overlapping: skipping self region id=${otherRegion._foreignKey}`);
        continue;
      }

      if (!otherRegion.use_region) {
        continue;
      }

      const otherBase = parseAddress(otherRegion.base_address, 'other.base_address', otherRegion._foreignKey);
      const otherLimit = parseAddress(otherRegion.limit_address, 'other.limit_address', otherRegion._foreignKey);
      if (otherBase === undefined || otherLimit === undefined) {
        continue;
      }

      checkedCount++;
      const conditionA = thisBase <= otherLimit;
      const conditionB = otherBase <= thisLimit;

      if (conditionA && conditionB) {
        console.info(`helper_cortex_is_overlapping: Overlap detected with region id=${otherRegion._foreignKey}`);
        return true;
      }
    }

    console.info(`helper_cortex_is_overlapping: No overlap. Regions checked=${checkedCount}/${otherRegions.length}`);
    return false;
  } catch (e) {
    console.error(`helper_cortex_is_overlapping exception: ${e.message}`);
    return false;
  }
}

/**
 * Returns the string representation of the numeric or symbolic value corresponding
 * to a given HAL Cortex MPU macro name, with all shift expressions pre-evaluated.
 *
 * If the hal_value matches "REGION_x" or "ATTR_x" where x is a number, returns x as string.
 *
 * @param   {string} hal_value - The HAL macro name as a string
 * @returns {string|undefined} - String representing the numeric value or symbolic macro
 */
function helper_cortex_mpu_get_arm_cmsis_value(hal_value) {
  try{
    console.info(`helper_cortex_mpu_get_arm_cmsis_value called with hal_value='${hal_value}'`);

    if (typeof hal_value !== "string") {
      return undefined;
    }

    // Check if hal_value matches REGION_x or ATTR_x pattern and return number x as string
    const regionMatch = hal_value.match(/^REGION_(\d+)$/);
    if (regionMatch) {
      return regionMatch[1];
    }
    const attrMatch = hal_value.match(/^ATTR_(\d+)$/);
    if (attrMatch) {
      return attrMatch[1];
    }

    const baseMap = {
      "HAL_CORTEX_MPU_ACCESS_FAULT_ALL": "0x00",
      "HAL_CORTEX_MPU_ACCESS_FAULT_ONLY_PRIV": "MPU_CTRL_PRIVDEFENA_Msk",
      "HAL_CORTEX_MPU_HARDFAULT_NMI_DISABLE": "0x00",
      "HAL_CORTEX_MPU_HARDFAULT_NMI_ENABLE": "MPU_CTRL_HFNMIENA_Msk",
      "HAL_CORTEX_MPU_EXECUTION_ATTR_DISABLE": "ARM_MPU_XN",
      "HAL_CORTEX_MPU_EXECUTION_ATTR_ENABLE": "ARM_MPU_EX",
      "HAL_CORTEX_MPU_DISABLED": "0x00",
      "HAL_CORTEX_MPU_ENABLED": "0x01",
      "HAL_CORTEX_MPU_REGION_DISABLED": "0x00",
      "HAL_CORTEX_MPU_REGION_ENABLED": "0x01",
    };

    const memAttrMap = {
      "HAL_CORTEX_MPU_DEVICE_MEM_NGNRNE": "ARM_MPU_ATTR_DEVICE_nGnRnE",
      "HAL_CORTEX_MPU_DEVICE_MEM_NGNRE": "ARM_MPU_ATTR_DEVICE_nGnRE",
      "HAL_CORTEX_MPU_DEVICE_MEM_NGRE": "ARM_MPU_ATTR_DEVICE_nGRE",
      "HAL_CORTEX_MPU_DEVICE_MEM_GRE": "ARM_MPU_ATTR_DEVICE_GRE",
      "HAL_CORTEX_MPU_NORMAL_MEM_NCACHEABLE": "MPU_ATTR_NORMAL_OUTER_NON_CACHEABLE",
      "HAL_CORTEX_MPU_NORMAL_MEM_WT_NOA": "0x8",
      "HAL_CORTEX_MPU_NORMAL_MEM_WT_WA": "MPU_ATTR_NORMAL_OUTER_WT_WA",
      "HAL_CORTEX_MPU_NORMAL_MEM_WT_RA": "MPU_ATTR_NORMAL_OUTER_WT_RA",
      "HAL_CORTEX_MPU_NORMAL_MEM_WT_RWA": "MPU_ATTR_NORMAL_OUTER_WT_RA_WA",
      "HAL_CORTEX_MPU_NORMAL_MEM_WB_NOA": "0xC",
      "HAL_CORTEX_MPU_NORMAL_MEM_WB_WA": "MPU_ATTR_NORMAL_OUTER_WB_WA",
      "HAL_CORTEX_MPU_NORMAL_MEM_WB_RA": "MPU_ATTR_NORMAL_OUTER_WB_RA",
      "HAL_CORTEX_MPU_NORMAL_MEM_WB_RWA": "MPU_ATTR_NORMAL_OUTER_WB_RA_WA",
    };

    const regionAccessAttrMap = {
      "HAL_CORTEX_MPU_REGION_ONLY_PRIV_RW": "ARM_MPU_AP_RW, ARM_MPU_AP_PO",
      "HAL_CORTEX_MPU_REGION_ALL_RW": "ARM_MPU_AP_RW, ARM_MPU_AP_NP",
      "HAL_CORTEX_MPU_REGION_ONLY_PRIV_RO": "ARM_MPU_AP_RO, ARM_MPU_AP_PO",
      "HAL_CORTEX_MPU_REGION_ALL_RO": "ARM_MPU_AP_RO, ARM_MPU_AP_NP",
    };


    const combinedMap = {
      ...baseMap,
      ...memAttrMap,
      ...regionAccessAttrMap,
    };

    console.info(`helper_cortex_mpu_get_arm_cmsis_value: combinedMap keys=${Object.keys(combinedMap).length}`);

    return combinedMap[hal_value];
  } catch (e) {
    console.error(`helper_cortex_mpu_get_arm_cmsis_value exception: ${e.message}`);
    return undefined;
  }
}

module.exports = {
  helper_cortex_is_overlapping,
  helper_cortex_mpu_get_used_attributes,
  helper_cortex_mpu_get_arm_cmsis_value
};
