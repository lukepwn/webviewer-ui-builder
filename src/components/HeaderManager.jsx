import React, { useState } from 'react';

export default function HeaderManager({
  headers = {},
  activeHeader = '',
  onSelectHeader,
  onDeleteHeader,
  onOpenAddModal,
  onUpdateHeader,
}) {
  const [showSettings, setShowSettings] = useState(false);
  const headerKeys = Object.keys(headers).filter((k) => k !== 'tools-header');
  const activeHeaderDef =
    activeHeader && headers[activeHeader] ? headers[activeHeader] : null;

  return (
    <section className="tool-buttons-container">
      <div
        className="section-header-row"
        style={{ marginBottom: 8, alignItems: 'flex-start' }}
      >
        <span className="section-title">Headers</span>
        {activeHeaderDef && (
          <button
            type="button"
            className={`small-action-button ${showSettings ? 'active' : ''}`}
            style={{ alignSelf: 'flex-start' }}
            onClick={() => setShowSettings((s) => !s)}
            title="Toggle placement & gap settings for the selected header"
          >
            {(activeHeaderDef.placement || 'top').toUpperCase()} ·{' '}
            {activeHeaderDef.gap != null ? activeHeaderDef.gap : 8}px gap{' '}
            {showSettings ? '▲' : '▼'}
          </button>
        )}
      </div>

      {/* Header Selector Buttons (Flyouts Style) */}
      {headerKeys.length === 0 ? (
        <p className="no-tools-message">
          No headers defined. Click &quot;+ Add Component&quot; above to create
          one.
        </p>
      ) : (
        <div className="filter-container" style={{ marginTop: 8 }}>
          {headerKeys.map((hKey) => {
            const hConfig = headers[hKey] || {};
            const placement = (hConfig.placement || 'top').toUpperCase();
            const itemCount = Array.isArray(hConfig.items)
              ? hConfig.items.length
              : 0;
            const isActive = activeHeader === hKey;

            return (
              <button
                key={hKey}
                type="button"
                className={`filter-button ${isActive ? 'active' : ''}`}
                onClick={() => onSelectHeader(hKey)}
                title={`${hKey} (${itemCount} items, ${hConfig.gap != null ? hConfig.gap : 8}px gap)`}
              >
                {hKey} ({itemCount})
              </button>
            );
          })}
        </div>
      )}

      {/* Active Header Layout & Gap Controls (Collapsible) */}
      {activeHeaderDef && showSettings && (
        <div
          className="active-header-settings"
          style={{
            marginTop: 8,
            paddingTop: 8,
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 16,
            fontSize: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 600, color: '#475569' }}>
              Placement:
            </span>
            <select
              value={activeHeaderDef.placement || 'top'}
              onChange={(e) =>
                onUpdateHeader?.(activeHeader, { placement: e.target.value })
              }
              className="form-select"
              style={{ fontSize: 11, padding: '2px 6px', height: 26 }}
            >
              <option value="top">Top</option>
              <option value="bottom">Bottom</option>
              <option value="left">Left</option>
              <option value="right">Right</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 600, color: '#475569' }}>Gap:</span>
            <input
              type="number"
              min="0"
              max="64"
              value={activeHeaderDef.gap != null ? activeHeaderDef.gap : 8}
              onChange={(e) =>
                onUpdateHeader?.(activeHeader, {
                  gap: Math.max(0, parseInt(e.target.value, 10) || 0),
                })
              }
              className="form-input"
              style={{
                width: 60,
                fontSize: 11,
                padding: '2px 6px',
                height: 26,
              }}
            />
            <span style={{ color: '#94a3b8', fontSize: 11 }}>px</span>
          </div>
        </div>
      )}
    </section>
  );
}
