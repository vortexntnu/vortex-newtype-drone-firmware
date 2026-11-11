/**
  * @file Common Helpers functions to provide service to the HAL components
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

var global_api = {};

/**
 * Globalize the application API, for them to be usable anywhere in helpers
 * @param {object} root is program root
 * @returns None
 */
function helper_globalize_API(root) {
  global_api['SWConfigurationAPI'] = root.SWConfigurationAPI;
  global_api['peripheralsResourceManagerAPI'] = root.peripheralsResourceManagerAPI;
  global_api['clockAPI'] = root.clockAPI;
}

/**
 * Concatenate selections to be able to generate them in 1 time
 * @param {string} pins Global pins
 * @param {string} layer Current layer prefix keyword
 * @param {string} pin Current pin to add in the global pins
 * @returns {string} Current added in the global pins.
 */
function helper_sbs_concatenate_selections(pins, layer, pin) {
  let result = "";
  let current_pin = layer + pin;
  try {
    if (pins == "") {
      result = current_pin;
    }
    else {
      result = pins + " | " + current_pin;
    }
    /* console.info(`helper_concatenate_pins: result=${JSON.stringify(result)}`); */
  } catch (e) {
    console.error(`[ERROR] helper_concatenate_pins: ${e}`);
  }
  return result;
}

/**
 * Check if the Object button is/are selected(TRUE/ FALSE)
 * @param {string} obj Object button
 * @returns {boolean} Object button state.
 */
