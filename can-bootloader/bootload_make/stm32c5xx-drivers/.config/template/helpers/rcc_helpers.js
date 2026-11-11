/**
 * @file Helpers functions used for RCC SW component
 * @license
 * Copyright (c) 2026 STMicroelectronics.
 * All rights reserved.
 *
 * This software is licensed under terms that can be found in the LICENSE file
 * in the root directory of this software component.
 * If no LICENSE file comes with this software, it is provided AS-IS.
 */

/* Private constants -----------------------------------------------------------------------------------------------*/

const possible_feature_group = {
  1: "GROUP1",  /* Including HSIDIV3 */
  2: "GROUP2",  /* Including HSIDIV4 */
};

/* Mapping between CUBE Mx Resource name and clock tree */
const map_splitted_ppp = {
  "ADC12.ADC1": "ADC1",
  "ADC12.ADC2": "ADC2",
  "COMP12.COMP1": "COMP1",
  "COMP12.COMP2": "COMP2",
  "COMP34.COMP3": "COMP3",
  "COMP34.COMP4": "COMP4",
  "RAMCFG.SRAM1": "RAMCFG",
  "RAMCFG.SRAM2": "RAMCFG",
  "USB_DRD_FS.DEVICE": "USB_DRD_FS",
  "USB_DRD_FS.HOST": "USB_DRD_FS",
};

const no_config_ppp = ['RCC', 'NVIC', 'MPU', 'ICACHE'];

/* Mapping between Clock tree json file and helper file */
const C5_IDS = {
  System_Clock_Source: "System_Clock_Source",
  HCLK: "AHB_Clock"
};

/* Map of the clock source - For kernel clock source generated code*/
const map_clock_source = {
  System: "SYSCLK",
  System_Clock_Source: "SYSCLK",
  System_Clock_Frequency: "SYSCLK",
  LSI_Divider_RTC: "LSI",
  HCLK_Frequency: "HCLK",
  AHB_Clock: "HCLK",
  APB1_Peripheral_Clock: "PCLK1",
  PCLK1_Input_Clock: "PCLK1",
  APB2_Peripheral_Clock: "PCLK2",
  PCLK2_Input_Clock: "PCLK2",
  APB3_Peripheral_Clock: "PCLK3",
  PCLK3_Input_Clock: "PCLK3",
  APB1_divider: "PCLK1",
  APB2_divider: "PCLK2",
  APB3_divider: "PCLK3",
  AUDIO_Source: "AUDIOCLK",
  HSE_Divider_RTC: "HSE_DIV",
  PSI: "PSIS",
  PSI_DIV_3: 'PSIDIV3',
  HSI_DIV_3: 'HSIDIV3',
  PSI_DIV_4: 'PSIDIV4',
  HSI_DIV_4: 'HSIDIV4',
  ETH1_RMII_REF: 'RMII',
  ETH1_CLK_Div: 'FB'
};

/* Map of the resources kernel clock : used for the kernel clock source selection */
const map_kernel_clock = {
  ADC1: "ADCDAC",
  ADC2: "ADCDAC",
  ADC12: "ADCDAC",
  ADC3: "ADCDAC",
  COMP1: "COMP12",
  COMP2: "COMP12",
  COMP3: "COMP34",
  COMP4: "COMP34",
  DAC1: "ADCDAC",
  DAC2: "ADCDAC",
  FDCAN1: "FDCAN",
  FDCAN2: "FDCAN",
  RNG: "CK48",
  USB: "CK48",
  USB_DRD_FS: "CK48",
  TAMP: "RTC"
};

/* Map of the hw resource name: used for bus clock enable / disable */
const map_hw_resource_name = {
  ADC1: "ADC12",
  ADC2: "ADC12",
  ADC3: "ADC3",
  COMP1: "COMP12",
  COMP2: "COMP12",
  COMP3: "COMP34",
  COMP4: "COMP34",
  FDCAN1: "FDCAN",
  FDCAN2: "FDCAN",
  RAMCFG_SRAM1: "RAMCFG",
  RAMCFG_SRAM2: "RAMCFG",
  RTC: "RTCAPB",
  TAMP: "RTCAPB",
  USB_DRD_FS: "USB"
};

/* Map of the sw resource name (used in ll kernel clock source) */
const map_sw_resource_name = {
  ADC:        "ADCDAC",
  DAC:        "ADCDAC",
  ETH:        "ETH1",
  PLAY:       "PLAY1",
  RNG:        "CK48",
  TAMP:       "RTC",
  USB:        "CK48",
  USB_DRD_FS: "CK48",
};

/* Map of the resources (peripherals) name - to get the kernel clock source */
const map_resources_name_for_kernel_source = {
  ADC1:       "ADC_DAC",
  ADC2:       "ADC_DAC",
  ADC12:      "ADC_DAC",
  ADC3:       "ADC_DAC",
  DAC1:       "ADC_DAC",
  DAC2:       "ADC_DAC",
  ETH1:       "ETH1",
  FDCAN1:     "FDCAN",
  FDCAN2:     "FDCAN",
  PLAY1:      "PLAY",
  RNG:        "USB_RNG",
  USB:        "USB_RNG",
  USB_DRD_FS: "USB_RNG",
};

/* List of the external clock source */
const external_clock_source = [
  "HSE",
  "LSE"
];

/* List of the resources that does not include an enable bit */
/* This bit could be present in some product */
const resource_wo_enable = [
  'PWR',
];

/* List of the resources that does not include a reset bit */
/* This bit could be present in some product */
const resource_wo_reset = [
  'FLASH',
  'RTCAPB',
  'SRAM1',
  'SRAM2',
  'WWDG1',
];



/* List of the resources that does not include an enable switch */
const resource_wo_kernel_enable = [
'AES',
'CCB',
'COMP1',
'COMP2',
'COMP3',
'COMP4',
'CORDIC',
'CRC',
'FLASH',
'HASH',
'IWDG',
'OPAMP1',
'OPAMP2',
'OPAMP3',
'PKA',
'RAMCFG',
'SAES',
'SBS',
'TIM1',
'TIM2',
'TIM3',
'TIM4',
'TIM5',
'TIM6',
'TIM7',
'TIM8',
'TIM12',
'TIM15',
'TIM16',
'TIM17',
'WWDG',
];

/* List of the resources that share its clock enable / reset bit with another resource */
const resource_sharing_enable_bit = [
  ['ADC1', 'ADC2'],
  ['COMP1', 'COMP2'],
  ['COMP3', 'COMP4'],
  ['FDCAN1', 'FDCAN2'],
  ['RAMCFG_SRAM1', 'RAMCFG_SRAM2'],
  ['RNG', 'SAES'],
  ['RNG', 'PKA'],
  ['RTC', 'TAMP'],
  ['ETH1', 'SBS']
];

/* List of CCIPR3 peripherals */
const ccipr3_resources = [
  'ETH1',
  'ETH',
  'XSPI1'
];


/* List of resources that cannot be instantiated */
const not_instantiable_peripheral_resources = [
  'RTC',
  'TAMP'
];

/* List of DACs */
const dac_resources = [
  'DAC1',
  'DAC2'
];

/* List of resources required to set the ADC divider */
const adc_divider_resources = [
  'ADC1',
  'ADC2',
  'ADC3',
  'DAC1',
  'DAC2'
];

const available_oscillators = [
  'HSE',
  'HSIS',
  'HSIK',
  'HSIDIV3',
  'HSIDIV4',
  'PSIS',
  'PSIK',
  'PSIDIV3',
  'PSIDIV4',
  'LSE',
  'LSI',
];

const psi_clock_outputs = [
  'PSIS',
  'PSIK',
  'PSIDIV3',
  'PSIDIV4'
];

/* List of resources required to set the ADC divider */
const rtc_divider_resources = [
  'RTC',
  'CRS',
];

const available_sys_clk_src = {
  HSI_DIV_3: "HSIDIV3",
  HSI_DIV_4: "HSIDIV4",
  HSI: "HSIS",
  HSIS: "HSIS",
  HSE: "HSE",
  PSIS: "PSIS",
  PSI: "PSIS",
};

const available_systick_src = {
  LSE: "LSE",
  LSI: "LSI",
  Cortex_Divider: "HCLKDIV8",
};

const default_systick_src = "HCLKDIV8";

const map_mco_src = {
  'System_Clock_Source': 'SYSCLK',
  'System_Clock_Frequency': 'SYSCLK',
  'HSI': 'HSIS',
  'PSI': 'PSIS',
  'HSI_DIV_3': 'HSIDIV3',
  'HSI_DIV_4': 'HSIDIV4',
  'PSI_DIV_3': 'PSIDIV3',
  'PSI_DIV_4': 'PSIDIV4',
};

