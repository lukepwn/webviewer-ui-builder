// Turns builder state into a config the WebViewer SDK will accept.
//
// The SDK validates importModularComponents asynchronously and aborts the WHOLE
// import silently on one bad item, so everything is checked here first.
// Pipeline (order matters): components -> headers -> panels -> flyouts -> submenus -> toggle targets.
// Entry point: prepareConfigForImport(config) -> { config, warnings }. Never throws.
import {
  ALLOWED_HEADER_PLACEMENTS,
  DIVIDER_ITEM_TOKEN,
  FLYOUT_ITEM_TYPES,
  MAX_SUBMENU_DEPTH,
  MODAL_TAB_ITEM_TYPES,
  PANEL_RENDER_ALIASES,
  TAB_PANEL_RENDER,
  TOOL_ACTION_PREFIX,
  VALID_PANEL_RENDERS,
  VALID_POPUP_KEYS,
} from './sdkRules.js';
import { TOOLS_CATALOG } from '../constants/webviewerCatalog.js';

// --- helpers -----------------------------------------------------------------

const isAllowedFlyoutItemType = (type) => FLYOUT_ITEM_TYPES.has(type);

const normalizePanelRenderName = (render) =>
  typeof render === 'string' && PANEL_RENDER_ALIASES[render]
    ? PANEL_RENDER_ALIASES[render]
    : render;

// Converts a toolButton definition into a flyout-compatible customButton wired
// to the functionMap via `activateTool:<toolName>` [10, 12].
function convertToolButtonForFlyout(comp) {
  if (!comp || comp.type !== 'toolButton') return comp;
  const toolName = comp.toolName || comp.dataElement;
  return {
    ...comp,
    type: 'customButton',
    toolName,
    label: comp.label || comp.title || toolName,
    title: comp.title || comp.label || toolName,
    onClick: `${TOOL_ACTION_PREFIX}${toolName}`,
  };
}

// Can the Add-Component modal tab create an item that a flyout accepts?
// Used by the UI so users can't pick items the SDK would reject.
// The 'layout' tab is allowed because literal 'divider' entries are valid in flyouts.
export function isModalTabAllowedInFlyout(tab) {
  if (tab === 'layout') return true;
  const types = MODAL_TAB_ITEM_TYPES[tab];
  if (!types) return true; // tab does not place an item at a target location
  return types.some(isAllowedFlyoutItemType);
}

// A toggle component's target element, if it is one.
const toggleTarget = (comp) =>
  comp && comp.type === 'toggleButton'
    ? comp.toggleElement || comp.element
    : null;

// The SDK's importModularComponents wants submenu `children` as INLINE objects,
// but exportModularComponents returns them as component KEYS. Importing the
// exported form wipes children to [] [1c, 13, 15]. This expands keys back into
// inline objects so export -> edit -> import round trips.
function expandSubmenuChildren(comp, components, depth = 0, seen = new Set()) {
  if (!comp || !Array.isArray(comp.children)) return comp;
  if (depth >= MAX_SUBMENU_DEPTH) return { ...comp, children: [] };
  const children = [];
  for (const child of comp.children) {
    if (child && typeof child === 'object') {
      children.push(child);
      continue;
    }
    const def = components[child];
    if (!def || seen.has(child)) continue;
    const nextSeen = new Set(seen).add(child);
    children.push(
      expandSubmenuChildren(
        { ...def, dataElement: def.dataElement || child },
        components,
        depth + 1,
        nextSeen,
      ),
    );
  }
  return { ...comp, children };
}

// --- pipeline steps ----------------------------------------------------------

