import React from 'react';
import {
  TOOLS_CATALOG,
  PRESET_BUTTONS_CATALOG,
} from '../constants/webviewerCatalog';

const TOOLS_SET = new Set(
  TOOLS_CATALOG.flatMap((t) => [t.defaultId, t.toolName, t.key]).filter(
    Boolean,
  ),
);

const PRESETS_SET = new Set(
  PRESET_BUTTONS_CATALOG.flatMap((p) => [p.defaultId, p.buttonType]).filter(
    Boolean,
  ),
);

export function getComponentBadgeInfo(component = {}) {
  const type = component.type || '';
  const dataElement = component.dataElement || '';

  if (Array.isArray(component.children) || component.isSubmenu) {
    return { label: 'Submenu', className: 'badge-custom' };
  }

  if (
    type === 'toolButton' ||
    TOOLS_SET.has(dataElement) ||
    TOOLS_SET.has(type) ||
    dataElement.toLowerCase().endsWith('toolbutton') ||
    dataElement.toLowerCase().endsWith('tool')
  ) {
    return { label: 'Tool', className: 'badge-tool' };
  }

  if (
    type === 'presetButton' ||
    PRESETS_SET.has(dataElement) ||
    dataElement.toLowerCase().endsWith('presetbutton')
  ) {
    return { label: 'Preset', className: 'badge-preset' };
  }

  if (
    type === 'toggleButton' ||
    type === 'toggleElementButton' ||
    component.toggleElement ||
    component.element
  ) {
    return { label: 'Toggle', className: 'badge-toggle' };
  }

  if (type === 'customButton') {
    return { label: 'Custom', className: 'badge-custom' };
  }

  if (type === 'ribbonGroup') {
    return { label: 'RibbonGroup', className: 'badge-preset' };
  }

  if (type === 'ribbonItem') {
    return { label: 'RibbonItem', className: 'badge-toggle' };
  }

  if (type === 'groupedItems') {
    return { label: 'GroupedItems', className: 'badge-controls' };
  }

  if (
    type === 'pageControls' ||
    type === 'zoom' ||
    type === 'viewControls' ||
    type === 'control' ||
    dataElement.toLowerCase().includes('page')
  ) {
    return { label: 'Control', className: 'badge-controls' };
  }

  if (type === 'label') {
    return { label: 'Label', className: 'badge-label' };
  }

  if (type === 'divider' || type === 'spacer') {
    return { label: 'Layout', className: 'badge-layout' };
  }

  // Popup actions or untyped built-in items do not need an artificial badge
  if (type === 'popupAction' || !type) {
    return null;
  }

  return { label: type, className: 'badge-other' };
}

export default function ComponentBadge({
  component = {},
  badgeOverride = null,
}) {
  const info = badgeOverride || getComponentBadgeInfo(component);
  if (!info) return null;
  return <span className={`item-badge ${info.className}`}>{info.label}</span>;
}
