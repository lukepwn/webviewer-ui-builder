/**
 * Utilities for generating and validating unique dataElement identifiers across
 * WebViewer Modular UI configurations.
 */

/**
 * Collects all currently active component, container, header, flyout, and panel IDs.
 *
 * @param {Object} config - Current WebViewer modular config
 * @param {Array<string>} [headerOptions=[]] - Known header keys
 * @returns {Set<string>} Set of lowercase and exact keys currently registered
 */
export function collectAllExistingIds(config = {}, headerOptions = []) {
  const ids = new Set();

  // 1. Modular components
  for (const key of Object.keys(config?.modularComponents || {})) {
    if (key && key !== 'divider') {
      ids.add(key);
    }
  }

  // 2. Headers
  const headers = headerOptions.length > 0 ? headerOptions : Object.keys(config?.modularHeaders || {});
  for (const h of headers) {
    if (h) ids.add(h);
  }

  // 3. Flyouts
  for (const f of Object.keys(config?.flyouts || {})) {
    if (f) ids.add(f);
  }

  // 4. Panels
  for (const p of Object.keys(config?.panels || {})) {
    if (p) ids.add(p);
  }

  return ids;
}

/**
 * Generates a unique dataElement ID given a base identifier and a set of existing IDs.
 * If the baseId is not in use, returns baseId unchanged.
 * If baseId is 'divider', returns 'divider' (literal dividers are permitted to repeat).
 * Otherwise, generates the next available suffix: baseId2, baseId3, etc.
 * If baseId already ends in a number, increments from that number.
 *
 * @param {string} baseId - Base identifier (e.g. 'panButton' or 'pan2')
 * @param {Set<string>|Array<string>} existingIds - Set or array of existing IDs
 * @returns {string} Unique identifier
 */
export function generateUniqueDataElement(baseId, existingIds) {
  if (!baseId || baseId === 'divider') return baseId || '';

  const idSet = existingIds instanceof Set ? existingIds : new Set(existingIds || []);

  if (!idSet.has(baseId)) {
    return baseId;
  }

  // If baseId ends with digits (e.g. "panButton2" -> prefix "panButton", startNum 2)
  const match = baseId.match(/^(.*?)(\d+)$/);
  let prefix = baseId;
  let counter = 2;

  if (match) {
    prefix = match[1];
    counter = parseInt(match[2], 10) + 1;
  }

  let candidate = `${prefix}${counter}`;
  while (idSet.has(candidate)) {
    counter += 1;
    candidate = `${prefix}${counter}`;
  }

  return candidate;
}
