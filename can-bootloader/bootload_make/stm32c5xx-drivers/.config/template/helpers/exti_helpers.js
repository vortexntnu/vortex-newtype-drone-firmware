/**
  * @file EXTI Helpers functions to provide service to the HAL components
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
  * Extract the number from a string.
  * @param {string} input - The input string containing a number.
  * @returns {number|null} - The extracted number, or null if no number is found.
  */
function helper_exti_extract_number(input) {
  try {
    /* Check that input is a string */
    if (typeof input !== 'string') {
      throw new TypeError('Input must be a string');
    }
    /* Use a regular expression to find the number in the string */
    const match = input.match(/\d+/);
    /* Return the number as an integer, or null if no match is found */
    return match ? parseInt(match[0], 10) : null;
  } catch (error) {
    console.error('[ERROR] helper_exti_extract_number:', error.message);
  }
}

/**

* Pads the input string on the right with spaces until it reaches the specified length.
* @param {string|number} str - The input value to pad (will be converted to a string if not already).
* @param {number} length - The desired total length of the output string.
* @returns {string} The right-padded string, or the original string if no padding is needed.
*/
function helper_exti_add_pad_right(str, length) {
  str = String(str);
  while (str.length < length) {
    str = str + " ";
  }
  return str;
}

module.exports = {
  helper_exti_extract_number,
  helper_exti_add_pad_right
};