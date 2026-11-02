/**
  * @file Helpers functions used for TAMPER SW component
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

const internal_tamper_array = [];
const internal_tamper_names = [];

/**
 * Parse internal tamper values and return number of available internals tampers on products base
 * on DFP informations
 * @param {object} rtc_tamper_features tamper features
 * @returns {integer} length of array avaible internal tamper for products
 */
function helper_tamp_internal_array_length(rtc_tamper_features) {
  let array_length = 0;
  try {
    for (let i = 1; i <= 16; i++) {
      const tamperKey = `tamper_int_${i}`;
      if (rtc_tamper_features[tamperKey] === 1) {
        array_length += 1;
        internal_tamper_array.push(`INTERNAL_TAMPER_${i}`);
        internal_tamper_names.push(`Internal tamper ${i}`);
     }
   }
  } catch (e) {
    console.error(`[ERROR] helper_tamp_internal_array_length: ${e}`);
  }

  return array_length;
}

/**
 * retun internal tamper object
 * @param {integer} index index of internal tamper
 * @returns {object} internal tamper
 */
function helper_tamp_internal_array_get_id(index) {
  try {
    return internal_tamper_array[index];
  } catch (e) {
    console.error(`[ERROR] helper_tamp_internal_array_index: ${e}`);
  }
}

function helper_tamp_internal_array_get_name(index) {
  try {
    return internal_tamper_names[index];
  } catch (e) {
    console.error(`[ERROR] helper_tamp_internal_array_index: ${e}`);
  }
}

/**
 * Compute the sample frequency
 * @param {integer} input_clock_frequency RTC clock frequency.
 * @param {integer} divider Passive tamper sample frequency divider.
 * @returns {integer} computed frequency
 */
function helper_tamp_compute_sample_frequency(
  input_clock_frequency,
  divider
){
  let result = 10000; /* default value to 10KHz */
  try {
    /* Calculate the output frequency */
    var sampling_time = input_clock_frequency / divider;

    /* Return the output frequency */
    result = Math.floor(sampling_time);
  } catch (e) {
    console.error(`helper_tamp_compute_sample_frequency: ${e}`);
  }

  return result;
}

/**
 * Check if one tamper is passive mode
 * @param {object} tampers Tampers list
 * @returns {boolean} true or false
 */
function helper_tamp_check_passive_mode(tampers) {
  try {
    if (tampers === undefined) {
      return false;
    }

    return tampers.find((tamper) => tamper.mode === "Passive") !== undefined;
  } catch (e) {
    console.error(`helper_tamp_check_passive_mode: ${e}`);
  }
}

/**
 * Check if one tamper is active mode
 * @param {object} tampers Tampers list
 * @returns {boolean} true or false
 */
function helper_tamp_check_active_mode(tampers) {

  try {
    if (tampers === undefined) {
      return false;
    }

    return tampers.find((tamper) => tamper.mode === "Active") !== undefined;
  } catch (e) {
    console.error(`helper_tamp_check_active_mode: ${e}`);
  }
}

/**
 * check if one tamper is active mode
 * @param {integer} tamper_id id of the tamper
 * @param {integer} nb_tampers numbers of tampers
 * @returns {boolean} true or false
 */
function helper_tamp_active_output(tamper_id, nb_tampers) {
  let output_tamper = "1";
  let tamper_id_string = tamper_id.toString();
  try {
    for (let i = 1; i < nb_tampers+1; i++)
    {
      if(tamper_id_string.includes(i.toString()))
        output_tamper = i;
    }

  } catch (e) {
    console.error(`helper_tamp_active_output: ${e}`);
  }
  return output_tamper;
}

/**
 * Check if the tamper_id needs to configure a GPIO
 * @param {object} tamper element of the tamper list
 * @param {integer} tamper_id id of the tamper
 * @returns {boolean} true or false
 */
function tamper_need_gpio(tamper, tamper_id) {
  let result = false;
  try {
    if (tamper === undefined || tamper_id === undefined) {
      return false;
    }

    if (tamper !== undefined && tamper.use_channel)
    {
        result = true;
    }
  } catch (e) {
    console.error(`tamper_need_gpio: ${e}`);
  }

  return result;
}

