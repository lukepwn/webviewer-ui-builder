// Static registry of WebViewer items (components, tools, ribbon tabs, panels,
// and popup items) that require enabling a specific UI.Feature or a document/mode
// precondition in order to appear or function in WebViewer.
//
// Cross-referenced against https://sdk.apryse.com/api/web/UI.html#.Feature

import { resolvePanelTarget } from './webviewerCatalog.js';

export const FEATURE_DESCRIPTIONS = {
  ComparePages:
    'Requires WebViewer feature: ComparePages (UI.enableFeatures([UI.Feature.ComparePages])) and Multi-Viewer mode',
  MultiViewerMode:
    'Requires WebViewer feature: MultiViewerMode (or UI.enterMultiViewerMode())',
  Redaction:
    'Requires WebViewer feature: Redaction (UI.enableFeatures([UI.Feature.Redaction])) and fullAPI: true',
  ContentEdit:
    'Requires WebViewer feature: ContentEdit (UI.enableFeatures([UI.Feature.ContentEdit]))',
  Measurement:
    'Requires WebViewer feature: Measurement (UI.enableFeatures([UI.Feature.Measurement]))',
  Portfolio:
    'Requires WebViewer feature: Portfolio (UI.enableFeatures([UI.Feature.Portfolio])) and fullAPI: true',
  FilePicker:
    'Requires WebViewer feature: FilePicker (UI.enableFeatures([UI.Feature.FilePicker]))',
  Print:
    'Requires WebViewer feature: Print (UI.enableFeatures([UI.Feature.Print]))',
  Download:
    'Requires WebViewer feature: Download (UI.enableFeatures([UI.Feature.Download]))',
  Search:
    'Requires WebViewer feature: Search (UI.enableFeatures([UI.Feature.Search]))',
  Copy: 'Requires WebViewer feature: Copy (UI.enableFeatures([UI.Feature.Copy]))',
  MathSymbols:
    'Requires WebViewer feature: MathSymbols (UI.enableFeatures([UI.Feature.MathSymbols]))',
  OutlineEditing:
    'Requires WebViewer feature: OutlineEditing (UI.enableFeatures([UI.Feature.OutlineEditing])) and fullAPI: true',
  Initials:
    'Requires WebViewer feature: Initials (UI.enableFeatures([UI.Feature.Initials]))',
  SavedSignaturesTab:
    'Requires WebViewer feature: SavedSignaturesTab (UI.enableFeatures([UI.Feature.SavedSignaturesTab]))',
  MultiTab:
    'Requires WebViewer feature: MultiTab (UI.enableFeatures([UI.Feature.MultiTab]))',
};

