/**
 * @file Helpers functions used for USART SW component
 * @license
 * Copyright (c) 2024 STMicroelectronics.
 * All rights reserved.
 *
 * This software is licensed under terms that can be found in the LICENSE file
 * in the root directory of this software component.
 * If no LICENSE file comes with this software, it is provided AS-IS.
 */

/**
 * Computes Minimal baudrate
 * @param {integer} input_clock USART input clock
 * @param {integer} prescaler USART prescaler
 * @returns {integer} Minimal baudrate computed
 */
function helper_usart_get_min_baudrate(input_clock, prescaler) {
  let result = [];
  try {
    console.info(`helper_usart_get_min_baudrate: input_clock=${input_clock}, prescaler=${prescaler} `);

    /* USART/USART */
    result = Math.ceil(((input_clock * (16 / 8)) / (prescaler * 0xFFFF)));

    console.info(`helper_usart_get_min_baudrate: Min Baudrate: ${result}`);
    return result;
  } catch (e) {
    console.error(`helper_usart_get_min_baudrate: ${e}`);
  }
}

/**
 * Computes Maximal baudrate
 * @param {integer} input_clock USART input clock
 * @param {integer} prescaler USART prescaler
 * @returns {integer} Maximal baudrate computed
 */
function helper_usart_get_max_baudrate(input_clock, prescaler) {
  let result = 0;
  try {
    console.info(`helper_usart_get_max_baudrate: input_clock=${input_clock}, prescaler=${prescaler}`);
    /* USART/USART */
    /* USARDIV must be greater or equal to 16 (oversampling 8 or 16) */
    result = Math.floor((input_clock * (16 / 8) / (prescaler * 16)));

    console.info(`helper_usart_get_max_baudrate: Max Baudrate: ${result}`);
    return result;
  } catch (e) {
    console.error(`helper_usart_get_max_baudrate: ${e}`);
  }
}

/**
  * Retrieve all the interruptions set by USART but not generated
  * @param {object} nvic_api Getter on NVIC api
  * @param {object} exti_api Getter on EXTI api (not used)
  * @param {object} resource Current resource
  * @param {object} config current configuration of the USART
  * @returns {object}
  */
function helper_usart_get_irq_handler(nvic_api, exti_api, resource, config) {
  let result = [];
  try {
    console.info(`helper_usart_get_irq_handler: resource=${resource}, config=${JSON.stringify(config)}`
    );

    /** Check the peripheral interruptions have been generated or not */
    const enableInterruption = config?.system?.nvic?.enable_interruption ?? false;
    if (enableInterruption) {

      /** Check if IRQ handler generated is done on code generation or not */
      const irqHandlerGeneration = config.system?.nvic?.irq_handler_generation ?? false;

      if (!irqHandlerGeneration) {
        const labels = config.info?.labels || [];
        const nvic_config = nvic_api.getNeedById(config.system?.nvic?.nvic_config?.needs[0].id);
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
    console.error(`helper_usart_get_irq_handler: ${e}`);
  }
  return result;
}

module.exports = {

  helper_usart_get_min_baudrate,
  helper_usart_get_max_baudrate,
  helper_usart_get_irq_handler,

};
