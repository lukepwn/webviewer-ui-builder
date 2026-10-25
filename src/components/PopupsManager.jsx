import React, { useState, useMemo } from 'react';
import { POPUPS_CATALOG, DEFAULT_POPUPS } from '../constants/webviewerCatalog';
import ComponentItemRow from './ComponentItemRow';

export default function PopupsManager({
  popups = {},
  modularComponents = {},
  activePopupId: propActivePopupId,
  onSelectPopup,
  onUpdatePopup,
  panels = {},
  onChangePanelLocation,
}) {
  const [localActivePopupId, setLocalActivePopupId] = useState(
    POPUPS_CATALOG[0].id,
  );
  const activePopupId = propActivePopupId || localActivePopupId;
  const setActivePopupId = onSelectPopup || setLocalActivePopupId;

  const popupMeta =
    POPUPS_CATALOG.find((p) => p.id === activePopupId) || POPUPS_CATALOG[0];

  // If a popup key is omitted from config.popups, WebViewer uses its default list.
  // If it is explicitly `[]`, WebViewer disables the popup.
  const isExplicitlyDefined =
    popups && Object.prototype.hasOwnProperty.call(popups, activePopupId);
  const currentItems = useMemo(() => {
    if (isExplicitlyDefined && Array.isArray(popups[activePopupId])) {
      return popups[activePopupId];
    }
    return DEFAULT_POPUPS[activePopupId] || [];
  }, [popups, activePopupId, isExplicitlyDefined]);

  // Lookup map for human-readable labels and context metadata of built-in popup items
  const builtInMetaMap = useMemo(() => {
    const map = {
      shortCutKeysFor3D: {
        dataElement: 'shortCutKeysFor3D',
        label: '3D Shortcut Keys',
        context: '3D Annotation',
        isCore: false,
      },
    };
    for (const p of POPUPS_CATALOG) {
      for (const item of p.defaultItems) {
        map[item.dataElement] = item;
      }
    }
    return map;
  }, []);

  const handleRemoveIndex = (idx) => {
    const next = [...currentItems];
    next.splice(idx, 1);
    onUpdatePopup(activePopupId, next);
  };

  const handleMoveIndex = (idx, direction) => {
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= currentItems.length) return;
    const next = [...currentItems];
    const [moved] = next.splice(idx, 1);
    next.splice(targetIdx, 0, moved);
    onUpdatePopup(activePopupId, next);
  };

  const handleRestoreDefault = () => {
    onUpdatePopup(
      activePopupId,
      (DEFAULT_POPUPS[activePopupId] || []).map((i) => ({ ...i })),
    );
  };

  return (
    <div className="tool-buttons-container">
      <div className="section-header-row" style={{ marginBottom: 8 }}>
        <span className="section-title">Popups</span>
        <span className="field-hint">
          Annotation, Text & Context Menu Popups
        </span>
      </div>

      {/* Popup Selector Buttons (Flyouts Style) */}
      <div className="filter-container" style={{ marginBottom: 12 }}>
        {POPUPS_CATALOG.map((p) => {
          const defined =
            popups && Object.prototype.hasOwnProperty.call(popups, p.id);
          const list =
            defined && Array.isArray(popups[p.id])
              ? popups[p.id]
              : DEFAULT_POPUPS[p.id] || [];
          const count = list.length;
          const isPopupDisabled = defined && count === 0;
          const isActive = p.id === activePopupId;

          return (
            <button
              key={p.id}
              type="button"
              className={`filter-button ${isActive ? 'active' : ''}`}
              onClick={() => setActivePopupId(p.id)}
            >
              {p.name} {isPopupDisabled ? '(Disabled)' : `(${count})`}
            </button>
          );
        })}
      </div>

      {/* Active Popup Subtitle & Quick Actions */}
      <div
        className="section-header-row"
        style={{ marginTop: 12, marginBottom: 4 }}
      >
        <span className="section-subtitle">
          Items in <strong>{popupMeta.name}</strong>
          <span className="item-count-badge">({currentItems.length})</span>
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            className="small-action-button"
            onClick={handleRestoreDefault}
            title="Restore default items for this popup"
          >
            Restore Default
          </button>
          {isExplicitlyDefined && currentItems.length === 0 ? (
            <button
              type="button"
              className="small-action-button"
              style={{ color: '#0369a1', borderColor: '#7dd3fc' }}
              onClick={handleRestoreDefault}
              title={`Enable / Restore default items for ${popupMeta.name}`}
            >
              Enable
            </button>
          ) : (
            <button
              type="button"
              className="secondary-button"
              style={{
                fontSize: 11,
                padding: '3px 8px',
                color: '#dc2626',
              }}
              onClick={() => {
                if (
                  window.confirm(
                    `Disable ${popupMeta.name}? (Sets items to [] in WebViewer)`,
                  )
                ) {
                  onUpdatePopup(activePopupId, []);
                }
              }}
              title={`Disable ${popupMeta.name}`}
            >
              Disable Popup
            </button>
          )}
        </div>
      </div>

      <p className="field-hint" style={{ marginBottom: 10 }}>
        {popupMeta.description}
      </p>

      {/* Items List */}
      <div
        className="tools-display"
        style={{ maxHeight: 240, overflowY: 'auto' }}
      >
        {currentItems.length === 0 ? (
          <p className="no-tools-message">
            This popup is set to <code>[]</code> (disabled in WebViewer). Click
            &quot;+ Add Component&quot; above or &quot;Restore Default&quot; to
            enable it.
          </p>
        ) : (
          currentItems.map((entry, idx) => {
            const key =
              typeof entry === 'string' ? entry : entry?.dataElement || '';
            const entryObj =
              typeof entry === 'object' && entry !== null ? entry : {};
            const comp = modularComponents?.[key] || entryObj;
            const itemMeta =
              popupMeta.defaultItems.find((i) => i.dataElement === key) ||
              builtInMetaMap[key];
            const conditionalContext =
              itemMeta && !itemMeta.isCore ? itemMeta.context : null;

            return (
              <ComponentItemRow
                key={`${key}-${idx}`}
                item={{
                  key,
                  component: {
                    ...comp,
                    label: entryObj.label || itemMeta?.label || comp.label,
                    title: entryObj.title || itemMeta?.label || comp.title,
                    toolName: entryObj.toolName || comp.toolName,
                    dataElement: key,
                  },
                }}
                index={idx}
                totalItems={currentItems.length}
                onMoveItem={(_, dir) => handleMoveIndex(idx, dir)}
                onDeleteTool={() => handleRemoveIndex(idx)}
                panels={panels}
                onChangePanelLocation={onChangePanelLocation}
                targetContext={{
                  type: 'popup',
                  popupKey: activePopupId,
                }}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
