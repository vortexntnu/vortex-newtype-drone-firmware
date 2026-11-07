/**
  * @file Helpers functions used for I3C SW component
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

const DEBUG = false; // Activate extra debug if true

const SEC210PSEC = 100000000000n; // 10ps, to take two decimal float of ns calculation
const TI3CH_MIN = 3200; // Open drain & push pull SCL high min, 32ns
const TI3CH_OD_MAX = 4100; // Open drain SCL high max, 41 ns
const TI3CL_OD_MIN = 20000; // Open drain SCL low min, 200 ns
const TFMPL_OD_MIN = 50000; // Fast Mode Plus Open drain SCL low min, 500 ns
const TFML_OD_MIN = 130000; // Fast Mode Open drain SCL low min, 1300 ns
const TFM_MIN = 250000; // Fast Mode, period min for ti3cclk, 2.5us
const TSM_MIN = 1000000; // Standard Mode, period min for ti3cclk, 10us
const TI3C_CAS_MIN = 3840; // Time SCL after START min, 38.4 ns
const TCAPA = 35000; // Capacitor effect Value measure on Nucleo around 350ns
const I3C_FREQUENCY_MAX = 257000000; // Maximum I3C frequency

const I3C_TIMINGR0_SCLL_PP_POS = 0; // SCL Low duration during I3C Push-Pull phases
const I3C_TIMINGR0_SCLH_I3C_POS = 8; // SCL High duration during I3C Open-drain and Push-Pull phases
const I3C_TIMINGR0_SCLL_OD_POS = 16; // SCL Low duration during I3C Open-drain phases and I2C transfer
const I3C_TIMINGR0_SCLH_I2C_POS = 24; // SCL High duration during I2C transfer
const I3C_TIMINGR1_AVAL_POS = 0; // Timing for I3C Bus Idle or Available condition
const I3C_TIMINGR1_ASNCR_POS = 8; // Activity State of the New Controller
const I3C_TIMINGR1_ASNCR_MSK = 0x3 << I3C_TIMINGR1_ASNCR_POS; // Activity State of the New Controller mask
const I3C_TIMINGR1_FREE_POS = 16; // Timing for I3C Bus Free condition
const I3C_TIMINGR1_SDA_HD_POS = 28; // SDA Hold Duration
const I3C_TIMINGR1_SDA_HD_MSK = (0x3 << I3C_TIMINGR1_SDA_HD_POS) /*!< SDA Hold Duration mask */
const I3C_TIMINGR1_SDA_HD_0 = (0x1 << I3C_TIMINGR1_SDA_HD_POS) /*!< SDA hold time is 1.5 x ti3cclk  */

const UTILS_I3C_PURE_I3C_BUS = 0; // Pure I3C bus, no I2C
const UTILS_I3C_I2C_MIXED_BUS = 1; // Mixed bus I3C and I2C

const I3C_TIMINGR1_ASNCR_Pos = 8;
const I3C_TIMINGR1_ASNCR_0 = (0x1 << I3C_TIMINGR1_ASNCR_Pos);    // 0x00000100
const I3C_TIMINGR1_ASNCR_1 = (0x2 << I3C_TIMINGR1_ASNCR_Pos);    // 0x00000200

const LL_I3C_OWN_ACTIVITY_STATE_0 = 0x00000000;                                   // Own ctrl activity state 0
const LL_I3C_OWN_ACTIVITY_STATE_1 = I3C_TIMINGR1_ASNCR_0;                         // Own ctrl activity state 1
const LL_I3C_OWN_ACTIVITY_STATE_2 = I3C_TIMINGR1_ASNCR_1;                         // Own ctrl activity state 2
const LL_I3C_OWN_ACTIVITY_STATE_3 = (I3C_TIMINGR1_ASNCR_1 | I3C_TIMINGR1_ASNCR_0); // Own ctrl activity state 3

