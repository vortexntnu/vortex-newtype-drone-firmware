/**
 * @file Helpers functions used for USB SW component
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
 * Concatenate two hex values by putting the first in LSB and the second in MSB.
 * Example: helper_usb_pack_dbl_buffer_sizes(0x40, 0x40) => 0x00400040
 *
 * @param {hexadecimal|number|string} size  first value (LSB, lower 8 bits)
 * @param {hexadecimal|number|string} size1 second value (MSB, higher 8 bits), default is 0
 * @returns {number} packed value (unsigned 32-bit, data in lower 16 bits)
 */
function helper_usb_pack_dbl_buffer_sizes(size, size1 = 0) {
  const parseHex16 = (v) => {
    // Parse an input as a 16-bit value, accepting either a number or a hex string.
    if (v === undefined || v === null || v === "") return 0;
    // Trim strings but keep numbers as-is.
    const s = (typeof v === "string") ? v.trim() : v;
    // Interpret strings as hexadecimal (base 16).
    const n = (typeof s === "number") ? s : Number.parseInt(s, 16);
    // Coerce to unsigned and mask to 16 bits.
    return ((Number.isFinite(n) ? n : 0) >>> 0) & 0xffff;
  };

  // Lower 16 bits (LSB buffer size).
  const lo = parseHex16(size);
  // Upper 16 bits (MSB / second buffer size).
  const hi = parseHex16(size1);
  // Pack into a 32-bit value: [hi:16][lo:16].
  const packed = (((hi << 16) | lo) >>> 0);

  // Return as 8-hex-digit uppercase string (no 0x prefix).
  return packed.toString(16).toUpperCase().padStart(8, "0");
}


function helper_usb_get_index(pmaSettings, item)
{
 return pmaSettings.findIndex( (elem) => ((elem.number === item.number) &&(elem.direction === item.direction)) );
}

/**
 * Compute PMA address for entry i:
 *   addr(0) = 0x20
 *   addr(i) = 0x20 + sum(size[0..i-1])
 *
 * @param {Array} pmaSettings Array of endpoint objects (each has "size")
 * @param {object} index current item index in the array 
 * @param {number} bufferIndex index of the buffer (0 or 1)
 * @returns {number} address for entry i (unsigned 32-bit)
 */
function helper_usb_ep_calc_address(pmaSettings, index, bufferIndex = 0, asHexString = false) {
  // Base PMA address offset (device-specific constant).
  const BASE = 0x20; // 32

  const parseUint = (v) => {
    // Normalize various input types (number, decimal string, hex string) into an unsigned integer.
    if (v === undefined || v === null || v === "") return 0;
    if (typeof v === "number") return (v >>> 0);

    // Trim and parse string values.
    const s = String(v).trim();
    if (s === "") return 0;

    // Accept both hex (0x..) and decimal strings.
    const n = s.startsWith("0x") || s.startsWith("0X")
      ? Number.parseInt(s, 16)
      : Number.parseInt(s, 10);

    // Fall back to 0 on invalid numbers.
    return ((Number.isFinite(n) ? n : 0) >>> 0);
  };

  try {
    // Convert index to a number and validate it against the array bounds.
    const i = Number(index);
    if (!Array.isArray(pmaSettings) || !Number.isInteger(i) || i < 0 || i >= pmaSettings.length) {
      return asHexString ? "0" : 0;
    }

    // Select which field we sum depending on whether we compute buffer 0 or buffer 1 addresses.
    const sizeKey = (bufferIndex === 0) ? "size" : "size1";

    // Compute cumulative size of all previous endpoints to get the current endpoint base address.
    let sum = 0;
    for (let k = 0; k < i; k++) {
      const entry = pmaSettings[k] ?? {};
      if (entry.buffer_type === "double") {
      sum = (sum + parseUint(entry["size"])+ parseUint(entry["size1"]))>>> 0;
      } else {
      sum = (sum + parseUint(entry["size"]))>>> 0;
      }
    }
    if( pmaSettings[i].buffer_type === "double" && bufferIndex ===1){
      sum = (sum + parseUint( pmaSettings[i]["size"]))>>> 0;
    }

    // Final address = base offset + accumulated sizes.
    const addr = (BASE + sum) >>> 0;
    // Optionally return as uppercase hex string (without 0x prefix).
    return asHexString ? addr.toString(16).toUpperCase() : addr;
  } catch (e) {
    console.error("helper_usb_ep_calc_address: " + e);
    return asHexString ? "0" : 0;
  }
}

