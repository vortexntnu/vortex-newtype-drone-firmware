/**
 * @file Helpers functions used for FDCAN SW component
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
 * @brief Internal cache for memoization of bit timing calculations.
 *
 * This object stores previously computed bit timing results for FDCAN configurations,
 * allowing fast repeated queries and reducing redundant calculations.
 *
 * Example:
 *   fdcan_bit_timing_cache["{bus_param, timing_type}"] = { ...result }
 */
const fdcan_bit_timing_cache = {};

/**
 * @brief Internal storage and dynamic state for FDCAN instance RAM zones.
 *
 * This object is mutated by helper functions to track the start/end addresses and activation state
 * of each FDCAN instance (e.g., "FDCAN1", "FDCAN2", ...). It is updated dynamically during RAM zone
 * calculations and may be read, written, and normalized by multiple functions.
 *
 * Usage:
 *   - Each function that computes or checks RAM zones may update or read this object.
 *   - Entries are created, updated, or collapsed to zero-size as instances are activated/deactivated.
 *   - The structure is not static; it reflects the current state of all instances during runtime.
 *
 * Example:
 *   fdcan_instance_ram_zones["FDCAN1"] = { start: 0x0000, end: 0x01FF, activated: true, ram_overflow: false }
 *   fdcan_instance_ram_zones["FDCAN2"] = { start: 0x0200, end: 0x0200, activated: false, ram_overflow: false }
 *   fdcan_instance_ram_zones["FDCAN3"] = { start: 0x0200, end: 0x03FF, activated: true, ram_overflow: true }
 */
const fdcan_instance_ram_zones = {};


/**
 * @brief Compute the effective range after applying XIDAM masking.
 *
 * This helper applies the global extended ID AND mask (XIDAM) to a requested
 * [start, end] range and returns the reachable bounds:
 *   - The start is rounded up to the smallest ID >= start that satisfies
 *     (id & XIDAM) == id (all bits set in the ID must also be set in XIDAM).
 *   - The end is rounded down by masking: end = end & XIDAM (largest reachable end).
 *
 * Notes:
 *   - All IDs and the mask are normalized to 29 bits (extended IDs).
 *   - If the rounded-up start exceeds the 29-bit range, the returned start is
 *     set to 2^{29} (an invalid sentinel larger than any valid ID).
 *   - The returned bounds are independent; callers should still validate
 *     start <= end if needed.
 *
 * @param   {number} start Requested start ID (extended 29-bit).
 * @param   {number} end   Requested end ID (extended 29-bit).
 * @param   {number} mask  XIDAM global mask (extended 29-bit).
 * @returns {object} Effective range bounds with normalized 29-bit values:
 *                   { start: number, end: number }
 *
 * Example:
 *   // With XIDAM=0x1FFFFFF0, any ID requiring lower 4 bits cannot be reached.
 *   const range = helper_fdcan_calculate_effective_range(0x100, 0x1FF, 0x1FFFFFF0);
 */
function helper_fdcan_calculate_effective_range(start, end, mask) {
  const mask_29 = 0x1FFFFFFF; /* 29-bit mask for extended IDs */
  let effective_start = (start | 0) & mask_29; /* Mask start to 29 bits */
  let effective_end = (end | 0) & mask_29; /* Mask end to 29 bits */
  const xidam_29 = (mask | 0) & mask_29; /* Mask XIDAM to 29 bits */

  /* Logic: Effective start (Rounding Up)
   * If 'effective_start' contains bits that are NOT in the mask (forbidden bits),
   * the hardware will effectively see a different ID.
   * We need to "bump up" the start ID to the next valid value that the
   * mask actually allows, ensuring we don't catch IDs LOWER than the user intended.
   */
  while ((effective_start & xidam_29) !== effective_start) { /* While forbidden bits remain */
    /* Find the most significant 'forbidden' bit */
    let bumped_up = null; /* Next candidate after clearing forbidden bits */
    for (let i = 28; i >= 0; i--) { /* Scan MSB -> LSB (29-bit IDs: bit 28..0) */
      const bit = (1 << i) >>> 0; /* Build a 1<<i bitmask and coerce to unsigned 32-bit */
      /* Check if the current ID has a '1' where the Mask has a '0' (Forbidden Bit) */
      if ((effective_start & bit) && !(xidam_29 & bit)) { /* Forbidden bit found */
        /* * To "Bump Up":
         * 1. Clear the forbidden bit and every bit below it.
         * 2. Add '1' to the bit position immediately above the forbidden bit.
         * This jumps the range to the next ID that is physically representable.
         */
        const cleared_below = (effective_start & (~(((1 << (i + 1)) - 1) >>> 0))) >>> 0;
        bumped_up = (cleared_below + ((1 << (i + 1)) >>> 0)) >>> 0;
        break;
      }
    }
    if (bumped_up === null) break; /* No forbidden bit found (should not happen) */
    /* If the "Bump Up" pushes to pass the 29-bit limit, the range is impossible */
    if (bumped_up > mask_29) { /* Overflow beyond 29 bits: mark invalid */
      effective_start = (mask_29 + 1) >>> 0;
      break;
    }
    effective_start = bumped_up; /* Accept the new rounded-up value */
  }

  /* Logic: Effective end (Rounding Down)
   * For the end of the range, we simply strip away any bits the hardware can't see.
   * If a bit is forbidden by the mask, the hardware treats it as 0.
   * Therefore, we bitwise-AND with the mask to find the 'true' upper limit.
   */
  effective_end = (effective_end & xidam_29) >>> 0;

  return { start: effective_start >>> 0, end: effective_end >>> 0 }; /* Return normalized bounds */
}

/**
 * @brief Parse clock frequency from number or string with units.
 */
function parse_fdcan_clock_frequency(freq) {
  if (typeof freq === 'number') return freq;
  if (typeof freq !== 'string') return NaN;
  const m = freq.trim().match(/^([0-9]*\.?[0-9]+)\s*(kHz|KHz|khz|MHz|mhz|Mhz|Hz)?$/);
  if (!m) return NaN;
  const value = parseFloat(m[1]);
  const unit = (m[2] || 'Hz').toLowerCase();
  if (unit.includes('mhz')) return value * 1e6;
  if (unit.includes('khz')) return value * 1e3;
  return value; /* assume Hz */
}

/**
 * Calculate Time Quantum
 * @param   {number} input_clock FDCAN input clock
 * @param   {number} prescaler FDCAN prescaler
 * @returns {number} time_quantum Time Quantum
 */
function helper_fdcan_calculate_time_quantum(input_clock, prescaler) {
  let time_quantum;
  try {
    console.info(`helper_fdcan_calculate_time_quantum: input_clock=${input_clock}, prescaler=${prescaler} `);
    let clk = parse_fdcan_clock_frequency(input_clock);
    time_quantum = (prescaler / clk) * 1e+9;
    console.info(`helper_fdcan_calculate_time_quantum: ${time_quantum}`);
    return time_quantum;
  } catch (e) {
    console.error(`helper_fdcan_calculate_time_quantum: ${e}`);
    return 0;
  }
}

