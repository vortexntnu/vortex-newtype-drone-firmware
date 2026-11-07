/**
 * @file Helpers functions used for UART SW component
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
 * Computes Minimal baud rate
 * @param {integer} input_clock UART input clock
 * @param {integer} prescaler Uart prescaler
 * @param {string} oversampling : '1' oversampling activated; '0' oversampling deactivated
 * @param {integer} baudgen_type Hardware 'generic' deined in DFP
 * @returns {integer} Minimal baud rate computed
 */
function helper_uart_get_min_baud_rate(input_clock, prescaler, oversampling, baudgen_type) {
  let result = [];
  try {
    console.info(`helper_uart_get_min_baud_rate: input_clock=${input_clock}, prescaler=${prescaler}, oversampling=${oversampling}, baudgen_type=${baudgen_type}`);
    if (baudgen_type === 0) {
      /* UART/USART */
      result = Math.ceil(((input_clock * (16 / oversampling)) / (prescaler * 0xFFFF)));
    } else {
      /* LPUART */
      result = Math.ceil(((input_clock * 256) / (prescaler * 0xFFFFF)));
    }
    console.info(`helper_uart_get_min_baud_rate: Min Baud rate: ${result}`);
    return result;
  } catch (e) {
    console.error(`helper_uart_get_min_baud_rate: ${e}`);
  }
}

/**
 * Computes Maximal baud rate
 * @param {integer} input_clock UART input clock
 * @param {integer} prescaler Uart prescaler
 * @param {string} oversampling : '1' oversampling activated; '0' oversampling deactivated
 * @param {integer} baudgen_type Hardware 'generic' deined in DFP
 * @returns {integer} Minimal baud rate computed
 */
function helper_uart_get_max_baud_rate(input_clock, prescaler, oversampling, baudgen_type) {
  let result = 0;
  try {
    console.info(`helper_uart_get_max_baud_rate: input_clock=${input_clock}, prescaler=${prescaler}, oversampling=${oversampling}, baudgen_type=${baudgen_type}`);
    if (baudgen_type === 0) {
      /* UART/USART */
      /* USARDIV must be greater or equal to 16 (oversampling 8 or 16) */
      result = Math.floor((input_clock * (16 / oversampling) / (prescaler * 16)));
    } else {
      /* LPUART */
      /* USARDIV must be greater or equal to 0x300 */
      result = Math.floor(((input_clock * 256) / (prescaler * 0x300)));
    }
    console.info(`helper_uart_get_max_baud_rate: Max Baud rate: ${result}`);
    return result;
  } catch (e) {
    console.error(`helper_uart_get_max_baud_rate: ${e}`);
  }
}

/**
  * Retrieve all the interruptions set by UART but not generated
  * @param {object} nvic_api Getter on NVIC api
  * @param {object} exti_api Getter on EXTI api (not used)
  * @param {object} resource Current resource
  * @param {object} config current configuration of the UART
  * @returns {object}
  */
function helper_uart_get_irq_handler(nvic_api, exti_api, resource, config) {
  let result = [];
  try {
    console.info(`helper_uart_get_irq_handler: resource=${resource}, config=${JSON.stringify(config)}`
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
    console.error(`helper_uart_get_irq_handler: ${e}`);
  }
  return result;
}


module.exports = {

  helper_uart_get_min_baud_rate,
  helper_uart_get_max_baud_rate,
  helper_uart_get_irq_handler,

};