/**
 * Count how many times an endpoint definition appears in a PMA settings array.
 *
 * Two entries are considered the same endpoint when they have the same:
 * - `number`
 * - `direction`
 *
 * This helper is used to detect duplicates in the endpoint list.
 *
 * @param {Array<{number?: number, direction?: string}>} pmaSettings Array of endpoint objects.
 * @param {{number?: number, direction?: string}} item Endpoint to search for.
 * @returns {number} Number of matching occurrences (0 if inputs are invalid).
 */
function helper_usb_ep_find_all_occurrences(pmaSettings, item) {
  if (!Array.isArray(pmaSettings) || !item) {
    return 0;
  }

  const matches = [];
  const targetNumber = item.number;
  const targetDirection = item.direction;

  for (let i = 0; i < pmaSettings.length; i++) {
    const ep = pmaSettings[i];
    if (!ep) continue;

    if (ep.number === targetNumber && ep.direction === targetDirection) {
      matches.push(i); // index in pmaSettings
    }
  }

  return matches.length;
}

/**
 * Compute a default endpoint number for the entry at `index`, but preserve a user override.
 *
 * The JSON schema uses this helper in a `set` action, which can be evaluated repeatedly.
 * To avoid constantly overwriting user choices, this helper follows this rule:
 * - If the current entry already has a non-zero `number`, treat it as user-defined and keep it.
 * - Otherwise (still 0 / unset), return the calculated default based on previous entries.
 *
 * @param {Array<{number?: number}>} pmaSettings Array of endpoint objects.
 * @param {number} index Current entry index.
 * @returns {number} The endpoint number to apply.
 */
function helper_usb_set_current_ep_number(pmaSettings, index)
{
  if (!Array.isArray(pmaSettings) || index < 0 || index >= pmaSettings.length) {
    return 0;
  }

  const currentRaw = pmaSettings[index]?.number;
  const currentNumber = Number.isFinite(Number(currentRaw)) ? Number(currentRaw) : 0;

  // Non-zero value means the user explicitly set it: keep it.
  if (currentNumber !== 0) {
    return currentNumber;
  }

  // Otherwise compute a default.
  if (index <= 1) {
    return 0;
  }

  const prev = Number.isFinite(Number(pmaSettings[index - 1]?.number)) ? Number(pmaSettings[index - 1].number) : 0;
  const prevPrev = Number.isFinite(Number(pmaSettings[index - 2]?.number)) ? Number(pmaSettings[index - 2].number) : 0;

  if (prev === prevPrev) {
    return prev + 1;
  }
  return prev;
}

/**
 * Compute a default endpoint direction for the entry at `index`, but preserve a user override.
 *
 * The UI lets the user pick a direction from a list ("IN" or "OUT"). Meanwhile the JSON schema
 * can re-evaluate this helper multiple times (e.g. after edits to other endpoint entries).
 *
 * Behavior:
 * - Computes the expected (auto) direction using the same rules as before.
 * - If the current entry already contains a valid direction and it differs from the computed
 *   default, treat it as a user override and keep returning it.
 * - If the user has NOT overridden it, keep auto-updating when the computed default changes.
 *
 * Implementation detail:
 * - Stores a non-enumerable `__usb_ep_direction_meta.lastComputed` on the entry to detect whether
 *   the current value still matches the last auto-computed value (meaning: not user overridden).
 *
 * @param {Array<{number?: number, direction?: string}>} pmaSettings Array of endpoint objects.
 * @param {number} index Current entry index.
 * @returns {"IN"|"OUT"} Direction to apply.
 */