/**
 * Calculate bit time (ns) from a flat timing parameter object.
 *
 * The helper derives the time quantum via helper_fdcan_calculate_time_quantum using the provided prescaler
 * and FDCAN clock. It then multiplies the tq by (time_seg1 + time_seg2 + 1).
 *
 * @param   {object} params Flat parameters: { fdcan_clk, prescaler, time_seg1, time_seg2 }.
 * @returns {number} Bit time in ns, or 0 on error.
 */
function helper_fdcan_calculate_bit_time(params) {
  try {
    const prescaler = params?.prescaler;
    const seg1 = params?.time_seg1;
    const seg2 = params?.time_seg2;
    const clk = parse_fdcan_clock_frequency(params?.fdcan_clk);
    if (Number.isNaN(clk)) {
      console.error('helper_fdcan_calculate_bit_time: invalid clock_frequency');
      return 0;
    }

    const tq = helper_fdcan_calculate_time_quantum(clk, prescaler);
    console.info(`helper_fdcan_calculate_bit_time: ` +
                 `seg1=${seg1}, seg2=${seg2}, prescaler=${prescaler}, tq=${tq}`);

    const bit_time = tq * (seg1 + seg2 + 1);
    console.info(`helper_fdcan_calculate_bit_time: ${bit_time}`);
    return bit_time;
  } catch (e) {
    console.error(`helper_fdcan_calculate_bit_time: ${e}`);
    return 0;
  }
}

/**
  * Calculate bitrate (bps) from flat timing parameters and clock data.
  *
  * Computes the time quantum via helper_fdcan_calculate_time_quantum and applies the
  * standard bitrate formula: 1e9 / (tq * (seg1 + seg2 + 1)).
  *
  * @param   {object} params Flat parameters: { fdcan_clk, prescaler, time_seg1, time_seg2 }.
  * @returns {number} Bitrate in bps, or 0 on error.
 */
function helper_fdcan_calculate_bitrate(params) {
  try {
    const prescaler = params?.prescaler;
    const seg1 = params?.time_seg1;
    const seg2 = params?.time_seg2;
    const clk = parse_fdcan_clock_frequency(params?.fdcan_clk);
    if (Number.isNaN(clk)) {
      console.error('helper_fdcan_calculate_bitrate: invalid clock_frequency');
      return 0;
    }

    const tq = helper_fdcan_calculate_time_quantum(clk, prescaler); /* ns */
    const bitrate = 1e9 / (tq * (seg1 + seg2 + 1));

    console.info(`helper_fdcan_calculate_bitrate: seg1=${seg1}, seg2=${seg2}, ` +
           `prescaler=${prescaler}, clockDivider=${clk}, tq=${tq}, bitrate=${bitrate}`);
    return bitrate;
  } catch (e) {
    console.error(`helper_fdcan_calculate_bitrate: ${e}`);
    return 0;
  }
}

/**
 * Calculate sampling point (permille) from flat timing parameters.
 *
 * @param   {object} params Flat parameters: { time_seg1, time_seg2 }.
 * @returns {number} Sampling point in permille, or 0 on error.
 */
function helper_fdcan_calculate_sampling_point(params) {
  try {
    const seg1 = params?.time_seg1;
    const seg2 = params?.time_seg2;

    const sampling_point = ((seg1 * 1000) + 1000) / (seg1 + seg2 + 1);
    console.info(`helper_fdcan_calculate_sampling_point: ` +
                 `seg1=${seg1}, seg2=${seg2}, sampling_point=${sampling_point}`);
    return sampling_point;
  } catch (e) {
    console.error(`helper_fdcan_calculate_sampling_point: ${e}`);
    return 0;
  }
}

/**
 * Compute the FDCAN nominal or data bit timings from flat parameters.
 * This function mimics the logic of STM32_UTILS_FDCAN_ComputeBitTiming (C),
 * iterating over possible prescaler values to find a configuration that matches
 * the requested bitrate within tolerance.
 * It supports the no-CCU mode only.
 *
 * @param   {Object} params          Flat timing parameters:
 *                                   - { fdcan_clk, desired_sample_point_per_mille, desired_bitrate_kbps,
 *                                       bitrate_tolerance_per_mille, timing_type }
 * @returns {Object} Result object with:
 *   - {Object}  bit_timing   - { prescaler, time_seg1, time_seg2 }
 *   - {boolean} found_status - true if a valid configuration was found, false otherwise
 */
