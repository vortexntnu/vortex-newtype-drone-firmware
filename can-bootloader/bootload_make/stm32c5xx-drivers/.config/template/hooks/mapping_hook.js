/**
  ******************************************************************************
  * @file    mapping_hook.js
  * @brief   This file implements functions providing the mapping logic to generate code.
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
 * Several SW instances can configure the same HW instance,
 * but the configuration code must end-up in the same mx_hwpppX.c file
 *
 * We expect the codegen service to call this hook per component.
 *
 * @param {string}   component_id         identifier of the component being processed by the codegen service
 * @param {array}    component_templates  array of templates for component_id
 * @param {function} _get_hw_instances     function returning the hardware instances (from the configuration data model) associated to the component id
 * @param {function} get_sw_instances     function returning the software instances (from the configuration data model) associated to the component id
 * @param {object}   _cfg_data             configuration data for the current software project
 * @param {string}   secure_ctxt          indicates if the context is 'None' (no security), 'Secure' (secure context), 'Non-secure' (non-secure context)
 * @param {string}   genfileslist_folder  where to write the list of files to be generated
 * @param {function} debug_print          function to evacuate logs
 * @return object describing the mapping rules to be applied, empty object if nothing to process
 */
module.exports.main_grouping_hook = function (
  component_id,
  component_templates,
  _get_hw_instances,
  get_getters_context,
  _cfg_data,
  secure_ctxt,
  genfileslist_folder,
  debug_print,
  _strategy
) {

  const globalGetters = get_getters_context();
  const strategy = globalGetters.envVarGettersAPI.EnvVarAPI.getVariableValue('SYSTEM_PROJECT_CODEGEN_STRATEGY');
  switch (strategy) {
    case "HW":
      return hw_grouping_hook(
        component_id,
        component_templates,
        get_getters_context,
        secure_ctxt,
        genfileslist_folder,
        debug_print
      );

    case "SW":
      return sw_grouping_hook(
        component_id,
        component_templates,
        get_getters_context,
        secure_ctxt,
        genfileslist_folder,
        debug_print
      );

    default:
      break;
  }
};
/**
 * Nominal hook as per embedded software architecture
 * Several SW instances can configure the same HW instance,
 * but the configuration code must end-up in the same stm32_hwpppX.c file
 *
 * We expect the codegen service to call this hook per component.
 *
 * @param {string}   component_id         identifier of the component being processed by the codegen service
 * @param {array}    component_templates  array of templates for component_id
 * @param {function} get_getters_context  function returning the DomainGettersAPI that contain the list of available getters
 * @param {string}   secure_ctxt          indicates if the context is 'None' (no security), 'Secure' (secure context), 'Non-secure' (non-secure context)
 * @param {string}   genfileslist_folder  where to write the list of files to be generated
 * @param {function} debug_print          function to evacuate logs
 * @return object describing the mapping rules to be applied, empty object if nothing to process
 */