function helper_usb_set_current_ep_direction(pmaSettings, index)
{

  if (!Array.isArray(pmaSettings) || index === undefined || index === null) {
    return "IN";
  }

  const i = Number(index);
  if (!Number.isInteger(i) || i < 0 || i >= pmaSettings.length) {
    return "IN";
  }

  const normalizeDir = (v) => {
    if (typeof v !== "string") return "";
    const s = v.trim().toUpperCase();
    return (s === "IN" || s === "OUT") ? s : "";
  };

  const toNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  // Compute expected (auto) direction.
  let expected;
  if (i === 0) {
    expected = (helper_usb_ep_find_all_occurrences(pmaSettings, pmaSettings[0]) > 1) ? "OUT" : "IN";
  } else if (i === 1) {
    expected = "OUT";
  } else {
    const prev = toNum(pmaSettings[i - 1]?.number);
    const prevPrev = toNum(pmaSettings[i - 2]?.number);
    expected = (prev === prevPrev) ? "IN" : "OUT";
  }

  const entry = pmaSettings[i];
  if (!entry || typeof entry !== "object") {
    return expected;
  }

  const current = normalizeDir(entry.direction);

  // Keep a non-enumerable meta to detect user overrides without polluting serialized configs.
  const metaKey = "__usb_ep_direction_meta";
  const hasMeta = Object.prototype.hasOwnProperty.call(entry, metaKey);

  // First evaluation for this entry: if a valid current value already exists and differs from
  // the computed default, treat it as a user override and keep it.
  if (!hasMeta) {
    try {
      Object.defineProperty(entry, metaKey, {
        value: { lastComputed: expected },
        writable: true,
        enumerable: false,
        configurable: true
      });
    } catch (_) {
      // If we can't attach meta, fall back to a best-effort rule.
      return current || expected;
    }

    return (current && current !== expected) ? current : expected;
  }

  const meta = entry[metaKey];
  const lastComputed = normalizeDir(meta?.lastComputed);

  // If current equals the last computed value (or is empty), user hasn't overridden it: recompute.
  if (!current || (lastComputed && current === lastComputed)) {
    if (meta && typeof meta === "object") {
      meta.lastComputed = expected;
    }
    return expected;
  }

  // Otherwise preserve user override.
  if (meta && typeof meta === "object") {
    meta.lastComputed = expected;
  }
  return current;
}

/**
 * Compute the total allocated PMA size (in bytes) up to and including `index`.
 *
 * Note: `size` and `size1` are stored as hexadecimal values (e.g. "40" or "0x40").
 * This helper returns a JavaScript number (decimal / base-10) so it can be compared
 * numerically in schema conditions.
 *
 * For endpoints with `buffer_type === "double"`, both buffers contribute to the total:
 * `size` + `size1`.
 *
 * @param {Array<{size?: string|number, size1?: string|number, buffer_type?: string}>} pmaSettings Array of endpoint objects.
 * @param {number} index Last entry index to include.
 * @returns {number} Total allocated size in decimal bytes.
 */
