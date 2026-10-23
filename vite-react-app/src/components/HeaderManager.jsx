import React, { useState } from 'react';

export default function HeaderManager({
  headers = {},
  activeHeader = '',
  onSelectHeader,
  onAddHeader,
  onDeleteHeader,
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newHeaderId, setNewHeaderId] = useState('');
  const [newPlacement, setNewPlacement] = useState('top');
  const [newJustify, setNewJustify] = useState('start');
  const [newGap, setNewGap] = useState(8);

  const headerKeys = Object.keys(headers);

  const handleCreateHeader = (e) => {
    e.preventDefault();
    const id = newHeaderId.trim();
    if (!id) {
      alert('Header ID (dataElement) is required.');
      return;
    }
    if (headers[id]) {
      alert(`Header "${id}" already exists.`);
      return;
    }

    onAddHeader({
      dataElement: id,
      placement: newPlacement,
      justifyContent: newJustify,
      gap: Number(newGap) || 8,
      items: [],
    });

    setNewHeaderId('');
    setShowAddForm(false);
  };

  return (
    <div className="header-manager-box">
      <div className="section-header-row">
        <span className="section-title">Headers</span>
        <button
          className="small-action-button"
          onClick={() => setShowAddForm((s) => !s)}
          title="Add a new header"
        >
          {showAddForm ? '✕ Cancel' : '+ New Header'}
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

      {/* Add New Header Form */}
      {showAddForm && (
        <form onSubmit={handleCreateHeader} className="add-header-inline-form">
          <h6>Create Modular Header</h6>
          <div className="form-group">
            <label className="form-label">Placement on Screen</label>
            <div className="radio-group-inline">
              <label>
                <input
                  type="radio"
                  name="placement"
                  value="top"
                  checked={newPlacement === 'top'}
                  onChange={() => setNewPlacement('top')}
                />{' '}
                Top
              </label>
              <label>
                <input
                  type="radio"
                  name="placement"
                  value="bottom"
                  checked={newPlacement === 'bottom'}
                  onChange={() => setNewPlacement('bottom')}
                />{' '}
                Bottom
              </label>
              <label>
                <input
                  type="radio"
                  name="placement"
                  value="left"
                  checked={newPlacement === 'left'}
                  onChange={() => setNewPlacement('left')}
                />{' '}
                Left
              </label>
              <label>
                <input
                  type="radio"
                  name="placement"
                  value="right"
                  checked={newPlacement === 'right'}
                  onChange={() => setNewPlacement('right')}
                />{' '}
                Right
              </label>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              Header Identifier (dataElement){' '}
              <span className="required-star">*</span>
            </label>
            <input
              value={newHeaderId}
              onChange={(e) => setNewHeaderId(e.target.value)}
              placeholder={
                newPlacement === 'bottom'
                  ? 'e.g. bottom-nav-bar'
                  : newPlacement === 'left'
                    ? 'e.g. left-annotation-toolbar'
                    : 'e.g. my-custom-top-header'
              }
              className="form-input monospace"
              required
            />
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Flex Alignment</label>
              <select
                value={newJustify}
                onChange={(e) => setNewJustify(e.target.value)}
                className="form-select"
              >
                <option value="start">Start (Left / Top)</option>
                <option value="center">Center</option>
                <option value="end">End (Right / Bottom)</option>
                <option value="space-between">Space Between</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Item Gap (px)</label>
              <input
                type="number"
                min="0"
                max="48"
                value={newGap}
                onChange={(e) => setNewGap(Number(e.target.value))}
                className="form-input"
              />
            </div>
          </div>

          <div className="button-group inline-footer">
            <button
              type="button"
              className="cancel-button"
              onClick={() => setShowAddForm(false)}
            >
              Cancel
            </button>
            <button type="submit" className="submit-button">
              + Create Header
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
