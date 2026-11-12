import React from 'react';
import {
  TOOLS_CATALOG,
  PRESET_BUTTONS_CATALOG,
} from '../constants/webviewerCatalog';
import { getComponentSvg } from '../constants/webviewerIcons';
import { isDivider } from '../utils/labelUtils';

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

  if (type === 'header' || component.headerKey) {
    return { label: 'Modular Header', className: 'badge-header' };
  }

  if (Array.isArray(component.children) || component.isSubmenu) {
    return { label: 'Submenu', className: 'badge-submenu' };
  }

  if (
    type === 'flyoutPanel' ||
    type === 'panel' ||
    (component.render &&
      ['rubberStampPanel', 'signatureListPanel', 'stylePanel'].includes(
        component.render,
      ))
  ) {
    return { label: 'Panel', className: 'badge-panel' };
  }

  if (
    type === 'toolButton' ||
    Boolean(component.toolName) ||
    TOOLS_SET.has(dataElement) ||
    TOOLS_SET.has(type) ||
    dataElement.toLowerCase().endsWith('toolbutton') ||
    dataElement.toLowerCase().endsWith('tool')
  ) {
    return { label: 'Tool Button', className: 'badge-tool' };
  }

  if (
    type === 'presetButton' ||
    PRESETS_SET.has(dataElement) ||
    dataElement.toLowerCase().endsWith('presetbutton')
  ) {
    return { label: 'Preset Button', className: 'badge-preset' };
  }

  if (type === 'toolGroupToggleButton') {
    return { label: 'Tool Group Toggle', className: 'badge-toggle' };
  }

  if (
    type === 'toggleButton' ||
    type === 'toggleElementButton' ||
    component.toggleElement ||
    component.element
  ) {
    return { label: 'Toggle Button', className: 'badge-toggle' };
  }

  if (type === 'customButton') {
    return { label: 'Custom Button', className: 'badge-custom' };
  }

  if (type === 'ribbonGroup') {
    return { label: 'Ribbon Tabs Group', className: 'badge-ribbon-group' };
  }

  if (type === 'ribbonItem') {
    return { label: 'Ribbon Tab', className: 'badge-toggle' };
  }

  if (type === 'groupedItems') {
    return { label: 'Grouped Items', className: 'badge-group' };
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

  if (isDivider(dataElement, component) || type === 'spacer') {
    return { label: 'Divider / Spacer', className: 'badge-layout' };
  }

  // Popup actions or untyped built-in items
  if (type === 'popupAction') {
    return { label: 'Popup Action', className: 'badge-popup' };
  }

  return { label: type || 'Component', className: 'badge-other' };
}

export default function ComponentBadge({
  component = {},
  badgeOverride = null,
  showText = false,
}) {
  const info = badgeOverride || getComponentBadgeInfo(component);
  if (!info) return null;

  const svgMarkup = getComponentSvg(component);

  // If text badge is requested explicitly
  if (showText || !svgMarkup) {
    return (
      <span className={`item-badge ${info.className}`} title={info.label}>
        {info.label}
      </span>
    );
  }

  // Render compact 20x20px icon badge with hover tooltip
  return (
    <span
      className={`item-badge item-badge-icon ${info.className}`}
      title={info.label}
      aria-label={info.label}
      dangerouslySetInnerHTML={{ __html: svgMarkup }}
    />
  );
}
