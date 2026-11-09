import webviewerIconMap from './webviewerIconMap.json';

/**
 * Normalizes any icon key by removing potential file extensions or prefixes.
 * Handles:
 *   "icon-header-pan"
 *   "ic-hamburger-menu"
 *   "icon-tool-text-manipulation-highlight"
 *   "../../assets/icons/icon-header-pan.svg"
 */
export function normalizeIconName(iconName) {
  if (!iconName || typeof iconName !== 'string') return '';
  let clean = iconName.trim();
  if (clean.includes('/')) {
    clean = clean.split('/').pop();
  }
  if (clean.endsWith('.svg')) {
    clean = clean.slice(0, -4);
  }
  return clean;
}

/**
 * Ensures returned SVG markup is strictly valid from <svg to </svg>
 * and never leaks trailing minified javascript code or unescaped characters.
 */
function sanitizeSvg(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const start = raw.indexOf('<svg');
  const end = raw.lastIndexOf('</svg>');
  if (start >= 0 && end > start) {
    return raw.slice(start, end + 6);
  }
  return null;
}

/**
 * Structural category fallback SVGs for items without a dedicated WebViewer SVG.
 * All sized with viewBox="0 0 16 16" and currentColor for smooth styling.
 */
export const CATEGORY_FALLBACK_SVGS = {
  header: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1.5" y="3" width="13" height="10" rx="1.5" fill="none"/><line x1="1.5" y1="6.5" x2="14.5" y2="6.5" fill="none"/></svg>`,
  ribbonGroup: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1.5" y="4.5" width="13" height="9" rx="1.5" fill="none"/><path d="M1.5 8h13" fill="none"/><path d="M5 4.5V2.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" fill="none"/></svg>`,
  ribbonItem: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 13.5V3.5a1.5 1.5 0 0 1 1.5-1.5h3.1a1.5 1.5 0 0 1 1.06.44l1.34 1.34A1.5 1.5 0 0 0 10.06 4.2H12.5A1.5 1.5 0 0 1 14 5.7v7.8a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 13.5z" fill="none"/></svg>`,
  submenu: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3h10" fill="none"/><path d="M3 8h6" fill="none"/><path d="M3 13h10" fill="none"/><circle cx="12" cy="8" r="1.5" fill="currentColor"/></svg>`,
  divider: `<svg viewBox="0 0 16 16" fill="currentColor"><rect x="7" y="2" width="2" height="12" rx="1"/></svg>`,
  spacer: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2 2"><rect x="2" y="3" width="12" height="10" rx="2" fill="none"/></svg>`,
  panel: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="12" height="12" rx="2" fill="none"/><path d="M6 2v12" fill="none"/></svg>`,
  control: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M2 5h12" fill="none"/><circle cx="6" cy="5" r="1.5" fill="currentColor"/><path d="M2 11h12" fill="none"/><circle cx="10" cy="11" r="1.5" fill="currentColor"/></svg>`,
  custom: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="8 2 10 6 14.5 6.5 11 10 12 14.5 8 12 4 14.5 5 10 1.5 6.5 6 6 8 2" fill="none"/></svg>`,
  toggle: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="12" height="8" rx="4" fill="none"/><circle cx="10" cy="8" r="2" fill="currentColor"/></svg>`,
  tool: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l2 2-7.5 7.5-3 .5.5-3L12 2z" fill="none"/></svg>`,
  popup: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2h10a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6l-3 3V3a1 1 0 0 1 1-1z" fill="none"/></svg>`,
};

/**
 * Built-in mappings for default WebViewer header/component dataElement IDs.
 */
export const BUILTIN_ELEMENT_ICONS = {
  // Built-in Header Elements
  panToolButton: 'icon-header-pan',
  selectToolButton: 'icon-header-select-line',
  'zoom-container': 'icon-header-zoom-in-line',
  zoomOverlay: 'icon-header-zoom-in-line',
  'view-controls-toggle-button': 'icon-header-page-manipulation-line',
  'left-panel-toggle-button': 'icon-header-sidebar-line',
  'search-toggle-button': 'icon-header-search',
  'notes-panel-toggle-button': 'icon-header-chat-line',
  'menu-toggle-button': 'ic-hamburger-menu',
  'save-as-button': 'icon-header-download-line',
  printButton: 'icon-header-print-line',
  undoButton: 'icon-action-undo',
  redoButton: 'icon-action-redo',
  toggleNotesButton: 'icon-header-chat-line',
  fullscreenButton: 'icon-header-full-screen',
  fitWidthButton: 'icon-header-fit-width',
  fitPageButton: 'icon-header-fit-page',
  rotateClockwiseButton: 'icon-header-page-manipulation-rotate-clockwise-line',
  rotateCounterClockwiseButton:
    'icon-header-page-manipulation-rotate-counter-clockwise-line',
  compareButton: 'icon-header-compare-line',
  // Tools Grouped Items
  viewControlsFlyout: 'icon-header-page-manipulation-line',
  mainMenu: 'ic-hamburger-menu',
  'page-nav': 'icon-header-page-manipulation-line',
  // Popups
  annotationPopup: 'icon-annotate-ribbon',
  textPopup: 'icon-tool-text-manipulation-highlight',
  contextMenuPopup: 'ic-hamburger-menu',
  // Panel Toggle Icon Aliases
  'icon-tool-stamp-fill': 'icon-tool-stamp-line',
  'icon-attachment-line': 'ic_fileattachment_24px',
  'icon-panel-portfolio-line': 'icon-pdf-portfolio',
  'icon-panel-index-line': 'icon-index-panel-list',
  'icon-form-field-edit': 'icon-edit-form-field',
  'icon-annotation-replace-text': 'ic_replace',
};

