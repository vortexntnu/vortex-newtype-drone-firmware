/**
 * @file Helpers functions used for TIM SW component
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
 * Check if the channel_id has been configured in input
 * @param {object} channels list of configured channels
 * @param {integer} channel_id id of the channel
 * @returns true or false
 */
function helper_tim_find_channel_config_in_input(channels, channel_id) {
  try {
    /*console.info(`helper_tim_find_channel_config_in_input: channels=${JSON.stringify(
        channels)}, channel_id=${channel_id}`
    );*/
    if (channels === undefined || channel_id === undefined) {
      return false;
    }
    return (
      channels.find(function (channel) {
        return (
          channel["_foreignKey"] === channel_id.toString() &&
          channel.channel_direction === "Input"
        );
      }) !== undefined
    );
  } catch (e) {
    console.error(`helper_tim_find_channel_config_in_input: ${e}`);
    return false;
  }
}

/**
 * Check if the channel_id has been configured in indirect mode
 * @param {object} channels list of configured channels
 * @param {integer} channel_id id of the channel
 * @returns true or false
 */
function helper_tim_channel_check_indirect(channels, channel_id) {
  try {
    /*console.info(`helper_tim_channel_check_indirect: channels=${JSON.stringify(
        channels)}, channel_id=${channel_id}`
    );*/
    if (channels === undefined || channel_id === undefined) {
      return false;
    }
    let channel_id_string = channel_id.toString();
    const map_indirect_channel = {
      CC1: "CC2",
      CC2: "CC1",
      CC3: "CC4",
      CC4: "CC3",
    };
    if (!map_indirect_channel.hasOwnProperty(channel_id_string)) {
      return false;
    }
    let indirect_channel = map_indirect_channel[channel_id_string];
    /*console.info(`   indirect_channel: ${indirect_channel}`);*/
    return (
      channels.find(function (channel) {
        return (
          channel["_foreignKey"] === indirect_channel.toString() &&
          channel.channel_direction === "Input" &&
          channel.input_configuration.capture_unit_configuration.source ===
          "DIRECT"
        );
      }) !== undefined
    );
  } catch (e) {
    console.error(`helper_tim_channel_check_indirect: ${e}`);
    return false;
  }
}

/**
 * Check if the channel_id is a complementary channel
 * @param {integer} channel_id id of the channel
 * @returns true or false
 */
function tim_check_if_complementary_channel(channel_id) {
  let result = false;
  try {
    /*console.info(`tim_check_if_complementary_channel: channel_id=${channel_id})}`
    );*/
    if (channel_id === undefined) {
      return false;
    }

    const regexCHxN = /^CC\dN$/;

    if (regexCHxN.test(channel_id)) {
      result = true;
    }
  } catch (e) {
    console.error(`tim_check_if_complementary_channel: ${e}`);
  }
  return result;
}

/**
 * Check if the channel_id needs to configure a GPIO
 * @param {object} channel element of the channels list
 * @param {integer} channel_id id of the channel
 * @returns true or false
 */
function tim_need_gpio(channel, channel_id) {
  let result = false;
  try {
    if (channel === undefined || channel_id === undefined) {
      return false;
    }
    if (
      channel !== undefined &&
      channel.use_channel !== undefined &&
      channel.use_channel
    ) {
      /* in input mode, GPIO must be configured only if the input capture source is set to tim_tix_in0
         and with at least 'AFI' or 'Input pins' source.
         e.g. AFI
              Input Pins
              AFI (TIM_CH1)
         Check with in0 to avoid AFI include in another interconnect signal (e.g. ti2_in2 - AFI_TIM3_CH2). */
      if (
        channel.channel_direction === "Input" &&
        /(AFI|Input pins)/i.test(channel?.input_configuration?.icx_channel_configuration?.input_selection?.source) &&
        /^ti\d_in0$/.test(channel?.input_configuration?.icx_channel_configuration?.input_selection?.ip_signal) &&
        !tim_check_if_complementary_channel(channel_id)
      ) {
        result = true;
        /*console.info(
          `   Input Channel ${channel_id} configured to GPIO`
        );*/
      } else if (
        channel.channel_direction === "Output" &&
        (tim_check_if_complementary_channel(channel_id) ?
          channel?.output_configuration?.ocxn_channel_configuration?.chxn_gpio :
          channel?.output_configuration?.ocx_channel_configuration?.chx_gpio)
      ) {
        result = true;
        /*console.info(
          `   Output Channel ${channel_id} with GPIO`
        );*/
      }
    }
  } catch (e) {
    console.error(`tim_need_gpio: ${e}`);
  }
  return result;
}

