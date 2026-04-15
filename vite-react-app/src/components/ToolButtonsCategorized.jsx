import React, { useState, useEffect } from "react";
import "./ToolButtonsCategorized.css";

// Filter Buttons Component
function FilterButtons({
  categoryNames,
  selectedCategory,
  onCategorySelect,
  onAddToolClick,
}) {
  return (
    <div className="filter-container">
      <span className="filter-label">Filters:</span>
      {categoryNames.map((categoryName) => (
        <button
          key={categoryName}
          onClick={() => onCategorySelect(categoryName)}
          className={`filter-button ${selectedCategory === categoryName ? "active" : ""}`}
        >
          {categoryName}
        </button>
      ))}
      <button onClick={onAddToolClick} className="add-tool-button">
        + Add Tool
      </button>
    </div>
  );
}

// Tool List Component
function ToolList({
  tools,
  selectedCategory,
  onDeleteTool,
  onMoveItem,
  collapsedGroupKeys,
  onToggleGroup,
  depth = 0,
}) {
  if (!tools || tools.length === 0) {
    return <p className="no-tools-message">No tools in this group</p>;
  }

  return tools.map((item, index) => {
    const paddingStyle = { paddingLeft: `${depth * 16}px` };
    const canMoveUp = index > 0;
    const canMoveDown = index < tools.length - 1;
    const isRuntimeList = item.listMeta?.sourceType === "runtime";
    const moveControls = onMoveItem ? (
      <div className="tool-move-controls">
        <button
          className="move-button"
          onClick={() => onMoveItem(item, -1)}
          disabled={!canMoveUp || isRuntimeList}
          aria-label={`Move ${item.key} up`}
        >
          ↑
        </button>
        <button
          className="move-button"
          onClick={() => onMoveItem(item, 1)}
          disabled={!canMoveDown || isRuntimeList}
          aria-label={`Move ${item.key} down`}
        >
          ↓
        </button>
      </div>
    ) : null;

    if (item.type === "tool") {
      return (
        <div key={item.key} className="tool-item" style={paddingStyle}>
          <div className="tool-info">
            {item.key} — {item.component.toolName || "toolButton"}
            {item.headerKeys &&
            item.headerKeys.length > 0 &&
            !item.headerKeys.includes(selectedCategory) ? (
              <span className="tool-header-info">
                (in: {item.headerKeys.join(", ")})
              </span>
            ) : null}
          </div>
          <div className="tool-item-actions">
            {moveControls}
            <button
              className="delete-button"
              onClick={() => onDeleteTool(item.key)}
              aria-label={`Remove ${item.key}`}
            >
              ×
            </button>
          </div>
        </div>
      );
    }

    if (item.type === "group") {
      const title = item.component.label || item.component.title || item.key;
      const isCollapsed = collapsedGroupKeys.has(item.key);
      return (
        <div key={item.key} className="tool-group">
          <div className="tool-group-label" style={paddingStyle}>
            <div className="tool-group-label-main">
              <button
                className="group-collapse-button"
                onClick={() => onToggleGroup(item.key)}
                aria-label={`Toggle ${title}`}
              >
                {isCollapsed ? "▶" : "▼"}
              </button>
              <span className="group-title-text">{title}</span>
            </div>
            <div className="tool-group-label-actions">{moveControls}</div>
          </div>
          {!isCollapsed && (
            <ToolList
              tools={item.children}
              selectedCategory={selectedCategory}
              onDeleteTool={onDeleteTool}
              onMoveItem={onMoveItem}
              collapsedGroupKeys={collapsedGroupKeys}
              onToggleGroup={onToggleGroup}
              depth={depth + 1}
            />
          )}
        </div>
      );
    }

    return (
      <div key={item.key} className="tool-item other-item" style={paddingStyle}>
        <div className="tool-info">
          {item.key} — {item.component.type}
        </div>
      </div>
    );
  });
}

