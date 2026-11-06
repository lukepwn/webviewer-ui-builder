import React from 'react';
import ComponentBadge from './ComponentBadge';
import {
  PANELS_CATALOG,
  resolvePanelTarget,
} from '../constants/webviewerCatalog';
import { getItemFeatureRequirement } from '../constants/featureRegistry';

export default function ComponentItemRow({
  item,
  index,
  totalItems = 1,
  onMoveItem,
  onDeleteTool,
  targetContext,
  isSubmenu = false,
  isExpanded = false,
  onToggleExpand,
  extraPill = null,
  children = null,
  className = '',
  panels = {},
  onChangePanelLocation,
}) {
  const comp = item.component || item || {};
  const itemKey = item.key || comp.dataElement || '';
  const featureReq = getItemFeatureRequirement(itemKey, comp);

  const canMoveUp = index > 0;
  const canMoveDown = index < totalItems - 1;

  const displayName =
    itemKey || comp.dataElement || (comp.type === 'divider' ? 'divider' : '');

  const requiresFnMap =
    comp.type === 'customButton' &&
    typeof comp.onClick === 'string' &&
    comp.onClick.length > 0;

  const isFlyoutPanel =
    comp.type === 'flyoutPanel' ||
    (targetContext?.type === 'flyout' && Boolean(comp.render));

  const targetElement = isFlyoutPanel ? null : resolvePanelTarget(comp);
  const panelDef = targetElement
    ? panels[targetElement] ||
      PANELS_CATALOG.find((p) => p.id === targetElement)
    : null;
  const isPanelToggle = Boolean(panelDef);
  const panelLocation =
    (panels[targetElement] && panels[targetElement].location) ||
    panelDef?.defaultLocation ||
    'left';

  return (
    <React.Fragment>
      <div
        className={`tool-item ${isSubmenu ? 'tool-item-submenu-parent' : ''} ${className}`}
      >
        <div className="tool-info">
          {isSubmenu && onToggleExpand ? (
            <button
              type="button"
              className="submenu-expand-btn"
              onClick={onToggleExpand}
              title={isExpanded ? 'Collapse submenu' : 'Expand submenu'}
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          ) : null}

          <ComponentBadge component={comp} />

          <div className="tool-name-container">
            <span className="tool-display-name">{displayName}</span>
            {isSubmenu && Array.isArray(comp.children) && (
              <span className="tool-subtext" style={{ fontStyle: 'italic' }}>
                ({comp.children.length} items)
              </span>
            )}
          </div>

          {featureReq && (
            <span
              className="feature-req-icon"
              title={featureReq.tooltip}
              aria-label={featureReq.tooltip}
            >
              ⚠️
            </span>
          )}

          {extraPill}

          {isFlyoutPanel && (
            <span
              className="tool-icon-pill"
              style={{
                background: '#eff6ff',
                color: '#1d4ed8',
                borderColor: '#bfdbfe',
              }}
              title={`Renders ${comp.render || 'panel'} directly inside this flyout`}
            >
              Flyout Panel ({comp.render})
            </span>
          )}

          {requiresFnMap && (
            <span
              className="tool-icon-pill"
              title={`Uses customButton (${comp.onClick}) — requires passing functionMap to UI.importModularComponents`}
            >
              functionMap
            </span>
          )}
        </div>

        <div className="tool-item-actions">
          {isPanelToggle && onChangePanelLocation && (
            <div
              className="location-pill-toggle"
              title={`Dock ${targetElement} on Left or Right`}
              style={{ marginRight: 4 }}
            >
              <button
                type="button"
                className={`pill-btn ${panelLocation === 'left' ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onChangePanelLocation(targetElement, 'left');
                }}
                title="Dock to Left side"
              >
                Left
              </button>
              <button
                type="button"
                className={`pill-btn ${panelLocation === 'right' ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onChangePanelLocation(targetElement, 'right');
                }}
                title="Dock to Right side"
              >
                Right
              </button>
            </div>
          )}

          {onMoveItem && (
            <div className="tool-move-controls">
              <button
                type="button"
                className="move-button"
                onClick={() => onMoveItem(item, -1, targetContext)}
                disabled={!canMoveUp}
                title={`Move ${displayName} up`}
              >
                ↑
              </button>
              <button
                type="button"
                className="move-button"
                onClick={() => onMoveItem(item, 1, targetContext)}
                disabled={!canMoveDown}
                title={`Move ${displayName} down`}
              >
                ↓
              </button>
            </div>
          )}

          {onDeleteTool && (
            <button
              type="button"
              className="delete-button"
              onClick={() => onDeleteTool(itemKey, targetContext)}
              title={`Remove ${displayName}`}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {children}
    </React.Fragment>
  );
}