// Global last error string (latest error only)
let COMPUTE_TIMING_CTRL_LAST_ERROR = "NO_ERROR";
function compute_timing_ctrl_log_error(msg) {
  COMPUTE_TIMING_CTRL_LAST_ERROR = msg;
  // Always output error immediately (independent of DEBUG)
  console.error(`I3C ${COMPUTE_TIMING_CTRL_LAST_ERROR}`);
}

/**
 * @brief I2C UTILS Timings basic Configuration Structure definition
 */
class utils_i3c_ctrl_timing_config_t {
  constructor(clock_src_freq, i3c_pp_freq, i2c_od_freq, duty_cycle, bus_type, wait_time, adv_tcapa, adv_sda_hold_time, adv_bus_free_duration, adv_bus_idle_duration) {
    this.clock_src_freq = clock_src_freq;       // I3C clock source (in Hz)
    this.i3c_pp_freq = i3c_pp_freq;             // I3C required bus clock for push-pull phase (in Hz)
    this.i2c_od_freq = i2c_od_freq;             // I2C required bus clock for Open-Drain phase (in Hz)
    this.duty_cycle = duty_cycle;               // I3C duty cycle for pure I3C bus or I2C duty cycle for mixed bus in percent
    this.bus_type = bus_type;                   // Bus configuration type (I3C or I3C + I2C)
    this.wait_time = wait_time;                 // Time that the main and the new controllers must wait before issuing a start
    this.adv_tcapa = adv_tcapa;                 // Time in ns for SDA rise to 70% VDD from GND, capacitor effect, as example Value measure on Nucleo around 350ns
    this.adv_sda_hold_time = adv_sda_hold_time; // SDA hold time in terms of the number of kernel clock periods
    this.adv_bus_free_duration = adv_bus_free_duration; // The duration after a stop and before a start (ns).
    this.adv_bus_idle_duration = adv_bus_idle_duration; // An extended duration of the bus free to allow the devices to hot join the I3C bus
  }
}

function logDebug(message) {
  if (DEBUG) {
    console.debug(`debug i3c - ${message}`);
  }
}

// divRoundClosest(7, 3) returns 2, which is the closest integer to 7 / 3.
function divRoundClosest(x, d) {
  return Math.floor((x + Math.floor(d / 2)) / d);
}

