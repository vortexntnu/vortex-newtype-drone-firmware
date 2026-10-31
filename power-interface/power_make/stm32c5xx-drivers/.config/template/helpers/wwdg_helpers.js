/**
  * @file Helpers functions used for WWDG SW component
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

const WWDG_INTERNAL_DIVIDER = 4096;
const WWDG_MAX_STEP_NUMBER = 64;
const WWDG_MIN_PRESCALER = 1;
const WWDG_MAX_PRESCALER = 128;
const WWDG_MAX_PRESCALER_REG = 7;

/**
 * This function computes the minimum time input allowed.
 * @param {integer} freq WWDG input frequency (Hz)
 * @param {string}  unit  Time unit selected by the user in Core window
 * @returns {integer} Minimum time allowed for a specified unit
 */
function helper_wwdg_get_min_allowed_time(freq, unit) {
  let allowed_min = 0;

  try {
    console.info(`helper_wwdg_min_allowed_time, freq=${JSON.stringify(freq)}, unit=${JSON.stringify(unit)}`);

    if (unit === 'microseconds') {
      allowed_min = ((WWDG_MIN_PRESCALER * WWDG_INTERNAL_DIVIDER * 1000000) / freq);
    } else if (unit === 'milliseconds') {
      allowed_min = ((WWDG_MIN_PRESCALER * WWDG_INTERNAL_DIVIDER * 1000) / freq);
    } else if (unit === 'seconds') {
      allowed_min = ((WWDG_MIN_PRESCALER * WWDG_INTERNAL_DIVIDER) / freq);
    } else {
      throw new Error('Unsupported time unit');
    }

  } catch (e) {
    console.error(`helper_wwdg_min_allowed_time: ${e}`);
  }

  return Math.floor(allowed_min);
}

/**
 * This function computes the maximum time input allowed.
 * @param {integer} freq WWDG input frequency (Hz)
 * @param {string}  unit  Time unit selected by the user in Core window
 * @returns {integer} Maximum time allowed for a specified unit
 */
function helper_wwdg_get_max_allowed_time(freq, unit) {
  let allowed_max = 0;

  try {
    console.info(`helper_wwdg_get_max_allowed_time, freq=${JSON.stringify(freq)}, unit=${JSON.stringify(unit)}`);

    if (unit === 'microseconds') {
      allowed_max = ((WWDG_MAX_PRESCALER * WWDG_INTERNAL_DIVIDER * WWDG_MAX_STEP_NUMBER * 1000000) / freq);
    } else if (unit === 'milliseconds') {
      allowed_max = ((WWDG_MAX_PRESCALER * WWDG_INTERNAL_DIVIDER * WWDG_MAX_STEP_NUMBER * 1000) / freq);
    } else if (unit === 'seconds') {
      allowed_max = ((WWDG_MAX_PRESCALER * WWDG_INTERNAL_DIVIDER * WWDG_MAX_STEP_NUMBER) / freq);
    } else {
      throw new Error('Unsupported time unit');
    }

  } catch (e) {
    console.error(`helper_wwdg_get_max_allowed_time: ${e}`);
  }

  return Math.floor(allowed_max);
}

/**
 * This function compute the prescaler then used by adjust_time for Max, Min and EWI time
 * @param {integer} freq WWDG input frequency (Hz)
 * @param {integer} max_time Max time requested by the user
 * @param {string}  unit  Time unit selected by the user in Core window
 * @returns {integer} WWDG prescaler
 */
