/**
  * @file Common Helpers functions to provide service to the HAL components
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

/** @global */
let CFG_Index = {}; // Save the current index of the configuration
/* Variables used for LL code optimization */
let OptimEnabled = false; //  Save if the LL optimization has been enabled
let LUT_Table = []; // Save the current peripheral LUT table
let PPP_Instance = undefined; // Save the current PPP instance
let Sub_Instances = undefined; // Save the current Sub instances

/*
  Variable to list all the SW compoents not based on
  Handle (return system_status_t)
  */
const ComponentWithNoHandle = ["gpio_default", "GPIO", "HSEM", "PWR", "RTC", "TAMP", "CORTEX MPU", "CORTEX NVIC", "CORTEX SCB",
  "CORTEX SYSTICK", "CORTEX DEBUG", "RCC", "SBS", "SYSCFG", "XSPIM", "FMC", "RAMCFG"];

/**
 * List of components not ranked at startup
 */
const ListComponentsNotRanked = ["CORTEX MPU", "RIF", "CORTEX NVIC", "ICACHE", "RCC", "PWR"];

const LL_OPTIM_LUT_ACCESSOR = {
  RCC: { file: './rcc_ll_optim_helpers.js', func: 'helper_rcc_get_lut_table', lut: undefined },
  PWR: { file: './pwr_helpers.js', func: 'helper_pwr_get_lut_table', lut: undefined },
  SBS: { file: './sbs_ll_optim_helpers.js', func: 'helper_sbs_get_lut_table', lut: undefined },
  EXTI: { file: './exti_ll_optim_helpers.js', func: 'helper_exti_get_lut_table', lut: undefined },
  GPIO: { file: './gpio_ll_optim_helpers.js', func: 'helper_gpio_get_lut_table', lut: undefined},
  DMA:  { file: './dma_ll_optim_helpers.js',  func: 'helper_dma_get_lut_table',  lut: undefined },
};

const IRQ_HANDLER_GETTER = {
  ADC: { file: './adc_helpers.js', func: 'helper_adc_get_irq_handler', dma_need_support: true, gpio_need_support: false },
  AES: { file: './aes_helpers.js', func: 'helper_aes_get_irq_handler', dma_need_support: true, gpio_need_support: false },
  COMP: { file: './comp_helpers.js', func: 'helper_comp_get_irq_handler', dma_need_support: false, gpio_need_support: true },
  "CORTEX DEBUG": { file: undefined, func: undefined, dma_need_support: false, gpio_need_support: true },
  CRS: { file: './crs_helpers.js', func: 'helper_crs_get_irq_handler', dma_need_support: false, gpio_need_support: true },
  DAC: { file: './dac_helpers.js', func: 'helper_dac_get_irq_handler', dma_need_support: true, gpio_need_support: false },
  DMA: { file: './dma_helpers.js', func: 'helper_dma_get_irq_handler', dma_need_support: false, gpio_need_support: false },
  ETH: { file: './eth_helpers.js', func: 'helper_eth_get_irq_handler', dma_need_support: false, gpio_need_support: true },
  FDCAN: { file: './fdcan_helpers.js', func: 'helper_fdcan_get_irq_handler', dma_need_support: false, gpio_need_support: true },
  FLASH: { file: './flash_helpers.js', func: 'helper_flash_get_irq_handler', dma_need_support: false, gpio_need_support: false },
  GPIO: { file: './gpio_helpers.js', func: 'helper_gpio_get_irq_handler', dma_need_support: false, gpio_need_support: false },
  HASH: { file: './hash_helpers.js', func: 'helper_hash_get_irq_handler', dma_need_support: true, gpio_need_support: false },
  HCD: { file: './usb_helpers.js', func: 'helper_usb_get_irq_handler', dma_need_support: false, gpio_need_support: true },
  ICACHE: { file: './icache_helpers.js', func: 'helper_icache_get_irq_handler', dma_need_support: false, gpio_need_support: false },
  IWDG: { file: './iwdg_helpers.js', func: 'helper_iwdg_get_irq_handler', dma_need_support: false, gpio_need_support: false },
  I2C: { file: './i2c_helpers.js', func: 'helper_i2c_get_irq_handler', dma_need_support: true, gpio_need_support: true },
  I2S: { file: './spi_helpers.js', func: 'helper_spi_get_irq_handler', dma_need_support: true, gpio_need_support: true },
  I3C: { file: './i3c_helpers.js', func: 'helper_i3c_get_irq_handler', dma_need_support: true, gpio_need_support: true },
  LPTIM: { file: './lptim_helpers.js', func: 'helper_lptim_get_irq_handler', dma_need_support: true, gpio_need_support: true },
  PCD: { file: './usb_helpers.js', func: 'helper_usb_get_irq_handler', dma_need_support: false, gpio_need_support: true },
  PKA: { file: './pka_helpers.js', func: 'helper_pka_get_irq_handler', dma_need_support: false, gpio_need_support: false },
  PWR: { file: './pwr_helpers.js', func: 'helper_pwr_get_irq_handler', dma_need_support: false, gpio_need_support: true },
  RAMCFG: { file: './ramcfg_helpers.js', func: 'helper_ramcfg_get_irq_handler', dma_need_support: false, gpio_need_support: false },
  RCC: { file: './rcc_helpers.js', func: 'helper_rcc_get_irq_handler', dma_need_support: false, gpio_need_support: true },
  RNG: { file: './rng_helpers.js', func: 'helper_rng_get_irq_handler', dma_need_support: false, gpio_need_support: false },
  RTC: { file: './rtc_helpers.js', func: 'helper_rtc_get_irq_handler', dma_need_support: false, gpio_need_support: true },
  SMBUS: { file: './i2c_helpers.js', func: 'helper_i2c_get_irq_handler', dma_need_support: false, gpio_need_support: true },
  SMARTCARD: { file: './smartcard_helpers.js', func: 'helper_smartcard_get_irq_handler', dma_need_support: true, gpio_need_support: true },
  SPI: { file: './spi_helpers.js', func: 'helper_spi_get_irq_handler', dma_need_support: true, gpio_need_support: true },
  TAMP: { file: './tamp_helpers.js', func: 'helper_tamp_get_irq_handler', dma_need_support: false, gpio_need_support: true },
  TIM: { file: './tim_helpers.js', func: 'helper_tim_get_irq_handler', dma_need_support: true, gpio_need_support: true },
  UART: { file: './uart_helpers.js', func: 'helper_uart_get_irq_handler', dma_need_support: true, gpio_need_support: true },
  USART: { file: './usart_helpers.js', func: 'helper_usart_get_irq_handler', dma_need_support: true, gpio_need_support: true },
  XSPI: { file: './xspi_helpers.js', func: 'helper_xspi_get_irq_handler', dma_need_support: true, gpio_need_support: true },
  WWDG: { file: './wwdg_helpers.js', func: 'helper_wwdg_get_irq_handler', dma_need_support: false, gpio_need_support: false },
};


/**
 * Add string if present in lowercase
 * @param {string} str input string
 * @returns {string} format _str
 */
function addConfigLC(str) {
  if (str && typeof str === "string") {
    return "_" + str.toLowerCase().replace("-", "_");
  }
  return "";
}

/**
 * Construct the name of the generated function
 * @param {string} pppi        PPPi instance (ex: 'CRC')
 * @param {string} layer       SW layer (ex: 'HAL')
 * @param {number} index       Index of current configuration (ex: 0)
 * @param {string} pppi_fct    Function used for the PPPi (optional)
 * @returns {string} Name of the config name (ex: "crc_cfg1_hal")
 */
