import {
  TOOLS_CATALOG,
  PRESET_BUTTONS_CATALOG,
  PANELS_CATALOG,
  LAYOUT_ELEMENTS_CATALOG,
  BUILTIN_POPUP_ITEMS_CATALOG,
  POPUPS_CATALOG,
} from '../constants/webviewerCatalog';

// Pre-index catalog entries by known identifiers for fast lookup
const CATALOG_LABEL_MAP = new Map([
  ['default-top-header', 'Top Header'],
  ['page-nav-floating-header', 'Page Nav Floating Header'],
  ['leftPanelButton', 'Left Panel Toggle'],
  ['menuButton', 'Main Menu Button'],
  ['view-controls', 'View Controls'],
  ['zoom-container', 'Zoom Controls'],
  ['page-controls-container', 'Page Controls'],
  ['searchPanelToggle', 'Search Panel Toggle'],
  ['notesPanelToggle', 'Notes Panel Toggle'],
  ['comparePanelToggle', 'Compare Panel Toggle'],
  ['stylePanelToggle', 'Style Panel Toggle'],
  ['redactionPanelToggle', 'Redaction Panel Toggle'],
  ['indexPanelListToggle', 'Index Panel Toggle'],
  ['pageRedactionToggleButton', 'Redact Pages Button'],
  ['MainMenuFlyout', 'Main Menu Flyout'],
  ['viewControlsFlyout', 'View Controls Flyout'],
]);

TOOLS_CATALOG.forEach((t) => {
  if (t.defaultId) CATALOG_LABEL_MAP.set(t.defaultId, t.label);
  if (t.toolName) CATALOG_LABEL_MAP.set(t.toolName, t.label);
  if (t.key) CATALOG_LABEL_MAP.set(t.key, t.label);
});

PRESET_BUTTONS_CATALOG.forEach((p) => {
  if (p.defaultId) CATALOG_LABEL_MAP.set(p.defaultId, p.label);
  if (p.buttonType) CATALOG_LABEL_MAP.set(p.buttonType, p.label);
});

PANELS_CATALOG.forEach((p) => {
  if (p.id) CATALOG_LABEL_MAP.set(p.id, p.name);
  if (p.render) CATALOG_LABEL_MAP.set(p.render, p.name);
});

LAYOUT_ELEMENTS_CATALOG.forEach((l) => {
  if (l.defaultId) CATALOG_LABEL_MAP.set(l.defaultId, l.name);
  if (l.type) CATALOG_LABEL_MAP.set(l.type, l.name);
});

POPUPS_CATALOG.forEach((p) => {
  if (p.id) CATALOG_LABEL_MAP.set(p.id, p.name);
  (p.defaultItems || []).forEach((item) => {
    if (item.dataElement && item.label) {
      CATALOG_LABEL_MAP.set(item.dataElement, item.label);
    }
  });
});

BUILTIN_POPUP_ITEMS_CATALOG.forEach((item) => {
  if (item.dataElement) CATALOG_LABEL_MAP.set(item.dataElement, item.label);
});

/**
 * Checks whether an identifier or component represents a divider.
 * Handles both the public literal token 'divider' and Apryse's internal leaked
 * dictionary keys ('divider-0.1', 'divider-0.4', etc.).
 */
export function isDivider(key, comp = {}) {
  const id = typeof key === 'string' ? key : comp?.dataElement || '';
  return (
    id === 'divider' || id.startsWith('divider-') || comp?.type === 'divider'
  );
}

/**
 * Formats a technical camelCase or kebab-case identifier into readable words.
 */
export function humanizeKey(rawKey = '') {
  if (!rawKey || typeof rawKey !== 'string') return '';
  if (rawKey === 'divider' || rawKey.startsWith('divider-')) return 'Divider';
  if (rawKey === 'spacer') return 'Spacer';

  const cleaned = rawKey
    .replace(/^toolbarGroup-/i, '')
    .replace(/^ribbon-/i, '')
    .replace(/ToolGroupToggleButton(\d*)$/i, ' Group Toggle $1')
    .replace(/ToolGroupButton(\d*)$/i, ' $1')
    .replace(/ToolButton(\d*)$/i, ' $1')
    .replace(/RibbonItem(\d*)$/i, ' $1')
    .replace(/([a-zA-Z])(\d+)/g, '$1 $2')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .trim();

  if (!cleaned) return rawKey;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

/**
 * Resolves a friendly human-readable display name for a component or container.
 */
export function getFriendlyComponentName(key, comp = {}) {
  if (!key && !comp) return 'Component';
  const id = key || comp?.dataElement || '';

  if (isDivider(id, comp)) return 'Divider';
  if (id === 'spacer' || comp?.type === 'spacer') return 'Spacer';

  // Prefer explicit user-configured label if it isn't an i18n token (contains dots)
  if (
    comp?.label &&
    typeof comp.label === 'string' &&
    !comp.label.includes('.') &&
    comp.label !== id
  ) {
    return comp.label;
  }

  // Check catalog map by id, toolName, buttonType, or render
  if (CATALOG_LABEL_MAP.has(id)) {
    return CATALOG_LABEL_MAP.get(id);
  }
  if (comp?.toolName && CATALOG_LABEL_MAP.has(comp.toolName)) {
    return CATALOG_LABEL_MAP.get(comp.toolName);
  }
  if (comp?.buttonType && CATALOG_LABEL_MAP.has(comp.buttonType)) {
    return CATALOG_LABEL_MAP.get(comp.buttonType);
  }
  if (comp?.render && CATALOG_LABEL_MAP.has(comp.render)) {
    return CATALOG_LABEL_MAP.get(comp.render);
  }

  // Check stripped button suffixes (e.g. highlightToolButton -> highlightButton)
  const normalizedButtonId = id
    .replace(/ToolButton$/i, 'Button')
    .replace(/ToolGroupButton$/i, 'Button');
  if (CATALOG_LABEL_MAP.has(normalizedButtonId)) {
    return CATALOG_LABEL_MAP.get(normalizedButtonId);
  }

  if (
    comp?.title &&
    typeof comp.title === 'string' &&
    !comp.title.includes('.') &&
    comp.title !== id
  ) {
    return comp.title;
  }

  return humanizeKey(id);
}
