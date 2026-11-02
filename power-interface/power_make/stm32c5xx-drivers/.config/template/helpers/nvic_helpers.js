/**
 * @file CORTEX/NVIC Helpers functions to provide service to the HAL components
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


const SHARED_EXCEPTION_LINES = ['NMI', 'HardFault', 'BusFault'];

/**
 * @brief Retrieve the full list of IRQ lines needed for a SW instance (include PPP + DMA + EXTI)
 *
 * @param {object} nvic_api       NvicAPI.getNeedById
 * @param {object} nvic_context   List of tuples: [nvic_need, current_resource_hw, generate_handler]
 * @param {string} hal_component  SW instance component (ex UART or DMA)
 * @returns {object} Full list consolidated inside the following object
 *
 * @note The returned array contains IRQ information objects structured as follows:
 * [
 *   {
 *     description: <string>,        // Description of the IRQ line
 *     line: <string>,               // IRQ line identifier
 *     shared: <boolean>,            // Indicates if the IRQ line is shared
 *     generate_handler: <boolean>,  // Indicates if the IRQ Handler should be generated or not
 *     resource_hw: <string>,        // Associated hardware resource (e.g., I2C1, GPDMA1_CH0)
 *     component: <string>           // Component type (e.g., EXTI, DMA, or the specified hal_component)
 *     irq_suffix: <string>          // IRQ line suffix after removing the hw resource prefix (e.g., "_TRGI_COM_DIR_IDX")
 *   },
 *   ...
 * ]
 *
 * Usage:
 * - Iterate over the 'list_irq' array to access individual IRQ information.
 * - Each entry provides details about the IRQ line, including its component type and associated hardware resource.
 * - Use this information to configure or manage IRQ lines as needed in your application.
 */
function helper_cortex_nvic_get_irqline_info_list(nvic_api, nvic_context, hal_component) {
  console.info(`helper_cortex_nvic_get_irqline_info_list`);

  const NO_HANDLER_IPS = ['HSEM','RCC','SBS_BridgeBusError','RIF_IAC','RTC', 'TAMP'];
  const list_irq = [];

  try {
    console.info(`helper_cortex_nvic_get_irqline_info_list: nvic_api=${JSON.stringify(nvic_api)}, ` +
      `nvic_context=${JSON.stringify(nvic_context)}, hal_component=${hal_component}`
    );

    if (!Array.isArray(nvic_context) || nvic_context.length === 0) {
      console.info(`helper_cortex_nvic_get_irqline_info_list: nvic_context is empty or not an array`);
      return list_irq;
    }

    nvic_context.forEach(([nvic_need, current_resource_hw, generate_handler]) => {
      const nvic_config = nvic_api.getNeedById(nvic_need.id);
      const nvic_owner = nvic_need.owner;
      if (typeof nvic_config === "undefined") {
        console.info(`NVIC config not found for id=${nvic_need.id}`);
        return; // Skip this iteration
      }

      const { name: irq_line, description, shared } = nvic_config;

      // Skip if IRQ line already added
      if (list_irq.some(irq_info => irq_info.line === irq_line)) {
        return;
      }

      let irq_info = null;

      if (SHARED_EXCEPTION_LINES.includes(irq_line)) {
        // Special case for shared exception IRQ lines
        irq_info = {
          description: `${hal_component} ${irq_line} interrupt`,
          line: `${hal_component}_${irq_line}`,
          shared: true,
          generate_handler: generate_handler,
          has_handler: !NO_HANDLER_IPS.includes(hal_component),
          return: true,
          return_type: "system_status_t",
          is_interruption: false,
          owner: nvic_owner
        };
      } else {
        // Default IRQ info - exception and fault
        irq_info = {
          description,
          line: irq_line,
          shared: shared,
          generate_handler: generate_handler,
          has_handler: !NO_HANDLER_IPS.includes(hal_component),
          return: false,
          return_type: "void",
          is_interruption: true,
          owner: nvic_owner
        };
      }

      // Determine component and resource_hw based on IRQ line naming
      if (irq_line.includes("EXTI")) {
        irq_info.resource_hw = irq_line;
        irq_info.component = "EXTI";
        irq_info.has_handler = true; // EXTI lines always have handlers
      } else if (irq_line.includes("DMA") && !irq_line.includes("DMA2D")) {
        irq_info.resource_hw = irq_line;
        irq_info.component = "DMA";
      } else if (SHARED_EXCEPTION_LINES.includes(irq_line)) {
        irq_info.resource_hw = current_resource_hw;
        irq_info.component = `${hal_component}_${irq_line}`;
      } else {
        irq_info.resource_hw = current_resource_hw;
        irq_info.component = hal_component;
      }

      // Suffix extraction logic (irq_line always starts with resource_hw)
      let suffix = irq_line.substring(irq_info.resource_hw.length);

      // Remove trailing '_S' of secure line
      if (suffix.endsWith("_S")) {
        suffix = suffix.substring(0, suffix.length - 2);
      }

      // Check if suffix ends with a digit
      if (/\d$/.test(suffix)) {
      // Ends with a number, ignore suffix
        irq_info.irq_suffix = "";
      } else {
        irq_info.irq_suffix = suffix;
      }

      list_irq.push(irq_info);
    });
  } catch (e) {
    console.error(`helper_cortex_nvic_get_irqline_info_list: ${e}`);
  }

  console.info(`helper_cortex_nvic_get_irqline_info_list: result=${JSON.stringify(list_irq)}`);

  return list_irq;
}