function helper_sbs_any_true(obj) {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  for (const key in obj) {
    if (!Object.hasOwn(obj, key)) continue;
    const value = obj[key];

    // Direct boolean property
    if (value === true) {
      return true;
    }

    // Check direct sub-object for any true property
    if (typeof value === 'object' && value !== null) {
      for (const subKey in value) {
        if (!Object.hasOwn(value, subKey)) continue;
        if (value[subKey] === true) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Checks the SMBUS configuration for I2C instances (I2C1, I2C3, I2C4).
 * Iterates through the configuration and determines which I2C instances are assigned as owners.
 * @returns {Object} An object with boolean values indicating the presence of each I2C instance as an owner.
 *                   Example: { I2C1: true, I2C3: false, I2C4: true }
 */
function helper_sbs_check_i2C_smbus() {
  const result = { I2C1: false, I2C3: false, I2C4: false };
  try {
    let json = '{"cgroup": "STM32CubeMX2 Config", "csub": "SMBUS"}';
    let json_obj = JSON.parse(json);
    let configuration = global_api.SWConfigurationAPI.getInstancesConfiguration(json_obj);

    for (const config of configuration) {
      /* Defensive: check the path exists */
      const owner = config?.settings?.parameters?.system?.gpio?.gpio_scl?.needs?.[0]?.owner;
      if (owner === "I2C1") result.I2C1 = true;
      if (owner === "I2C3") result.I2C3 = true;
      if (owner === "I2C4") result.I2C4 = true;
    }
    console.info(`helper_sbs_check_i2C_smbus result:`, result);
  } catch (error) {
    console.error(`[ERROR] helper_sbs_check_i2C_smbus: ${error}`);
    return null;
  }
  return result;
}

/**
 * Check if the selected peripheral is active or not.
 * @param {string} periph peripheral object.
 * @returns {boolean} peripheral availablity state.
 */
function helper_sbs_check_peripheral(periph) {
  let result = false;
  try {
    /* Build the query object with the input periph */
    let json_obj = {
      cgroup: "STM32CubeMX2 Config",
      csub: periph
    };

    /* Get the configuration for the specific peripheral */
    let configuration = global_api.SWConfigurationAPI.getInstancesConfiguration(json_obj);

    /* Check if configuration is a non-empty array */
    if (Array.isArray(configuration) && configuration.length > 0) {
      result = true;
    }

    console.info(`helper_sbs_check_peripheral configuration:`, configuration);
    console.info(`helper_sbs_check_peripheral result:`, result);
  } catch (error) {
    console.error(`[ERROR] helper_sbs_check_peripheral: ${error}`);
    return null;
  }
  return result;
}

/**
  * Retrieve all the interruptions set by SBS but not generated
  * @param {object} nvic_api Getter on NVIC api
  * @param {object} exti_api Getter on EXTI api
  * @param {object} resource Current resource
  * @param {object} config current configuration of the SBS
  * @returns {object[]}
  */
function helper_sbs_get_irq_handler(nvic_api, exti_api, resource, config) {
  let result = [];
  try {
    console.info(
      `helper_sbs_get_irq_handler: resource=${resource}, config=${JSON.stringify(config)}`
    );

    /** Check the peripheral interruptions have been generated or not */
    const enableInterruption = config?.system?.nvic?.bridge_error_interruption ?? false;
    if (enableInterruption) {

      /** Check if IRQ handler generated is done on code generation or not */
      const irqHandlerGeneration = config.system?.nvic?.irq_handler_generation ?? false;

      if (!irqHandlerGeneration) {
        const labels = config.info?.labels || [];
        const nvic_config = nvic_api.getNeedById(config.system?.nvic?.irq_line_priority?.needs[0].id);
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
    console.error(`helper_sbs_get_irq_handler: ${e}`);
  }
  return result;
}

/**
 * Classifies attribute settings across all access level entries for SBS.
 * Returns an object with three booleans:
 *  - allPositive: true only if every entry is 1 (or true)
 *  - allNegative: true only if every entry is 0 (or false)
 *  - allConsistent: true if all entries are either allPositive or allNegative
 * Empty or invalid inputs return all flags false to avoid vacuous truth.
 * @param {object} access_levels
 * @returns {{allPositive: boolean, allNegative: boolean, allConsistent: boolean}}
 */
function helper_sbs_attribute_all_states(access_levels) {
  const result = { allPositive: false, allNegative: false, allConsistent: false };
  const map_attribute = {
    SEC: 1,
    PRIV: 1,
    PUBLIC: 1,
    NSEC: 0,
    NPRIV: 0,
    NPUBLIC: 0,
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
    // console.info(`helper_sbs_attribute_all_states result = ${JSON.stringify(result)}`);
    return result;
  } catch (e) {
    console.error(`helper_sbs_attribute_all_states: ${e}`);
    return result;
  }
}

/**
 * Get SBS attribute items based on layer, attribute, and access levels.
 * Attribute can be "SEC", "PRIV", or "LOCK".
 * Uses correct SBS item mapping for each attribute type.
 * @param {string} layer
 * @param {string} attribute
 * @param {object} access_levels
 * @returns {string} The selected attribute items as a bitwise OR string
 */
function helper_sbs_get_attribute_items(
  layer,
  attribute,
  access_levels
) {
  try {
    // Map for each attribute type
    let map_defined_attribute_items = {};
    if (attribute === "SEC") {
      map_defined_attribute_items = {
        clock:   layer + "_SBS_SEC_ITEM_CLOCK",
        classb:  layer + "_SBS_SEC_ITEM_CLASSB",
        fpu:     layer + "_SBS_SEC_ITEM_FPU"
      };
    } else if (attribute === "PRIV") {
      map_defined_attribute_items = {
        clock:   layer + "_SBS_PRIV_ITEM_CLOCK",
        classb:  layer + "_SBS_PRIV_ITEM_CLASSB",
        pm:      layer + "_SBS_PRIV_ITEM_PM",
        bridge:  layer + "_SBS_PRIV_ITEM_BRIDGE"
      };
    } else if (attribute === "LOCK") {
      map_defined_attribute_items = {
        clock:   layer + "_SBS_LOCK_ITEM_CLOCK",
        classb:  layer + "_SBS_LOCK_ITEM_CLASSB",
        pm:      layer + "_SBS_LOCK_ITEM_PM",
        bridge:  layer + "_SBS_LOCK_ITEM_BRIDGE",
        fpu:     layer + "_SBS_LOCK_ITEM_FPU"
      };
    }
    const map_attribute = {
      SEC: 1,
      PRIV: 1,
      PUBLIC: 1,
      NSEC: 0,
      NPRIV: 0,
      NPUBLIC: 0,
    };

    let result = "";
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

      if (element > 0 && map_defined_attribute_items[key]) {
        if (next_element > 0) {
          result += " | ";
        }
        result += map_defined_attribute_items[key];
        next_element = 1;
      }
    }
    return result;
  } catch (error) {
    console.error(`[ERROR] helper_sbs_get_attribute_items: ${error.message}`);
    return false;
  }
}

module.exports = {
  helper_globalize_API,
  helper_sbs_concatenate_selections,
  helper_sbs_any_true,
  helper_sbs_check_i2C_smbus,
  helper_sbs_check_peripheral,
  helper_sbs_get_irq_handler,
  helper_sbs_attribute_all_states,
  helper_sbs_get_attribute_items
};