/**
 * Retrieves the raw SVG string for an icon key or component object.
 *
 * @param {string|object} input - Icon name (e.g. 'icon-header-pan') or component definition
 * @returns {string|null} Raw SVG markup or null if not found
 */
export function getComponentSvg(input) {
  if (!input) return null;

  const resolve = () => {
    // If a string was passed directly
    if (typeof input === 'string') {
      const clean = normalizeIconName(input);
      if (webviewerIconMap[clean]) return webviewerIconMap[clean];
      if (BUILTIN_ELEMENT_ICONS[clean]) {
        const mapped = BUILTIN_ELEMENT_ICONS[clean];
        if (webviewerIconMap[mapped]) return webviewerIconMap[mapped];
      }
      if (CATEGORY_FALLBACK_SVGS[clean]) return CATEGORY_FALLBACK_SVGS[clean];
      return null;
    }

    // If a component object was passed
    const comp = input;

    // 1. Check if comp.img or comp.icon is provided
    const iconProp = comp.img || comp.icon;
    if (iconProp) {
      if (typeof iconProp === 'string') {
        if (iconProp.startsWith('<svg')) {
          return iconProp;
        }
        const clean = normalizeIconName(iconProp);
        if (webviewerIconMap[clean]) return webviewerIconMap[clean];
        if (BUILTIN_ELEMENT_ICONS[clean]) {
          const mapped = BUILTIN_ELEMENT_ICONS[clean];
          if (webviewerIconMap[mapped]) return webviewerIconMap[mapped];
        }
      }
    }

    // 2. Check dataElement or toolName or render against built-in mapping
    const id = comp.dataElement || comp.toolName || comp.render || comp.id;
    if (id) {
      const cleanId = normalizeIconName(id);
      if (webviewerIconMap[cleanId]) return webviewerIconMap[cleanId];
      if (BUILTIN_ELEMENT_ICONS[id]) {
        const mapped = BUILTIN_ELEMENT_ICONS[id];
        if (webviewerIconMap[mapped]) return webviewerIconMap[mapped];
      }
    }

    // 3. Fallback based on component type
    const type = comp.type;
    if (type === 'header' || comp.headerKey) {
      return CATEGORY_FALLBACK_SVGS.header;
    }
    if (type === 'ribbonGroup' || id === 'default-ribbon-group') {
      return CATEGORY_FALLBACK_SVGS.ribbonGroup;
    }
    if (type === 'ribbonItem') {
      return CATEGORY_FALLBACK_SVGS.ribbonItem;
    }
    if (type === 'divider' || id === 'divider' || (typeof id === 'string' && id.startsWith('divider-'))) {
      return CATEGORY_FALLBACK_SVGS.divider;
    }
    if (type === 'spacer') {
      return CATEGORY_FALLBACK_SVGS.spacer;
    }
    if (
      type === 'toggleButton' ||
      type === 'toggleElementButton' ||
      Boolean(comp.toggleElement)
    ) {
      return CATEGORY_FALLBACK_SVGS.toggle;
    }
    if (type === 'flyoutPanel' || comp.render || type === 'panel') {
      return CATEGORY_FALLBACK_SVGS.panel;
    }
    if (Array.isArray(comp.children) || comp.isSubmenu) {
      return CATEGORY_FALLBACK_SVGS.submenu;
    }
    if (type === 'customButton') {
      return CATEGORY_FALLBACK_SVGS.custom;
    }
    if (type === 'toolButton') {
      return CATEGORY_FALLBACK_SVGS.tool;
    }

    return CATEGORY_FALLBACK_SVGS.control;
  };

  const raw = resolve();
  return (
    sanitizeSvg(raw) ||
    (typeof input === 'object' ? CATEGORY_FALLBACK_SVGS.tool : null)
  );
}
