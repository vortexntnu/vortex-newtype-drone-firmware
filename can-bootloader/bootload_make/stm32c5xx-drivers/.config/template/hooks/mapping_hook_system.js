/**
 ******************************************************************************
 * @file    mapping_hook_system.js
 * @brief   This file implements functions providing the mapping logic for SYSTEM and CORE components.
 ******************************************************************************
  * @attention
  *
  * Copyright (c) 2026 STMicroelectronics.
  * All rights reserved.
  *
  * This software is licensed under terms that can be found in the LICENSE file
  * in the root directory of this software component.
  * If no LICENSE file comes with this software, it is provided AS-IS.
  *
 ******************************************************************************
 */

/**
 * Nominal hook as per embedded software architecture
 *
 * We expect the codegen service to call this hook per component.
 *
 * @param {string}   component_id         identifier of the component being processed by the codegen service
 * @param {array}    component_templates  array of templates for component_id
 * @param {function} _get_hw_instances     function returning the hardware instances (from the configuration data model) associated to the component id
 * @param {function} get_global_getters_registry     function returning the get_global_getters_registry
 * @param {object}   cfg_data             configuration data for the current software project
 * @param {string}   _secure_ctxt          indicates if the context is 'None' (no security), 'Secure' (secure context), 'Non-secure' (non-secure context)
 * @param {string}   _genfileslist_folder  where to write the list of files to be generated
 * @param {function} _debug_print          function to evacuate logs
 * @return object describing the mapping rules to be applied, empty object if nothing to process
 */
module.exports.main_grouping_hook = function (
  component_id,
  component_templates,
  _get_hw_instances,
  get_global_getters_registry,
  cfg_data,
  _secure_ctxt,
  _genfileslist_folder,
  debug_print,
  _strategy
) {
  let hook_result = [];
  try {
    /**
     * This function finds out which files must be generated based on the field info.interface (as implemented in .config/mx_led_parameters.json).
     * LED instances can use either the GPIO interface, or the PWM interface.
     * Templates for the GPIO codegen are located in .config/template/gpio; templates for the GPIO codegen are located in .config/template/pwm;
     * When some LED instances use the [GPIO/PWM] interface, then [GPIO/PWM] templates are used. The two sets of templates can be used together in the same project.
     */

    const globalGetters = get_global_getters_registry();
    const envVarGettersAPI = globalGetters.envVarGettersAPI.EnvVarAPI;

    for (const template of component_templates) {
      if (template === "stm32_external_env_template.h") {
        /**
         * Check if stm32_external_env.h must be generated
         *  - HSE or LSE or AUDIO_CLOCK or AUDIO is used in the project
         * */
        if (
          envVarGettersAPI.getVariableValue("RCC_PROJECT_HSE") ||
          envVarGettersAPI.getVariableValue("RCC_PROJECT_LSE") ||
          envVarGettersAPI.getVariableValue("RCC_PROJECT_AUDIO_CLOCK") ||
          envVarGettersAPI.getVariableValue("RCC_PROJECT_AUDIO") ||
          envVarGettersAPI.getVariableValue("HAL_SYSTEM_PROJECT_USE_VDD_VALUE")
        ) {
          hook_result.push(
            getHookResult(component_id, template, getTemplateName(template))
          );
        }
      } else if (template === "stm32_hal_timebase_template.h") {
        /**
         * Check if stm32_hal_timebase.h must be generated
         *  - HAL timebase selection in CORE panel is not set to SYSTICK
         * */
        let get_timebase = envVarGettersAPI.getVariableValue(
          "CORE_PROJECT_TIMEBASE"
        );
        if (get_timebase !== "SYSTICK" && get_timebase !== "CUSTOM") {
          hook_result.push(
            getHookResult(component_id, template, getTemplateName(template))
          );
        }
      } else if (template === "stm32c5xx_hal_conf_template.h") {
        /**
         * Check if stm32c5xx_hal_conf_template.h must be generated
         *  - The project is not LL only
         * */
        let get_env_domain =
          globalGetters.envVarGettersAPI.EnvVarAPI.getEnvDomain();
        const usesHAL = Object.values(get_env_domain).some(envVar =>
          envVar && envVar.name && envVar.name.endsWith("_PROJECT_USE_HAL")
        );
        if (usesHAL) {
          hook_result.push(
            getHookResult(component_id, template, getTemplateName(template))
          );
        }
      } else if (template === "stm32_ll_template.h") {
        /**
         * Check if stm32_ll_template.h must be generated
         *  - The project has at least one component using LL generated functions
         * */
        const hasLL = Object.values(cfg_data).some(arr =>
          arr.some(obj =>
            obj.settings &&
            obj.settings.parameters &&
            obj.settings.parameters.info &&
            obj.settings.parameters.info.layer === "LL"
          )
        );
        if (hasLL) {
          // At least one component uses LL generated functions
          hook_result.push(
            getHookResult(component_id, template, getTemplateName(template))
          );
        }
      } else {
        /** Default templates, can be added automatically */
        hook_result.push(
          getHookResult(component_id, template, getTemplateName(template))
        );
      }
    }
  } catch (error) {
    debug_print(
      `Error in mapping hook for component ${component_id} : ${error.message}`
    );
  }
  return hook_result;
};

function getTemplateName(templateFileName) {
  return templateFileName.replace("_template", "");
}
function getHookResult(component_id, templateName, outputFileName) {
  return {
    component: component_id,
    resource_type: "COMPONENT_ENTRY",
    resource: "no hardware resource",
    template: templateName,
    output: outputFileName,
  };
}
