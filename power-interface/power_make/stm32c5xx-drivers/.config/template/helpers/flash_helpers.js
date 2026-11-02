/**
 * @file Helpers functions used for FLASH SW component
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

/* Private constants -----------------------------------------------------------------------------------------------*/
const FLASH_PAGE_SIZE = 0x2000;
const FLASH_TOTAL_PAGES = 32;
const FLASH_TOTAL_SIZE = FLASH_TOTAL_PAGES * FLASH_PAGE_SIZE;
const FLASH_BANK_COUNT = 2;

function createAreaLocalState() {
  return {
    local_id: 0,
    local_ready: false,
    seen_terminal_31: false,
    split_active: false,
    split_end_page: -1,
    split_value_rdy: false,
    single_area_safe: 1,
    ack_rst: false
  };
}

/* Private variables -----------------------------------------------------------------------------------------------*/
const FLASH_AREA_LOCAL_STATE = {
  security: Array.from({ length: FLASH_BANK_COUNT }, createAreaLocalState),
  privilege: Array.from({ length: FLASH_BANK_COUNT }, createAreaLocalState)
};

/* Private function ------------------------------------------------------------------------------------------------*/
function resetAreaLocalState(state) {
  state.local_id = 0;
  state.local_ready = false;
  state.seen_terminal_31 = false;
  state.split_active = false;
  state.split_end_page = -1;
  state.split_value_rdy = false;
  state.single_area_safe = 1;
  state.ack_rst = false;
}

function getAreas(bank, type) {
  const key = type === "privilege" ? "areas_privilege" : "areas_security";

  return bank[key];
}

function getAreaLocalState(bank, type) {
  const safeType = type === "privilege" ? "privilege" : "security";
  const foreignKey = String(bank?._foreignKey ?? "").trim();
  let bankId = Number((/^BANK_(\d+)(?:_|$)/i.exec(foreignKey))[1]) - 1;

  return FLASH_AREA_LOCAL_STATE[safeType][bankId];
}

function getPageFromAddr(address) {
  const numericAddress = Number(address);
  if (!Number.isFinite(numericAddress) || numericAddress < 0) {
    return 0;
  }
  return Math.floor(numericAddress / FLASH_PAGE_SIZE);
}

function getStartPageFromArea(area) {
  const page = Number(area?.start_page);
  if (Number.isFinite(page) && page >= 0) {
    return Math.floor(page);
  }
  return getPageFromAddr(area?.start_addr);
}

function getEndPageFromArea(area) {
  const page = area.end_page;
  if (Number.isFinite(page) && page >= 0) {
    return Math.floor(page);
  }

  const startAddr = Number(area?.start_addr);
  const size = Number(area?.addr_size);
  if (Number.isFinite(startAddr) && startAddr >= 0 && Number.isFinite(size) && size > 0) {
    return getPageFromAddr(startAddr + size - 1);
  }

  return getStartPageFromArea(area);
}

function getStartAddrFromArea(area) {
  const startAddr = Number(area?.start_addr);
  if (Number.isFinite(startAddr) && startAddr >= 0) {
    return Math.floor(startAddr);
  }
  return getStartPageFromArea(area) * FLASH_PAGE_SIZE;
}

function getEndAddrFromArea(area) {
  const startAddr = Number(area?.start_addr);
  const size = Number(area?.addr_size);
  if (Number.isFinite(startAddr) && startAddr >= 0 && Number.isFinite(size) && size > 0) {
    return Math.floor(startAddr + size - 1);
  }

  return (getEndPageFromArea(area) + 1) * FLASH_PAGE_SIZE - 1;
}

/* Exported functions ------------------------------------------------------------------------------------------------*/
/**
 * @brief Helper function to check if the current region is the last area for a given type
 * @param {object} blockbased The blockbased configuration object containing the areas definitions
 * @param {integer} regionIndex The index of the current region
 * @param {'security'|'privilege'} type The type of the region
 * @returns {boolean} True if the current region is the last area, false otherwise
 */