function common_get_generated_function_name(pppi, layer, index, pppi_fct) {
  // let index_str;
  let result = "";
  if (pppi && typeof pppi === "string" && layer && typeof layer === "string") {

    /* Remove index for the moment because of multi-config removal.
       Will be usefull for DV2.1 with multi MCU state. */
    // if (index === undefined) {
    //   index_str = "";
    // } else {
    //   let new_index = index + 1;
    //   index_str = "cfg" + new_index;
    // }
    result =
      "mx_" +
      pppi.toLowerCase() +
      // addConfigLC(index_str) +
      // "_" +
      // layer.toLowerCase() +
      addConfigLC(pppi_fct);
    return result;
  }
  return result;
}

/**
 *  Construct the name of the generated instances
 * @param {} pppi
 * @param {} layer
 * @param {} pppi_fct
 * @returns
 */
function common_get_generated_instances_name(pppi, layer, pppi_fct) {
  let result = "";
  if (pppi && typeof pppi === "string" && layer && typeof layer === "string") {
    return result = layer + '_' + pppi;
  }
  return "";
}

/**
 *  Get the resource name according to some special cases
 * @param {string} resource  HW instance (ex: 'USART1' or 'CORTEX.MPU')
 * @param {string} current_component  SW component (ex: 'UART')
 * @returns {object} {new_resource, new_parent}  HW instance modified if special case (ex: 'Cortex_MPU' or 'USART1')
 */
function common_get_resource_name(resource, current_component) {
  let new_resource = resource;
  let new_parent = undefined;
  if (resource.includes('.')) {
    // Split at the first dot and return the part after it
    let parent_child = resource.split('.', 2);
    new_parent = parent_child[0];
    new_resource = parent_child[1];
  }
  if ((resource === 'MPU') || (resource === 'NVIC') || (resource === 'IDAU/SAU')
    || (resource === 'DEBUG') || (resource === 'SCB') || (resource === 'Systick')) {
    new_resource = 'Cortex_' + new_resource;
  }
  else {
    if (current_component === "RAMCFG") {
      /* Change the name of resource for RAMCFG */
      new_resource = 'RAMCFG_' + new_resource;
    }
    else if ( (current_component === "PCD" || current_component === "HCD"
      || current_component === "NOR" || current_component === "SRAM"
      || current_component === "NAND" || current_component === "SDRAM")) {
      /* Change the name of resource for USB and FMC*/
      new_resource = new_parent + '_' + new_resource;
    }
    else if (current_component === "GPIO") {
      /** Replace default_gpio_group_id" by "gpio_default" */
      new_resource = resource.replace(/^([^_]+)_([^_]+)_group_id$/, (_, item1, item2) => item2 + "_" + item1);
    }
  }
  return {new_resource, new_parent};
}

/**
 * Construct the aliases
 * @param {string} resource   HW instance (ex: 'USART1')
 * @param {string} current_component   SW component (ex: 'UART')
 * @param {array} labels      array of labels for this SW instance (ex: ["CRC_SwInst0"])
 * @param {boolean} generated indicate if initialization should be generated (ex: true)
 * @param {object} config     current configuration (ex: {
  hal_crc_config_t: {
    DefaultPolynomialUse: false,
    DefaultInitValueUse: true,
    input_data_reverse_mode: "HAL_CRC_INDATA_REVERSE_NONE",
    CRC_Polynomial: {
      value: 16385,
      size: 16,
    },
    output_data_reverse_mode: true,
  },
  cfg_name: "my_cfg_crc",
})
 * @param {number} index      index of the current configuration (start at 0)
 * @param {object} save_hal_handle   Keep in memory the different HAL handles (ex {crc_instance0: true})
 * @returns {object} periph     {
  resource: "CRC",
  resource_inst: "crc_instance0",
  fct_name: "crc_cfg1_hal",
  fct_name_gethandle: "crc_hal",
  fct_name_aliases: [
    "crc_swinst0_my_cfg_crc",
  ],
  labels: [
    "CRC_SwInst0",
  ],
  cfg_name: "my_cfg_crc",
  layer: "HAL",
  generated: true,
  default: false,
}
 */
function common_get_periph_labels(
  resource,
  current_component,
  labels,
  generated,
  config,
  index,
  fct_type,
  layer,
  save_hal_handle
) {
  let fct_name;
  let fct_name_aliases = [];
  let cfg_name = config["cfg_name"];
  let fct_name_gethandle = '';
  let aliase_instance = undefined;
  if (typeof resource !== "string") {
    console.error("resource is not a string");
    return {};
  }
  let resource_inst = resource;
  /* fct name should have the format pppi_cfgx */
  fct_name = common_get_generated_function_name(
    resource,
    layer,
    index,
    fct_type
  );
  /* provide the handle only it does not exist */
  if ((!save_hal_handle.hasOwnProperty(resource_inst)) && !(ComponentWithNoHandle.includes(current_component))) {
    fct_name_gethandle = common_get_generated_function_name(
      resource,
      layer,
      undefined,
      fct_type
    );
    save_hal_handle[resource_inst] = true;
  } else {
    if (current_component === "RAMCFG") {
      aliase_instance = common_get_generated_instances_name(
        resource,
        layer,
        fct_type
      );
    }
  }
  labels.forEach((label) => {
    let fct_name_alias;
    fct_name_alias =
      label.toLowerCase().replace("-", "_").replace(" ", "_") +
      addConfigLC(cfg_name);
    fct_name_aliases.push(fct_name_alias);
    fct_name_alias = label.toLowerCase().replace("-", "_").replace(" ", "_");
  });
  let periph = {
    resource: resource,
    resource_inst: resource_inst,
    fct_name: fct_name,
    fct_name_gethandle: fct_name_gethandle,
    aliase_instance: aliase_instance,
    fct_name_aliases: fct_name_aliases,
    labels: labels,
    cfg_name: cfg_name,
    layer: layer,
    generated: generated,
    default: false,
  };
  return periph;
}

/**
 * Get the layer corresponding to the current resource
 * @param {*} sw_config_api SW config API
 * @param {*} owner_sw_instance_id SW instance ID owning the resource
 * @returns {string} layer Layer corresponding to the resource
 */
function getLayerByResource(sw_config_api, owner_sw_instance_id) {
  const config = sw_config_api.getSwInstanceConfiguration(owner_sw_instance_id);
  const layer = config?.info?.layer ? config.info.layer : undefined;
  return layer;
}

/**
 * Function to generate the LL code
 * @param {string} ppp_function Function to be checked if it can be commented or not
 * @param {...any} arguments Dynamic of the arguments of the function (can be empty)
 * @returns {string} LL code commented if optimization is enabled and function included in LUT table
 */
function common_gen_ll_code(ppp_function, ...args) {
  try {
    var prefix_comment;
    var suffix_comment;
    const isLutArgMatch = (expected, actual) => {
      if (expected === actual) {
        return true;
      }

      if (expected instanceof RegExp) {
        return expected.test(String(actual));
      }

      return false;
    };

    /* Add 1st comma after PPP_Instance or Sub-instances*/
    if (OptimEnabled) {
      prefix_comment = "/* ";
      suffix_comment = " */ /* Configuration matches register reset state at startup. */";
      if (LUT_Table === undefined || !LUT_Table.hasOwnProperty(ppp_function)) {
        /* optimization not requested */
        console.info(`helper_common_generate_ll_code: Optimization not requested`);
        prefix_comment = "";
        suffix_comment = "";
        if (args) {
          args.forEach((arg) => {
            /** if ppp_instance or subinstance has been added, need to add a comma */
            if (code.endsWith('(') == false) {
              code = code + ", ";
            }
            code = code + arg;
          });
        }
        return prefix_comment + code + ");" + suffix_comment;
      }
      if (args) {
        current_function = LUT_Table[ppp_function];
        args.forEach((arg, index) => {
          /** if ppp_instance or subinstance has been added, need to add a comma */
          if (code.endsWith('(') == false) {
            code = code + ", ";
          }
          code = code + arg;
          /* Several defines possible for the reset value
            - list of reset values is in array*/
          if (
            (Array.isArray(current_function[index]) &&
              !current_function[index].some((expected_arg) => isLutArgMatch(expected_arg, arg))) ||
            (!Array.isArray(current_function[index]) &&
              !isLutArgMatch(current_function[index], arg))
          ) {
            /* one of the argument is not identical */
            prefix_comment = "";
            suffix_comment = "";
          }
        });
      }
    } else {
      /* optimization not requested */
      prefix_comment = "";
      suffix_comment = "";
      if (args) {
        args.forEach((arg) => {
          /** if ppp_instance or subinstance has been added, need to add a comma */
          if (code.endsWith('(') == false) {
            code = code + ", ";
          }
          code = code + arg;
        });
      }
    }
    return prefix_comment + code + ");" + suffix_comment;
  } catch (e) {
    console.error(`common_gen_ll_code: ${e}`);
  }
}

