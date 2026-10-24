import React from 'react';

export default function HeaderManager({
  headers = {},
  activeHeader = '',
  onSelectHeader,
  onDeleteHeader,
  onOpenAddModal,
}) {
  const headerKeys = Object.keys(headers).filter((k) => k !== 'tools-header');

  return (
    <div className="header-manager-box">
      <div className="section-header-row">
        <span className="section-title">Headers</span>
        <button
          type="button"
          className="small-action-button"
          onClick={() => onOpenAddModal?.('header')}
          title="Add a new header via Add Component"
        >
          + New Header
        </button>
      </div>

      {/* Header Selector Pills */}
      {headerKeys.length === 0 ? (
        <p className="empty-hint">No headers defined. Create one to begin.</p>
      ) : (
        <div className="header-chips-list">
          {headerKeys.map((hKey) => {
            const hConfig = headers[hKey] || {};
            const placement = hConfig.placement || 'top';
            const itemCount = Array.isArray(hConfig.items)
              ? hConfig.items.length
              : 0;
            const isActive = activeHeader === hKey;

            return (
              <div
                key={hKey}
                className={`header-chip ${isActive ? 'active' : ''}`}
                onClick={() => onSelectHeader(hKey)}
              >
                <div className="header-chip-content">
                  <span className="header-chip-placement">[{placement}]</span>
                  <span className="header-chip-name">{hKey}</span>
                  <span className="header-chip-count">({itemCount})</span>
                </div>
                {headerKeys.length > 1 && (
                  <button
                    className="chip-delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (
                        window.confirm(
                          `Delete header "${hKey}" and remove its contents?`,
                        )
                      ) {
                        onDeleteHeader(hKey);
                      }
                    }}
                    title={`Delete header ${hKey}`}
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
