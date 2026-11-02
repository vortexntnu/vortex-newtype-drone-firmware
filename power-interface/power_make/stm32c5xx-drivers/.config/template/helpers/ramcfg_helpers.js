/**
 * @file Helpers functions used for RAMCFG SW component
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

/* Private constants -----------------------------------------------------------------------------------------------*/
const LL_RAMCFG_Functions_V1 = {
  LL_RAMCFG_ClearFlag: ["LL_RAMCFG_FLAG_ECC_ALL"],
};
/* Private variables -----------------------------------------------------------------------------------------------*/
/* Private function ------------------------------------------------------------------------------------------------*/
/* Exported functions ----------------------------------------------------------------------------------------------*/
/**
 * Break the javascript execution
 * @note This function is for Debug purpose only - Can be called into the template to watch assigned variables.
You need to toggle a breakpoint for the code to break.
 * @param {Number} code A code to indicate where the function has been called (can be the line number)
 * @param {any} root
 */
function helper_ramcfg_breakpoint(code, root){
  let ret = code;
}

/**
 * Check if the global RAMCFG interrupt is enabled or not
 * @param {object} config, The RAMCFG instance config
 * @returns {boolean} True or False
 */
function helper_ramcfg_is_global_it_enabled(config){
  let ret = false;
  if (config.hasOwnProperty('additional'))
  {
    if (config.additional.enable_ecc)
    {
      ret = config.additional.enable_single_ecc_interrupt;
      if (config.additional.enable_double_ecc_interrupt)
          ret = ret || (config.additional.double_ecc_interrupt_line === 'RAMCFG interrupt');
    }
  }
  return ret;
}

/**
 * Check if the ECC NMI interrupt is enabled or not
 * @param {object} config, The RAMCFG instance config
 * @returns {boolean} True or False
 */
function helper_ramcfg_is_ecc_nmi_enabled(config){
  let ret = false;
  if (config.hasOwnProperty('additional'))
  {
    if (config.additional.enable_ecc)
    {
      if (config.additional.enable_double_ecc_interrupt)
          ret = (config.additional.double_ecc_interrupt_line === 'NMI (Non-Maskable Interrupt)');
    }
  }
  return ret;
}

function helper_ramcfg_get_it_enum(layer, config){
  let it_enum = '';
  try {
    if(layer == 'HAL')
    {
      let tmp_arr = []
      if(config.additional.enable_single_ecc_interrupt)
        tmp_arr.push('HAL_RAMCFG_IT_ECC_SINGLE');
      if (config.additional.enable_double_ecc_interrupt)
      {
        if (config.additional.double_ecc_interrupt_line === 'RAMCFG interrupt')
          tmp_arr.push('HAL_RAMCFG_IT_ECC_DOUBLE');
        else
          tmp_arr.push('HAL_RAMCFG_IT_ECC_DOUBLE_NMI');
      }
      it_enum = tmp_arr.join(' | ');
    }
    else
    {
      let tmp_arr = []
      if(config.additional.enable_single_ecc_interrupt)
        tmp_arr.push('LL_RAMCFG_IT_SE');
      if (config.additional.enable_double_ecc_interrupt)
      {
        if (config.additional.double_ecc_interrupt_line === 'RAMCFG interrupt')
          tmp_arr.push('LL_RAMCFG_IT_DE');
        else
          tmp_arr.push('LL_RAMCFG_IT_NMI');
      }
      it_enum = tmp_arr.join(' | ');
    }
  } catch (error) {
    console.error(`[ERROR] helper_ramcfg_get_it_enum: ${error}`);
  }
  return it_enum;
}

/**
  * Retrieve all the interruptions set by RAMCFG but not generated
  * @param {object} nvic_api Getter on NVIC api
  * @param {object} exti_api Getter on EXTI api
  * @param {object} resource Current resource
  * @param {object} config   Current configuration of the RAMCFG
  * @returns {object}
  */
function helper_ramcfg_get_irq_handler(nvic_api, exti_api, resource, config) {
  let result = [];
  try {
    console.info(`helper_ramcfg_get_irq_handler: resource=${resource}, config=${JSON.stringify(config)}`
    );

    /** Reference all the elements which enable the ramcfg interruptions */
    const list_interrupts = [
      { enable: "ramcfg_interruption", irq_handler_generation: "irq_handler_generation"       , nvic_context: "irq_config1" },
    ];

    /** Parse the list of interruptions */
    for (let index = 0; index < list_interrupts.length; index++) {
      const element = list_interrupts[index];
      /** Check if interruption has beenn enabled on the ramcfg */
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
    }
  } catch (e) {
    console.error(`helper_ramcfg_get_irq_handler: ${e}`);
  }
  return result;
}

/**
 * Parse an NVIC context array and return items 2 and 3
 * @param {Array} arr The NVIC context array
 * @returns {Array} A list containing the 2nd and 3rd items
 */
function helper_ramcfg_parse_nvic_context(arr) {
  try {
    if (!Array.isArray(arr)) return {};
    return { instance: arr[1], generate_handler: arr[2] };
  } catch (e) {
    console.error(`[ERROR] helper_ramcfg_parse_nvic_context: ${e}`);
    return {};
  }
}

/**
 * Returns the LUT table used in LL code optimization common helpers.
 *
 * @param {String} ip_version - Version of IP must be 'V1".
 * @returns {Tab}
 */
function helper_ramcfg_get_lut_table(ip_version) {
  if (ip_version == 'V1'){
    return LL_RAMCFG_Functions_V1;
  }
  else{
    console.error(`[ERROR] helper_ramcfg_get_lut_table bad input`);
    return null;
  }
}

module.exports = {
  helper_ramcfg_breakpoint,
  helper_ramcfg_is_global_it_enabled,
  helper_ramcfg_is_ecc_nmi_enabled,
  helper_ramcfg_get_it_enum,
  helper_ramcfg_get_irq_handler,
  helper_ramcfg_parse_nvic_context,
  helper_ramcfg_get_lut_table,
};