/**
 * Check if a GPIO is used
 * @param {object} config configuration object
 * @returns {boolean} true or false
 */
function helper_tamp_need_at_least_one_gpio(basic) {
  let result = false;
  try {
    if (basic === undefined) {
      return false;
    }

    /* Check tampers GPIOs */
    const tampers = basic.tamper_indiv_config.tampers;

    for (const config_tamp of tampers) {
      result = tamper_need_gpio(config_tamp, config_tamp._foreignKey);
      if (result)
        return result;
    }
  } catch (e) {
    console.error(`helper_tamp_need_at_least_one_gpio: ${e}`);
  }

  return result;
}

/**
 * Check if at least one tamper is in input mode
 * @param {object} tampers list of configured tampers
 * @param {integer} tamper_id id of the tamper
 * @returns {boolean} true or false
 */
function helper_tamp_need_gpio_in_tamper(tampers, tamper_id) {
  let result = false;

  try {
    if (tampers === undefined || tamper_id === undefined) {
      return false;
    }
    const tamper_id_str = tamper_id.toString();

    let config_tamp = tampers.find(function (tamper) {
      return tamper["_foreignKey"] === tamper_id_str;
    });

    result = tamper_need_gpio(config_tamp, tamper_id);
  } catch (e) {
    console.error(`helper_tamp_need_gpio_in_tamper: ${e}`);
  }
  return result;
}

/**
 * Check if at least one tamper is in output mode
 * @param {object} tampers list of configured tampers
 * @param {integer} tamper_id id of the tamper
 * @returns {boolean} true or false
 */
function helper_tamp_need_gpio_out_tamper(basic, tamper_id) {
  let result = false;

  try {
    if (basic.tamper_indiv_config.tampers === undefined || tamper_id === undefined) {
      return false;
    }
    const tamper_id_str = tamper_id.toString();

    if (basic.tamper_global_config.active.output_shared == false)
    {
      let config_tamp = (basic.tamper_indiv_config.tampers).find(tamper => tamper["_foreignKey"] === tamper_id_str);

      if (tamper_need_gpio(config_tamp, tamper_id)  && config_tamp.mode == "Active")
        return true;
    }
    else
    {
      let tamper_index = tamper_id_str.match(/\d+/);
      tamper_index = tamper_index ? parseInt(tamper_index[0], 10)  : null;

      for (const tamper of basic.tamper_indiv_config.tampers) {
        if (tamper.tamper_output == tamper_index)
          return true;
      }
    }
  } catch (e) {
    console.error(`helper_tamp_need_gpio_out_tamper: ${e}`);
  }
  return result;
}

/**
 * Convert HW TAMPER ID (TAMPER_X) to LL TAMPER ID (TAMP_X)
 * @note  This api is used directly in the mx_tamp_template.(c/h).hbs
 * @param {string} tamper tamper ID (TAMPER_X)
 * @returns {string} LL TAMPER ID (TAMP_X)
 */
function helper_tamp_convert(tamper) {
  try {
    const map_ll_tamper = {
      TAMPER_1: "TAMP_1",
      TAMPER_2: "TAMP_2",
      TAMPER_3: "TAMP_3",
      TAMPER_4: "TAMP_4",
      TAMPER_5: "TAMP_5",
      TAMPER_6: "TAMP_6",
      TAMPER_7: "TAMP_7",
      TAMPER_8: "TAMP_8",
    };
    return map_ll_tamper[tamper];
  } catch (e) {
    console.error(`helper_tamp_convert: ${e}`);
    return "";
  }
}

/**
 * Convert HW INTERNAL TAMPER ID (INTERNAL_TAMPER_X) to LL INTERNAL TAMPER ID (TAMP_ITAMPX)
 * @note  This api is used directly in the mx_tamp_template.(c/h).hbs
 * @param {string} tamper INTERNAL TAMPER ID (INTERNAL_TAMPER_X)
 * @returns {string} LL INTERNAL TAMPER ID (TAMP_ITAMPX)
 */