// Peripheral to Group mapping
const peripheralBusMapping = {
  CORDIC:         "AHB1_GRP1",
  CRC:            "AHB1_GRP1",
  ETH:            "AHB1_GRP1",
  ETHCK:          "AHB1_GRP1",
  ETHTX:          "AHB1_GRP1",
  ETHRX:          "AHB1_GRP1",
  ETH1:           "AHB1_GRP1",
  ETH1CK:         "AHB1_GRP1",
  ETH1TX:         "AHB1_GRP1",
  ETH1RX:         "AHB1_GRP1",
  FLASH:          "AHB1_GRP1",
  FLITF:          "AHB1_GRP1",
  LPDMA1:         "AHB1_GRP1",
  LPDMA2:         "AHB1_GRP1",
  RAMCFG:         "AHB1_GRP1",
  RAMCFG_SRAM1:   "AHB1_GRP1",
  RAMCFG_SRAM2:   "AHB1_GRP1",
  SRAM1:          "AHB1_GRP1",
  SRAM2:          "AHB1_GRP1",

  ADC:            "AHB2_GRP1",
  ADC1:           "AHB2_GRP1",
  ADC2:           "AHB2_GRP1",
  ADC3:           "AHB2_GRP1",
  AES:            "AHB2_GRP1",
  CCB:            "AHB2_GRP1",
  DAC1:           "AHB2_GRP1",
  DAC2:           "AHB2_GRP1",
  GPIOA:          "AHB2_GRP1",
  GPIOB:          "AHB2_GRP1",
  GPIOC:          "AHB2_GRP1",
  GPIOD:          "AHB2_GRP1",
  GPIOE:          "AHB2_GRP1",
  GPIOF:          "AHB2_GRP1",
  GPIOG:          "AHB2_GRP1",
  GPIOH:          "AHB2_GRP1",
  HASH:           "AHB2_GRP1",
  PKA:            "AHB2_GRP1",
  RNG:            "AHB2_GRP1",
  SAES:           "AHB2_GRP1",

  XSPI1:          "AHB4_GRP1",

  CRS:            "APB1_GRP1",
  I2C1:           "APB1_GRP1",
  I2C2:           "APB1_GRP1",
  I3C1:           "APB1_GRP1",
  OPAMP1:         "APB1_GRP1",
  OPAMP2:         "APB1_GRP1",
  OPAMP3:         "APB1_GRP1",
  SPI2:           "APB1_GRP1",
  SPI3:           "APB1_GRP1",
  TIM2:           "APB1_GRP1",
  TIM3:           "APB1_GRP1",
  TIM4:           "APB1_GRP1",
  TIM5:           "APB1_GRP1",
  TIM6:           "APB1_GRP1",
  TIM7:           "APB1_GRP1",
  TIM12:          "APB1_GRP1",
  UART4:          "APB1_GRP1",
  UART5:          "APB1_GRP1",
  UART7:          "APB1_GRP1",
  USART2:         "APB1_GRP1",
  USART3:         "APB1_GRP1",
  USART6:         "APB1_GRP1",
  WWDG:           "APB1_GRP1",

  COMP:           "APB1_GRP2",
  COMP1:          "APB1_GRP2",
  COMP2:          "APB1_GRP2",
  COMP3:          "APB1_GRP2",
  COMP4:          "APB1_GRP2",
  FDCAN:          "APB1_GRP2",
  FDCAN1:         "APB1_GRP2",
  FDCAN2:         "APB1_GRP2",

  PLAY1:          "APB2_GRP1",
  SPI1:           "APB2_GRP1",
  TIM1:           "APB2_GRP1",
  TIM8:           "APB2_GRP1",
  TIM15:          "APB2_GRP1",
  TIM16:          "APB2_GRP1",
  TIM17:          "APB2_GRP1",
  TIM20:          "APB2_GRP1",
  USART1:         "APB2_GRP1",
  USB:            "APB2_GRP1",
  USB_DRD_FS:     "APB2_GRP1",

  LPTIM1:         "APB3_GRP1",
  LPUART1:        "APB3_GRP1",
  RTCAPB:         "APB3_GRP1",
  RTC:            "APB3_GRP1",
  SBS:            "APB3_GRP1",
  TAMP:           "APB3_GRP1"

};

// Group to Clock mapping
const groupClockMapping = {
  AHB1_GRP1: "AHB",
  AHB2_GRP1: "AHB",
  AHB4_GRP1: "AHB",
  APB1_GRP1: "APB1_Peripheral",
  APB1_GRP2: "APB1_Peripheral",
  APB2_GRP1: "APB2_Peripheral",
  APB3_GRP1: "APB3_Peripheral"
};

/* Definition of the clock configuration strategy */
const rcc_config_codes = {
  CENTRAL: 0,
  CONTROLLED_BY_PERIPHERALS: 1,
  CONTROLLED_BY_USER: 2
};

/* Definition of the main config default values */
const rcc_ctx_defaults = {
  info: {
    labels: [
    ],
    layer: "HAL",
    init_type: "called",
  },
  basic: {
    periph_clocks_init: 0,
    flash_latency: 0,
    flash_programming_delay: 0,
    hse: {
      state: "OFF",
      enable_css: false,
      startup_time: 100,
    },
    lse: {
      state: "OFF",
      drive_capability: "LOW",
      enable_css: false,
      startup_time: 5000,
    },
  },
  additional: {
    hsi: {
      enable_in_stop_mode: false,
    },
    psi: {
      enable_in_stop_mode: false,
    },
    clk_outputs: {
      lsco: false,
      mco1: false,
      mco2: false,
    },
    audio_clock: {
      enable: false,
    },
  },
  system: {
    gpio: {
    },
    nvic: {
    },
    exti: {
    },
  },
};


/* Private Global variables -----------------------------------------------------------------------------------------------*/
let g_rcc_api = null;                     /* The list of global APIs */
let g_core_ctx = null;                    /* Object containing the core context */
let g_rcc_ctx = null;                     /* Object containing the rcc json parameter user confguration */
let g_rcc_clock_tree_config = null;       /* Object containing the rcc clock tree user configuration */
let g_rcc_all_resources = null;           /* Object containing the rcc bound resources */
let g_all_perifs_clock_config = null;     /* Object containing the rcc bound resources clock configurations */
let g_rcc_used_osc = null;                /* Array containing the used oscillators */
let g_c5_feature_group = null;            /* The c5 feature group */

const g_rcc_resource_state = {};            /* Object containing the resources that are enabled (clocks, pll, config)*/


/* Private function ------------------------------------------------------------------------------------------------*/

/**
 * Retrieve the clock information of the selected resource and add it in the all_periphs_config_object
 * This function retrieves the entire PPP configuration, from this PPP to clock source.
 * It thus get clock sources, dividers, PLL configurations
 * @param {string} resource_name HW resource name (ex: ADC1)
 * @param {object} all_periphs_config_object Current result of the clock configuration
 * @returns {object} Return an updated of the object current_ctx
 * ex {
 * "HCLK": {
 *    "resources": [
 *       "ADC1",
 *       "ADC4",
 *       "DAC1",
 *       "MDF1"
 *    ],
 *    "frequency": 160000000,
 *    "is_external": false
 * },
 * "PLL1": {
 *    "resources": [
 *       "FDCAN1"
 *    ],
 *    "Q": {
 *       "resources": [
 *          "FDCAN1"
 *       ],
 *       "is_external": true
 *    },
 *    "is_external": true
 * },
 * "PCLK1": {
 *    "resources": [
 *       "I2C1",
 *       "LPTIM2",
 *       "USART3"
 *    ],
 *    "frequency": 160000000,
 *    "is_external": true
 * },
 *}
 */
function rcc_get_pppi_configurations(
  resource_name,
  all_periphs_config_object
) {
  let result = all_periphs_config_object;
  if (result == null) {
    result = {};
  }

  try {
    console.info(`rcc_get_pppi_configurations: resource=${resource_name}`);
    const c5_feature_group = helper_rcc_detect_feature_group();

    let clock_source_object = helper_rcc_get_clock_source_object(resource_name);
    if (clock_source_object) {
      let clock_source_id = clock_source_object.value;

      clock_source_id = helper_rcc_remap_clock_source(clock_source_id);

      /* Then, add the clock properties */
      rcc_add_resource_clock_source(result, clock_source_id, clock_source_object.frequency, resource_name);
    }

    /* Some resources have dependancies */

    /* DAC: DACSH clock */
    clock_source_id = ""
    if (helper_rcc_is_dacsh_needed(resource_name)){
      clock_source_id = helper_rcc_get_dac_sh_clock();
    }
    else if (resource_name == 'CRS'){
      const crs_config = helper_rcc_get_component_context('STMicroelectronics::Device:STM32CubeMX2 Config:CRS');
      if (crs_config?.basic.sync_signal.sync_source === 'LSE') {
        clock_source_id = 'LSE';
      }
      else if (crs_config?.basic.sync_signal.sync_source === 'HSE_1MHZ') {
        clock_source_id = 'HSE';

         /* also add HSE DIV */
        let clock_object = g_rcc_api.clockAPI.getClockInformationById('HSE_Divider_RTC');
        rcc_add_resource_clock_source(result, 'HSE_DIV', clock_object.frequency, resource_name);
      }

      /* Also add kernel clock source (HSIDIV3 or HSIDIV4) */
      if (c5_feature_group === 'GROUP2') {
        let clock_object = g_rcc_api.clockAPI.getClockInformationById('HSI_DIV_4');
        rcc_add_resource_clock_source(result, 'HSIDIV4', clock_object.frequency, resource_name);
      }
      else  {
        let clock_object = g_rcc_api.clockAPI.getClockInformationById('HSI_DIV_3');
        rcc_add_resource_clock_source(result, 'HSIDIV3', clock_object.frequency, resource_name);
      }


    }
    else if (resource_name == 'RTC') {
      const rtc_clock_source_object = helper_rcc_get_clock_source_object("RTC");
      const rtc_clock_source = helper_rcc_remap_clock_source(rtc_clock_source_object.value);
      if (rtc_clock_source == "HSE_DIV") {
        let clock_object = g_rcc_api.clockAPI.getClockInformationById('HSE_Divider_RTC');
        rcc_add_resource_clock_source(result, 'HSE_DIV', clock_object.frequency, resource_name);

        /* Also add HSE */
        clock_source_id = 'HSE';
      }
    }
    else if (resource_name == 'SBS'){
      const sbs_config = helper_rcc_get_component_context('STMicroelectronics::Device:STM32CubeMX2 Config:SBS');
      if (sbs_config?.additional.compensation_cell.vddio.vddio) {
        clock_source_id = 'HSI';
      }
    }
    else if (resource_name == 'ETH1'){

      // ETH1 PTP Clock Source
      clock_source_id = g_rcc_api.clockAPI.getClockInformationById('ETH1_PTP_Clock_Source').value;
      let clock_object = g_rcc_api.clockAPI.getClockInformationById(clock_source_id);
      clock_source_id = helper_rcc_remap_clock_source(clock_source_id);
      rcc_add_resource_clock_source(result, clock_source_id, clock_object.frequency, resource_name);

      // The ETH1REF clock source
      //clock_source_id = g_rcc_api.clockAPI.getClockInformationById('ETH1_REF_Clock_Source').value;
      //clock_object = g_rcc_api.clockAPI.getClockInformationById(clock_source_id);
      //rcc_add_resource_clock_source(result, clock_source_id, clock_object.frequency, resource_name);

      /* Divider detection */
      clock_source_id = 'ETH1_CLK_Div';
      clock_object = g_rcc_api.clockAPI.getClockInformationById(clock_source_id);
      rcc_add_resource_clock_source(result, 'ETH1_DIV', clock_object.frequency, resource_name);

      clock_source_id = "";
    }
    else if (resource_name == 'SAES' || resource_name == 'PKA' || resource_name == 'CCB'){
      /* For SAES, PKA and CCB: RNG is required */
      let clock_source_object = helper_rcc_get_clock_source_object('RNG');
      if (clock_source_object) {
        let clock_source_id = clock_source_object.value;
        clock_source_id = helper_rcc_remap_clock_source(clock_source_id);
        rcc_add_resource_clock_source(result, clock_source_id, clock_source_object.frequency, resource_name);
      }
      clock_source_id = "";
    }
    else if (resource_name =='PLAY1'){
      /* PLAY Divider detection */
      clock_source_id = 'PLAY_Div';
      let clock_object = g_rcc_api.clockAPI.getClockInformationById(clock_source_id);
      rcc_add_resource_clock_source(result, 'PLAY_DIV', clock_object.frequency, resource_name);
    }

    /* If additional resource not yet added, do it now */
    if (clock_source_id != ""){
      let clock_object = g_rcc_api.clockAPI.getClockInformationById(clock_source_id);
      if(clock_source_id == 'HSI'){clock_source_id = 'HSIS';}
      rcc_add_resource_clock_source(result, clock_source_id, clock_object.frequency, resource_name);
    }

    /* ADC and DAC: ADCDIV Detection */
    clock_source_id = "";
    if (adc_divider_resources.some(sub => resource_name.includes(sub))) {
      clock_source_id = 'ADCDACPRE_DIV';
      let clock_object = g_rcc_api.clockAPI.getClockInformationById(clock_source_id);
      rcc_add_resource_clock_source(result, "ADC_DAC_DIV", clock_object.frequency, resource_name);
    }

  } catch (error) {
    console.error(`rcc_get_pppi_configurations: ${error}`);
  }
  return result;
}