function helper_flash_is_last_area(blockbased, regionIndex, type) {
  try {
    const areas = getAreas(blockbased, type);

    if (!Array.isArray(areas) || areas.length <= 0) {
      return false;
    }

    return regionIndex === (areas.length - 1);
  } catch (e) {
    console.error(`helper_flash_is_last_area: ${e}`);
    return false;
  }
}

/**
 * @brief Helper function to update the local state of the last region for a given type
 * @param {object} bank The bank configuration object containing the areas definitions
 * @param {integer} regionIndex The index of the current region
 * @param {'security'|'privilege'} type The type of the region
 * @returns {boolean} True if the update was successful, false otherwise
 */
function helper_flash_update_last_region_locals(bank, regionIndex, type) {
  try {
    const areas = getAreas(bank, type);
    const state = getAreaLocalState(bank, type);

    if (!helper_flash_is_last_area(bank, regionIndex, type)) {
      return false;
    }

    if(state.ack_rst){
      resetAreaLocalState(state);
      return false;
    }

    const currentArea = areas[regionIndex];
    const currentEndPage = getEndPageFromArea(currentArea);

    // Check that last region initialised properly to the end of the flash to prevent incorrect split starting by false
    // default end_page value
    if (currentEndPage === (FLASH_TOTAL_PAGES - 1)) {
      state.seen_terminal_31 = true;
      state.local_id = regionIndex;

      return true;
    }

    // Last region could intialised properly before, and it is still the last region and split not active
    if(state.split_active)
    {
      state.seen_terminal_31 = false;
      state.local_ready = false;
    }
    else if(state.seen_terminal_31 && (regionIndex === state.local_id))
    {
      state.local_ready = true;
      state.split_end_page = currentEndPage;
    }
    else
    {
      resetAreaLocalState(state);
    }

    return false;
  } catch (e) {
    console.error(`helper_flash_update_last_region_locals: ${e}`);
    return false;
  }
}

/**
 * @brief Helper function to apply an area increment for a given type
 * @param {object} blockbased The blockbased configuration object containing the areas definitions
 * @param {'security'|'privilege'} type The type of the region
 * @returns {number} The new area count after applying the increment, bounded by the total number of pages in the flash memory
 */
function helper_flash_apply_area_increment(blockbased, type) {
  try {
    const state = getAreaLocalState(blockbased, type);

    state.split_value_rdy = true;

    const countKey = type === "privilege" ? "number_area_privilege" : "number_area_security";
    const configuredCount = Number(blockbased?.[countKey]);

    return (configuredCount + 1);
  } catch (e) {
    console.error(`helper_flash_apply_area_increment: ${e}`);
    return 1;
  }
}

/**
 * @brief Helper function to check if there is a pending area increment for a given type
 * @param {object} bank The bank configuration object containing the areas definitions
 * @param {'security'|'privilege'} type The type of the region
 * @returns {boolean} True if there is a pending area increment, false otherwise
 */
function helper_flash_has_area_increment_pending(bank, type) {
  try {
    const state = getAreaLocalState(bank, type);

    if(!state.local_ready || state.split_active)
    {
      return false;
    }

    const countKey = type === "privilege" ? "number_area_privilege" : "number_area_security";
    const configuredCount = bank[countKey];
    const areas = getAreas(bank, type);
    const realCount = areas.length;

    if(configuredCount !== realCount){
      resetAreaLocalState(state);
      return false;
    }

    state.split_active = true;
    return true;
  } catch (e) {
    console.error(`helper_flash_has_area_increment_pending: ${e}`);
    return false;
  }
}

/**
 * @brief Helper function to get the start address of the next region based on the current region index
 * @param {object} blockbased The blockbased configuration object containing the areas definitions
 * @param {integer} regionIndex The index of the current region
 * @param {'security'|'privilege'} type The type of the region
 * @returns {number} The start address of the next region, bounded by the total flash size
 */