function helper_usb_pma_total_size(pmaSettings, index) {

  if (!Array.isArray(pmaSettings)) {
    return 0;
  }

  const iMax = Number(index);
  if (!Number.isInteger(iMax) || iMax < 0) {
    return 0;
  }

  const parseHex = (v) => {
    if (v === undefined || v === null || v === "") return 0;
    if (typeof v === "number") return Number.isFinite(v) ? (v >>> 0) : 0;

    const s = String(v).trim();
    if (!s) return 0;

    const normalized = (s.startsWith("0x") || s.startsWith("0X")) ? s.slice(2) : s;
    const n = Number.parseInt(normalized, 16);
    return Number.isFinite(n) ? (n >>> 0) : 0;
  };

  let sum = 0;
  const last = Math.min(iMax, pmaSettings.length - 1);

  for (let k = 0; k <= last; k++) {
    const entry = pmaSettings[k];
    if (!entry) continue;

    sum = (sum + parseHex(entry.size)) >>> 0;
    if (entry.buffer_type === "double") {
      sum = (sum + parseHex(entry.size1)) >>> 0;
    }
  }

  // Decimal (base-10) JS number.
  return sum;
}

  /**
   * Compute how many endpoint entries can still be allocated given the current PMA settings.
   *
   * On this USB PMA layout, double-buffered endpoints consume an extra buffer allocation,
   * effectively reducing the total number of possible endpoint entries.
   *
   * Rule implemented here:
   * - Start from 16 possible endpoint entries.
   * - For each entry with `buffer_type === "double"`, reduce the maximum by 1.
   *
   * @param {Array<{buffer_type?: string}>} pmaSettings Array of endpoint objects.
   * @returns {number} Maximum number of endpoint entries that can be allocated.
   */
function helper_usb_pma_total_possible_ep_number(pmaSettings) {

  if (!Array.isArray(pmaSettings)) {
    return 16;
  }
  let possible = 0;
  let max = 16;
  for (let i = 0; i < pmaSettings.length; i++) {
    const entry = pmaSettings[i];
    if (entry && entry.buffer_type === "double") {
      max = (max - 2);
    } else {
      max = (max - 1);
    }
  }
  possible = max + pmaSettings.length;

  return possible;
}

/**
 * Compute how many endpoint entries are currently allocated up to and including `index`.
 *
 * This is used for UI/validation purposes to reflect how many items in the PMA endpoint list
 * are in use (not related to endpoint numbers; it is simply the count of entries).
 *
 * @param {Array} pmaSettings Array of endpoint objects.
 * @param {number} index Last entry index to include.
 * @returns {number} Number of allocated entries (decimal).
 */
function helper_usb_get_total_allocated_ep_number(pmaSettings, index) {

  if (!Array.isArray(pmaSettings)) {
    return 0;
  }
  let used = 0;
  for (let i = 0; i <= index; i++) {
    const entry = pmaSettings[i];
    if (entry && entry.buffer_type === "double") {
      used = (used +2);
    } else {
      used = (used + 1);
    }
  }
  return used;
}


/**
 * Convert a decimal value into an uppercase hexadecimal string.
 *
 * - Accepts a number or a decimal string (base 10).
 * - Returns an uppercase hex string (without any `0x` prefix).
 * - If `padLength` is provided, the string is left-padded with `0` to reach that length.
 * - If the input cannot be parsed into a finite number, returns a string of zeros with length `padLength`.
 *
 * Examples:
 * - helper_usb_dec_into_hex_string(26)        -> "1A"
 * - helper_usb_dec_into_hex_string("26")     -> "1A"
 * - helper_usb_dec_into_hex_string(26, 4)    -> "001A"
 *
 * @param {number|string} value Decimal value (number or base-10 string).
 * @param {number} [padLength=0] Minimum output length (left-pads with '0').
 * @returns {string} Uppercase hexadecimal string.
 * 
 */
function helper_usb_dec_into_hex_string(value, padLength = 0) {
  const n = (typeof value === "number") ? value : Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return "0".padStart(padLength, "0");
  return n.toString(16).toUpperCase().padStart(padLength, "0");
}

/**
  * Retrieve all the interruptions set by USB but not generated
  * @param {object} nvic_api Getter on NVIC api
  * @param {object} dma_api Getter on DMA api (not used)
  * @param {object} gpio_api Getter on GPIO api (not used)
  * @param {object} exti_api Getter on EXTI api
  * @param {object} resource Current resource
  * @param {object} config current configuration of the USB
  * @returns {object}
 */
