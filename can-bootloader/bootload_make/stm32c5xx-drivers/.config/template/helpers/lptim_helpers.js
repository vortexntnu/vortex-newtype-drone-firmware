
/**
 * @file Helpers functions used for TIM SW component
 * @license
 * Copyright (c) 2024 STMicroelectronics.
 * All rights reserved.
 *
 * This software is licensed under terms that can be found in the LICENSE file
 * in the root directory of this software component.
 * If no LICENSE file comes with this software, it is provided AS-IS.
 */
/**
 * Check if at least one DMA channel has been enabled
 * @param {object} dma system.DMA_Settings object
 * @returns true or false
 */
function helper_lptim_check_if_at_least_one_dma_channel(dma) {
  let result = false;
  try {
    console.info(`helper_lptim_check_if_at_least_one_dma_channel: dma=${JSON.stringify(
        dma)}`
    );
    if (dma === undefined) {
      return false;
    }
    if (
      dma.EnableDMA_CC1 !== undefined &&
      dma.EnableDMA_CC1
    ) {
      result = true;
      console.info(`   DMA Channel1 found`);
      return result;
    }
    if (
      dma.EnableDMA_CC2 !== undefined &&
      dma.EnableDMA_CC2
    ) {
      result = true;
      console.info(`   DMA Channel2 found`);
      return result;
    }
    if (dma.EnableDMA_UP !== undefined && dma.EnableDMA_UP) {
      result = true;
      console.info(`   DMA update found`);
      return result;
    }
    if (
      dma.EnableDMA_UE !== undefined &&
      dma.EnableDMA_UE
    ) {
      result = true;
      console.info(`   DMA update event found`);
      return result;
    }
  } catch (e) {
    console.error(`helper_lptim_check_if_at_least_one_dma_channel: ${e}`);
    return result;
  }
}
/**
 * Check if channel_id has been configured (output or input)
 * @param {object} channels list of configured channels
 * @param {integer} channel_id id of the channel
 * @returns true or false
 */
function helper_lptim_find_channel_config(channels, channel_id) {
  let result = false;
  try {
    console.info(`helper_lptim_find_channel_config: channels=${JSON.stringify(
        channels)}, channel_id=${channel_id}`
    );
    if (channels === undefined) {
      return false;
    }
    for (var i = 0; i < channels.length; i++) {
      if (
        channels[i].use_channel !== undefined &&
        channels[i].use_channel &&
        channels[i].channel_direction === "Input" &&
        channels[i]._foreignKey === channel_id.toString()
      ) {
        result = true;
        console.info(
          `   Channel configuration found on ${channels[i]._foreignKey}`
        );
        break;
      }
    }
  } catch (e) {
    console.error(`helper_lptim_find_channel_config: ${e}`);
  }
  return result;
}
/**
 * Calculate the timer output frequency based on prescaler and period values
 * @note  This api is used directly in the tim_parameters.json in advanced view
 * @param {integer} input_clock_frequency System clock frequency in Hz
 * @param {integer} prescaler Prescaler set by the user
 * @param {integer} period Period set by the user
 * @returns {integer} Timer output frequency in Hz
 */
function helper_lptim_compute_frequency(
  input_clock_frequency,
  prescaler,
  period
) {
  let result = 10000; /* default value to 10KHz */
  try {
    console.info(`helper_lptim_compute_frequency: input_clock_frequency=${input_clock_frequency}, prescaler=${prescaler}, period=${period}`);
    /* get value prescaler */
    var prescaler_id = parseInt(prescaler, 10);
    /* Calculate the actual timer frequency */
    var lptimer_frequency = input_clock_frequency / prescaler_id;
    /* Calculate the actual output frequency */
    var output_frequency = lptimer_frequency / (period + 1);
    /* Return the output frequency */
    if (output_frequency < 1) {
      result = Math.round(output_frequency * 100) / 100;
    } else {
      result = Math.floor(output_frequency);
    }
  } catch (e) {
    console.error(`helper_lptim_compute_frequency: ${e}`);
  }
  return result;
}

