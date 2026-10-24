import React, { useState, useMemo } from 'react';
import { POPUPS_CATALOG, DEFAULT_POPUPS } from '../constants/webviewerCatalog';

export default function PopupsManager({
  popups = {},
  modularComponents = {},
  activePopupId: propActivePopupId,
  onSelectPopup,
  onUpdatePopup,
  onOpenAddModal,
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

  const isDisabled = isExplicitlyDefined && currentItems.length === 0;

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

  const handleDisablePopup = () => {
    onUpdatePopup(activePopupId, []);
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

      {/* Popup Selector Tabs */}
      <div className="filter-container" style={{ marginBottom: 10 }}>
        {POPUPS_CATALOG.map((p) => {
          const defined =
            popups && Object.prototype.hasOwnProperty.call(popups, p.id);
          const list =
            defined && Array.isArray(popups[p.id])
              ? popups[p.id]
              : DEFAULT_POPUPS[p.id] || [];
          const isActive = p.id === activePopupId;
          return (
            <button
              key={p.id}
              type="button"
              className={`filter-button ${isActive ? 'active' : ''}`}
              onClick={() => setActivePopupId(p.id)}
            >
              {p.name} ({defined && list.length === 0 ? 'Off' : list.length})
            </button>
          );
        })}
      </div>

      {/* Active Popup Description & Quick Actions */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 8,
          marginBottom: 8,
          flexWrap: 'wrap',
        }}
      >
        <span className="field-hint">{popupMeta.description}</span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            className="secondary-button"
            style={{ fontSize: 11, padding: '2px 8px' }}
            onClick={handleRestoreDefault}
            title="Restore default items for this popup"
          >
            Restore Default
          </button>
          <button
            type="button"
            className="secondary-button"
            style={{
              fontSize: 11,
              padding: '2px 8px',
              color: isDisabled ? '#64748b' : '#dc2626',
            }}
            onClick={handleDisablePopup}
            disabled={isDisabled}
            title="Set popup array to [] to disable it in WebViewer"
          >
            Disable Popup ([])
          </button>
        </div>
      </div>

      {/* Centralized Add Component Action */}
      <div style={{ marginBottom: 10 }}>
        <button
          type="button"
          className="central-add-button"
          style={{
            width: '100%',
            padding: '8px 12px',
            fontSize: 12,
            fontWeight: 600,
          }}
          onClick={() => onOpenAddModal?.('tool', 'popup', activePopupId)}
        >
          + Add Component to {popupMeta.name}
        </button>
      </div>

      {/* Items List */}
      <div
        className="tools-display"
        style={{ maxHeight: 220, overflowY: 'auto' }}
      >
        {currentItems.length === 0 ? (
          <p className="no-tools-message">
            This popup is set to <code>[]</code> (disabled in WebViewer). Add an
            item or click &quot;Restore Default&quot; to enable it.
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
            const label =
              entryObj.label ||
              entryObj.title ||
              entryObj.toolName ||
              itemMeta?.label ||
              comp?.label ||
              comp?.title ||
              comp?.toolName ||
              key;
            const conditionalContext =
              itemMeta && !itemMeta.isCore ? itemMeta.context : null;
            return (
              <div key={`${key}-${idx}`} className="tool-item">
                <div className="tool-info">
                  <div className="tool-name-container">
                    <span className="tool-display-name">{label}</span>
                    {key !== label && (
                      <span className="tool-subtext">({key})</span>
                    )}
                  </div>
                  {conditionalContext && (
                    <span
                      className="tool-icon-pill"
                      title={`Only shown for: ${conditionalContext}`}
                    >
                      {conditionalContext}
                    </span>
                  )}
                </div>
                <div className="tool-item-actions">
                  <div className="tool-move-controls">
                    <button
                      type="button"
                      className="move-button"
                      disabled={idx === 0}
                      onClick={() => handleMoveIndex(idx, -1)}
                      title={`Move ${key} up`}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="move-button"
                      disabled={idx === currentItems.length - 1}
                      onClick={() => handleMoveIndex(idx, 1)}
                      title={`Move ${key} down`}
                    >
                      ↓
                    </button>
                  </div>
                  <button
                    type="button"
                    className="delete-button"
                    onClick={() => handleRemoveIndex(idx)}
                    title={`Remove ${key} from ${popupMeta.name}`}
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
