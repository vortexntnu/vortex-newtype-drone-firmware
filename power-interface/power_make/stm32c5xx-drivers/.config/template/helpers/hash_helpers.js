/**
 * @file Helpers functions used for HASH SW component
 * @license
 * Copyright (c) 2025 STMicroelectronics.
 * All rights reserved.
 *
 * This software is licensed under terms that can be found in the LICENSE file
 * in the root directory of this software component.
 * If no LICENSE file comes with this software, it is provided AS-IS.
 */

/**
 * Convert HEX String to Vector
 * @param {string} inputString - The input string containing hexadecimal digits.
 * @returns {string} - The input string split into bytes (2 hexadecimal digits),
 *                     each prefixed with '0x' and joined by commas.
 */
function helper_hash_string_to_hex(inputString) {
    try {
        console.info(`[INFO] helper_hash_string_to_hex: Input String=${inputString}`);

        if (typeof inputString !== 'string') {
            console.error('[ERROR] Input is not a valid string');
            return '';
        }

        // Ensure the input string has an even number of characters (pad with 0 if necessary)
        if (inputString.length % 2 !== 0) {
            inputString = '0' + inputString;
        }

        // Check if the input is a valid hexadecimal string
        if (!/^[0-9a-fA-F]+$/.test(inputString)) {
            console.error('[ERROR] Input is not a valid hexadecimal string');
            return '';
        }

        // Split the string into bytes (2 hexadecimal characters each)
        const bufferString = inputString
            .match(/.{1,2}/g) // Match every 2 characters
            .map(byte => `0x${byte.toUpperCase()}`) // Convert to uppercase and prefix with '0x'
            .join(', ');

        return bufferString;

    } catch (e) {
        console.error(`[ERROR] helper_hash_string_to_hex: ${e}`);
        return '';
    }
}

/**
 * Calculate the size of the input key in bytes.
 * @param {string} inputString - The input key, either as a regular string or a hexadecimal string.
 * @returns {number} - The size of the input key in bytes.
 */
function helper_hash_calculatekeysize(inputString) {
    try {
        console.info(`[INFO] helper_hash_calculatekeysize: Input String=${inputString}`);

        if (typeof inputString !== 'string') {
            throw new Error("Input must be a string.");
        }

        let keySize;

        // Check if the input is a valid hexadecimal string
        if (/^[0-9a-fA-F]+$/.test(inputString)) {
            // Ensure the input string has an even number of characters (pad with 0 if necessary)
            if (inputString.length % 2 !== 0) {
                inputString = '0' + inputString;
            }

            // Calculate the size for a hexadecimal string
            keySize = inputString.length / 2;
        } else {
            // Calculate the size for a regular string
            keySize = new TextEncoder().encode(inputString).length;
        }

        return keySize;

    } catch (e) {
        console.error(`[ERROR] helper_hash_calculatekeysize: ${e}`);
        throw e;
    }
}
/**
  * Retrieve all the interruptions set by HASH but not generated
  * @param {object} nvic_api Getter on NVIC api
  * @param {object} resource Current resource
  * @param {object} config current configuration of the HASH
 * @returns {object}
 */
function helper_hash_get_irq_handler(nvic_api, exti_api, resource, config) {
  let result = [];
  try {
    const list_interrupts = [
      { enable: "enable_interruption", irq_handler_generation: "irq_handler_generation", nvic_context: "irq_config" },
    ];

    /** Parse the list of interruptions */
    for (let index = 0; index < list_interrupts.length; index++) {
      const element = list_interrupts[index];
      /** Check if interruption has beenn enabled on the TIM */
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
      /** Check the DMA interruptions have been generated or not */
      let all_functions = require('./dma_helpers.js');
      if (typeof all_functions['helper_dma_need_get_irq_handler'] === "function") {
        result = result.concat(all_functions['helper_dma_need_get_irq_handler'](nvic_api, dma_api, resource));
      }
    }
  } catch (e) {
    console.error(`[ERROR] helper_hash_get_irq_handler: ${e}`);
  }
  return result;
}
module.exports = {
    helper_hash_string_to_hex,
    helper_hash_calculatekeysize,
    helper_hash_get_irq_handler,
}