function helper_tamp_internal_convert(tamper) {
  try {
    const map_ll_tamper = {
      INTERNAL_TAMPER_1: "TAMP_ITAMP1",
      INTERNAL_TAMPER_2: "TAMP_ITAMP2",
      INTERNAL_TAMPER_3: "TAMP_ITAMP3",
      INTERNAL_TAMPER_4: "TAMP_ITAMP4",
      INTERNAL_TAMPER_5: "TAMP_ITAMP5",
      INTERNAL_TAMPER_6: "TAMP_ITAMP6",
      INTERNAL_TAMPER_7: "TAMP_ITAMP7",
      INTERNAL_TAMPER_8: "TAMP_ITAMP8",
      INTERNAL_TAMPER_9: "TAMP_ITAMP9",
      INTERNAL_TAMPER_10: "TAMP_ITAMP10",
      INTERNAL_TAMPER_11: "TAMP_ITAMP11",
      INTERNAL_TAMPER_12: "TAMP_ITAMP12",
      INTERNAL_TAMPER_13: "TAMP_ITAMP13",
      INTERNAL_TAMPER_14: "TAMP_ITAMP14",
      INTERNAL_TAMPER_15: "TAMP_ITAMP15",
    };
    return map_ll_tamper[tamper];
  } catch (e) {
    console.error(`helper_tamp_internal_convert: ${e}`);
    return "";
  }
}

/**
 * Convert trigger to LL defines
 * @note  This api is used directly in the mx_tamp_template.(c/h).hbs
 * @param {string} trigger trigger
 * @returns {string} trigger LL defines
 */
function helper_tamp_passive_trigger_convert(trigger) {
  try {

    if ((trigger == "RISING") || (trigger == "LOW"))
      return "DEACTIVATE_ALL";
    else
      return "TAMP";
  } catch (e) {
    console.error(`helper_tamp_passive_trigger_convert: ${e}`);
    return "";
  }
}

/**
  * Retrieve all the interruptions set by TAMP but not generated
  * @param {object} nvic_api Getter on NVIC api
  * @param {object} exti_api Getter on EXTI api (may not used)
  * @param {object} resource Current resource
  * @param {object} config current configuration of the TAMP
  * @returns {object}
  */
