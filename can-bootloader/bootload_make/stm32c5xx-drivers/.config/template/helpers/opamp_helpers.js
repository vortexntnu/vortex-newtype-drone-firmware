/**
 * @file Helpers functions used for ADC SW component
 * @license
 * Copyright (c) 2024 STMicroelectronics.
 * All rights reserved.
 *
 * This software is licensed under terms that can be found in the LICENSE file
 * in the root directory of this software component.
 * If no LICENSE file comes with this software, it is provided AS-IS.
 */

/**
 * Handlebars Helper: helper_opamp_is_number
 * - Returns true if the argument is a number (string or number)
 * - Otherwise returns false
 *
 * @param {any} value - The value to test
 * @returns {boolean}
 */
function helper_opamp_is_number(value) {
  try {
    return !isNaN(Number(value));
  } catch (e) {
    console.error(`[ERROR] helper_opamp_is_number: ${e}`);
    return false;
  }
}


/**
 * Handlebars Helper: helper_opamp_get_dac_input
 * - Returns "DAC1_CH2" if instance is "OPAMP1"
 * - Returns "IO3" if instance is "OPAMP2" and layer is "LL"
 * - Otherwise returns an empty string
 *
 * @param {string} instance - The OPAMP instance (e.g., @root.current_resource)
 * @param {string} layer - The current layer (e.g., @root.current_layer)
 * @returns {string}
 */
function helper_opamp_get_dac_input(instance, layer){
  try {
    if (typeof instance === 'string' && instance === 'OPAMP1') {
      return 'DAC1_CH2';
    }
    return '';
  } catch (e) {
    console.error(`[ERROR] helper_opamp_get_dac_input: ${e}`);
    return '';
  }
}

/**
 * Handlebars Helper: helper_opamp_adjust_gain
 *
 * Adjusts the gain value according to a predefined mapping.
 * If the gain is not in the mapping, returns the original gain.
 *
 * @param {number} gain - The input gain value
 * @returns {number} - The adjusted gain value
 */
function helper_opamp_adjust_gain(gain) {
  try {
    const gainMap = {
      1: 2,
      3: 4,
      7: 8,
      15: 16
    };

    return gainMap[gain] !== undefined ? gainMap[gain] : gain;
  } catch (e) {
    console.error(`[ERROR] helper_opamp_adjust_gain: ${e}`);
    return gain;
  }
}

/**
 * Handlebars Helper: helper_opamp_transform_trigger_name
 *
 * Transforms trigger names by:
 * - Converting to uppercase
 * - Replacing 'OC' or 'CC' with 'CH'
 *
 * Examples:
 *  - "tim1_oc6" -> "TIM1_CH6"
 *  - "tim2_oc4" -> "TIM2_CH4"
 *
 * @param {string} trigger - The trigger name to transform
 * @returns {string|null} - The transformed trigger name or null if input invalid
 */
function helper_opamp_transform_trigger_name(trigger) {
  try {
    if (!trigger || typeof trigger !== 'string') {
      console.error('[ERROR] helper_opamp_transform_trigger_name: Invalid input');
      return null;
    }

    // Convert to uppercase
    let transformed = trigger.toUpperCase();

    // Replace 'OC' or 'CC' with 'CH'
    transformed = transformed.replace(/CH|CC/g, 'OC');

    return transformed;
  } catch (e) {
    console.error(`[ERROR] helper_opamp_transform_trigger_name: ${e}`);
    return null;
  }
}

/**
 * Returns whether the secondary OPAMP configuration is enabled.
 *
 * This helper is used to guard accesses to the secondary configuration
 * object, which may be absent when timer-controlled multiplexing is disabled.
 *
 * @param {object} additional - The OPAMP advanced configuration section.
 * @returns {boolean} True when the secondary configuration is enabled.
 */
function helper_opamp_is_secondary_enabled(additional) {
  return additional && additional.secondary_configuration_sel === true;
}