/**
 * Check if a GPIO is used
 * @param {object} basic basic view configuration
 * @param {object} channels list of configured channels
 * @param {object} additional additional view configuration
 * @returns true or false
 */
function helper_tim_need_at_least_one_gpio(basic, channels, additional) {
  let result = false;
  try {
    /*console.info(`helper_tim_need_at_least_one_gpio: basic=${JSON.stringify(basic)}
      additional=${JSON.stringify(additional)}`
    );*/
    if (basic === undefined || channels === undefined || additional === undefined) {
      return false;
    }

    /* Check channel GPIOs */
    for (const config_ch of channels) {
      result = tim_need_gpio(config_ch, config_ch._foreignKey) || tim_need_gpio(config_ch, config_ch._foreignKey + 'N');
      if (result) return result;
    }

    /* Check break GPIOs */
    const breaks = additional.output_stage.break_configuration?.breaks || [];
    result = helper_tim_need_gpio_break(breaks, 1) || helper_tim_need_gpio_break(breaks, 2);
    if (result) return result;

    /* Check ETR GPIO */
    result = helper_tim_need_gpio_etr(basic.time_base?.clock_source_configuration?.external_trigger, additional.external_trigger_configuration);
    if (result) return result;

  } catch (e) {
    console.error(`helper_tim_need_at_least_one_gpio: ${e}`);
  }
  return result;
}

/**
 * Check if the channel_id needs to configure a GPIO
 * @param {object} channels list of configured channels
 * @param {integer} channel_id id of the channel
 * @returns true or false
 */
function helper_tim_need_gpio_channel(channels, channel_id) {
  let result = false;
  try {
    /*console.info(`helper_tim_need_gpio_channel: channels=${JSON.stringify(
        channels)}, channel_id=${channel_id}`
    );*/
    if (channels === undefined || channel_id === undefined) {
      return false;
    }
    const channel_id_str = channel_id.toString();
    const channel_id_base = channel_id_str.endsWith('N') ?
      channel_id_str.slice(0, -1) :
      channel_id_str; /* e.g. CCxN -> CCx */
    /*console.info(`helper_tim_need_gpio_channel: channel_id_base=${channel_id_base}`);*/

    let config_ch = channels.find(function (channel) {
      return channel["_foreignKey"] === channel_id_base;
    });
    result = tim_need_gpio(config_ch, channel_id);
  } catch (e) {
    console.error(`helper_tim_need_gpio_channel: ${e}`);
  }
  return result;
}

/**
 * Check if the break_id needs to configure a GPIO
 * @param {object} breaks list of configured breaks
 * @param {integer} break_id id of the break
 * @returns true or false
 */
function helper_tim_need_gpio_break(breaks, break_id) {
  let result = false;
  try {
    /*console.info(`helper_tim_need_gpio_break: breaks=${JSON.stringify(
        breaks)}, break_id=${break_id}`
    );*/
    if (breaks === undefined || break_id === undefined) {
      return false;
    }
    const brk = {
      breaksArray: breaks,
    };
    /*console.info(`helper_tim_need_gpio_break: brk.breaksArray=${JSON.stringify(brk.breaksArray)}`
    );*/

    const breakConfig = brk.breaksArray.find(b => b._foreignKey === break_id);
    if (breakConfig &&
      breakConfig.break_input_sources_configuration &&
      breakConfig.break_input_sources_configuration.some(source =>
      /(GPIO|AFI|Input pins)/i.test(source._foreignKey) && source.enable_break_input_source === true
      )) {
      result = true;
    }
  } catch (e) {
    console.error(`helper_tim_need_gpio_break: ${e}`);
  }
  return result;
}