/**
 * Add a resource clock source in the result object
 * @param {object} result Current result object
 * @param {string} source_name Clock source name
 * @param {number} source_frequency Clock source frequency
 * @param {string} resource_name HW resource name (ex: ADC1)
 * @returns None
 */
function rcc_add_resource_clock_source(result, source_name, source_frequency, resource_name){

  console.info(`rcc_get_pppi_configurations: resource=${resource_name}. New node: ${source_name}`);
  /* Create the Source Name */
  if (!result.hasOwnProperty(source_name)) {
    result[source_name] = { resources: [] };
  }
  /* Populate resource informations if not already done */
  if (result[source_name]["resources"].indexOf(resource_name) < 0) {
    result[source_name]["resources"].push(resource_name);
    result[source_name]["frequency"] = source_frequency;
    if (external_clock_source.includes(source_name)) {
      result[source_name]["is_external"] = true;
    }
    else
    {
      result[source_name]["is_external"] = false;
    }
  }
}

/**
 * Retrieve the system clock source properties
 * @returns {object} Returns "ok", the execution status (true/false) and "object" containing the system clock properties
 * ex:
 * {
 *   ok: true,
 *   object:{
 *     HSI_DIV_3: true,
 *     HSIS: false,
 *     HSE: false,
 *     PSIS: false,
 *     name:"HSIDIV3",
 *     frequency: 8000000
 *    }
 * }
 */
function rcc_find_system_clock_src() {
  let ok = false;
  let object = {
    HSIDIV3: false,
    HSIDIV4: false,
    HSIS: false,
    HSE: false,
    PSIS: false,
    name:"HSIDIV3",
    frequency: 8000000
  }

  try {
    let clock_source_object = g_rcc_api.clockAPI.getClockInformationById('System_Clock_Source');
    let clock_source_name = clock_source_object.value;

    if (available_sys_clk_src.hasOwnProperty(clock_source_name)) {
      ok = true;
      let remapped_name = available_sys_clk_src[clock_source_name];
      object.name = remapped_name;
      object[remapped_name] = true;
      object.frequency = clock_source_object.frequency;
    } else {
      console.error(`helper_rcc rcc_find_system_clock_src: ${clock_source_name} not part of the available_sys_clk_src - using default`);
    }
  } catch  (error) {
    console.error(`[ERROR] rcc_find_system_clock_src: ${error}`);
  }

  return {ok, object};
}

/**
 * Retrieve the system prescalers
 * @returns {object} Returns "ok", the execution status (true/false) and "object" containing the prescalers
 * ex:
 * {
 *   ok: true,
 *   object:{
 *     ahb: 1,
 *     apb1: 2,
 *     apb2: 4,
 *     apb3: 8
 *    }
 * }
 */
function rcc_find_system_prescaler() {
  let ok = false;
  let object = {
    ahb: 1,
    apb1: 1,
    apb2: 1,
    apb3: 1,
  }

  try {
    object.ahb = g_rcc_api.clockAPI.getClockInformationById('AHB_Clock_Divider').value;
    object.apb1 = g_rcc_api.clockAPI.getClockInformationById('APB1_Clock_Divider').value;
    object.apb2 = g_rcc_api.clockAPI.getClockInformationById('APB2_Clock_Divider').value;
    object.apb3 = g_rcc_api.clockAPI.getClockInformationById('APB3_Clock_Divider').value;
    ok = true;
  }
  catch  (error) {
    console.error(`[ERROR] rcc_find_system_prescaler: ${error}`);
  }
  return {ok, object};
}

/**
 * Retrieve the clock dividers
 * @returns {object} Returns "ok", the execution status (true/false) and "object" containing the prescalers
 * ex:
 * {
 *   ok: true,
 *   object:{
 *    hsik: '2',
 *    psik: '1',
 *    adc:'16',
 *    rtc:'1'
 *   }
 * }
 */
function rcc_find_clock_divider(){
  let ok = false;
  let object = {
    hsik: '1',
    psik: '1',
    adc:'1',
    rtc:'1',
    eth1:'1',
    play:'1'
  }

  try {
    object.hsik = g_rcc_api.clockAPI.getClockInformationById('HSIK')?.value || '1';
    object.psik = g_rcc_api.clockAPI.getClockInformationById('PSIK')?.value || '1';
    object.adc = g_rcc_api.clockAPI.getClockInformationById('ADCDACPRE_DIV')?.value || '1';
    object.rtc = g_rcc_api.clockAPI.getClockInformationById('HSE_Divider_RTC')?.value || '1';
    object.eth1 = g_rcc_api.clockAPI.getClockInformationById('ETH1_CLK_Div')?.value || '1';
    object.play = g_rcc_api.clockAPI.getClockInformationById('PLAY_Div')?.value || '1';

    /* convert number to string. 1.5 is converted to 1_5 */
    object.hsik = object.hsik?.toString().replace('.', '_');
    object.psik = object.psik?.toString().replace('.', '_');

    ok = true;
  }
  catch  (error) {
    console.error(`[ERROR] rcc_find_clock_divider: ${error}`);
  }

  return {ok, object};
}

/**
 * Retrieve the systick clock source
 * @returns {object} Returns "ok", the execution status (true/false) and "object" containing the prescalers
 * ex:
 * {
 *   ok: true,
 *   object:{
 *     ahb: 1,
 *     apb1: 2,
 *     apb2: 4,
 *     apb3: 8
 *    }
 * }
 */
function rcc_find_systick_clock_src() {
  let ok = false;
  let object = {
    HCLKDIV8: false,
    LSE: false,
    LSI: false,
    name:"HCLKDIV8",
    is_default: false
  }

  try {
    let clock_source_object = g_rcc_api.clockAPI.getClockInformationById('Cortex_Clock_Mux');
    let clock_source_name = clock_source_object.value;

    if (available_systick_src.hasOwnProperty(clock_source_name)) {
      ok = true;
      let remapped_name = available_systick_src[clock_source_name];
      object.name = remapped_name;
      object[remapped_name] = true;
      //if (remapped_name == default_systick_src)
      //  object.is_default = true;
    } else {
      console.error(`helper_rcc rcc_find_systick_clock_src: ${clock_source_name} not part of the available_systick_src - using default`);
    }
  } catch  (error) {
    console.error(`[ERROR] rcc_find_systick_clock_src: ${error}`);
  }

  return {ok, object};
}

/**
 * Retrieve the clock outputs configuration
 * @param {object} rcc_ctx The RCC context (user input configuration)
 * @returns {object} Returns "ok", the execution status (true/false) and "object" containing the clock outputs configuration
 * ex:
 * {
 *   ok: true,
 *   object:{
 *    mco1: {src: 'SYSCLK', div: 1, used : false},
 *    mco2: {src: 'SYSCLK', div: 1, used : false},
 *    lsco: {src: 'LSI', div: 0, used : false}
 *  }
 * }
 */
function rcc_find_clk_outputs_config(rcc_ctx, c5_feature_group) {
  let ok = false;
  let object = {
    mco1: {src: 'SYSCLK', div: 1, used : false},
    mco2: {src: 'SYSCLK', div: 1, used : false},
    lsco: {src: 'LSI', div: 0, used : false, pin: 'PB0'}
  }

  try {
    if (rcc_ctx?.additional.clk_outputs.mco1) {
      let src = g_rcc_api.clockAPI.getClockInformationById('MCO1_Clock_Source').value;
      if (map_mco_src.hasOwnProperty(src)) {
        src = map_mco_src[src];
      }
      object.mco1.src = src;
      object.mco1.div = g_rcc_api.clockAPI.getClockInformationById('MCO1_div_Clock').value;
      object.mco1.used = true;
    }

    if (rcc_ctx?.additional.clk_outputs.mco2) {
      src = g_rcc_api.clockAPI.getClockInformationById('MCO2_Clock_Source').value;
      if (map_mco_src.hasOwnProperty(src)) {
        src = map_mco_src[src];
      }
      object.mco2.src = src;
      object.mco2.div = g_rcc_api.clockAPI.getClockInformationById('MCO2_div_Clock').value;
      object.mco2.used = true;
    }

    if (rcc_ctx?.additional.clk_outputs.lsco) {
      object.lsco.src = g_rcc_api.clockAPI.getClockInformationById('LSCO_Clock_Source').value;
      object.lsco.used = true;

      if (c5_feature_group === 'GROUP2') {
        /* Get the pin used for LSCO */
        const possible_pins = ['PB0', 'PB2'];
        for (const pin of possible_pins) {
          let pin_data_object = g_rcc_api.pinoutAPI.getPinData(pin);
          if (pin_data_object.signals.some(signal => signal.name === "RCC_LSCO")) {
            object.lsco.pin = pin;
            break;
          }
        }
      }

    }
    ok = true;
  }
  catch  (error) {
    console.error(`[ERROR] rcc_find_clk_outputs_config: ${error}`);
  }
  return {ok, object};
}