/**
 * Initialize the global index used for the function name definition inside mx_ppp.c/h
 */
function helper_common_initialize_index() {
  CFG_Index = {};
}

/**
 * Get the index to be used for function name construction
 * @param {string} resource HW resource used in PPP component
 * @returns {{integer}} 0 if 1st call of the function inside mx_ppp_template.c/h.hbs or index linked to the resource
 */
function helper_common_get_index(resource) {
  if (!CFG_Index.hasOwnProperty(resource)) {
    CFG_Index[resource] = 0;
  }

  return CFG_Index[resource];
}

/**
 * Increment the current index for the HW resource and return it to the template
 * @param {string} resource HW resource used in PPP component
 * @returns {{integer}} new index to be applied for the function name construction used for cfg
 */
function helper_common_inc_index(resource) {
  CFG_Index[resource] = CFG_Index[resource] + 1;
  return CFG_Index[resource];
}

/** Get the function return type condition according to some special cases
 * @param {string} current_component  SW component (ex: 'UART')
 * @param {string} layer              SW layer
 * @returns {string} fct_return  Condition to check the return of the function
 * */
function helper_common_get_function_return_type(current_component, layer) {
  let fct_return = "";
  /* Check if initialization function return system_status_t or hal_ppp_handle_t */
  /** RAMCFG is excluded from NoHandle as it returns for HAL a hal_ramcfg_t */
  if (current_component === 'RAMCFG') {
    /* Depending on the layer, the return is different */
    if (layer === 'HAL') {
      fct_return = " == 0UL";
    } else {
      fct_return = " == NULL";
    }
  }
  else if (ComponentWithNoHandle.includes(current_component)) {
    fct_return = " != SYSTEM_OK";
  }
  else {
    fct_return = " == NULL";
  }
  return fct_return;
}

/**
 * Construct the name of the generated function
 * @note Function called in every stm32_ppp_template.c/h.hbs
 * @param {string} pppi        PPPi instance
 * @param {string} layer       SW layer
 * @param {number} index       Index of current configuration
 * @param {string} pppi_fct    Function used for the PPPi (optional)
 * @param {string} from_where    Function used for the PPPi (optional)
 * @returns
 */
function helper_common_get_generated_function_name(
  pppi,
  layer,
  index,
  pppi_fct,
  from_where
) {
  try {
    console.info(`helper_common_get_generated_function_name (${pppi}, ${layer}, ${index}, ${pppi_fct}), from ` +
        from_where
    );
    return common_get_generated_function_name(pppi, layer, index, pppi_fct);
  } catch (e) {
    console.error(`helper_common_get_generated_function_name: ${e}`);
    return {};
  }
}

/**
 * Construct an object describing all the generated function calls
 * @param {object} sw_config_object Object returned by $get('sw-config.list-configurations', '{ \"init\": \"init_type\", \"layer\": \"layer\", \"function_type\": \"function_type\" }')
 * example
 *
 [
    {
        "instanceId": "b36b9ddb-d0c3-4bd6-897e-78a2dfe524f1",
        "instanceName": "MyCORE_1",
        "componentId": "STMicroelectronics.stm32u5xx_hal_drivers.2.0.0-alpha.8.0$STMicroelectronics::Device:STM32 MX Config:CORE@0.1.6#HAL Generated code",
        "validationStatus": {
            "severity": "ok"
        }
    },
    {
        "instanceId": "8ae87def-5810-4e10-bcac-3587e23a9ea8",
        "instanceName": "MyICACHE_bis",
        "componentId": "STMicroelectronics.stm32u5xx_hal_drivers.2.0.0-alpha.8.0$STMicroelectronics::Device:STM32 MX Config:ICACHE@0.5.0#HAL CORE Init and ICACHE",
        "validationStatus": {
            "severity": "ok"
        }
    }
 ]
 * @returns {object} structure describing the function names
 * example
 *
 */
function helper_common_get_generated_function_calls(sw_config_object) {
  try {
    console.info(`helper_common_get_generated_function_calls: ${JSON.stringify(
        sw_config_object)}`
    );

    let list_functions = [];

    /*
      Retrieve only the components linked to HAL configurable components which can be ranking
     */
    const list_components_ranked = ["STM32CubeMX2 Config:System", "STM32CubeMX2 Config:CORE", ...ListComponentsNotRanked];
    list_functions = sw_config_object
      .filter((ins) => ins.componentId.includes("Device:STM32CubeMX2 Config:"))
      .filter(
        (item) => !list_components_ranked.some((tag) => item.componentId.includes(tag))
      );
    /* From the previous list, convert it to the peripheral initialization function:
     - name (format: mx_<label>_init)
     - retrieve the SW component thanks a regular expression which to retrieve the Csub block between STM32CubeMX2 Config: and @
     */
    list_functions = list_functions.map((ins) => {
      const sw_instance = ins.componentId.match(/STM32CubeMX2 Config:(.*?)@/)[1];
      const new_resource = common_get_resource_name(ins.resourceId, sw_instance).new_resource;
      return {
        index: new_resource,
        name: helper_common_get_generated_function_name(
          new_resource,
          ins.values.layer || '',
          0,
          ins.values.function_type
        ) + '_init',
        sw_instance: sw_instance,
        layer: ins.values.layer,
        init: ins.values.init,
        function_type: ins.values.function_type,
      };
    });

    console.info(`helper_common_get_generated_function_calls: list_functions ${JSON.stringify(
        list_functions)}`
    );

    return list_functions;
  } catch (e) {
    console.error(`helper_common_get_generated_function_calls: ${e}`);
    return {};
  }
}

/**
 * Construct an object describing all the generated function calls not ranked at startup
 * @param {object} sw_config_object Object returned by $get('sw-config.list-configurations', '{ \"init\": \"init_type\", \"layer\": \"layer\", \"function_type\": \"function_type\" }')
 * @returns {object} structure describing the peripheral initialization function names not ranked at startup
 */
function helper_common_get_generated_function_calls_not_ranked(sw_config_object) {
  try {
    console.info(`helper_common_get_generated_function_calls_not_ranked: ${JSON.stringify(
        sw_config_object)}`
    );

    let list_functions = [];

    list_functions = sw_config_object
      .filter((ins) => ins.componentId.includes("Device:STM32CubeMX2 Config:"))
      .filter(
        (item) => ListComponentsNotRanked.some((tag) => item.componentId.includes(tag))
      );
    /* From the previous list, convert it to the peripheral initialization function:
     - name (format: mx_<label>_init)
     - retrieve the SW component thanks a regular expression which to retrieve the Csub block between STM32CubeMX2 Config: and @
     */
    list_functions = list_functions.map((ins) => ({
      index: ins.resourceId,
      name: helper_common_get_generated_function_name(
        common_get_resource_name(ins.resourceId, ins.componentId.match(/STM32CubeMX2 Config:(.*?)@/)[1]).new_resource,
        ins.values.layer || '',
        0,
        ins.values.function_type
      ) + '_init',
      sw_instance: ins.componentId.match(/STM32CubeMX2 Config:(.*?)@/)[1],
      layer: ins.values.layer,
      init: ins.values.init,
      function_type: ins.values.function_type,
    }));

    /* Order by the list of peripheral called at startup */
    list_functions.sort((a, b) => {
      const aIdx = ListComponentsNotRanked.indexOf(a.sw_instance);
      const bIdx = ListComponentsNotRanked.indexOf(b.sw_instance);
      if (aIdx === -1 && bIdx === -1) return 0;
      if (aIdx === -1) return 1;
      if (bIdx === -1) return -1;
      return aIdx - bIdx;
    });

    console.info(`helper_common_get_generated_function_calls_not_ranked: list_functions ${JSON.stringify(
        list_functions)}`
    );

    return list_functions;
  } catch (e) {
    console.error(`helper_common_get_generated_function_calls_not_ranked: ${e}`);
    return {};
  }
}

