/**
 * @file ICACHE Helpers functions to provide service to the HAL components
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
 * Standalone simplified function to retrieve ICACHE peripheral start context.
 * Returns result.periphs array with objects having fields:
 * instance, fct_name, fct_name_gethandle, fct_name_aliases, layer, generated, default, interruption
 *
 * @param {object} sw_project_api - Software project API to get used components.
 * @param {object} sw_config_api - Software configuration API to get instances and configurations.
 * @param {object} periph_api - Peripheral API to get peripheral bindings.
 * @returns {object} Result object containing an array of ICACHE peripheral contexts.
 */
function helper_icache_get_start_context(
  sw_project_api,
  sw_config_api,
  periph_api,
) {
  console.info(`helper_icache_get_start_context: Start processing ICACHE peripherals`);

  // Helper: add lowercase config suffix (e.g. "_my_cfg")
  function addConfigLC(str) {
    return (str && typeof str === "string") ? "_" + str.toLowerCase().replace(/-/g, "_") : "";
  }

  // Helper: generate function name, e.g. "mx_icache_hal"
  function generateFunctionName(resource, layer, fct_type) {
    if (!resource || !layer) return "";
    return "mx_" + resource.toLowerCase() + addConfigLC(fct_type);
  }

  let result = { periphs: [] };
  let save_hal_handle = {};

  try {
    // Get all components under STM32CubeMX2 Config cgroup
    const components = sw_project_api.getUsedComponents('asObject', { hash: { cgroup: 'STM32CubeMX2 Config' } });

    components.forEach(component => {
      if (component.csub === "ICACHE") {
        const instances = sw_config_api.getInstances(component.original_id);

        instances.forEach(instance_id => {
          const config = sw_config_api.getSwInstanceConfiguration(instance_id);
          const layer = config.info.layer;

          let resource = periph_api.getPeripheralBoundToSoftwareInstance(instance_id);
          if (resource && resource.includes('.')) {
            resource = resource.split('.', 1)[0];
          }

          // Determine interruption string: only ERROR or NONE, no ECC handling
          const cacheErrorEnabled = config.system?.nvic?.chose_error_interrupt?.cache_error === true;
          let interruption = "";
          if (layer === "HAL") {
            interruption = cacheErrorEnabled ? 'HAL_ICACHE_IT_ERROR' : 'HAL_ICACHE_IT_NONE';
          } else {
            interruption = cacheErrorEnabled ? 'LL_ICACHE_IER_ERRIE' : '';
          }

          // Generate function names
          const fct_name = generateFunctionName(resource, layer, undefined);

          let fct_name_gethandle = "";
          if (!save_hal_handle[resource]) {
            fct_name_gethandle = generateFunctionName(resource, layer, undefined);
            save_hal_handle[resource] = true;
          }

          // Generate aliases from labels + cfg_name
          const labels = config.info.labels || [];
          const cfg_name = config.cfg_name || "";
          const fct_name_aliases = labels.map(label =>
            label.toLowerCase().replace(/-/g, "_").replace(/ /g, "_") + addConfigLC(cfg_name)
          );

          // Push the object with exact required fields
          result.periphs.push({
            instance: resource,
            fct_name: fct_name,
            fct_name_gethandle: fct_name_gethandle,
            fct_name_aliases: fct_name_aliases,
            layer: layer,
            generated: true,
            default: true,
            interruption: interruption,
          });
        });
      }
    });
  } catch (e) {
    console.error(`helper_icache_get_start_context: Exception caught - ${e}`);
  }

  console.debug(`helper_icache_get_start_context: Result = ${JSON.stringify(result, null, 2)}`);
  return result;
}

/**
  * Retrieve all the interruptions set by ICACHE but not generated
  * @param {object} nvic_api Getter on NVIC api
  * @param {object} resource Current resource
  * @param {object} config current configuration of the ICACHE
  * @returns {object}
 */
function helper_icache_get_irq_handler(nvic_api, exti_api, resource, config) {
  let result = [];
  try {
    console.info(`helper_icache_get_irq_handler: resource= ${resource}, config=${JSON.stringify(config)}`
    );

    /** Reference all the elements which enable the ICACHE interruptions */
    const list_interrupts = [
      { enable: "enable_interruption", irq_handler_generation: "irq_handler_generation", nvic_context: "irq_config1" }
    ];

    /** Parse the list of interruptions */
    for (let index = 0; index < list_interrupts.length; index++) {
      const element = list_interrupts[index];
      /** Check if interruption has beenn enabled on the ICACHE */
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
    console.error(`helper_icache_get_irq_handler: ${e}`);
  }
  return result;
}



module.exports = {
  helper_icache_get_start_context,
  helper_icache_get_irq_handler
};
