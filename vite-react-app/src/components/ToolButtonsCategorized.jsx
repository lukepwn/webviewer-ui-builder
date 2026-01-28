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
                  const toolName = itemComponent.toolName;
                  configTools.push(toolName);
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
    const ui = window.viewerInstance && window.viewerInstance.UI;
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
        if ((categoryToolNames || []).includes(toolName)) {
          categorized[categoryName] = categorized[categoryName] || [];
          categorized[categoryName].push([toolKey, toolComponent, headerKeys]);
          assigned = true;
          break;
        }

        // If the runtime category entry references a groupedItems dataElement, resolve it only when it is a groupedItems component in the config
        for (const t of categoryToolNames || []) {
          try {
            const isGroupedItems =
              config &&
              config.modularComponents &&
              config.modularComponents[t] &&
              config.modularComponents[t].type === "groupedItems";
            if (!isGroupedItems) continue;
            if (!ui || !ui.getGroupedItems) continue;
            const grouped = ui.getGroupedItems(t);
            const groups = Array.isArray(grouped)
              ? grouped
              : grouped
                ? [grouped]
                : [];
            let found = false;
            for (const g of groups) {
              const items = g.items || (g.getItems && g.getItems()) || [];
              for (const it of items) {
                const itValue = it.toolName;
                if (itValue === toolName) {
                  categorized[categoryName] = categorized[categoryName] || [];
                  categorized[categoryName].push([
                    toolKey,
                    toolComponent,
                    headerKeys,
                  ]);
                  assigned = true;
                  found = true;
                  break;
                }
              }
              if (found) break;
            }
            if (found) break;
          } catch (e) {
            // ignore resolution errors
          }
        }
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
