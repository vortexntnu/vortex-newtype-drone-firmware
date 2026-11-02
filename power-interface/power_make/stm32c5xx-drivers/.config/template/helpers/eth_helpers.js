/**
 * @file Helpers functions used for ETH SW component
 * @license
 * Copyright (c) 2026 STMicroelectronics.
 * All rights reserved.
 *
 * This software is licensed under terms that can be found in the LICENSE file
 * in the root directory of this software component.
 * If no LICENSE file comes with this software, it is provided AS-IS.
 */

/**
 * Return the MAC Address Parts.
 * @note set the Ethernet MAC Address Array
 * @param {string} mac_address_str MAC Address (i.e : '02:00:00:00:00:00')
 * @returns {array} array of strings
 */
function helper_eth_get_mac_address_from_string(mac_address_str) {
  var mac_parts = new Uint8Array(6); // creating an array of bytes, with 6 elements for MAC Address

  console.info(`helper_eth_get_mac_address_from_string: MAC Address - ${mac_address_str}`);

  try {
    mac_parts = mac_address_str.split(':');
    console.info(`helper_eth_get_mac_address_from_string: MAC Address Array - ${mac_parts}`);
  } catch (e) {
    console.error(`helper_eth_get_mac_address_from_string: ${e}`);
  }
  return mac_parts;
}

/**
  * Retrieve all the interruptions set by ETH but not generated
  * @param {object} nvic_api Getter on NVIC api
  * @param {object} exti_api Getter on EXTI api
  * @param {object} resource Current resource
  * @param {object} config current configuration of the ETH
  * @returns {object}
 */
function helper_eth_get_irq_handler(nvic_api, exti_api, resource, config) {
  let result = [];
  try {
    const upperResource = typeof resource === 'string' ? resource.toUpperCase() : resource;

    console.info(`helper_eth_get_irq_handler: resource= ${resource}, config=${JSON.stringify(config)}`
    );

    // Helper to push aliases for a given NVIC config and label set
    function pushAliases(nvic_cfg, labels) {
      if (!nvic_cfg) return;
      if (labels && labels.length) {
        let first_label = true;
          for (const label of labels) {
            result.push({
              resource: upperResource,
              exti_name: nvic_cfg.name,
              labels,
              first_label,
              alias: label.toUpperCase(),
              nvic_config: nvic_cfg,
              generated: false
            });
            first_label = false;
          }
      } else {
        result.push({
            resource: upperResource,
            exti_name: nvic_config.name,
            alias: "",
            nvic_config: nvic_cfg,
            generated: false
        });
      }
    }

    /** Reference all the elements which enable the ETH interruptions
     * @type {Array} List of interruptions available for the ETH
     * @property {string} enable Name of the property which enables the interruption
     * @property {string} irq_handler_generation Name of the property which indicates if IRQ handler generation is done or not
     * @property {string} nvic_context Name of the property which contains the NVIC context
     */
    const list_interrupts = [
      { enable: "enable_global_interrupt", irq_handler_generation: "irq_handler_generation_global", nvic_context: "nvic_config_global" }
    ];

    /** Parse the list of interruptions */
    for (let index = 0; index < list_interrupts.length; index++) {
      const element = list_interrupts[index];
      /** Check if interruption has been enabled on the ETH */
      const enableInterruption = config?.system?.nvic?.[element['enable']] ?? false;
      if (!enableInterruption) continue;

      /** Check if IRQ handler generated is done on code generation or not */
      const irqHandlerGeneration = config.system?.nvic?.[element['irq_handler_generation']] ?? false;

      if (!irqHandlerGeneration) {
        const labels = config.info?.labels || [];
        const nvic_config = nvic_api.getNeedById(config.system?.nvic?.[element['nvic_context']].needs[0].id);
        /** Fill the object to be used for aliases in mx_hal_def.h */
        pushAliases(nvic_config, labels);
      }
    }

    /** Reference all the elements which enable the EXTI interruptions for ETH
     * @type {Array} List of EXTI interruptions available for the ETH
     * @property {string} enable Name of the property which enables the interruption
     * @property {string} ext_context Name of the property which contains the EXTI context
     */
    const list_exti = [
      { enable: "enable_wakeup_interrupt", exti_context: "wakeup_exti_config" }
    ];

    /** Parse the list of exti */
    for (let index = 0; index < list_exti.length; index++) {
      const element = list_exti[index];
      /** Check if EXTI interruption has been enabled on the ETH */
      const enableExti = config?.additional?.[element['enable']] ?? false;
      if (!enableExti) continue;

      const exti_config = exti_api.getNeedById(config?.system?.exti?.[element['exti_context']].needs[0].id);
      const enableInterruption = exti_config.configuration.basic.interruption?.enable_interruption ?? false;
      const irqHandlerGeneration = exti_config.configuration.basic.interruption?.irq_handler_generation ?? false;
      if (enableInterruption && !irqHandlerGeneration) {
        const labels = exti_config.configuration.labels || [];
        const nvic_config = nvic_api.getNeedById(exti_config.configuration.basic.interruption.nvic.needs[0].id);
        /** Fill the object to be used for aliases in mx_hal_def.h */
        pushAliases(nvic_config, labels);
      }
    }
  } catch (e) {
    console.error(`helper_eth_get_irq_handler: ${e}`);
  }
  return result;
}

module.exports = {

  helper_eth_get_mac_address_from_string,
  helper_eth_get_irq_handler,

};