/**
 * Returns whether a VINM GPIO section must be displayed.
 *
 * Visibility depends on the selected inverting input and, for VINM0/VINM1,
 * also on PGA external modes that internally require those pins.
 * The helper evaluates both primary and secondary OPAMP configurations.
 *
 * @param {object} basic - The OPAMP main configuration section.
 * @param {object} additional - The OPAMP advanced configuration section.
 * @param {string|number} index - The VINM index to evaluate.
 * @returns {boolean} True when the matching VINM GPIO must be shown.
 */
function helper_opamp_show_vinm_gpio(basic, additional, index) {
  try {
    const normalizedIndex = String(index);

    // Read the primary OPAMP configuration.
    const primaryInput = basic && basic.config_input_connection
      ? basic.config_input_connection.inverting_input
      : null;
    const primaryExternalMode = basic && basic.config
      ? basic.config.external_mode
      : null;

    // Read the secondary OPAMP configuration only when multiplexing is enabled.
    const secondaryEnabled = helper_opamp_is_secondary_enabled(additional);
    const secondaryInput = secondaryEnabled
      && additional.secondary_configuration
      && additional.secondary_configuration.config_input_mux_secondary_connection
      ? additional.secondary_configuration.config_input_mux_secondary_connection.inverting_input
      : null;
    const secondaryExternalMode = secondaryEnabled
      && additional.secondary_configuration
      && additional.secondary_configuration.pga_secondary_config
      ? additional.secondary_configuration.pga_secondary_config.external_mode
      : null;

    switch (normalizedIndex) {
      case '0':
        // VINM0 is visible when it is selected directly or when a PGA external mode uses VINM0.
        return primaryInput === '0'
          || primaryExternalMode === 'EXT_FILT'
          || primaryExternalMode === 'EXT_BIAS'
          || primaryExternalMode === 'EXT_BIAS_FILT'
          || secondaryInput === '0'
          || secondaryExternalMode === 'EXT_FILT'
          || secondaryExternalMode === 'EXT_BIAS'
          || secondaryExternalMode === 'EXT_BIAS_FILT';
      case '1':
        // VINM1 is visible when it is selected directly or when PGA bias+filter mode uses VINM1.
        return primaryInput === '1'
          || primaryExternalMode === 'EXT_BIAS_FILT'
          || secondaryInput === '1'
          || secondaryExternalMode === 'EXT_BIAS_FILT';
      case '2':
      case '3':
      case '4':
        // VINM2..VINM4 are only visible when explicitly selected.
        return primaryInput === normalizedIndex || secondaryInput === normalizedIndex;
      default:
        return false;
    }
  } catch (e) {
    console.error(`[ERROR] helper_opamp_show_vinm_gpio: ${e}`);
    return false;
  }
}

/**
 * Returns whether a VINP GPIO section must be displayed.
 *
 * VINP visibility is driven only by the selected non-inverting input in the
 * primary or secondary OPAMP configuration.
 *
 * @param {object} basic - The OPAMP main configuration section.
 * @param {object} additional - The OPAMP advanced configuration section.
 * @param {string|number} index - The VINP index to evaluate.
 * @returns {boolean} True when the matching VINP GPIO must be shown.
 */
function helper_opamp_show_vinp_gpio(basic, additional, index) {
  try {
    const normalizedIndex = String(index);

    // Read the primary OPAMP configuration.
    const primaryInput = basic && basic.config_input_connection
      ? basic.config_input_connection.non_inverting_input
      : null;

    // Read the secondary OPAMP configuration only when multiplexing is enabled.
    const secondaryEnabled = helper_opamp_is_secondary_enabled(additional);
    const secondaryInput = secondaryEnabled
      && additional.secondary_configuration
      && additional.secondary_configuration.config_input_mux_secondary_connection
      ? additional.secondary_configuration.config_input_mux_secondary_connection.non_inverting_input
      : null;

    // VINP GPIOs are visible only when the matching input is selected.
    return primaryInput === normalizedIndex || secondaryInput === normalizedIndex;
  } catch (e) {
    console.error(`[ERROR] helper_opamp_show_vinp_gpio: ${e}`);
    return false;
  }
}

module.exports = {
  helper_opamp_is_number,
  helper_opamp_get_dac_input,
  helper_opamp_adjust_gain,
  helper_opamp_transform_trigger_name,
  helper_opamp_show_vinm_gpio,
  helper_opamp_show_vinp_gpio
};
