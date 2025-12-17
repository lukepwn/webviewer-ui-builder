import React from "react";

export default function ToolButtonsCategorized({ config = {}, runtimeCategories = {}, deleteToolButton }) {
  // Compute all tool buttons and their header memberships; show categorized view
  const toolList = Object.entries(config.modularComponents || {})
    .filter(([k, v]) => v && v.type === "toolButton")
    .map(([k, v]) => {
      const headersFor = Object.entries(config.modularHeaders || {})
        .filter(([hdrKey, hdr]) => (hdr.items || []).includes(k))
        .map(([hdrKey]) => hdrKey);
      return [k, v, headersFor];
    });

  if (toolList.length === 0) return null;

  const categorized = {};
  const uncategorized = [];

  for (const [k, v, headersFor] of toolList) {
    let assigned = false;
    const ui = window.viewerInstance && window.viewerInstance.UI;
    const needle = v.toolName || v.dataElement || v.label;

    // Prefer header membership when available (e.g., default-top-header)
    if (headersFor && headersFor.length > 0) {
      for (const hdr of headersFor) {
        categorized[hdr] = categorized[hdr] || [];
        categorized[hdr].push([k, v, headersFor]);
      }
      assigned = true;
    }

    // Otherwise fall back to runtime-derived categories
    if (!assigned) {
      for (const [cat, tools] of Object.entries(runtimeCategories || {})) {
        if ((tools || []).includes(needle)) {
          categorized[cat] = categorized[cat] || [];
          categorized[cat].push([k, v, headersFor]);
          assigned = true;
          break;
        }

        // If the runtime category entry references a groupedItems dataElement, resolve it only when it is a groupedItems component in the config
        for (const t of tools || []) {
          try {
            const isGroupedItems =
              config &&
              config.modularComponents &&
              config.modularComponents[t] &&
              config.modularComponents[t].type === "groupedItems";
            if (!isGroupedItems) continue;
            if (!ui || !ui.getGroupedItems) continue;
            const grouped = ui.getGroupedItems(t);
            const groups = Array.isArray(grouped) ? grouped : grouped ? [grouped] : [];
            let found = false;
            for (const g of groups) {
              const items = g.items || (g.getItems && g.getItems()) || [];
              for (const it of items) {
                const itValue = it.toolName || it.dataElement || it.value;
                if (itValue === needle) {
                  categorized[cat] = categorized[cat] || [];
                  categorized[cat].push([k, v, headersFor]);
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

        if (assigned) break;
      }
    }

    if (!assigned) uncategorized.push([k, v, headersFor]);
  }

  return (
    <div style={{ marginTop: 12 }}>
      <h5>Tool Buttons (categorized)</h5>
      {Object.keys(categorized).length === 0
        ? null
        : Object.entries(categorized).map(([cat, list]) => (
            <div key={cat} style={{ marginBottom: 8 }}>
              <strong>{cat}</strong>
              <div
                style={{
                  maxHeight: 120,
                  overflow: "auto",
                  border: "1px solid #eee",
                  padding: 8,
                }}
              >
                {list.map(([k, v, headersFor]) => (
                  <div
                    key={k}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "4px 0",
                    }}
                  >
                    <div>
                      {k} — {v.toolName || v.label || "toolButton"}
                      {headersFor &&
                      headersFor.length > 0 &&
                      !(headersFor || []).includes(cat) ? (
                        <span style={{ color: "#666", marginLeft: 8 }}>
                          (in: {headersFor.join(", ")})
                        </span>
                      ) : null}
                    </div>
                    <div>
                      <button style={{ marginLeft: 8 }} onClick={() => deleteToolButton(k)}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

      {uncategorized.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <strong>Uncategorized</strong>
          <div
            style={{
              maxHeight: 120,
              overflow: "auto",
              border: "1px solid #eee",
              padding: 8,
            }}
          >
            {uncategorized.map(([k, v, headersFor]) => (
              <div
                key={k}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "4px 0",
                }}
              >
                <div>
                  {k} — {v.toolName || v.label || "toolButton"}
                  {headersFor && headersFor.length > 0 ? (
                    <span style={{ color: "#666", marginLeft: 8 }}>
                      (in: {headersFor.join(", ")})
                    </span>
                  ) : null}
                </div>
                <div>
                  <button style={{ marginLeft: 8 }} onClick={() => deleteToolButton(k)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}