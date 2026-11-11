/**
 * @file Helpers functions used for I2C SW component
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

const I2C_VALID_TIMING_NBR = 128;
const I2C_SPEED_FREQ_STANDARD = 0;
const I2C_SPEED_FREQ_FAST = 1;
const I2C_SPEED_FREQ_FAST_PLUS = 2;
const I2C_ANALOG_FILTER_DELAY_MIN = 50;
const I2C_ANALOG_FILTER_DELAY_MAX = 260;
const I2C_USE_ANALOG_FILTER = 1;
const I2C_DIGITAL_FILTER_COEF = 0;
const I2C_PRESC_MAX = 16;
const I2C_SCLDEL_MAX = 16;
const I2C_SDADEL_MAX = 16;
const I2C_SCLH_MAX = 256;
const I2C_SCLL_MAX = 256;
const SEC2NSEC = 1000000000;
const SMBUS_IDLE_TIMEOUT_MAX = 35000000;
const SMBUS_IDLE_TIMEOUT_MIN = 25000000;
const SMBUS_SLAVE_EXT_LOW_TIMEOUT_MAX = 25000000;
const SMBUS_MASTER_EXT_LOW_TIMEOUT_MAX = 10000000;

const I2C_Charac = [
  {
    freq: 100000,
    freq_min: 80000,
    freq_max: 120000,
    hddat_min: 0,
    vddat_max: 3450,
    sudat_min: 250,
    lscl_min: 4700,
    hscl_min: 4000,
    trise_min: 0,
    trise_max: 1000,
    tfall_min: 0,
    tfall_max: 300,
    dnf: I2C_DIGITAL_FILTER_COEF,
  },
  {
    freq: 400000,
    freq_min: 320000,
    freq_max: 480000,
    hddat_min: 0,
    vddat_max: 900,
    sudat_min: 100,
    lscl_min: 1300,
    hscl_min: 600,
    trise_min: 20,
    trise_max: 300,
    tfall_min: 20,
    tfall_max: 300,
    dnf: I2C_DIGITAL_FILTER_COEF,
  },
  {
    freq: 1000000,
    freq_min: 800000,
    freq_max: 1200000,
    hddat_min: 0,
    vddat_max: 450,
    sudat_min: 50,
    lscl_min: 500,
    hscl_min: 260,
    trise_min: 0,
    trise_max: 120,
    tfall_min: 0,
    tfall_max: 120,
    dnf: I2C_DIGITAL_FILTER_COEF,
  },
];

/**
 * @brief I2C UTILS Timings basic Configuration Structure definition
 */
class hal_i2c_utils_timing_basic_config_t {
  constructor(i2c_ker_clk, i2c_scl_clk) {
    this.i2c_ker_clk = i2c_ker_clk;
    this.i2c_scl_clk = i2c_scl_clk;
  }
}

/**
 * @brief I2C UTILS TImings advanced Configuration Structure definition
 */
class hal_i2c_utils_timing_advanced_config_t {
  constructor(i2c_ker_clk, i2c_scl_clk, trise, tfall, dnf, af) {
    this.i2c_ker_clk = i2c_ker_clk;
    this.i2c_scl_clk = i2c_scl_clk;
    this.trise = trise;
    this.tfall = tfall;
    this.dnf = dnf;
    this.af = af;
  }
}

class I2C_Timings_t {
  constructor(presc, tscldel, tsdadel, sclh, scll) {
    this.presc = presc;
    this.tscldel = tscldel;
    this.tsdadel = tsdadel;
    this.sclh = sclh;
    this.scll = scll;
  }
}

class hal_smbus_utils_timeouta_config_t {
  constructor(i2c_ker_clk, i2c_timeouta_mode, timeout) {
    this.i2c_ker_clk = i2c_ker_clk;
    this.i2c_timeouta_mode = i2c_timeouta_mode;
    this.timeout = timeout;
  }
}

class hal_smbus_utils_timeoutb_config_t {
  constructor(i2c_ker_clk, i2c_device_mode, timeout) {
    this.i2c_ker_clk = i2c_ker_clk;
    this.i2c_device_mode = i2c_device_mode;
    this.timeout = timeout;
  }
}

let I2c_valid_timing = new Array(I2C_VALID_TIMING_NBR)
  .fill()
  .map(() => new I2C_Timings_t());
let I2c_valid_timing_nbr;