function helper_flash_get_next_start_addr(blockbased, regionIndex, type) {
  try {
    const areas = getAreas(blockbased, type);
    if (regionIndex <= 0) {
      return 0;
    }

    const previousArea = areas[regionIndex - 1] || {};
    const previousEndAddr = getEndAddrFromArea(previousArea);
    return Math.max(0, Math.min(FLASH_TOTAL_SIZE, previousEndAddr + 1));
  } catch (e) {
    console.error(`helper_flash_get_next_start_addr: ${e}`);
    return 0;
  }
}

/**
 * @brief Helper function to get the size from the start address of a region to the end of the flash memory
 * @param {object} blockbased The blockbased configuration object containing the areas definitions
 * @param {integer} regionIndex The index of the region for which to get the size
 * @param {'security'|'privilege'} type The type of the region
 * @returns {number} The size from the start address of the region to the end of the flash memory, bounded by the total flash size
 */
function helper_flash_get_addr_size_to_end(blockbased, regionIndex, type) {
  try {
    const areas = getAreas(blockbased, type);
    const currentArea = areas[regionIndex] || {};
    const startAddr = getStartAddrFromArea(currentArea);
    const boundedStartAddr = Math.max(0, Math.min(FLASH_TOTAL_SIZE, startAddr));
    return Math.max(0, FLASH_TOTAL_SIZE - boundedStartAddr);
  } catch (e) {
    console.error(`helper_flash_get_addr_size_to_end: ${e}`);
    return FLASH_TOTAL_SIZE;
  }
}

/**
 * @brief Helper function to get the default attribute value for a region based on its index, alternating between two values for even and odd indices
 * @param {object} blockbased The blockbased configuration object containing the areas definitions
 * @param {integer} regionIndex The index of the region for which to get the default attribute value
 * @param {*} attributeSelector A string or array to select the pair of attributes to alternate between (default is "security" which alternates between "SEC" and "NSEC", while "privilege" alternates between "PRIV" and "NPRIV")
 * @returns {string} The default attribute value for the region based on its index and the selected attribute pair
 */
function helper_flash_get_default_alternating_attr(blockbased, regionIndex, attributeSelector = "security") {
  try {
    const attributePairs = {
      security: ["SEC", "NSEC"],
      privilege: ["PRIV", "NPRIV"]
    };

    const selectedPair = Array.isArray(attributeSelector) && attributeSelector.length >= 2
      ? [String(attributeSelector[0]), String(attributeSelector[1])]
      : (attributePairs[String(attributeSelector || "").toLowerCase()] || attributePairs.security);

    const areaNumber = regionIndex + 1;
    return (areaNumber % 2 === 0) ? selectedPair[1] : selectedPair[0];
  } catch (e) {
    console.error(`helper_flash_get_default_alternating_attr: ${e}`);
    return "SEC";
  }
}

/**
  * @brief Retrieve all the interruptions set by FLASH but not generated
  * @param {object} nvic_api Getter on NVIC api
  * @param {object} resource Current resource
  * @param {object} config current configuration of the FLASH
  * @returns {object} List of interruptions not generated
 */