// 1. Components: ensure each has a valid type and dataElement, normalize aliases.
function normalizeComponents(rawConfig, warnings) {
  const sanitizedComponents = {};
  for (const [key, value] of Object.entries(
    rawConfig.modularComponents || {},
  )) {
    if (!value || typeof value !== 'object') continue;
    // Component must have a valid type string
    if (!value.type || typeof value.type !== 'string') {
      warnings.push(
        `Skipping component '${key}' because it lacks a valid 'type'.`,
      );
      continue;
    }
    const compCopy = { ...value, dataElement: value.dataElement || key };
    // Strip internal Redux store object leaked when exporting new UI.Components.* instances
    delete compCopy.store;

    // Normalize known component type aliases to WebViewer's expected schema types
    if (
      compCopy.type === 'toggleElementButton' ||
      compCopy.type === 'toggleButton'
    ) {
      compCopy.type = 'toggleButton';
      compCopy.element = compCopy.element || compCopy.toggleElement;
      compCopy.toggleElement = compCopy.toggleElement || compCopy.element;
    }
    if (compCopy.type === 'button') {
      compCopy.type = 'customButton';
    }
    // Strip empty onClick leaked on exported presetButtons in flyouts
    if (compCopy.type === 'presetButton' && compCopy.onClick === '') {
      delete compCopy.onClick;
    }
    // Normalize icon -> img on button components when img is omitted
    if (
      (compCopy.type === 'customButton' ||
        compCopy.type === 'toggleButton' ||
        compCopy.type === 'presetButton' ||
        compCopy.type === 'toolButton') &&
      compCopy.icon &&
      !compCopy.img
    ) {
      compCopy.img = compCopy.icon;
    }
    // Normalize non-existent icon-header-menu to WebViewer's native ic-hamburger-menu
    if (compCopy.img === 'icon-header-menu') {
      compCopy.img = 'ic-hamburger-menu';
    }
    if (compCopy.icon === 'icon-header-menu') {
      compCopy.icon = 'ic-hamburger-menu';
    }
    if (compCopy.type === 'customButton' && compCopy.toolName) {
      if (!compCopy.onClick) {
        compCopy.onClick = `${TOOL_ACTION_PREFIX}${compCopy.toolName}`;
      }
      compCopy.label = compCopy.label || compCopy.title || compCopy.toolName;
      compCopy.title = compCopy.title || compCopy.label || compCopy.toolName;
    }
    if (compCopy.type === 'mainMenu' || compCopy.type === 'menuButton') {
      compCopy.type = 'toggleButton';
      compCopy.toggleElement = compCopy.toggleElement || 'MainMenuFlyout';
      if (!compCopy.img || compCopy.img === 'icon-header-menu') {
        compCopy.img = 'ic-hamburger-menu';
      }
      compCopy.title = compCopy.title || 'Menu';
    }
    if (compCopy.type === 'label') {
      compCopy.label = compCopy.label || compCopy.title || key;
    }

    // WebViewer requires ribbonItem to always have a groupedItems array (Ap selector)
    if (compCopy.type === 'ribbonItem') {
      if (!Array.isArray(compCopy.groupedItems)) {
        compCopy.groupedItems = [];
      }
      if (!Array.isArray(compCopy.items)) {
        compCopy.items = [];
      }
      if (!compCopy.title) {
        compCopy.title = compCopy.label || key;
      }
      if (!compCopy.toolbarGroup) {
        compCopy.toolbarGroup = key;
      }
    }

    if (compCopy.type === 'ribbonGroup' && !Array.isArray(compCopy.items)) {
      compCopy.items = [];
    }

    if (compCopy.type === 'groupedItems' && !Array.isArray(compCopy.items)) {
      compCopy.items = [];
    }

    sanitizedComponents[key] = compCopy;
  }

  // Ensure child items of components point to valid components
  for (const comp of Object.values(sanitizedComponents)) {
    if (Array.isArray(comp.items)) {
      comp.items = comp.items.filter((itemKey) => {
        return itemKey === 'divider' || !!sanitizedComponents[itemKey];
      });
    }
    if (Array.isArray(comp.groupedItems)) {
      comp.groupedItems = comp.groupedItems.filter((itemKey) => {
        return !!sanitizedComponents[itemKey];
      });
    }
  }
  return sanitizedComponents;
}

// 2. Headers: valid placement, items point at real components.
function normalizeHeaders(rawConfig, components) {
  const sanitizedHeaders = {};
  for (const [key, value] of Object.entries(rawConfig.modularHeaders || {})) {
    if (!value || typeof value !== 'object') continue;
    const lowerKey = String(key).toLowerCase();
    if (lowerKey === 'view' || lowerKey === 'toolbargroup-view') continue;

    const headerCopy = { ...value, dataElement: value.dataElement || key };
    if (
      headerCopy.placement &&
      !ALLOWED_HEADER_PLACEMENTS.has(String(headerCopy.placement).toLowerCase())
    ) {
      headerCopy.placement = 'top';
    }

    if (!Array.isArray(headerCopy.items)) {
      headerCopy.items = [];
    } else {
      // Filter out any items that are not in components (unless divider)
      headerCopy.items = headerCopy.items.filter((itemKey) => {
        return itemKey === 'divider' || !!components[itemKey];
      });
    }

    sanitizedHeaders[key] = headerCopy;
  }
  return sanitizedHeaders;
}

