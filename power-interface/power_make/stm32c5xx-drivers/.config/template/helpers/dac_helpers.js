/**
  * @file Helpers functions used for DAC SW component
  * @attention
  *
  * Copyright (c) 2025 STMicroelectronics.
  * All rights reserved.
  *
  * This software is licensed under terms that can be found in the LICENSE file
  * in the root directory of this software component.
  * If no LICENSE file comes with this software, it is provided AS-IS.
  *
  */

/**
 * Check if the channel_id has been configured in input
 * @param {object} channels list of configured channels
 * @param {integer} channel_id id of the channel
 * @param {string} path parameter to check
 * @returns {string} The value of the parameter if it exists, null otherwise
 */
function helper_dac_get_param_in_channel_config(channels, channel_id, path) {
  try {
    const channel = channels.find(function (channel) {
      return channel._foreignKey == channel_id;
    });

    if (channel) {
      if (path.includes('.')) {
        return path.split('.').reduce((obj, key) => (obj && obj[key] !== 'undefined') ? obj[key] : null, channel);
      } else {
        return channel[path] !== undefined ? channel[path] : null;
      }
    } else {
      return null;
    }
  } catch (e) {
    console.error(`helper_dac_get_param_in_channel_config: ${e}`);
    return null;
  }
}

/**
 * Returns 160 if the frequency is higher or equal to 160MHz,
 * 80 if it is between 160MHz and 80MHz, and 0 otherwise.
 * @param {number} frequency - The frequency in Hz.
 * @returns {number} - The corresponding value based on the frequency.
 */
function helper_dac_get_frequency_step(frequency) {
  const frequencyMHz = frequency / 1000000; // Convert Hz to MHz
  try {
    if (frequencyMHz >= 160) {
      return "ABOVE_160MHZ";
    } else if (frequencyMHz >= 80) {
      return "ABOVE_80MHZ";
    } else {
      return "DISABLED";
    }
  } catch (e) {
    console.error(`helper_adc_compute_sampling: ${e}`);
  }
}

/**
 * Calculate the timer output frequency based on prescaler and period values
 * @note  This api is used directly in the tim_parameters.json in advanced view
 * @param {integer} cycles Period set by the user
 * @param {integer} input_clock_frequency clock frequency in Hz
 * @returns {integer} Timer output cycle in us
 */
function helper_dac_compute_cycle_time(
  cycles,
  input_clock_frequency
) {
  let result = 0;
  try {
    /* Calculate the actual timer frequency */
    var dac_frequency_hz = input_clock_frequency;

    /* Calculate the actual output time */
    var cycle_time = (cycles * 1000000) / dac_frequency_hz;

    /* Return the output time */
    result = cycle_time;
  } catch (e) {
    console.error(`helper_dac_compute_cycle: ${e}`);
  }
  return result;
}

/**
 * Renames the trigger if it matches a specific value.
 * @param {string} trigger - The original trigger name.
 * @returns {string} - The renamed trigger if it matches, otherwise the original trigger.
 */
function helper_dac_rename_trigger(trigger){
  let result = trigger.toUpperCase();

  result = result.replace(/_ +/g, "_");

  try {
    if(result.startsWith("SW") || result === "") {
      result = "SOFTWARE";
    } else if (result.startsWith("TIM")) {
      if (result.includes("_TGO")) {
        result = result.replace("_TGO", "_TRGO");
      }
      if (result.includes("_CKTIM")) {
        result = result.replace("_CKTIM", "");
      }
    } else if (result.startsWith("EXT")) {
      result = "EXTI" + result.match(/\[(\d+)\]/)[1];
    } else if (result.startsWith("HRTIM")) {

      if (result.startsWith("HRTIM_")) {
        result = result.replace("HRTIM_", "HRTIM1_");
      }

      if  (result.includes("_DAC_STEP_TRIG_OUT")) {
        result = result.replace("_DAC_STEP_TRIG_OUT", "_STP");
      } else if (result.includes("_DAC_STEP_TRIG")) {
        result = result.replace("_DAC_STEP_TRIG", "_STP");
      } else if (result.includes("_DAC_STEP_TRG")) {
        result = result.replace("_DAC_STEP_TRG", "_STP");
      } else if (result.includes("_DAC_TRIG_OUT")) {
        result = result.replace("_DAC_TRIG_OUT", "_TRG");
      } else if (result.includes("_DAC_TRG")) {
        result = result.replace("_DAC_TRG", "_TRG");
      } else if (result.includes("_DAC_RST_TRIG_OUT")) {
        result = result.replace("_DAC_RST_TRIG_OUT", "_RST");
      } else if (result.includes("_DAC_RESET_TRIG")) {
        result = result.replace("_DAC_RESET_TRIG", "_RST");
      } else if (result.includes("_DAC_RESET_TRG")) {
        result = result.replace("_DAC_RESET_TRG", "_RST");
      }
    }
    else if (result.startsWith("PLAY")) {
      result = result.replace(/PLAY\d+_OUT\d+/g, "PLAY_OUT");
    }
  } catch (e) {
    console.error(`[ERROR] helper_dac_rename_trigger: ${e}`);
  }
  return result;
}