function helper_flash_get_irq_handler(nvic_api, exti_api, resource, config) {
  let result = [];
  try {
    /** Reference all the elements which enable the FLASH interruptions */
    const list_interrupts = [
      { enable: "enable_interruption", irq_handler_generation: "irq_handler_generation", nvic_context: "irq_config1" }
    ];

    /** Parse the list of interruptions */
    for (let index = 0; index < list_interrupts.length; index++) {
      const element = list_interrupts[index];
      /** Check if interruption has beenn enabled on the FLASH */
      const enableInterruption = config?.system?.nvic?.[element['enable']] ?? false;
      if (!enableInterruption) continue;

      /** Check if IRQ handler generated is done on code generation or not */
      const irqHandlerGeneration = config.system?.nvic?.[element['irq_handler_generation']] ?? false;

      if (!irqHandlerGeneration) {
        const labels = config.info?.labels || [];
        const nvic_config = nvic_api.getNeedById(config.system?.nvic?.[element['nvic_context']].needs[0].id);
        /** Fill the object to be used for aliases in mx_hal_def.h */
        if (labels.length) {
          let first_label = true;
          for (const label of labels) {
            result.push({
              resource,
              labels,
              first_label,
              alias: label.toUpperCase(),
              nvic_config,
              generated: false
            });
            first_label = false;
          }
        } else {
          result.push({
            resource,
            alias: "",
            nvic_config,
            generated: false
          });
        }

      }
    }

  } catch (e) {
    console.error(`helper_flash_get_irq_handler: ${e}`);
  }
  return result;
}

/**
  * @brief Return the list of unitary IRQHandler APIs
  * @param {object} nvic       The nvic configuration object
  * @param {object} additional The additional configuration object
  * @returns {Array} list of unitary IRQHandler APIs
  */
function helper_flash_get_unitary_irq_handler(additional, nvic) {
  try {
    let list_unitary_apis = [
      { name: "HAL_FLASH_ProgramByAddr_IRQHandler" },
      { name: "HAL_FLASH_EraseByAddr_IRQHandler" },
      { name: "HAL_FLASH_ErasePage_IRQHandler" },
      { name: "HAL_FLASH_EraseBank_IRQHandler" },
      { name: "HAL_FLASH_MassErase_IRQHandler" }
    ];

    // Conditionally add HAL_FLASH_ECC_IRQHandler
    if (Boolean(additional.enable_single_ecc_interrupt)) {
      list_unitary_apis.push({ name: "HAL_FLASH_ECC_IRQHandler" });
    }

    // Conditionally add HAL_FLASH_ITF_IRQHandler
    if (Boolean(nvic.itf_irq_handler_generation)) {
      list_unitary_apis.push({ name: "HAL_FLASH_ITF_IRQHandler" });
    }

    return list_unitary_apis;
  } catch (e) {
    console.error(`helper_flash_get_unitary_irq_handler: ${e}`);
  }
}

/**
  * @brief Return the list of FLASH register access items
  * @returns {Array} list of register access items
  */
function helper_flash_get_security_item() {
  try {
    return [
      { item_key: "ALL", name: "All registers", priv: true }
    ];
  } catch (e) {
    console.error(`helper_flash_get_security_item: ${e}`);
    return [];
  }
}

/**
  * @brief Check if a unitary IRQ handler is enabled.
  * @param {object} nvic         The nvic configuration object
  * @param {object} additional   The additional configuration object
  * @param {object} unitary_apis The unitary IRQ handler API object
  * @returns {boolean} Returns true if the IRQ handler should be enabled
 */
function helper_flash_check_unitary_irq_handler(additional, nvic, unitary_apis) {
  try {
    const { _foreignKey } = unitary_apis;

    return (
      (_foreignKey === "HAL_FLASH_ITF_IRQHandler" && nvic.itf_irq_handler_generation)
    );
  } catch (e) {
    console.error(`helper_flash_check_unitary_irq_handler: ${e}`);
    return false;
  }
}


/**
 * @brief Convert an address to its corresponding page number.
 * @param {object} blockbased The blockbased configuration object containing the areas definitions
 * @param {integer} regionIndex Area id/index
 * @param {'security'|'privilege'} type Target attribute set
 * @return {number} Page number
 */