function I2C_Compute_PRESC_SCLDEL_SDADEL(p_config, i2c_speed_mode) {
  let status = 1;
  let prev_presc = I2C_PRESC_MAX;
  let ti2cclk, tsdadel_min, tsdadel_max, tscldel_min, tafdel_min, tafdel_max;

  ti2cclk = SEC2NSEC / p_config.i2c_ker_clk;

  tafdel_min = p_config.af == 1 ? I2C_ANALOG_FILTER_DELAY_MIN : 0;
  tafdel_max = p_config.af == 1 ? I2C_ANALOG_FILTER_DELAY_MAX : 0;

  tsdadel_min =
    p_config.tfall +
    I2C_Charac[i2c_speed_mode].hddat_min -
    tafdel_min -
    (p_config.dnf + 3) * ti2cclk;

  tsdadel_max =
    I2C_Charac[i2c_speed_mode].vddat_max -
    p_config.trise -
    tafdel_max -
    (p_config.dnf + 4) * ti2cclk;

  tscldel_min = p_config.trise + I2C_Charac[i2c_speed_mode].sudat_min;

  if (tsdadel_min <= 0) {
    tsdadel_min = 0;
  }

  if (tsdadel_max <= 0) {
    tsdadel_max = 0;
  }

  for (let presc = 0; presc < I2C_PRESC_MAX; presc++) {
    for (let scldel = 0; scldel < I2C_SCLDEL_MAX; scldel++) {
      let tscldel = (scldel + 1) * (presc + 1) * ti2cclk;

      if (tscldel >= tscldel_min) {
        for (let sdadel = 0; sdadel < I2C_SDADEL_MAX; sdadel++) {
          let tsdadel = sdadel * (presc + 1) * ti2cclk;

          if (tsdadel >= tsdadel_min && tsdadel <= tsdadel_max) {
            if (presc !== prev_presc) {
              I2c_valid_timing[I2c_valid_timing_nbr].presc = presc;
              I2c_valid_timing[I2c_valid_timing_nbr].tscldel = scldel;
              I2c_valid_timing[I2c_valid_timing_nbr].tsdadel = sdadel;
              prev_presc = presc;
              I2c_valid_timing_nbr++;
              if (I2c_valid_timing_nbr >= I2C_VALID_TIMING_NBR) {
                return 1;
              } else {
                status = 0;
              }
            }
          }
        }
      }
    }
  }

  return status;
}

function I2C_Compute_SCLL_SCLH(p_config, i2c_speed_mode) {
  let ret = 0xffffffff;
  let ti2cclk, ti2c_speed, prev_error, dnf_delay, clk_min, clk_max, tafdel_min;

  ti2cclk = SEC2NSEC / p_config.i2c_ker_clk;
  ti2c_speed = SEC2NSEC / p_config.i2c_scl_clk;

  tafdel_min = p_config.af == 1 ? I2C_ANALOG_FILTER_DELAY_MIN : 0;

  dnf_delay = p_config.dnf * ti2cclk;

  clk_max = SEC2NSEC / I2C_Charac[i2c_speed_mode].freq_min;
  clk_min = SEC2NSEC / I2C_Charac[i2c_speed_mode].freq_max;

  prev_error = ti2c_speed;

  for (let count = 0; count < I2c_valid_timing_nbr; count++) {
    let tpresc = (I2c_valid_timing[count].presc + 1) * ti2cclk;

    for (let scll = 0; scll < I2C_SCLL_MAX; scll++) {
      let tscl_l =
        tafdel_min + p_config.dnf * ti2cclk + 2 * ti2cclk + (scll + 1) * tpresc;

      if (
        tscl_l > I2C_Charac[i2c_speed_mode].lscl_min &&
        ti2cclk < (tscl_l - tafdel_min - dnf_delay) / 4
      ) {
        for (let sclh = 0; sclh < I2C_SCLH_MAX; sclh++) {
          let tscl_h =
            tafdel_min +
            p_config.dnf * ti2cclk +
            2 * ti2cclk +
            (sclh + 1) * tpresc;
          let tscl = tscl_l + tscl_h + p_config.trise + p_config.tfall;

          if (
            tscl >= clk_min &&
            tscl <= clk_max &&
            tscl_h >= I2C_Charac[i2c_speed_mode].hscl_min &&
            ti2cclk < tscl_h
          ) {
            let error = Math.abs(tscl - ti2c_speed);

            if (error < prev_error) {
              prev_error = error;
              I2c_valid_timing[count].scll = scll;
              I2c_valid_timing[count].sclh = sclh;
              ret = count;
            }
          }
        }
      }
    }
  }

  return ret;
}

