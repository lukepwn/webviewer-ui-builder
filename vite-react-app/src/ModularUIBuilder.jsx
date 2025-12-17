import React, { useEffect, useState } from "react";

/**
 * @param download - downloads ui config json
 */
function download(filename, content) {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 *
 * Steps:
 * 1. Webviewer instantiated in App.jsx and exposed as window.viewerInstance
 * 2. On mount, try to load existing modularComponents from viewer
 * 3. Discover runtime toolbar groups and tools
 * 4.
 * 5.
 */

export default function ModularUIBuilder() {
  const [config, setConfig] = useState({
    modularComponents: {},
    modularHeaders: {},
    flyouts: {},
    panels: {},
  });

  const [status, setStatus] = useState("");
  const [runtimeCategories, setRuntimeCategories] = useState({});
  const [viewerTools, setViewerTools] = useState([]);

  useEffect(() => {
    // 1. Webviewer instantiated in App.jsx and exposed as window.viewerInstance
    if (window.viewerInstance && window.viewerInstance.UI) {
      try {
        const exported = window.viewerInstance.UI.exportModularComponents();
        setConfig(exported);
        setStatus("Loaded current UI configuration from viewer");
      } catch (e) {
        setStatus("No existing UI configuration available");
      }

      // 2. On mount, try to load existing modularComponents from viewer
      discoverRuntimeToolData();
    }
  }, []);

  function discoverRuntimeToolData() {
    if (!window.viewerInstance || !window.viewerInstance.UI) return;

    try {
      const UI = window.viewerInstance.UI;
      const Core = window.viewerInstance.Core || {};
      const cfg = config;

      // Primary discovery: use the runtime ribbon group to find toolbar groups and their items
      const categories = {};

      try {
        const ribbonGroup = UI.getRibbonGroup("default-ribbon-group");

        // discovered ribbonGroup (if any) — proceed to examine its toolbar groups
        console.log("ribbonGroup", ribbonGroup);
        if (ribbonGroup) {
          ribbonGroup.items.forEach((toolbarGroupRaw) => {
            const toolbarGroup =
              typeof toolbarGroupRaw === "string"
                ? { dataElement: toolbarGroupRaw }
                : toolbarGroupRaw || {};

            const catKey =
              toolbarGroup.toolbarGroup ||
              toolbarGroup.dataElement ||
              toolbarGroup.name ||
              "tools-header";
            categories[catKey] = categories[catKey] || [];

            // include direct items on toolbar group if present
            if (Array.isArray(toolbarGroup.items)) {
              toolbarGroup.items.forEach((it) => {
                try {
                  const value = it.toolName || it.dataElement || it.value;
                  const label =
                    it.label || it.toolName || it.dataElement || value;
                  if (
                    value &&
                    !categories[catKey].some((t) => t.value === value)
                  ) {
                    categories[catKey].push({ value, label });
                  }
                } catch (e) {
                  // ignore
                }
              });
            }

            const toolbarGroupedItems = Array.isArray(toolbarGroup.groupedItems)
              ? toolbarGroup.groupedItems
              : [];
            toolbarGroupedItems.forEach((item) => {
              try {
                const grouped = UI.getGroupedItems(item);
                if (grouped) {
                  //   console.log(grouped);
                  const groupedItems = grouped.items;
                  groupedItems.forEach((item) => {
                    // if (item.toolName) {
                    // console.log("item", item);
                    let value = item.toolName || item.dataElement || item.value;
                    let label =
                      item.label || item.toolName || item.dataElement || value;
                    // console.log("value/label", value, label);
                    // TODO: refactor duplicate logic

                    if (
                      value &&
                      !categories[catKey].some((t) => t.value === value)
                    ) {
                      categories[catKey].push({ value, label });
                    }
                    // }
                  });
                }
              } catch (e) {
                // ignore grouped items lookup failures
              }
            });
          });
        }
      } catch (e) {
        // ignore
      }

      // Also include items from the default top header (default-top-header)
      try {
        const topHeader =
          UI.getModularHeader && UI.getModularHeader("default-top-header");
        if (topHeader) {
          categories["default-top-header"] =
            categories["default-top-header"] || [];

          // get grouped items from the header
          let headerGrouped = [];
          try {
            headerGrouped = topHeader.getGroupedItems
              ? topHeader.getGroupedItems() || []
              : [];
          } catch (e) {
            headerGrouped = [];
          }

          headerGrouped.forEach((g) => {
            try {
              const items = g.items || (g.getItems && g.getItems()) || [];
              items.forEach((it) => {
                const value = it.toolName || it.dataElement || it.value;
                const label =
                  it.label || it.toolName || it.dataElement || value;
                if (
                  value &&
                  !categories["default-top-header"].some(
                    (t) => t.value === value
                  )
                ) {
                  categories["default-top-header"].push({ value, label });
                }
              });
            } catch (e) {
              // ignore
            }
          });

          // also include direct items on the header (non-grouped)
          try {
            const headerItems = topHeader.getItems
              ? topHeader.getItems() || []
              : [];
            headerItems.forEach((it) => {
              if (typeof it === "string") {
                // try to resolve grouped items by dataElement
                try {
                  const grouped = UI.getGroupedItems && UI.getGroupedItems(it);
                  const groups = Array.isArray(grouped)
                    ? grouped
                    : grouped
                    ? [grouped]
                    : [];
                  groups.forEach((g) => {
                    const items = g.items || (g.getItems && g.getItems()) || [];
                    items.forEach((i) => {
                      const value = i.toolName || i.dataElement || i.value;
                      const label =
                        i.label || i.toolName || i.dataElement || value;
                      if (
                        value &&
                        !categories["default-top-header"].some(
                          (t) => t.value === value
                        )
                      ) {
                        categories["default-top-header"].push({ value, label });
                      }
                    });
                  });
                } catch (e) {
                  // ignore
                }
              } else if (it && typeof it === "object") {
                const value = it.toolName || it.dataElement || it.value;
                const label =
                  it.label || it.toolName || it.dataElement || value;
                if (
                  value &&
                  !categories["default-top-header"].some(
                    (t) => t.value === value
                  )
                ) {
                  categories["default-top-header"].push({ value, label });
                }
              }
            });
          } catch (e) {
            // ignore
          }
        }
      } catch (e) {
        // ignore
      }

      // Build a dropdown list from SDK tools only (Core.Tools.ToolNames)
      let sdkToolsList = [];
      try {
        const Tools =
          (Core && Core.Tools && Core.Tools.ToolNames) ||
          (core && core.Tools && core.Tools.ToolNames);
        if (Tools) {
          // use value-only entries for SDK tools
          sdkToolsList = Object.values(Tools).map((tn) => ({ value: tn }));
        }
      } catch (e) {
        // ignore
      }

      // Viewer dropdown should use only SDK tools (no discovered-tool fallback)
      const viewerToolList = sdkToolsList;

      console.log(
        "runtimeCategories",
        Object.keys(runtimeCategories),
        categories
      );
      setRuntimeCategories(categories);
      setViewerTools(viewerToolList);
    } catch (err) {
      // no-op
    }
  }

  function addToolButton({ dataElement, toolName, label, header }) {
    if (!dataElement) return;

    setConfig((c) => {
      const modularComponents = {
        ...c.modularComponents,
        [dataElement]: { type: "toolButton", dataElement, toolName, label },
      };

      const headers = { ...c.modularHeaders };

      // Special-case: if the selected header is the runtime top header, create or update it in the config
      if (header === "default-top-header") {
        const tgt = headers["default-top-header"]
          ? { ...headers["default-top-header"] }
          : { dataElement: "default-top-header", placement: "top", items: [] };
        tgt.items = Array.isArray(tgt.items) ? tgt.items.slice() : [];
        if (!tgt.items.includes(dataElement)) tgt.items.push(dataElement);
        headers["default-top-header"] = tgt;
        setStatus(`Added ${dataElement} to header default-top-header`);

        // Update runtimeCategories so UI reflects change immediately
        const value = toolName || dataElement;
        const labelValue = label || toolName || dataElement;
        setRuntimeCategories((rc) => {
          const prev = rc || {};
          const arr = prev["default-top-header"] || [];
          if (arr.some((t) => t.value === value)) return prev;
          return {
            ...prev,
            "default-top-header": [...arr, { value, label: labelValue }],
          };
        });

        return { ...c, modularComponents, modularHeaders: headers };
      }

      // If the chosen header matches an actual modularHeader, add to that header directly
      if (header && headers[header]) {
        const tgt = { ...headers[header] };
        tgt.items = Array.isArray(tgt.items) ? tgt.items.slice() : [];
        if (!tgt.items.includes(dataElement)) tgt.items.push(dataElement);
        headers[header] = tgt;
        setStatus(`Added ${dataElement} to header ${header}`);
        return { ...c, modularComponents, modularHeaders: headers };
      }

      // If the chosen header looks like a runtime toolbarGroup, attempt to attach the tool to that group's ribbonItem/groupedItems
      if (header && header.startsWith("toolbarGroup-")) {
        // Try to find a ribbonItem (or ribbonGroup) that maps to this toolbarGroup
        let ribbonItemKey = null;
        for (const [k, comp] of Object.entries(modularComponents)) {
          if (!comp) continue;
          if (
            (comp.type === "ribbonItem" || comp.type === "ribbonGroup") &&
            (comp.toolbarGroup === header ||
              comp.dataElement === header ||
              k === header)
          ) {
            // prefer ribbonItem over ribbonGroup, but accept either
            if (comp.type === "ribbonItem") {
              ribbonItemKey = k;
              break;
            }
            if (!ribbonItemKey) ribbonItemKey = k;
          }
        }

        if (ribbonItemKey) {
          const comp = { ...modularComponents[ribbonItemKey] };

          // If it already has groupedItems, add into the first groupedItems component's items
          if (
            Array.isArray(comp.groupedItems) &&
            comp.groupedItems.length > 0
          ) {
            const gName = comp.groupedItems[0];
            const gComp = { ...(modularComponents[gName] || {}) };
            gComp.items = Array.isArray(gComp.items) ? gComp.items.slice() : [];
            if (!gComp.items.includes(dataElement))
              gComp.items.push(dataElement);
            modularComponents[gName] = gComp;
            setStatus(`Added ${dataElement} to ${gName}`);
            return { ...c, modularComponents, modularHeaders: headers };
          }

          // Otherwise create a new groupedItems component and attach it
          let newNameBase = `${dataElement}-groupedItems`;
          let newName = newNameBase;
          let idx = 0;
          while (modularComponents[newName]) {
            idx += 1;
            newName = `${newNameBase}-${idx}`;
          }
          modularComponents[newName] = {
            type: "groupedItems",
            dataElement: newName,
            items: [dataElement],
          };
          comp.groupedItems = Array.isArray(comp.groupedItems)
            ? [...comp.groupedItems, newName]
            : [newName];
          modularComponents[ribbonItemKey] = comp;
          setStatus(
            `Created ${newName} and added ${dataElement} to ribbon ${ribbonItemKey}`
          );
          return { ...c, modularComponents, modularHeaders: headers };
        }
      }

      // Fallback: add to 'tools-header' if it exists, otherwise create it
      let targetHeaderName = "tools-header";
      let targetHeader = headers[targetHeaderName];
      if (!targetHeader) {
        targetHeader = {
          dataElement: targetHeaderName,
          placement: "top",
          items: [],
        };
      }
      targetHeader.items = Array.isArray(targetHeader.items)
        ? targetHeader.items.slice()
        : [];
      if (!targetHeader.items.includes(dataElement))
        targetHeader.items.push(dataElement);
      headers[targetHeaderName] = targetHeader;

      setStatus(`Added ${dataElement} to ${targetHeaderName}`);
      return { ...c, modularComponents, modularHeaders: headers };
    });
  }

  function deleteToolButton(dataElement) {
    const compToDelete = (config.modularComponents || {})[dataElement];
    const needle = compToDelete
      ? compToDelete.toolName || compToDelete.dataElement || compToDelete.label
      : dataElement;

    // Remove component and clean up any references to it in headers and other components
    setConfig((c) => {
      const modularComponents = { ...c.modularComponents };
      // delete the component
      delete modularComponents[dataElement];

      // remove any references in headers
      const headers = { ...c.modularHeaders };
      for (const key of Object.keys(headers)) {
        if (Array.isArray(headers[key].items)) {
          headers[key].items = headers[key].items.filter(
            (i) => i !== dataElement
          );
        }
      }

      // remove any references inside other modularComponents (groupedItems, items arrays, groupedItems lists)
      for (const [compKey, comp] of Object.entries(modularComponents)) {
        if (!comp) continue;

        if (Array.isArray(comp.items)) {
          const filtered = comp.items.filter((it) => {
            if (typeof it === "string") return it !== dataElement;
            if (it && it.dataElement) return it.dataElement !== dataElement;
            return true;
          });
          if (filtered.length !== comp.items.length) {
            modularComponents[compKey] = { ...comp, items: filtered };
          }
        }

        if (Array.isArray(comp.groupedItems)) {
          const ng = comp.groupedItems.filter((g) => g !== dataElement);
          if (ng.length !== comp.groupedItems.length) {
            modularComponents[compKey] = {
              ...modularComponents[compKey],
              groupedItems: ng,
            };
          }
        }
      }

      return { ...c, modularComponents, modularHeaders: headers };
    });

    // Remove references from runtime categories so UI updates immediately
    setRuntimeCategories((rc) => {
      if (!rc) return rc;
      const next = {};
      for (const [cat, items] of Object.entries(rc)) {
        next[cat] = (items || []).filter((t) => t.value !== needle);
      }
      return next;
    });

    setStatus(`Deleted ${dataElement} and cleaned up references`);
  }

  function removeToolButtonFromGroup(dataElement, header) {
    if (!header) return;

    const comp = (config.modularComponents || {})[dataElement];
    const needle = comp
      ? comp.toolName || comp.dataElement || comp.label
      : dataElement;

    setConfig((c) => {
      const headers = { ...c.modularHeaders };
      if (!headers[header]) return c;
      headers[header] = {
        ...headers[header],
        items: (headers[header].items || []).filter((i) => i !== dataElement),
      };
      return { ...c, modularHeaders: headers };
    });

    // If removing from runtime top header, update runtimeCategories
    if (header === "default-top-header") {
      setRuntimeCategories((rc) => {
        if (!rc) return rc;
        const prev = rc || {};
        const arr = prev["default-top-header"] || [];
        return {
          ...prev,
          "default-top-header": arr.filter((t) => t.value !== needle),
        };
      });
    }
  }

  async function applyToViewer() {
    if (!window.viewerInstance || !window.viewerInstance.UI) {
      setStatus("WebViewer instance not available");
      return;
    }
    try {
      window.viewerInstance.UI.importModularComponents(config, {});
      setStatus("Imported modular UI into viewer");
    } catch (e) {
      console.error(e);
      setStatus("Import failed: " + e.message);
    }
  }

  function exportConfig() {
    download("webviewer-ui-config.json", JSON.stringify(config, null, 2));
  }

  // Example loader: creates a sample button, flyout and custom panel and applies it
  function loadExampleAndApply() {
    const exampleConfig = {
      modularComponents: {
        panButton: {
          type: "toolButton",
          dataElement: "panButton",
          toolName: "Pan",
        },
        rectangleButton: {
          type: "toolButton",
          dataElement: "rectangleButton",
          toolName: "AnnotationCreateRectangle",
        },
      },
      modularHeaders: {
        "tools-header": {
          dataElement: "tools-header",
          placement: "left",
          items: ["panButton", "rectangleButton"],
        },
      },
    };

    const exampleFunctionMap = {
      alertClick: () => alert("Example button clicked!"),
      customPanelRender: () => {
        const div = document.createElement("div");
        div.style.padding = "12px";
        const h = document.createElement("h3");
        h.textContent = "Custom Panel (Example)";
        const p = document.createElement("p");
        p.textContent = "This panel was added by the example loader.";
        const btn = document.createElement("button");
        btn.textContent = "Panel action";
        btn.onclick = () => alert("Panel action clicked");
        div.appendChild(h);
        div.appendChild(p);
        div.appendChild(btn);
        return div;
      },
    };

    setConfig(exampleConfig);

    if (window.viewerInstance && window.viewerInstance.UI) {
      try {
        window.viewerInstance.UI.importModularComponents(
          exampleConfig,
          exampleFunctionMap
        );
        // open the custom panel to show result
        try {
          window.viewerInstance.UI.openElements(["customPanel"]);
        } catch (err) {
          // ignore if not available
        }
        setStatus("Example modular UI applied to viewer");
      } catch (err) {
        console.error(err);
        setStatus("Failed to apply example: " + err.message);
      }
    } else {
      setStatus(
        "Example loaded into builder state; start the viewer and click Apply to Viewer"
      );
    }
  }

  function importConfigFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        setConfig(parsed);
        setStatus("Config loaded from file");
      } catch (err) {
        setStatus("Invalid JSON file");
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="ModularUIBuilder">
      <h3>Modular UI Builder</h3>
      <p style={{ color: "#666" }}>{status}</p>

      <section style={{ marginBottom: 12 }}>
        <h4>Add / Remove Tool Button</h4>
        <ToolButtonForm
          headerOptions={[
            ...new Set([
              ...Object.keys(config.modularHeaders || {}),
              "tools-header",
              "default-top-header",
              ...Object.keys(runtimeCategories),
            ]),
          ]}
          toolOptions={viewerTools}
          onAdd={(values) => addToolButton(values)}
        />

        {(() => {
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
              for (const [cat, tools] of Object.entries(
                runtimeCategories || {}
              )) {
                if ((tools || []).some((t) => t.value === needle)) {
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
                      config.modularComponents[t.value] &&
                      config.modularComponents[t.value].type === "groupedItems";
                    if (!isGroupedItems) continue;
                    if (!ui || !ui.getGroupedItems) continue;
                    const grouped = ui.getGroupedItems(t.value);
                    const groups = Array.isArray(grouped)
                      ? grouped
                      : grouped
                      ? [grouped]
                      : [];
                    let found = false;
                    for (const g of groups) {
                      const items =
                        g.items || (g.getItems && g.getItems()) || [];
                      for (const it of items) {
                        const itValue =
                          it.toolName || it.dataElement || it.value;
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
                              <button
                                style={{ marginLeft: 8 }}
                                onClick={() => deleteToolButton(k)}
                              >
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
                          {headersFor &&
                          headersFor.length > 0 &&
                          !(headersFor || []).includes(cat) ? (
                            <span style={{ color: "#666", marginLeft: 8 }}>
                              (in: {headersFor.join(", ")})
                            </span>
                          ) : null}
                        </div>
                        <div>
                          <button
                            style={{ marginLeft: 8 }}
                            onClick={() => deleteToolButton(k)}
                          >
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
        })()}
      </section>

      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button onClick={loadExampleAndApply}>Load Example and Apply</button>
        <button onClick={applyToViewer}>Apply to Viewer</button>
        <button onClick={exportConfig}>Export JSON</button>
        <button
          onClick={() => {
            discoverRuntimeToolData();
            setStatus("Refreshed categories");
          }}
        >
          Refresh Categories
        </button>
        <label style={{ display: "inline-block" }}>
          <input
            type="file"
            accept="application/json"
            onChange={importConfigFile}
            style={{ display: "none" }}
          />
          <button>Import JSON</button>
        </label>
      </div>

      <section style={{ marginTop: 12 }}>
        <h4>Current Config Preview</h4>
        <pre
          style={{
            maxHeight: 220,
            overflow: "auto",
            background: "#fff",
            border: "1px solid #eee",
            padding: 8,
          }}
        >
          {JSON.stringify(config, null, 2)}
        </pre>
      </section>
    </div>
  );
}

function ToolButtonForm({ onAdd, headerOptions = [], toolOptions = [] }) {
  const [dataElement, setDataElement] = useState("panButton");
  const [toolName, setToolName] = useState(
    (toolOptions && toolOptions.length && toolOptions[0].value) || ""
  );
  const [customToolName, setCustomToolName] = useState("");
  const [header, setHeader] = useState(
    headerOptions && headerOptions.length ? headerOptions[0] : "tools-header"
  );
  const [customHeader, setCustomHeader] = useState("");
  const [label, setLabel] = useState("");

  const headerOptionsFinal =
    headerOptions && headerOptions.length
      ? headerOptions
      : ["tools-header", "default-top-header"];

  const effectiveToolName =
    toolName === "__other__" ? customToolName || "" : toolName;
  const effectiveHeader = header === "__other__" ? customHeader || "" : header;

  return (
    <div style={{ display: "flex", gap: 8, flexDirection: "column" }}>
      <input
        value={dataElement}
        onChange={(e) => setDataElement(e.target.value)}
        placeholder="dataElement"
      />

      <select value={header} onChange={(e) => setHeader(e.target.value)}>
        {headerOptionsFinal.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
        <option value="__other__">Other (enter custom below)</option>
      </select>

      {header === "__other__" && (
        <input
          value={customHeader}
          onChange={(e) => setCustomHeader(e.target.value)}
          placeholder="custom header name"
        />
      )}

      <label style={{ fontSize: 12, color: "#666" }}>Tool</label>
      <select value={toolName} onChange={(e) => setToolName(e.target.value)}>
        {toolOptions && toolOptions.length ? (
          toolOptions.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label || t.value}
            </option>
          ))
        ) : (
          <option value="">(no tools available)</option>
        )}
        <option value="__other__">Other (enter custom below)</option>
      </select>

      {toolName === "__other__" && (
        <input
          value={customToolName}
          onChange={(e) => setCustomToolName(e.target.value)}
          placeholder="custom toolName"
        />
      )}

      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="label (optional)"
      />
      <div>
        <button
          onClick={() => {
            if (!dataElement || !effectiveToolName || !effectiveHeader) {
              alert("dataElement, toolName and header are required");
              return;
            }
            onAdd({
              dataElement,
              toolName: effectiveToolName,
              label,
              header: effectiveHeader,
            });
            setDataElement("");
            setLabel("");
          }}
        >
          Add Tool Button
        </button>
      </div>
    </div>
  );
}