/**
 *
  * @param {object} dma_api Access to DMA getters
  * @param {object} sw_config_api Access to SW configuration getters
  * @returns {array} result Array of objects describing the LL DMA instances used for the needs
  example:
  [
    {
      resource: "USART1",
      channel: "LPDMA1_CH1",
      alias: [
        "USART_LABEL_DMA",
      ],
    },
    {
      resource: "ADC1",
      channel: "LPDMA1_CH3",
      alias: [
        "adc_dma",
      ],
    },
  ]
 */
function helper_common_get_ll_dma_instance_used_for_needs(dma_api, sw_config_api) {
  let result = [];
  //console.info(`helper_common_get_ll_dma_instance_used_for_needs`);
  try {
    let list_dma_needs = dma_api.getAllAllocatedResourceNeeds();
    list_dma_needs.forEach(need => {
      let config_channel = {resource:"", channel:"", layer:"", alias: []};
      let config_need = dma_api.getNeedById(need.needId);
      const layer = getLayerByResource(sw_config_api, need.swInstanceId);

      config_channel.resource = need.owner;
      config_channel.channel = need.resourceId;
      config_channel.layer = layer;
      config_channel.alias = config_need.configuration.info.labels.slice();

      result.push(config_channel);
    });
  } catch (e) {
    console.error(`[ERROR] helper_common_get_ll_dma_instance_used_for_needs: ${e}`);
  }
  return result;
}

/**
 * Return if hal define has been enabled for the module to hal_conf.h
 * @note  use to check for USE_HAL_PPP_REGISTER_CALLBACKS, USE_HAL_PPP_USER_DATA, USE_HAL_PPP_GET_LAST_ERRORS, USE_HAL_PPP_DMA
 * @param {*} Settings settings of system parameters
 * @param {*} Module module to check
 * @returns Output='' => 1 or 0
 */
function helper_common_if_value_is_enabled(Settings, Module) {
  let result = 0;
  //console.info(`helper_common_get_user_data`);
  try {
    for (let resource in Settings) {
      component = resource.split("_")[0];
      if (component === Module.toLowerCase()) {
        if (Settings[resource]) {
          result = 1;
          break;
        }
      }
    }
  } catch (e) {
    console.error(`[ERROR] helper_common_get_user_data: ${e}`);
  }
  return result;
}

/**
 * Return if SW component has been enabled in the project (or at least its dependencies)
 * @note  use hal_conf.h for USE_HAL_PPP_MODULE
 * @param {object} used_components used components returned by SWProjectAPI.getUsedComponents getter
 * @param {string} component component to be check
 */
function helper_common_if_component_is_enabled(used_components, component) {
  let result = 0;
  //console.info(`helper_common_if_component_is_enabled`);
  try {
    used_components.forEach((comp) => {
      if (
        (comp["cgroup"] === "STM32 HAL" || comp["cgroup"] === "STM32 LL" ||
          comp["cgroup"] === "STM32 HAL DRIVERS CORE") &&
        comp["csub"].toUpperCase() === component.toUpperCase()
      ) {
        result = 1;
        return;
      }
    });
  } catch (e) {
    console.error(`[ERROR] helper_common_if_component_is_enabled: ${e}`);
  }
  return result;
}

/**
 * Check if RCC clock must be enabled inside the mx_pppi_init function
 * @param {object} clock_activation used components returned by SWProjectAPI.getUsedComponents getter
 * @param {string} component component to be check
 * @returns clock activation value:
 *          @arg 0  HAL_CLK_ENABLE_NO                 No clock activation in PPP
 *          @arg 1  HAL_CLK_ENABLE_PERIPH_ONLY        PERIPH Clock activation only
 *          @arg 2  HAL_CLK_ENABLE_PERIPH_PWR_SYSTEM  PERIPH Clock activation including PWR and/or system
 */
function helper_common_if_rcc_clock_activated(clock_activation, component) {
  let result = 0;
  console.info(`helper_common_if_rcc_clock_activated: component=${component})} `
  );
  try {
    const clock_key = component.toLowerCase() + "_feature";
    if (Object.hasOwnProperty.call(clock_activation, clock_key)) {
      current_config = clock_activation[clock_key];
      if (current_config["clk_enable_model"] === "HAL_CLK_ENABLE_NO") {
        result = 0;
      } else if (
        current_config["clk_enable_model"] === "HAL_CLK_ENABLE_PERIPH_ONLY"
      ) {
        result = 1;
      } else {
        /* HAL_CLK_ENABLE_PERIPH_PWR_SYSTEM */
        result = 2;
      }
    }
  } catch (e) {
    console.error(`[ERROR] helper_common_if_rcc_clock_activated: ${e}`);
  }
  return result;
}

/**
 * Get the PPP clock mode defined in CORE
 * @param {string} hw_resource hw_resource to be checked
 * @returns clock mode value:
 *          @arg 0  HAL_CLK_ENABLE_NO                 No clock activation in PPP
 *          @arg 1  HAL_CLK_ENABLE_PERIPH_ONLY        PERIPH Clock activation only
 *          @arg 2  HAL_CLK_ENABLE_PERIPH_PWR_SYSTEM  PERIPH Clock activation including PWR and/or system
 */
function helper_common_get_clk_enable_mode(root, hw_resource) {
  let result = 0;
  console.info(`helper_common_get_clk_enable_mode: hw_resource=${hw_resource})} `
  );
  try {
    /* Get CORE information settings */
    const json = '{"cgroup": "STM32CubeMX2 Config", "csub": "CORE"}';
    const json_obj = JSON.parse(json);
    const core_configuration = root.SWConfigurationAPI.getInstancesConfiguration(json_obj);
    const core_info = core_configuration[0].settings.parameters.info;

    /* Get component key */
    /* Component is the hw_resource without terminating index except for PPP including several functions (e.g: USART1 can be UART) */
    let component = hw_resource.replace(/\d+$/, '');  /* Remove numbers at the end of string */
    const sw_instance = root.peripheralsResourceManagerAPI.getSoftwareInstancesBoundToPeripheral(hw_resource);
    const sw_config = root.SWConfigurationAPI.getSwInstanceConfiguration(sw_instance[0]);
    if (sw_config.info.function_type) {
      component = sw_config.info.function_type;
    }
    const component_key = component.toLowerCase() + "_feature";

    if (Object.hasOwnProperty.call(core_info, component_key)) {
      current_config = core_info[component_key];
      if (current_config["clk_enable_model"] === "HAL_CLK_ENABLE_NO") {
        result = 0;
      } else if (
        current_config["clk_enable_model"] === "HAL_CLK_ENABLE_PERIPH_ONLY"
      ) {
        result = 1;
      } else {
        /* HAL_CLK_ENABLE_PERIPH_PWR_SYSTEM */
        result = 2;
      }
    }
  } catch (e) {
    console.error(`[ERROR] helper_common_get_clk_enable_mode: ${e}`);
  }

  return result;
}