// Add Tool Modal Component (now manages its own state)
function AddToolModal({
  isOpen,
  onClose,
  headerOptions,
  toolOptions,
  onSubmit,
}) {
  const [dataElement, setDataElement] = useState("panButton");
  const [toolName, setToolName] = useState(
    (toolOptions && toolOptions.length && toolOptions[0].value) || "",
  );
  const [header, setHeader] = useState(
    (headerOptions && headerOptions.length && headerOptions[0]) ||
      "default-top-header",
  );
  const [label, setLabel] = useState("");

  useEffect(() => {
    if (!toolName && toolOptions && toolOptions.length) {
      setToolName(toolOptions[0].value);
    }
  }, [toolOptions, toolName]);

  useEffect(() => {
    if (!header && headerOptions && headerOptions.length) {
      setHeader(headerOptions[0]);
    }
  }, [headerOptions, header]);

  const handleFormChange = (field, value) => {
    switch (field) {
      case "dataElement":
        setDataElement(value);
        break;
      case "toolName":
        setToolName(value);
        break;
      case "header":
        setHeader(value);
        break;
      case "label":
        setLabel(value);
        break;
    }
  };

  const handleFormSubmit = () => {
    if (!dataElement || !toolName || !header) {
      alert("dataElement, toolName and header are required");
      return;
    }

    const headerLower = String(header).toLowerCase();
    if (headerLower === "view" || headerLower === "toolbargroup-view") {
      alert("Adding tools to view toolbar group is not allowed");
      return;
    }

    onSubmit({
      dataElement,
      toolName,
      label,
      header,
    });
    setDataElement("");
    setLabel("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">Add Tool Button</h3>

        <div className="form-container">
          <div className="form-group">
            <label className="form-label">Data Element</label>
            <input
              value={dataElement}
              onChange={(e) => handleFormChange("dataElement", e.target.value)}
              placeholder="e.g., panButton"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Header</label>
            <select
              value={header}
              onChange={(e) => handleFormChange("header", e.target.value)}
              className="form-select"
            >
              {headerOptions.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Tool</label>
            <select
              value={toolName}
              onChange={(e) => handleFormChange("toolName", e.target.value)}
              className="form-select"
            >
              {toolOptions && toolOptions.length ? (
                toolOptions.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label || t.value}
                  </option>
                ))
              ) : (
                <option value="">(no tools available)</option>
              )}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Label (optional)</label>
            <input
              value={label}
              onChange={(e) => handleFormChange("label", e.target.value)}
              placeholder="display label"
              className="form-input"
            />
          </div>

          <div className="button-group">
            <button onClick={onClose} className="cancel-button">
              Cancel
            </button>
            <button onClick={handleFormSubmit} className="submit-button">
              Add Tool Button
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ToolButtonsCategorized({
  config = {},
  runtimeCategories = {},
  deleteToolButton,
  addToolButton,
  onMoveItem,
  headerOptions = [],
  toolOptions = [],
}) {
  const [collapsedGroupKeys, setCollapsedGroupKeys] = useState(new Set());

  const toggleGroupCollapse = (groupKey) => {
    setCollapsedGroupKeys((current) => {
      const next = new Set(current);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  };

  const getConfigComponent = (itemKey) =>
    config?.modularComponents?.[itemKey] || null;

  const getToolHeaderKeys = (toolKey) =>
    Object.entries(config.modularHeaders || {})
      .filter(([, headerConfig]) =>
        (headerConfig.items || []).includes(toolKey),
      )
      .map(([headerKey]) => headerKey);

  const getConfigKeyForRuntimeItem = (itemKey) => {
    if (!itemKey) return null;

    if (config.modularComponents?.[itemKey]) {
      return itemKey;
    }

    const match = Object.entries(config.modularComponents || {}).find(
      ([, component]) =>
        component?.type === "toolButton" && component.toolName === itemKey,
    );

    return match?.[0] || null;
  };

  const buildCategoryTree = (
    itemKeys,
    parentMeta,
    visited = new Set(),
    added = new Set(),
  ) => {
    if (!Array.isArray(itemKeys)) return [];

    const tree = [];

    for (const rawKey of itemKeys) {
      if (!rawKey) continue;

      const configKey = getConfigKeyForRuntimeItem(rawKey) || rawKey;
      if (visited.has(configKey) || added.has(configKey)) continue;

      const component = getConfigComponent(configKey);
      if (!component) continue;

      const nextVisited = new Set(visited).add(configKey);
      added.add(configKey);
      const listMeta = parentMeta;

      if (component.type === "toolButton") {
        tree.push({
          type: "tool",
          key: configKey,
          component,
          headerKeys: getToolHeaderKeys(configKey),
          listMeta,
        });
        continue;
      }

      const childKeys = [
        ...(Array.isArray(component.items) ? component.items : []),
        ...(Array.isArray(component.groupedItems)
          ? component.groupedItems
          : []),
      ];

      if (childKeys.length === 0) {
        tree.push({ type: "other", key: configKey, component, listMeta });
        continue;
      }

      tree.push({
        type: "group",
        key: configKey,
        component,
        listMeta,
        children: buildCategoryTree(
          childKeys,
          {
            sourceType: "group",
            sourceKey: configKey,
            categoryName: parentMeta?.categoryName,
          },
          nextVisited,
          new Set(),
        ),
      });
    }

    return tree;
  };

  const categorySources = {};

  for (const [headerKey, headerConfig] of Object.entries(
    config.modularHeaders || {},
  )) {
    categorySources[headerKey] = headerConfig.items || [];
  }

  for (const [, componentConfig] of Object.entries(
    config.modularComponents || {},
  )) {
    if (
      componentConfig?.type === "ribbonItem" &&
      typeof componentConfig.toolbarGroup === "string"
    ) {
      const categoryName = componentConfig.toolbarGroup;
      if (!categorySources[categoryName]) {
        categorySources[categoryName] = [
          ...(Array.isArray(componentConfig.items)
            ? componentConfig.items
            : []),
          ...(Array.isArray(componentConfig.groupedItems)
            ? componentConfig.groupedItems
            : []),
        ];
      }
    }
  }

  for (const [categoryName, categoryToolNames] of Object.entries(
    runtimeCategories || {},
  )) {
    if (!categorySources[categoryName]) {
      categorySources[categoryName] = categoryToolNames;
    }
  }

  const categorized = {};
  for (const [categoryName, sourceKeys] of Object.entries(categorySources)) {
    let rootMeta = {
      sourceType: "runtime",
      sourceKey: categoryName,
      categoryName,
    };
    if (config.modularHeaders?.[categoryName]) {
      rootMeta = {
        sourceType: "header",
        sourceKey: categoryName,
        categoryName,
      };
    } else if (
      config.modularComponents?.[categoryName] &&
      config.modularComponents[categoryName].type === "ribbonItem"
    ) {
      rootMeta = {
        sourceType: "toolbarGroup",
        sourceKey: categoryName,
        categoryName,
      };
    }
    categorized[categoryName] = buildCategoryTree(sourceKeys, rootMeta);
  }

  const categorySet = new Set(Object.keys(categorized));
  Object.keys(runtimeCategories || {}).forEach((n) => categorySet.add(n));
  Object.keys(config.modularHeaders || {}).forEach((n) => categorySet.add(n));

  const categoryNames = Array.from(categorySet).filter((name) => {
    const lower = String(name).toLowerCase();
    return (
      lower !== "view" &&
      lower !== "toolbargroup-view" &&
      lower !== "tools-header"
    );
  });

  const [selectedCategory, setSelectedCategory] = useState(
    categoryNames[0] || null,
  );

  const currentTools =
    selectedCategory && Array.isArray(categorized[selectedCategory])
      ? categorized[selectedCategory]
      : [];

  useEffect(() => {
    if (selectedCategory && !categoryNames.includes(selectedCategory)) {
      setSelectedCategory(categoryNames[0] || null);
    }
  }, [categoryNames, selectedCategory]);

  // Form state for the popup
  const [showAddForm, setShowAddForm] = useState(false);

  const headerOptionsFinal =
    headerOptions && headerOptions.length
      ? headerOptions.filter((name) => {
          const lower = String(name).toLowerCase();
          return (
            lower !== "view" &&
            lower !== "toolbargroup-view" &&
            lower !== "tools-header"
          );
        })
      : ["default-top-header"];

  const handleFormSubmit = (formValues) => {
    addToolButton(formValues);
  };

  return (
    <div className="tool-buttons-container">
      <h5 className="tool-buttons-title">Headers</h5>

      {categoryNames.length > 0 && (
        <FilterButtons
          categoryNames={categoryNames}
          selectedCategory={selectedCategory}
          onCategorySelect={setSelectedCategory}
          onAddToolClick={() => setShowAddForm(true)}
        />
      )}

      {categoryNames.length > 0 && (
        <div className="tools-display">
          <ToolList
            tools={currentTools}
            selectedCategory={selectedCategory}
            onDeleteTool={deleteToolButton}
            onMoveItem={onMoveItem}
            collapsedGroupKeys={collapsedGroupKeys}
            onToggleGroup={toggleGroupCollapse}
          />
        </div>
      )}

      <AddToolModal
        isOpen={showAddForm}
        onClose={() => setShowAddForm(false)}
        headerOptions={headerOptionsFinal}
        toolOptions={toolOptions}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
}
