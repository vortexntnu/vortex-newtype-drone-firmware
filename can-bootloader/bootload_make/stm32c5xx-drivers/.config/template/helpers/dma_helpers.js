/**
  * @file Common Helpers functions to provide service to the DMA component
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
 * Retrieve the list of DMA channel instances used in the I2Cx instance
 * @param {object} uuid Configurations defined for the a SW instance
 * @param {object} dma_instances List all the dma channel found in different SW instance
 * @returns Concatenate in a array the list of the unique DMA channel instance
 *          ex: dma_instance [{ id: '<uuid-#4>' }, { id: '<uuid-#5>' }]
 */
function helper_dma_get_dma_handle(uuids, dma_instances) {
  let result = [];
  try {
    console.info(`helper_dma_get_dma_handle: uuid=${JSON.stringify(uuids)}, dma_instances=${JSON.stringify(dma_instances)}`
    );
    if (dma_instances !== "undefined") {
      result = dma_instances;
    }
    let dma_instance = uuids["resourceId"];
    if (result.indexOf(dma_instance) < 0) {
      result.push(dma_instance);
    }
  } catch (e) {
    console.error(`helper_dma_get_dma_handle: ${e}`);
  }
  return result;
}

/**
 * Retrieve the list of DMA channel instances used in the I2Cx instance
 * @param {string} dma_instance DMA channel string (ex GPDMA1_CH5)
 * @returns {string} return the DMA instance name (ex GPDMA1 or LPDMA1)
 */
function helper_dma_get_parent(dma_instance) {
  let result;
  try {
    console.info(`helper_dma_get_parent: dma_instance=${JSON.stringify(dma_instance)}`
    );
    result = dma_instance.split("_");
    result = result[0];
  } catch (e) {
    console.error(`helper_dma_get_parent: ${e}`);
  }
  return result;
}

/**
 * Return the value to set in the request parameter
 * @param {string} dma_instance DMA channel string (ex GPDMA1_CH5)
 * @param {string} layer HAL or LL
 * @param {string} request request from DFP (ex: tim8_ch3_dma)
 * @returns {string} HAL or LL value (ex: HAL_GPDMA1_REQUEST_TIM8_CC3 or LL_GPDMA1_REQUEST_TIM8_CC3)
 */
function helper_dma_get_request(dma_instance, layer, request) {
  let result;
  try {
    console.info(`helper_dma_get_request: dma_instance=${dma_instance}, layer=${layer}, request=${request}`);

    let dma_parent = dma_instance.split("_");
    dma_parent = dma_parent[0];

    const map_dma_request = {
      dac1_dma: "DAC1_CH1",
      dac2_dma: "DAC1_CH2",
      dcmi_dma_pssi_dma: "DCMI_PSSI",
    };

    let req;
    if (map_dma_request.hasOwnProperty(request)) {
      req = map_dma_request[request].toUpperCase();
    }
    else {
      req = request.split("_dma");
      req = req[0].toUpperCase();
    }

    result = layer + '_' + dma_parent + '_REQUEST_' + req;
  } catch (e) {
    console.error(`helper_dma_get_request: ${e}`);
  }
  return result;
}

/**
 * Return the value to set in the trigger parameter
 * @param {string} dma_instance DMA channel string (ex GPDMA1_CH5)
 * @param {string} layer HAL or LL
 * @param {string} trigger trigger from DFP (ex: exti5)
 * @returns {string} HAL or LL value (ex: HAL_GPDMA1_TRIGGER_EXTI5 or LL_GPDMA1_TRIGGER_EXTI5)
 */
function helper_dma_get_trigger(dma_instance, layer, trigger) {
  let result;
  try {
    console.info(`helper_dma_get_trigger`);

    let dma_parent = dma_instance.split("_");
    dma_parent = dma_parent[0];

    const map_dma_trigger = {
      'gpu2d_flag[0]': "GPU2D_FLAG0",
      'gpu2d_flag[1]': "GPU2D_FLAG1",
      'gpu2d_flag[2]': "GPU2D_FLAG2",
      'gpu2d_flag[3]': "GPU2D_FLAG3",
      'comp1_out_dma': "COMP1_OUT",
      'comp2_out_dma': "COMP2_OUT",
      'spi6_it or spi6_ait': "SPI6_IT_OR_SPI6_AIT",
    };

    let trig;
    if (map_dma_trigger.hasOwnProperty(trigger)) {
      trig = map_dma_trigger[trigger];
    }
    else {
      trig = trigger;
    }
    trig = trig.toUpperCase();

    result = layer + '_' + dma_parent + '_TRIGGER_' + trig;
  } catch (e) {
    console.error(`helper_dma_get_trigger: ${e}`);
  }
  return result;
}