/**
 * Retrieve the PSI configuration
 * @returns {object} Returns "ok", the execution status (true/false) and "object" containing the PSI configuration
 * ex:
 * {
 *  ok: true,
 *  object:{
 *   source_to_enable: 'HSIS',
 *   source_hal: 'HSI_8MHz',
 *   source_ll: 'HSI_DIV_18',
 *   ref: '8MHZ',
 *   fy: '100MHZ',
 *   valid_HSE: true,   (analysis of the reference frequency validity)
 *   valid_LSE: true    (analysis of the reference frequency validity)
 *  }
 * }
 */
function rcc_find_psi_config(){

  const available_psi_src = [ "LSE", "HSE", "HSI_DIV_18", "HSI_DIV_24"];

  const psi_src_hal = {
    LSE: "LSE",
    HSE: "HSE",
    HSI_DIV_18: "HSI_8MHz",
    HSI_DIV_24: "HSI_8MHz"
  };
  const psi_src_ll = {
    LSE: "LSE",
    HSE: "HSE",
    HSI_DIV_18: "HSIDIV18",
    HSI_DIV_24: "HSIDIV24"
  };

  const available_psi_src_to_enable = {
    LSE: "LSE",
    HSE: "HSE",
    HSI_DIV_18: "HSIS",
    HSI_DIV_24: "HSIS"
  };

  const available_psi_fy = {
    '100000000':'100MHZ',
    '144000000':'144MHZ',
    '160000000':'160MHZ',
    '192000000':'192MHZ',
    '200000000':'200MHZ'
  };

  const psi_possible_reference_fy = {
    LSE:['32768'],
    HSE:['8000000', '16000000', '24000000', '25000000', '32000000', '48000000', '50000000'],
    HSI_DIV_18:['8000000'],
    HSI_DIV_24:['8000000']
  };

  const available_ref_name_for_psi = {
    '32768': '32768HZ',
    '8000000': '8MHZ',
    '16000000': '16MHZ',
    '24000000': '24MHZ',
    '25000000': '25MHZ',
    '32000000': '32MHZ',
    '48000000': '48MHZ',
    '50000000': '50MHZ'
  };

  let ok = true;
  let object = {
    source_to_enable: 'HSIS',
    source_hal: 'HSI_8MHz',
    source_ll: 'HSI_DIV_18',
    ref: '8MHZ',
    fy: '100MHZ',
    valid_HSE: true,
    valid_LSE: true
  }

  try {
    let psi_input_id = g_rcc_api.clockAPI.getClockInformationById('PSI_Clock_Mux').value;
    const psi_fy_value = g_rcc_api.clockAPI.getClockInformationById('PSI').value;

    psi_input_id = psi_input_id.replace('_inputid','');

    if (available_psi_src.includes(psi_input_id)) {
      object.source_hal = psi_src_hal[psi_input_id];
      object.source_ll = psi_src_ll[psi_input_id];;
      object.source_to_enable = available_psi_src_to_enable[psi_input_id];

      // Reference frequency validation
      if (psi_input_id == 'LSE') {

        const lse_fy_value = String(g_rcc_api.clockAPI.getClockInformationById('LSE').value);
        if (psi_possible_reference_fy.LSE.includes(lse_fy_value)) {
          object.ref = available_ref_name_for_psi[lse_fy_value];
        }
        else{
          // This is a problem!!! For the moment keep default value
          object.ref = "32768HZ";
          object.valid_LSE = false;
        }
      }
      else if (psi_input_id == 'HSE')
      {
        /* Find HSE Frequency */
        const hse_fy_value = String(g_rcc_api.clockAPI.getClockInformationById('HSE').value);
        if (psi_possible_reference_fy.HSE.includes(hse_fy_value)) {
          /* 25 and 50MHz are only supported to generate 100Mhz clock */
          if ((hse_fy_value == 25000000 || hse_fy_value == 50000000) && psi_fy_value != 100000000) {
            // This is a problem!!! For the moment keep default value
            object.ref = "8MHZ";
            object.valid_HSE = false;
          }
          else {
            object.ref = available_ref_name_for_psi[hse_fy_value];
          }
        }
        else{
          // This is a problem!!! For the moment keep default value
          object.ref = "8MHZ";
          object.valid_HSE = false;
        }
      }
      else
      {
        /* This is HSI div18 or HSI div24 all equal to 8Mhz*/
        object.ref = "8MHZ";
      }

    }
    else
    {
      ok = false;
    }

    /* Read the expected fy value */
    if (available_psi_fy.hasOwnProperty(psi_fy_value)) {
      object.fy = available_psi_fy[psi_fy_value];
    }
    else
    {
      ok = false;
    }
  }
  catch  (error) {
    console.error(`[ERROR] rcc_find_psi_config: ${error}`);
  }
  return {ok, object};
}

/**
 * This function checks if the user selected flash latency is possible.
 * If no, it returns the optimal flash latency for current frequency
 * @param {*} system_clock_frequency the system clock frequency
 * @param {*} selected_latency the selected flash latency
 * @return {*} the adjusted flash latency
 */
function rcc_adjust_flash_latency(system_clock_frequency, selected_latency)
{
  let latency = selected_latency ? selected_latency : 0;

  const latency_max_frequency = g_rcc_api.peripheralsResourceManagerAPI.getHardwareIpDescription("RCC").features.flash.latency_max_frequency;
  const optimal_latency = helper_rcc_get_optimal_latency(latency_max_frequency, system_clock_frequency);
  if (latency < optimal_latency)
  {
    latency = optimal_latency;
  }
  return latency;
}

/**
 * This function checks if the user selected flash programming delay is possible.
 * If no, it returns the optimal flash programming delay for current frequency
 * @param {*} system_clock_frequency the system clock frequency
 * @param {*} selected_programming_delay the selected flash programming delay
 * @return {*} the adjusted flash programming delay
 */
function rcc_adjust_flash_programming_delay(system_clock_frequency, selected_programming_delay)
{
  let programming_delay = selected_programming_delay ? selected_programming_delay : 0;

  const programming_delay_max_frequency = g_rcc_api.peripheralsResourceManagerAPI.getHardwareIpDescription("RCC").features.flash.programming_delay_max_frequency;
  const optimal_programming_delay = helper_rcc_get_optimal_programming_delay(programming_delay_max_frequency,system_clock_frequency);
  if (programming_delay < optimal_programming_delay)
  {
    programming_delay = optimal_programming_delay;
  }
  return programming_delay;
}


/* Exported functions ----------------------------------------------------------------------------------------------*/

/**
 * RCC code generation initialization: make the code generation APIs global for them to be usable in any helpers
 * @param {object} root is program root
 * @returns None
 */
function helper_rcc_init_codegen(root){
  if (g_rcc_api == null){
    g_rcc_api = {}

    g_rcc_api['SWConfigurationAPI'] = root.SWConfigurationAPI;
    g_rcc_api['peripheralsResourceManagerAPI'] = root.peripheralsResourceManagerAPI;
    g_rcc_api['clockAPI'] = root.clockAPI;
    g_rcc_api['EnvVarAPI'] = root.EnvVarAPI;
    g_rcc_api['pinoutAPI'] = root.pinoutAPI;

    console.info(`helper_rcc_init_codegen: initialization successful`);
  }
}


/**
 * Detect the RCC feature group of the MCU based on available clock frequencies.
 * @param  None
 * @returns {string} The detected feature group ("GROUP1" or "GROUP2")
 */
function helper_rcc_detect_feature_group() {
  if (g_c5_feature_group == null){
    let found = false;
    try {
      g_rcc_api.clockAPI.getClockFrequency("HSI_DIV_3");
      g_c5_feature_group = "GROUP1";
      found = true;
    }
    catch (error) {
      console.info(`helper_rcc_detect_feature_group: HSI_DIV_3 not found, trying HSI_DIV_4`);
    }
    if (!found){
      try {
        g_rcc_api.clockAPI.getClockFrequency("HSI_DIV_4");
        g_c5_feature_group = "GROUP2";
      }
      catch (error) {
        console.error(`helper_rcc_detect_feature_group: HSI_DIV_4 not found, feature group detection failed`);
      }
    }
  }
  return g_c5_feature_group;
}

/**
 * Retrieve context information (user inputs) of a component. Only the first instance is considered.
 * If multiple instances are present (UART1, 2 and 3 for instance), only UART1 configuration is returned.
 * @param {string} componentId is the identifier of the component as referenced by SW Config in its store,
 *                             or a meaningful subpart of the full componentId.
*                              example: "STMicroelectronics::Device:STM32CubeMX2 Config:RCC"
 * @returns {object} The context (user inputs)
 */
function helper_rcc_get_component_context(componentId) {
  let context;
  try {
    const instances = g_rcc_api.SWConfigurationAPI.getInstances(componentId);
    if (instances.length > 0) {
      context = g_rcc_api.SWConfigurationAPI.getSwInstanceConfiguration(instances[0]);
    }
  } catch (error) {
    console.error(`[ERROR] helper_rcc_get_component_context: ${error}`);
  }
  return context;
}

/**
 * Retrieve RCC main configuration. If RCC is not bound, default configuration is used.
 * @param  None
 * @returns {object} The RCC config (user inputs)
 */
function helper_rcc_get_rcc_context() {
  if (!g_rcc_ctx){
    g_rcc_ctx = helper_rcc_get_component_context('STMicroelectronics::Device:STM32CubeMX2 Config:RCC');

    if (!g_rcc_ctx){
      g_rcc_ctx = rcc_ctx_defaults;
      console.info(`helper_rcc_get_rcc_context: RCC not bound - default configuration used`);
    }
  }
  return g_rcc_ctx;
}

