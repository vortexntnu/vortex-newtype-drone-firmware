/**
 * @file Helpers functions used for COMP SW component
 * @license
 * Copyright (c) 2024 STMicroelectronics.
 * All rights reserved.
 *
 * This software is licensed under terms that can be found in the LICENSE file
 * in the root directory of this software component.
 * If no LICENSE file comes with this software, it is provided AS-IS.
 */

/**
 * Transform the comparator input name to be compliant with HAL/LL COMP driver
 * Example: "COMP1_INP1" --> LL_COMP_INPUT_PLUS_IO1 or HAL_COMP_INPUT_PLUS_IO1
 * @param {string} input - The input name to be transformed.
 * @returns {string} The transformed input name.
 */
function helper_comp_transform_input_name(input) {
  try {
    // Normalize input
    // 1) Rename VBG/VREFINT/comp_int_vref/VrefInt (any case) to VREFINT
    //    Allow potential leading spaces before these keywords
    // 2) Rename fractions 1/4, 1/2, 3/4 to 1_4, 1_2, 3_4
    input = input.replace(/\s*\b(vbg|vrefint|comp_int_vref)\b/gi, 'VREFINT');
    input = input.replace(/1\/4/g, '1_4');
    input = input.replace(/1\/2/g, '1_2');
    input = input.replace(/3\/4/g, '3_4');

    // Handle special cases
    if (input === 'DAC1_INT') {
      return 'DAC1_CH1';
    } else if (input === 'DAC2_INT') {
      return 'DAC1_CH2';
    } else if (input === 'VSENS') {
      return 'TEMPSENSOR';
    }

    // Handle dynamic cases for COMPx_INMx and COMPx_INPx
    const compRegex = /^COMP(\d+)_IN(M|P)(\d+)$/; // Match patterns like COMP1_INM1, COMP2_INP2, etc.
    const match = input.match(compRegex);
    if (match) {
      const compNumber = match[1]; // Extract the COMP number (e.g., "1", "2", "3")
      const ioNumber = match[3];  // Extract the IO number (e.g., "1", "2", "3")
      return `IO${ioNumber}`;     // Return the transformed name (e.g., "IO1", "IO2", etc.)
    }

    // Handle dynamic cases for DACx_OUTy
    const dacRegex = /^dac(\d+)_out(\d+)$/i; // Match patterns like dac9_out1, dac8_out2, etc.
    const dacMatch = input.match(dacRegex);
    if (dacMatch) {
      const dacNumber = dacMatch[1]; // Extract the DAC number (e.g., "9", "8")
      const channelNumber = dacMatch[2]; // Extract the channel number (e.g., "1", "2")
      return `DAC${dacNumber}_CH${channelNumber}`; // Return the transformed name (e.g., "DAC9_CH1", "DAC8_CH2", etc.)
    }

    // Handle dynamic cases for OPAMPx_INT
    const opampRegex = /^opamp(\d+)_int$/i; // Match patterns like opamp1_int, opamp2_int, etc.
    const opampMatch = input.match(opampRegex);
    if (opampMatch) {
      const opampNumber = opampMatch[1]; // Extract the OPAMP number (e.g., "1", "2", "3")
      return `OPAMP${opampNumber}_OUT`;  // Return the transformed name (e.g., "OPAMP1_OUT", "OPAMP2_OUT", etc.)
    }

    // Default case: return the original input
    return input;
  } catch (e) {
    console.error(`transform_input_name: ${e}`);
    return null;
  }
}

/**
 * Transform the comparator blanking source name to be compliant with HAL/LL COMP driver
 * Example: "TIM2_OC3" --> LL_COMP_BLANKINGSRC_TIM2_OC3 or HAL_COMP_OUTPUT_BLANK_TIM2_OC3
 * @param {string} blk_src - The blk_src name to be transformed.
 * @returns {string} The transformed blk_src name.
 */
function helper_comp_transform_blk_src_name(blk_src) {
  try {
    // Check if input is a valid non-empty string
    if (!blk_src || typeof blk_src !== 'string') {
      return null;
    }

    // Regular expression to match patterns like:
    // 'tim15_oc2', 'timer8_oc3', 'timer8_ch3', etc.
    // Breakdown:
    // ^(tim|timer)  -> prefix 'tim' or 'timer' at start of string (case-insensitive)
    // (\d+)         -> one or more digits (the number part)
    // _             -> underscore separator
    // (oc|ch)       -> suffix type, either 'oc' or 'ch'
    // (\d+)         -> one or more digits (suffix number)
    // $             -> end of string
    const regex = /^(tim|timer)(\d+)_(oc|ch)(\d+)$/i;
    const match = blk_src.match(regex);

    if (match) {
      // Extract matched groups:
      // match[1] = 'tim' or 'timer'
      // match[2] = number after prefix (e.g., '8', '15')
      // match[3] = suffix type ('oc' or 'ch')
      // match[4] = suffix number (e.g., '2', '3')

      const prefix = 'TIM'; // Standardize prefix to uppercase 'TIM'
      const number = match[2];
      // Convert suffix type to uppercase and replace 'ch' with 'OC'
      const suffixType = match[3].toLowerCase() === 'ch' ? 'OC' : match[3].toUpperCase();
      const suffixNumber = match[4];

      // Construct and return the transformed string
      return `${prefix}${number}_${suffixType}${suffixNumber}`;
    }

    // For all other cases, return the input string converted to uppercase
    return blk_src.toUpperCase();

  } catch (e) {
    console.error(`transform_blk_src_name: ${e}`);
    return null;
  }
}