/**
  * Prepare an object will be used by stm32_system_template.c.hbs & stm32_hal_def_template.h.hbs templates
  * @note  Function called inside stm32_system_template.c.hbs & stm32_hal_def_template.h.hbs
  * @param {object} sw_project_api Getters to SWProjectAPI
  * @param {object} dma_api        Getters to DmaAPI
  * @param {object} sw_config_api  Getters to SWConfigurationAPI
  * @param {object} pinout_api     Getters to pinoutAPI
  * @param {object} exti_api       Getters to extiAPI
  * @param {object} periph_api     Getters to peripheralsResourceManagerAPI
  * @param {object} strategy       Code generation strategy (HW or SW)
  * @returns {object}
    {
        "component": [
            "CRC",
            "GPIO",
            "UART",
            "USART",
            "CORE"
        ],
        "periphs": [
            {
                "resource": "CRC",
                "resource_inst": "crc_instance0",
                "fct_name": "stm32_crc_cfg1_hal",
                "fct_name_gethandle": "stm32_crc_hal",
                "fct_name_aliases": [
                    "crc"
                ],
                "labels": [
                    "CRC"
                ],
                "layer": "HAL",
                "generated": true,
                "default": true,
                "component": "CRC"
            },
            {
                "resource": "USART1",
                "resource_inst": "usart1_instance2",
                "fct_name": "stm32_usart1_cfg1_hal_usart",
                "fct_name_gethandle": "stm32_usart1_hal_usart",
                "fct_name_aliases": [
                    "multi_sync_hal_one_test_one",
                    "multi_sync_hal_two_test_one"
                ],
                "labels": [
                    "multi_sync_hal_one",
                    "multi_sync_hal_two"
                ],
                "cfg_name": "test_one",
                "layer": "HAL",
                "generated": true,
                "default": true,
                "component": "UART"
            }(...)
        ],
        "cfg_index": {
            "CRC_CRC": 1,
            "GPIO_gpio_default": 1,
            "UART_USART1": 7,
            "USART_USART1": 3
        },
        "save_hal_handle": {
            "crc_instance0": true,
            "gpio_default_instance1": true,
            "usart1_instance2": true,
            "usart1_instance3": true,
            "usart1_instance4": true,
            "usart1_instance5": true
        },
        "instanceIndex": 7,
        "CRC": true,
        "gpio_default": true,
        "USART1": true
    }
   */
function helper_common_get_sw_config_ctxt(
  sw_project_api,
  dma_api,
  sw_config_api,
  pinout_api,
  exti_api,
  periph_api,
  strategy
) {
  let result = {
    component: [],
    periphs: [],
    cfg_index: {},
    save_hal_handle: {},
    instanceIndex: 0,
  };
  try {
    let cfg_index = {};
    let save_hal_handle = {};
    console.info(`helper_common_get_sw_config_ctxt`);

    components = sw_project_api.getUsedComponents('asObject', { hash: { cclass: 'Device', cgroup: 'STM32CubeMX2 Config' } });
    console.info(`        components=${JSON.stringify(components)}`);
    let system_config = sw_config_api.getSwInstancesConfiguration({ cgroup: 'STM32CubeMX2 Config', csub: 'System' });
    result["system_cxt"] = system_config[0];

    components.forEach((component) => {
      current_component = component.csub;
      console.info(`        current_component=${current_component}`);

      /* Save the current component if not seen yet */
      if (result["component"].indexOf(current_component) === -1) {
        result["component"].push(current_component);
      }
      /* There are no HW instances for System and CORE */
      if ((current_component !== 'System') && (current_component !== 'CORE')) {
        let resource = undefined;
        let exti_resources = undefined;
        let components_instances_id;
        components_instances_id = sw_config_api.getInstances(component.original_id);

        components_instances_id.forEach((instance_id) => {
          let exti_handles = [];
          let labels = [];
          let current_resource = undefined;
          let config = sw_config_api.getSwInstanceConfiguration(instance_id);

          /* Retrieve the HW resource */
          if (current_component === "GPIO")
            current_resource = pinout_api.getGroupBoundToSoftwareInstance(instance_id);
          else if (current_component === "DMA")
            current_resource = dma_api.getResourceBoundToStandalone(instance_id).resourceId;
          else {
            resource = periph_api.getPeripheralBoundToSoftwareInstance(instance_id);
            current_resource = common_get_resource_name(resource, current_component).new_resource;

            if (current_component === "RCC") {
              /* Save only the context for RCC */
              result["rcc_cxt"] = config;
            }
            else if (current_component === "PWR") {
              /* Save only the context for PWR */
              result["pwr_cxt"] = config;
            }
            else if (current_component === "CORTEX NVIC") {
              /* Save only the context for NVIC */
              result["nvic_cxt"] = config;
            }
            else if (current_component === "CORTEX MPU") {
              /* Save only the context for MPU */
              result["mpu_cxt"] = config;
            }
            else if (current_component === "ICACHE") {
              /* Save only the context for ICACHE */
              result["icache_cxt"] = config;
            }
          }
          let can_be_added = config?.info.init_type ? (config.info.init_type !== "disabled") : true;
          if (!can_be_added) {
            return;
          }

          /* For dummy parameters, there are no layer inside info block */
          if (
            config.info !== undefined && config.info.layer !== undefined &&
            current_resource !== undefined
          ) {
            /* save the list of labels used for this SW instance */
            if (config.info.labels !== undefined && config.info.labels.length != 0) {
              config.info.labels.forEach((label) => {
                labels.push(label.replace("-", "_"));
              });
            }
            // index of the config depends on the current HW resource and current component
            let resource_component = current_component + "_" + current_resource;
            if (!cfg_index.hasOwnProperty(resource_component)) {
              cfg_index[resource_component] = 0;
            }
            /* Save function if exist */
            let fct_type = undefined;
            if (config.info.function_type !== undefined) {
              fct_type = config.info.function_type;
            }

            let layer = undefined;
            if (config.info.layer !== undefined) {
              layer = config.info.layer;

              /* Retrieve the aliases for EXTI lines if exist */
              exti_resources = exti_api.getLineNeeds(instance_id);
              exti_resources.forEach(exti_resource => {
                let exti_handle = { layer: layer, resource: current_resource, line: exti_resource.resourceId, aliases: [], name_gethandle: "" };
                exti_resource.configuration.labels?.forEach(label => {
                  exti_handle.aliases.push(label);
                });
                if (layer === "HAL") {
                  if (exti_resource.componentId.includes("Config:GPIO@") || (current_resource === exti_resource.owner)) {
                    exti_handle.name_gethandle = "mx_" + current_resource.toLowerCase() + "_" + exti_resource.resourceId.toLowerCase() + "_gethandle";
                  } else {
                  exti_handle.name_gethandle = "mx_" + current_resource.toLowerCase() + "_gpio_" + exti_resource.resourceId.toLowerCase() + "_gethandle";
                  }
                }
                exti_handles.push(exti_handle);
              });
            }

            let generated = false;
            let default_to_be_called = false;
            /* RCC, PWR, NVIC & ICACHE are called early in the startup */
            if ((config.info.init_type != "disabled") && !ListComponentsNotRanked.includes(current_component)) {
              generated = true;

              if (config.info.init_type === "called") {
                default_to_be_called = true;
              }

              if (!result.hasOwnProperty(current_resource)) {
                result[current_resource] = false;
              }
            }

            let periph = common_get_periph_labels(
              current_resource,
              current_component,
              labels,
              generated,
              config,
              cfg_index[resource_component],
              fct_type,
              layer,
              save_hal_handle
            );
            periph["component"] = current_component;
            periph["exti_gethandle"] = exti_handles;
            cfg_index[resource_component] = cfg_index[resource_component] + 1;
            if (default_to_be_called && !result[current_resource]) {
              periph["default"] = true;
              result[current_resource] = true;
            }

            if (periph["component"] == "XSPIM") {
              if ((result["periphs"].length == 0) || (result["periphs"][0].component == "XSPI")) {
                result["periphs"].splice(0, 0, periph);
              } else {
                result["periphs"].splice(1, 0, periph);
              }
            } else {
              result["periphs"].push(periph);
            }
          } else {
            /* There are no blocks information */
            console.info(`[WARNING] helper_common_get_sw_config_ctxt: no blocks or info block`);
          }
        });
      }
    });
  } catch (e) {
    console.error(`helper_common_get_sw_config_ctxt ${e}`);
  }
  // console.info(`        result      =${JSON.stringify(result)}`);
  return result;
}