// 3. Panels: key === dataElement [7], whitelisted renders (or custom functionMap render),
// tabPanel always has panelsList [3] and its sub-panels registered.
function normalizePanels(rawConfig, warnings) {
  const sanitizedPanels = {};
  for (const [key, value] of Object.entries(rawConfig.panels || {})) {
    if (!value || typeof value !== 'object') continue;
    const rawLoc = String(value.location || '').toLowerCase();
    const location = rawLoc === 'right' || rawLoc === 'end' ? 'right' : 'left';
    const rawRender = value.render || key;
    const render = normalizePanelRenderName(rawRender);

    const isCustomPanelRender =
      typeof value.render === 'string' &&
      value.render.trim().length > 0 &&
      !VALID_PANEL_RENDERS.has(render) &&
      (Boolean(value.title) || value.render !== key);

    // Guardrail: Skip invalid panel renders to avoid crashing WebViewer's validatePanels
    if (
      !VALID_PANEL_RENDERS.has(render) &&
      typeof render !== 'function' &&
      !isCustomPanelRender
    ) {
      warnings.push(
        `Skipping invalid panel '${key}' with unsupported render '${render}'.`,
      );
      continue;
    }

    if (isCustomPanelRender) {
      warnings.push(
        `Panel '${key}' uses custom render function '${render}'. Pass '${render}' in functionMap when calling UI.importModularComponents(config, functionMap).`,
      );
    }

    const panelKey = key === 'outlinePanel' ? 'outlinesPanel' : key;
    const panel = { ...value, dataElement: panelKey, location, render };
    if (render === TAB_PANEL_RENDER) {
      panel.panelsList = Array.isArray(panel.panelsList)
        ? panel.panelsList
            .filter((item) => item && typeof item === 'object' && item.render)
            .map((item) => ({
              ...item,
              render: normalizePanelRenderName(item.render),
            }))
        : [];
    }
    sanitizedPanels[panelKey] = panel;
  }

  // Ensure every sub-panel referenced in a tabPanel's panelsList exists in panels
  for (const panel of Object.values(sanitizedPanels)) {
    if (panel.render !== TAB_PANEL_RENDER || !Array.isArray(panel.panelsList)) {
      continue;
    }
    panel.panelsList = panel.panelsList.filter((sub) => {
      const subRender = sub.render;
      if (sanitizedPanels[subRender]) return true;
      if (VALID_PANEL_RENDERS.has(subRender)) {
        sanitizedPanels[subRender] = {
          dataElement: subRender,
          render: subRender,
          location: panel.location || 'left',
        };
        return true;
      }
      warnings.push(
        `TabPanel '${panel.dataElement}': dropped unknown sub-panel '${subRender}' from panelsList.`,
      );
      return false;
    });
  }

  return sanitizedPanels;
}

