// Shared utilities for unwrapping and normalizing WebViewer Header items
// and Ribbon Tab groupedItems containers.
//
// In WebViewer's default UI export:
// 1. `default-top-header.items` contains `groupedLeftHeaderButtons` (type: 'groupedItems'),
//    which holds `menuButton`, `leftPanelButton`, `view-controls`, `zoom-container`,
//    `panToolButton`, and `annotationEditToolButton`.
// 2. Ribbon tabs (e.g. `toolbarGroup-Annotate` -> `annotateGroupedItems`) contain
//    nested `groupedItems` (`annotateToolsGroupedItems`, `defaultAnnotationUtilities`).
//
// These helpers unwrap those nested `groupedItems` so every individual tool/button
// is visible in its true visual order and can be freely reordered via drag-and-drop.

/**
 * Returns the Set of all `groupedItems` keys referenced by any `ribbonItem`
 * in `modularComponents`.
 */
export function getAllRibbonGroupedKeys(modularComponents = {}) {
  const keys = new Set();
  for (const comp of Object.values(modularComponents || {})) {
    if (comp?.type === 'ribbonItem' && Array.isArray(comp.groupedItems)) {
      for (const gk of comp.groupedItems) {
        if (gk) keys.add(gk);
      }
    }
  }
  return keys;
}

/**
 * Recursively unwraps an array of item keys, expanding any nested `groupedItems`
 * container (except those in `excludeKeys`) into its child item keys.
 */
export function unwrapGroupedItemsArray(
  items = [],
  modularComponents = {},
  excludeKeys = new Set(),
  visited = new Set(),
) {
  const result = [];
  for (const entry of items || []) {
    const key = typeof entry === 'string' ? entry : entry?.dataElement;
    if (!key) continue;
    if (excludeKeys.has(key)) continue;

    const comp = modularComponents[key];
    if (
      comp?.type === 'groupedItems' &&
      Array.isArray(comp.items) &&
      !visited.has(key)
    ) {
      const nextVisited = new Set(visited).add(key);
      result.push(
        ...unwrapGroupedItemsArray(
          comp.items,
          modularComponents,
          excludeKeys,
          nextVisited,
        ),
      );
    } else {
      result.push(key);
    }
  }
  return result;
}

/**
 * Returns the ordered array of top-level visible header item keys for `headerKey`
 * (preserving `groupedItems` containers such as `groupedLeftHeaderButtons` in their
 * exact visual position while excluding inline ribbon tool `groupedItems` which
 * belong under their Ribbon Tab).
 *
 * Also returns `inlineRibbonGroupedKeys` so inline ribbon tool containers are
 * preserved at the end of `header.items` when Inline Header mode is active.
 */
export function getFlattenedHeaderItems(
  headerKey,
  modularHeaders = {},
  modularComponents = {},
) {
  const headerDef = modularHeaders?.[headerKey];
  if (!headerDef || !Array.isArray(headerDef.items)) {
    return { visibleItems: [], inlineRibbonGroupedKeys: [] };
  }

  const allRibbonGroupedKeys = getAllRibbonGroupedKeys(modularComponents);
  const inlineRibbonGroupedKeys = [];
  const visibleItems = [];

  for (const entry of headerDef.items) {
    const k = typeof entry === 'string' ? entry : entry?.dataElement;
    if (!k) continue;
    if (allRibbonGroupedKeys.has(k)) {
      inlineRibbonGroupedKeys.push(k);
    } else {
      visibleItems.push(k);
    }
  }

  return { visibleItems, inlineRibbonGroupedKeys };
}

/**
 * Returns the direct ordered array of item/group keys inside a `ribbonItem` (`tabKey`),
 * preserving nested `groupedItems` containers (such as `annotateToolGroupToggleButtons`,
 * `highlightToolGroup`, `annotateToolsGroupedItems`, and `defaultAnnotationUtilities`)
 * so they render as collapsible container nodes in the outline tree.
 */
export function getFlattenedRibbonTabTools(tabKey, modularComponents = {}) {
  const tabComp = modularComponents?.[tabKey];
  if (!tabComp) return { toolKeys: [], primaryGroupKey: null };

  let primaryGroupKey = null;
  const toolKeys = [];

  if (Array.isArray(tabComp.items) && tabComp.items.length > 0) {
    for (const entry of tabComp.items) {
      const k = typeof entry === 'string' ? entry : entry?.dataElement;
      if (k) toolKeys.push(k);
    }
  }

  if (Array.isArray(tabComp.groupedItems) && tabComp.groupedItems.length > 0) {
    primaryGroupKey = tabComp.groupedItems[0];
    if (tabComp.groupedItems.length === 1) {
      const gComp = modularComponents?.[primaryGroupKey];
      if (gComp && Array.isArray(gComp.items)) {
        for (const entry of gComp.items) {
          const k = typeof entry === 'string' ? entry : entry?.dataElement;
          if (k) toolKeys.push(k);
        }
      }
    } else {
      for (const gk of tabComp.groupedItems) {
        if (gk) toolKeys.push(gk);
      }
    }
  }

  return { toolKeys, primaryGroupKey };
}

/**
 * Resolves the primary container key where direct items of a ribbon tab live.
 */
export function findRibbonTabToolContainer(tabKey, modularComponents = {}) {
  const tabComp = modularComponents?.[tabKey];
  if (!tabComp) return null;

  if (Array.isArray(tabComp.groupedItems) && tabComp.groupedItems.length > 0) {
    return tabComp.groupedItems[0];
  }

  if (Array.isArray(tabComp.items)) {
    return tabKey;
  }

  return null;
}