/**
 * Calculate the prescaler
 * @note  This api is used directly in the tim_parameters.json in basic view
 * @param {integer} input_clock_frequency System clock frequency in Hz
 * @param {integer} output_frequency output frequency in Hz
 * @returns Prescaler values
 */
function helper_lptim_compute_prescaler(input_clock_frequency, output_frequency) {
  let result = 123456789;
  try {
    console.info(`helper_lptim_compute_prescaler: input_clock_frequency=${input_clock_frequency}, output_frequency=${output_frequency}`);
    if (output_frequency != 0) {
      /* Calculate the prescaler value */
      var prescaler = input_clock_frequency / output_frequency - 1;
      /* Return the prescale value */
      result = Math.floor(prescaler);
    }
  } catch (e) {
    console.error(`helper_lptim_compute_prescaler: ${e}`);
  }
  return result;
}
/**
 * Calculate the period
 * @note  This api is used directly in the tim_parameters.json in basic view
 * @param {integer} input_clock_frequency System clock frequency in Hz
 * @param {integer} output_frequency output frequency in Hz
 * @returns Period values
 */
function helper_lptim_compute_period(input_clock_frequency, output_frequency) {
  let result = 123456789;
  try {
    console.info(`helper_lptim_compute_period: input_clock_frequency=${input_clock_frequency}, output_frequency=${output_frequency}`);
    /* Calculate the actual output frequency */
    var period = output_frequency - 1;
    /* Return the period value */
    return Math.floor(period);
  } catch (e) {
    console.error(`helper_lptim_compute_period: ${e}`);
  }
  return result;
}
/**
 * Calculate the sampling clock value.
 * @note  This api is used directly in the tim_parameters.json in basic view
 * @param {integer} input_clock_frequency System clock frequency in Hz
 * @param {integer} clock_divider Clock divider value (CKD)
 * @param {string} sampling_ck_div Sampling clock divider name
 * @returns fSAMPLING (Hz)
 */
function helper_lptim_compute_sampling_clock(input_clock_frequency, clock_divider, sampling_ck_div) {
  let result = input_clock_frequency;
  const regex = /FDIV(\d+)_?/;
  const samp_ck_div = sampling_ck_div.match(regex);
  try {
    console.info(`helper_lptim_compute_sampling_clock: input_clock_frequency=${input_clock_frequency}, clock_divider=${clock_divider},
      sampling_ck_div=${sampling_ck_div}, samp_ck_div=${samp_ck_div}`);
    if (samp_ck_div === 1) {
      /* DIV1: fSAMPLING = ftim_ker_ck */
      /* result = input_clock_frequency; */
    }
    else {
      /* DIVx: fSAMPLING = fDTS / x ; with fDTS = ftim_ker_ck / CKD */
      result = input_clock_frequency / clock_divider / samp_ck_div;
    }
    result = Math.floor(result);
  } catch (e) {
    console.error(`helper_lptim_compute_sampling_clock: ${e}`);
  }
  return result;
}
/**
 * Check if the channel_id needs to configure a GPIO
 * @param {object} channel element of the channels list
 * @param {integer} channel_id id of the channel
 * @returns true or false
 */
function lptim_need_gpio(channel, channel_id) {
  let result = false;
  console.info(`helper_need_gpio: channel=${JSON.stringify(
      channel)}, channel_id=${channel_id}`
  );
  try {
    if (channel === undefined || channel_id === undefined) {
      return false;
    }
    if (
      channel !== undefined &&
      channel.use_channel !== undefined &&
      channel.use_channel
    ) {
      /* in input mode, GPIO must be configured only if the input capture source is set to ic1_mux1 */
      if (
        channel.channel_direction === "Input" &&
        channel.ic_source !== undefined &&
        channel.ic_source.source === "AFI")
      {
        result = true;
        console.info(`lptim_need_gpio Input Channel ${channel_id} configured to GPIO`);
      }
    }
  } catch (e) {
    console.error(`lptim_need_gpio: ${e}`);
  }
  return result;
}
/**
 * Check if the channel_id needs to configure a GPIO
 * @param {object} channels list of configured channels
 * @param {integer} channel_id id of the channel
 * @returns true or false
 */