/**
 * Get the CORE configuration
 * @returns {object} The CORE configuration
 */
function helper_rcc_get_core_context() {
  if (g_core_ctx == null){
    g_core_ctx = helper_rcc_get_component_context('STMicroelectronics::Device:STM32CubeMX2 Config:CORE');
  }
  return g_core_ctx;
}


/**
 * Check is a RCC feature is available/enabled from CORE configuration
 * @param  {string} feature Feature to check
 * @returns {boolean} true if the feature is enabled, false otherwise
 */
function helper_rcc_is_feature_enabled(feature) {
  const core_configuration = helper_rcc_get_core_context();
  if (core_configuration?.rcc_feature?.[feature] === true) {
      return true;
  }
  return false;
}

/**
 * Retrieve RCC available bus list
 * @param  None
 * @returns {array} bus_list, an array containing the available buses
 */
function helper_rcc_get_available_buses() {
  let bus_list = [];
  try {
    const rcc_description = g_rcc_api.peripheralsResourceManagerAPI.getHardwareIpDescription("RCC");
    bus_list = Object.keys(rcc_description.features.GRP1);

    console.info(`helper_rcc_get_available_buses: ${bus_list}`);
  } catch (error) {
    console.error(`[ERROR] helper_rcc_get_available_buses: ${error}`);
  }

  return bus_list;
}


/**
 * Retrieve and order all user inputs usefull for system clock config function generation
 * @details Call in mx_rcc_template.c.hbs (object system_clk_config_object) to fill the function mx_rcc_cfg1_hal_init
 *          This function selects the latency depending on the targeted frequency and VCORE value.
 *          If the targeted frequency does not allow to select a latency, an error will occur
 * @param  {object}} The rcc context (user inputs)
 * @returns {object} rcc_config, an object containing all information for system configuration
 *{
 *    clock_source,
 *    latency,
 *    prescaler,
 *    frequencies,
 *}
 */
function helper_rcc_get_system_config(rcc_ctx) {

  if (g_rcc_clock_tree_config == null){

    try {
      console.info(`helper_rcc_get_system_config`);

      const rcc_config =
      {
        clock_source: undefined,
        systick_source:undefined,
        prescaler:null,
        frequencies:{},
        clk_outputs: null,
        divider: null,
        flash_latency:1,
        flash_programming_delay:0,
        psi_config:null,
      }

      let result;
      const c5_feature_group = helper_rcc_detect_feature_group();

      /* Build system clcok source object */
      result = rcc_find_system_clock_src();
      rcc_config.clock_source = result.object;
      if (result.ok === false){
        console.error(`helper_rcc_get_hal_clock_config_object: default system clock source used`);
      }

      /* Adjust Flash Latency and programming delay */
      rcc_config.flash_latency = rcc_adjust_flash_latency(rcc_config.clock_source.frequency, rcc_ctx?.basic.flash_latency);
      rcc_config.flash_programming_delay = rcc_adjust_flash_programming_delay(rcc_config.clock_source.frequency, rcc_ctx?.basic.flash_programming_delay);

      /* Find Prescalers */
      result = rcc_find_system_prescaler();
      rcc_config.prescaler = result.object;
      if (result.ok === false){
        console.error(`helper_rcc_get_hal_clock_config_object: bus prescaler parsing error`);
      }

      /* Find Systick source */
      if (helper_rcc_is_cortex_clock_source_needed()){
        result = rcc_find_systick_clock_src();
        rcc_config.systick_source = result.object;
        if (result.ok === false){
          console.error(`helper_rcc_get_hal_clock_config_object: systick parsing error`);
        }
      }

      /* Find the clock dividers */
      result = rcc_find_clock_divider();
      rcc_config.divider = result.object;
      if (result.ok === false){
        console.error(`helper_rcc_get_hal_clock_config_object: clock divider parsing error`);
      }

      /* Fill in Frequencies */
      if (c5_feature_group === "GROUP1"){
      rcc_config.frequencies['default'] = g_rcc_api.clockAPI.getClockFrequency("HSI_DIV_3"); /* Default clock is HSIDIV3 */
      }
      else if (c5_feature_group === "GROUP2"){
        rcc_config.frequencies['default'] = g_rcc_api.clockAPI.getClockFrequency("HSI_DIV_4"); /* Default clock is HSIDIV4 */
      }
      else {
        rcc_config.frequencies['default'] = 0;
      }
      rcc_config.frequencies['ahb'] = parseInt(g_rcc_api.clockAPI.getClockFrequency("AHB_Clock"));
      rcc_config.frequencies['system'] = rcc_config.clock_source.frequency;
      rcc_config.frequencies['hsi'] = g_rcc_api.clockAPI.getClockFrequency("HSI");

      /* Find MCO configs */
      result = rcc_find_clk_outputs_config(rcc_ctx, c5_feature_group);
      rcc_config.clk_outputs = result.object;
      if (result.ok === false){
        console.error(`helper_rcc_get_hal_clock_config_object: mco parsing error`);
      }

      /* Find the PSI Configuration */
      result = rcc_find_psi_config();
      rcc_config.psi_config = result.object;
      if (result.ok === false){
        console.error(`helper_rcc_get_hal_clock_config_object: psi config parsing error`);
      }

      console.info(`helper_rcc_get_system_config: ${JSON.stringify(rcc_config)}`);
      g_rcc_clock_tree_config = rcc_config;
    } catch (error) {
      console.error(`[ERROR] helper_rcc_get_system_config: ${error}`);
      g_rcc_clock_tree_config = {};
    }
  }
  return g_rcc_clock_tree_config;
}

/**
 * Retrieve the list of resources (IPs) bound to at least one software component instance
 * @param  None
 * @returns {array} A list of resources name
 */
function helper_rcc_get_all_resources() {
  if (g_rcc_all_resources == null){
    g_rcc_all_resources = g_rcc_api.peripheralsResourceManagerAPI.getPeripheralsBoundToSoftwareInstances();

    /* Remove resources that does not need configuration*/
    g_rcc_all_resources = g_rcc_all_resources.filter(resource => !no_config_ppp.includes(resource))

    /* Rename ppp.pppi resources to pppi (RAMCFG.RAMCFG_SRAM1 renames to RAMCFG_SRAM1)*/
    g_rcc_all_resources = g_rcc_all_resources.map(item => map_splitted_ppp[item] !== undefined ? map_splitted_ppp[item] : item);

    /* Remove duplicated */
    g_rcc_all_resources = [...new Set(g_rcc_all_resources)];

  }
  return g_rcc_all_resources;
}

/**
* Retrieve the clock information for all bound resources
* @param {array} all_resources, the list of bound resources name (get with helper_rcc_get_all_resources)
* @returns {array} A list of clock objects. Each clock object includes the clock frequency, the is_external property and the list of resource using this clock as source
 * ex {
 * "HCLK": {
 *    "resources": [
 *       "ADC1",
 *       "ADC4",
 *       "DAC1",
 *       "MDF1"
 *    ],
 *    "frequency": 160000000,
 * },
 * "PCLK1": {
 *    "resources": [
 *       "I2C1",
 *       "LPTIM2",
 *       "USART3"
 *    ],
 *    "frequency": 160000000,
 * },
 * "LSE": {
 *    "resources": [
 *       "I2C2",
 *       "LPTIM1",
 *       "USART5"
 *    ],
 *    "frequency": 32768,
 * },
 *}
 */
function helper_rcc_get_all_perifs_clock_config(all_resources) {
  if (g_all_perifs_clock_config == null){
    try {
      let result_object = {};
      all_resources.forEach((/** @type {string} */ resource_name) => {
        result_object = rcc_get_pppi_configurations(resource_name, result_object);
      });
      g_all_perifs_clock_config = result_object;
      console.info(`All perif clock config =${JSON.stringify(g_all_perifs_clock_config)}`);
    }catch (error) {
        console.error(`[ERROR] helper_rcc_get_all_perifs_clock_config: ${error}`);
    }
  }
  return g_all_perifs_clock_config;
}

/**
 * Retrieve the clock information for a given resource
* @param {string} resource_name, the resources name
* @returns {object} One clock object. This clock object includes the clock frequency and the resource using this clock as source.
 */
function helper_rcc_get_one_perif_clock_config(resource_name) {
  let perif_clock_config = rcc_get_pppi_configurations(resource_name, null);

  return perif_clock_config;
}

/**
 * Retrieve the clock source object from the resource name
 * @param {string} resource_name HW resource name(ex ADC1)
 * @returns {object} Return an updated of the object current_ctxt
 */
function helper_rcc_get_clock_source_object(resource_name){
  let clock_source_id
  if (map_resources_name_for_kernel_source.hasOwnProperty(resource_name)) {
    clock_source_id = map_resources_name_for_kernel_source[resource_name];
    clock_source_id += '_Clock_Source';
  }
  else {
    let input_clock_object = g_rcc_api.clockAPI.getClockInformationByHwInstance(resource_name);
    if (input_clock_object){
      clock_source_id = input_clock_object.id.replace('_Input_Clock','_Clock_Source');
    }
  }
  const clock_source_object = g_rcc_api.clockAPI.getClockInformationById(clock_source_id);
  return clock_source_object;
}

/**
 * Retrieve the used oscillators in the current configuration
 * @param {object} rcc_config, the rcc main configuration
 * @param {array} all_ppp_clock_configs, the list of all ppp clock configurations
 * @returns {array} The list of used oscillators
 */