/**
 * From comparator resource selected, get comparator instance number
 * Example: "COMP1" --> "1"
 * @param {string} comp_resource - comparator resource name
 * @returns {integer} comparator instance number
 */
function helper_comp_get_instance_nb(comp_resource) {
  try {
    // Check if the input is a string
    if (typeof comp_resource !== 'string') {
      throw new Error('Input must be a string');
    }

    // Convert the input string to lowercase to handle case insensitivity
    const normalized = comp_resource.toLowerCase();

    // Use a regular expression to find one or more digits at the end of the string
    const match = normalized.match(/\d+$/);
    if (!match) {
      // If no digits found at the end, throw an error
      throw new Error('No numeric instance found in input');
    }

    // Parse the matched digits as an integer
    const instanceNumber = parseInt(match[0], 10);

    // Return the extracted instance number
    return instanceNumber;
  } catch (e) {
    console.error(`transform_input_name: ${e}`);
    return null;
  }
}

/**
 * From comparator resource selected, get comparator instance number parity
 * Example: "COMP1" --> "ODD"
 * Example: "COMP2" --> "EVEN"
 * @param {string} comp_resource - comparator resource name
 * @returns {string} comparator instance number parity ("ODD" or "EVEN")
 */
function helper_comp_get_instance_nb_parity(comp_resource) {
  try {
    // Check if the input is a string
    if (typeof comp_resource !== 'string') {
      throw new Error('Input must be a string');
    }

    // Convert the input string to lowercase to handle case insensitivity
    const normalized = comp_resource.toLowerCase();

    // Use a regular expression to find one or more digits at the end of the string
    const match = normalized.match(/\d+$/);
    if (!match) {
      // If no digits found at the end, throw an error
      throw new Error('No numeric instance found in input');
    }

    // Parse the matched digits as an integer
    const instanceNumber = parseInt(match[0], 10);

    // Determine the parity of the instance number
    const parity = instanceNumber % 2 === 0 ? 'EVEN' : 'ODD';

    // Return the parity
    return parity;
  } catch (e) {
    console.error(`transform_input_name: ${e}`);
    return null;
  }
}

/**
 * From comparator resource selected, part of window pair of comparators, get the other comparator instance number
 * Example: "COMP12.COMP1" --> "2"
 * Example: "COMP12.COMP2" --> "1"
 * @param {string} comp_resource_id - comparator resource id (format COMPxy.COMPz)
 * @returns {integer} window other comparator instance number (value 0 if other instance not available)
 */
function helper_comp_get_window_other_instance_nb(comp_resource_id) {
  try {
    if (typeof comp_resource_id !== 'string') {
      throw new Error('Input must be a string');
    }

    // Normalize input to lowercase
    const normalized = comp_resource_id.toLowerCase();

    // Extract the comparator pair and instance (e.g., COMP12.COMP1)
    const match = normalized.match(/comp(\d+)\.comp(\d+)$/i);
    if (match) {
      const pairNumber = parseInt(match[1], 10); // Extract the pair number (e.g., 12)
      const instanceNumber = parseInt(match[2], 10); // Extract the instance number (e.g., 1)

      // Split the pair number into its two components
      const firstInstance = Math.floor(pairNumber / 10); // First digit (e.g., 1)
      const secondInstance = pairNumber % 10; // Second digit (e.g., 2)

      // Return the other instance in the pair
      if (instanceNumber === firstInstance) {
        return secondInstance;
      } else if (instanceNumber === secondInstance) {
        return firstInstance;
      } else {
        throw new Error('Instance number does not match the pair');
      }
    }

    // If the input does not match the expected pattern, return "0"
    return 0;
  } catch (e) {
    console.error(`helper_comp_get_window_other_instance_nb: ${e.message}`);
    return 0;
  }
}

/**
 * From comparator resource selected, part of window pair of comparators, get the other comparator instance resource id
 * Example: "COMP12.COMP1" --> "COMP12.COMP2"
 * Example: "COMP12.COMP2" --> "COMP12.COMP1"
 * @param {string} comp_resource_id - comparator resource id (format COMPxy.COMPz)
 * @returns {integer} window other comparator instance number (value 0 if other instance not available)
 */
