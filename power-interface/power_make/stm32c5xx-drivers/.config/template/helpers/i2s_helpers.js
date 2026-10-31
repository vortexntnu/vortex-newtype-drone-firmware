/**
 * @file Helpers functions used for I2S SW component
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
 * @brief I2S prescaler structure definition
 */
class i2s_prescaler {
	constructor(i2s_div, i2s_odd) {
		this.i2s_div = i2s_div;
		this.i2s_odd = i2s_odd;
	}
}

/**
 * @brief I2S configuration structure definition
 */
class i2s_configuration {
  constructor(i2s_ker_clk, i2s_standard, i2s_data_format, i2s_mclko, i2s_frequency) {
    this.i2s_ker_clk = i2s_ker_clk;
    this.i2s_standard = i2s_standard;
    this.i2s_data_format = i2s_data_format;
    this.i2s_mclko = i2s_mclko;
    this.i2s_frequency = i2s_frequency;
  }
}

/**
 * @brief I2S prescaler calculation function
 */
function i2s_getprescaler(configI2S) {
  let i2sdiv, i2sodd, channel_length, data_format, ispcm, standard, frequency, tmp;
  const i2s_ker_clk = configI2S.i2s_ker_clk;

  standard = configI2S.i2s_standard;
  data_format = configI2S.i2s_data_format;
  frequency = configI2S.i2s_frequency;

  if ((frequency != 2) && (frequency != 0)) {
    if ((standard == "PCM_SHORT") || (standard == "PCM_LONG")) {
      ispcm = 1;
    } else {
      ispcm = 0;
    }

    if (data_format != "16_BIT") {
      channel_length = 2;
    } else {
      channel_length = 1;
    }

    if (configI2S.i2s_mclko == true) {
      tmp = ((((i2s_ker_clk / (256 >> ispcm)) * 10) / frequency) + 5);
    } else {
      tmp = ((((i2s_ker_clk / ((32 >> ispcm) * channel_length)) * 10) / frequency) + 5);
    }

    /* Remove the flatting point */
    tmp = tmp / 10;

    /* Check the parity of the divider */
    i2sodd = (tmp & 1);

    /* Compute the i2sdiv prescaler */
    i2sdiv = Math.floor((tmp - i2sodd) / 2);

  } else {
    i2sdiv = 2;
    i2sodd = 0;
  }

  /* Test if the obtain values are forbidden or out of range */
  // if (((odd == 1) && (div == 1)) || (div > 0xFF)) {
  //   console.error(`I2S prescaler is out of range to obtain the wanted frequency`);
  //   return {
  //     i2s_div:8,// 0,
  //     i2s_odd:0, // 0,
  //   };
  // }

  /* Force i2smod to 1 just to be sure that (2xi2sdiv + i2sodd) is always higher than 0 */
  if (i2sdiv == 0) {
    i2sodd = 1;
  }

  return {
	  i2s_div: i2sdiv,
	  i2s_odd: i2sodd,
  };
}

/**
 * @brief I2S real audio frequency calculation function
 */
function i2s_getrealaudiofrequency(configI2S, prescalerI2S) {
	let frequency = 0;
	let data_format, channel_length, odd, div, ispcm, prescaler, standard;

  // Extract necessary values from the configI2S and prescalerI2S objects
  const i2s_ker_clk = configI2S.i2s_ker_clk;
  data_format = configI2S.i2s_data_format;
  standard = configI2S.i2s_standard;
  div = prescalerI2S.i2s_div;
  odd = prescalerI2S.i2s_odd;

  if (div == 0) {
    prescaler = 1;
  } else {
    prescaler = (2*div+odd);
  }

 if ((standard == "PCM_SHORT") || (standard == "PCM_LONG")) {
    ispcm = 1;
  } else {
    ispcm = 0;
  }

  if (data_format != "16_BIT") {
    /* Channel length is 32 bits */
    channel_length = 2;
  } else {
    /* Channel length is 16 bits */
    channel_length = 1;
  }

  if (configI2S.i2s_mclko == true) {
    frequency = ((((i2s_ker_clk / (256 >> ispcm))) / prescaler));
  } else {
    frequency = ((((i2s_ker_clk / ((32 >> ispcm) * channel_length))) / prescaler));
  }

  /* Remove the floating point */
  frequency = Math.floor(frequency);

  return frequency;
}

// Function to get the i2s prescalers for LL generation using helper
function helper_i2s_getprescalers(
  i2s_ker_clk,
  i2s_standard,
  i2s_data_format,
  i2s_mclko,
  i2s_frequency
) {
   try {
    // Create a new configuration object
     const configI2S = new i2s_configuration(
       i2s_ker_clk,
       i2s_standard,
       i2s_data_format,
       i2s_mclko,
       i2s_frequency
     );

    // Compute the prescaler
    return i2s_getprescaler(configI2S);

   } catch (e) {
     console.error(`I2S prescalers: $(e)`);
   }
}

// Function to get the real audio frequency using helper
function helper_i2s_getrealfrequency(
  i2s_ker_clk,
  i2s_standard,
  i2s_data_format,
  i2s_mclko,
  i2s_frequency
) {
   try {
    // Create a new configuration object
     const configI2S = new i2s_configuration(
       i2s_ker_clk,
       i2s_standard,
       i2s_data_format,
       i2s_mclko,
       i2s_frequency
     );

    // Compute the prescaler
    const computed_prescaler = i2s_getprescaler(configI2S);

    // Get the real audio frequency
     const real_audio_frequency = i2s_getrealaudiofrequency(configI2S, computed_prescaler);

    return real_audio_frequency;

   } catch (e) {
     console.error(`I2S real audio frequency: $(e)`);
   }
}

/**
 * @brief Error between real frequency and expected frequency function
 */
function helper_i2s_error_frequency(audio_frequency, real_frequency){
	let result = 0;
  result = Math.floor(((audio_frequency-real_frequency)/audio_frequency)*100);
	return result;
}

function helper_mode_master(mode) {
  const masterModes = [
    "MASTER_TX",
    "MASTER_RX",
    "MASTER_FULL_DUPLEX"
  ];
  if (masterModes.includes(mode)) {
    return 1;
  } else {
    return 0;
  }
}

function helper_format_frequency(frequency) {
  return frequency = Math.floor(frequency/1000);
}

function helper_data_format_to_bits(data_format) {
  let bits = 0;
  switch (data_format) {
    case "16_BIT":
      bits = 16;
      break;
    case "16_BIT_EXTENDED":
      bits = 16;
      break;
    case "24_BIT":
      bits = 24;
      break;
    case "32_BIT":
      bits = 32;
      break;
    default:
      console.error(`Unsupported data format: ${data_format}`);
      break;
  }
  return bits;
}

// Export the functions
module.exports = {
  helper_i2s_getprescalers,
  helper_i2s_getrealfrequency,
  helper_i2s_error_frequency,
  helper_format_frequency,
  helper_mode_master,
  helper_data_format_to_bits,
};