function helper_rcc_get_used_osc(rcc_config, all_ppp_clock_configs){
  if (g_rcc_used_osc == null){

    try {
      let found_osc = [];
      let psi_is_used = false;
      /* System clock analysis */
      if (available_oscillators.includes(rcc_config.clock_source.name)){
        found_osc.push(rcc_config.clock_source.name);
      }
      if (psi_clock_outputs.includes(rcc_config.clock_source.name)){
        psi_is_used = true;
      }

      /* Systick clock analysis */
      if (available_oscillators.includes(rcc_config.systick_source?.name)){
        found_osc.push(rcc_config.systick_source.name);
      }
      if (psi_clock_outputs.includes(rcc_config.systick_source?.name)){
        psi_is_used = true;
      }

      /* MCO analysis (get source only if used)*/
      if (rcc_config.clk_outputs.mco1.used == true) {
        if (available_oscillators.includes(rcc_config.clk_outputs.mco1.src)){
          found_osc.push(rcc_config.clk_outputs.mco1.src);
        }
        if (psi_clock_outputs.includes(rcc_config.clk_outputs.mco1.src)){
          psi_is_used = true;
        }
      }

      if (rcc_config.clk_outputs.mco2.used == true) {
        if (available_oscillators.includes(rcc_config.clk_outputs.mco2.src)){
          found_osc.push(rcc_config.clk_outputs.mco2.src);
        }
        if (psi_clock_outputs.includes(rcc_config.clk_outputs.mco2.src)){
          psi_is_used = true;
        }
      }

      if (rcc_config.clk_outputs.lsco.used == true) {
        if (available_oscillators.includes(rcc_config.clk_outputs.lsco.src)){
          found_osc.push(rcc_config.clk_outputs.lsco.src);
        }
        if (psi_clock_outputs.includes(rcc_config.clk_outputs.lsco.src)){
          psi_is_used = true;
        }
      }

      /* PPP analysis */
      for(const [key, value] of Object.entries(all_ppp_clock_configs)){
        if (available_oscillators.includes(key)){
          found_osc.push(key);
        }
        if (psi_clock_outputs.includes(key)){
          psi_is_used = true;
        }
      };

      /* PSI reference source analysis */
      if (psi_is_used == true){
	      if (available_oscillators.includes(rcc_config.psi_config.source_to_enable)){
	        found_osc.push(rcc_config.psi_config.source_to_enable);
        }
      }

      /* Remove duplicates */
      found_osc = [...new Set(found_osc)];

      /* Reorder */
      g_rcc_used_osc = [];
      available_oscillators.forEach(function (osc){
        if (found_osc.includes(osc)){
          g_rcc_used_osc.push(osc);
        }
      });

    }
    catch  (error) {
      console.error(`[ERROR] helper_rcc_get_used_osc: ${error}`);
    }
  }
  return g_rcc_used_osc;
}

/**
 * Retrieve the PSI clock outputs used
 * @param {array} used_oscillators, the list of used oscillators
 * @returns {array} The list of PSI clock outputs used
 */
function helper_rcc_get_psi_clock_outputs(used_oscillators) {
  let outputs = [];
  try {
    outputs = used_oscillators.filter(resource => psi_clock_outputs.includes(resource));

  } catch (error) {
    console.error(`[ERROR] helper_rcc_get_psi_clock_outputs: ${error}`);
  }
  return outputs;
}

/**
 * Remap the dfp clock source name to driver name
 * @param {string} clock_source, the dfp name of the clock
 * @returns {string} The remapped name
 */
function helper_rcc_remap_clock_source(clock_source, layer)
{
  if (map_clock_source.hasOwnProperty(clock_source)) {
    return map_clock_source[clock_source];
  }
  return clock_source;
}

/**
 * Remap the hw_resource dfp kernel clock name to driver kernel clock name
 * @param {string} hw_resource, the dfp name of the kernel clock
 * @returns {string} The remapped name
 */
function helper_rcc_remap_kernel_clock_source(hw_resource)
{
  if (map_kernel_clock.hasOwnProperty(hw_resource)) {
    hw_resource = map_kernel_clock[hw_resource];
  }
  return hw_resource;
}

/**
 * Remap the hw_resource name to driver resource name
 * @param {string} hw_resource, the hw resource name
 * @returns {string} The remapped name
 */
function helper_rcc_remap_hw_resource(hw_resource)
{
  if (map_hw_resource_name.hasOwnProperty(hw_resource)) {
    hw_resource = map_hw_resource_name[hw_resource];
  }
  return hw_resource;
}

/**
 * Remap the hw_resource name to driver kernel clock resource name
 * @param {string} hw_resource, the hw resource name
 * @returns {string} The remapped name
 */
function helper_rcc_remap_hw_resource_kernel(hw_resource)
{
  if (map_hw_kernel_resource_name.hasOwnProperty(hw_resource)) {
    hw_resource = map_hw_kernel_resource_name[hw_resource];
  }
  return hw_resource;
}

/**
 * Return the ppp name from hw resource name
 * @param {string} sw_resource, the sw resource name
 * @returns {string} The remapped name
 */
function helper_rcc_get_ppp_name(hw_resource)
{
  /* Remove numbers at the end of the hw_resource */
  let sw_resource = hw_resource.replace(/\d+$/, "");

  /* remap if necessary */
  if (map_sw_resource_name.hasOwnProperty(sw_resource)) {
    sw_resource = map_sw_resource_name[sw_resource];
  }
  return sw_resource;
}


/**
 * Retrieve the power voltage scaling
 * @param {{ configs: { pwr_voltage_scaling: string; }[]; }} rcc_ctx the rcc context
 * @returns {string} the power voltage scaling, temporary it does not exist, set to default to range 4
 */
function helper_rcc_get_power_voltage_scaling(rcc_ctx) {
  let pwr_scaling = '1';
  try {
    let pwr_ctx = helper_rcc_get_component_context('STMicroelectronics::Device:STM32CubeMX2 Config:PWR');
    if (pwr_ctx){
      pwr_scaling = pwr_ctx.additional.voltage_scaling;
    }
  } catch (error) {
    console.error(`[ERROR] helper_rcc_get_power_voltage_scaling: ${error}`);
  }
  return pwr_scaling;
}

/**
 * Check if a resource is a DAC and need DacSH generation
 * @param {string} resource, the name of the resource
 * @returns {boolean} True or False
 */
function helper_rcc_is_dacsh_needed(resource){
  if (dac_resources.includes(resource)){
    const dac_sh_val = g_rcc_api.EnvVarAPI.getVariableValue('DAC_CORE_USE_HAL_DAC_USE_DACSH');
      if (dac_sh_val !== undefined && dac_sh_val > 0) {
        return true;
      }
  }
  return false;
}

/**
 * Check if a resource also needs SBS activation
 * @param {string} resource, the name of the resource
 * @returns {boolean} True or False
 */
function helper_rcc_is_sbs_enable_required(resource){
  if (resource.includes('ADC')){
    const env_variable_name = resource+'_CORE_USE_SBS';
    const sbs_enable_val = g_rcc_api.EnvVarAPI.getVariableValue(env_variable_name);
    if (sbs_enable_val !== undefined && sbs_enable_val > 0) {
      return true;
    }
  }
  else if (resource.includes('ETH')){
    return true;
  }
  return false;
}

/**
 * Check if PTP generation is required for Ethernet1
 * @param {string} resource, the name of the resource
 * @returns {boolean} True or False
 */
function helper_rcc_is_eth1ptp_needed(){
  const eth1_ptp_val = g_rcc_api.EnvVarAPI.getVariableValue('ETH1_CORE_USE_PTP');
  if (eth1_ptp_val !== undefined && eth1_ptp_val > 0) {
    return true;
  }
  return false;
}

/**
 * Check if Cortex clock source configuration is needed
 * @param  None
 * @returns {boolean} True or False
 */
function helper_rcc_is_cortex_clock_source_needed(){
  const cortex_external_val = g_rcc_api.EnvVarAPI.getVariableValue('HAL_CORTEX_SYSTICK_SOURCE_EXTERNAL');
  if (cortex_external_val !== undefined && cortex_external_val > 0) {
    return true;
  }
  return false;
}

/**
 * Retrieve the dac sample and hold clock source
 * @param  None
 * @returns {string} The dac sample/hold clock name
 */
function helper_rcc_get_dac_sh_clock(){
  let dac_sh_clock_src = ''
  try {
    dac_sh_clock_src = g_rcc_api.clockAPI.getClockInformationById('DAC1SH_Clock_Source').value;
  } catch (error) {
    console.error(`[ERROR] helper_rcc_get_dac_sh_clock: ${error}`);
  }
  return dac_sh_clock_src;
}

/**
 * Retrieve the ethernet1 ptp clock source
 * @param  None
 * @returns {string} The ethernet1 ptp clock name
 */
function helper_rcc_get_eth1_ptp_clock(){
  let eth1_ptp_clock_src = ''
  try {
    eth1_ptp_clock_src = g_rcc_api.clockAPI.getClockInformationById('ETH1_PTP_Clock_Source').value;
    eth1_ptp_clock_src = helper_rcc_remap_clock_source(eth1_ptp_clock_src);
  } catch (error) {
    console.error(`[ERROR] helper_rcc_get_eth1_ptp_clock: ${error}`);
  }
  return eth1_ptp_clock_src;
}

/**
 * Retrieve the ethernet1 ref clock source
 * @param  None
 * @returns {string} The ethernet1 ref clock name
 */
function helper_rcc_get_eth1_ref_clock(){
  let eth1_ref_clock_src = 'RMII';
  try {
    eth1_ref_clock_src = g_rcc_api.clockAPI.getClockInformationById('ETH1_REF_Clock_Source').value;
  } catch (error) {
    console.error(`[ERROR] helper_rcc_get_eth1_ref_clock: ${error}`);
  }
  return eth1_ref_clock_src;
}

/**
 * Return True if the resource has an enable. Otherwise, return False;
 * @param {string} hw_resource, the name of the resource
 * @returns {boolean} True or False
 */
function helper_rcc_has_enable(hw_resource) {
  return !(resource_wo_enable.includes(hw_resource));
}

/**
 * Return True if the resource has a reset. Otherwise, return False;
 * @param {string} hw_resource, the name of the resource
 * @returns {boolean} True or False
 */
function helper_rcc_has_reset(hw_resource) {
  return !(resource_wo_reset.includes(hw_resource));
}

/**
 * Return True if the resource has a kernel clock mux. Otherwise, return False;
 * @param {string} resource, the name of the resource
 * @returns {boolean} True or False
 */
function helper_rcc_has_kernel_clock_mux(resource){
  return !(resource_wo_kernel_enable.includes(resource));
}

/**
 * This function parses the list of resources sharing the same enable bit.
 * It return False if:
 *    - the current resource is in the list AND
 *    - if at least 2 resource of this list are bindable
 * Otherwise, it returns True
 * @param {string} resource, the name of the resource
 * @returns {boolean} True or False
 */