function hw_grouping_hook(
  component_id,
  component_templates,
  get_getters_context,
  secure_ctxt,
  genfileslist_folder,
  debug_print
) {
  let mapping_object = {}; /* the object to return the mapping rules */
  let my_hw_instances; /* array of hardware instances associated to component_id */
  let debug = true; /* decide if we debug                                     */
  /* Disable the debug if no print function is provided (undefined or null) */
  if (debug_print == null) {
    debug = false;
  }
  /*
   * Parameters check: check null or undefined (so use ==)
   */
  if (
    component_id == null ||
    component_templates == null ||
    secure_ctxt == null
  ) {
    if (debug === true) {
      debug_print(
        "[ERROR] mapping_hooks.hw_grouping_hook: incorrect parameter(s)"
      );
    }
    /* exit now */
    return mapping_object;
  } else {
    if (debug === true) {
      debug_print("[INFO] mapping_hooks.hw_grouping_hook: starting");
    }
  }

  /**
   *   DomainGettersAPI { resourceManagerGettersAPI, pinoutGettersAPI, clockGettersAPI, swProjectLevelGettersAPI, swConfigGettersAPI, dmaGettersAPI, nvicGettersAPI, extiGettersAPI, envVarGettersAPI, hwPlateformGetters}
  */
 const globalGetters = get_getters_context();
 /*
  * Retrieve all hardware instances associated to component_id in the configuration data
  */
  if (component_id.includes("STMicroelectronics::Device:STM32CubeMX2 Config:GPIO")) {
    my_hw_instances =
      globalGetters?.pinoutGettersAPI?.pinoutAPI.getGpioGroupsIdentifiers(component_id);
  }
  else if (component_id.includes("STMicroelectronics::Device:STM32CubeMX2 Config:DMA@")) {
    my_hw_instances =
      globalGetters?.dmaGettersAPI?.DmaAPI.getAllAllocatedDMAResourcesBoundToStandalone(component_id);
  } else {
    my_hw_instances =
      globalGetters?.resourceManagerGettersAPI?.peripheralsResourceManagerAPI?.getPeripheralsBoundToSoftwareComponent(component_id);
  }

  /**
    * Domain name: peripheralsResourceManagerAPI
    * RM domain getter list:
    * [
    * "getConfigurablePeripheralsFromComponent" ## getter for LUT extraction
    * "getPeripheralBoundToSoftwareInstance"
    * "getPeripheralsBoundToSoftwareComponent"
    * "getPeripheralsBoundToSoftwareInstances"
    * "getPeripheralSoftwareConfigurationsForComponent"
    * "getSoftwareInstancesBoundToPeripheral"
    * ]
    */
  const peripheralsResourceManagerAPI = globalGetters?.resourceManagerGettersAPI?.peripheralsResourceManagerAPI;

  const hw_instances_ids =
    peripheralsResourceManagerAPI?.getPeripheralsBoundToSoftwareComponent(component_id);
  console.info(`Selected Peripherals : ${hw_instances_ids} for component_id: ${component_id}`);

  if (my_hw_instances.length === 0) {
    /* Return an empty object */
    if (debug === true) {
      debug_print("[WARNING] No HW instance found for: " + component_id);
    }
  } else {
    /*
     * All hw instances code must end-up in the same file
     */
    let array_index = 0;
    for (let hw_instance of my_hw_instances) {

      let shouldGenerateCode = true; // default value
      let initTypeFromPeripheralConfig = "";
      let peripheralConfigList = null;
      let firstPeripheralConfig = null;
      if (component_id.includes("STMicroelectronics::Device:STM32CubeMX2 Config:GPIO")) {
        peripheralConfigList =
          globalGetters?.pinoutGettersAPI?.pinoutAPI.getGpioGroupSoftwareConfigurations(
            hw_instance.id,
            component_id,
          ) || [];
        firstPeripheralConfig = peripheralConfigList[0].settings.parameters;
        hw_instance = hw_instance.name;
      }
      else if (component_id.includes("STMicroelectronics::Device:STM32CubeMX2 Config:DMA@")) {
        hw_instance = hw_instance.resourceId;
        peripheralConfigList =
          globalGetters?.dmaGettersAPI?.DmaAPI.getSoftwareInstancesBoundToStandalone(
            component_id,
            hw_instance,
          ) || [];
        firstPeripheralConfig = peripheralConfigList[0].configuration;
      } else {
        // Get the not-generated info from the Resource initialization
        // code generation param from current instance config panel
        peripheralConfigList =
          peripheralsResourceManagerAPI.getPeripheralSoftwareConfigurationsForComponent(
            component_id,
            hw_instance,
          ) || [];
        firstPeripheralConfig = peripheralConfigList[0];
      }
        initTypeFromPeripheralConfig =
          firstPeripheralConfig?.info?.init_type;
      console.info(
        "initTypeFromPeripheralConfig:",
        initTypeFromPeripheralConfig,
      );
      //  - when init_type === "disabled" => generated = false
      //  - when init_type !== "disabled" => generated = true
      //
      // Keep exactly the same behavior, just with clearer name:
      shouldGenerateCode =
        initTypeFromPeripheralConfig !== "disabled" ? true : false;


      const generated = shouldGenerateCode;

      // ## (generate or not) purpose##:
      //check if the instance to be generated or not
      if (!generated) {
        continue; // Skip to the next hw_instance
      }

      /**
       * Remove parent HW resource
       */
      let hw_instance_child = hw_instance;
      const dotIndex = hw_instance.indexOf('.');

      if (dotIndex !== -1) {
        // Get the substring after the first dot
        hw_instance_child = hw_instance.substring(dotIndex + 1);
      }

      if (debug === true) {
        debug_print("[INFO] Processing hw_instance: " + hw_instance_child);
      }
      if (hw_instance_child === undefined || hw_instance_child === null) {
        /* exit now */
        console.warn(
          "[WARNING] hw_grouping_hook: hw_instance_child is undefined or null"
        );
        return mapping_object;
      }

      /* Special case for Cortex-M core peripherals */
       if ((hw_instance_child === 'MPU') || (hw_instance_child === 'NVIC') || (hw_instance_child === 'IDAU/SAU')
          || (hw_instance_child === 'DEBUG') || (hw_instance_child === 'SCB') || (hw_instance_child === 'Systick')) {
        hw_instance_child = 'Cortex_' + hw_instance_child;
      }

      /* Apply it for all templates of this component (.c and .h) */
      for (const template of component_templates) {
        /*
         * Compute the proper output filename
         */
        let output_filename;
        let extension = template.split(".");
        extension = extension[1]; /* save the extension: .c or .h */

        if (debug === true) {
          debug_print("\t[INFO] Processing template: " + template);
        }

        /* Apply a specific processing for templates starting by mx_ (drivers) */
        let regex = /^mx_/;
        let driver_template = regex.exec(template);

        if (driver_template === null) {
          /* This is not a driver template : probably abnormal for this hook */
          if (debug === true) {
            debug_print("\t[WARNING] not a driver template: " + template);
          }
          regex = /^test_/;
          driver_template = regex.exec(template);
          if (driver_template === null) {
            output_filename = template.replace("_template", "");
            output_filename = output_filename.replace(".hbs", "");
          } else {
            output_filename =
              "test_" + hw_instance_child.toLowerCase() + "." + extension;
          }
        } else {
          /*driver template:  determine the secure context and update the filename */
          if (secure_ctxt === "none") {
            output_filename =
              "mx_" + hw_instance_child.toLowerCase() + "." + extension;
          } else if (secure_ctxt == "Secure") {
            output_filename =
              "mx_" + hw_instance_child.toLowerCase() + "_s." + extension;
          } else {
            /* assume Non-secure */
            output_filename =
              "mx_" + hw_instance_child.toLowerCase() + "_ns." + extension;
          }
        }

        if (debug === true) {
          debug_print("\t[INFO] output_filename: " + output_filename);
        }

        /*
         * Update the mapping object
         */
        mapping_object[array_index] = {
          component: component_id,
          resource_type:
            "hw_instance" /* indicate we group by hardware instance */,
          resource: hw_instance,
          template: template,
          output: output_filename,
          hw_resource: hw_instance_child
        };
        /* next array index */
        array_index++;
      } /* end loop on templates */
    } /* end loop on hardware instances */
  }

  if (debug === true) {
    str = JSON.stringify(mapping_object);
    debug_print("[Object] \n" + str);
  }

  if (debug === true) {
    debug_print("[INFO] mapping_hooks.hw_grouping_hook: returning");
  }

  /* Return the mapping object */
  return mapping_object;
}