/**
 * Convert data width defined in string to a integer value for calculation
 * @param {string} data_width Data width in string format (BYTE, HALFWORD, WORD or DOUBLEWORD)
 * @returns {integer} Data width converted in number of bytes (1, 2, 4 or 8)
 */
function helper_dma_convert_data_width(data_width) {
  let result = 1; // Default value
  try {
    console.info(`helper_dma_convert_data_width`);

    const map_data_width = {
      'BYTE': 1,
      'HALFWORD': 2,
      'WORD': 4,
      'DOUBLEWORD': 8,
    };

    if (map_data_width.hasOwnProperty(data_width)) {
      result = map_data_width[data_width];
    }
  } catch (e) {
    console.error(`helper_dma_convert_data_width: ${e}`);
  }
  return result;
}

/**
 * Return DMA mode.
 * @note set the USE_HAL_DMA_LINKEDLIST macro
 * @param {boolean} use_dma_linkedlist dma configuration returned by CORE Init
 * @param {object} dma_standalone_configuration dma configuration returned by SWConfigurationAPI.getSwInstancesConfiguration getter from "DMA Init"
 * @returns {boolean} true or false
 */
function helper_dma_standalone_linkedlist(use_dma_linkedlist, dma_standalone_configuration) {
  let result = 0;
  let standalone_mode = 0;
  try {
    console.info(`helper_dma_standalone_linkedlist: use_dma_linkedlist=${use_dma_linkedlist}, dma_standalone_configuration=${JSON.stringify(dma_standalone_configuration)}`
    );
    dma_standalone_configuration.forEach(configuration => {
      if (standalone_mode !== 1) {
        standalone_mode = configuration.basic?.dma_mode ?? 0;
      }
    });

    if (
      (typeof use_dma_linkedlist === "undefined" && standalone_mode != 0) ||
      (typeof use_dma_linkedlist !== "undefined" && use_dma_linkedlist != 0) ||
      (standalone_mode != 0)
    ) {
      result = 1;
    }
  } catch (e) {
    console.error(`[ERROR] helper_dma_standalone_linkedlist: ${e}`);
  }
  return result;
}

/**
  * Retrieve the id for DMA configuration
  * @param {object} AllocatedResourceNeedsByComponent DMA Needs
  * @returns {array} return the the id for DMA configuration
  */
function helper_dma_get_need_id(AllocatedResourceNeedsByComponent) {
  const result = Array.from({ length: AllocatedResourceNeedsByComponent.length }, () => 0);
  try {
    for (let i = 0; i < AllocatedResourceNeedsByComponent.length; i++) {
      result[i] = AllocatedResourceNeedsByComponent[i].needId;
    }
  } catch (e) {
    console.error(`[ERROR] helper_dma_get_need_id: ${e}`);
  }
  return result;
}

/**
 * Return DMA mode.
 * @note set the USE_HAL_DMA_LINKEDLIST macro
 * @param {object} dma_need_configuration dma configuration returned by maAPI.getNeedById getter
 * @returns {boolean} true or false
 */
function helper_dma_need_linkedlist(dma_need_configuration) {
  let result = 0;
  try {
    if ((dma_need_configuration !== undefined)
      && (dma_need_configuration.configuration !== undefined)
      && (dma_need_configuration.configuration.basic !== undefined)
      && (dma_need_configuration.configuration.basic.dma_mode !== undefined)) {
      if (dma_need_configuration.configuration.basic.dma_mode != 0) {
        result = 1;
      }
    }
  } catch (e) {
    console.error(`[ERROR] helper_dma_need_linkedlist: ${e}`);
  }
  return result;
}

/**
 * Retrieve the DMA Node name
 * @param {string} request request from DFP (ex: tim8_ch3_dma)
 * @param {string} instance instance name (ex: I2C1)
 * @param {string} selector selector name (ex: TX)
 * @returns {string} HAL value (ex: DMA_Node_I2C1_TX or DMA_Node_SPI1_RX)
 */