function UTILS_I3C_CtrlGetTiming(config) {
  let raw_timing = {};
  let timing_reg0 = 0;
  let timing_reg1 = 0;

  let status = 0;

  let ti3cclk = 0;
  let ti3c_pp_min = 0;
  let ti2c_od_min = 0;
  let tcapa = TCAPA;

  let sclhi3c;
  let scllpp;
  let scllod;
  let sclhi2c;
  let oneus;
  let free;
  let sdahold;

  if (config.clock_src_freq > I3C_FREQUENCY_MAX) {
    compute_timing_ctrl_log_error('clock_src_freq is greater than I3C_FREQUENCY_MAX');
    status = 1;
  }

  if (config.bus_type !== UTILS_I3C_PURE_I3C_BUS && config.bus_type !== UTILS_I3C_I2C_MIXED_BUS) {
    compute_timing_ctrl_log_error('bus_type is invalid');
    status = 1;
  }

  if ((config.clock_src_freq === 0 || config.i3c_pp_freq === 0) && config.bus_type === UTILS_I3C_PURE_I3C_BUS) {
    compute_timing_ctrl_log_error('clock_src_freq or i3c_pp_freq is zero for pure I3C bus');
    status = 1;
  }

  if ((config.clock_src_freq === 0 || config.i3c_pp_freq === 0 || config.i2c_od_freq === 0) && config.bus_type === UTILS_I3C_I2C_MIXED_BUS) {
    compute_timing_ctrl_log_error('clock_src_freq, i3c_pp_freq, or i2c_od_freq is zero for mixed bus');
    status = 1;
  }

  if (status === 0) {
    ti3cclk = Number((SEC210PSEC + BigInt(config.clock_src_freq) / 2n) / BigInt(config.clock_src_freq));
    logDebug(`ti3cclk calculated: ${ti3cclk}`);

    if (config.duty_cycle > 50 || ti3cclk === 0) {
      compute_timing_ctrl_log_error('duty_cycle is greater than 50 or ti3cclk is zero');
      status = 1;
    }
  }

  if (status === 0 && ti3cclk !== 0) {
    ti3c_pp_min = Number((SEC210PSEC + BigInt(config.i3c_pp_freq) / 2n) / BigInt(config.i3c_pp_freq));
    logDebug(`ti3c_pp_min calculated: ${ti3c_pp_min}`);
    if (config.bus_type !== UTILS_I3C_PURE_I3C_BUS) {
      ti2c_od_min = Number((SEC210PSEC + BigInt(config.i2c_od_freq) / 2n) / BigInt(config.i2c_od_freq));
      logDebug(`ti2c_od_min calculated: ${ti2c_od_min}`);
    }

    if (config.bus_type !== UTILS_I3C_PURE_I3C_BUS && ti2c_od_min > TSM_MIN) {
      compute_timing_ctrl_log_error('ti2c_od_min is greater than TSM_MIN for mixed bus');
      status = 1;
    }
  }

  if (status === 0 && ti3cclk !== 0) {
    if (config.bus_type === UTILS_I3C_PURE_I3C_BUS) {
      sclhi3c = divRoundClosest(divRoundClosest(ti3c_pp_min * config.duty_cycle, ti3cclk), 100) - 1;
      logDebug(`sclhi3c initial calculation: ${sclhi3c}`);

      if ((sclhi3c + 1) * ti3cclk < TI3CH_MIN) {
        sclhi3c = divRoundClosest(TI3CH_MIN, ti3cclk) - 1;
        logDebug(`sclhi3c adjusted for TI3CH_MIN: ${sclhi3c}`);

        if ((sclhi3c + 1) * ti3cclk < TI3CH_MIN) {
          sclhi3c += 1;
        }

        scllpp = divRoundClosest(ti3c_pp_min, ti3cclk) - (sclhi3c + 1) - 1;
      } else {
        sclhi3c = divRoundClosest(divRoundClosest(ti3c_pp_min * config.duty_cycle, ti3cclk), 100) - 1;

        if ((sclhi3c + 1) * ti3cclk < TI3CH_MIN) {
          sclhi3c += 1;
        }

        scllpp = divRoundClosest(ti3c_pp_min - ((sclhi3c + 1) * ti3cclk) + (ti3cclk / 2), ti3cclk) - 1;
      }
    } else {
      sclhi3c = divRoundClosest(TI3CH_OD_MAX, ti3cclk) - 1;
      logDebug(`sclhi3c for mixed bus: ${sclhi3c}`);

      if ((sclhi3c + 1) * ti3cclk < TI3CH_MIN) {
        sclhi3c += 1;
      } else if ((sclhi3c + 1) * ti3cclk > TI3CH_OD_MAX) {
        sclhi3c = Math.floor(TI3CH_OD_MAX / ti3cclk);
      }

      scllpp = divRoundClosest(ti3c_pp_min - ((sclhi3c + 1) * ti3cclk), ti3cclk) - 1;
    }

    let ideal_scllpp = ti3c_pp_min - ((sclhi3c + 1) * ti3cclk);
    if ((scllpp + 1) * ti3cclk >= ideal_scllpp + (ti3cclk / 2) + 1) {
      scllpp -= 1;
    }

    if ((scllpp + sclhi3c + 1 + 1) * ti3cclk < ideal_scllpp + (ti3cclk / 2) + 1) {
      scllpp += 1;
    }

    logDebug(`scllpp calculated: ${scllpp}`);

    if (config.bus_type === UTILS_I3C_PURE_I3C_BUS) {
      if (ti3c_pp_min < TI3CL_OD_MIN) {
        scllod = divRoundClosest(TI3CL_OD_MIN, ti3cclk) - 1;

        if ((scllod + 1) * ti3cclk < TI3CL_OD_MIN) {
          scllod += 1;
        }
      } else {
        scllod = scllpp;
      }

      if ((scllod + 1) * ti3cclk < tcapa) {
        scllod = divRoundClosest(tcapa, ti3cclk) + 1;
      }

      sclhi2c = 0;
    } else {
      scllod = divRoundClosest(divRoundClosest(ti2c_od_min * (100 - config.duty_cycle), ti3cclk), 100) - 1;

      if (ti2c_od_min < TFM_MIN) {
        if ((scllod + 1) * ti3cclk < TFMPL_OD_MIN) {
          scllod = divRoundClosest(TFMPL_OD_MIN, ti3cclk) - 1;
        }
      } else {
        if ((scllod + 1) * ti3cclk < TFML_OD_MIN) {
          scllod = divRoundClosest(TFML_OD_MIN, ti3cclk) - 1;
        }
      }

      sclhi2c = divRoundClosest(ti2c_od_min - ((scllod + 1) * ti3cclk), ti3cclk) - 1;
    }

    logDebug(`scllod calculated: ${scllod}`);
    logDebug(`sclhi2c calculated: ${sclhi2c}`);

    if (config.bus_type === UTILS_I3C_PURE_I3C_BUS) {
      free = divRoundClosest(TI3C_CAS_MIN + tcapa, 2 * ti3cclk) + 1;
    } else {
      free = divRoundClosest(((scllod + 1) * ti3cclk + tcapa), 2 * ti3cclk);
    }

    if (ti3cclk > 600) {
      sdahold = 0;
    } else {
      sdahold = I3C_TIMINGR1_SDA_HD_0;
    }

    oneus = divRoundClosest(100000, ti3cclk) - 2;

    logDebug(`free=${free} sdahold=${sdahold} oneus=${oneus} scllpp=${scllpp} sclhi3c=${sclhi3c} scllod=${scllod} sclhi2c=${sclhi2c} ti3cclk=${ti3cclk} ti3c_pp_min=${ti3c_pp_min} ti2c_od_min=${ti2c_od_min} tcapa=${tcapa}`);

    // Safety: ensure all computed timing segments are within unsigned 8-bit range
    if ([scllpp, sclhi3c, scllod, sclhi2c, free, oneus].some(v => v < 0 || v > 0xFF)) {
      compute_timing_ctrl_log_error('A timing value is out of 0..255 range. Possible cause: clock source too high for requested bus clocks.');
      status = 1;
    } else {
      raw_timing.scl_pp_low_duration = scllpp;
      raw_timing.scl_i3c_high_duration = sclhi3c;
      raw_timing.scl_od_low_duration = scllod;
      raw_timing.scl_i2c_high_duration = sclhi2c;

      timing_reg0 = (raw_timing.scl_pp_low_duration |
        (raw_timing.scl_i3c_high_duration << I3C_TIMINGR0_SCLH_I3C_POS) |
        (raw_timing.scl_od_low_duration << I3C_TIMINGR0_SCLL_OD_POS) |
        (raw_timing.scl_i2c_high_duration << I3C_TIMINGR0_SCLH_I2C_POS)) >>> 0;

      if (config.adv_bus_free_duration === -100) {
        raw_timing.bus_free_duration = free;
      } else {
        raw_timing.bus_free_duration = config.adv_bus_free_duration;
      }

      if (config.adv_bus_idle_duration === -100) {
        raw_timing.bus_idle_duration = oneus;
      } else {
        raw_timing.bus_idle_duration = config.adv_bus_idle_duration;
      }

      if (config.adv_sda_hold_time === -1) {
        raw_timing.sda_hold_time = sdahold;
      } else {
        raw_timing.sda_hold_time = config.adv_sda_hold_time;
      }



      raw_timing.wait_time = config.wait_time;

      timing_reg1 = (raw_timing.sda_hold_time |
        raw_timing.wait_time |
        (raw_timing.bus_free_duration << I3C_TIMINGR1_FREE_POS) |
        raw_timing.bus_idle_duration) >>> 0;

      logDebug(`timing_reg0 calculated: ${timing_reg0}`);
      logDebug(`timing_reg1 calculated: ${timing_reg1}`);
    }
  }

  return {
    status,
    timing_reg0,
    timing_reg1
  };
}

