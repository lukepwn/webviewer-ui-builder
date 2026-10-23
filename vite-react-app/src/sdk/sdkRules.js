// Data-only constants describing what the WebViewer SDK accepts when importing
// modular UI JSON. Discovered empirically with the harness (src/harness/tests.js,
// test ids in brackets). No logic here: see importConfig.js for enforcement.

// Component types a flyout (or flyout submenu) may contain. Anything else
// (toolButton, divider, label, groupedItems, ribbons, headers, panels) makes the
// SDK reject the entire config [5, 10].
// To get a "tool button" in a flyout use a customButton with a named onClick
// resolved through the importModularComponents functionMap [12].
export const FLYOUT_ITEM_TYPES = new Set([
  'presetButton',
  'customButton',
  'statefulButton',
  'toggleButton',
]);

// Guard against runaway/cyclic submenu nesting when expanding `children` [13, 15].
export const MAX_SUBMENU_DEPTH = 8;

// Prefix used for customButton onClick handlers that activate a WebViewer tool
// via the importModularComponents functionMap [12].
export const TOOL_ACTION_PREFIX = 'activateTool:';

// Component types each Add-Component modal tab creates. Tabs missing here don't
// place an item at a target location (new flyout, tab panel, ribbon tab) so
// they are never restricted by the target. The 'flyout' tab creates a toggle
// that targets a flyout, which is rejected inside flyouts [1b], so it maps to
// no allowed type on purpose. The 'tool' tab emits a customButton (with an
// activateTool:<toolName> onClick) when targeting a flyout [12].
// The 'layout' tab is allowed in flyouts because literal 'divider' entries are
// valid in flyouts[key].items (see normalizeFlyouts in importConfig.js).
export const MODAL_TAB_ITEM_TYPES = {
  tool: ['toolButton', 'customButton'],
  preset: ['presetButton'],
  toggle: ['toggleButton'],
  flyout: [],
  controls: ['viewControls', 'pageControls'],
  layout: ['divider', 'label'],
};

// Literal string token WebViewer accepts inside headers[k].items,
// groupedItems.items, and flyouts[k].items.
export const DIVIDER_ITEM_TOKEN = 'divider';

// A tabPanel without a `panelsList` array crashes when rendered. An empty
// array is valid and renders an empty strip [3].
export const TAB_PANEL_RENDER = 'tabPanel';

export const ALLOWED_HEADER_PLACEMENTS = new Set([
  'top',
  'bottom',
  'left',
  'right',
]);

// Singular/alternate panel render names used in Apryse documentation snippets
// mapped to the canonical names accepted by WebViewer's validatePanels.
export const PANEL_RENDER_ALIASES = {
  outlinePanel: 'outlinesPanel',
  thumbnailPanel: 'thumbnailsPanel',
  bookmarkPanel: 'bookmarksPanel',
};

// Valid top-level keys inside `config.popups` (v11.8+).
export const VALID_POPUP_KEYS = new Set([
  'annotationPopup',
  'textPopup',
  'contextMenuPopup',
]);

// Panel renders the SDK's validatePanels accepts. A non-whitelisted render
// aborts the entire import.
export const VALID_PANEL_RENDERS = new Set([
  'outlinesPanel',
  'signaturePanel',
  'bookmarksPanel',
  'fileAttachmentPanel',
  'thumbnailsPanel',
  'layersPanel',
  'textEditingPanel',
  'changeListPanel',
  'stylePanel',
  'redactionPanel',
  'searchPanel',
  'notesPanel',
  'indexPanel',
  'tabPanel',
  'signatureListPanel',
  'rubberStampPanel',
  'portfolioPanel',
  'formFieldPanel',
]);