function I2C_UTILS_GetTimingBasic(p_config) {
  let reg = 0;
  let speed, idx;
  let p_advanced_config = {};
  I2c_valid_timing_nbr = 0;

  if (p_config.i2c_ker_clk != 0 && p_config.i2c_scl_clk != 0) {
    for (speed = 0; speed <= I2C_SPEED_FREQ_FAST_PLUS; speed++) {
      if (
        p_config.i2c_scl_clk >= I2C_Charac[speed].freq_min &&
        p_config.i2c_scl_clk <= I2C_Charac[speed].freq_max
      ) {
        p_advanced_config.i2c_ker_clk = p_config.i2c_ker_clk;
        p_advanced_config.i2c_scl_clk = p_config.i2c_scl_clk;
        p_advanced_config.trise = I2C_Charac[speed].trise_max / 2;
        p_advanced_config.tfall = I2C_Charac[speed].tfall_max / 2;
        p_advanced_config.dnf = I2C_Charac[speed].dnf;
        p_advanced_config.af = I2C_USE_ANALOG_FILTER;

        console.info("I2C Timings -", p_advanced_config);

        if (I2C_Compute_PRESC_SCLDEL_SDADEL(p_advanced_config, speed) != 0) {
          console.error(`I2C Timings -  I2C_Compute_PRESC_SCLDEL_SDADEL returns 0`);
          return {
            timing_reg: 0,
            reverse_timing: 0,
          };
        }

        idx = I2C_Compute_SCLL_SCLH(p_advanced_config, speed);

        if (idx < I2C_VALID_TIMING_NBR) {
          reg =
            ((I2c_valid_timing[idx].presc & 0x0f) << 28) |
            ((I2c_valid_timing[idx].tscldel & 0x0f) << 20) |
            ((I2c_valid_timing[idx].tsdadel & 0x0f) << 16) |
            ((I2c_valid_timing[idx].sclh & 0xff) << 8) |
            ((I2c_valid_timing[idx].scll & 0xff) << 0);

          reg = reg >>> 0; // convert to unsigned value
        }
        break;
      }
    }
  }

  if (reg != 0) {
    console.info("I2C Timings - Basic Output",
      "0x" + reg.toString(16).padStart(8, "0")
    );
    console.info("I2C Timings - Basic Output", I2c_valid_timing[idx]);
    return {
      timing_reg: reg,
      reverse_timing: I2C_UTILS_TimingReverse(p_advanced_config, reg),
    };
  }

  console.info("I2C Timings - Basic Calculation failed");
  return {
    timing_reg: 0,
    reverse_timing: 0,
  };
}

function I2C_UTILS_GetTimingAdvanced(p_config) {
  let reg = 0;
  let idx;
  I2c_valid_timing_nbr = 0;

  if (p_config.i2c_ker_clk != 0 && p_config.i2c_scl_clk != 0) {
    for (let speed = 0; speed <= I2C_SPEED_FREQ_FAST_PLUS; speed++) {
      if (
        p_config.i2c_scl_clk >= I2C_Charac[speed].freq_min &&
        p_config.i2c_scl_clk <= I2C_Charac[speed].freq_max
      ) {
        console.info("I2C Timings -", p_config);

        if (I2C_Compute_PRESC_SCLDEL_SDADEL(p_config, speed) != 0) {
          return {
            timing_reg: 0,
            reverse_timing: 0,
          };
        }

        idx = I2C_Compute_SCLL_SCLH(p_config, speed);

        if (idx < I2C_VALID_TIMING_NBR) {
          reg =
            ((I2c_valid_timing[idx].presc & 0x0f) << 28) |
            ((I2c_valid_timing[idx].tscldel & 0x0f) << 20) |
            ((I2c_valid_timing[idx].tsdadel & 0x0f) << 16) |
            ((I2c_valid_timing[idx].sclh & 0xff) << 8) |
            ((I2c_valid_timing[idx].scll & 0xff) << 0);

          reg = reg >>> 0; // convert to unsigned value
        }
        break;
      }
    }
  }

  if (reg != 0) {
    console.info("I2C Timings - Advanced Output",
      "0x" + reg.toString(16).padStart(8, "0")
    );
    console.info("I2C Timings - Advanced Output", I2c_valid_timing[idx]);
    return {
      timing_reg: reg,
      reverse_timing: I2C_UTILS_TimingReverse(p_config, reg),
    };
  }

  console.info("I2C Timings - Advanced Calculation failed");
  return {
    timing_reg: 0,
    reverse_timing: 0,
  };
}