/**
  * Retrieve the aliases to be generated for IRQ handlers for all the peripherals (for mx_hal_def.h)
  * @param {objet} sw_project_api Access to SW project getters
  * @param {object} dma_api Access to DMA getters
  * @param {object} sw_config_api Access to SW configuration getters
  * @param {object} pinout_api Access to Pinout getters
  * @param {object} periph_api Access to Peripheral getters
  * @param {object} nvic_api Access to NVIC getters
  * @param {object} exti_api Access to NVIC getters
  * @returns Aliases based on IRQ handlers
  */
function helper_common_get_irq_handler(
  sw_project_api,
  dma_api,
  sw_config_api,
  pinout_api,
  periph_api,
  nvic_api,
  gpio_api,
  exti_api
) {
  let result = [];
  try {
    console.info(`helper_common_get_irq_handler`);

    components = sw_project_api.getUsedComponents('asObject', { hash: { cclass: 'Device', cgroup: 'STM32CubeMX2 Config' } });
    console.info(`        components=${JSON.stringify(components)}`);

    components.forEach((component) => {
      current_component = component.csub;
      console.info(`        current_component=${current_component}`);

      /* There are no HW instances for System and CORE */
      if ((current_component !== 'System') && (current_component !== 'CORE')) {
        let resource = undefined;
        let components_instances_id;
        components_instances_id = sw_config_api.getInstances(component.original_id);

        components_instances_id.forEach((instance_id) => {
          let config = sw_config_api.getSwInstanceConfiguration(instance_id);
          let parent = undefined;
          /* Retrieve the HW resource */
          if (current_component === "GPIO")
            resource = pinout_api.getGroupBoundToSoftwareInstance(instance_id);
          else if (current_component === "DMA")
            resource = dma_api.getResourceBoundToStandalone(instance_id).resourceId;
          else {
            resource = periph_api.getPeripheralBoundToSoftwareInstance(instance_id);
            if (resource.includes('.')) {
              // Split at the first dot and return the part after it
              parent = resource.split('.', 2)[0];
              resource = resource.split('.', 2)[1];
            }
          }
          if ((resource === 'MPU') || (resource === 'NVIC') || (resource === 'IDAU/SAU')
            || (resource === 'IDAU/SAU') || (resource === 'DEBUG') || (resource === 'SCB')
            || (resource === 'Systick')) {
            resource = 'CM33';
          }
          /* For dummy parameters, there are no layer inside info block */
          if (
            config.info !== undefined && config.info.layer !== undefined &&
            resource !== undefined
          ) {
            if (current_component in IRQ_HANDLER_GETTER) {
              const helper = IRQ_HANDLER_GETTER[current_component];
              if (helper.file !== undefined && helper.func !== undefined) {
                let all_functions = require(helper?.file);
                if (typeof all_functions[helper.func] === "function") {
                  result = result.concat(all_functions[helper.func](nvic_api, exti_api, resource, config, parent));
                }
              }

              /** Check the DMA interruptions have been generated or not */
              if (helper.dma_need_support) {
                all_functions = require('./dma_helpers.js');
                if (typeof all_functions['helper_dma_need_get_irq_handler'] === "function") {
                  result = result.concat(all_functions['helper_dma_need_get_irq_handler'](nvic_api, dma_api, resource));
                }
              }

              /** Check the EXTI interruptions have been generated or not */
              if (helper.gpio_need_support) {
                all_functions = require('./gpio_helpers.js');
                if (typeof all_functions['helper_gpio_need_get_irq_handler'] === "function") {
                  result = result.concat(all_functions['helper_gpio_need_get_irq_handler'](nvic_api, gpio_api, exti_api, resource));
                }
              }
            }
          } else {
            /* There are no blocks information */
            console.info(`[WARNING] helper_common_get_irq_handler: no blocks or info block`);
          }
        });
      }
    });
  } catch (e) {
    console.error(`helper_common_get_irq_handler ${e}`);
  }
  console.info(`helper_common_get_irq_handler result =${JSON.stringify(result)}`);
  return result;
}

/**
 * Find inside an array if the value is well set to the associated key
 * @param {array} array array provided as input
 * @param {string} key element to be found inside the array
 * @param {string} value value expected in the key
 * @returns {object} contain the object containing the targeted value.
 */
function helper_common_get_object_by_key(array, key, value) {
  try {
    console.info(`helper_common_get_object_by_key: array=${JSON.stringify(
        array)}, key=${key}, value=${value}`
    );
    return array?.find(function (objet) {
      return objet[key] === value;
    });
  } catch (e) {
    console.error(`[ERROR] helper_common_get_object_by_key: ${e}`);
    return undefined;
  }
}

/**
 * Function to be called to prepare the LL code optimization
 * @param {boolean} optim_enabled User configuration to enable or not the LL optimzation
 * @param {object} lut_table LUT table used for the LL code optimizatoin
 * @param {string} ppp_instance HW instance of PPP (ex I2C1), 'undefined' is not necessary
 * @returns
 */
function helper_common_initialize_ll_code(
  optim_enabled,
  lut_table,
  ppp_instance
) {
  try {
    /*console.info(`helper_common_initialize_ll_code: optim_enabled=${optim_enabled}, lut_table=${JSON.stringify(
        lut_table)}, ppp_instance=${ppp_instance}`
    );*/
    /* Save the different parameters used for the LL code optimization */
    OptimEnabled = optim_enabled;
    LUT_Table = lut_table;
    PPP_Instance = ppp_instance;
  } catch (e) {
    console.error(`helper_common_initialize_ll_code: ${e}`);
  }
  return;
}

/**
 * Add sub-instances to be generated for LL code optimization
 * @param {string} sub_instances Sub instances of PPP (ex GPIO_PIN)
 * @returns
 */
function helper_common_gen_ll_code_add_subinst(sub_instances) {
  try {
    /*console.info(`helper_common_gen_ll_code_add_subinst: sub_instances=${sub_instances}`);*/
    Sub_Instances = sub_instances;
  } catch (e) {
    console.error(`helper_common_gen_ll_code_add_subinst: ${e}`);
  }
  return;
}

/**
 * Construct the LL code to be generated with or without comments depends if the LL functions
 * @detail  This API must be used when driver does not have sub-instances
 * @param {string} ppp_function Function to be checked if it can be commented or not
 * @param {...any} arguments Dynamic of the arguments of the function (can be empty)
 * @returns {string} Code to be generated in LL function (with or without comments)
 */
function helper_common_gen_ll_code(ppp_function, ...args) {
  try {
    /*console.info(`helper_common_gen_ll_code: ppp_function=${ppp_function}`);*/
    let ret;
    const ppp = ppp_function.split("_")[1];
    const usefulArgs = args.slice(0, -1); /* Remove last argument (caller informations) */
    code = ppp_function + "(";

    /* PARTIAL Management */
    if (ppp in LL_OPTIM_LUT_ACCESSOR) {
      const accessor = LL_OPTIM_LUT_ACCESSOR[ppp];

      /* Load LUT if not already loaded */
      if (accessor.lut === undefined) {
        const all_functions = require(accessor.file);
        if (typeof all_functions[accessor.func] === "function") {
          accessor.lut = all_functions[accessor.func]();
        }
      }

      /* Temporarily update LUT_Table */
      const saved_LUT = LUT_Table;
      LUT_Table = accessor.lut || LUT_Table;
      ret = common_gen_ll_code(ppp_function, ...usefulArgs);
      LUT_Table = saved_LUT;
    }
    else if (typeof PPP_Instance !== "undefined") {
      code += PPP_Instance;
      ret = common_gen_ll_code(ppp_function, ...usefulArgs);
    }
    else {
      ret = common_gen_ll_code(ppp_function, ...usefulArgs);
    }

    return ret;
  } catch (e) {
    console.error(`helper_common_gen_ll_code: ${e}`);
  }
}