function helper_flash_convert_addr_to_page(blockbased, regionIndex, type) {
  try {
    const areas = getAreas(blockbased, type);
    const areaFromConfig = areas[regionIndex] || {};
    const area = areaFromConfig;

    const numericStartAddress = Number(area.start_addr ?? areaFromConfig.start_addr);
    if (!Number.isFinite(numericStartAddress) || numericStartAddress < 0) {
      return { start_page: 0, end_page: 0 };
    }

    const numericAddrSize = Number(area.addr_size ?? areaFromConfig.addr_size);
    const startPage = Math.floor(numericStartAddress / FLASH_PAGE_SIZE);
    const endAddress = (Number.isFinite(numericAddrSize) && numericAddrSize > 0)
      ? (numericStartAddress + numericAddrSize - 1)
      : numericStartAddress;
    const endPage = Math.floor(endAddress / FLASH_PAGE_SIZE);

    return {
      start_page: startPage,
      end_page: endPage
    };
  } catch (e) {
    console.error(`helper_flash_convert_addr_to_page: ${e}`);
    return { start_page: 0, end_page: 0 };
  }
}

/**
 * @brief Convert a page range to start address and size (bytes).
 * @param {object} blockbased The blockbased configuration object containing the areas definitions
 * @param {integer} regionIndex Area id/index
 * @param {'security'|'privilege'} type Target attribute set
 * @return {{start_addr: number, addr_size: number}} Start address and range size
 */
function helper_flash_convert_page_to_addr_range(blockbased, regionIndex, type) {
  try {
    const areas = getAreas(blockbased, type);
    const areaFromConfig = areas[regionIndex] || {};
    const area = areaFromConfig;

    const start = Number(area.start_page ?? areaFromConfig.start_page);
    const end = Number(area.end_page ?? areaFromConfig.end_page);

    const safeStart = Number.isFinite(start) && start >= 0 ? Math.floor(start) : 0;
    const safeEndCandidate = Number.isFinite(end) && end >= 0 ? Math.floor(end) : safeStart;
    const safeEnd = Math.max(safeStart, safeEndCandidate);

    return {
      start_addr: safeStart * FLASH_PAGE_SIZE,
      addr_size: (safeEnd - safeStart + 1) * FLASH_PAGE_SIZE
    };
  } catch (e) {
    console.error(`helper_flash_convert_page_to_addr_range: ${e}`);
    return {
      start_addr: 0,
      addr_size: FLASH_PAGE_SIZE
    };
  }
}

/**
 * @brief Helper function to compute the next start page based on the previous area configuration in the security test
 * @param {object} blockbased The blockbased configuration object containing the areas definitions
 * @param {integer} regionIndex The area index used to compute the next start page
 * @param {'security'|'privilege'} type Target attribute set
 * @returns {number} The computed next start page, bounded by the total number of pages in the flash memory
 */
function helper_flash_get_next_start_page(blockbased, regionIndex, type) {
  try {
    const areas = getAreas(blockbased, type);
    const state = getAreaLocalState(blockbased, type);

    if(regionIndex == 0){
      return 0;
    }

    if (state.split_value_rdy && regionIndex === (state.local_id + 1))
    {
      state.split_value_rdy = false;
      return (state.split_end_page + 1);
    }

    const previousEndPage = getEndPageFromArea(areas[regionIndex - 1]);
    const nextStartPage = previousEndPage + 1;

    return Math.min(FLASH_TOTAL_PAGES - 1, nextStartPage);

  } catch (e) {
    console.error(`helper_flash_get_next_start_page: ${e}`);
    return 0;
  }
}

function helper_flash_get_start_page_upper_bound(blockbased, type, regionIndex = 0) {
  try {
    const areas = getAreas(blockbased, type);
    const areaCount = areas.length;

    if (areaCount <= 0) {
      return FLASH_TOTAL_PAGES - 1;
    }

    const maxPage = (FLASH_TOTAL_PAGES - 1) - (areaCount - regionIndex - 1);
    return Math.max(0, Math.min(FLASH_TOTAL_PAGES - 1, maxPage));
  } catch (e) {
    console.error(`helper_flash_get_start_page_upper_bound: ${e}`);
    return FLASH_TOTAL_PAGES - 1;
  }
}