function helper_rcc_is_not_shared_ppp(resource){
  let ret = true;
  resource_sharing_enable_bit.forEach((group) => {
    if (group.includes(resource)) {
      let shared_ppp_nr = 0;
      group.forEach((item) => {
      try {
        /* getHardwareIpDescription throws an error if the item is not available in dataset */
        /* meaning if the item is not bindable / included into the selected package */
        g_rcc_api.peripheralsResourceManagerAPI.getHardwareIpDescription(item);
        shared_ppp_nr++;
      } catch (error) {}
      });
      if (shared_ppp_nr > 1) {
        ret = false;
      }
    }
  });
  return ret;
}

/**
 * Check if CCIPR3 register is needed based on the presence of certain resources
 * @param  None
 * @returns {boolean} True or False
 */
function helper_rcc_is_ccipr3_needed(){
  let ret = false;
  ccipr3_resources.forEach((resource) => {
    try {
      /* getHardwareIpDescription throws an error if the item is not available in dataset */
      g_rcc_api.peripheralsResourceManagerAPI.getHardwareIpDescription(resource);
      ret = true;
    } catch (error) {}
  });
  return ret;
}


/**
 * Return False if the resource has no instances. Otherwise, return True;
 * @param {string} hw_resource, the name of the resource
 * @returns {boolean} True or False
 */
function helper_rcc_is_instantiable_periph(hw_resource){
  return !not_instantiable_peripheral_resources.includes(hw_resource);
}

/**
 * Set the resource 'resource_name' enable state to True
 * @param {string} path_name, the name of the resource (clock, pll, config)
 * @returns None
 */
function helper_rcc_set_resource_enabled(resource_name){
  g_rcc_resource_state[resource_name] = true;
}

/**
 * Get the 'resource_name' enable status
 * @param {string} resource_name, the name of the resource
 * @returns {boolean} True or False
 */
function helper_rcc_is_resource_enabled(resource_name){
  let resource_enable = false;
  if (g_rcc_resource_state.hasOwnProperty(resource_name))
  {
    resource_enable = g_rcc_resource_state[resource_name];
  }
  return resource_enable;
}

/**
 * Check if the SW configuration is "central"
 * @param {object} config, The RCC config
 * @returns {boolean} True or False
 */
function helper_rcc_is_central(config){
  try {
    return (config.basic.periph_clocks_init == rcc_config_codes.CENTRAL);
  } catch (error) {
    console.error(`helper_rcc_is_central: ${error}`);
  }
  return false;
}

/**
 * Check if the SW configuration is "controlled by peripheral"
 * @param {object} config, The RCC config
 * @returns {boolean} True or False
 */
function helper_rcc_is_controlled_by_periph(config){
  try {
    return (config.basic.periph_clocks_init == rcc_config_codes.CONTROLLED_BY_PERIPHERALS);
  } catch (error) {
    console.error(`helper_rcc_is_controlled_by_periph: ${error}`);
  }
  return false;
}

/**
 * Check if the SW configuration is "controlled by user"
 * @param {object} config, The RCC config
 * @returns {boolean} True or False
 */
function helper_rcc_is_controlled_by_user(config){
  try {
    return (config.basic.periph_clocks_init == rcc_config_codes.CONTROLLED_BY_USER);
  } catch (error) {
    console.error(`helper_rcc_is_controlled_by_user: ${error}`);
  }
  return false;
}

/**
 * Return the systick divider value
 * @param {object} system_config
 * @param {boolean} external systick source is external or not
 * @returns {number} systick divider value in power of 2 plus 3 (extra divided by 8 for systick)
 */
function helper_rcc_get_systick_divider(system_config, external){
  let systick_divider = 3;
  try {
    if (system_config?.prescaler.ahb){
      /* convert divider value to power of 2*/
      systick_divider = Math.log2(system_config.prescaler.ahb);
      if (external == true) {
      systick_divider = systick_divider + 3; /* Extra divided by 8 for systick */
      }
    }
  } catch (error) {
    console.error(`helper_rcc_get_systick_divider: ${error}`);
  }

  return systick_divider;
}

/**
  * Retrieve all the interruptions set by RCC but not generated
  * @param {object} nvic_api Getter on NVIC api
  * @param {object} exti_api Getter on EXTI api (not used)
  * @param {object} resource Current resource
  * @param {object} config current configuration of the RCC
  * @returns {object}
 */