/**
 * Concatenate IRQ contexts to build a unified list of NVIC needs with associated hardware resources and handler flags.
 *
 * @param {Array} global_context              Existing global context array containing tuples of [nvic_need, resource_hw, generate_handler].
 * @param {Array} current_needs               Array of NVIC needs to add.
 * @param {string} current_resource_hw        Hardware resource string associated with the current needs (e.g., "I2C1", "UART3").
 * @param {boolean} current_generate_handler  Flag indicating if the IRQ handler should be generated for these needs.
 * @returns {Array} Updated global context array with new [nvic_need, resource_hw, generate_handler] tuples appended.
 *
 * @note
 * - This function merges the current NVIC needs with the existing global context by creating tuples that associate each need
 *   with its hardware resource and handler generation flag.
 * - The returned array can be used as input for functions expecting a list of IRQ contexts, such as IRQ line info retrieval.
 * - It preserves the original global context and appends new tuples without modifying the input arrays.
 */
function helper_cortex_nvic_concatenate_irq_context(
  global_context,
  current_needs,
  current_resource_hw,
  current_generate_handler
) {
  let result = [];

  try {
    console.info(`helper_cortex_nvic_concatenate_irq_context`);
    console.info(`helper_cortex_nvic_concatenate_irq_context: current_needs=${JSON.stringify(
        current_needs)}, global_context=${JSON.stringify(global_context)}, current_resource_hw=${current_resource_hw}, current_generate_handler=${current_generate_handler}`
    );

    // Start with existing global_context if defined and is an array
    if (Array.isArray(global_context)) {
      result = [...global_context];
    }

    // Append tuples for each need in current_needs
    if (Array.isArray(current_needs)) {
      current_needs.forEach((need) => {
        result.push([need, current_resource_hw, current_generate_handler]);
      });
    }
  } catch (e) {
    console.error(`[ERROR] helper_cortex_nvic_concatenate_irq_context: ${e}`);
  }

  return result;
}

/**
 * @brief Convert priority grouping from NVIC getter to value to be used by NVIC CMSIS driver
 *
 * @param {integer} prio_grouping priority grouping returned by NVIC getter
 * @returns {integer} value to set in NVIC CMSIS driver
 */
function helper_cortex_nvic_retrieve_ll_priority_grouping(prio_grouping) {
  try {
    const map_ll_prio_grouping = {
      0: 3,
      1: 4,
      2: 5,
      3: 6,
      4: 7,
    };
    return map_ll_prio_grouping[prio_grouping];
  } catch (e) {
    console.error(`helper_cortex_nvic_retrieve_ll_priority_grouping: ${e}`);
  }
  return {};
}

/**
 * @brief Convert priority grouping from NVIC getter to value to be used by HAL driver
 *
 * @param {integer} prio_grouping priority grouping returned by NVIC getter
 * @returns {integer} value to set in HAL driver
 */