// 4. Flyouts: key === dataElement [7]; items must be allowed types [5, 10];
// a toggle item must not target another flyout (crashes Flyout.js) [1b, 14].
function normalizeFlyouts(rawConfig, components, warnings) {
  const flyoutKeys = new Set(Object.keys(rawConfig.flyouts || {}));
  const sanitizedFlyouts = {};
  for (const [key, value] of Object.entries(rawConfig.flyouts || {})) {
    if (!value || typeof value !== 'object') continue;
    const items = [];
    for (const itemKey of Array.isArray(value.items) ? value.items : []) {
      if (itemKey == null) {
        warnings.push(`Flyout '${key}': dropped null/empty item.`);
        continue;
      }
      // WebViewer allows the literal string 'divider' in flyout.items, even though
      // it rejects a component object with type: 'divider'.
      if (itemKey === DIVIDER_ITEM_TOKEN) {
        items.push(DIVIDER_ITEM_TOKEN);
        continue;
      }
      let comp = components[itemKey];
      if (!comp) {
        warnings.push(`Flyout '${key}': dropped unknown item '${itemKey}'.`);
        continue;
      }
      if (comp.type === DIVIDER_ITEM_TOKEN) {
        items.push(DIVIDER_ITEM_TOKEN);
        continue;
      }
      // Convert toolButton in flyout to customButton with functionMap action [10, 12]
      if (comp.type === 'toolButton') {
        comp = convertToolButtonForFlyout(comp);
        components[itemKey] = comp;
      }
      if (
        comp.type === 'customButton' &&
        typeof comp.onClick === 'string' &&
        comp.onClick.startsWith(TOOL_ACTION_PREFIX)
      ) {
        warnings.push(
          `Flyout '${key}': '${itemKey}' uses customButton action '${comp.onClick}' (WebViewer rejects toolButton in flyouts). Pass functionMap to UI.importModularComponents(config, functionMap) when using exported JSON.`,
        );
      }
      if (!isAllowedFlyoutItemType(comp.type)) {
        warnings.push(
          `Flyout '${key}': dropped '${itemKey}' (type '${comp.type}' is not allowed in flyouts).`,
        );
        continue;
      }
      if (flyoutKeys.has(toggleTarget(comp))) {
        warnings.push(
          `Flyout '${key}': dropped '${itemKey}' (toggle to another flyout crashes the SDK; use a submenu).`,
        );
        continue;
      }
      items.push(itemKey);
    }
    sanitizedFlyouts[key] = { ...value, dataElement: key, items };
  }
  return { flyouts: sanitizedFlyouts, flyoutKeys };
}

// 5. Submenus: expand children keys to inline objects [15] and filter by the same flyout rules.
function normalizeSubmenus(components, flyoutKeys, warnings) {
  const out = { ...components };
  for (const [key, comp] of Object.entries(out)) {
    if (!Array.isArray(comp.children)) continue;
    const expanded = expandSubmenuChildren(comp, out);
    const filterChildren = (list) =>
      list
        .map((c) =>
          c.type === 'toolButton' ? convertToolButtonForFlyout(c) : c,
        )
        .filter((c) => {
          const ok =
            isAllowedFlyoutItemType(c.type) && !flyoutKeys.has(toggleTarget(c));
          if (!ok) {
            warnings.push(
              `Component '${key}': dropped submenu child '${c.dataElement}' (type '${c.type}' not allowed).`,
            );
          }
          return ok;
        })
        .map((c) =>
          Array.isArray(c.children)
            ? { ...c, children: filterChildren(c.children) }
            : c,
        );
    out[key] = { ...expanded, children: filterChildren(expanded.children) };
  }
  return out;
}

// 6. Popups (v11.8+): optional top-level `popups` object containing arrays of
// `{ dataElement }` objects for `annotationPopup`, `textPopup`, `contextMenuPopup`.
// An empty array `[]` disables that popup; omitting a key keeps WebViewer's default.
function normalizePopups(rawConfig, warnings) {
  if (!rawConfig.popups || typeof rawConfig.popups !== 'object') {
    return undefined;
  }
  if (Array.isArray(rawConfig.popups)) {
    warnings.push(`Ignoring invalid 'popups' property (expected an object).`);
    return undefined;
  }
  const sanitizedPopups = {};
  for (const [popupKey, list] of Object.entries(rawConfig.popups)) {
    if (!VALID_POPUP_KEYS.has(popupKey)) {
      warnings.push(`Skipping unknown popup '${popupKey}' in popups.`);
      continue;
    }
    if (!Array.isArray(list)) {
      warnings.push(
        `Skipping popup '${popupKey}' because its value is not an array.`,
      );
      continue;
    }
    const cleanList = [];
    for (const entry of list) {
      const dataElement = (
        typeof entry === 'string' ? entry : entry?.dataElement || ''
      ).trim();
      if (!dataElement) {
        warnings.push(
          `Popup '${popupKey}': dropped invalid item (each item must have a 'dataElement').`,
        );
        continue;
      }

      const rawEntryObj =
        typeof entry === 'object' && entry !== null ? entry : {};
      const compDef = rawConfig.modularComponents?.[dataElement];

      // WebViewer's popup renderer reads component properties (type, toolName, img, title, etc.)
      // directly from the popup item object in config.popups, rather than resolving them from
      // modularComponents. If the definition exists in modularComponents, merge it in.
      const hydrated = compDef
        ? { ...compDef, ...rawEntryObj, dataElement }
        : { ...rawEntryObj, dataElement };

      cleanList.push(hydrated);
    }
    sanitizedPopups[popupKey] = cleanList;
  }
  return sanitizedPopups;
}