function helper_comp_get_window_other_instance_id(comp_resource_id) {
  try {
    if (typeof comp_resource_id !== 'string') {
      throw new Error('Input must be a string');
    }

    // Normalize input to lowercase for processing
    const normalized = comp_resource_id.toLowerCase();

    // Extract the comparator pair and instance (e.g., COMP12.COMP1)
    const match = normalized.match(/(comp\d+)\.(comp\d+)$/i);
    if (match) {
      const pair = match[1].toUpperCase(); // Extract the pair and convert back to uppercase (e.g., COMP12)
      const instance = match[2].toUpperCase(); // Extract the instance and convert back to uppercase (e.g., COMP1 or COMP2)

      // Extract the numeric part of the instance
      const instanceNumber = parseInt(instance.replace('COMP', ''), 10);

      // Extract the numeric parts of the pair
      const pairNumber = parseInt(pair.replace('COMP', ''), 10);
      const firstInstance = Math.floor(pairNumber / 10); // First digit (e.g., 1)
      const secondInstance = pairNumber % 10; // Second digit (e.g., 2)

      // Return the other instance in the pair
      if (instanceNumber === firstInstance) {
        return `${pair}.COMP${secondInstance}`;
      } else if (instanceNumber === secondInstance) {
        return `${pair}.COMP${firstInstance}`;
      } else {
        throw new Error('Instance number does not match the pair');
      }
    }

    // If the input does not match the expected pattern, return "0"
    return "0";
  } catch (e) {
    console.error(`helper_comp_get_window_other_instance_id: ${e.message}`);
    return "0";
  }
}

/**
 * From comparator resource selected, part of window pair of comparators, get whether instance
 * will be considered as the main one for window mode configuration.
 * @param {string} comp_resource - comparator resource name
 * @returns {boolean} returns true is instance considered as the main one for window mode configuration
 */
function helper_comp_is_window_instance_main(comp_resource) {
  try {
    if (typeof comp_resource !== 'string') {
      throw new Error('Input must be a string');
    }

    // Lookup table: array of window pair of comparators instances
    const lookupTable = [
      [1, 2],
      [3, 4],
      [5, 6],
      [7, 8],
      [9, 10],
      [11, 12],
    ];

    // Normalize input to lowercase
    const normalized = comp_resource.toLowerCase();

    // Extract the number at the end of the string
    const match = normalized.match(/\d+$/);
    if (!match) {
      throw new Error('No numeric instance found in input');
    }

    const instanceNumber = parseInt(match[0], 10);

    // Check if instanceNumber matches the first element of any pair in the lookup table
    const isFirstElement = lookupTable.some(pair => pair[0] === instanceNumber);

    // Return true if found, false otherwise
    return isFirstElement;
  } catch (e) {
    console.error(`helper_comp_get_window_other_instance_nb: ${e.message}`);
    return false;
  }
}

/**
  * Retrieve all the interruptions set by COMP but not generated
  * @param {object} nvic_api Getter on NVIC api
  * @param {object} exti_api Getter on EXTI api
  * @param {object} resource Current resource
  * @param {object} config current configuration of the COMP
  * @returns {object}
  */
function helper_comp_get_irq_handler(nvic_api, exti_api, resource, config) {
  let result = [];
  try {
    console.info(`helper_comp_get_irq_handler: resource=${resource}, config=${JSON.stringify(config)}`
    );

    /** Check the peripheral interruptions have been generated or not */
    /* Note: No direct interrupt in COMP interface */

    /** Check the EXTI interruptions have been generated or not */
    const list_exti = [
      {config_path_1: "output", config_path_2: "output_trigger", condition: "EXTI", exti_need: "exti"},
    ];
    /** Parse the list of exti */
    for (let index = 0; index < list_exti.length; index++) {
      const element = list_exti[index];
      let exti_enable = false;

      /** Check if EXTI has been enabled in the COMP interface */
      /* exti_enable = config?.basic?.output.output_trigger === "EXTI"; */
      exti_enable = config?.basic?.[element['config_path_1']]?.[element['config_path_2']] === element['condition'];

      if (!exti_enable) continue;

      /* const exti_config = exti_api.getNeedById(config?.system?.exti.needs[0].id); */
      const exti_config = exti_api.getNeedById(config?.system?.[element['exti_need']].needs[0].id);
      /** Check if interruption has been enabled on the EXTI line */
      const enableInterruption = exti_config.configuration.basic.interruption?.enable_interruption ?? false;
      if (enableInterruption) {
        /** Check if IRQ handler generated is done on code generation or not */
        const irqHandlerGeneration = exti_config.configuration.basic.interruption.irq_handler_generation ?? false;
        if (!irqHandlerGeneration) {
          const labels = config.info.labels || []; /* Specific COMP: use label of COMP (not EXTI) */
          const nvic_config = nvic_api.getNeedById(exti_config.configuration.basic.interruption.nvic.needs[0].id);
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
    }
  } catch (e) {
    console.error(`helper_comp_get_irq_handler: ${e}`);
  }
  return result;
}

module.exports = {
  helper_comp_transform_input_name,
  helper_comp_transform_blk_src_name,
  helper_comp_get_instance_nb,
  helper_comp_get_instance_nb_parity,
  helper_comp_get_window_other_instance_nb,
  helper_comp_get_window_other_instance_id,
  helper_comp_is_window_instance_main,
  helper_comp_get_irq_handler
};