function helper_cortex_nvic_retrieve_hal_priority_grouping(prio_grouping) {
  try {
    const map_hal_prio_grouping = {
      0: 4,
      1: 3,
      2: 2,
      3: 1,
      4: 0,
    };
    return map_hal_prio_grouping[prio_grouping];
  } catch (e) {
    console.error(`helper_cortex_nvic_retrieve_hal_priority_grouping: ${e}`);
  }
  return {};
}

/**
 * @brief Filter and convert system lines from NVIC store for use in DFP/codegen
 *
 * @param {Array} systemLines Array of system line objects (from NvicAPI.getSystemLines)
 * @param {string} targetLine Name of the system line to filter (e.g., "SysTick", "PendSV", "MemManage")
 * @returns {Array} Array of objects: { name, alias, description, priority, subpriority, used }
 */
function helper_cortex_nvic_convert_system_lines(systemLines, targetLine) {
  try {
    console.info(`[helper_cortex_nvic_convert_system_lines] input systemLines: ${JSON.stringify(systemLines)}, targetLine: ${targetLine}`);
    const map_system_lines = {
      DebugMonitor: "DebugMonitor",
      SVC: "SVCall",
      PendSV: "PendSV",
      SysTick: "SysTick",
      MemManage: "MemoryManagement",
      UsageFault: "UsageFault",
      BusFault: "BusFault"
    };

    if (!Array.isArray(systemLines)) return [];

    let focusLines = [];
    if (targetLine === 'NVIC') {
      focusLines = ['SVC', 'PendSV', 'DebugMonitor'];
    } else if (targetLine === 'SCB') {
      focusLines = ['MemManage', 'UsageFault', 'BusFault'];
    } else {
      // fallback: treat as direct name
      focusLines = [targetLine];
    }

    // Filter only the system lines on focus and that are used
    const filteredLines = systemLines.filter(line => focusLines.includes(line.name) && line.used);

    const result = filteredLines.map(line => {
      let alias = "";
      if (Object.prototype.hasOwnProperty.call(map_system_lines, line.name)) {
        alias = map_system_lines[line.name];
      }
      return {
        name: line.name,
        alias: alias,
        description: line.description,
        priority: line.priority,
        subpriority: line.subpriority,
        used: line.used
      };
    });
    console.info(`[helper_cortex_nvic_convert_system_lines] output: ${JSON.stringify(result)}`);
    return result;
  } catch (e) {
    console.error(`[ERROR] helper_cortex_nvic_convert_system_lines: ${e}`);
    return [];
  }
}

/**
 * @brief Extract shared IRQ lines and their associated IPs, descriptions, and return info from the given IRQ list.
 *
 * @param {object} nvic_api NvicAPI.getNeedById
 *
 * @returns {Array} Array of objects each containing:
 *                  - name: {string} IRQ line name
 *                  - description: {string} IRQ line description
 *                  - shared_with: {Array<string>} list of simplified IP names (only suffix after '.' if any)
 *                  - isInterrupt: {boolean} true only if IRQ is Interrupt, else false
 *
 *  Output example:
 *  [
 *    {
 *      name: "NMI",
 *      description: "Non maskable interrupt...",
 *      shared_with: ["RAMCFG_SRAM1", "FLASH"],
 *      return: true,
 *    }
 *  ]
 */
