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
      <span className="filter-label">Filter:</span>
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
function ToolList({ tools, selectedCategory, onDeleteTool }) {
  if (tools.length === 0) {
    return <p className="no-tools-message">No tools in this group</p>;
  }

  return tools.map(([toolKey, toolComponent, headerKeys]) => (
    <div key={toolKey} className="tool-item">
      <div className="tool-info">
        {toolKey} — {toolComponent.toolName || "toolButton"}
        {headerKeys &&
        headerKeys.length > 0 &&
        !headerKeys.includes(selectedCategory) ? (
          <span className="tool-header-info">
            (in: {headerKeys.join(", ")})
          </span>
        ) : null}
      </div>
      <button
        className="delete-button"
        onClick={() => onDeleteTool(toolKey)}
        aria-label={`Remove ${toolKey}`}
      >
        ×
      </button>
    </div>
  ));
}

// Add Tool Modal Component
function AddToolModal({
  isOpen,
  onClose,
  formData,
  onFormChange,
  headerOptions,
  toolOptions,
  onSubmit,
}) {
  if (!isOpen) return null;

  const { dataElement, toolName, header, label } = formData;

  const effectiveToolName = toolName;
  const effectiveHeader = header;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">Add Tool Button</h3>

        <div className="form-container">
          <div className="form-group">
            <label className="form-label">Data Element</label>
            <input
              value={dataElement}
              onChange={(e) => onFormChange("dataElement", e.target.value)}
              placeholder="e.g., panButton"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Header</label>
            <select
              value={header}
              onChange={(e) => onFormChange("header", e.target.value)}
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
              onChange={(e) => onFormChange("toolName", e.target.value)}
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
              onChange={(e) => onFormChange("label", e.target.value)}
              placeholder="display label"
              className="form-input"
            />
          </div>

          <div className="button-group">
            <button onClick={onClose} className="cancel-button">
              Cancel
            </button>
            <button
              onClick={() =>
                onSubmit({
                  dataElement,
                  toolName: effectiveToolName,
                  label,
                  header: effectiveHeader,
                })
              }
              className="submit-button"
            >
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
  headerOptions = [],
  toolOptions = [],
}) {
  // Compute all tool buttons and their header memberships; show categorized view
  const toolList = Object.entries(config.modularComponents)
    .filter(
      ([toolKey, toolComponent]) =>
        toolComponent && toolComponent.type === "toolButton",
    )
    .map(([toolKey, toolComponent]) => {
      const headerKeys = Object.entries(config.modularHeaders)
        .filter(([headerKey, headerConfig]) =>
          (headerConfig.items || []).includes(toolKey),
        )
        .map(([headerKey]) => headerKey);
      return [toolKey, toolComponent, headerKeys];
    });

  // Compute extended runtimeCategories with config additions for toolbarGroups
  const extendedRuntime = { ...runtimeCategories };
  for (const categoryName of Object.keys(extendedRuntime)) {
    if (categoryName.startsWith("toolbarGroup-")) {
      const configTools = [];
      for (const [componentKey, componentConfig] of Object.entries(
        config.modularComponents,
      )) {
        if (
          componentConfig.type === "ribbonItem" &&
          componentConfig.toolbarGroup === categoryName
        ) {
          for (const groupKey of componentConfig.groupedItems || []) {
            const groupComponent = config.modularComponents[groupKey];
            if (groupComponent && groupComponent.type === "groupedItems") {
              for (const itemKey of groupComponent.items || []) {
                const itemComponent = config.modularComponents[itemKey];
                if (itemComponent) {
                  // Push the dataElement (itemKey), not the toolName
                  console.log(itemKey, itemComponent.toolName);
                  configTools.push(itemKey);
                }
              }
            }
          }
        }
      }
      extendedRuntime[categoryName] = [
        ...new Set([...(extendedRuntime[categoryName] || []), ...configTools]),
      ];
    }
  }

  const categorized = {};

  for (const [toolKey, toolComponent, headerKeys] of toolList) {
    let assigned = false;
    const toolName = toolComponent.toolName;

    // Prefer header membership when available (e.g., default-top-header)
    if (headerKeys && headerKeys.length > 0) {
      for (const headerKey of headerKeys) {
        categorized[headerKey] = categorized[headerKey] || [];
        categorized[headerKey].push([toolKey, toolComponent, headerKeys]);
      }
      assigned = true;
    }

    // Otherwise fall back to runtime-derived categories
    if (!assigned) {
      for (const [categoryName, categoryToolNames] of Object.entries(
        extendedRuntime || {},
      )) {
        // Check if toolKey (dataElement) or toolName is in the category
        if (
          (categoryToolNames || []).includes(toolKey) ||
          (categoryToolNames || []).includes(toolName)
        ) {
          categorized[categoryName] = categorized[categoryName] || [];
          categorized[categoryName].push([toolKey, toolComponent, headerKeys]);
          assigned = true;
          break;
        }

        // If the runtime category entry references a groupedItems dataElement, check if this toolButton is in that groupedItems in the config
        if (!assigned) {
          for (const t of categoryToolNames || []) {
            const groupedItemsComp = config.modularComponents[t];
            if (groupedItemsComp?.type === "groupedItems") {
              // Check if this toolKey is in the groupedItems' items array
              if ((groupedItemsComp.items || []).includes(toolKey)) {
                categorized[categoryName] = categorized[categoryName] || [];
                categorized[categoryName].push([
                  toolKey,
                  toolComponent,
                  headerKeys,
                ]);
                assigned = true;
                break;
              }
            }
          }
        }
        if (assigned) break;
      }
    }

    // Removed fallback
  }

  const categorySet = new Set(Object.keys(categorized));

  // Also include potential empty runtime categories and headers
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

  // Form handlers
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

  const handleFormSubmit = (formValues) => {
    if (!formValues.dataElement || !formValues.toolName || !formValues.header) {
      alert("dataElement, toolName and header are required");
      return;
    }

    const headerLower = String(formValues.header).toLowerCase();
    if (headerLower === "view" || headerLower === "toolbargroup-view") {
      alert("Adding tools to view toolbar group is not allowed");
      return;
    }

    addToolButton(formValues);
    setDataElement("");
    setLabel("");
    setShowAddForm(false);
  };

  return (
    <div className="tool-buttons-container">
      <h5 className="tool-buttons-title">Tool Buttons (categorized)</h5>

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
          />
        </div>
      )}

      <AddToolModal
        isOpen={showAddForm}
        onClose={() => setShowAddForm(false)}
        formData={{
          dataElement,
          toolName,
          header,
          label,
        }}
        onFormChange={handleFormChange}
        headerOptions={headerOptionsFinal}
        toolOptions={toolOptions}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
}