function helper_flash_is_start_page_above_area_limit(blockbased, type, regionIndex = 0) {
  try {
    const areas = getAreas(blockbased, type);
    const areaCount = areas.length;
    const areaFromConfig = areas[regionIndex] || {};
    const startPage = Number(areaFromConfig.start_page);
    const upperBound = helper_flash_get_start_page_upper_bound(blockbased, type, regionIndex);

    let lowerBound = 0;
    if (regionIndex > 0) {
      const previousArea = areas[regionIndex - 1] || {};
      lowerBound = getStartPageFromArea(previousArea) + 1;
    }

    if (areaCount <= 0) {
      return { isValid: true, value: 0 };
    }

    if (startPage < lowerBound) {
      return { isValid: false, value: lowerBound };
    }

    if (startPage > upperBound) {
      return { isValid: false, value: upperBound };
    }

    return { isValid: true, value: startPage };
  } catch (e) {
    console.error(`helper_flash_is_start_page_above_area_limit: ${e}`);
    return { isValid: true, value: 0 };
  }
}

function helper_flash_get_computed_end_page(blockbased, type, regionIndex = 0) {
  try {
    const areas = getAreas(blockbased, type);
    const state = getAreaLocalState(blockbased, type);
    const areaCount = areas.length;
    const areaFromConfig = areas[regionIndex] || {};
    const currentArea = areaFromConfig;
    const currentStartPage = getStartPageFromArea(currentArea);

    if (state.split_active && (regionIndex == state.local_id) && !state.split_value_rdy) {
      state.split_active = false;
      state.ack_rst = true;
    }

    if (areaCount <= 0 || regionIndex >= (areaCount - 1)) {
      return FLASH_TOTAL_PAGES - 1;
    }

    const nextArea = areas[regionIndex + 1] || {};
    const nextStartPageCandidate = Number(nextArea.start_page);
    const nextStartPage = Number.isFinite(nextStartPageCandidate)
      ? Math.floor(nextStartPageCandidate)
      : Math.min(FLASH_TOTAL_PAGES - 1, currentStartPage + 1);

    const endPage = Math.max(currentStartPage, nextStartPage - 1);
    return Math.max(0, Math.min(FLASH_TOTAL_PAGES - 1, endPage));

  } catch (e) {
    console.error(`helper_flash_get_computed_end_page: ${e}`);
    return FLASH_TOTAL_PAGES - 1;
  }
}

/**
 * @brief Parse a key in the form BANK_X_Y and return numeric bank and area IDs.
 * @param {string} key String formatted as BANK_X_Y.
 * @returns {{bank_id: number, area_id: number}} Parsed identifiers.
 */
function helper_flash_parse_bank_area_key(key) {
  try {
    const text = String(key ?? "").trim();
    const match = /^BANK_(\d+)_(\d+)$/i.exec(text);

    if (!match) {
      return { bank_id: 0, area_id: 0 };
    }

    return {
      bank_id: Number(match[1] - 1),
      area_id: Number(match[2])
    };
  } catch (e) {
    console.error(`helper_flash_parse_bank_area_key: ${e}`);
    return { bank_id: 0, area_id: 0 };
  }
}

module.exports = {
  helper_flash_get_irq_handler,
  helper_flash_get_unitary_irq_handler,
  helper_flash_get_security_item,
  helper_flash_check_unitary_irq_handler,
  helper_flash_is_last_area,
  helper_flash_update_last_region_locals,
  helper_flash_apply_area_increment,
  helper_flash_has_area_increment_pending,
  helper_flash_convert_addr_to_page,
  helper_flash_convert_page_to_addr_range,
  helper_flash_get_next_start_page,
  helper_flash_get_start_page_upper_bound,
  helper_flash_is_start_page_above_area_limit,
  helper_flash_get_computed_end_page,
  helper_flash_get_next_start_addr,
  helper_flash_get_addr_size_to_end,
  helper_flash_get_default_alternating_attr,
  helper_flash_parse_bank_area_key
};