// Direct map of dataElement / component key / toolName / panel id -> requirement entry
export const ITEM_REQUIREMENTS_MAP = {
  // --- ComparePages / MultiViewerMode ---
  comparePanelToggle: {
    feature: 'ComparePages',
    tooltip: FEATURE_DESCRIPTIONS.ComparePages,
  },
  compareButton: {
    feature: 'ComparePages',
    tooltip: FEATURE_DESCRIPTIONS.ComparePages,
  },
  changeListPanel: {
    feature: 'ComparePages',
    tooltip: FEATURE_DESCRIPTIONS.ComparePages,
  },
  changeListPanelToggle: {
    feature: 'ComparePages',
    tooltip: FEATURE_DESCRIPTIONS.ComparePages,
  },
  toggleCompareModeButton: {
    feature: 'MultiViewerMode',
    tooltip: FEATURE_DESCRIPTIONS.MultiViewerMode,
  },
  toggleMultiViewerModeButton: {
    feature: 'MultiViewerMode',
    tooltip: FEATURE_DESCRIPTIONS.MultiViewerMode,
  },

  // --- Redaction ---
  'toolbarGroup-Redact': {
    feature: 'Redaction',
    tooltip: FEATURE_DESCRIPTIONS.Redaction,
  },
  redactionGroupedItems: {
    feature: 'Redaction',
    tooltip: FEATURE_DESCRIPTIONS.Redaction,
  },
  redactionButton: {
    feature: 'Redaction',
    tooltip: FEATURE_DESCRIPTIONS.Redaction,
  },
  redactionToolButton: {
    feature: 'Redaction',
    tooltip: FEATURE_DESCRIPTIONS.Redaction,
  },
  redactionToolGroupButton: {
    feature: 'Redaction',
    tooltip: FEATURE_DESCRIPTIONS.Redaction,
  },
  AnnotationCreateRedaction: {
    feature: 'Redaction',
    tooltip: FEATURE_DESCRIPTIONS.Redaction,
  },
  pageRedactionToggleButton: {
    feature: 'Redaction',
    tooltip: FEATURE_DESCRIPTIONS.Redaction,
  },
  pageRedactionToolGroupButton: {
    feature: 'Redaction',
    tooltip: FEATURE_DESCRIPTIONS.Redaction,
  },
  redactionPanel: {
    feature: 'Redaction',
    tooltip: FEATURE_DESCRIPTIONS.Redaction,
  },
  redactionPanelToggle: {
    feature: 'Redaction',
    tooltip: FEATURE_DESCRIPTIONS.Redaction,
  },
  annotationRedactButton: {
    feature: 'Redaction',
    tooltip: `${FEATURE_DESCRIPTIONS.Redaction} — shown in popup when a redaction annotation is selected`,
  },
  textRedactToolButton: {
    feature: 'Redaction',
    tooltip: `${FEATURE_DESCRIPTIONS.Redaction} — shown in text popup when Redaction is enabled`,
  },

  // --- ContentEdit ---
  'toolbarGroup-EditText': {
    feature: 'ContentEdit',
    tooltip: FEATURE_DESCRIPTIONS.ContentEdit,
  },
  contentEditGroupedItems: {
    feature: 'ContentEdit',
    tooltip: FEATURE_DESCRIPTIONS.ContentEdit,
  },
  contentEditButton: {
    feature: 'ContentEdit',
    tooltip: FEATURE_DESCRIPTIONS.ContentEdit,
  },
  addParagraphToolGroupButton: {
    feature: 'ContentEdit',
    tooltip: FEATURE_DESCRIPTIONS.ContentEdit,
  },
  AddParagraphTool: {
    feature: 'ContentEdit',
    tooltip: FEATURE_DESCRIPTIONS.ContentEdit,
  },
  addImageContentToolGroupButton: {
    feature: 'ContentEdit',
    tooltip: FEATURE_DESCRIPTIONS.ContentEdit,
  },
  AddImageContentTool: {
    feature: 'ContentEdit',
    tooltip: FEATURE_DESCRIPTIONS.ContentEdit,
  },
  searchAndReplace: {
    feature: 'ContentEdit',
    tooltip: FEATURE_DESCRIPTIONS.ContentEdit,
  },
  textEditingPanel: {
    feature: 'ContentEdit',
    tooltip: FEATURE_DESCRIPTIONS.ContentEdit,
  },
  textEditingPanelToggle: {
    feature: 'ContentEdit',
    tooltip: FEATURE_DESCRIPTIONS.ContentEdit,
  },

  // --- Measurement ---
  'toolbarGroup-Measure': {
    feature: 'Measurement',
    tooltip: FEATURE_DESCRIPTIONS.Measurement,
  },
  measureGroupedItems: {
    feature: 'Measurement',
    tooltip: FEATURE_DESCRIPTIONS.Measurement,
  },
  measurementOverlay: {
    feature: 'Measurement',
    tooltip: FEATURE_DESCRIPTIONS.Measurement,
  },
  distanceToolGroupButton: {
    feature: 'Measurement',
    tooltip: FEATURE_DESCRIPTIONS.Measurement,
  },
  distanceMeasurementToolButton: {
    feature: 'Measurement',
    tooltip: FEATURE_DESCRIPTIONS.Measurement,
  },
  distanceButton: {
    feature: 'Measurement',
    tooltip: FEATURE_DESCRIPTIONS.Measurement,
  },
  AnnotationCreateDistanceMeasurement: {
    feature: 'Measurement',
    tooltip: FEATURE_DESCRIPTIONS.Measurement,
  },
  arcMeasurementToolGroupButton: {
    feature: 'Measurement',
    tooltip: FEATURE_DESCRIPTIONS.Measurement,
  },
  arcMeasurementToolButton: {
    feature: 'Measurement',
    tooltip: FEATURE_DESCRIPTIONS.Measurement,
  },
  AnnotationCreateArcMeasurement: {
    feature: 'Measurement',
    tooltip: FEATURE_DESCRIPTIONS.Measurement,
  },
  perimeterToolGroupButton: {
    feature: 'Measurement',
    tooltip: FEATURE_DESCRIPTIONS.Measurement,
  },
  perimeterMeasurementToolButton: {
    feature: 'Measurement',
    tooltip: FEATURE_DESCRIPTIONS.Measurement,
  },
  perimeterButton: {
    feature: 'Measurement',
    tooltip: FEATURE_DESCRIPTIONS.Measurement,
  },
  AnnotationCreatePerimeterMeasurement: {
    feature: 'Measurement',
    tooltip: FEATURE_DESCRIPTIONS.Measurement,
  },
  areaToolGroupButton: {
    feature: 'Measurement',
    tooltip: FEATURE_DESCRIPTIONS.Measurement,
  },
  areaMeasurementToolButton: {
    feature: 'Measurement',
    tooltip: FEATURE_DESCRIPTIONS.Measurement,
  },
  areaButton: {
    feature: 'Measurement',
    tooltip: FEATURE_DESCRIPTIONS.Measurement,
  },
  AnnotationCreateAreaMeasurement: {
    feature: 'Measurement',
    tooltip: FEATURE_DESCRIPTIONS.Measurement,
  },
  rectangleAreaToolGroupButton: {
    feature: 'Measurement',
    tooltip: FEATURE_DESCRIPTIONS.Measurement,
  },
  rectangularAreaMeasurementToolButton: {
    feature: 'Measurement',
    tooltip: FEATURE_DESCRIPTIONS.Measurement,
  },
  rectAreaButton: {
    feature: 'Measurement',
    tooltip: FEATURE_DESCRIPTIONS.Measurement,
  },
  AnnotationCreateRectangularAreaMeasurement: {
    feature: 'Measurement',
    tooltip: FEATURE_DESCRIPTIONS.Measurement,
  },
  ellipseAreaToolGroupButton: {
    feature: 'Measurement',
    tooltip: FEATURE_DESCRIPTIONS.Measurement,
  },
  ellipseMeasurementToolButton: {
    feature: 'Measurement',
    tooltip: FEATURE_DESCRIPTIONS.Measurement,
  },
  ellipseAreaButton: {
    feature: 'Measurement',
    tooltip: FEATURE_DESCRIPTIONS.Measurement,
  },
  AnnotationCreateEllipseMeasurement: {
    feature: 'Measurement',
    tooltip: FEATURE_DESCRIPTIONS.Measurement,
  },
  countToolGroupButton: {
    feature: 'Measurement',
    tooltip: FEATURE_DESCRIPTIONS.Measurement,
  },
  countMeasurementToolButton: {
    feature: 'Measurement',
    tooltip: FEATURE_DESCRIPTIONS.Measurement,
  },
  countButton: {
    feature: 'Measurement',
    tooltip: FEATURE_DESCRIPTIONS.Measurement,
  },
  AnnotationCreateCountMeasurement: {
    feature: 'Measurement',
    tooltip: FEATURE_DESCRIPTIONS.Measurement,
  },
  cloudyRectangleAreaToolGroupButton: {
    feature: 'Measurement',
    tooltip: FEATURE_DESCRIPTIONS.Measurement,
  },
  cloudyAreaButton: {
    feature: 'Measurement',
    tooltip: FEATURE_DESCRIPTIONS.Measurement,
  },
  AnnotationCreateCloudyRectangularAreaMeasurement: {
    feature: 'Measurement',
    tooltip: FEATURE_DESCRIPTIONS.Measurement,
  },
  scaleModalButton: {
    feature: 'Measurement',
    tooltip: `${FEATURE_DESCRIPTIONS.Measurement} — shown in popup when a measurement annotation is selected`,
  },

  // --- Portfolio ---
  createPortfolioButton: {
    feature: 'Portfolio',
    tooltip: FEATURE_DESCRIPTIONS.Portfolio,
  },
  portfolioPanel: {
    feature: 'Portfolio',
    tooltip: `${FEATURE_DESCRIPTIONS.Portfolio} (or a loaded PDF Portfolio document)`,
  },
  portfolioPanelButton: {
    feature: 'Portfolio',
    tooltip: `${FEATURE_DESCRIPTIONS.Portfolio} (or a loaded PDF Portfolio document)`,
  },
  portfolioPanelToggle: {
    feature: 'Portfolio',
    tooltip: `${FEATURE_DESCRIPTIONS.Portfolio} (or a loaded PDF Portfolio document)`,
  },

  // --- FilePicker ---
  filePickerButton: {
    feature: 'FilePicker',
    tooltip: FEATURE_DESCRIPTIONS.FilePicker,
  },

  // --- MathSymbols / Initials / SavedSignaturesTab ---
  mathSymbolsButton: {
    feature: 'MathSymbols',
    tooltip: FEATURE_DESCRIPTIONS.MathSymbols,
  },
  signatureOptionsDropdown: {
    feature: 'Initials',
    tooltip: FEATURE_DESCRIPTIONS.Initials,
  },
  savedSignatureAndInitialsTabs: {
    feature: 'Initials',
    tooltip: FEATURE_DESCRIPTIONS.Initials,
  },
  savedSignaturesTab: {
    feature: 'SavedSignaturesTab',
    tooltip: FEATURE_DESCRIPTIONS.SavedSignaturesTab,
  },

  // --- Document / Context-Dependent Items ---
  layersPanel: {
    feature: 'Layers',
    tooltip:
      'Requires a PDF document containing Optional Content Groups (PDF Layers)',
  },
  layersPanelToggle: {
    feature: 'Layers',
    tooltip:
      'Requires a PDF document containing Optional Content Groups (PDF Layers)',
  },
  fileAttachmentPanel: {
    feature: 'Attachments',
    tooltip: 'Requires a PDF document with embedded file attachments',
  },
  fileAttachmentPanelToggle: {
    feature: 'Attachments',
    tooltip: 'Requires a PDF document with embedded file attachments',
  },
  viewFileButton: {
    feature: 'Attachments',
    tooltip:
      'Shown in popup only when a File Attachment annotation is selected',
  },
  downloadFileButton: {
    feature: 'Attachments',
    tooltip:
      'Shown in popup only when a File Attachment annotation is selected',
  },
  annotationDateEditButton: {
    feature: 'Context',
    tooltip: 'Shown in popup only when a Date annotation is selected',
  },
  annotationCropButton: {
    feature: 'Context',
    tooltip: 'Shown in popup only when the Crop Tool is active',
  },
  annotationContentEditButton: {
    feature: 'Context',
    tooltip: 'Shown in popup only when a FreeText annotation is selected',
  },
  annotationClearSignatureButton: {
    feature: 'Context',
    tooltip: 'Shown in popup only when a Signature annotation is selected',
  },
  annotationGroupButton: {
    feature: 'Context',
    tooltip: 'Shown in popup only when multiple annotations are selected',
  },
  annotationUngroupButton: {
    feature: 'Context',
    tooltip: 'Shown in popup only when grouped annotations are selected',
  },
  openAlignmentModalButton: {
    feature: 'Context',
    tooltip: 'Shown in popup only when multiple annotations are selected',
  },
  formFieldEditButton: {
    feature: 'Forms',
    tooltip:
      'Shown only when Form Builder mode is active and a form field is selected',
  },
  formFieldPanel: {
    feature: 'Forms',
    tooltip: 'Requires Form Builder mode with a form field selected',
  },
  soundPlayButton: {
    feature: 'Context',
    tooltip: 'Shown in popup only when a Sound annotation is selected',
  },
  shortCutKeysFor3D: {
    feature: 'Context',
    tooltip: 'Shown in popup only when a 3D annotation is selected',
  },
  readerPageTransitionButton: {
    feature: 'ReaderMode',
    tooltip: 'Only active when Reader Mode is enabled',
  },
};