function helper_fdcan_compute_bit_timing(params) {
  try {
    /* Bit timing helper constants (kept private to this function) */
    const FDCAN_NOMINAL_LIMITS = { PRESCALER_MIN: 1, PRESCALER_MAX: 512,
                                   TIME_SEG1_MIN: 2, TIME_SEG1_MAX: 256,
                                   TIME_SEG2_MIN: 2, TIME_SEG2_MAX: 128,
                                   BIT_RATE_MAX: 1000 };
    const FDCAN_DATA_LIMITS    = { PRESCALER_MIN: 1, PRESCALER_MAX: 32,
                                   TIME_SEG1_MIN: 1, TIME_SEG1_MAX: 32,
                                   TIME_SEG2_MIN: 1, TIME_SEG2_MAX: 16,
                                   BIT_RATE_MAX: 8000 };

    const fdcan_default_bit_timing_result = () => ({
      bit_timing: { prescaler: 1, time_seg1: 1, time_seg2: 1 },
      found_status: false
    });

    /* Normalize input and exit early on invalid input */
    const timing_type = params?.timing_type || 'nominal';

    /* Extract flat fields used by the no-CCU path */
    const clk_hz = parse_fdcan_clock_frequency(params?.fdcan_clk);
    const clk_khz = clk_hz / 1000;
    const desired_sample_point = params?.desired_sample_point_per_mille;
    const desired_bitrate = params?.desired_bitrate_kbps;
    const tolerance = params?.bitrate_tolerance_per_mille;

    /* Memoization: cache results for repeated calls with same parameters */
    const cacheKey = JSON.stringify({
      clk:                  params.fdcan_clk,
      timing_type:          timing_type,
      desired_sample_point: desired_sample_point,
      desired_bitrate:      desired_bitrate,
      tolerance:            tolerance,
    });

    if (fdcan_bit_timing_cache.hasOwnProperty(cacheKey)) {
      return fdcan_bit_timing_cache[cacheKey];
    }

    if (!(Number.isFinite(clk_khz) && Number.isFinite(desired_sample_point)
          && Number.isFinite(desired_bitrate) && Number.isFinite(tolerance))) {
      console.error('helper_fdcan_compute_bit_timing: invalid inputs', { clk: params?.fdcan_clk, desired_sample_point,
                                                                         desired_bitrate, tolerance });
      const error_result = fdcan_default_bit_timing_result();
      fdcan_bit_timing_cache[cacheKey] = error_result;
      return error_result;
    }

    /* Select limits based on nominal/data phase */
    const LIM = (timing_type === 'nominal') ? FDCAN_NOMINAL_LIMITS : FDCAN_DATA_LIMITS;

    let found = false;
    let result = fdcan_default_bit_timing_result();

    const tmp_multiply_clk_sample_point = clk_khz * desired_sample_point;
    const tmp_num = (1000 * clk_khz) - tmp_multiply_clk_sample_point;

    for (let prescaler = LIM.PRESCALER_MIN; prescaler <= LIM.PRESCALER_MAX; prescaler++) {
      const product_presc_bitrate = prescaler * desired_bitrate * 1000;
      if (product_presc_bitrate === 0) continue;

      /* Use Math.round for closest integer, but keep all math as float */
      const tseg1 = Math.round(tmp_multiply_clk_sample_point / product_presc_bitrate) - 1;
      const tseg2 = Math.round(tmp_num / product_presc_bitrate);

      if (
        tseg1 >= LIM.TIME_SEG1_MIN && tseg1 <= LIM.TIME_SEG1_MAX &&
        tseg2 >= LIM.TIME_SEG2_MIN && tseg2 <= LIM.TIME_SEG2_MAX
      ) {
        /* Compute real sample point and bitrate as floats */
        const real_sample_point_per_mille = (1000 + 1000 * tseg1) / (1 + tseg1 + tseg2);
        const real_bitrate_kbps = (clk_khz * real_sample_point_per_mille)
                  / (1000 * (prescaler * (1 + tseg1)));

        /* Reject any configuration that exceeds the phase bitrate cap */
        if (real_bitrate_kbps > LIM.BIT_RATE_MAX) {
          continue;
        }

        /* Compute deviation in permille */
        const sum = desired_bitrate + real_bitrate_kbps;
        const diff = Math.abs(desired_bitrate - real_bitrate_kbps);
        const deviation = Math.ceil((2 * 1000 * diff) / sum);

        if (deviation > tolerance) continue;

        /* Found a valid configuration */
        result = {
          bit_timing: {
            prescaler: prescaler,
            time_seg1: tseg1,
            time_seg2: tseg2
          },
          found_status: true
        };
        found = true;
        break;
      }
    }

    if (!found) {
      console.info(`helper_fdcan_compute_bit_timing: ` +
                   `No valid parameters found for input (timing_type=${timing_type})`,
                   { clk: params?.fdcan_clk, desired_sample_point, desired_bitrate, tolerance });
    }

    fdcan_bit_timing_cache[cacheKey] = result;
    return result;
  } catch (e) {
    console.error(`helper_fdcan_compute_bit_timing: ${e}`);
    return fdcan_default_bit_timing_result();
  }
}

/**
 * @brief Computes the exclusive message RAM end offset for an FDCAN instance.
 *
 * Multiplies each configured element count (filters, FIFOs, buffers, Tx event)
 * by the hardware word size it consumes and adds it to the provided `ram_offset`
 * position, effectively returning the first word after the instance allocation.
 *
 * @param   {number} ram_offset         Start offset expressed in 32-bit words (word-aligned).
 * @param   {object} frame_filters      Filter configuration containing standard/extended counts.
 * @param   {object} message_ram_config RAM configuration containing FIFO, buffer, and Tx event sizes.
 * @returns {number} Exclusive end offset in 32-bit words from the RAM base.
 */
function helper_fdcan_calculate_allocated_end_ram_addr(ram_offset, frame_filters, message_ram_config) {
  try {
    /* Lookup table for FDCAN element size to words.
       Maps the FDCAN data field size (in bytes) to the number of 32-bit words required
       for allocation in the message RAM. The key is the data field size (8, 12, 16, 20, 24, 32, 48, 64 bytes),
       and the value is the number of words to allocate for each element. */
    const fdcan_lut_eltsize2words = {
      8: 4,
      12: 5,
      16: 6,
      20: 7,
      24: 8,
      32: 10,
      48: 14,
      64: 18
    };

    let addr_words = ram_offset                                       /* Ram offset is in words           */
                     += frame_filters.std_filters_nbr                 /* Std filter element size; 1 word  */
                     + (frame_filters.ext_filters_nbr * 2)            /* Ext filter element size; 2 words */
                     + (message_ram_config.rx_fifo_0?.rx_fifo0_elem_nbr
                        * fdcan_lut_eltsize2words[message_ram_config.rx_fifo_0?.rx_fifo0_elem_size])
                     + (message_ram_config.rx_fifo_1?.rx_fifo1_elem_nbr
                        * fdcan_lut_eltsize2words[message_ram_config.rx_fifo_1?.rx_fifo1_elem_size])
                     + (message_ram_config.rx_buffers?.rx_buffer_nbr
                        * fdcan_lut_eltsize2words[message_ram_config.rx_buffers?.rx_buffer_size])
                     + (message_ram_config.tx_event?.tx_event_nbr * 2) /* Tx event element size; 2 words  */
                     + (message_ram_config.tx_fifo_queue?.tx_buffer_nbr
                        * fdcan_lut_eltsize2words[message_ram_config.tx_fifo_queue?.tx_fifo_queue_elem_size])
                     + (message_ram_config.tx_fifo_queue?.tx_fifo_queue_elem_nbr
                        * fdcan_lut_eltsize2words[message_ram_config.tx_fifo_queue?.tx_fifo_queue_elem_size])

    return addr_words;
  } catch (e) {
    console.error(`helper_fdcan_calculate_allocated_end_ram_addr: ${e}`);
    return 0;
  }
}

/**
 * @brief Normalize message RAM zones across all FDCAN instances and return the target start.
 *
 * Maintains the global `fdcan_instance_ram_zones` layout (word-based start/end pairs) with
 * these rules:
 *   - Activated instances are packed sequentially. The first starts at 0 while subsequent
 *     instances start exactly at the previous exclusive end.
 *     This keeps active instances contiguous in message RAM with no unused gap.
 *   - Deactivated instances collapse to zero-sized zones located at the current frontier,
 *     allowing them to expand again later without breaking ordering. The slot is retained
 *     at the current packing point so re-activation does not reorder later instances.
 *   - When the instance being recomputed (`runtime_instance`) changes size, the following zones
 *     are shifted accordingly so the overall layout remains consistent. This guarantees that
 *     every instance after the resized one maintains its relative order and adjusted offsets.
 *
 * After recomputing, the helper updates global tracking variables:
 *   - `allocated_end_ram_addr` records the furthest exclusive end across all zones.
 *   - `ram_overflow` flags whether the runtime instance overflowed the provided `ram_size` (kB).
 *
 * @param   {string}  instance           Instance name whose start offset should be returned (e.g., 'FDCAN1').
 * @param   {string}  runtime_instance   Instance currently having its size recomputed (often same as `instance`).
 * @param   {object}  frame_filters      Filter configuration containing standard/extended counts.
 * @param   {object}  message_ram_config RAM configuration containing FIFO, buffer, and Tx event sizes.
 * @param   {number}  ram_size           Total RAM capacity in kilobytes (for boundary warnings).
 * @param   {boolean} is_activated       Whether `instance` is enabled in the UI/resource model.
 * @returns {number}  Start offset for `instance` expressed in 32-bit words.
 */
