import React, { useState } from 'react';
import './ToolButtonsCategorized.css';

// Helper badge formatter based on component type
function renderComponentBadge(component = {}) {
  const type = component.type || '';
  if (type === 'toolButton') {
    return <span className="item-badge badge-tool">Tool</span>;
  }
  if (type === 'presetButton') {
    return <span className="item-badge badge-preset">Preset</span>;
  }
  if (type === 'toggleButton' || type === 'toggleElementButton') {
    return <span className="item-badge badge-toggle">Toggle</span>;
  }
  if (type === 'pageControls' || type === 'zoom' || type === 'viewControls') {
    return <span className="item-badge badge-controls">Control</span>;
  }
  if (type === 'label') {
    return <span className="item-badge badge-label">Label</span>;
  }
  if (type === 'divider' || type === 'spacer') {
    return <span className="item-badge badge-layout">Layout</span>;
  }
  return <span className="item-badge badge-other">{type || 'Item'}</span>;
}

// Items can repeat in a list (e.g. several dividers). Returns which occurrence
// of its key this row is, and whether the key repeats, so handlers can act on
// this row only.
function getOccurrenceInfo(list, index) {
  const key = list[index].key;
  const occurrence = list.slice(0, index).filter((i) => i.key === key).length;
  const isDuplicate = list.filter((i) => i.key === key).length > 1;
  return { occurrence, isDuplicate };
}

// Component List item row
function ComponentItemRow({
  item,
  index,
  totalItems,
  onMoveItem,
  onDeleteTool,
  targetContext,
}) {
  const comp = item.component || {};
  const canMoveUp = index > 0;
  const canMoveDown = index < totalItems - 1;

  const displayName =
    comp.label || comp.title || comp.toolName || comp.buttonType || item.key;
  const subText =
    comp.dataElement && comp.dataElement !== displayName
      ? `(${comp.dataElement})`
      : '';

  return (
    <div className="tool-item">
      <div className="tool-info">
        {renderComponentBadge(comp)}
        <div className="tool-name-container">
          <span className="tool-display-name">{displayName}</span>
          {subText && <span className="tool-subtext">{subText}</span>}
        </div>
      </div>

      <div className="tool-item-actions">
        {onMoveItem && (
          <div className="tool-move-controls">
            <button
              className="move-button"
              onClick={() => onMoveItem(item, -1, targetContext)}
              disabled={!canMoveUp}
              title={`Move ${item.key} up`}
            >
              ↑
            </button>
            <button
              className="move-button"
              onClick={() => onMoveItem(item, 1, targetContext)}
              disabled={!canMoveDown}
              title={`Move ${item.key} down`}
            >
              ↓
            </button>
          </div>
        )}
        {onDeleteTool && (
          <button
            className="delete-button"
            onClick={() => onDeleteTool(item.key, targetContext)}
            title={`Remove ${item.key}`}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

export default function ToolButtonsCategorized({
  activeHeader = '',
  headerPlacement = 'top',
  ribbonTabs = [],
  selectedRibbonTab = '',
  onSelectRibbonTab,
  onDeleteRibbonTab,
  ribbonTools = [],
  directHeaderItems = [],
  onDeleteTool,
  onMoveItem,
  onOpenAddModal,
}) {
  const [collapsedDirect, setCollapsedDirect] = useState(false);

  return (
    <div className="tool-buttons-container">
      {/* Centralized Add Component Action Header */}
      <div className="centralized-add-header">
        <div className="section-title-col">
          <span className="section-title">Header & Ribbon Items</span>
          <span className="field-hint">
            Active Header: <strong>{activeHeader}</strong> ({headerPlacement})
          </span>
        </div>
        <button
          type="button"
          className="central-add-button"
          onClick={() =>
            onOpenAddModal('tool', selectedRibbonTab ? 'ribbon' : 'header')
          }
          title="Add tools, preset buttons, toggles, controls, or containers"
        >
          + Add Component
        </button>
      </div>

      {/* 1. RIBBON TABS */}
      <div className="ribbon-tabs-section">
        <div className="section-header-row">
          <span className="section-title">Ribbon Tabs</span>
        </div>

        {ribbonTabs.length === 0 ? (
          <p className="empty-hint">
            No ribbon tabs in this header. Click &quot;+ Add Component&quot;
            above to create a Ribbon Tab or add Header Items.
          </p>
        ) : (
          <div className="filter-container">
            {ribbonTabs.map((tab) => {
              const isActive = selectedRibbonTab === tab.key;
              return (
                <div
                  key={tab.key}
                  className={`filter-button ${isActive ? 'active' : ''}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    paddingRight: onDeleteRibbonTab ? 6 : 12,
                  }}
                  onClick={() => onSelectRibbonTab(tab.key)}
                >
                  <span>{tab.label || tab.key}</span>
                  {onDeleteRibbonTab && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteRibbonTab(tab.key);
                      }}
                      title={`Remove ribbon tab "${tab.label || tab.key}"`}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: isActive ? 'rgba(255,255,255,0.85)' : '#94a3b8',
                        cursor: 'pointer',
                        padding: '0 2px',
                        fontSize: 11,
                        lineHeight: 1,
                      }}
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

      {/* 2. ITEMS UNDER ACTIVE RIBBON TAB */}
      {selectedRibbonTab && (
        <div className="category-tools-section">
          <div className="section-header-row">
            <span className="section-subtitle">
              Items in{' '}
              <strong>
                {ribbonTabs.find((t) => t.key === selectedRibbonTab)?.label ||
                  selectedRibbonTab}
              </strong>
            </span>
          </div>

          <div className="tools-display">
            {ribbonTools.length === 0 ? (
              <p className="no-tools-message">
                No items in this ribbon tab. Click &quot;+ Add Component&quot;
                above to add items.
              </p>
            ) : (
              ribbonTools.map((item, index) => (
                <ComponentItemRow
                  key={`${item.key}-${index}`}
                  item={item}
                  index={index}
                  totalItems={ribbonTools.length}
                  onMoveItem={onMoveItem}
                  onDeleteTool={onDeleteTool}
                  targetContext={{
                    type: 'ribbon',
                    ribbonKey: selectedRibbonTab,
                    headerKey: activeHeader,
                    ...getOccurrenceInfo(ribbonTools, index),
                  }}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* 3. HEADER ITEMS (ALWAYS VISIBLE OUTSIDE RIBBON TABS) */}
      <div className="direct-header-items-section">
        <div className="section-header-row">
          <span
            className="section-subtitle clickable"
            onClick={() => setCollapsedDirect((c) => !c)}
          >
            {collapsedDirect ? '▶' : '▼'} Header Items (Always Visible)
            <span className="item-count-badge">
              ({directHeaderItems.length})
            </span>
          </span>
        </div>

        {!collapsedDirect && (
          <div className="tools-display">
            {directHeaderItems.length === 0 ? (
              <p className="no-tools-message">
                No direct items on this header (items added here stay visible
                regardless of ribbon tab).
              </p>
            ) : (
              directHeaderItems.map((item, index) => (
                <ComponentItemRow
                  key={`${item.key}-${index}`}
                  item={item}
                  index={index}
                  totalItems={directHeaderItems.length}
                  onMoveItem={onMoveItem}
                  onDeleteTool={onDeleteTool}
                  targetContext={{
                    type: 'header',
                    headerKey: activeHeader,
                    ...getOccurrenceInfo(directHeaderItems, index),
                  }}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