function helper_lptim_need_gpio_channel(channels, channel_id) {
  let result = false;
  try {
    console.info(`helper_lptim_need_gpio_channel: channels=${JSON.stringify(
        channels)}, channel_id=${channel_id}`
    );
    if (channels === undefined || channel_id === undefined) {
      return false;
    }
    const channel_id_str = channel_id.toString();
    let config_ch = channels.find(function (channel) {
      return channel["_foreignKey"] === channel_id_str;
    });
    if (config_ch.use_channel == true &&
       ((config_ch.channel_direction === 'Output' ) && 
        (config_ch.output_configuration.use_gpio == true)) ||
       (config_ch.channel_direction === 'Input' &&
       (config_ch.input_configuration.ic_source.source === 'AFI' || 
        config_ch.input_configuration.ic_source.source === 'GPIO'))) {
        result = true;
        console.info(`helper_lptim_need_gpio_channel: Use Channel and GPIO is true`);
    }
  } catch (e) {
    console.error(`helper_lptim_need_gpio_channel: ${e}`);
  }
  return result;
}
/**
 * Check if the input_id needs to configure a GPIO
 * @param {object} data list of input config
 * @returns true or false
 */
function helper_lptim_need_gpio_input(data) {
  let result = false;
  try {
    console.info(`helper_lptim_need_gpio_input: data=${JSON.stringify(
        data)}`
    );
    if (data === undefined) {
      return false;
    }
    if (data.source === 'AFI' || data.source === 'GPIO')
    {
      result = true;
      console.info(`helper_lptim_need_gpio_input: Use ${data.ip_signal} and GPIO is active`);
    }
  } catch (e) {
    console.error(`helper_lptim_need_gpio_input: ${e}`);
  }
  return result;
}
/**
 * Return id channel from his channel name. CH2 return 2.
 * @param {string} source Channel's name
 * @returns Channel's number
 */
function helper_lptim_get_channel_id(source)
{
  var id = 0;
  if (source === undefined)
  {
    console.warn(`[ERROR] helper_lptim_get_channel_id: source undefined`);
    return 0;
  }
  try {
    var pattern = /\d+/g;
    id = source.match(pattern);
  }
  catch {
    console.error(`[ERROR] helper_lptim_get_channel_id: source undefined`);
  }
    return id;
}
/**
 * Converts an LPTIM input source name to its standardized form for a specified layer ("HAL" or "LL") using a predefined mapping.
 * @note  Returns the mapped value or the original if not found.
 * @param {string} source input source selection (ex 'AFI')
 * @param {string} layer HAL
 * @returns {string} HAL Input ID (GPIO)
 */