function helper_wwdg_compute_prescaler(freq, max_time, unit) {
  let prescaler = 0;
  let max_period;

  try {
    if (unit === 'microseconds') {
      max_period = Math.floor(((max_time * freq) / 1000000) / (WWDG_MAX_STEP_NUMBER * WWDG_INTERNAL_DIVIDER));
    } else if (unit === 'milliseconds') {
      max_period = Math.floor(((max_time * freq) / 1000) / (WWDG_MAX_STEP_NUMBER * WWDG_INTERNAL_DIVIDER));
    } else if (unit === 'seconds') {
      max_period = Math.floor((max_time * freq) / (WWDG_MAX_STEP_NUMBER * WWDG_INTERNAL_DIVIDER));
    } else {
      throw new Error("Unsupported time unit");
    }
    /* Return the calculated prescaler */
    console.info(`helper_wwdg_compute_prescaler, converted_max_time=${JSON.stringify(max_period)}`);

    prescaler = 32 - Math.clz32(max_period);

    console.info(`helper_wwdg_compute_prescaler, prescaler=${JSON.stringify(prescaler)}`);

    if (prescaler > WWDG_MAX_PRESCALER_REG) {
      prescaler = WWDG_MAX_PRESCALER_REG;
    }

  } catch (error) {
    console.error('Error calculating prescaler:', error);
  }

  return prescaler;
}

/**
 * This function compute the step then used by adjust_time for Max, Min and EWI time
 * @param {integer} freq IWDG input frequency (Hz)
 * @param {integer} prescaler IWDG prescaler
 * @param {string}  unit  Time unit selected by the user in Core window
 * @returns {float} IWDG time step
 */
function helper_wwdg_compute_step(freq, prescaler, unit) {
  let step = 0;

  try {
    console.info(`helper_wwdg_compute_step, freq=${JSON.stringify(freq)}, prescaler=${JSON.stringify(prescaler)}, unit=${JSON.stringify(unit)}`);

    /* Calculate step (ms) */
    prescaler = Math.pow(2, prescaler);

    /* Adjust Max time value */
    if (unit === 'microseconds') {
      step = prescaler * 1000000 / freq;
    } else if (unit === 'milliseconds') {
      step = prescaler * 1000 / freq;
    } else if (unit === 'seconds') {
      step = prescaler / freq;
    } else {
      throw new Error('Unsupported time unit');
    }

    console.info(`helper_wwdg_compute_step, step=${JSON.stringify(step)}`);

  } catch (e) {
    console.error(`helper_wwdg_compute_step: ${e}`);
  }

  return Number(step.toFixed(3));;
}

/**
 * This function suggest a new time based on the step between two possible
 * values
 * @param {float} step WWDG time step
 * @param {integer} input_time Time requested by the user
 * @returns {integer} Adjusted time
 */
function helper_wwdg_adjust_time(step, input_time) {
  let adjusted_time = 0;
  let remainder = 0;

  try {
    console.info(`helper_wwdg_adjust_time, step=${JSON.stringify(step)}, input_time=${JSON.stringify(input_time)}`);

    remainder = input_time % step;
    console.info(`helper_wwdg_adjust_time, remainder_step=${JSON.stringify(remainder)}`);
    if (input_time < step) {
      adjusted_time = 0;
    } else {
      adjusted_time = input_time - remainder;
      if (remainder > (step / 2)) {
        adjusted_time += step;
      }
    }
    console.info(`helper_wwdg_adjust_time, adjusted_time=${JSON.stringify(adjusted_time)}`);

  } catch (e) {
    console.error(`helper_wwdg_adjust_time: ${e}`);
  }
  return Number(adjusted_time.toFixed(2));
}

/**
 * This function calculate the WWDG reload .
 * @param {integer} freq WWDG input frequency (Hz)
 * @param {integer} max_time Max time requested by the user
 * @param {string}  unit  Time unit selected by the user in Core window
 * @returns {integer} Calclated value for reload
 */