/**
 * Resolves whether an item (component, ribbon tab, popup item, or panel toggle)
 * has a static WebViewer feature requirement, context precondition, or explicit
 * `disabled: true` flag in the JSON configuration.
 *
 * @param {string} itemKey - Component key or dataElement
 * @param {object} [comp={}] - Component definition object from config
 * @returns {{ feature: string, tooltip: string } | null}
 */
export function getItemFeatureRequirement(itemKey, comp = {}) {
  if (!itemKey && !comp) return null;

  const isExplicitlyDisabled = comp?.disabled === true;
  const disabledSuffix = isExplicitlyDisabled
    ? ' (also marked "disabled": true in JSON)'
    : '';

  // 1. Explicit feature property defined in custom JSON
  if (typeof comp?.feature === 'string' && comp.feature.trim()) {
    const feat = comp.feature.trim();
    const baseTooltip =
      FEATURE_DESCRIPTIONS[feat] || `Requires WebViewer feature: ${feat}`;
    return {
      feature: feat,
      tooltip: `${baseTooltip}${disabledSuffix}`,
    };
  }

  // 2. Direct lookup by itemKey, dataElement, buttonType, or toolName
  const candidates = [
    itemKey,
    comp?.dataElement,
    comp?.buttonType,
    comp?.toolName,
    comp?.toolbarGroup,
  ].filter(Boolean);

  for (const key of candidates) {
    if (ITEM_REQUIREMENTS_MAP[key]) {
      const req = ITEM_REQUIREMENTS_MAP[key];
      return {
        feature: req.feature,
        tooltip: `${req.tooltip}${disabledSuffix}`,
      };
    }
  }

  // 3. Check if this is a toggle button targeting a feature-dependent panel/modal
  const targetElement =
    resolvePanelTarget(comp) || comp?.toggleElement || comp?.element;
  if (targetElement && ITEM_REQUIREMENTS_MAP[targetElement]) {
    const req = ITEM_REQUIREMENTS_MAP[targetElement];
    return {
      feature: req.feature,
      tooltip: `${req.tooltip}${disabledSuffix}`,
    };
  }

  // 4. Fallback if the JSON explicitly marks the component as `"disabled": true`
  if (isExplicitlyDisabled) {
    return {
      feature: 'Disabled',
      tooltip: 'Marked as "disabled": true in JSON configuration',
    };
  }

  return null;
}