/**
 * Check if the ETR needs to configure a GPIO
 * @param {object} clk_etr clock source ETR configuration
 * @param {integer} etr_cfg ETR configuration
 * @returns true or false
 */
function helper_tim_need_gpio_etr(clk_etr, etr_cfg) {
  let result = false;
  try {
    /*console.info(`helper_tim_need_gpio_etr: clk_etr=${JSON.stringify(
        clk_etr)}, etr_cfg=${JSON.stringify(etr_cfg)}`);*/

    if (/(AFI|Input pins)/i.test(clk_etr?.source) ||
        (etr_cfg?.use_external_trigger &&
         /(AFI|Input pins)/i.test(etr_cfg?.external_trigger?.source))) {
      result = true;
    }
  } catch (e) {
    console.error(`helper_tim_need_gpio_etr: ${e}`);
  }
  return result;
}

/**
 * Check if at least one channel is in output mode
 * @param {object} channels list of configured channels
 * @returns true or false
 */
function helper_tim_check_if_at_least_one_channel_in_output(channels) {
  try {
    /*console.info(`helper_tim_check_if_at_least_one_channel_in_output: channels=${JSON.stringify(
        channels)}`
    );*/
    if (channels === undefined) {
      return false;
    }
    return channels.find((channel) => channel.channel_direction === "Output") !== undefined;
  } catch (e) {
    console.error(`helper_tim_check_if_at_least_one_channel_in_output: ${e}`);
    return false;
  }
}

/**
 * Check if at least one channel is in input mode connected to TRC
 * @param {object} channels list of configured channels
 * @returns true or false
 */
function helper_tim_check_if_at_least_one_channel_in_input_trc(channels) {
  try {
    /*console.info(`helper_tim_check_if_at_least_one_channel_in_input_trc: channels=${JSON.stringify(
        channels)}`
    );*/
    if (channels === undefined) {
      return false;
    }
    return (
      channels.find(function (channel) {
        return (
          channel["channel_direction"] === "Input" &&
          channel.input_configuration !== undefined &&
          channel.input_configuration.capture_unit_configuration.source === "TRC"
        );
      }) !== undefined
    );
  } catch (e) {
    console.error(`helper_tim_check_if_at_least_one_channel_in_input_trc: ${e}`);
    return false;
  }
}

/**
 * Check if at least one channel uses ocref clear
 * @param {object} channels list of configured channels
 * @returns true or false
 */
function helper_tim_check_if_at_least_one_channel_uses_ocref_clear(channels) {
  try {
    /*console.info(`helper_tim_check_if_at_least_one_channel_uses_ocref_clear: channels=${JSON.stringify(
        channels)}`
    );*/
    if (channels === undefined) {
      return false;
    }
    return (
      channels.find(function (channel) {
        return (
          channel.output_configuration !== undefined &&
          channel.output_configuration.compare_unit_configuration.ocref_clear === true
        );
      }) !== undefined
    );
  } catch (e) {
    console.error(`helper_tim_check_if_at_least_one_channel_uses_ocref_clear: ${e}`);
    return false;
  }
}

/**
 * Check if at least one DMA channel for TIM channels has been enabled
 * @param {object} dma System.dma object
 * @returns true or false
 */
function helper_tim_check_if_at_least_one_cc_dma_channel(dma) {
  try {
    /*console.info(`helper_tim_check_if_at_least_one_cc_dma_channel: dma=${JSON.stringify(
        dma)}`
    );*/
    if (dma === undefined) {
      return false;
    }
    for (let i = 1; i <= 4; i++) {
      if (dma[`enable_dma_cc${i}`]) {
        /*console.info(`   DMA Channel${i} found`);*/
        return true;
      }
    }
  } catch (e) {
    console.error(`helper_tim_check_if_at_least_one_cc_dma_channel: ${e}`);
  }
  return false;
}

