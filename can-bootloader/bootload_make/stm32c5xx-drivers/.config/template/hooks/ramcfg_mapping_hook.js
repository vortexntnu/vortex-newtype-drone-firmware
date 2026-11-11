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
 * @param {function} get_hw_instances     function returning the hardware instances (from the configuration data model) associated to the component id
 * @param {function} get_sw_instances     function returning the software instances (from the configuration data model) associated to the component id
 * @param {object}   cfg_data             configuration data for the current software project
 * @param {string}   secure_ctxt          indicates if the context is 'None' (no security), 'Secure' (secure context), 'Non-secure' (non-secure context)
 * @param {string}   genfileslist_folder  where to write the list of files to be generated
 * @param {function} debug_print          function to evacuate logs
 * @return object describing the mapping rules to be applied, empty object if nothing to process
 */
module.exports.main_grouping_hook = function (
  component_id,
  component_templates,
  get_hw_instances,
  get_getters_context,
  cfg_data,
  secure_ctxt,
  genfileslist_folder,
  debug_print,
  strategy
) {
  switch (strategy) {
    case "HW":
      return hw_grouping_hook(
        component_id,
        component_templates,
        get_hw_instances,
        get_getters_context,
        cfg_data,
        secure_ctxt,
        genfileslist_folder,
        debug_print
      );

    case "SW":
      return sw_grouping_hook(
        component_id,
        component_templates,
        get_hw_instances,
        get_getters_context,
        cfg_data,
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
 * @param {function} get_hw_instances     function returning the hardware instances (from the configuration data model) associated to the component id
 * @param {function} get_getters_context  function returning the DomainGettersAPI that contain the list of available getters
 * @param {object}   cfg_data             configuration data for the current software project
 * @param {string}   secure_ctxt          indicates if the context is 'None' (no security), 'Secure' (secure context), 'Non-secure' (non-secure context)
 * @param {string}   genfileslist_folder  where to write the list of files to be generated
 * @param {function} debug_print          function to evacuate logs
 * @return object describing the mapping rules to be applied, empty object if nothing to process
 */
function hw_grouping_hook(
  component_id,
  component_templates,
  get_hw_instances,
  get_getters_context,
  cfg_data,
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
    get_hw_instances == null ||
    cfg_data == null ||
    secure_ctxt == null
  ) {
    if (debug === true) {
      debug_print(
        "[ERROR] ramcfg_mapping_hooks.hw_grouping_hook: incorrect parameter(s)"
      );
    }
    /* exit now */
    return mapping_object;
  } else {
    if (debug === true) {
      debug_print("[INFO] ramcfg_mapping_hooks.hw_grouping_hook: starting");
    }
  }

  /*
   * Retrieve all hardware instances associated to component_id in the configuration data
   */
  my_hw_instances = get_hw_instances(component_id, cfg_data);
  // Keep only the child HW resource (change RAMCFG1.RAMCFG1_A to RAMCFG1_A)
  // my_hw_instances = my_hw_instances.map(item => item.split('.')[1]);
  console.info("my_hw_instances" + JSON.stringify(my_hw_instances))

  /**
    *   DomainGettersAPI { resourceManagerGettersAPI, pinoutGettersAPI, clockGettersAPI, swProjectLevelGettersAPI, swConfigGettersAPI, dmaGettersAPI, nvicGettersAPI, extiGettersAPI, envVarGettersAPI, hwPlateformGetters}
    */
  const globalGetters = get_getters_context();

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

  const periphMappingFromComp = peripheralsResourceManagerAPI?.getConfigurablePeripheralsFromComponent(component_id);
  console.info("periphMappingFromComp" + JSON.stringify(periphMappingFromComp))

  //step[2.3] ##LUT purpose##:
  // Iterate over the returned structure to extract the mapping peripherals for the current component.
  // Note: The returned object represents the global definition of mapping peripherals for a component, not just the bound peripherals
  /*
     * Example of a RAMCFG component LUT object:
      [
        {
          id: "RAMCFG",
          name: "RAMCFG",
          type: "ramcfg",
          associatedIps: [
            "RAMCFG.RAMCFG_SRAM1",
            "RAMCFG_SRAM1",
            "RAMCFG.RAMCFG_SRAM2",
            "RAMCFG_SRAM2",
          ],
          children: [
            {
              id: "RAMCFG.SRAM1",
              name: "SRAM1",
              type: "ramcfg",
              associatedIps: [
                "RAMCFG.RAMCFG_SRAM1",
                "RAMCFG_SRAM1",
              ],
            },
            {
              id: "RAMCFG.SRAM2",
              name: "SRAM2",
              type: "ramcfg",
              associatedIps: [
                "RAMCFG.RAMCFG_SRAM2",
                "RAMCFG_SRAM2",
              ],
            },
          ],
        },
        {
          id: "RAMCFG.SRAM1",
          name: "SRAM1",
          type: "ramcfg",
          associatedIps: [
            "RAMCFG.RAMCFG_SRAM1",
            "RAMCFG_SRAM1",
          ],
        },
        {
          id: "RAMCFG.SRAM2",
          name: "SRAM2",
          type: "ramcfg",
          associatedIps: [
            "RAMCFG.RAMCFG_SRAM2",
            "RAMCFG_SRAM2",
          ],
        },
      ]
  */

  const peripheralMappingConfig = {};

  //step[2.4]##LUT purpose##:
  // Converter step to update the LUT object for a component to a simple structure that contain the necessary data for code gen parent/block
  // const peripheralMappingConfig = {
  /*
    {
      RAMCFG: [
        "RAMCFG.SRAM1",
        "RAMCFG.SRAM2",
      ],
    }
  */

  periphMappingFromComp.forEach(item => {
      peripheralMappingConfig[item.name] = item.children?item.children.map(child => child.id):[];
  });
  // Remove keys with empty array
  for (const key in peripheralMappingConfig) {
    if (Array.isArray(peripheralMappingConfig[key]) && peripheralMappingConfig[key].length === 0) {
      delete peripheralMappingConfig[key];
    }
  }
  console.info("peripheralMappingConfig" + JSON.stringify(peripheralMappingConfig))

  /*
   * All hw instances code must end-up in the same file
   */
  let array_index = 0;

  // Process each peripheral group based on the mapping configuration
  for (const [peripheral, instances] of Object.entries(peripheralMappingConfig)) {
    /**
     * Remove parent HW resource
     */
    // Check if any of the instances are present in the current hardware instances
    const relevantInstances = my_hw_instances.filter(instance => instances.includes(instance)).map(item => {
      // Get the not-generated info from the Resource initialization
      // code generation param from current instance config panel
      const peripheralConfigList =
        peripheralsResourceManagerAPI.getPeripheralSoftwareConfigurationsForComponent(
          component_id,
          item
        ) || [];

      const firstPeripheralConfig = peripheralConfigList[0];
      const initTypeFromPeripheralConfig =
        firstPeripheralConfig?.info?.init_type;

      //  - when init_type === "disabled" => generated = false
      //  - when init_type !== "disabled" => generated = true
      //
      // Keep exactly the same behavior, just with clearer name:
      shouldGenerateCode =
        initTypeFromPeripheralConfig !== "disabled" ? true : false;


      // ## (generate or not) purpose##:
      //check if the instance to be generated or not
      if (!shouldGenerateCode) {
        return; // Skip to the next hw_instance
      }

      return item;
    }).filter(item => item !== undefined);

    if ((relevantInstances.length !== 0) && (peripheral !== undefined)) {
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
              "test_" + peripheral.toLowerCase() + "." + extension;
          }
        } else {
          /*driver template:  determine the secure context and update the filename */
          if (secure_ctxt === "none") {
            output_filename =
              "mx_" + peripheral.toLowerCase() + "." + extension;
          } else if (secure_ctxt == "Secure") {
            output_filename =
              "mx_" + peripheral.toLowerCase() + "_s." + extension;
          } else {
            /* assume Non-secure */
            output_filename =
              "mx_" + peripheral.toLowerCase() + "_ns." + extension;
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
          resource: peripheral,
          template: template,
          output: output_filename,
          generation_level: 'peripheral',
          context: relevantInstances,
          peripheral: peripheral
        };
        /* next array index */
        array_index++;
      } /* end loop on templates */
    }
  }

  if (debug === true) {
    str = JSON.stringify(mapping_object);
    debug_print("[Object] mapping_object=\n" + str);
  }

  if (debug === true) {
    debug_print("[INFO] ramcfg_mapping_hooks.hw_grouping_hook: returning");
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
 * @param {function} get_hw_instances     function returning the hardware instances (from the configuration data model) associated to the component id
 * @param {function} get_sw_instances     function returning the software instances (from the configuration data model) associated to the component id
 * @param {object}   cfg_data             configuration data for the current software project
 * @param {string}   secure_ctxt          indicates if the context is 'None' (no security), 'Secure' (secure context), 'Non-secure' (non-secure context)
 * @param {string}   genfileslist_folder  where to write the list of files to be generated
 * @param {function} debug_print          function to evacuate logs
 * @return object describing the mapping rules to be applied, empty object if nothing to process
 */
function sw_grouping_hook(
  component_id,
  component_templates,
  get_hw_instances,
  get_sw_instances,
  cfg_data,
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
