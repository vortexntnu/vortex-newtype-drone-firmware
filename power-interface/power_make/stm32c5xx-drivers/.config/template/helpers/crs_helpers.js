/**
 * @file Helpers functions used for CRS SW component
 * @author GPM Application Team
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

/* Private constants -----------------------------------------------------------------------------------------------*/
/* Private variables -----------------------------------------------------------------------------------------------*/
const LL_CRS_functionsV1 = {
  LL_CRS_SetSyncDivider: ["LL_CRS_SYNC_DIV_1"],
  LL_CRS_SetSyncSignalSource: ["LL_CRS_SYNC_SOURCE_USB"],
  LL_CRS_SetSyncPolarity: ["LL_CRS_SYNC_POLARITY_RISING"],
  LL_CRS_SetReloadCounter: ["0xBB7F"],
  LL_CRS_SetFreqErrorLimit: ["0x22"],
  LL_CRS_ConfigTrimming: [["0x30"], ["LL_CRS_AUTO_TRIMMING_DISABLE"]],
};

/* Private function ------------------------------------------------------------------------------------------------*/
/* Exported functions ----------------------------------------------------------------------------------------------*/
/**
 * Returns the LUT table used in LL code optimization common helpers.
 *
 * @param {String} ip_version - Version of IP must be 'V1".
 * @returns {Tab}
 */
function helper_crs_get_lut_table(ip_version) {
  if (ip_version == 'V1'){
    return LL_CRS_functionsV1;
  }
  else{
    console.error(`[ERROR] helper_crs_get_lut_table bad input`);
    return null;
  }
}

/**
  * Retrieve all the interruptions set by CRS but not generated
  * @param {object} nvic_api Getter on NVIC api
  * @param {object} exti_api Getter on EXTI api (not used)
  * @param {object} resource Current resource
  * @param {object} config current configuration of the CRS
  * @returns {object}
 */
function helper_crs_get_irq_handler(nvic_api, exti_api, resource, config) {
  let result = [];
  try {
    console.info(`helper_crs_get_irq_handler: resource= ${resource}, config=${JSON.stringify(config)}`
    );

    /** Reference all the elements which enable the PPP interruptions
     * @type {Array} List of interruptions available for the PPP
     * @property {string} enable Name of the property which enables the interruption
     * @property {string} irq_handler_generation Name of the property which indicates if IRQ handler generation is done or not
     * @property {string} nvic_context Name of the property which contains the NVIC context
     * @property {string} selector Suffix to be added to the alias name (empty if global interrupt, starts with underscore with NVIC selector if not empty)
    */
    const list_interrupts = [
      { enable: "enable_interruption", irq_handler_generation: "irq_handler_generation", nvic_context: "irq_line", selector: ""},
    ];

    /** Parse the list of interruptions */
    for (let index = 0; index < list_interrupts.length; index++) {
      const element = list_interrupts[index];
      /** Check if interruption has been enabled on CRS */
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
    console.error(`helper_crs_get_irq_handler: ${e}`);
  }
  return result;
}

module.exports = {
  helper_crs_get_lut_table,
  helper_crs_get_irq_handler
};