/**
 * Check if channel3 or channel4 has been configured in pulse generator mode
 * @param {object} channels list of configured channels
 * @returns true or false
 */
function helper_tim_check_if_pulse_generator_ch3_ch4(channels) {
  let result = false;
  try {
    /*console.info(`helper_tim_check_if_pulse_generator_ch3_ch4: channels=${JSON.stringify(
        channels)}`
    );*/
    if (channels === undefined) {
      return false;
    }
    for (let i = 0; i < channels.length; i++) {
      if (
        channels[i].use_channel !== undefined &&
        channels[i].use_channel &&
        (channels[i]._foreignKey === "CC3" || channels[i]._foreignKey === "CC4")
      ) {
        if (
          channels[i].channel_direction === "Output" &&
          channels[i].output_configuration !== undefined &&
          channels[i].output_configuration.compare_unit_configuration !==
          undefined &&
          channels[i].output_configuration.compare_unit_configuration
            .mode === "PULSE_ON_COMPARE"
        ) {
          result = true;
          /*console.info(
            `   Output Channel set to PULSE_ON_COMPARE found on ${channels[i]._foreignKey}`
          );*/
          break;
        }
      }
    }
  } catch (e) {
    console.error(`helper_tim_check_if_pulse_generator_ch3_ch4: ${e}`);
  }
  return result;
}

/**
 * Check if the channel_id has been configured in output
 * @param {object} channels list of configured channels
 * @param {integer} channel_id id of the channel
 * @returns true or false
 */
function helper_tim_find_channel_config_in_output(channels, channel_id) {
  try {
    /*console.info(`helper_tim_find_channel_config_in_output: channels=${JSON.stringify(
        channels)}, channel_id=${channel_id}`
    );*/
    if (channels === undefined || channel_id === undefined) {
      return false;
    }
    return (
      channels.find(function (channel) {
        return (
          channel._foreignKey === channel_id.toString() &&
          channel["channel_direction"] === "Output"
        );
      }) !== undefined
    );
  } catch (e) {
    console.error(`helper_tim_find_channel_config_in_output: ${e}`);
    return false;
  }
}

/**
 * Check if at least one channel has been configured in output physically
 * (CHx & CHxN GPIOs enabled)
 * @param {object} channels list of configured channels
 * @returns true or false
 */
function helper_tim_check_if_at_least_channel_and_complementary_in_output(
  channels
) {
  let result = false;
  try {
    /*console.info(`helper_tim_check_if_at_least_channel_and_complementary_in_output: channels=${JSON.stringify(
        channels)}`
    );*/
    if (channels === undefined) {
      return false;
    }

    for (let i = 0; i < channels.length; i++) {
      if (channels[i].channel_direction === "Output" &&
        channels[i].output_configuration.ocx_channel_configuration.chx_gpio &&
        channels[i].output_configuration.ocxn_channel_configuration.chxn_gpio
      ) {
        result = true;
        /*console.info(
          `   Output Channel and its complementary found on ${channels[i]._foreignKey}`
        );*/
        break;
      }
    }
  } catch (e) {
    console.error(`helper_tim_check_if_at_least_channel_and_complementary_in_output: ${e}`);
  }
  return result;
}

/**
 * Check if channel_id has been configured (output or input)
 * @param {object} channels list of configured channels
 * @param {integer} channel_id id of the channel
 * @returns true or false
 */