function helper_usb_get_irq_handler(nvic_api, exti_api, resource, config, parent) {
  let result = [];
  try {
    console.info(
      `helper_usb_get_irq_handler: resource= ${resource}, config=${JSON.stringify(config)}`
    );

    /** Reference all the elements which enable the USB interruptions */
    const list_interrupts = [
      { enable: "enable_interruption", irq_handler_generation: "irq_handler_generation", nvic_context: "nvic_config" }
    ];

    /** Parse the list of interruptions */
    for (let index = 0; index < list_interrupts.length; index++) {
      const element = list_interrupts[index];
      /** Check if interruption has been enabled on the USB */
      const enableInterruption = config?.system?.nvic?.[element['enable']] ?? false;
      if (!enableInterruption) continue;

      /** Check if IRQ handler generated is done on code generation or not */
      const irqHandlerGeneration = config.system?.nvic?.[element['irq_handler_generation']] ?? false;

      if (!irqHandlerGeneration) {
        const labels = config.info?.labels || [];
        let nvic_config = nvic_api.getNeedById(config.system?.nvic?.[element['nvic_context']].needs[0].id);
        nvic_config.name = parent;
        /** Fill the object to be used for aliases in mx_hal_def.h */
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
    }
  } catch (e) {
    console.error(`helper_usb_get_irq_handler: ${e}`);
  }
  return result;
}


/**
 * Return the default USB speed setting for a given USB IP name.
 *
 * Mapping:
 * - `OTG_HS` => `USB_OTG_SPEED_HIGH`
 * - `OTG_FS` / `USB` / any other value => `USB_OTG_SPEED_FULL`
 *
 * @param {string} ip_name USB IP name (e.g. "OTG_HS", "OTG_FS", "USB").
 * @returns {string} USB speed identifier.
 */
function helper_usb_get_speed_by_ip(ip_name) {
  switch (ip_name) {
    case "OTG_HS":
      return "SPEED_HS";
    case "OTG_FS":
    case "USB":
    default:
      return "SPEED_FS";
  }
}
/**
 * Return the default PHY interface setting for a given USB IP name.
 *
 * Mapping:
 * - `OTG_HS` => `PHY_EMBEDDED_HS`
 * - `OTG_FS` / `USB` / any other value => `PHY_EMBEDDED_FS`
 *
 * This helper is intended to centralize the IP-to-PHY selection logic used by
 * templates/schemas when building the PCD/HCD configuration.
 *
 * @param {string} ip_name USB IP name (e.g. "OTG_HS", "OTG_FS", "USB").
 * @returns {"PHY_EMBEDDED_HS"|"PHY_EMBEDDED_FS"} PHY interface identifier.
 */
function helper_usb_get_phy_interface_by_ip(ip_name) {
  switch (ip_name) {
    case "OTG_HS":
      return "PHY_EMBEDDED_HS";
    case "OTG_FS":
    case "USB":
    default:
      return "PHY_EMBEDDED_FS";
  }
}

function helper_usb_get_phy_interface_title_by_ip(ip_name) {
  switch (ip_name) {
    case "OTG_HS":
      return "Embedded High Speed PHY";
    case "OTG_FS":
    case "USB":
    default:
      return "Embedded Full Speed PHY";
  }
}

module.exports = {
  helper_usb_pack_dbl_buffer_sizes,
  helper_usb_ep_calc_address,
  helper_usb_get_index,
  helper_usb_get_irq_handler,
  helper_usb_set_current_ep_number,
  helper_usb_set_current_ep_direction,
  helper_usb_get_phy_interface_by_ip,
  helper_usb_get_phy_interface_title_by_ip,
  helper_usb_get_speed_by_ip,
  helper_usb_dec_into_hex_string,
  helper_usb_get_irq_handler
};
