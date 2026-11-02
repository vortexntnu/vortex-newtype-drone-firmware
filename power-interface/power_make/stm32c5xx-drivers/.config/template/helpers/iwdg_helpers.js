/**
  * @file Helpers functions used for IWDG SW component
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

const IWDG_MIN_RELOAD = 1;
const IWDG_MAX_RELOAD = 4096;
const IWDG_MIN_PRESCALER = 4;
const IWDG_MAX_PRESCALER = 1024;
const IWDG_MAX_PRESCALER_REG = 8;
const IWDG_TIME_CONVERSION = 1000;

/**
 * This function computes the minimum time input allowed.
 * @param {integer} freq IWDG input frequency (Hz)
 * @param {string}  unit  Time unit selected by the user in Core window
 * @returns {integer} Minimum time allowed for a specified unit
 */
function helper_iwdg_get_min_allowed_time(freq, unit) {
  let allowed_min = 0;

  try {
    console.info(`helper_iwdg_get_min_allowed_time, freq=${JSON.stringify(freq)}, unit=${JSON.stringify(unit)}`);

    allowed_min = ((IWDG_MIN_PRESCALER * IWDG_MIN_RELOAD * IWDG_TIME_CONVERSION) / freq);
    if (unit === 'microseconds') {
      allowed_min = allowed_min * IWDG_TIME_CONVERSION;
    } else if (unit === 'milliseconds') {
      /* Do nothing */
    } else if (unit === 'seconds') {
      allowed_min = allowed_min / IWDG_TIME_CONVERSION;
    } else {
      throw new Error('Unsupported time unit');
    }

  } catch (e) {
    console.error(`helper_iwdg_get_min_allowed_time: ${e}`);
  }

  return Math.ceil(allowed_min);
}

/**
 * This function computes the maximum time input allowed.
 * @param {integer} freq IWDG input frequency (Hz)
 * @param {string}  unit  Time unit selected by the user in Core window
 * @returns {integer} Maximum time allowed for a specified unit
 */
function helper_iwdg_get_max_allowed_time(freq, unit) {
  let allowed_max = 0;

  try {
    console.info(`helper_iwdg_get_max_allowed_time, freq=${JSON.stringify(freq)}, unit=${JSON.stringify(unit)}`);

    allowed_max = ((IWDG_MAX_PRESCALER * IWDG_MAX_RELOAD * IWDG_TIME_CONVERSION) / freq);
    if (unit === 'microseconds') {
      allowed_max = allowed_max * IWDG_TIME_CONVERSION;
    } else if (unit === 'milliseconds') {
      /* Do nothing */
    } else if (unit === 'seconds') {
      allowed_max = allowed_max / IWDG_TIME_CONVERSION;
    } else {
      throw new Error('Unsupported time unit');
    }

  } catch (e) {
    console.error(`helper_iwdg_get_max_allowed_time: ${e}`);
  }

  return  Math.ceil(allowed_max);
}

/**
 * This function compute the step then used by adjust_time for Max, Min and EWI time
 * @param {integer} freq IWDG input frequency (Hz)
 * @param {integer} max_time Max time requested by the user
 * @param {string}  unit  Time unit selected by the user in Core window
 * @returns {integer} IWDG precaler
 */