function I2C_UTILS_TimingReverse(p_config, timing_reg) {
  const SEC2NSEC = 1000000000;
  const presc = (timing_reg >> 28) & 0xf;
  const scll = (timing_reg >> 0) & 0xff;
  const sclh = (timing_reg >> 8) & 0xff;
  const sdadel = (timing_reg >> 16) & 0xf;
  const scldel = (timing_reg >> 20) & 0xf;

  const tI2CCLK = SEC2NSEC / p_config.i2c_ker_clk;
  const tPresc = (SEC2NSEC * (presc + 1)) / p_config.i2c_ker_clk;

  const tSYNC1_min =
    p_config.tfall +
    I2C_ANALOG_FILTER_DELAY_MIN * p_config.af +
    (p_config.dnf + 2) * tI2CCLK;
  const tSYNC1_max =
    p_config.tfall +
    I2C_ANALOG_FILTER_DELAY_MAX * p_config.af +
    (p_config.dnf + 3) * tI2CCLK;
  const tSYNC2_min =
    p_config.trise +
    I2C_ANALOG_FILTER_DELAY_MIN * p_config.af +
    (p_config.dnf + 2) * tI2CCLK;
  const tSYNC2_max =
    p_config.trise +
    I2C_ANALOG_FILTER_DELAY_MIN * p_config.af +
    (p_config.dnf + 2) * tI2CCLK;

  const tSCL_min = tSYNC1_min + tSYNC2_min + (sclh + 1 + (scll + 1)) * tPresc;
  const duty_cycle_min = 100 * ((tSYNC1_min + (sclh + 1) * tPresc) / tSCL_min);

  const tSCL_max = tSYNC1_max + tSYNC2_max + (sclh + 1 + (scll + 1)) * tPresc;
  const duty_cycle_max = 100 * ((tSYNC1_max + (sclh + 1) * tPresc) / tSCL_max);

  let reverse_timing = {
    min: {
      tSCL: tSCL_min,
      fSCL: SEC2NSEC / tSCL_min,
      dc: duty_cycle_min,
    },
    max: {
      tSCL: tSCL_max,
      fSCL: SEC2NSEC / tSCL_max,
      dc: duty_cycle_max,
    },
  };

  console.info(`I2C Timings - tSCL min = ${reverse_timing.min.tSCL.toFixed(
      0)} ns => ${reverse_timing.min.fSCL.toFixed(
      0
    )} Hz, DC = ${reverse_timing.min.dc.toFixed(0)} %`
  );
  console.info(`I2C Timings - tSCL max = ${reverse_timing.max.tSCL.toFixed(
      0)} ns => ${reverse_timing.max.fSCL.toFixed(
      0
    )} Hz, DC = ${reverse_timing.max.dc.toFixed(0)} %`
  );

  return reverse_timing;
}

function DIV_ROUND_CLOSEST(x, d) {
  return (((x) + ((d) / 2)) / (d));
}

function SMBUS_UTILS_GetTimeoutB(p_config) {
  let ti2cclk = 0;
  let timeoutb = 0;

  if (p_config.i2c_ker_clk != 0) {
    ti2cclk = SEC2NSEC / p_config.i2c_ker_clk;

    if (ti2cclk > 0) {
      if (p_config.i2c_device_mode != "MASTER") {
        if (p_config.timeout <= SMBUS_SLAVE_EXT_LOW_TIMEOUT_MAX) {
          timeoutb = (DIV_ROUND_CLOSEST(p_config.timeout, (ti2cclk * 2048)) - 1);
        }
      }
      else {
        if (p_config.timeout <= SMBUS_MASTER_EXT_LOW_TIMEOUT_MAX) {
          timeoutb = (DIV_ROUND_CLOSEST(p_config.timeout, (ti2cclk * 2048)) - 1);
        }
      }
    }
  }
  return (timeoutb >>> 0); //convert to unsigned value
}

function SMBUS_UTILS_GetTimeoutA(p_config) {
  let ti2cclk = 0;
  let timeouta = 0;

  if (p_config.i2c_ker_clk != 0) {
    ti2cclk = SEC2NSEC / p_config.i2c_ker_clk;

    if (ti2cclk > 0) {
      if (p_config.i2c_timeouta_mode == "SDA_SCL_HIGH") {
        timeouta = (DIV_ROUND_CLOSEST(p_config.timeout, (ti2cclk * 4)) - 1);

        if (timeouta > 0xFFF) {
          timeouta = 0;
        }
      }
      else
      {
        if ((p_config.timeout <= SMBUS_IDLE_TIMEOUT_MAX) && (p_config.timeout >= SMBUS_IDLE_TIMEOUT_MIN)) {
          timeouta = (DIV_ROUND_CLOSEST(p_config.timeout, (ti2cclk * 2048)) - 1);
        }
      }
    }
  }
  return (timeouta >>> 0); //convert to unsigned value
}