/**
 * Construct the LL code to be generated with or without comments depends if the LL functions
 * @detail  This API must be used when driver has sub-instances
 * @param {string} ppp_function Function to be checked if it can be commented or not
 * @param {...any} arguments Dynamic of the arguments of the function (can be empty)
 * @returns {string} Code to be generated in LL function (with or without comments)
 */
function helper_common_gen_ll_code_subinst(ppp_function) {
  try {
    /*console.info(`helper_common_gen_ll_code_subinst: ppp_function=${ppp_function}`);*/
    /* exclude options + 1st argument */
    var args = Array.prototype.slice.call(arguments, 1, -1);

    if (Sub_Instances === undefined) {
      console.warn(`helper_common_gen_ll_code_subinst: sub instances is undefined`);
    }

    code = ppp_function + "(";
    if (PPP_Instance !== "undefined") {
      code = code + PPP_Instance;
      if (Sub_Instances !== undefined) {
        code = code + ", " + Sub_Instances;
      }
    } else {
      if (Sub_Instances !== undefined) {
        code = code + Sub_Instances;
      }
    }
    return common_gen_ll_code(ppp_function, ...args);
  } catch (e) {
    console.error(`helper_common_gen_ll_code_subinst: ${e}`);
  }
}

/**
  * Get the element of the array at index value
  * @param {array} array Array used to get the element
  * @param {integer} index Index of the element inside the array
  * @returns Element saved at the index of the array
  */
function helper_common_get_elt_in_array(array, index) {
  try {
    console.info(`helper_common_get_elt_in_array: array=${JSON.stringify(array)}`);
    return array[index];
  } catch (e) {
    console.error(`helper_common_get_elt_in_array: ${e}`);
    return false;
  }
}

/**
 * Print in the log the content of a object (like $resource)
 * @param {object} object Object to dump
 * @returns true
 */
function helper_common_display_object(object) {
  console.info(`helper_common_display_object: object=${JSON.stringify(object)}`);
  return true;
}

/**
 * Checks if a property exists directly on an object (not inherited).
 * @param {object} object - The object to check.
 * @param {string} key    - The property name.
 * @returns {boolean}     - True if the property exists, false otherwise.
 */
function helper_common_object_has_property(object, key) {
  let result = false;
  console.info(`helper_common_object_has_property: object=${JSON.stringify(object)}`
  );
  try {
    result = Object.prototype.hasOwnProperty.call(object, key);
  } catch (e) {
    console.error(`[ERROR] helper_common_object_has_property: ${e}`);
  }
  return result;
}

/**
 * Check if environment if there is at least one HAL_PPP_PROJECT_USE_HAL
 * @param {object} env_api Getters of 'Environment Variable'
 * @returns true if no HAL_PPP_PROJECT_USE_HAL found in the environment va
 */
function helper_common_check_if_only_ll(env_api) {
  try {
    let result = true;
    console.info(`helper_common_check_if_only_ll`);

    /* Check in the environment variables list that there is at one HAL_PPP_PROJECT_USE_HAL.
       Use getEnvDomain API to retrieve the store env. */
    let get_env_domain = env_api.getEnvDomain();
    Object.keys(get_env_domain).forEach(function (key) {
      const item = get_env_domain[key];
      if (item.name.includes('_PROJECT_USE_HAL')) {
        result = false;
        return;
      }
    });

    /* no environment variables based on the HAL_PPP_PROJECT_USE_HAL */
    return result;
  } catch (e) {
    console.error(`helper_common_check_if_only_ll: ${e}`);
    return false;
  }
}

/**
 * Beautifies a Handlebars block:
 * - Collapses consecutive blank lines into a single blank line.
 * - Removes blank lines after '{' and before '}'.
 * - Strips trailing whitespace from all non-blank lines.
 * @param {object} options Handlebars options with fn()
 * @returns {string} cleaned content
 */
function helper_common_beautifier (options) {
  try {
    const content = options.fn(this);
    const lines = content.split('\n');
    const cleaned = [];
    let prevBlank = false;
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].replace(/\r$/, '');
      const trimmed = line.trim();
      const isBlank = trimmed === '';
      if (isBlank) {
        const prevLine = cleaned.length ? cleaned[cleaned.length - 1] : null;
        let nextNonBlank = null;
        for (let j = i + 1; j < lines.length; j++) {
          const cand = lines[j].replace(/\r$/, '');
          if (cand.trim() !== '') { nextNonBlank = cand; break; }
        }
        if (prevLine && prevLine.trim().endsWith('{')) continue;
        if (nextNonBlank && nextNonBlank.trim().startsWith('}')) continue;
        if (!prevBlank) {
          cleaned.push('');
          prevBlank = true;
        }
        continue;
      }
      if (trimmed.startsWith('}') && prevBlank && cleaned.length && cleaned[cleaned.length - 1] === '') {
        cleaned.pop();
      }
      cleaned.push(line.replace(/[ \t]+$/,''));
      prevBlank = false;
    }
    return cleaned.join('\n');
  } catch (e) {
    console.error(`Detected by helper_common_beautifier in ${this.resource ? this.resource : 'unknown resource'} : ${e}`);
    return '';
  }
}

/**
 * List of include files to be generated in mx_hal_def.h based on the SW configuration of the project
 * @param {object} sw_project_api Access to SW project getters
 * @param {object} dma_api Access to DMA API
 * @param {object} sw_config_api Access to SW configuration API
 * @param {object} pinout_api Access to pinout API
 * @param {object} periph_api Access to peripheral API
 * @param {string} strategy Strategy type
 * @returns {Array} List of include files
 */
function helper_common_find_include_files(sw_project_api, dma_api, sw_config_api, pinout_api, periph_api, strategy) {
  let includes = [];
  let components = [];
  let current_component = '';
  try {
    components = sw_project_api.getUsedComponents('asObject', { hash: { cclass: 'Device', cgroup: 'STM32CubeMX2 Config' } });
    components.forEach((component) => {
      current_component = component.csub;
      /* There are no HW instances for System and CORE */
      if ((current_component !== 'System') && (current_component !== 'CORE')) {
        let resource = undefined;
        let components_instances_id;
        components_instances_id = sw_config_api.getInstances(component.original_id);

        components_instances_id.forEach((instance_id) => {
          let parent = undefined;
          let current_resource = undefined;
          let config = sw_config_api.getSwInstanceConfiguration(instance_id);

          /* Retrieve the HW resource */
          if (current_component === "GPIO")
            current_resource = pinout_api.getGroupBoundToSoftwareInstance(instance_id);
          else if (current_component === "DMA")
            current_resource = dma_api.getResourceBoundToStandalone(instance_id).resourceId;
          else {
            resource = periph_api.getPeripheralBoundToSoftwareInstance(instance_id);
            let {new_resource, new_parent} = common_get_resource_name(resource, current_component);
            current_resource = new_resource;
            parent = new_parent;
          }

          let can_be_added = config?.info.init_type ? (config.info.init_type !== "disabled") : true;
          if (!can_be_added) {
            return;
          }
          /* Save the includes to generate */
          if (strategy === 'SW') {
            if (current_component === "RIF") {
              includes.push("tee");
            } else {
              if (!includes.includes(current_component)) {
                includes.push(current_component);
              }
            }
          }
          else {
            if (current_component === "RIF") {
              includes.push("tee");
            } else {
              /** Check that current component is not a complex IP (exception for ADC & COMP) */
              if (current_component !== "ADC" && current_component !== "COMP" && parent !== undefined) {
                if (!includes.includes(parent)) {
                  includes.push(parent);
                }
              }
              else {
                if (!includes.includes(current_resource)) {
                  includes.push(current_resource);
                }
              }
            }
          }
        });
      }

    });
  } catch (e) {
    console.error(`helper_common_find_include_files: ${e}`);
  }
  return includes;
}