function helper_fdcan_check_instance_ram_zone(instance, runtime_instance, frame_filters,
                                              message_ram_config, ram_size, is_activated) {
  try {
    /* Validate the instance name early to avoid corrupting global zone state */
    if (!instance || typeof instance !== 'string') {
      console.error('helper_fdcan_check_instance_ram_zone: invalid instance');
      return 0;
    }

    /* Parse the numeric suffix for deterministic ordering (FDCAN1, FDCAN2, ...) */
    const parseIdx = (name) => {
      const idx = /^FDCAN(\d+)$/.exec(name)?.[1];
      return idx ? Number(idx) : Number.MAX_SAFE_INTEGER;
    };

    /* Ensure a zone entry exists and sync its activation flag with current UI/resource state */
    if (!fdcan_instance_ram_zones[instance]) {
      fdcan_instance_ram_zones[instance] = {
        start: 0,
        end: 0,
        activated: !!is_activated,
        ram_overflow: false
      };
    } else {
      fdcan_instance_ram_zones[instance].activated = !!is_activated;
    }

    /* Sort instance keys (FDCAN1, FDCAN2, ...) so packing order is deterministic */
    const orderedInstances = Object.keys(fdcan_instance_ram_zones)
      .sort((a, b) => parseIdx(a) - parseIdx(b));

    /*
     * This block handles instances that were enabled and later disabled by the user, so no empty slot is kept in RAM.
     * Deactivated instances are collapsed to zero-size zones at the current frontier.
     * First pass: walk the ordered list and (re)assign start/end offsets based on
     * activation state, while tracking the previously processed zone.
     */
    let prevStart = 0;
    let prevEnd = 0;
    let firstActivatedSeen = false;
    for (const inst of orderedInstances) {
      const zone = fdcan_instance_ram_zones[inst];
      /* Compute start offsets for activated vs deactivated instances */
      if (zone.activated) {
        if (!firstActivatedSeen) {
          /* The first active instance always starts at offset 0 */
          zone.start = 0;
          firstActivatedSeen = true;
        } else {
          /* Start equals the previous exclusive end to avoid a hole between instances */
          zone.end += prevEnd - zone.start;
          zone.start = prevEnd;
        }
      } else {
        /* Keep deactivated zones contiguous: collapse to zero-size at the current frontier */
        const proposedStart = firstActivatedSeen ? prevEnd : 0;
        /* Deactivated instances keep a reserved slot but occupy no space */
        zone.start = proposedStart;
        zone.end = proposedStart; /* zero-size */
      }

      /*
       * Recompute the message RAM usage for the runtime instance and update its end.
       * Other activated instances keep their previous end unless it is invalid.
       */
      if (inst === runtime_instance) {
        /* Recompute end from config */
        zone.end = helper_fdcan_calculate_allocated_end_ram_addr(zone.start, frame_filters, message_ram_config);
      } else {
        /* For non-runtime instances, keep existing end if activated; otherwise ensure zero-size */
        if (!zone.activated) {
          zone.end = zone.start;
        } else {
          if (typeof zone.end !== 'number' || zone.end < zone.start) {
            /* Guard against uninitialized or invalid end offsets */
            zone.end = zone.start; /* initialize minimal valid end */
          }
        }
      }

      /* Update previous trackers */
      prevStart = zone.start;
      prevEnd = zone.end;
    }

    /* Snapshot the target instance zone after recomputation */
    let ret = fdcan_instance_ram_zones[instance];

    /* Convert ram_size (kB) to words if provided to enforce capacity limits */
    const RamSize = (typeof ram_size === 'number') ? (ram_size * 256) : undefined; /* in WORDS if input is kB */

    /* Boundary check against total RAM capacity */
    if (typeof RamSize === 'number' && !Number.isNaN(RamSize) && ret.end > RamSize) {
      console.error(`helper_fdcan_check_instance_ram_zone: allocation exceeds RAM size (${ret.end} > ${RamSize})`);
      ret.ram_overflow = true;
    }
    else {
      ret.ram_overflow = false;
    }
    /* Log the computed zone and return the word-aligned start offset */
    console.info(`helper_fdcan_check_instance_ram_zone: ${instance} start=${ret.start}, end=${ret.end}`);
    /* Return start in 32-bit words directly (aligns with STM32 HAL expectations) */
    return ret.start;
  } catch (e) {
    console.error(`helper_fdcan_check_instance_ram_zone: ${e}`);
    return 0;
  }
}

/**
 * @brief Getter for the allocated exclusive end offset in words (per instance)
 * @param   {string}  instance Instance name (e.g., 'FDCAN1') to check only that instance
 * @param   {integer} ram_size Message RAM size
 * @returns {object} Payload with overflow status and error message
 *                   { ram_overflow: boolean, error_message: string }
 */
function helper_fdcan_get_allocated_end_ram_addr(ram_size, instance) {
  try {
    const zone = fdcan_instance_ram_zones[instance];
    const ram_size_words = ram_size * 256;
    const ram_overflow = ((zone.ram_overflow && zone.activated) === true);
    const error_message = ram_overflow ? `Message RAM allocation exceeds the available RAM for ${instance} (${ram_size_words} words available, ${zone.end} words allocated). Reduce the number or size of Tx/Rx FIFOs, buffers, or filters.`
                                       : '';

    console.info(`helper_fdcan_get_allocated_end_ram_addr: allocated=${zone.end} words, ram_overflow=${ram_overflow}`);
    return { ram_overflow, error_message };
  } catch (e) {
    console.error(`helper_fdcan_get_allocated_end_ram_addr: ${e}`);
    return { ram_overflow: false, error_message: '' };
  }
}

/**
  * Retrieve all the interruptions set by FDCAN but not generated
  * @param   {object}        nvic_api Getter on NVIC api
  * @param   {object}        exti_api Getter on EXTI api
  * @param   {object}        resource Current resource
  * @param   {object}        config   Current configuration of the FDCAN
  * @returns {Array<object>} Array of objects describing each interrupt without a generated handler.
  *                          Each object may include:
  *   - resource:     The FDCAN resource.
  *   - labels:       Array of label strings (if available).
  *   - first_label:  Boolean, true for the first label in a group.
  *   - alias:        String, alias for the interrupt (e.g., LABEL_IT0).
  *   - nvic_config:  NVIC configuration object for the interrupt.
  *   - generated:    Boolean, always false (indicates handler is not generated).
  */