function UTILS_I3C_TgtGetTiming(clock_src_freq, bus_available_duration) {
  let status = 0;
  let oneus;
  let ti3cclk = 0;
  let timing_reg1 = 0;

  if (clock_src_freq === 0) {
    logDebug('Error: clock_src_freq is zero');
    status = 1;
  }

  if (status === 0) {
    ti3cclk = Number((SEC210PSEC + BigInt(clock_src_freq) / 2n) / BigInt(clock_src_freq));
    logDebug(`ti3cclk calculated: ${ti3cclk}`);

    if (ti3cclk === 0) {
      logDebug('Error: ti3cclk is zero');
      status = 1;
    }
  }

  if (status === 0 && ti3cclk !== 0) {
    oneus = divRoundClosest(100*bus_available_duration, ti3cclk) - 2;
    timing_reg1 = (oneus << I3C_TIMINGR1_AVAL_POS) >>> 0;
    logDebug(`p_timing_reg1 calculated: ${timing_reg1}`);
  }

  return timing_reg1;
}

function toHex(value) {
  return '0x' + value.toString(16).padStart(8, '0').toUpperCase();
}

function UTILS_I3C_CtrlGetRawTiming(p_timing_reg0, p_timing_reg1, raw_timing) {
  logDebug('Entering UTILS_I3C_CtrlGetRawTiming');
  raw_timing.scl_pp_low_duration = timing_reg0 & 0xFF;
  raw_timing.scl_i3c_high_duration = (timing_reg0 >> I3C_TIMINGR0_SCLH_I3C_POS) & 0xFF;
  raw_timing.scl_od_low_duration = (timing_reg0 >> I3C_TIMINGR0_SCLL_OD_POS) & 0xFF;
  raw_timing.scl_i2c_high_duration = (timing_reg0 >> I3C_TIMINGR0_SCLH_I2C_POS) & 0xFF;

  raw_timing.sda_hold_time = timing_reg1 & I3C_TIMINGR1_SDA_HD_MSK;
  raw_timing.wait_time = timing_reg1 & I3C_TIMINGR1_ASNCR_MSK;
  raw_timing.bus_free_duration = (timing_reg1 >> I3C_TIMINGR1_FREE_POS) & 0xFF;
  raw_timing.bus_idle_duration = (timing_reg1 >> 0) & 0xFF;

  logDebug(`raw_timing calculated: ${JSON.stringify(raw_timing)}`);
  logDebug('Exiting UTILS_I3C_CtrlGetRawTiming');
}

