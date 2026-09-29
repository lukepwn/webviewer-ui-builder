import React, { useState } from "react";
import "./ToolButtonsCategorized.css";

// Helper badge formatter based on component type
function renderComponentBadge(component = {}) {
  const type = component.type || "";
  if (type === "toolButton") {
    return <span className="item-badge badge-tool">Tool</span>;
  }
  if (type === "presetButton") {
    return <span className="item-badge badge-preset">Action</span>;
  }
  if (type === "toggleButton" || type === "toggleElementButton") {
    return <span className="item-badge badge-toggle">Toggle</span>;
  }
  if (type === "pageControls" || type === "zoom" || type === "viewControls") {
    return <span className="item-badge badge-controls">Control</span>;
  }
  if (type === "label") {
    return <span className="item-badge badge-label">Label</span>;
  }
  if (type === "divider" || type === "spacer") {
    return <span className="item-badge badge-layout">Layout</span>;
  }
  return <span className="item-badge badge-other">{type || "Item"}</span>;
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
      : "";
  const iconName = comp.img;

  return (
    <div className="tool-item">
      <div className="tool-info">
        {renderComponentBadge(comp)}
        <div className="tool-name-container">
          <span className="tool-display-name">{displayName}</span>
          {subText && <span className="tool-subtext">{subText}</span>}
        </div>
        {iconName && (
          <span className="tool-icon-pill" title={`Icon: ${iconName}`}>
            {iconName}
          </span>
        )}
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
  activeHeader = "",
  headerPlacement = "top",
  ribbonTabs = [],
  selectedRibbonTab = "",
  onSelectRibbonTab,
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
          <span className="section-title">Header Components</span>
          <span className="field-hint">
            Active: <strong>{activeHeader}</strong>
          </span>
        </div>
        <button
          type="button"
          className="central-add-button"
          onClick={() =>
            onOpenAddModal("tool", selectedRibbonTab ? "ribbon" : "header")
          }
          title="Add tools, presets, panel toggles, controls, or ribbon tabs"
        >
          + Add Component
        </button>
      </div>

      {/* 1. RIBBON TABS (CATEGORIES) */}
      <div className="ribbon-tabs-section">
        <div className="section-header-row">
          <span className="section-title">Ribbon Tabs / Categories</span>
        </div>

        {ribbonTabs.length === 0 ? (
          <p className="empty-hint">
            No ribbon tabs in this header. Click "+ Add Component" above to
            create tabs or add direct tools.
          </p>
        ) : (
          <div className="filter-container">
            {ribbonTabs.map((tab) => {
              const isActive = selectedRibbonTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => onSelectRibbonTab(tab.key)}
                  className={`filter-button ${isActive ? "active" : ""}`}
                >
                  {tab.label || tab.key}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. TOOLS UNDER ACTIVE RIBBON TAB */}
      {selectedRibbonTab && (
        <div className="category-tools-section">
          <div className="section-header-row">
            <span className="section-subtitle">
              Tools in{" "}
              <strong>
                {ribbonTabs.find((t) => t.key === selectedRibbonTab)?.label ||
                  selectedRibbonTab}
              </strong>
            </span>
          </div>

          <div className="tools-display">
            {ribbonTools.length === 0 ? (
              <p className="no-tools-message">
                No tools in this category. Click "+ Add Component" above to add
                tools.
              </p>
            ) : (
              ribbonTools.map((item, index) => (
                <ComponentItemRow
                  key={item.key}
                  item={item}
                  index={index}
                  totalItems={ribbonTools.length}
                  onMoveItem={onMoveItem}
                  onDeleteTool={onDeleteTool}
                  targetContext={{
                    type: "ribbon",
                    ribbonKey: selectedRibbonTab,
                    headerKey: activeHeader,
                  }}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* 3. DIRECT HEADER ITEMS (ALWAYS VISIBLE OUTSIDE RIBBON TABS) */}
      <div className="direct-header-items-section">
        <div className="section-header-row">
          <span
            className="section-subtitle clickable"
            onClick={() => setCollapsedDirect((c) => !c)}
          >
            {collapsedDirect ? "▶" : "▼"} Direct Header Items (Always Visible)
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
                  key={item.key}
                  item={item}
                  index={index}
                  totalItems={directHeaderItems.length}
                  onMoveItem={onMoveItem}
                  onDeleteTool={onDeleteTool}
                  targetContext={{
                    type: "header",
                    headerKey: activeHeader,
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