function helper_tim_find_channel_config(channels, channel_id) {
  let result = false;
  try {
    /*console.info(`helper_tim_find_channel_config: channels=${JSON.stringify(
        channels)}, channel_id=${channel_id}`
    );*/
    if (channels === undefined || channel_id === undefined) {
      return false;
    }

    result = channels.some(channel =>
      channel.use_channel && channel._foreignKey === channel_id.toString()
    );
  } catch (e) {
    console.error(`helper_tim_find_channel_config: ${e}`);
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
function helper_tim_compute_frequency(
  input_clock_frequency,
  prescaler,
  period
) {
  let result = 10000; /* default value to 10KHz */
  try {
    /*console.info(`helper_tim_compute_frequency: input_clock_frequency=${input_clock_frequency}, prescaler=${prescaler}, period=${period}`);*/
    if (input_clock_frequency === undefined || prescaler === undefined || period === undefined) {
      return false;
    }

    /* Calculate the actual timer frequency */
    var timer_frequency = input_clock_frequency / (prescaler + 1);

    /* Calculate the actual output frequency */
    var output_frequency = timer_frequency / (period + 1);

    /* Return the output frequency */
    result = Math.floor(output_frequency);
  } catch (e) {
    console.error(`helper_tim_compute_frequency: ${e}`);
  }
  return result;
}

/**
 * Calculate the sampling clock frequency.
 * @note  This api is used directly in the tim_parameters.json in basic view
 * @param {integer} input_clock_frequency Input clock frequency in Hz
 * @param {integer} clock_divider Clock divider value
 * @returns Sampling clock frequency (Hz)
 */
function helper_tim_compute_sampling_clock(input_clock_frequency, clock_divider) {
  let result = 123456789;
  try {
    /*console.info(`helper_tim_compute_sampling_clock: input_clock_frequency=${input_clock_frequency}, clock_divider=${clock_divider}`);*/
    if (input_clock_frequency === undefined || clock_divider === undefined) {
      return false;
    }
    if (typeof input_clock_frequency === "string") {
      const match = (() => {
        const parsed = input_clock_frequency
          .trim()
          .replace(",", ".")
          .match(/^([+-]?\d+(?:\.\d+)?)\s*(Hz|kHz|MHz)?$/i);

        if (!parsed) {
          return null;
        }

        const unit = (parsed[2] || "Hz").toLowerCase();
        const factor = unit === "mhz" ? 1e6 : unit === "khz" ? 1e3 : 1;
        const valueHz = Number(parsed[1]) * factor;

        return Number.isFinite(valueHz) ? [parsed[0], String(valueHz)] : null;
      })();

      if (!match) {
        return false;
      }

      input_clock_frequency = Number(match[1]);
    }

    if (!Number.isFinite(input_clock_frequency)) {
      return false;
    }
    result = Math.floor(input_clock_frequency / clock_divider);
  } catch (e) {
    console.error(`helper_tim_compute_sampling_clock: ${e}`);
  }
  return result;
}

/**
 * Convert HW Channel ID (CHx) to HAL channel ID (CHANNEL_x)
 * @note  This api is used directly in the tim_parameters.json in basic view
 * @param {string} channel channel ID (CHx)
 * @returns {string} HAL or LL channel ID (CHANNEL_x)
 */
function helper_tim_convert_channel(channel) {
  try {
    /*console.info(`helper_tim_convert_channel: channel=${JSON.stringify(channels)}`);*/
    if (channel === undefined) {
      return false;
    }

    const map_channel = {
      CC1: "1",
      CC2: "2",
      CC3: "3",
      CC4: "4",
      CC5: "5",
      CC6: "6",
      CC7: "7",
    };

    return map_channel[channel] || "";
  } catch (e) {
    console.error(`helper_tim_convert_channel: ${e}`);
    return "";
  }
}

/**
 * Convert HW input capture ID (TIx_y) to HAL/LL Input ID (TI1_GPIO)
 * @param {string} channel channel ID (CHx)
 * @param {string} source input source selection (ex 'Input pins')
 * @returns {string} Input ID (TI1_GPIO)
 */
function helper_tim_convert_input_src(channel, source) {
  try {
    /*console.info(`helper_tim_convert_input_src: channel=${JSON.stringify(channels)}`);*/
    if (channel === undefined || source === undefined) {
      return false;
    }

    const s = String(source).toUpperCase();
    const specials = {
      RCC_HSE_1MHZ: "HSE_RTC",
      RTC_WKUP_IT: "RTC_WUT_TRG"
    };
    const normalized_source = s
      .replace(/^RCC_/, "")
      .replace(/I3C(\d+)_IBIACKTI/i, "I3C$1_IBI_ACK");
    const source_map = /^(?:AFI(?:\s*\([^)]*\))?|Input pins)$/i.test(source) ? "GPIO" : specials[s] ?? normalized_source;
    const map_input = {
      CC1: "TI1",
      CC2: "TI2",
      CC3: "TI3",
      CC4: "TI4",
    };

    return map_input[channel] + "_" + source_map;
  } catch (e) {
    console.error(`helper_tim_convert_input_src: ${e}`);
    return "";
  }
}

/**
 * Convert HW break input source to HAL/LL Break Input ID (GPIO)
 * @param {string} break_name Break input name (e.g. "Input pins", "AFI")
 * @returns {string} Break Input ID (GPIO)
 */
function helper_tim_convert_break_input(break_name) {
  try {
    /*console.info(`helper_tim_convert_break_input: break_name=${JSON.stringify(break_name)}`);*/
    if (break_name === undefined) {
      return false;
    }

    const source_map = /(AFI|Input pins)/i.test(break_name) ? "GPIO" : break_name.toUpperCase();

    return source_map;
  } catch (e) {
    console.error(`helper_tim_convert_break_input: ${e}`);
    return "";
  }
}

/**
 * Convert HW external trigger source to HAL/LL ETR Input ID (GPIO)
 * @param {string} etr External trigger name (e.g. "Input pins", "AFI")
 * @returns {string} ETR Input ID (GPIO)
 */
function helper_tim_convert_etr(etr) {
  try {
    /*console.info(`helper_tim_convert_etr: etr=${JSON.stringify(etr)}`);*/
    if (etr === undefined) {
      return false;
    }

    const s = String(etr).toUpperCase();
    const specials = {
      RCC_HSE_1MHZ: "HSE_RTC",
      RTC_WKUP_IT: "RTC_WUT_TRG"
    };
    const source_map = /^(?:AFI(?:\s*\([^)]*\))?|Input pins)$/i.test(etr) ? "GPIO" : specials[s] ?? s.replace(/^RCC_/, "");

    return source_map;
  } catch (e) {
    console.error(`helper_tim_convert_etr: ${e}`);
    return "";
  }
}

