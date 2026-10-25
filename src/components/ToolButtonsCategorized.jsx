import React, { useState } from 'react';
import ComponentItemRow from './ComponentItemRow';
import './ToolButtonsCategorized.css';

// Items can repeat in a list (e.g. several dividers). Returns which occurrence
// of its key this row is, and whether the key repeats, so handlers can act on
// this row only.
function getOccurrenceInfo(list, index) {
  const key = list[index].key;
  const occurrence = list.slice(0, index).filter((i) => i.key === key).length;
  const isDuplicate = list.filter((i) => i.key === key).length > 1;
  return { occurrence, isDuplicate };
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
  subView = 'header',
  onSubViewChange,
  ribbonLayout = 'separate',
  onSetRibbonLayout,
  toolsHeaderDef = null,
  onUpdateToolsHeader,
  panels = {},
  onChangePanelLocation,
}) {
  const [internalSubView, setInternalSubView] = useState('header');
  const activeSubView = onSubViewChange ? subView : internalSubView;
  const setSubView = onSubViewChange || setInternalSubView;

  return (
    <div className="tool-buttons-container">
      {/* Segmented Switcher: Header Items (left) & Ribbon Tabs (right) */}
      <div className="segmented-switcher">
        <button
          type="button"
          className={`segmented-tab ${activeSubView === 'header' ? 'active' : ''}`}
          onClick={() => setSubView('header')}
        >
          Header Items ({directHeaderItems.length})
        </button>
        <button
          type="button"
          className={`segmented-tab ${activeSubView === 'ribbon' ? 'active' : ''}`}
          onClick={() => setSubView('ribbon')}
        >
          Ribbon Tabs ({ribbonTabs.length})
        </button>
      </div>

      {activeSubView === 'header' ? (
        /* 1. Header Items (Pinned outside ribbon tabs) */
        <div className="direct-header-items-section">
          <div className="section-header-row">
            <span className="section-subtitle">
              Header Items
              <span className="item-count-badge">
                ({directHeaderItems.length})
              </span>
            </span>
          </div>
          <p className="field-hint" style={{ marginBottom: 8, marginTop: -4 }}>
            Items here remain pinned to the header bar across all ribbon tabs.
          </p>

          <div className="tools-display">
            {directHeaderItems.length === 0 ? (
              <p className="no-tools-message">
                No items on this header bar yet. Click &quot;+ Add
                Component&quot; above to add items to the header.
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
                  panels={panels}
                  onChangePanelLocation={onChangePanelLocation}
                  targetContext={{
                    type: 'header',
                    headerKey: activeHeader,
                    ...getOccurrenceInfo(directHeaderItems, index),
                  }}
                />
              ))
            )}
          </div>
        </div>
      ) : (
        /* 2. Ribbon Tabs & Tab Tools */
        <>
          {ribbonTabs.length > 0 && (
            <div
              className="ribbon-layout-settings-box"
              style={{
                marginBottom: 10,
                padding: '8px 12px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 6,
                fontSize: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    fontWeight: 600,
                    color: '#334155',
                    minWidth: 50,
                  }}
                >
                  Layout:
                </span>
                <select
                  value={ribbonLayout}
                  onChange={(e) => onSetRibbonLayout?.(e.target.value)}
                  className="form-select"
                  style={{ fontSize: 11, padding: '2px 8px', height: 26 }}
                >
                  <option value="separate">Separate Headers (2 Rows)</option>
                  <option value="inline">Inline Header (1 Single Bar)</option>
                </select>
              </div>

              {ribbonLayout === 'separate' && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    marginTop: 8,
                    paddingTop: 8,
                    borderTop: '1px solid #e2e8f0',
                    fontSize: 11,
                    flexWrap: 'wrap',
                  }}
                >
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <span style={{ fontWeight: 600, color: '#475569' }}>
                      Tools Bar:
                    </span>
                    <select
                      value={
                        toolsHeaderDef?.placement ||
                        (headerPlacement === 'left' ||
                        headerPlacement === 'right'
                          ? 'top'
                          : headerPlacement) ||
                        'top'
                      }
                      onChange={(e) =>
                        onUpdateToolsHeader?.({ placement: e.target.value })
                      }
                      className="form-select"
                      style={{ fontSize: 11, padding: '2px 6px', height: 24 }}
                    >
                      <option value="top">Top</option>
                      <option value="bottom">Bottom</option>
                      <option
                        value="left"
                        disabled={headerPlacement === 'left'}
                      >
                        Left{' '}
                        {headerPlacement === 'left' ? '(1 header limit)' : ''}
                      </option>
                      <option
                        value="right"
                        disabled={headerPlacement === 'right'}
                      >
                        Right{' '}
                        {headerPlacement === 'right' ? '(1 header limit)' : ''}
                      </option>
                    </select>
                  </div>

                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <span style={{ fontWeight: 600, color: '#475569' }}>
                      Align:
                    </span>
                    <select
                      value={toolsHeaderDef?.justifyContent || 'center'}
                      onChange={(e) =>
                        onUpdateToolsHeader?.({
                          justifyContent: e.target.value,
                        })
                      }
                      className="form-select"
                      style={{ fontSize: 11, padding: '2px 6px', height: 24 }}
                    >
                      <option value="start">Start</option>
                      <option value="center">Center</option>
                      <option value="end">End</option>
                    </select>
                  </div>

                  {(headerPlacement === 'left' ||
                    headerPlacement === 'right') && (
                    <p
                      style={{
                        margin: '6px 0 0 0',
                        fontSize: 11,
                        color: '#d97706',
                        width: '100%',
                      }}
                    >
                      ⚠️ WebViewer only supports 1 full-length{' '}
                      {headerPlacement === 'left' ? 'Left' : 'Right'} header. To
                      keep tools on the {headerPlacement} side, switch Tools
                      Layout to <strong>Inline Header</strong> above.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="ribbon-tabs-section">
            <div className="section-header-row">
              <span className="section-subtitle">Tabs</span>
            </div>

            {ribbonTabs.length === 0 ? (
              <p className="empty-hint" style={{ marginTop: 8 }}>
                No ribbon tabs in this header yet. Click &quot;+ Add
                Component&quot; above to group tools into tabs (e.g. Annotate,
                Shapes).
              </p>
            ) : (
              <div className="filter-container" style={{ marginTop: 8 }}>
                {ribbonTabs.map((tab) => {
                  const isActive = selectedRibbonTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      className={`filter-button ${isActive ? 'active' : ''}`}
                      onClick={() => onSelectRibbonTab(tab.key)}
                    >
                      {tab.label || tab.key}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Tools inside Active Ribbon Tab */}
          {selectedRibbonTab && (
            <div className="category-tools-section">
              <div className="section-header-row">
                <span className="section-subtitle">
                  Tools in{' '}
                  <strong>
                    {ribbonTabs.find((t) => t.key === selectedRibbonTab)
                      ?.label || selectedRibbonTab}
                  </strong>
                  <span className="item-count-badge">
                    ({ribbonTools.length})
                  </span>
                </span>
                {onDeleteRibbonTab && (
                  <button
                    type="button"
                    className="secondary-button"
                    style={{
                      fontSize: 11,
                      padding: '3px 8px',
                      color: '#dc2626',
                    }}
                    onClick={() => {
                      const tabLabel =
                        ribbonTabs.find((t) => t.key === selectedRibbonTab)
                          ?.label || selectedRibbonTab;
                      if (
                        window.confirm(
                          `Delete Ribbon tab "${tabLabel}" and remove its tools?`,
                        )
                      ) {
                        onDeleteRibbonTab(selectedRibbonTab);
                      }
                    }}
                    title={`Delete Ribbon tab ${
                      ribbonTabs.find((t) => t.key === selectedRibbonTab)
                        ?.label || selectedRibbonTab
                    }`}
                  >
                    Delete Tab
                  </button>
                )}
              </div>

              <div className="tools-display">
                {ribbonTools.length === 0 ? (
                  <p className="no-tools-message">
                    No tools in this ribbon tab. Click &quot;+ Add
                    Component&quot; above to add tools.
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
                      panels={panels}
                      onChangePanelLocation={onChangePanelLocation}
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
        </>
      )}
    </div>
  );
}