function helper_iwdg_compute_prescaler(freq, max_time, unit) {
  let prescaler = 0;
  let tmp = 0;

  try {
    console.info(`helper_iwdg_compute_prescaler, freq=${JSON.stringify(freq)}, max_time=${JSON.stringify(max_time)}, unit=${JSON.stringify(unit)}`);

    if (unit === 'microseconds') {
      tmp = max_time / IWDG_TIME_CONVERSION;
    } else if (unit === 'milliseconds') {
      tmp = max_time;
    } else if (unit === 'seconds') {
      tmp = max_time * IWDG_TIME_CONVERSION;
    } else {
      throw new Error('Unsupported time unit');
    }
    console.info(`helper_iwdg_compute_prescaler, converted_max_time=${JSON.stringify(tmp)}`);

    tmp = Math.floor(((tmp * freq) / IWDG_TIME_CONVERSION) / (4 * IWDG_MAX_RELOAD));
    prescaler = 32 - Math.clz32(tmp);
    console.info(`helper_iwdg_compute_prescaler, prescaler=${JSON.stringify(prescaler)}`);

    if (prescaler > IWDG_MAX_PRESCALER_REG) {
      prescaler = IWDG_MAX_PRESCALER_REG;
    }
  } catch (e) {
    console.error(`helper_iwdg_compute_prescaler: ${e}`);
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
function helper_iwdg_compute_step(freq, prescaler, unit) {
  let step = 0;
  let tmp = 0;

  try {
    console.info(`helper_iwdg_compute_step, freq=${JSON.stringify(freq)}, prescaler=${JSON.stringify(prescaler)}, unit=${JSON.stringify(unit)}`);

    /* Calculate step (ms) */
    prescaler = Math.pow(2, prescaler + 2);
    step = prescaler * IWDG_TIME_CONVERSION / freq;

    /* Adjust Max time value */
    if (unit === 'microseconds') {
      step = (step * IWDG_TIME_CONVERSION);
    } else if (unit === 'milliseconds') {
      /* Do nothing */
    } else if (unit === 'seconds') {
      step = (step / IWDG_TIME_CONVERSION);
    } else {
      throw new Error('Unsupported time unit');
    }

    console.info(`helper_iwdg_compute_step, step=${JSON.stringify(step)}`);

  } catch (e) {
    console.error(`helper_iwdg_compute_step: ${e}`);
  }

  return Number(step.toFixed(3));
}

/**
 * This function compute the step then used by adjust_time for Max, Min and EWI time
 * @param {integer} freq IWDG input frequency (Hz)
 * @param {integer} prescaler IWDG prescaler
 * @param {integer} max_time Max time requested by the user
 * @param {string}  unit  Time unit selected by the user in Core window
 * @returns {integer} IWDG reload
 */
function helper_iwdg_compute_reload(freq, prescaler, max_time, unit) {
  let reload = 0;
  let tmp = 0;

  try {
    console.info(`helper_iwdg_compute_reload, freq=${JSON.stringify(freq)}, prescaler=${JSON.stringify(prescaler)}, max_time=${JSON.stringify(max_time)}, unit=${JSON.stringify(unit)}`);

    if (unit === 'microseconds') {
      tmp = max_time;
    } else if (unit === 'milliseconds') {
      tmp = max_time * IWDG_TIME_CONVERSION;
    } else if (unit === 'seconds') {
      tmp = max_time * IWDG_TIME_CONVERSION * IWDG_TIME_CONVERSION;
    } else {
      throw new Error('Unsupported time unit');
    }

    reload = Math.ceil(((tmp * freq) / (IWDG_TIME_CONVERSION * IWDG_TIME_CONVERSION * Math.pow(2, Number(prescaler) + 2))) - 1);

    if (reload > (IWDG_MAX_RELOAD - 1)) {
      reload = IWDG_MAX_RELOAD - 1;
    }

    console.info(`helper_iwdg_compute_reload, reload=${JSON.stringify(reload)}`);
  } catch (e) {
    console.error(`helper_iwdg_compute_reload: ${e}`);
  }

  return  reload;
}


/**
 * This function compute the step then used by adjust_time for Max, Min and EWI time
 * @param {integer} freq IWDG input frequency (Hz)
 * @param {integer} prescaler IWDG prescaler
 * @param {integer} reload Max time requested by the user
 * @param {integer} param Max time requested by the user
 * @param {string}  unit  Time unit selected by the user in Core window
 * @returns {integer} IWDG window
 */
function helper_iwdg_compute_param(freq, prescaler, reload, param, unit) {
  let tmp = 0;

  try {
    console.info(`helper_iwdg_compute_param, freq=${JSON.stringify(freq)}, prescaler=${JSON.stringify(Number(prescaler))}, reload=${JSON.stringify(reload)},  param=${JSON.stringify(param)}, unit=${JSON.stringify(unit)}`);

    if (param <= 0) {
      return 0;
    }

    if (unit === 'microseconds') {
      tmp = param;
    } else if (unit === 'milliseconds') {
      tmp = param * IWDG_TIME_CONVERSION;
    } else if (unit === 'seconds') {
      tmp = param * IWDG_TIME_CONVERSION * IWDG_TIME_CONVERSION;
    } else {
      throw new Error('Unsupported time unit');
    }

      param = Math.ceil(reload - ((tmp * freq) / (IWDG_TIME_CONVERSION * IWDG_TIME_CONVERSION * Math.pow(2, Number(prescaler) + 2))));
      console.error(`helper_iwdg_compute_param: param=${JSON.stringify(param)}`);
    } catch (e) {
    console.error(`helper_iwdg_compute_param: ${e}`);
  }

  return param;
}


/**
 * This function suggest a new time based on the step between two possible
 * values
 * @param {float} step IWDG time step
 * @param {integer} input_time Time requested by the user
 * @returns {integer} Adjusted time
 */
function helper_iwdg_adjust_time(step, input_time) {
  let adjusted_time = 0;
  let remainder = 0;

  try {
    console.info(`helper_iwdg_adjust_time, step=${JSON.stringify(step)}, input_time=${JSON.stringify(input_time)}`);

    remainder = input_time % step;
    console.info(`helper_iwdg_adjust_time, remainder_step=${JSON.stringify(remainder)}`);
    if (input_time < step) {
      adjusted_time = 0;
    } else {
      adjusted_time = input_time - remainder;
      if (remainder > (step / 2)) {
        adjusted_time += step;
      }
    }
    console.info(`helper_iwdg_adjust_time, adjusted_time=${JSON.stringify(adjusted_time)}`);

  } catch (e) {
    console.error(`helper_iwdg_adjust_time: ${e}`);
  }
  return Number(adjusted_time.toFixed(2));
}

/**
  * Retrieve all the interruptions set by IWDG but not generated
  * @param {object} nvic_api Getter on NVIC api
  * @param {object} exti_api Getter on EXTI api (not used)
  * @param {object} resource Current resource
  * @param {object} config   Current configuration of the IWDG
  * @returns {object}
 */
function helper_iwdg_get_irq_handler(nvic_api, exti_api, resource, config) {
  let result = [];
  try {
    console.info(`helper_iwdg_get_irq_handler: resource=${resource}, config=${JSON.stringify(config)}`
    );
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
    console.error(`helper_iwdg_get_irq_handler: ${e}`);
  }
  return result;
}

module.exports = {
  helper_iwdg_get_min_allowed_time,
  helper_iwdg_get_max_allowed_time,
  helper_iwdg_compute_prescaler,
  helper_iwdg_compute_step,
  helper_iwdg_compute_reload,
  helper_iwdg_compute_param,
  helper_iwdg_adjust_time,
  helper_iwdg_get_irq_handler,
};
