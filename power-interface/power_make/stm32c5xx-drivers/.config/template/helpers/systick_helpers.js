/**
 * @file CORTEX/SysTick Helpers functions to provide service to the HAL components
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
 * @brief Check if SysTick configuration is possible for the given clock and rate.
 *
 * Usage example:
 * helper_cortex_systick_is_rate_supported($basic.clock_source,
 *   $get('clock.frequency', 'CORTEX'),
 *   $get('clock.frequency', 'FCLK'),
 *   '10HZ');
 *
 * Where rate is one of: '10HZ', '100HZ', '1KHZ'.
 *
 * @param {string} clockSource            'EXTERNAL' selects externalClock; 'INTERNAL' selects internalClock.
 * @param {number} externalClock          Frequency value for EXTERNAL (CORTEX) source.
 * @param {number} internalClock          Frequency value for INTERNAL (FCLK) source.
 * @param {string} rate                   Target tick rate: '10HZ' | '100HZ' | '1KHZ'
 *
 * @returns {boolean} True if the resulting reload value is within the allowed range; false otherwise.
 *
 * @note Inputs `externalClock` and `internalClock` are decimal (Hz).
 *       `MAX_RELOAD` is the 24-bit mask in hexadecimal (0x00FFFFFF).
 *       The reload value is computed as floor(freq/divisor) - 1 and must be > 0 and <= 0x00FFFFFF.
 *       Divisors: 1 for 1KHZ, 10 for 100HZ, 100 for 10HZ. Underflow is accepted so 0 is considered false.
 */
function helper_cortex_systick_is_rate_supported(clockSource, externalClock, internalClock, rate) {
  try {
    console.info(`helper_cortex_systick_is_rate_supported clockSource=${clockSource}, externalClock=${externalClock}, internalClock=${internalClock}, rate=${rate}`);

    const isExternal = clockSource === 'EXTERNAL';
    const freq = isExternal ? externalClock : internalClock;

    if (typeof externalClock !== 'number' || typeof internalClock !== 'number') {
      console.error('helper_cortex_systick_is_rate_supported: Invalid clock frequency type');
      return false;
    }
    if (freq <= 0) {
      console.error('helper_cortex_systick_is_rate_supported: Invalid clock frequency value');
      return false;
    }

    let divisor;
    const r = typeof rate === 'string' ? rate : '';
    switch (r) {
      case '1KHZ':
        divisor = 1;
        break;
      case '100HZ':
        divisor = 10;
        break;
      case '10HZ':
        divisor = 100;
        break;
      default:
        console.error('helper_cortex_systick_is_rate_supported: Unknown rate value');
        return false; // Unknown rate
    }

    const ticks = Math.floor(freq / divisor); // uint32 division semantics
    if (ticks <= 0) {
      console.error('helper_cortex_systick_is_rate_supported: Invalid tick value');
      return false; // matches C: (Ticks-1UL) underflow -> reject
    }

    const reload = ticks - 1;
    const MAX_RELOAD = 0x00FFFFFF; // 24-bit SysTick LOAD mask
    return reload <= MAX_RELOAD;
  } catch (e) {
    console.error(`helper_cortex_systick_is_rate_supported: ${e}`);
    return false;
  }
}



module.exports = {
  helper_cortex_systick_is_rate_supported
};