/**
 * Get the synchronized break inputs for a given break number
 * @param {integer} break_number Break number (1 or 2)
 * @param {object} interconnect List of interconnects
 * @param {object} mapping_gpio GPIO mapping object
 * @returns {object} Filtered interconnects for the specified break
 */
function helper_tim_synchronized_breaks(break_number, interconnect, mapping_gpio) {
  try {
    /*console.info(`helper_tim_synchronized_breaks: break_number=${JSON.stringify(break_number)} interconnect=${JSON.stringify(interconnect)}`);*/
    if (break_number === undefined || interconnect === undefined || mapping_gpio === undefined) {
      return false;
    }
    // Patterns for configurable_polarity = true (x from 0 to 4)
    let patterns = [];
    if (break_number === 1) {
      patterns = [
        /^Break(\[[0-4]\])?$/,   // "Break" or "Break[0]"..."Break[4]"
        /^BKIN$/,
        /^brk_cmp[0-4]$/,
        /^brk_[0-4]$/
      ];
    } else if (break_number === 2) {
      patterns = [
        /^Break2(\[[0-4]\])?$/,  // "Break2" or "Break2[0]"..."Break2[4]"
        /^BKIN2$/,
        /^brk2_cmp[0-4]$/,
        /^brk2_[0-4]$/
      ];
    } else {
      return [];
    }

    // Patterns to select only the right break sources for the break_number
    const filterPattern = break_number === 1
      ? /^(Break(\[\d+\])?|BKIN|brk_.+)$/
      : /^(Break2(\[\d+\])?|BKIN2|brk2_.+)$/;

    // Return all "break input trigger" following break_number, set configurable_polarity according to match
    return interconnect
      .filter(item =>
        item.type === "break input trigger" &&
        typeof item.ip_signal === "string" &&
        filterPattern.test(item.ip_signal)
      )
      .map(item => {
        const normalizedSource = /^(?:AFI(?:\s*\([^)]*\))?|Input pins)$/i.test(item.source) ? "GPIO" : item.source.toUpperCase();
        const base = {
          ...item,
          // configurable_polarity is true only if the ip_signal matches one of the patterns above
          configurable_polarity: patterns.some(pattern => pattern.test(item.ip_signal))
        };
        // Normalize AFI/Input pins to GPIO, but if mapping_gpio is false and it would be GPIO, remove the source field
        if (normalizedSource === "GPIO" && mapping_gpio === false) {
          const baseNoSource = { ...base };
          delete baseNoSource.source; // remove any original source like AFI
          return baseNoSource;
        }
        return { ...base, source: normalizedSource };
      });
  } catch (e) {
    console.error(`helper_tim_synchronized_breaks: ${e}`);
    return "";
  }
}