function helper_wwdg_compute_reload(freq, prescaler, max_time, unit) {
  let reload;
  let clk_divider;

  try {
    console.info(`helper_wwdg_compute_reload, freq=${JSON.stringify(freq)}, prescaler=${JSON.stringify(prescaler)}, max_time=${JSON.stringify(max_time)}, unit=${JSON.stringify(unit)}`);
    /* Calculate the clock divider */
    clk_divider = Math.pow(2, prescaler & 0x7);

    if (unit === 'microseconds') {
      reload = (max_time * (freq / (clk_divider * WWDG_INTERNAL_DIVIDER * 1000000)));
    } else if (unit === 'milliseconds') {
      reload = (max_time * (freq / (clk_divider * WWDG_INTERNAL_DIVIDER * 1000)));
    } else if (unit === 'seconds') {
      reload = (max_time * (freq / (clk_divider * WWDG_INTERNAL_DIVIDER)));
    } else {
      throw new Error('Unsupported time unit');
    }

    reload = reload + WWDG_MAX_STEP_NUMBER;

    console.info(`helper_wwdg_compute_reload, reload=${JSON.stringify(reload)}`);
  } catch (e) {
    console.error(`helper_wwdg_compute_reload: ${e}`);
  }

  return Math.floor(reload);
}

/**
 * This function calculate the WWDG window .
 * @param {integer} freq WWDG input frequency (Hz)
 * @param {integer} prescaler WWDG prescaler
 * @param {integer} reload Max time requested by the user
 * @param {integer} param Max time requested by the user
 * @param {string}  unit  Time unit selected by the user in Core window
 * @returns {integer} WWDG window
 */
function helper_wwdg_compute_param(freq, prescaler, reload, param, unit) {
  let window = 0;

  try {
    console.info(`helper_wwdg_compute_param, freq=${JSON.stringify(freq)}, prescaler=${JSON.stringify(Number(prescaler))}, reload=${JSON.stringify(reload)},  param=${JSON.stringify(param)}, unit=${JSON.stringify(unit)}`);

    if (unit === 'microseconds') {
      window = reload - ((param * freq) / (1000000 * WWDG_INTERNAL_DIVIDER * Math.pow(2, Number(prescaler))));
    } else if ('unit === milliseconds') {
      window = reload - ((param * freq) / (1000 * WWDG_INTERNAL_DIVIDER * Math.pow(2, Number(prescaler))));
    } else if (unit === 'seconds') {
      window = reload - ((param * freq) / (WWDG_INTERNAL_DIVIDER * Math.pow(2, Number(prescaler))));
    }

  } catch (e) {
    console.error(`helper_wwdg_compute_param: ${e}`);
  }

  return Math.floor(window);
}

/**
  * Retrieve all the interruptions set by WWDG but not generated
  * @param {object} nvic_api Getter on NVIC api
  * @param {object} exti_api Getter on EXTI api (not used)
  * @param {object} resource Current resource
  * @param {object} config   Current configuration of the WWDG
  * @returns {object}
  */
function helper_wwdg_get_irq_handler(nvic_api, exti_api, resource, config) {
  let result = [];
  try {
    // console.info(`helper_wwdg_get_irq_handler: resource=${resource}, config=${JSON.stringify(config)}`
    // );

    /** Check the peripheral interruptions have been generated or not */
    const enableInterruption = config?.system?.nvic?.enable_interruption ?? false;
    if (enableInterruption) {

      /** Check if IRQ handler generated is done on code generation or not */
      const irqHandlerGeneration = config.system?.nvic?.irq_handler_generation ?? false;

      if (!irqHandlerGeneration) {
        const labels = config.info?.labels || [];
        const nvic_config = nvic_api.getNeedById(config.system?.nvic?.irq_config?.needs[0].id);
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
    console.error(`helper_wwdg_get_irq_handler: ${e}`);
  }
  return result;
}

module.exports = {
  helper_wwdg_compute_step,
  helper_wwdg_get_min_allowed_time,
  helper_wwdg_get_max_allowed_time,
  helper_wwdg_adjust_time,
  helper_wwdg_compute_prescaler,
  helper_wwdg_compute_reload,
  helper_wwdg_compute_param,
  helper_wwdg_get_irq_handler
};