function helper_dma_get_node(request, instance, selector) {
  let result;
  try {
    console.info(`helper_dma_get_node: request=${request}, instance=${instance}, selector=${selector}`);
    
    let req;
    req = request.split("_dma");
    req = req[0].toUpperCase();

    if (req.startsWith('XSPI') || req.startsWith('PSSI')) {
      result = 'DMA_Node_' + instance.toUpperCase() + '_' + selector.toUpperCase();
    } else {
      result = 'DMA_Node_' + req;
    }
    console.info(`helper_dma_get_node: DMA_Node=${result}`);
  } catch (e) {
    console.error(`[ERROR] helper_dma_get_node: ${e}`);
  }
  return result;
}

/**
  * Retrieve all the interruptions for the DMA inside a need but not generated
  * @param {object} nvic_api Getter on NVIC api
  * @param {object} dma_api Getter on DMA api
  * @param {object} resource Peripheral which has enabled the DMA
  * @returns {object}
  */
function helper_dma_need_get_irq_handler(nvic_api, dma_api, resource) {
  const result = [];
  try {
    console.info(`helper_dma_need_get_irq_handler: resource=${resource}`);

    const dma_needs = dma_api.getAllocatedResourceNeedsByHwInstance(resource);
    dma_needs.forEach(dma_need => {
      const dma_config = dma_api.getNeedById(dma_need.needId);
      /** Check the peripheral interruptions have been generated or not */
      const enableInterruption = dma_config.configuration.system?.nvic?.enable_interruption ?? false;
      if (enableInterruption) {
        /** Check if IRQ handler generated is done on code generation or not */
        const irqHandlerGeneration = dma_config.configuration.system?.nvic?.irq_handler_generation ?? false;

        if (!irqHandlerGeneration) {
          const labels = dma_config.configuration.info.labels || [];
          const nvic_config = nvic_api.getNeedById(dma_config.configuration.system?.nvic?.nvic_config?.needs[0].id);
          if (labels.length) {
            let first_label = true;
            for (const label of labels) {
              result.push({
                resource,
                channel_id: dma_config.resourceId,
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
              channel_id: dma_config.resourceId,
              alias: "",
              nvic_config,
              generated: false
            });
          }
        }
      }
    });
  } catch (e) {
    console.error(`helper_dma_need_get_irq_handler: ${e}`);
  }
  return result;
}

/**
  * Retrieve all the interruptions set by DMA but not generated
  * @param {*} nvic_api Getter on NVIC api
  * @param {object} exti_api Getter on EXTI api (not used)
  * @param {*} resource Current channel ID
  * @param {*} config current configuration of the DMA
  * @returns {object}
  */
function helper_dma_get_irq_handler(nvic_api, exti_api, resource, config) {
  let result = [];
  try {
    console.info(`helper_dma_get_irq_handler: resource=${resource}, config=${JSON.stringify(config)}`
    );

    /** Check the peripheral interruptions have been generated or not */
    const enableInterruption = config?.system?.nvic?.enable_interruption;
    if (!enableInterruption) return result;

    const irqHandlerGeneration = config.system?.nvic?.irq_handler_generation ?? false;

    if (!irqHandlerGeneration) {
      const labels = config.info?.labels || [];
      const nvic_config = nvic_api.getNeedById(config.system?.nvic?.nvic_config?.needs[0].id);
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
  } catch (e) {
    console.error(`helper_dma_get_irq_handler: ${e}`);
  }
  return result;
}

/**
  * Generate C preprocessor aliases for DMA linked-list (LLI) register accessors.
  * @param {object} dma_api DMA API (e.g. `@root.DmaAPI`)
  * @param {object} sw_config_api SWConfiguration API (e.g. `@root.SWConfigurationAPI`)
  * @returns {string} C code snippet containing comment banners and `#define` macros.
  * #define <LABEL>_dma_get_lli_reg mx_<request>_get_lli_reg
  */
function helper_dma_generate_lli_reg_aliases(dma_api, sw_config_api) {

  let result = "";
  try {
    console.info(`helper_dma_generate_lli_reg_aliases`);

    if (!dma_api || !sw_config_api) {
      return result;
    }

    const list_dma_needs = [];
    const allocated_needs = dma_api.getAllAllocatedResourceNeeds?.() ?? [];
    for (const allocated_need of allocated_needs) {
      const sw_instance_id = allocated_need?.swInstanceId;
      if (!sw_instance_id) continue;

      const sw_config = sw_config_api.getSwInstanceConfiguration(sw_instance_id);
      const layer = sw_config?.info?.layer;
      if (layer !== 'LL') continue;

      const need_id = allocated_need?.needId;
      if (!need_id) continue;

      const need_config = dma_api.getNeedById(need_id);
      const labels = need_config?.configuration?.info?.labels ?? [];
      const request = need_config?.configuration?.basic?.request?.id ?? "";
      const dma_mode = need_config?.configuration?.basic?.dma_mode;
      const mode_is_circular = dma_mode === 2;

      list_dma_needs.push({
        resource: allocated_need?.owner ?? "",
        channel: allocated_need?.resourceId ?? "",
        alias: Array.isArray(labels) ? labels.slice() : [],
        request,
        mode_is_circular,
      });
    }

    // Only print the banner once per resource.
    let display_instance = undefined;

    for (const need of list_dma_needs) {
      if (!need || need.mode_is_circular !== true) continue;

      const resource = need.resource ?? "";
      const channel = need.channel ?? "";
      const aliases = Array.isArray(need.alias) ? need.alias : [];
      const request = need.request ?? "";

      if (aliases.length) {
        if (display_instance !== resource) {
          result +=
            "  /* *******************************************************************\n" +
            `      ${resource} / ${channel}: aliases for DMA lli register functions\n` +
            "    ******************************************************************** */\n";
          display_instance = resource;
        }

        for (const alias of aliases) {
          result += `#define ${alias}_dma_get_lli_reg mx_${request}_get_lli_reg\n\n`;
        }
      } else {
        result +=
          "  /* ******************************************************************************************\n" +
          `    ${resource} / ${channel}: No software label has been defined for this peripheral instance\n` +
          "      in the STM32CubeMX2 configuration panel.\n" +
          "      As a result, no aliases are generated for lli register functions\n" +
          "    ****************************************************************************************** */\n\n";
      }
    }

    for (const need of list_dma_needs) {
      if (need.mode_is_circular === true) {
          result += "/* ########################################################### */";
          break;
      }
    }

  } catch (e) {
    console.error(`helper_dma_generate_lli_reg_aliases: ${e}`);
  }

  return result;
}

/**
  * Get security items based on xfer_sec.
  * @param {string} layer  "HAL" or "LL"
  * @param {Array<string>} xfer_sec
  * @returns {Array<string>} The security items
  */
function helper_dma_get_security_items(
  layer,
  xfer_sec
) {
  try {
    console.info(`helper_dma_get_security_items, xfer_sec=${xfer_sec}`);
    let result = "";
    const map_defined_security = {
      dest_sec:`${layer}_DMA_SEC_ITEM_DEST`,
      src_sec:`${layer}HAL_DMA_SEC_ITEM_SRC`,
    };

    const map_attribute = {
      SEC: 1,
      NSEC: 0,
    };
    
    let next_element = 0;
    for (const key in xfer_sec) {
      if (!Object.hasOwn(xfer_sec, key)) continue;

      let element = xfer_sec[key];
      element = map_attribute[element];
      if (element > 0) {
        if (next_element > 0) {
          result =  `${layer}_DMA_SEC_ITEM_ALL`;
          return result;
        }
        result += map_defined_security[key];
        next_element = 1;
      }
    }
    return result;
  } catch (e) {
    console.error(`[ERROR] helper_dma_get_security_items: ${e}`);
    return false;
  }
}

/**
 * Retrieve the LL DMA channel instances.
 * @param {string} dma_instance DMA channel string (ex GPDMA1_CH5)
 * @returns {string} return the LL DMA channel name (ex LL_DMA_CHANNEL_7 or LL_DMA_CHANNEL_11)
 */
function helper_dma_get_ll_channel(dma_instance) {
  let result;
  try {
    console.info(`helper_dma_get_parent: dma_instance=${JSON.stringify(dma_instance)}`
    );
    result = dma_instance.split("CH");
    result = 'LL_DMA_CHANNEL_' + result[1];
  } catch (e) {
    console.error(`helper_dma_get_parent: ${e}`);
  }
  return result;
}

module.exports = {

  helper_dma_get_dma_handle,

  helper_dma_get_parent,

  helper_dma_get_request,

  helper_dma_get_trigger,

  helper_dma_convert_data_width,

  helper_dma_standalone_linkedlist,

  helper_dma_get_need_id,

  helper_dma_need_linkedlist,

  helper_dma_get_node,

  helper_dma_need_get_irq_handler,

  helper_dma_get_security_items,

  helper_dma_get_ll_channel,

  helper_dma_get_irq_handler,

  helper_dma_generate_lli_reg_aliases

};