/**
 * Check if input_source string needs to enable HSE32EN
 * @param {string} input_source Input source string (e.g., "HAL_TIM_INPUT_TIM16_TI1_HSE_DIV32", etc.)
 * @returns {boolean} True if "HSE_DIV32" is found, false otherwise
 */
function helper_tim_input_source_is_hse_div32(input_source) {
  try {
    if (typeof input_source !== "string") {
      return false;
    }
    return input_source.includes("HSE_DIV32");
  } catch (e) {
    console.error(`helper_tim_input_source_is_hse_div32: ${e}`);
    return false;
  }
}

/**
 * Check if the input channel is used as a clock source for polarity and filter parameters
 * @param {string} channel Channel ID (e.g., "CC1", "CC2")
 * @param {object} trigger_input Clock Source trigger input
 * @returns {string} If the channel is used as a clock source:
 *                    - returns "PF" if polarity and filter from clock source are needed.
 *                    - returns "F" if only filter from clock source is needed, polarity from channel parameters.
 *                    - returns "" if channel polarity and filter parameters must be used.
 */
function helper_tim_input_channel_clock_source(channel, trigger_input) {
  try {
    /*console.info(`helper_tim_input_channel_clock_source: channel=${JSON.stringify(channel)}, trigger_input=${JSON.stringify(trigger_input)}`
    );*/
    if (typeof channel !== "string" || typeof trigger_input !== "string") {
      console.warn(`helper_tim_input_channel_clock_source: Invalid parameters`);
      return "WARNING";
    }
    const map = {
      CC1: { TI1FP1: "PF", TI1F_ED: "F" },
      CC2: { TI2FP2: "PF" }
    };
    return (map[channel] && map[channel][trigger_input]) || "";
  } catch (e) {
    console.error(`helper_tim_input_channel_clock_source: ${e}`);
    return "ERROR";
  }
}

/**
 * Check if any channel has a delayed break mode matching the given delay string
 * @param {string} delay_str Delay string ("DELAY1", "DELAY2", etc.)
 * @param {object} channels list of configured channels
 * @returns {boolean} True if at least one break_mode matches delay_str
 */
function helper_tim_check_if_channel_delayed_break(delay_str, channels) {
  let result = false;
  try {
    /*console.info(`helper_tim_check_if_channel_delayed_break: delay_str= ${JSON.stringify(
        delay_str)}, channels=${JSON.stringify(channels)}`
    );*/
    if (
      typeof delay_str !== "string" ||
      !delay_str.startsWith("DELAY") ||
      channels === undefined
    ) {
      return false;
    }
    result = channels.some(ch => {
      if (!ch.use_channel) return false;
      const ocx = ch.output_configuration?.ocx_channel_configuration?.break_mode;
      const ocxn = ch.output_configuration?.ocxn_channel_configuration?.break_mode;
      return ocx === delay_str || ocxn === delay_str;
    });
  } catch (e) {
    console.error(`helper_tim_check_if_channel_delayed_break: ${e}`);
  }
  return result;
}