// 7. Toggle targets: the SDK accepts dead targets silently [6]. Warn only, since the
// built-in element list is not fully known here.
function warnDeadToggleTargets(config, warnings) {
  const known = new Set([
    ...Object.keys(config.flyouts),
    ...Object.keys(config.panels),
    ...Object.keys(config.modularComponents),
    ...Object.keys(config.modularHeaders),
  ]);
  for (const [key, comp] of Object.entries(config.modularComponents)) {
    const target = toggleTarget(comp);
    if (target && !known.has(target)) {
      warnings.push(
        `Toggle '${key}' targets '${target}', which is not defined in this config (may be a built-in element).`,
      );
    }
  }
}

// --- entry point -------------------------------------------------------------

export function prepareConfigForImport(rawConfig = {}) {
  const warnings = [];
  const baseComponents = normalizeComponents(rawConfig, warnings);
  const modularHeaders = normalizeHeaders(rawConfig, baseComponents);
  const panels = normalizePanels(rawConfig, warnings);
  const { flyouts, flyoutKeys } = normalizeFlyouts(
    rawConfig,
    baseComponents,
    warnings,
  );
  const modularComponents = normalizeSubmenus(
    baseComponents,
    flyoutKeys,
    warnings,
  );
  const popups = normalizePopups(rawConfig, warnings);

  const config = {
    ...rawConfig,
    modularComponents,
    modularHeaders,
    panels,
    flyouts,
    ...(popups !== undefined ? { popups } : {}),
  };
  if (popups === undefined && 'popups' in config) {
    delete config.popups;
  }
  warnDeadToggleTargets(config, warnings);
  return { config, warnings };
}

// Builds the functionMap passed as the second argument to
// UI.importModularComponents(config, functionMap) [12].
// Wires:
// - `activateTool:<toolName>` handlers for customButtons that activate WebViewer tools,
// - custom `onClick` handlers referenced by customButtons,
// - custom `render` functions referenced by `customElement` components or custom `panels`.
export function buildFunctionMap(config = {}, viewerInstance = null) {
  const functionMap = {};

  const makeToolActivator = (toolName) => () => {
    const inst =
      viewerInstance ||
      (typeof window !== 'undefined' ? window.viewerInstance : null);
    if (!inst) return;
    try {
      const docViewer = inst.Core?.documentViewer;
      const tool = docViewer?.getTool?.(toolName);
      if (tool && docViewer?.setToolMode) {
        docViewer.setToolMode(tool);
      } else if (inst.UI?.setToolMode) {
        inst.UI.setToolMode(toolName);
      }
    } catch (err) {
      console.warn(`Failed to activate tool '${toolName}':`, err);
    }
  };

  // Register all catalog tools by default
  for (const t of TOOLS_CATALOG) {
    if (t.toolName) {
      functionMap[`${TOOL_ACTION_PREFIX}${t.toolName}`] = makeToolActivator(
        t.toolName,
      );
    }
  }

  // Register component-level function keys (onClick on customButton, render on customElement)
  const registerFromComp = (comp) => {
    if (!comp || typeof comp !== 'object') return;
    if (typeof comp.onClick === 'string' && comp.onClick.length > 0) {
      if (comp.onClick.startsWith(TOOL_ACTION_PREFIX)) {
        const toolName = comp.onClick.slice(TOOL_ACTION_PREFIX.length);
        if (toolName && !functionMap[comp.onClick]) {
          functionMap[comp.onClick] = makeToolActivator(toolName);
        }
      } else if (!functionMap[comp.onClick]) {
        const fnName = comp.onClick;
        functionMap[fnName] = () => {
          console.info(
            `[WebViewer UI Builder] Custom button action '${fnName}' triggered.`,
          );
        };
      }
    }
    if (
      comp.type === 'customElement' &&
      typeof comp.render === 'string' &&
      comp.render.length > 0 &&
      !functionMap[comp.render]
    ) {
      const renderKey = comp.render;
      const label = comp.title || comp.dataElement || renderKey;
      functionMap[renderKey] = (args) => {
        const el = document.createElement('div');
        el.style.padding = '4px 8px';
        el.style.fontSize = '12px';
        el.style.whiteSpace = 'nowrap';
        el.textContent = typeof args === 'string' && args ? args : label;
        return el;
      };
    }
    if (Array.isArray(comp.children)) {
      comp.children.forEach(registerFromComp);
    }
  };

  for (const comp of Object.values(config.modularComponents || {})) {
    registerFromComp(comp);
  }

  // Register custom panel render functions
  for (const [panelKey, panel] of Object.entries(config.panels || {})) {
    if (
      panel &&
      typeof panel.render === 'string' &&
      panel.render.length > 0 &&
      !VALID_PANEL_RENDERS.has(panel.render) &&
      !functionMap[panel.render]
    ) {
      const renderKey = panel.render;
      const title = panel.title || panelKey;
      functionMap[renderKey] = () => {
        const div = document.createElement('div');
        div.style.padding = '16px';
        div.textContent = `Custom Panel: ${title} (${renderKey})`;
        return div;
      };
    }
  }

  return functionMap;
}