function helper_lptim_convert_input_src(source, layer = "HAL") {
  try {
    console.info(`helper_lptim_convert_input_src: source=${source}, layer=${layer}`);
    // Define the layered map
    let source_upper = source.toUpperCase();
    const map_input = {
      HAL: {
        "AFI": "GPIO",
        "RCC_MCO1": "MCO1",
        "LPDMA1_CH1_TCF": "LPDMA_CH1_TC",
        "LPDMA1_CH1_TC": "LPDMA_CH1_TC",
        "GPDMA_CH1_TCF": "GPDMA_CH1_TC",
        "HSI/256": "HSI_256",
        "HSI/1024": "HSI_1024",
        "MSI/1024": "MSI_1024",
        "MSI/4": "MSI_4",
        "MCG_SYS_CK/4096": "MCG256_1024",
        "MCG_AUDIO_CK /64": "MCG3072_128",
        "I3C2_IBIACKTI": "I3C2_IBIACK",
        "I3C1_IBIACKTI": "I3C1_IBIACK",
        "LPTIM2_OC1": "LPTIM2_CH1",
        "LPTIM3_OC1": "LPTIM3_CH1",
        "SAI1_FS_A_IN": "SAI1_FS_A",
        "SAI2_FS_A_IN": "SAI2_FS_A",
        "SAI1_FS_B_IN": "SAI1_FS_B",
        "SAI2_FS_B_IN": "SAI2_FS_B",
      },
      LL: {
        "AFI": "GPIO",
        "RCC_MCO1": "MCO1",
        "LPDMA1_CH1_TCF": "LPDMA_CH1_TC",
        "LPDMA1_CH1_TC": "LPDMA_CH1_TC",
        "GPDMA_CH1_TCF": "GPDMA_CH1_TC",
        "HSI/256": "HSI_256",
        "HSI/1024": "HSI_1024",
        "MSI/1024": "MSI_1024",
        "MSI/4": "MSI_4",
        "MCG_SYS_CK/4096": "MCG256_1024",
        "MCG_AUDIO_CK /64": "MCG3072_128",
        "I3C2_IBIACKTI": "I3C2_IBIACK",
        "I3C1_IBIACKTI": "I3C1_IBIACK",
        "LPTIM2_OC1": "LPTIM2_CH1",
        "LPTIM3_OC1": "LPTIM3_CH1",
        "SAI1_FS_A_IN": "SAI1_FS_A",
        "SAI2_FS_A_IN": "SAI2_FS_A",
        "SAI1_FS_B_IN": "SAI1_FS_B",
        "SAI2_FS_B_IN": "SAI2_FS_B",
      }
    };
    // Select the correct map for the layer
    const selected_map = map_input[layer] || map_input["HAL"];
    // Keep your original logic
    let source_map = source_upper;
    if (selected_map.hasOwnProperty(source_upper)) {
      source_map = selected_map[source_upper];
    }
    return source_map;
  } catch (e) {
    console.error(`helper_lptim_convert_input_src: ${e}`);
    return "";
  }
}

/**
  * Retrieve all the interruptions set by LPTIM but not generated
  * @param {object} nvic_api Getter on NVIC api
  * @param {object} dma_api Getter on DMA api (not used)
  * @param {object} gpio_api Getter on GPIO api (not used)
  * @param {object} exti_api Getter on EXTI api
  * @param {object} resource Current resource
  * @param {object} config current configuration of the LPTIM
  * @returns {object}
 */
function helper_lptim_get_irq_handler(nvic_api, exti_api, resource, config) {
  let result = [];
  try {
    console.info(`helper_lptim_get_irq_handler: resource= ${resource}, config=${JSON.stringify(config)}`
    );

    /** Reference all the elements which enable the LPTIM interruptions
     * @type {Array} List of interruptions available for the LPTIM
     * @property {string} enable Name of the property which enables the interruption
     * @property {string} irq_handler_generation Name of the property which indicates if IRQ handler generation is done or not
     * @property {string} nvic_context Name of the property which contains the NVIC context
     * @property {string} selector Suffix to be added to the alias name (empty if global interrupt, starts with underscore with NVIC selector if not empty)
     */
    const list_interrupts = [
      { enable: "enable_interruption", irq_handler_generation: "irq_handler_generation", nvic_context: "nvic_config", selector: "" },
    ];

    /** Parse the list of interruptions */
    for (let index = 0; index < list_interrupts.length; index++) {
      const element = list_interrupts[index];
      /** Check if interruption has been enabled on the LPTIM */
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
    console.error(`helper_lptim_get_irq_handler: ${e}`);
  }
  return result;
}

module.exports = {
  helper_lptim_get_channel_id,
  helper_lptim_check_if_at_least_one_dma_channel,
  helper_lptim_find_channel_config,
  helper_lptim_need_gpio_channel,
  helper_lptim_need_gpio_input,
  helper_lptim_compute_frequency,
  helper_lptim_compute_prescaler,
  helper_lptim_compute_period,
  helper_lptim_compute_sampling_clock,
  helper_lptim_convert_input_src,
  helper_lptim_get_irq_handler
};