function helper_rcc_get_irq_handler(nvic_api, exti_api, resource, config) {
  let result = [];
  try {
    const upperResource = typeof resource === 'string' ? resource.toUpperCase() : resource;
    const globalLabels = config?.info?.labels || [];

    // Helper to push aliases for a given NVIC config and label set
    function pushAliases(nvic_cfg, labels, emptyUsesGlobal) {
      if (!nvic_cfg) return;
      if (labels && labels.length) {
        let first = true;
        for (const lbl of labels) {
          result.push({
            resource: upperResource,
            exti_name: nvic_cfg.name,
            labels: labels,
            first_label: first,
            alias: lbl.toUpperCase(),
            nvic_config: nvic_cfg,
            generated: false
          });
          first = false;
        }
      } else if (emptyUsesGlobal) {
        // No local labels but want to fall back to global
        pushAliases(nvic_cfg, globalLabels, false);
      } else {
        result.push({
          resource: upperResource,
          exti_name: nvic_cfg.name,
          alias: '',
          nvic_config: nvic_cfg,
          generated: false
        });
      }
    }

    // HSE or LSE CSS (NVIC / NMI)
    if ((config?.basic?.hse?.enable_css === true || config?.basic?.lse?.enable_css === true) && config?.system?.nvic?.irq_handler_generation !== true) {
      const need = config?.system?.nvic?.css_interruption?.needs?.[0];
      if (need) {
        let nvicConfig;
        try { nvicConfig = nvic_api.getNeedById(need.id); } catch (e) { console.error(`[RCC][IRQ][HSE-LSE] getNeedById: ${e}`); }
        nvicConfig.name = 'RCC_' + nvicConfig.name; /* IRQ handler is RCC_NMI_xxx and not only NMI_xxx */
        pushAliases(nvicConfig, globalLabels, false);
      }
    }

    // LSE CSS (EXTI)
    if (config?.basic?.lse?.enable_css === true) {
      const lseExtiNeed = config?.system?.exti?.lse_css_interruption?.needs?.[0];
      if (lseExtiNeed) {
        let extiConfig;
        try { extiConfig = exti_api.getNeedById(lseExtiNeed.id); } catch (e) { console.error(`[RCC][IRQ][LSE] getNeedById: ${e}`); }
        if (extiConfig) {
          const intr = extiConfig?.configuration?.basic?.interruption;
          const enableIntr = intr?.enable_interruption ?? true;
          const autoGen = intr?.irq_handler_generation === true;
          if (enableIntr && !autoGen) {
            let nvicConfigLse;
            const lseNvicNeed = intr?.nvic?.needs?.[0];
            if (lseNvicNeed) {
              try { nvicConfigLse = nvic_api.getNeedById(lseNvicNeed.id); } catch (e) { console.error(`[RCC][IRQ][LSE] getNeedById NVIC: ${e}`); }
            }
            const lseLabels = extiConfig?.configuration?.labels || [];
            // If no EXTI-specific labels, fallback to global ones
            pushAliases(nvicConfigLse, lseLabels, true);
          }
        }
      }
    }
  } catch (e) {
    console.error(`helper_rcc_get_irq_handler: ${e}`);
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
function helper_rcc_get_clk_enable_mode(hw_resource) {
  let result = 0;
  console.info(`helper_rcc_get_clk_enable_mode: hw_resource=${hw_resource}`);
  try {

    const core_configuration = helper_rcc_get_core_context();

    /* Get component key */
    /* Component is the hw_resource without terminating index except for PPP including several functions (e.g: USART1 can be UART) */
    let component = hw_resource.replace(/\d+$/, '');  /* Remove numbers at the end of string */
    const sw_instances = g_rcc_api.peripheralsResourceManagerAPI.getSoftwareInstancesBoundToPeripheral(hw_resource);
    const component_config = g_rcc_api.SWConfigurationAPI.getSwInstanceConfiguration(sw_instances[0]);
    if (component_config.info?.function_type) {
      component = component_config.info.function_type;
    }
    if (hw_resource.includes('DMA')) {
      component = 'DMA';
    }
    if (hw_resource.includes('GPIO')) {
      component = 'GPIO';
    }
    const component_key = component.toLowerCase() + "_feature";

    if (Object.hasOwnProperty.call(core_configuration, component_key)) {
      current_config = core_configuration[component_key];
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
    console.error(`[ERROR] helper_rcc_get_clk_enable_mode: ${e}`);
  }

  return result;
}

/**
 * Check if the startup time is available in the configuration
 * @param {object} board
 * @returns {boolean} True or False
 */
function helper_rcc_is_startup_time_available(board){
  let is_available = false;
  console.info(`helper_rcc_is_startup_time_available. Board is: ${JSON.stringify(board)}`);
  if (board == null)
  {
    is_available = false;
  }
  else
  {
    is_available = true;
  }
  return is_available;
}

/**
 * Get the startup time
 * @param {object} board
 * @param {string} clock
 * @returns {Number} The start-up time
 */
function helper_rcc_get_startup_time(board, clock){
  let startup_time = 100;
  if (board != null)
  {
    /* Need to get startup time from board information */
    if (clock == 'hse')
    {
      startup_time = 100;
      console.warn(`helper_rcc_get_startup_time. HSE startup time not found in dataset`);
    }
    else if (clock == 'lse')
    {
      startup_time = 5000;
      console.warn(`helper_rcc_get_startup_time. LSE startup time not found in dataset`);
    }
    else
    {
      startup_time = 100;
    }
  }
  return startup_time;
}

/**
 * Check if the flash latency is possible for a given frequency
 * @param {object} latency_max_frequency An object containing the maximum frequencies in MHz for each latency value.
 * @param {number} system_clock_frequency The system clock frequency in hertz.
 * @param {number} latency The flash latency in wait states.
 * @returns {boolean} True if the flash latency is possible, false otherwise.
 */
function helper_rcc_is_flash_latency_possible(latency_max_frequency, system_clock_frequency, latency)
{
  let ret = false;

  if (latency < Object.keys(latency_max_frequency).length)
  {
    if (latency in latency_max_frequency)
    {
      if (system_clock_frequency <= (latency_max_frequency[latency] * 1000000))
      {
        ret = true;
      }
    }
    else
    {
      ret = true;
    }
  }
  /* console.warn(`helper_rcc_is_flash_latency_possible (${system_clock_frequency}, ${latency}) is ${ret}`); */
  return ret;
}

/**
 * Get the optimal flash latency for a given frequency
 * @param {object} latency_max_frequency An object containing the maximum frequencies in MHz for each latency value.
 * @param {number} system_clock_frequency
 * @returns {number} latency
 */
function helper_rcc_get_optimal_latency(latency_max_frequency, system_clock_frequency) {
  let latency = Object.keys(latency_max_frequency).length-1;
  /* console.warn(`helper_rcc_get_optimal_latency (${system_clock_frequency})`); */

  for(const [lat, frequency] of Object.entries(latency_max_frequency)) {
    if (system_clock_frequency <= (frequency*1000000)){
      latency = lat;
      break;}
  }
  /* console.warn(`helper_rcc_get_optimal_latency (${latency})`); */
  return Number(latency);
}

/**
 * Get the maximum frequency for a given flash latency and voltage scaling
 * @param {object} latency_max_frequency An object containing the maximum frequencies in MHz for each latency value.
 * @param {number} latency The flash latency in wait states.
 * @returns {string} The maximum frequency in MHz in a readable format (e.g: "168") or "N.A." if not available.
 */
function helper_rcc_get_latency_max_freq(latency_max_frequency, latency){
  let max_freq_str = "N.A.";

  /*console.warn(`helper_rcc_get_latency_max_freq (${latency})`); */
  if (latency in latency_max_frequency)
  {
    let max_freq = latency_max_frequency[latency];
    max_freq_str = max_freq.toFixed(3).replace(/\.?0+$/, '');
  }
  return max_freq_str;
}

/**
 * Check if the flash programming delay is possible for a given frequency
 * @param {object} programming_delay_max_frequency An object containing the maximum frequencies in MHz for each programming delay value.
 * @param {number} system_clock_frequency system frequency in hertz
 * @param {number} programming_delay to be checked
 * @returns
 */
function helper_rcc_is_flash_programming_delay_possible(programming_delay_max_frequency, system_clock_frequency, programming_delay)
{
  let ret = false;
  if (programming_delay < (Object.keys(programming_delay_max_frequency).length))
  {
    if (programming_delay in programming_delay_max_frequency)
    {
      if (system_clock_frequency <= (programming_delay_max_frequency[programming_delay] * 1000000))
      {
        ret = true;
      }
    }
    else
    {
      ret = true;
    }
  }
  return ret;
}

/**
 * Check if the flash programming delay is available
 * @param {object} programming_delay_max_frequency An object containing the maximum frequencies in MHz for each programming delay value.
 * @param {number} programming_delay to be checked
 * @returns
 */
function helper_rcc_is_flash_programming_delay_available(programming_delay_max_frequency, programming_delay)
{
  let ret = false;
  if (programming_delay in programming_delay_max_frequency)
  {
    ret = true;
  }
  return ret;
}

/**
 * Get the optimal flash programming delay for a given frequency
 * @param {object} programming_delay_max_frequency An object containing the maximum frequencies in MHz for each programming delay value.
 * @param {number} system_clock_frequency
 * @returns {number} adjusted programming delay
 */
function helper_rcc_get_optimal_programming_delay(programming_delay_max_frequency, system_clock_frequency) {
  let programming_delay = Object.keys(programming_delay_max_frequency).length - 1;

  for(const [delay, frequency] of Object.entries(programming_delay_max_frequency)) {
    if (system_clock_frequency <= (frequency * 1000000)){
      programming_delay = delay;
      break;}
  }
  return Number(programming_delay);
}

/**
 * Get the maximum frequency for a given flash programming delay and voltage scaling
 * @param {object} programming_delay_max_frequency An object containing the maximum frequencies in MHz for each programming delay value.
 * @param {number} programming_delay The flash programming delay in wait states.
 * @returns {string} The maximum frequency in MHz in a readable format (e.g: "168") or "N.A." if not available.
 */
function helper_rcc_get_programming_delay_max_freq(programming_delay_max_frequency, programming_delay){
  let max_freq_str = "N.A.";

  /*console.warn(`helper_rcc_get_programming_delay_max_freq (${programming_delay})`);*/
  if (programming_delay in programming_delay_max_frequency)
  {
    let max_freq = programming_delay_max_frequency[programming_delay];
    max_freq_str = max_freq.toFixed(3).replace(/\.?0+$/, '');
  }
  return max_freq_str;
}

/**
 * Get the bus group for a given peripheral instance and context.
 * @param {string} peripheralInstance The name of the peripheral instance.
 * @returns {string|null} The bus group and bus mapping, or null if not found.
 */
function helper_rcc_get_bus_group(peripheralInstance) {
  return peripheralBusMapping[peripheralInstance] || null;
}

/**
 * Get the bus clock name for a given peripheral instance.
 * @param {string} peripheralInstance The name of the peripheral instance.
 * @returns {string} The bus clock name (e.g.: "PCLK1_Input_Clock") (empty if not found).
 */
function helper_rcc_get_bus_clock_name(peripheralInstance) {
  const group = peripheralBusMapping[peripheralInstance];
  const clock = group ? groupClockMapping[group] : null;
  return clock ? `${clock}_Clock` : "";
}

/**
 * Convert the frequency to a readable string
 * @param {number} frequency Frequency in hertz
 * @returns {string} Readable frequency string
 */
function helper_rcc_display_frequency(frequency)
{
  try {
    let value, unit;

    if (frequency >= 1e6) {
      value = frequency / 1e6;
      unit = ' MHz';
    } else if (frequency >= 1e3) {
      value = frequency / 1e3;
      unit = ' kHz';
    } else {
      value = frequency;
      unit = ' Hz';
    }

    /* Limit to 3 floating point digits and suppress useless zeros. */
    let strValue = value.toFixed(3).replace(/\.?0+$/, '');

    return strValue + unit;
  } catch (error) {
    console.error(`[ERROR] helper_rcc_display_frequency: ${error}`);
    return frequency + ' Hz';
  }
}

/**
 * Display some values
 * @returns True or False
 * @param {any[]} arg
 */
function helper_rcc_display_values(...arg){
    for (var i = 0; i < arg.length; i++)
    {
      const value = typeof arg[i] === "object" && arg[i] !== null
      ? JSON.stringify(arg[i], null, 2)
      : String(arg[i]);
      console.info(`helper_rcc_display_values. Variable #${i} is ${value}`);
    }
    return 222;
}

/**
 * Break the javascript execution
 * @note This function is for Debug purpose only - Can be called into the template to watch assigned variables.
You need to toggle a breakpoint for the code to break.
 * @param {Number} code A code to indicate where the function has been called (can be the line number)
 * @param {any} root
 */
function helper_breakpoint(code, root){
  let ret = code;
}

/**
 * Check if an item is included into an array
 * @param {array} array The array to check into
 * @param {any} item The item to check
 * @returns {boolean} True or False
 */
function includes(array, item){
  let ret = array.includes(item);
  return ret;
}

/**
 * Return the maximum between a and b
 * @param {number} a First number
 * @param {number} b Second number
 * @returns {number} The maximum value
 */
function max(a, b){
  return Math.max(a,b);
}

/* Module Exports */
module.exports = {
  helper_rcc_init_codegen,
  helper_rcc_detect_feature_group,
  helper_rcc_get_component_context,
  helper_rcc_get_rcc_context,
  helper_rcc_is_feature_enabled,
  helper_rcc_get_available_buses,
  helper_rcc_get_system_config,
  helper_rcc_get_all_resources,
  helper_rcc_get_all_perifs_clock_config,
  helper_rcc_get_one_perif_clock_config,
  helper_rcc_get_clock_source_object,
  helper_rcc_get_used_osc,
  helper_rcc_get_psi_clock_outputs,
  helper_rcc_remap_clock_source,
  helper_rcc_remap_kernel_clock_source,
  helper_rcc_remap_hw_resource,
  helper_rcc_remap_hw_resource_kernel,
  helper_rcc_get_ppp_name,
  helper_rcc_get_power_voltage_scaling,
  helper_rcc_is_dacsh_needed,
  helper_rcc_is_sbs_enable_required,
  helper_rcc_is_eth1ptp_needed,
  helper_rcc_is_cortex_clock_source_needed,
  helper_rcc_get_dac_sh_clock,
  helper_rcc_get_eth1_ptp_clock,
  helper_rcc_get_eth1_ref_clock,
  helper_rcc_has_enable,
  helper_rcc_has_reset,
  helper_rcc_has_kernel_clock_mux,
  helper_rcc_is_not_shared_ppp,
  helper_rcc_is_ccipr3_needed,
  helper_rcc_is_instantiable_periph,
  helper_rcc_set_resource_enabled,
  helper_rcc_is_resource_enabled,
  helper_rcc_is_central,
  helper_rcc_is_controlled_by_periph,
  helper_rcc_is_controlled_by_user,
  helper_rcc_get_systick_divider,
  helper_rcc_get_irq_handler,
  helper_rcc_get_clk_enable_mode,
  helper_rcc_is_startup_time_available,
  helper_rcc_get_startup_time,
  helper_rcc_is_flash_latency_possible,
  helper_rcc_get_optimal_latency,
  helper_rcc_get_latency_max_freq,
  helper_rcc_is_flash_programming_delay_possible,
  helper_rcc_is_flash_programming_delay_available,
  helper_rcc_get_optimal_programming_delay,
  helper_rcc_get_programming_delay_max_freq,
  helper_rcc_get_bus_group,
  helper_rcc_get_bus_clock_name,
  helper_rcc_display_frequency,
  helper_rcc_display_values,
  helper_breakpoint,
  max,
  includes
};