module.exports = {
  /**
   * Returns the macro string for I3C stall enable configuration.
   *
   * @param {boolean} ack         Enable stall on ACK phase
   * @param {boolean} ccc_tbit    Enable stall on CCC t-bit phase
   * @param {boolean} tx_parity   Enable stall on TX parity phase
   * @param {boolean} rx_parity   Enable stall on RX parity phase
   * @param {boolean} ack_i2c     Enable stall on I2C ACK phase
   * @param {boolean} tx_parity_i2c Enable stall on I2C TX parity phase
   * @param {boolean} rx_parity_i2c Enable stall on I2C RX parity phase
   * @returns {string} Macro string with enabled stall options, or HAL_I3C_STALL_NONE if none enabled
   */
  helper_i3c_stall_enable(ack, ccc_tbit, tx_parity, rx_parity, ack_i2c, tx_parity_i2c, rx_parity_i2c) {
    try {
      let definitions = [];
      let nb_true = 0;

      if (ack) nb_true++;
      if (ccc_tbit) nb_true++;
      if (tx_parity) nb_true++;
      if (rx_parity) nb_true++;
      if (ack_i2c) nb_true++;
      if (ack_i2c) nb_true++;
      if (tx_parity_i2c) nb_true++;
      if (rx_parity_i2c) nb_true++;

      if (nb_true === 0) return ("HAL_I3C_CTRL_STALL_NONE");

      if (ack) {definitions.push("HAL_I3C_CTRL_STALL_ACK")}
      if (ccc_tbit) {definitions.push("HAL_I3C_CTRL_STALL_CCC")}
      if (tx_parity) {definitions.push("HAL_I3C_CTRL_STALL_TX")}
      if (rx_parity) {definitions.push("HAL_I3C_CTRL_STALL_RX")}
      if (ack_i2c) {definitions.push("HAL_I3C_CTRL_STALL_I2C_ACK")}
      if (tx_parity_i2c) {definitions.push("HAL_I3C_CTRL_STALL_I2C_TX")}
      if (rx_parity_i2c) {definitions.push("HAL_I3C_CTRL_STALL_I2C_RX")}

      return definitions.join(" | ");
    } catch (e) {
      console.error(`I3C helper_i3c_stall_enable`);
    }
  },

  /**
   * Returns the macro string for I3C stall enable configuration (LL version).
   *
   * @param {boolean} ack           Enable stall on ACK phase
   * @param {boolean} ccc_tbit      Enable stall on CCC t-bit phase
   * @param {boolean} tx_parity     Enable stall on TX parity phase
   * @param {boolean} rx_parity     Enable stall on RX parity phase
   * @param {boolean} ack_i2c       Enable stall on I2C ACK phase
   * @param {boolean} tx_parity_i2c Enable stall on I2C TX parity phase
   * @param {boolean} rx_parity_i2c Enable stall on I2C RX parity phase
   * @returns {string} Macro string with enabled stall options, or 0U if none enabled
   */
  helper_i3c_stall_enable_ll(ack, ccc_tbit, tx_parity, rx_parity, ack_i2c, tx_parity_i2c, rx_parity_i2c) {
    try {
      let definitions = [];
      let nb_true = 0;

      if (ack) nb_true++;
      if (ccc_tbit) nb_true++;
      if (tx_parity) nb_true++;
      if (rx_parity) nb_true++;
      if (ack_i2c) nb_true++;
      if (ack_i2c) nb_true++;
      if (tx_parity_i2c) nb_true++;
      if (rx_parity_i2c) nb_true++;

      if (nb_true === 0) return ("LL_I3C_CTRL_STALL_NONE");

      if (ack) {definitions.push("LL_I3C_CTRL_STALL_ACK")}
      if (ccc_tbit) {definitions.push("LL_I3C_CTRL_STALL_CCC")}
      if (tx_parity) {definitions.push("LL_I3C_CTRL_STALL_TX")}
      if (rx_parity) {definitions.push("LL_I3C_CTRL_STALL_RX")}
      if (ack_i2c) {definitions.push("LL_I3C_CTRL_STALL_I2C_ACK")}
      if (tx_parity_i2c) {definitions.push("LL_I3C_CTRL_STALL_I2C_TX")}
      if (rx_parity_i2c) {definitions.push("LL_I3C_CTRL_STALL_I2C_RX")}

      return definitions.join(" | ");
    } catch (e) {
      console.error(`I3C helper_i3c_stall_enable_ll`);
    }
  },

  /**
   * Compute the I3C timing control register value.
   *
   * @param {integer} clock_src_freq         I3C clock source (in Hz)
   * @param {integer} i3c_pp_freq            I3C required bus clock for push-pull phase (in Hz)
   * @param {integer} i2c_od_freq            I2C required bus clock for open-drain phase (in Hz)
   * @param {integer} duty_cycle_i3c         I3C duty cycle for pure I3C bus in percent
   * @param {integer} duty_cycle_i2c         I3C and I2C duty cycle for mixed mode in percent
   * @param {string}  bus_type               Bus configuration type (I3C or I3C + I2C)
   * @param {string|integer} wait_time       Time that the main and the new controllers must wait before issuing a start
   * @param {integer} adv_tcapa              Time in ns for SDA rise to 70% VDD from GND, capacitor effect
   * @param {integer} adv_sda_hold_time      SDA hold time in terms of the number of kernel clock periods
   * @param {integer} adv_bus_free_duration  The duration after a stop and before a start (ns)
   * @param {integer} adv_bus_idle_duration  An extended duration of the bus free to allow the devices to hot join the I3C bus
   * @param {string}  reg_name               Register name: "I3C_TIMINGR0" or "I3C_TIMINGR1"
   * @returns {integer} The computed timing register value (timing_reg0 or timing_reg1)
   */
  helper_i3c_compute_timing_ctrl(
    clock_src_freq,
    i3c_pp_freq,
    i2c_od_freq,
    duty_cycle_i3c,
    duty_cycle_i2c,
    bus_type,
    wait_time,
    adv_tcapa,
    adv_sda_hold_time,
    adv_bus_free_duration,
    adv_bus_idle_duration,
    reg_name
  ) {
    try {
      COMPUTE_TIMING_CTRL_LAST_ERROR = "NO_ERROR"; // reset last error
      let wait_time_value;
      switch (wait_time) {
        case "LL_I3C_OWN_ACTIVITY_STATE_0":
          wait_time_value = LL_I3C_OWN_ACTIVITY_STATE_0;
          break;
        case "LL_I3C_OWN_ACTIVITY_STATE_1":
          wait_time_value = LL_I3C_OWN_ACTIVITY_STATE_1;
          break;
        case "LL_I3C_OWN_ACTIVITY_STATE_2":
          wait_time_value = LL_I3C_OWN_ACTIVITY_STATE_2;
          break;
        case "LL_I3C_OWN_ACTIVITY_STATE_3":
          wait_time_value = LL_I3C_OWN_ACTIVITY_STATE_3;
          break;
        default:
          throw new Error("Invalid wait_time value");
      }

      let bus_type_value;
      let duty_cycle_value;
      switch (bus_type) {
        case "UTILS_I3C_PURE_I3C_BUS":
          bus_type_value = UTILS_I3C_PURE_I3C_BUS;
          duty_cycle_value = duty_cycle_i3c;
          break;
        case "UTILS_I3C_I2C_MIXED_BUS":
          bus_type_value = UTILS_I3C_I2C_MIXED_BUS;
          duty_cycle_value = duty_cycle_i2c;
          break;
        default:
          throw new Error("Invalid bus_type value");
      }


      let adv_sda_hold_time_value;
      switch (bus_type) {
        case "-1":
          bus_type_value = -1;
          break;
        case "LL_I3C_SDA_HOLD_TIME_0_5":
          bus_type_value = 0;
          break;
        case "LL_I3C_SDA_HOLD_TIME_1_5":
          bus_type_value = I3C_TIMINGR1_SDA_HD_0;
          break;
        default:

      }

      console.info(``);
      console.info(`I3C Timings - Ctrl Input: clock_src_freq=${clock_src_freq}, i3c_pp_freq=${i3c_pp_freq}, i2c_od_freq=${i2c_od_freq}, duty_cycle=${duty_cycle_value}, bus_type=${bus_type_value}, wait_time=${wait_time_value}`);
      console.info(`I3C Timings - Ctrl adv Input: adv_tcapa=${adv_tcapa}, adv_sda_hold_time=${adv_sda_hold_time}, adv_bus_free_duration=${adv_bus_free_duration}, adv_bus_idle_duration=${adv_bus_idle_duration}`);

      const ctrl_Config = new utils_i3c_ctrl_timing_config_t(
        clock_src_freq,
        i3c_pp_freq*1000,
        i2c_od_freq*1000,
        duty_cycle_value,
        bus_type_value,
        wait_time_value,
        adv_tcapa*100,
        adv_sda_hold_time_value,
        adv_bus_free_duration*100,
        adv_bus_idle_duration*100
    );
      const timings = UTILS_I3C_CtrlGetTiming(ctrl_Config);
      console.info(`helper_i3c_compute_timing_ctrl: status=${timings.status}, timing_reg0=${toHex(timings.timing_reg0)}, timing_reg1=${toHex(timings.timing_reg1)}`
      );
      if (reg_name === "I3C_TIMINGR0"){
        return timings.timing_reg0;
      }else if (reg_name === "I3C_TIMINGR1"){
        return timings.timing_reg1;
      }else{
        throw new Error("Invalid timing name");
      }
    } catch (e) {
      compute_timing_ctrl_log_error(`helper_i3c_compute_timing_ctrl: ${e.message || e}`);
    }
  },

  /**
   * Compute the I3C timing target register value.
   *
   * @param {integer} clock_src_freq         I3C clock source (in Hz)
   * @param {integer} bus_available_duration Bus available duration (in ns)
   * @returns {integer} The computed timing register value (timing_reg1)
   */
  helper_i3c_compute_timing_tgt(
    clock_src_freq,
    bus_available_duration
  ) {
    try {
      console.info(``);
      console.info(`I3C Timings - tgt Input: clock_src_freq=${clock_src_freq}`);

      return UTILS_I3C_TgtGetTiming(clock_src_freq, bus_available_duration);

    } catch (e) {
      console.error(`I3C Timings - helper_i3c_compute_timing_tgt: ${e}`);
    }
  },

  helper_i3c_compute_timing_ctrl_error() {
    // Return latest error (empty string means no error)
    return COMPUTE_TIMING_CTRL_LAST_ERROR; // Return the actual error variable
  },

  /**
    * Retrieve all the interruptions set by I3C but not generated
    * @param {object} nvic_api Getter on NVIC api
    * @param {object} exti_api Getter on EXTI api
    * @param {object} resource Current resource
    * @param {object} config   Current configuration of the I3C
    * @returns {object}
    */
  helper_i3c_get_irq_handler(nvic_api, exti_api, resource, config) {
    let result = [];
    try {
      console.info(`helper_i3c_get_irq_handler: resource=${resource}, config=${JSON.stringify(config)}`
      );

      /* Reference all the elements which enable the I3C interruptions */
      const list_interrupts = [
        { enable: "enable_event_interruption", irq_handler_generation: "event_irq_handler_generation", nvic_context: "nvic_config_event", selector: "_EV" },
        { enable: "enable_error_interruption", irq_handler_generation: "error_irq_handler_generation", nvic_context: "nvic_config_error", selector: "_ERR" },
      ];

      /* Parse the list of interruptions */
      for (let index = 0; index < list_interrupts.length; index++) {
        const element = list_interrupts[index];
        /* Check if interruption has beenn enabled on the I3C */
        const enableInterruption = config?.system?.nvic?.[element['enable']] ?? false;
        if (!enableInterruption) continue;

        /* Check if IRQ handler generated is done on code generation or not */
        const irqHandlerGeneration = config.system?.nvic?.[element['irq_handler_generation']] ?? false;

        if (!irqHandlerGeneration) {
          const labels = config.info?.labels || [];
          const nvic_config = nvic_api.getNeedById(config.system?.nvic?.[element['nvic_context']].needs[0].id);
          /* Fill the object to be used for aliases in mx_hal_def.h */
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
      console.error(`helper_i3c_get_irq_handler: ${e}`);
    }
    return result;
  }
}