/**
  * Retrieve all the interruptions set by i2c but not generated
  * @param {object} nvic_api Getter on NVIC api
  * @param {object} exti_api Getter on EXTI api (may not used)
  * @param {object} resource Current resource
  * @param {object} config current configuration of the I2C
  * @returns {object}
  */
function helper_i2c_get_irq_handler(nvic_api, exti_api, resource, config) {
  let result = [];
  try {
    // console.info(//   `helper_i2c_get_irq_handler: resource= ${resource}, config=${JSON.stringify(config)}`
    // );

    /** Reference all the elements which enable the I2C interruptions
     * @type {Array} List of interruptions available for the I2C
     * @property {string} enable Name of the property which enables the interruption
     * @property {string} irq_handler_generation Name of the property which indicates if IRQ handler generation is done or not
     * @property {string} nvic_context Name of the property which contains the NVIC context
     * @property {string} selector Suffix to be added to the alias name (empty if global interrupt, starts with underscore with NVIC selector if not empty)
     */
    const list_interrupts = [
      { enable: "enable_event_interruption", irq_handler_generation: "event_irq_handler_generation", nvic_context: "nvic_config_event", selector: "_EV" },
      { enable: "enable_error_interruption", irq_handler_generation: "error_irq_handler_generation", nvic_context: "nvic_config_error", selector: "_ERR" },
    ];

    /** Parse the list of interruptions */
    for (let index = 0; index < list_interrupts.length; index++) {
      const element = list_interrupts[index];
      /** Check if interruption has been enabled on the I2C */
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
    console.error(`helper_i2c_get_irq_handler: ${e}`);
  }
  return result;
}

module.exports = {
  helper_compute_timing_basic(i2c_ker_clk, i2c_scl_clk) {
    try {
      console.info(``);
      console.info(`I2C Timings - Basic Input: i2c_ker_clk=${i2c_ker_clk}, i2c_scl_clk=${i2c_scl_clk}`);

      const basicConfig = new hal_i2c_utils_timing_basic_config_t(
        i2c_ker_clk,
        i2c_scl_clk
      );
      return I2C_UTILS_GetTimingBasic(basicConfig);
    } catch (e) {
      console.error(`I2C Timings - Helper_compute_timing_basic: ${e}`);
    }
  },

  helper_compute_timing_advanced(
    i2c_ker_clk,
    i2c_scl_clk,
    t_rise,
    t_fall,
    dnf,
    an
  ) {
    try {
      console.info(``);
      console.info(`I2C Timings - Advanced Input: i2c_ker_clk=${i2c_ker_clk}, i2c_scl_clk=${i2c_scl_clk}, t_rise=${t_rise}, t_fall=${t_fall}, dnf=${dnf}, an=${an}`);

      const advancedConfig = new hal_i2c_utils_timing_advanced_config_t(
        i2c_ker_clk,
        i2c_scl_clk,
        t_rise,
        t_fall,
        dnf,
        an
      );
      const timings = I2C_UTILS_GetTimingAdvanced(advancedConfig);
      console.info(`helper_compute_timing_advanced: timings.timing_reg=${timings.timing_reg}`);
      return timings;
    } catch (e) {
      console.error(`I2C Timings - Helper_compute_timing_advanced: ${e}`);
    }
  },

  helper_compute_timeouta(i2c_ker_clk, i2c_timeouta_mode, timeout) {
    try {
      const timeouta_config = new hal_smbus_utils_timeouta_config_t(i2c_ker_clk, i2c_timeouta_mode, timeout);
      return SMBUS_UTILS_GetTimeoutA(timeouta_config);
    } catch (e) {
      console.error(`SMBUS TimeoutA: ${e}`);
    }
  },

  helper_compute_timeoutb(i2c_ker_clk, i2c_device_mode, timeout) {
    try {
      const timeoutb_config = new hal_smbus_utils_timeoutb_config_t(i2c_ker_clk, i2c_device_mode, timeout);
      return SMBUS_UTILS_GetTimeoutB(timeoutb_config);
    } catch (e) {
      console.error(`SMBUS TimeoutB: ${e}`);
    }
  },

  helper_i2c_get_irq_handler,
};