// Returns a list of functionMap entries required by `config` (`activateTool:<toolName>`,
// custom button `onClick`, `customElement.render`, and custom `panel.render`),
// plus a ready-to-copy JS snippet for the user.
export function getRequiredFunctionMapInfo(config = {}) {
  const entries = [];
  const seen = new Set();

  const visit = (comp) => {
    if (!comp || typeof comp !== 'object') return;
    if (
      typeof comp.onClick === 'string' &&
      comp.onClick.length > 0 &&
      !seen.has(comp.onClick)
    ) {
      seen.add(comp.onClick);
      if (comp.onClick.startsWith(TOOL_ACTION_PREFIX)) {
        entries.push({
          kind: 'tool',
          actionKey: comp.onClick,
          toolName: comp.onClick.slice(TOOL_ACTION_PREFIX.length),
          dataElement: comp.dataElement,
        });
      } else {
        entries.push({
          kind: 'onClick',
          actionKey: comp.onClick,
          dataElement: comp.dataElement,
        });
      }
    }
    if (
      comp.type === 'customElement' &&
      typeof comp.render === 'string' &&
      comp.render.length > 0 &&
      !seen.has(comp.render)
    ) {
      seen.add(comp.render);
      entries.push({
        kind: 'customElement',
        actionKey: comp.render,
        dataElement: comp.dataElement,
      });
    }
    if (Array.isArray(comp.children)) {
      comp.children.forEach(visit);
    }
  };

  for (const comp of Object.values(config.modularComponents || {})) {
    visit(comp);
  }

  for (const [panelKey, panel] of Object.entries(config.panels || {})) {
    if (
      panel &&
      typeof panel.render === 'string' &&
      panel.render.length > 0 &&
      !VALID_PANEL_RENDERS.has(panel.render) &&
      !seen.has(panel.render)
    ) {
      seen.add(panel.render);
      entries.push({
        kind: 'customPanel',
        actionKey: panel.render,
        dataElement: panelKey,
      });
    }
  }

  if (entries.length === 0) {
    return { entries: [], snippet: '' };
  }

  const lines = entries.map((entry) => {
    if (entry.kind === 'tool') {
      return `  '${entry.actionKey}': () => {\n    const { documentViewer } = instance.Core;\n    documentViewer.setToolMode(documentViewer.getTool('${entry.toolName}'));\n  },`;
    }
    if (entry.kind === 'customElement') {
      return `  '${entry.actionKey}': (args) => {\n    const element = document.createElement('div');\n    element.innerText = args || '${entry.dataElement || entry.actionKey}';\n    return element;\n  },`;
    }
    if (entry.kind === 'customPanel') {
      return `  '${entry.actionKey}': () => {\n    const div = document.createElement('div');\n    div.innerHTML = 'Custom panel (${entry.dataElement || entry.actionKey})';\n    return div;\n  },`;
    }
    return `  '${entry.actionKey}': () => {\n    // Custom onClick handler for '${entry.dataElement || entry.actionKey}'\n  },`;
  });

  const snippet = `const functionMap = {\n${lines.join('\n')}\n};\n\ninstance.UI.importModularComponents(config, functionMap);`;
  return { entries, snippet };
}