/**
 * Prepare the codegen context used in the codegen templates
 * @param   {string} component SW component name (ex: 'I2C')
 * @param   {object} context Context returned by mapping_hook.js (though get '')
 * @param   {object} env_api Getters of 'Environment Variable'
 * @param   {object} periph_sw_api Getters of 'Peripheral Software'
 * @param   {object} sw_config_api Getters of 'Software Configuration'
 * @returns {object} Codegen context like
 *                  PPP template codegen_ctxt: {
 *                    strategy: 'SW',
 *                    component: 'STMicroelectronics::Device:STM32CubeMX2 Config:I2C@0.1.3',
 *                    parent_resource: '',
 *                    current_resource: 'PPP',
 *                    dma_resource: 'STMicroelectronics::Device:STM32CubeMX2 Config:I2C@0.1.3',
 *                    instances: [
 *                    { current_resource: 'I2C1', config: [Object] },
 *                      { current_resource: 'I2C2', config: [Object] }
 *                    ]
 *                  }
 */
function helper_common_get_codegen_context(component, context, env_api, periph_sw_api, sw_config_api) {
  let result = {
    strategy: '',
    component: '',
    parent_resource: '',
    current_resource: '',
    dma_resource: '',
    instances: []
  };
  try {
    result.strategy = env_api.getVariableValue('SYSTEM_PROJECT_CODEGEN_STRATEGY');
    result.component = context.component;
    if (result.strategy === 'SW') {
      result.dma_resource = result.component;
      result.current_resource = component;
      let instance_ids = sw_config_api.getInstances(result.component);
      instance_ids.forEach((instance_id) => {
        let config_instance = {
          current_resource: periph_sw_api.getPeripheralBoundToSoftwareInstance(instance_id),
          config: sw_config_api.getSwInstanceConfiguration(instance_id)
        };
        result.instances.push(config_instance);
      });
    } else {
      result.parent_resource = context.resource;
      result.current_resource = context.hw_resource;
      result.dma_resource = context.hw_resource;
      let instance_ids = periph_sw_api.getSoftwareInstancesBoundToPeripheral(context.resource);
      instance_ids.forEach((instance_id) => {
        let config_instance = {
          current_resource: result.current_resource,
          config: sw_config_api.getSwInstanceConfiguration(instance_id)
        };
        result.instances.push(config_instance);
      });
    }
  } catch (e) {
    console.error(`helper_common_get_codegen_context: ${e}`);
  }
  return result;
}

/**
 * Prepare the codegen context used in the DMA codegen templates
 * @param   {string} component SW component name (ex: 'DMA')
 * @param   {object} context Context returned by mapping_hook.js (though get '')
 * @param   {object} env_api Getters of 'Environment Variable'
 * @param   {object} periph_sw_api Getters of 'Peripheral Software'
 * @param   {object} dma_api Getters of 'DMA'
 * @returns {object} Codegen context for DMA
 */
function helper_common_get_codegen_context_dma(component, context, env_api, periph_sw_api, dma_api) {
  let result = {
    strategy: '',
    component: '',
    parent_resource: '',
    current_resource: '',
    dma_resource: '',
    instances: []
  };
  try {
    result.strategy = env_api.getVariableValue('SYSTEM_PROJECT_CODEGEN_STRATEGY');
    result.component = context.component;
    if (result.strategy === 'SW') {
      result.dma_resource = result.component;
      result.current_resource = component;
      let hw_instances = dma_api.getAllAllocatedDMAResourcesBoundToStandalone(context.component);
      hw_instances.forEach((hw_instance) => {
        let instance_ids = dma_api.getSoftwareInstancesBoundToStandalone(context.component, hw_instance.resourceId);
        instance_ids.forEach((instance_id) => {
          let config_instance = {
            current_resource: hw_instance.resourceId,
            config: instance_id.configuration
          };
          result.instances.push(config_instance);
        });
      });
    } else {
      result.parent_resource = context.resource;
      result.current_resource = context.hw_resource;
      result.dma_resource = context.hw_resource;
      let instance_ids = dma_api.getSoftwareInstancesBoundToStandalone(context.component, context.resource);
      instance_ids.forEach((instance_id) => {
        let config_instance = {
          current_resource: result.current_resource,
          config: instance_id.configuration
        };
        result.instances.push(config_instance);
      });
    }
  } catch (e) {
    console.error(`helper_common_get_codegen_context_dma: ${e}`);
  }
  return result;
}

/**
 * Prepare the codegen context used in the GPIO codegen templates
 * @param   {string} component SW component name (ex: 'GPIO')
 * @param   {object} context Context returned by mapping_hook.js (though get '')
 * @param   {object} env_api Getters of 'Environment Variable'
 * @param   {object} periph_sw_api Getters of 'Peripheral Software'
 * @param   {object} gpio_api Getters of 'GPIO'
 * @returns {object} Codegen context for GPIO
 */
function helper_common_get_codegen_context_gpio(component, context, env_api, periph_sw_api, gpio_api) {
  let result = {
    strategy: '',
    component: '',
    parent_resource: '',
    current_resource: '',
    dma_resource: '',
    instances: []
  };
  try {
    result.strategy = env_api.getVariableValue('SYSTEM_PROJECT_CODEGEN_STRATEGY');
    result.component = context.component;
    if (result.strategy === 'SW') {
      result.dma_resource = result.component;
      result.current_resource = component;
      let instance_ids = gpio_api.getGpioGroupSoftwareConfigurations("default_gpio_group_id", context.component);
      instance_ids.forEach((instance_id) => {
        let config_instance = {
          current_resource: result.current_resource,
          config: instance_id.settings.parameters
        };
        result.instances.push(config_instance);
      });
    } else {
      result.parent_resource = context.resource;
      result.current_resource = context.hw_resource;
      result.dma_resource = context.hw_resource;
      let instance_ids = gpio_api.getGpioGroupSoftwareConfigurations("default_gpio_group_id", context.component);
      instance_ids.forEach((instance_id) => {
        let config_instance = {
          current_resource: result.current_resource,
          config: instance_id.settings.parameters
        };
        result.instances.push(config_instance);
      });
    }
  } catch (e) {
    console.error(`helper_common_get_codegen_context_dma: ${e}`);
  }
  return result;
}


module.exports = {
  helper_common_initialize_index,

  helper_common_get_index,

  helper_common_inc_index,

  helper_common_get_generated_function_name,

  helper_common_get_generated_function_calls,

  helper_common_get_generated_function_calls_not_ranked,

  helper_common_if_value_is_enabled,

  helper_common_if_component_is_enabled,

  helper_common_if_rcc_clock_activated,

  helper_common_get_clk_enable_mode,

  helper_common_get_sw_config_ctxt,

  helper_common_get_irq_handler,

  helper_common_initialize_ll_code,

  helper_common_gen_ll_code_add_subinst,

  helper_common_get_object_by_key,

  helper_common_gen_ll_code,

  helper_common_gen_ll_code_subinst,

  helper_common_get_elt_in_array,

  helper_common_display_object,

  helper_common_object_has_property,

  helper_common_check_if_only_ll,

  helper_common_beautifier,

  helper_common_get_function_return_type,

  helper_common_get_ll_dma_instance_used_for_needs,

  helper_common_find_include_files,

  helper_common_get_codegen_context,

  helper_common_get_codegen_context_dma,

  helper_common_get_codegen_context_gpio

};