function helper_fdcan_get_irq_handler(nvic_api, exti_api, resource, config) {
  let result = [];
  try {
    console.info(`helper_fdcan_get_irq_handler: resource=${resource}, config=${JSON.stringify(config)}`);

    /* Reference all the elements which enable the FDCAN interruptions */
    const list_interrupts = [
      { enable: "enable_interrupt_line0",
        irq_handler_generation: "irq_handler_generation_line0",
        nvic_context: "nvic_config_line0",
        selector: "_IT0" },
      { enable: "enable_interrupt_line1",
        irq_handler_generation: "irq_handler_generation_line1",
        nvic_context: "nvic_config_line1",
        selector: "_IT1" },
      { enable: "enable_interrupt_ccu",
        irq_handler_generation: "irq_handler_generation_ccu",
        nvic_context: "nvic_config_ccu",
        selector: "_CCU" }
    ];

    /* Parse the list of interruptions */
    for (let index = 0; index < list_interrupts.length; index++) {
      const element = list_interrupts[index];
      /* Check if interruption has beenn enabled on the FDCAN */
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
    console.error(`helper_fdcan_get_irq_handler: ${e}`);
  }
  return result;
}

/**
 * @brief Analyze Tx buffer interrupt settings and build macro descriptors.
 *
 * The `status_msg_interrupts` group may define Tx complete / Tx abort buffers
 * through either:
 *   - A 32-buffer bitfield object (`*_buffer_32`) exposing { size, value }.
 *   - A simple 3-buffer structure (`*_buffer`) exposing boolean buffer_0..2.
 *
 * This helper inspects whichever variant exists for each type and produces the
 * matching HAL macros (`HAL_FDCAN_IT_TX_CPLT_BUFFER_*`, `HAL_FDCAN_IT_TX_ABORT_BUFFER_*`).
 * When every buffer of a type is enabled, the consolidated `_ALL` macro is
 * emitted; otherwise a newline-separated list of individual macros is returned.
 *
 * @param  {object} status_msg_interrupts Interrupt configuration section containing
 *                                        Tx buffer enablement data.
 * @return {object} { tx_complete_buffers, tx_abort_buffers } describing labels
 *                   and rendered macro strings for each buffer type.
 */
function helper_fdcan_buffer_interrupts(status_msg_interrupts) {
  try {
    /*
     * Prepare result holders consumed by templates. Each contains labels for
     * the generator plus the final macro string assembled below.
     */
    let tx_complete = {
      funcLabel: 'TxBufferComplete',
      commentLabel: 'Tx complete buffer',
      value: ''
    };
    let tx_abort = {
      funcLabel: 'TxBufferCancellation',
      commentLabel: 'Tx abort complete buffer',
      value: ''
    };

    const BUFFER_SEP_32 = "\n" + " ".repeat(50) + "| ";
    const BUFFER_SEP_3 = "\n" + " ".repeat(58) + "| ";

    /*
     * Helper for 32-buffer configurations (bitfield style).
     * Reads the `interrupts[key]` structure expected to contain { size, value }
     * and renders either the ALL macro or a vertical list of per-buffer macros.
     */
    const process_32 = (key, type) => {
      const polynomial = status_msg_interrupts[key]; /* get buffer bitfield object */
      if (!polynomial || typeof polynomial.size !== 'number' || typeof polynomial.value !== 'number') return '';
      const size = polynomial.size; /* number of buffers */
      const bitfield = polynomial.value >>> 0; /* force unsigned 32-bit integer */
      /* If all buffers enabled, use _ALL macro */
      if (size === 32 && bitfield === 0xFFFFFFFF) {
        return `HAL_FDCAN_IT_TX_${type}_BUFFER_ALL`;
      }
      /* Otherwise, list enabled buffer macros */
      const continuation = BUFFER_SEP_32; /* Line continuation/indent used by templates */
      const enabledMacros = []; /* Collect enabled per-buffer macros */
      for (let bit = 0; bit < size; bit++) {
        const isSet = (((bitfield >>> bit) & 1) === 1); /* Check if bit is enabled in bitfield */
        if (isSet) {
          enabledMacros.push(`HAL_FDCAN_IT_TX_${type}_BUFFER_${bit}`); /* Macro for this buffer */
        }
      }
      return enabledMacros.join(continuation); /* Join macros with continuation separator */
    };

    /*
     * Helper for simple 3-buffer configurations (boolean properties buffer_0..2).
     * Builds a compact ALL macro when every buffer is enabled, otherwise joins
     * the individual macros with the proper continuation indentation.
     */
    const process_3 = (key, type) => {
      const buffer = status_msg_interrupts[key];
      if (!buffer) return '';
      const macros = [
        buffer.buffer_0 ? `HAL_FDCAN_IT_TX_${type}_BUFFER_0` : null,
        buffer.buffer_1 ? `HAL_FDCAN_IT_TX_${type}_BUFFER_1` : null,
        buffer.buffer_2 ? `HAL_FDCAN_IT_TX_${type}_BUFFER_2` : null
      ].filter(Boolean);
      if (macros.length === 3) {
        return `HAL_FDCAN_IT_TX_${type}_BUFFER_ALL`;
      }
      if (macros.length > 0) {
        return macros.join(BUFFER_SEP_3);
      }
      return '';
    };

    /*
     * Each buffer type (Tx complete / Tx abort) can be defined either via the
     * 32-buffer bitfield variant or the 3-buffer boolean variant. Only one of the
     * keys should exist per type; select whichever configuration is present.
     */
    if (status_msg_interrupts.it_tx_complete === true) {
      if (Object.prototype.hasOwnProperty.call(status_msg_interrupts, 'tx_complete_buffer_32')) {
        tx_complete.value = process_32('tx_complete_buffer_32', 'CPLT');
      } else if (Object.prototype.hasOwnProperty.call(status_msg_interrupts, 'tx_complete_buffer')) {
        tx_complete.value = process_3('tx_complete_buffer', 'CPLT');
      }
    }

    if (status_msg_interrupts.it_tx_abort_complete === true) {
      if (Object.prototype.hasOwnProperty.call(status_msg_interrupts, 'tx_abort_complete_buffer_32')) {
        tx_abort.value = process_32('tx_abort_complete_buffer_32', 'ABORT');
      } else if (Object.prototype.hasOwnProperty.call(status_msg_interrupts, 'tx_abort_complete_buffer')) {
        tx_abort.value = process_3('tx_abort_complete_buffer', 'ABORT');
      }
    }

    /* Return both Tx complete and abort buffer macros */
    const payload = {
      tx_complete_buffers: tx_complete,
      tx_abort_buffers: tx_abort
    };
    console.info('helper_fdcan_buffer_interrupts: return payload', JSON.stringify(payload));
    return payload;
  } catch (e) {
    console.error('helper_fdcan_buffer_interrupts: error', e);
    return {
      tx_complete_buffers: { funcLabel: 'TxBufferComplete', commentLabel: 'Tx complete buffer', value: '' },
      tx_abort_buffers: { funcLabel: 'TxBufferCancellation', commentLabel: 'Tx abort complete buffer', value: '' }
    };
  }
}

/**
 * @brief Collects enabled FDCAN interrupts per line for code generation payloads.
 *
 * Returns formatted macro strings for line 0/1, a summary list (including Tx buffer helpers,
 * CCU when applicable, and watermark info), plus the combined line macro.
 *
 * @param  {object}  interrupts  The `additional.interrupts` object containing all interrupt groups.
 * @param  {boolean} ccu_access  When true, include CCU-related interrupts.
 * @returns {object} Formatted payload with summaries, per-line strings, line macro, grouping label,
 *                   watermark arrays, and buffer macros.
 */
function helper_fdcan_interrupts_by_line(interrupts, ccu_access) {
  try {
    /* Guard: empty input should return a stable, empty payload */
    if (!interrupts) {
      console.error("helper_fdcan_interrupts_by_line_idea: interrupts parameter is null or undefined");
      return {
        all_interrupts: [""],
        interrupts_by_line: { line_0: "", line_1: "" },
        lines: "",
        interrupts_or_group: { funcLabel: "", commentLabel: "" },
        watermark: { select: [], level: [], commentLabel: [] }
      };
    }

    /* --- Local helpers & accumulators --- */
    const MACRO_PREFIX = "HAL_FDCAN_";
    const GROUP_PREFIX = MACRO_PREFIX + "IT_GROUP_";
    const SEP = "\n" + " ".repeat(41) + "| ";
    const META_SKIP_TOKENS = ["interrupt_lines", "complete_buffer", "watermark_"];
    const CCU_TOKEN = "ccu_it_";
    const WATERMARK_TOKEN = "watermark";
    const LINE_0 = "LINE_0";
    const LINE_1 = "LINE_1";
    const WATERMARKS = [
      { token: 'tx_evt_fifo', select: 'watermark_tx_event_fifo', label: 'Tx event FIFO' },
      { token: 'rx_fifo_0', select: 'watermark_rx_fifo_0', label: 'Rx FIFO 0' },
      { token: 'rx_fifo_1', select: 'watermark_rx_fifo_1', label: 'Rx FIFO 1' }
    ];

    /* Accumulators used to build template payloads */
    const line0 = [];
    const line1 = [];
    const all = [];
    const ccu_interrupts = [];
    const watermark_select = [];
    const watermark_level = [];
    const watermark_label = [];

    /* Join macro lists with the continuation separator used by templates */
    const formatMacros = arr => arr.length ? arr.join(SEP) : "";

    /*
     * Watermark interrupts are handled separately because they require three
     * parallel outputs: select macro, level value, and display label.
     */
    const addWatermark = (group, interruptName) => {
      const match = WATERMARKS.find(entry => interruptName.includes(entry.token));
      if (!match) return;

      const macro = MACRO_PREFIX + match.select.toUpperCase();
      watermark_select.push(macro);
      watermark_level.push(group[match.select]);
      watermark_label.push(match.label || macro);
    };

    /*
     * Push either the group macro (when a single line applies to the group)
     * or the individual interrupt macro (when lines are per-interrupt).
     */
    const pushGroupOrInterrupt = (group, groupMacro, groupLine, groupAdded, interruptName) => {
      if (Object.prototype.hasOwnProperty.call(group, "interrupt_lines")) {
        if (!groupAdded) {
          if (groupLine === LINE_0 && !line0.includes(groupMacro)) line0.push(groupMacro);
          else if (groupLine === LINE_1 && !line1.includes(groupMacro)) line1.push(groupMacro);
          return true;
        }
        return groupAdded;
      }

      /* Individual interrupts: consult the interrupt-specific `_interrupt_lines` flag */
      const line = group[interruptName + "_interrupt_lines"];
      const macro = MACRO_PREFIX + interruptName.toUpperCase();
      if (line === LINE_0) line0.push(macro);
      else if (line === LINE_1) line1.push(macro);
      return groupAdded;
    };

    /*
     * One pass over every interrupt group:
     * 1) Skip metadata entries.
     * 2) Collect CCU interrupts and watermark entries (special output).
     * 3) For regular interrupts, assign to line0/line1 and add to summary list.
     */
    for (const [groupName, group] of Object.entries(interrupts)) {
      const groupMacro = GROUP_PREFIX + groupName.replace(/_interrupts$/, "").toUpperCase();
      const groupLine = group.interrupt_lines;
      let groupAdded = false;

      for (const [interruptName, interrupt] of Object.entries(group)) {
        /* Skip non-interrupt metadata entries early */
        const isMeta = (!interrupt) || META_SKIP_TOKENS.some(token => interruptName.includes(token));
        if (isMeta) continue;

        const macro = MACRO_PREFIX + interruptName.toUpperCase();

        /* CCU interrupts are emitted only when CCU access is enabled */
        if (interruptName.includes(CCU_TOKEN)) {
          if (ccu_access) ccu_interrupts.push(macro);
          /* Skip normal line assignment: CCU interrupts are reported in a dedicated list */
          continue;
        }

        /* Watermark interrupts are normal entries, but also feed watermark config arrays */
        if (interruptName.includes(WATERMARK_TOKEN)) {
          addWatermark(group, interruptName);
        }

        /* Grouped vs individual interrupts (line 0/1) */
        groupAdded = pushGroupOrInterrupt(group, groupMacro, groupLine, groupAdded, interruptName);

        /* Track all interrupts for the summary list */
        all.push(macro);
      }
    }

    /* Build the line enable macro used by the template */
    const lines = [
      line0.length ? "HAL_FDCAN_IT_LINE_0" : "",
      line1.length ? "HAL_FDCAN_IT_LINE_1" : ""
    ].filter(Boolean).join(" | ");

    /*
     * Decide whether the template should say "groups" or "interrupts".
     * If any macro includes "GROUP" we label the output as grouped.
     */
    const hasGroupMacro = [...line0, ...line1].some(m => m.includes("GROUP"));
    const is_group = hasGroupMacro
      ? { funcLabel: "InterruptGroups", commentLabel: "interrupt groups" }
      : { funcLabel: "Interrupts", commentLabel: "interrupts" };

    /* Buffer macros for Tx complete and Tx abort */
    const bufferInfo = helper_fdcan_buffer_interrupts(interrupts.status_msg_interrupts || {});

    /*
     * Compose the payload consumed by templates:
     * - all_interrupts: summary list + buffer helpers + CCU macros
     * - interrupts_by_line: per-line macro strings
     * - lines: combined HAL line enable macro
     * - interrupts_or_group: label for template wording
     * - watermark: select/level/labels arrays for watermark helper calls
     */
    const allInterrupts = [
      { funcLabel: '', commentLabel: 'individual', value: formatMacros(all) },
      bufferInfo.tx_complete_buffers,
      bufferInfo.tx_abort_buffers,
      { funcLabel: '', ccuLabel: '_CCU', commentLabel: 'CCU', value: formatMacros(ccu_interrupts) }
    ];

    const interruptsByLine = {
      line_0: formatMacros(line0),
      line_1: formatMacros(line1)
    };

    const watermarkInfo = {
      select: watermark_select,
      level: watermark_level,
      commentLabel: watermark_label
    };

    const result = {
      all_interrupts: allInterrupts,
      interrupts_by_line: interruptsByLine,
      lines,
      interrupts_or_group: is_group,
      watermark: watermarkInfo
    };
    console.info('helper_fdcan_interrupts_by_line: return', JSON.stringify(result));
    return result;
  } catch (e) {
    console.error('helper_fdcan_interrupts_by_line: error', e);
    return {
      all_interrupts: [""],
      interrupts_by_line: { line_0: "", line_1: "" },
      lines: "",
      interrupts_or_group: { funcLabel: "", commentLabel: "" },
      watermark: { select: [], level: [], commentLabel: [] }
    };
  }
}

/**
 * @brief Check whether any interrupt is mapped to the requested line.
 *
 * This helper is a lightweight presence check that returns true when at least
 * one interrupt is assigned to the requested line.
 *
 * @param   {object}        interrupts The `additional.interrupts` object containing all interrupt groups.
 * @param   {string|number} line Line selector: "LINE_0", "LINE_1", 0, or 1.
 * @returns {boolean}       True when the requested line is used by any interrupt.
 */
function helper_fdcan_interrupt_line_used(interrupts, line) {
  try {
    if (!interrupts) return false;

    const META_SKIP_TOKENS = ["interrupt_lines", "complete_buffer", "watermark_"];
    const normalized = String(line ?? '').toUpperCase();
    const targetLine = normalized.includes('1') ? 'LINE_1' : 'LINE_0';

    for (const group of Object.values(interrupts)) {
      if (!group || typeof group !== 'object') continue;

      const hasGroupLine = Object.prototype.hasOwnProperty.call(group, 'interrupt_lines');
      if (hasGroupLine) {
        if (group.interrupt_lines === targetLine) return true;
        continue;
      }

      for (const [interruptName, interrupt] of Object.entries(group)) {
        const isMeta = (!interrupt) || META_SKIP_TOKENS.some(token => interruptName.includes(token));
        if (isMeta) continue;

        const lineKey = interruptName + '_interrupt_lines';
        if (group[lineKey] === targetLine) return true;
      }
    }

    return false;
  } catch (e) {
    console.error(`helper_fdcan_interrupt_line_used: ${e}`);
    return false;
  }
}

/**
  * @brief Count how many times a property named `key` matches a target value in a nested graph.
  *
  * This helper is used by the JSON rules to answer questions like:
  *   - "How many filters have filter_config == TO_RX_FIFO_0?"
  *   - "Is any CCU interrupt enabled somewhere?" (count > 0)
  *
  * Semantics (kept intentionally simple and deterministic):
  *   - The function walks the entire object/array graph (iterative depth-first traversal).
  *   - It only counts matches found within the value-subtree of properties whose name equals `key`.
  *     (So unrelated arrays/values elsewhere do not contribute to the result.)
  *   - Primitive matching uses strict equality (===). If `value` is an array of options, a
  *     primitive candidate matches when `value.includes(candidate)` is true.
  *
  * Implementation notes for maintainers (C-friendly):
  *   - Uses an explicit stack (no recursion) to avoid call-depth issues.
  *   - Tracks visited nodes with WeakSet to avoid infinite loops on cyclic graphs.
  *   - Maintains two visited sets because the same object can be visited in two contexts:
  *       (1) normal traversal (searching for properties named `key`)
  *       (2) inside a matched `key` value-subtree (where primitives are counted)
  *
  * @param   {object|Array}   object Root object/array to traverse.
  * @param   {string}         key    Property name to search for.
  * @param   {any|Array<any>} value  Target value (scalar) or list of acceptable values.
  * @returns {number}         Number of matches found (0 means "none").
  */
function helper_fdcan_object_value_count(object, key, value) {
  try {
    const isMatch = (candidate) => {
      if (typeof candidate === 'undefined') return false;
      if (Array.isArray(value)) return value.includes(candidate);
      return candidate === value;
    };

    let matchCount = 0;

    /* Track visited nodes separately depending on whether we're scanning a `key` value subtree */
    const visitedOutside = new WeakSet();
    const visitedInside = new WeakSet();

    /* Each stack entry carries a flag: insideKeyValue = true means "count primitives here" */
    const stack = [{ node: object, insideKeyValue: false }];

    while (stack.length > 0) {
      const { node, insideKeyValue } = stack.pop();

      if (node === null || typeof node !== 'object') {
        /* Primitive: only count if we're inside a `key` value subtree */
        if (insideKeyValue && isMatch(node)) matchCount++;
        continue;
      }

      /* Cycle handling (context-aware) */
      const visited = insideKeyValue ? visitedInside : visitedOutside;
      if (visited.has(node)) continue;
      visited.add(node);

      if (Array.isArray(node)) {
        /* Arrays: just traverse elements, keep same context */
        for (let i = 0; i < node.length; i++) {
          stack.push({ node: node[i], insideKeyValue });
        }
        continue;
      }

      /* Objects: always traverse children to find more `key` properties */
      /* If we are inside a key-value subtree, all children are also inside */
      for (const [prop, val] of Object.entries(node)) {
        /* If this property name matches `key`, scan its value subtree in "inside" mode */
        if (prop === key) {
          stack.push({ node: val, insideKeyValue: true });
        }

        /* Continue traversal to find nested `key` properties */
        stack.push({ node: val, insideKeyValue });
      }
    }

    console.info(`helper_fdcan_object_value_count: found ${matchCount} matches for ${key} == ${value}`);
    return matchCount;
  } catch (e) {
    console.error(`helper_fdcan_object_has: ${e}`);
    return 0;
  }
}

/**
 * @brief Check whether any configured extended filter effectively applies XIDAM.
 *
 * Scans the provided extended filter list and returns true when no configured
 * filter applies the global XIDAM mask (i.e., XIDAM is effectively unused).
 *
 * @param   {Array<object>} extended_filters List of extended filter entries.
 * @param   {number}        xidam            Global extended ID AND mask (29-bit).
 * @returns {boolean}       True when XIDAM is unused; otherwise false.
 */
function helper_fdcan_check_xidam_applicability(extended_filters, xidam) {
  try {
    let result = false; /* Boolean flag: true when a violation is detected */

    const has_mask_applicator = extended_filters.some((filter_entry) => { /* Look for any filter that uses XIDAM */
      if (!filter_entry || filter_entry.configure !== true) return false; /* Only configured filters matter */
      /* Enabling XIDAM has no meaning when:
         Filter type is not CLASSIC, DUAL or RANGE, or filter config is DISABLE.
         And filter config is not TO_RX_BUFFER. */
      const applies_xidam = (filter_entry.filter_config !== 'DISABLE' && filter_entry.filter_type  !== 'RANGE_NO_EIDM')
        || (filter_entry.filter_config === 'TO_RX_BUFFER'); /* RX buffer still uses XIDAM */
      return applies_xidam;
    });

    if (!has_mask_applicator) { /* No filter uses XIDAM: warn user */
      result = true;
    }

    return result; /* Return boolean only */
  } catch (e) {
    console.error(`helper_fdcan_check_extended_filter_id_mask_array: ${e}`); /* Log unexpected errors */
    return false; /* Fail-safe payload */
  }
}

/**
 * @brief Check a single extended filter against the global XIDAM mask.
 *
 * Evaluates CLASSIC/DUAL/RANGE and TO_RX_BUFFER behaviors and returns a payload
 * indicating whether a violation is detected, plus a diagnostic message.
 *
 * Error messages and why they are violations:
 *   - "ID1 ... contains bits suppressed by XIDAM.": XIDAM is an AND mask; any bit
 *     set in ID1 but cleared in XIDAM is forced to 0 by hardware, making the ID
 *     unreachable.
 *   - "ID2 ... contains bits suppressed by XIDAM.": Same as ID1 but for the
 *     second ID in DUAL mode.
 *   - "Bits required by Filter ID and Mask are suppressed by Global XIDAM...":
 *     In CLASSIC mode, bits set in both ID1 and ID2 are mandatory to be 1s. If XIDAM
 *     clears any of those bits, the intended match condition cannot be met.
 *   - "The configured range is masked out by the Global Mask (XIDAM).": In RANGE
 *     mode, XIDAM is stricter than the start ID, so the entire range collapses.
 *   - "The range start ID is modified by the Global Mask...": Masking forces the
 *     lower bound upward to the next valid ID; the requested start is invalid.
 *   - "The range end ID is modified by the Global Mask...": Masking forces the
 *     upper bound downward; the requested end is invalid.
 *   - "Effective Ceiling ... is lower than Effective Floor ...": After masking,
 *     the range becomes inverted (empty set).
 *
 * @param   {object} extended_filter Single filter entry with filter_type/id fields.
 * @param   {number} xidam           Global extended ID AND mask (29-bit).
 * @param   {string} target          Options filter: "ID1", "ID2", or "ANY" (default).
 * @returns {object} Result payload with status and message.
 *                   { hit: boolean, error_message: string }
 */
function helper_fdcan_check_extended_filter_id_mask(extended_filter, xidam, target) {
  try {
    const mask_29 = 0x1FFFFFFF; /* 29-bit mask for extended IDs */

    let error_message = 'No violation detected.'; /* Default message when no issue is found */
    let result = false; /* Boolean flag: true when a violation is detected */
    const mode = (extended_filter?.filter_type || ''); /* CLASSIC/DUAL/RANGE */
    const id1 = (extended_filter?.filter_id1 | 0) & mask_29; /* First ID (masked to 29 bits) */
    const id2 = (extended_filter?.filter_id2 | 0) & mask_29; /* Second ID (masked to 29 bits) */
    const effective_xidam = (xidam | 0) & mask_29; /* Normalize XIDAM to 29 bits */
    const filter_config = (extended_filter?.filter_config || ''); /* Filter destination or DISABLE */
    const target_norm = String(target || 'ANY').toUpperCase();

    /*
     * Set the violation only if it targets the requested target.
     * Targets: 'ID1', 'ID2', or 'ANY'. Requested target 'ANY' means "accept all".
     */
    const set_violation_if_requested = (violation_target, message) => {
      if ((target_norm !== 'ANY') && (target_norm !== violation_target)) return false;
      error_message = message;
      result = true;
      return true;
    };

    if (filter_config === 'TO_RX_BUFFER') { /* Rx buffer: only ID1 is relevant */
      if ((id1 & effective_xidam) !== id1) { /* ID1 uses bits masked by XIDAM */
        set_violation_if_requested('ID1', `Extended filter ID1 (0x${id1.toString(16)}) conflicts with the current extended ID mask. Update Filter ID1 or change the extended ID mask.`);
      }
    } else if (mode === 'CLASSIC') { /* Classic mask mode: check reachability */
      const conflict_bits = id1 & id2 & (~effective_xidam & mask_29); /* Bits required but masked */
      if (conflict_bits !== 0) {
        set_violation_if_requested('ANY', `The current extended ID mask suppresses bits required by Filter ID1 and Filter ID2 (conflict bits: 0x${conflict_bits.toString(16)}). Update the filter values or change the extended ID mask.`);
      }
    } else if (mode === 'DUAL') { /* Dual ID mode: validate each ID */
      if ((id1 & effective_xidam) !== id1) {
        set_violation_if_requested('ID1', `Extended filter ID1 (0x${id1.toString(16)}) conflicts with the current extended ID mask. Update Filter ID1 or change the extended ID mask.`);
      }
      if ((id2 & effective_xidam) !== id2) {
        set_violation_if_requested('ID2', `Extended filter ID2 (0x${id2.toString(16)}) conflicts with the current extended ID mask. Update Filter ID2 or change the extended ID mask.`);
      }
    } else if (mode === 'RANGE') { /* Range mode: check if mask collapses the range */
      if (effective_xidam < id1) { /* Mask blocks the entire range start */
        set_violation_if_requested('ID1', `The current extended ID mask suppresses the configured range start, so this range cannot be matched. Adjust the range or change the extended ID mask.`);
      } else {
        const effective_range = helper_fdcan_calculate_effective_range( id1, id2, effective_xidam);
        const effective_id1 = effective_range.start;
        const effective_id2 = effective_range.end;

        if (effective_id1 !== id1) { /* Lower bound shifted by mask */
          set_violation_if_requested('ID1', `Extended filter start ID changes from 0x${id1.toString(16)} to 0x${effective_id1.toString(16)} after applying the current extended ID mask. Adjust Filter ID1 or change the extended ID mask.`);
        } else if (effective_id2 !== id2) { /* Upper bound shifted by mask */
          set_violation_if_requested('ID2', `Extended filter end ID changes from 0x${id2.toString(16)} to 0x${effective_id2.toString(16)} after applying the current extended ID mask. Adjust Filter ID2 or change the extended ID mask.`);
        } else if (effective_id2 < effective_id1) { /* Range inverted after masking */
          set_violation_if_requested('ANY', `After applying the current extended ID mask, the effective range is empty (start 0x${effective_id1.toString(16)}, end 0x${effective_id2.toString(16)}). Adjust the filter range or change the extended ID mask.`);
        }
      }
    }

    console.info('helper_fdcan_check_extended_filter_id_mask:', error_message); /* Trace final decision */
    return { hit: result, error_message }; /* Return boolean + message */
  } catch (e) {
    console.error(`helper_fdcan_check_extended_filter_id_mask: ${e}`); /* Log unexpected errors */
    return { hit: false, error_message: 'Extended ID mask check failed.' }; /* Fail-safe payload */
  }
}


module.exports = {
  helper_fdcan_calculate_bitrate,
  helper_fdcan_calculate_time_quantum,
  helper_fdcan_calculate_bit_time,
  helper_fdcan_calculate_sampling_point,
  helper_fdcan_compute_bit_timing,
  helper_fdcan_get_irq_handler,
  helper_fdcan_interrupts_by_line,
  helper_fdcan_interrupt_line_used,
  helper_fdcan_get_allocated_end_ram_addr,
  helper_fdcan_check_instance_ram_zone,
  helper_fdcan_object_value_count,
  helper_fdcan_check_xidam_applicability,
  helper_fdcan_check_extended_filter_id_mask
};