/**
 * Alternate hook to prototype the possibility to provide several hooks.
 * Several SW instances can configure the same HW instance,
 * and the configuration code must end-up in different mx_swpppX.c file
 *
 * We expect the codegen service to call this hook per component.
 *
 * @param {string}   component_id         identifier of the component being processed by the codegen service
 * @param {array}    component_templates  array of templates for component_id
 * @param {function} get_sw_instances     function returning the software instances (from the configuration data model) associated to the component id
 * @param {string}   secure_ctxt          indicates if the context is 'None' (no security), 'Secure' (secure context), 'Non-secure' (non-secure context)
 * @param {string}   genfileslist_folder  where to write the list of files to be generated
 * @param {function} debug_print          function to evacuate logs
 * @return object describing the mapping rules to be applied, empty object if nothing to process
 */
function sw_grouping_hook(
  component_id,
  component_templates,
  get_sw_instances,
  secure_ctxt,
  genfileslist_folder,
  debugPrint
) {
  let arrayIndex = 0;
  let mappingObject = [];
  for (const template of component_templates) {
    let outputFilename = '';

    outputFilename = getTemplateName(template);

    /*
     * Update the mapping object
     */
    mappingObject.push(getHookResult(component_id, template, outputFilename))
    /* next array index */
    arrayIndex++;
  } /* end loop on templates */

  /* Return the mapping object */
  return mappingObject;
}

function getTemplateName(templateFileName) {
  if (!templateFileName) {
    return '';
  }
  return templateFileName.replace('_template', '').replace('.hbs', '');
}
function getHookResult(component_id, templateName, outputFileName) {
  return {
    component: component_id,
    resource_type: 'COMPONENT_ENTRY',
    resource: 'no hardware resource',
    template: templateName,
    output: outputFileName,
  };
}
