/**
  * @file Helpers functions used for AES SW component
  * @attention
  *
  * Copyright (c) 2026 STMicroelectronics.
  * All rights reserved.
  *
  * This software is licensed under terms that can be found in the LICENSE file
  * in the root directory of this software component.
  * If no LICENSE file comes with this software, it is provided AS-IS.
  *
**/

/**
 * Convert HEX String to Vector
 * @param {string} str - The input string containing hexadecimal digits.
 * @returns {string} - The input string split into words of 8 hexadecimal digits,
 *                     each prefixed with '0x' and joined by commas.
 */

function helper_aes_string_to_vector(str) {
    try {
        console.info(
            `[INFO] helper_aes_string_to_vector: HEX String=${str}`
        );

        // Remove '0x' prefix if it exists
        if (str.startsWith("0x")) {
            str = str.substring(2);
        }

        // Convert the string to uppercase
        str = str.toUpperCase();

        // Regular expression to match every 8 characters
        const regex = /.{1,8}/g;

        // Use match method to get an array of 8-character strings
        let words = str.match(regex);

        // Convert each chunk into a hexadecimal word
        words = words.map(word => '0x' + word);

        // Join the words with commas and format them
        let result = '\n  {\n    ';
        words.forEach((word, index) => {
            if (index > 0) {
                result += (index % 4 === 0) ? ',\n' + ' '.repeat(4) : ', ';
            }
            result += word;
        });
        result += '\n  }';
        return result;

    } catch (e) {
        console.error(`[ERROR] helper_aes_string_to_vector: ${e}`);
        return {};
    }
}

/**
 * Verify if the length of the HEX string matches the given number and if the string is exactly '0x'.
 * @param {string} str - The input string containing hexadecimal digits.
 * @param {number} length - The expected length of the hexadecimal string.
 * @returns {boolean} - Returns true if the length matches the given number or if the string is exactly '0x', otherwise false.
 */
function helper_aes_verify_length(str, length) {
    try {
        console.info(`[INFO] helper_aes_verify_length: HEX String=${str}, Expected Length=${length}`);

        // Check if the string is exactly '0x'
        if (str === '0x') {
            return true;
        }

        // Remove '0x' prefix if it exists
        if (str.startsWith('0x')) {
            str = str.substring(2);
        }

        const LengthString = length * 8;

        // Verify if the length of the string matches the given number
        const isValidLength = str.length === LengthString;

        return isValidLength;
    } catch (error) {
        console.error(`[ERROR] helper_aes_verify_length: ${e}`);
        return {};
    }
}

/**
 * Verify HEX String Length Against size
 * @param {string} str - The input string containing hexadecimal digits.
 * @param {integer} size - The size to verify against.
 * @returns {integer} - Returns 1 if the length of the hexadecimal string is insufficient,
 *                      otherwise returns 0.
 */

function helper_aes_verif(str, size) {
    try {
        console.info(
            `[INFO] helper_aes_verif: HEX String=${str} and Size=${size}`
        );

        // Remove '0x' prefix if it exists
        if (str.startsWith("0x")) {
            str = str.substring(2);
        }

        const numDigits = str.length;
        const requiredLength = size * 2;

        // Adjust for odd number of digits
        const adjustedLength = numDigits % 2 === 0 ? numDigits : numDigits + 1;

        // Check if the adjusted length is less than the required length
        return adjustedLength < requiredLength ? 1 : 0;

    } catch (e) {
        console.error(`[ERROR] helper_aes_verif: ${e}`);
        return {};
    }
}

/**
 * Calculate Number of 8-Digit Words in HEX String
 * @param {string} str - The input string containing hexadecimal digits.
 * @returns {integer} - The number of 8-digit words in the input string, rounded up.
 */

function helper_aes_size_header_msg(str) {
    try {
        console.info(
            `[INFO] helper_aes_size_header_msg: HEX String=${str}`
        );

        // Remove '0x' prefix if it exists
        if (str.startsWith("0x")) {
            str = str.substring(2);
        }

        const numDigits = str.length;

        return Math.ceil(numDigits / 8);

    } catch (e) {
        console.error(`[ERROR] helper_aes_size_header_msg: ${e}`);
        return {};
    }
}

/**
 * Check if the last Words are '00000002' or '00000001'
 * @param {string} str - The input string containing hexadecimal digits.
 * @param {number} nbr - The number to check against (1 or 2).
 * @returns {boolean} - True if the last word match the criteria, false otherwise.
 */

function helper_aes_check_last_word(str, nbr) {
    try {
        console.info(
            `[INFO] helper_aes_check_last_word: HEX String=${str}, Number=${nbr}`
        );

        // Extract the last word of the input
        const lastWord = str.slice(-8);

        // Determine the target string based on the input number
        const target = nbr === 1 ? "00000001" : "00000002";

        return lastWord === target;

    } catch (e) {
        console.error(`[ERROR] helper_aes_check_last_word: ${e}`);
        return {};
    }
}

/**
 * Checks if a string is a valid hexadecimal string, with or without the '0x' prefix.
 * @param {string} str - The input string.
 * @returns {boolean} - Returns true if the string is in the correct format, otherwise false.
 */
function helper_aes_is_valid_hex(str) {
    try {
        console.info(
            `[INFO] helper_aes_is_valid_hex: Checking HEX string=${str}`
        );

        // Regular expression to match a valid hexadecimal string, optionally prefixed with '0x'
        const regex = /^(0x)?[a-fA-F0-9]*$/;

        // Test the input string against the regular expression
        const isValid = regex.test(str);

        return isValid;

    } catch (e) {
        console.error(`[ERROR] helper_aes_is_valid_hex: ${e}`);
        return {};
    }
}
function helper_aes_get_irq_handler(nvic_api, exti_api, resource, config) {
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
      console.error(`[ERROR] helper_aes_get_irq_handler: ${e}`);
    }
    return result;
  }
 /**
 * Concatenates three hexadecimal strings into one,
 * ensuring that the result has a single "0x" prefix at the start.
 *
 * This function:
 * 1. Removes all existing "0x" prefixes (case-insensitive) from the input strings.
 * 2. Concatenates the cleaned strings.
 * 3. Prepends a single "0x" prefix to the resulting string.
 *
 * @param {string} hexStr1 - The first hexadecimal string.
 * @param {string} hexStr2 - The second hexadecimal string.
 * @param {string} hexStr3 - The third hexadecimal string.
 * @returns {string} The concatenated hexadecimal string with a single "0x" prefix.
 */
function helper_aes_concatenateHexWithSinglePrefix(hexStr1, hexStr2, hexStr3) {
    // Use replace() with a regular expression to remove all existing "0x" prefixes
    const cleanStr1 = hexStr1.replace(/\b0x/gi, '');
    const cleanStr2 = hexStr2.replace(/\b0x/gi, '');
    const cleanStr3 = hexStr3.replace(/\b0x/gi, '');

    // Concatenate the cleaned strings and prepend a single "0x"
    return "0x" + cleanStr1 + cleanStr2 + cleanStr3;
}
module.exports = {
    helper_aes_concatenateHexWithSinglePrefix,
    helper_aes_string_to_vector,
    helper_aes_verif,
    helper_aes_size_header_msg,
    helper_aes_check_last_word,
    helper_aes_is_valid_hex,
    helper_aes_verify_length,
    helper_aes_get_irq_handler,
}