/**
  * Retrieve all the interruptions set by TIM but not generated
  * @param {object} nvic_api Getter on NVIC api
  * @param {object} exti_api Getter on EXTI api (not used)
  * @param {object} resource Current resource
  * @param {object} config current configuration of the TIM
  * @returns {object} List of interruptions to be generated with their NVIC context and alias name for mx_hal_def.h
 */
function helper_tim_get_irq_handler(nvic_api, exti_api, resource, config) {
  let result = [];
  try {
    /*console.info(`helper_tim_get_irq_handler: resource= ${resource}, config=${JSON.stringify(config)}`
    );*/

    /** Reference all the elements which enable the PPP interruptions
     * @type {Array} List of interruptions available for the PPP
     * @property {string} enable Name of the property which enables the interruption
     * @property {string} irq_handler_generation Name of the property which indicates if IRQ handler generation is done or not
     * @property {string} nvic_context Name of the property which contains the NVIC context
     * @property {string} selector Suffix to be added to the alias name (empty if global interrupt, starts with underscore with NVIC selector if not empty)
    */
    const list_interrupts = [
      { enable: "enable_interruption_upd", irq_handler_generation: "irq_handler_generation_upd", nvic_context: "nvic_config_upd", selector: "_UPD"},
      { enable: "enable_interruption_cc", irq_handler_generation: "irq_handler_generation_cc", nvic_context: "nvic_config_cc", selector: "_CC" },
      { enable: "enable_interruption_brk_terr_ierr", irq_handler_generation: "irq_handler_generation_brk_terr_ierr", nvic_context: "nvic_config_brk_terr_ierr", selector: "_BRK_TERR_IERR"},
      { enable: "enable_interruption_trgi_com_dir_idx", irq_handler_generation: "irq_handler_generation_trgi_com_dir_idx", nvic_context: "nvic_config_trgi_com_dir_idx", selector: "_TRGI_COM_DIR_IDX"},
      { enable: "enable_interruption_global", irq_handler_generation: "irq_handler_generation_global", nvic_context: "nvic_config_global", selector: ""},
    ];

    /** Parse the list of interruptions */
    for (let index = 0; index < list_interrupts.length; index++) {
      const element = list_interrupts[index];
      /** Check if interruption has beenn enabled on the TIM */
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
    console.error(`helper_tim_get_irq_handler: ${e}`);
  }
  return result;
}

module.exports = {
  helper_tim_synchronized_breaks,

  helper_tim_find_channel_config_in_input,

  helper_tim_channel_check_indirect,

  helper_tim_need_at_least_one_gpio,

  helper_tim_need_gpio_channel,

  helper_tim_need_gpio_break,

  helper_tim_need_gpio_etr,

  helper_tim_check_if_at_least_one_channel_in_output,

  helper_tim_check_if_at_least_one_channel_in_input_trc,

  helper_tim_check_if_at_least_one_channel_uses_ocref_clear,

  helper_tim_check_if_at_least_one_cc_dma_channel,

  helper_tim_check_if_pulse_generator_ch3_ch4,

  helper_tim_find_channel_config_in_output,

  helper_tim_check_if_at_least_channel_and_complementary_in_output,

  helper_tim_find_channel_config,

  helper_tim_compute_frequency,

  helper_tim_compute_sampling_clock,

  helper_tim_convert_channel,

  helper_tim_convert_input_src,

  helper_tim_convert_break_input,

  helper_tim_convert_etr,

  helper_tim_input_source_is_hse_div32,

  helper_tim_input_channel_clock_source,

  helper_tim_check_if_channel_delayed_break,

  helper_tim_get_irq_handler
};