function helper_tamp_get_irq_handler(nvic_api, exti_api, resource, config) {
  let result = [];
  try {
    // console.info(//   `helper_tamp_get_irq_handler: resource= ${resource}, config=${JSON.stringify(config)}`
    // );

    /** Reference all the elements which enable the TAMP interruptions
     * @type {Array} List of interruptions available for the TAMP
     * @property {string} enable Name of the property which enables the interruption
     * @property {string} irq_handler_generation Name of the property which indicates if IRQ handler generation is done or not
     * @property {string} nvic_context Name of the property which contains the NVIC context
     * @property {string} selector Suffix to be added to the alias name (empty if global interrupt, starts with underscore with NVIC selector if not empty)
     */
    const list_interrupts = [
      { enable: "enable_interruption", irq_handler_generation: "irq_handler_generation", nvic_context: "irq_config", selector: "" },
    ];

    /** Parse the list of interruptions */
    for (let index = 0; index < list_interrupts.length; index++) {
      const element = list_interrupts[index];
      /** Check if interruption has been enabled on the TAMP */
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
    console.error(`helper_tamp_get_irq_handler: ${e}`);
  }
  return result;
}

/**
 * Format selected resources as a bitmask expression.
 * @param {Array} resources resource list
 * @param {string} prefix enum prefix
 * @returns {string} formatted expression
 */
function helper_tamp_format_resources(resources, prefix) {
  try {
    if (!prefix) {
      return "";
    }

    if (!Array.isArray(resources)) {
      return "";
    }

    const selected = [];
    for (const resource of resources) {
      if (resource && resource.use_resource) {
        const key = resource._foreignKey || resource.id;
        if (key) {
          selected.push(prefix + key);
        }
      }
    }

    if (selected.length === 0) {
      return "";
    }

    return selected.join(" | ");
  } catch (e) {
    console.error(`[ERROR] helper_tamp_format_resources: ${e}`);
  }
  return "";
}

/**
 * Format selected resource names for comments.
 * @param {Array} resources resource list
 * @returns {string} formatted names
 */
function helper_tamp_format_resource_names(resources) {
  try {
    if (!Array.isArray(resources)) {
      return "";
    }

    const selected = [];
    for (const resource of resources) {
      if (resource && resource.use_resource) {
        if (resource.name) {
          selected.push(resource.name);
        }
      }
    }

    if (selected.length === 0) {
      return "";
    }

    return selected.join(", ");
  } catch (e) {
    console.error(`[ERROR] helper_tamp_format_resource_names: ${e}`);
  }
  return "";
}

/**
 * Check if only backup registers is selected (default value).
 * @param {Array} resources resource list
 * @returns {boolean} true or false
 */
function helper_tamp_default_resources(resources) {
  try {
    if (!Array.isArray(resources)) {
      return false;
    }

    let has_backup_registers = false;
    for (const resource of resources) {
      if (resource && resource.use_resource) {
        const key = resource._foreignKey || resource.id;
        if (key === "_31") {
          has_backup_registers = true;
        } else {
          return false;
        }
      }
    }

    return has_backup_registers;
  } catch (e) {
    console.error(`[ERROR] helper_tamp_default_resources: ${e}`);
  }
  return false;
}

/**
 * Check if a resource key is disabled.
 * @param {Array} resources resource list
 * @param {string} resource_key resource key (e.g. "_31")
 * @returns {boolean} true or false
 */
function helper_tamp_is_resource_disabled(resources, resource_key) {
  try {
    if (!Array.isArray(resources) || !resource_key) {
      return false;
    }

    for (const resource of resources) {
      if (!resource) {
        continue;
      }
      const key = resource._foreignKey || resource.id;
      if (key === resource_key) {
        return !resource.use_resource;
      }
    }
  } catch (e) {
    console.error(`[ERROR] helper_tamp_is_resource_disabled: ${e}`);
  }
  return false;
}

/**
 * Check if at least one resource is enabled.
 * @param {Array} resources resource list
 * @returns {boolean} true or false
 */
function helper_tamp_is_resource_enabled(resources) {
  try {
    if (!Array.isArray(resources)) {
      return false;
    }

    return resources.find((resource) => resource && resource.use_resource) !== undefined;
  } catch (e) {
    console.error(`[ERROR] helper_tamp_is_resource_enabled: ${e}`);
  }
  return false;
}

/**
 * Classifies attribute settings across all access level entries.
 * Returns an object with three booleans:
 *  - allPositive: true only if every entry is 1
 *  - allNegative: true only if every entry is 0
 *  - allConsistent: true if all entries are either allPositive or allNegative
 * Empty or invalid inputs return all flags false to avoid vacuous truth.
 * @param {object} access_levels
 * @returns {{allPositive: boolean, allNegative: boolean, allConsistent: boolean}}
 */
function helper_tamp_attribute_all_states(access_levels) {
  const result = { allPositive: false, allNegative: false, allConsistent: false };
  const map_attribute = {
    SEC: 1,
    PRIV: 1,
    NSEC: 0,
    NPRIV: 0,
  };
  try {
    const values = Object.values(access_levels ?? {});

    let allPositive = true;
    let allNegative = true;
    for (let v of values) {
      if (typeof v === "boolean") {
        v = Number(v);
      }
      if (typeof v === "string") {
        v = map_attribute[v];
      }
      if (v !== 1) {
        allPositive = false;
      }
      if (v !== 0) {
        allNegative = false;
      }
      if (!allPositive && !allNegative) {
        break;
      }
    }

    result.allPositive = allPositive;
    result.allNegative = allNegative;
    result.allConsistent = allPositive || allNegative;
    console.info(`helper_tamp_attribute_all_states result = ${JSON.stringify(result)}`);
    return result;
  } catch (e) {
    console.error(`helper_tamp_attribute_all_states: ${e}`);
    return result;
  }
}

/**
 * Get security, privilege, public and lock items based on layer, security privilege, and access levels.
 * @param {string} layer
 * @param {string} attribute PRIV or SEC
 * @param {Array<string>} access_levels
 * @returns {Array<string>} The selected attribute items
 */
function helper_tamp_get_attribute_items(
  layer,
  attribute,
  access_levels
) {
  try {
    console.info("helper_tamp_get_attribute_items:", access_levels);

    let result = "";
    const map_defined_attribute_items = {
      tamper_protection: layer + "_TAMP_" + attribute + "_ITEM_TAMP",
      backup_registers_zone_1_protection: layer + "_TAMP_" + attribute + "_ITEM_BACKUP_ZONE_1",
      backup_registers_zone_2_protection: layer + "_TAMP_" + attribute + "_ITEM_BACKUP_ZONE_2",
      monotonic_counter_1_protection: layer + "_TAMP_" + attribute + "_ITEM_CNT1",
      monotonic_counter_2_protection: layer + "_TAMP_" + attribute + "_ITEM_CNT2",
    };
    const map_attribute = {
      SEC: 1,
      PRIV: 1,
      NSEC: 0,
      NPRIV: 0
    };
    let next_element = 0;
    for (const key in access_levels) {
      if (!Object.hasOwn(access_levels, key)) continue;
      let element = access_levels[key];
      if (typeof element === "boolean") {
        element = Number(element);
      }
      if (typeof element === "string") {
        element = map_attribute[element];
      }
      if (element > 0) {
        if (next_element > 0) {
          result += " | ";
        }
        if(layer == "LL"){
          result += map_defined_attribute_items[key] + attribute;
          result = result.replace("_ITEM_BACKUP_ZONE_1", "_ZONE_BKPRW");
          result = result.replace("_ITEM_BACKUP_ZONE_2", "_ZONE_BKPW");
        }
        else
        {
          result += map_defined_attribute_items[key];
        }
        next_element = 1;
      }
    }
    return result;
  } catch (error) {
    console.error(`[ERROR] helper_ltdc_get_attribute_items: ${error.message}`);
    return false;
  }
}

function helper_tamp_get_gpio_need(pinout_api, gpio_config, tamper_id, direction) {
  try {
    if (tamper_id !== undefined) {
      const tamperIndex = tamper_id.toString().match(/\d+/)?.[0];
      const gpioDirection = direction === "out" ? "out" : "in";
      gpio_config = gpio_config?.[`gpio_${gpioDirection}_${tamperIndex}`];
    }
    const needId = gpio_config?.needs?.[0]?.id;
    if (!needId) {
      return undefined;
    }
    return pinout_api.getNeedById(needId);
  } catch (error) {
    return { error: error.message };
  }
}

function helper_tamp_get_remap_define(gpio_need, remap_table) {
  try {
    const signalName = gpio_need?.signalName;
    const userLabel = gpio_need?.userLabels?.[0]
      ?? (gpio_need?.gpioPad ? `P${gpio_need.gpioPad.port}${gpio_need.gpioPad.index}` : undefined);

    if (!signalName || !userLabel || !remap_table) {
      return "";
    }

    const remap = remap_table.split("|").find((entry) => {
      const [tableSignalName, tableRemapPin] = entry.split(",");
      return tableSignalName === signalName && tableRemapPin === userLabel;
    });

    return remap?.split(",")?.[2] ?? "";
  } catch (error) {
    console.error(`helper_tamp_get_remap_define: ${error}`);
    return "";
  }
}

module.exports = {
  helper_tamp_internal_array_length,
  helper_tamp_internal_array_get_id,
  helper_tamp_internal_array_get_name,
  helper_tamp_compute_sample_frequency,
  helper_tamp_check_passive_mode,
  helper_tamp_check_active_mode,
  helper_tamp_active_output,
  helper_tamp_need_at_least_one_gpio,
  helper_tamp_need_gpio_in_tamper,
  helper_tamp_need_gpio_out_tamper,
  helper_tamp_convert,
  helper_tamp_internal_convert,
  helper_tamp_passive_trigger_convert,
  helper_tamp_get_irq_handler,
  helper_tamp_format_resources,
  helper_tamp_format_resource_names,
  helper_tamp_default_resources,
  helper_tamp_is_resource_disabled,
  helper_tamp_is_resource_enabled,
  helper_tamp_attribute_all_states,
  helper_tamp_get_attribute_items,
  helper_tamp_get_gpio_need,
  helper_tamp_get_remap_define
};