function helper_cortex_nvic_get_shared_irq_lines(nvic_api) {
  try {
    // Retrieve the full IRQ list from NVIC API
    const irq_list = nvic_api.getUsedLines();

    console.info(`helper_cortex_nvic_get_shared_irq_lines: ${JSON.stringify(irq_list)}`);

    // Filter to keep IRQs that are either shared or part of the shared exception list
    // irq_exclude_list cases are temporary workarounds
    const irq_exclude_list = ["USB", "RAMCFG", "OTG_HS", "OTG_FS"];
    const filteredIrqs = irq_list.filter(irq => {
      return (irq.shared === true || SHARED_EXCEPTION_LINES.includes(irq.name)) &&
        !irq_exclude_list.includes(irq.name);
    });

    // Map each filtered IRQ to a simplified object with cleaned shared_with names, description, and return info
    const simplifiedIrqs = filteredIrqs.map(irq => {
      // Defensive: ensure shared_with is an array, else use empty array
      const sharedWithArray = Array.isArray(irq.shared_with) ? irq.shared_with : [];

      // Simplify each shared_with entry by extracting suffix after '.' if present,
      // then drop CORTEX core names such as CM7/CM33 because they are not SW IP users.
      const simplifiedSharedWith = sharedWithArray.map(ip => {
        const parts = ip.split(".");
        if (parts.length > 1) {
          /** Manage specific case for RAMCFG */
          return parts[0] === 'RAMCFG' ? ('RAMCFG_' + parts[1]) : parts[1];
        }
        return ip;
      }).filter(ip => !/^CM\d+$/i.test(ip));

      const isInterrupt = !SHARED_EXCEPTION_LINES.includes(irq.name);

      return {
        name: irq.name,
        description: irq.description || "",
        shared_with: simplifiedSharedWith,
        isInterrupt: isInterrupt
      };
    }).filter(irq => irq.shared_with.length > 0);

    console.info(`helper_cortex_nvic_get_shared_irq_lines: result=${JSON.stringify(simplifiedIrqs)}`);

    return simplifiedIrqs;
  } catch (error) {
    console.error(`[ERROR] helper_cortex_nvic_get_shared_irq_lines: ${error.message}`);
    return [];
  }
}

/**
 * @brief Generate a formatted comment block for IRQ handler description.
 * @param {string} description Description of the IRQ handler
 * @param {boolean} generate_handler Flag indicating if the handler is generated
 * @returns {string} Formatted comment block
 * @note
 * - If `generate_handler` is true, the comment block contains only the description.
 * - If `generate_handler` is false, the comment block includes an additional line indicating that the handler is
 *   managed directly in user code.
 * - The comment block is formatted with asterisks and centered text for better readability.
 */
function helper_cortex_nvic_generate_comment_block(description, generate_handler) {
  // Helper function to center a text within a given width with padding spaces
  function centerText(text, width) {
    const totalPadding = width - text.length;
    const paddingLeft = Math.floor(totalPadding / 2);
    const paddingRight = totalPadding - paddingLeft;
    return ' '.repeat(paddingLeft) + text + ' '.repeat(paddingRight);
  }

  // Minimum width for stars (between slashes)
  const minStarWidth = 76;
  const minTotalWidth = minStarWidth + 2; // +2 for slashes

  // Phrase for the second line when generate_handler is false and too long
  const managedText = "is managed directly in user code.";

  // Compose the full line for generate_handler == false single line case
  const singleLineTextFalse = description + " " + managedText;

  // Determine lines array based on generate_handler and length fitting
  let lines = [];

  if (generate_handler) {
    // Only one line: description
    lines = [description];
  } else {
    // Try single line first
    if (singleLineTextFalse.length + 4 <= minTotalWidth) {
      // +4 for /* and */ and spaces
      lines = [singleLineTextFalse];
    } else {
      // Two lines: description, and "is managed directly in user code."
      lines = [description, managedText];
    }
  }

  // Calculate max content length
  const maxContentLength = Math.max(...lines.map(line => line.length));

  // Calculate total width needed
  // Each content line is wrapped as: /* <content centered> */
  // So total width = 2 (for /* and space) + content length + 2 (space and */)
  // => content length + 4
  let contentLineWidth = maxContentLength + 4;

  // Final width is max between minTotalWidth and contentLineWidth
  let totalWidth = Math.max(minTotalWidth, contentLineWidth);

  // innerWidth = totalWidth - 4 (for /* and */ with spaces)
  const innerWidth = totalWidth - 4;

  // Compose middle lines with centered content
  const middleLines = lines.map(line => {
    const centered = centerText(line, innerWidth);
    return '/* ' + centered + ' */';
  });

  // Join all lines with newline
  return middleLines.join('\n');
}

module.exports = {
  helper_cortex_nvic_get_irqline_info_list,

  helper_cortex_nvic_concatenate_irq_context,

  helper_cortex_nvic_retrieve_ll_priority_grouping,

  helper_cortex_nvic_retrieve_hal_priority_grouping,

  helper_cortex_nvic_convert_system_lines,

  helper_cortex_nvic_get_shared_irq_lines,

  helper_cortex_nvic_generate_comment_block
};