/**
 * Renames the noise amplitude value to a corresponding string representation.
 * @param {number} noise_amplitude - The noise amplitude value.
 * @returns {string} - The corresponding string representation of the noise amplitude.
 */
function helper_dac_rename_ll_noise(noise_amplitude){
  let result = noise_amplitude;
  try {
    const noise_map = {
          1: "BIT0",
          3: "BITS1_0",
          7: "BITS2_0",
         15: "BITS3_0",
         31: "BITS4_0",
         63: "BITS5_0",
        127: "BITS6_0",
        255: "BITS7_0",
        511: "BITS8_0",
       1023: "BITS9_0",
       2047: "BITS10_0",
       4095: "BITS11_0"
    };

    result = noise_map[noise_amplitude];
  } catch (e) {
    console.error(`[ERROR] helper_dac_rename_ll_noise: ${e}`);
  }
  return result;
}

/**
 * Formats a sawtooth reset value as a signed C literal.
 * Values may already be stored as wrapped 32-bit unsigned integers by the
 * configuration layer when the user entered a negative value.
 * @param {number|string} value - Raw reset value from configuration.
 * @returns {string|number} - Signed literal ready to be emitted in C code.
 */
function helper_dac_format_sawtooth_reset_value(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return value;
  }

  if (numericValue > 0x7FFFFFFF) {
    return String(numericValue - 0x100000000);
  }

  return String(numericValue);
}

/**
  * Retrieve all the interruptions set by DAC but not generated
  * @param {object} nvic_api Getter on NVIC api
  * @param {object} exti_api Getter on EXTI api (not used)
  * @param {object} resource Current resource
  * @param {object} config current configuration of the DAC
  * @returns {object}
  */
function helper_dac_get_irq_handler(nvic_api, exti_api, resource, config) {
  let result = [];
  try {
    console.info(`helper_dac_get_irq_handler: resource= ${resource}, config=${JSON.stringify(config)}`
    );

    /** Reference all the elements which enable the DAC interruptions
     * @type {Array} List of interruptions available for the DAC
     * @property {string} enable Name of the property which enables the interruption
     * @property {string} irq_handler_generation Name of the property which indicates if IRQ handler generation is done or not
     * @property {string} nvic_context Name of the property which contains the NVIC context
     * @property {string} selector Suffix to be added to the alias name (empty if global interrupt, starts with underscore with NVIC selector if not empty)
     */
    const list_interrupts = [
      { enable: "enable_interruption", irq_handler_generation: "irq_handler_generation", nvic_context: "nvic_config", selector: "" },
    ];

    /** Parse the list of interruptions */
    for (let index = 0; index < list_interrupts.length; index++) {
      const element = list_interrupts[index];
      /** Check if interruption has been enabled on the DAC */
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
              alias: label.toUpperCase() + element['selector'],
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
    console.error(`helper_dac_get_irq_handler: ${e}`);
  }
  return result;
}

module.exports = {
  helper_dac_compute_cycle_time,
  helper_dac_format_sawtooth_reset_value,
  helper_dac_get_param_in_channel_config,
  helper_dac_get_frequency_step,
  helper_dac_rename_trigger,
  helper_dac_rename_ll_noise,
  helper_dac_get_irq_handler
};
