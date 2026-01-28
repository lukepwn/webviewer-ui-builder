import React, { useState } from "react";

export default function ToolButtonsCategorized({
  config = {},
  runtimeCategories = {},
  deleteToolButton,
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

  if (toolList.length === 0) return null;

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

  const [expanded, setExpanded] = useState({});

  return (
    <div style={{ marginTop: 12 }}>
      <h5>Tool Buttons (categorized)</h5>
      {Object.keys(categorized).length === 0
        ? null
        : Object.entries(categorized).map(([categoryName, toolsList]) => (
            <div key={categoryName} style={{ marginBottom: 8 }}>
              <button
                onClick={() =>
                  setExpanded((prev) => ({
                    ...prev,
                    [categoryName]: !prev[categoryName],
                  }))
                }
              >
                {expanded[categoryName] ? "▼" : "▶"} {categoryName}
              </button>
              {expanded[categoryName] && (
                <div
                  style={{
                    maxHeight: 120,
                    overflow: "auto",
                    border: "1px solid #eee",
                    padding: 8,
                  }}
                >
                  {toolsList.map(([toolKey, toolComponent, headerKeys]) => (
                    <div
                      key={toolKey}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "4px 0",
                      }}
                    >
                      <div>
                        {toolKey} — {toolComponent.toolName || "toolButton"}
                        {headerKeys &&
                        headerKeys.length > 0 &&
                        !headerKeys.includes(categoryName) ? (
                          <span style={{ color: "#666", marginLeft: 8 }}>
                            (in: {headerKeys.join(", ")})
                          </span>
                        ) : null}
                      </div>
                      <div>
                        <button
                          style={{ marginLeft: 8 }}
                          onClick={() => deleteToolButton(toolKey)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
    </div>
  );
}
