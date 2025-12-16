import React, { useEffect, useState } from "react";

function download(filename, content) {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ALL_TOOLS is built dynamically from the viewer at runtime
const ALL_TOOLS = [];

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
    // try to load current UI from viewer and discover tools
    if (window.viewerInstance && window.viewerInstance.UI) {
      try {
        const exported = window.viewerInstance.UI.exportModularComponents();
        setConfig(exported);
        setStatus("Loaded current UI configuration from viewer");
      } catch (e) {
        setStatus("No existing UI configuration available");
      }

      // discover runtime ribbon groups and tools
      discoverRuntimeToolData();
    }
  }, []);

  function discoverRuntimeToolData() {
    if (!window.viewerInstance || !window.viewerInstance.UI) return;

    try {
      const ui = window.viewerInstance.UI;
      const core = window.viewerInstance.Core || {};

      // Use exported config if possible (more reliable), otherwise fallback
      let cfg = null;
      try {
        cfg = ui.exportModularComponents ? ui.exportModularComponents() : null;
      } catch (e) {
        cfg = null;
      }
      if (!cfg) cfg = config || { modularComponents: {}, modularHeaders: {} };

      // Primary discovery: use the runtime ribbon group to find toolbar groups and their items
      const categories = {};
      const toolsMap = new Map();

      try {
        const ribbonGroup =
          ui.getRibbonGroup && ui.getRibbonGroup("default-ribbon-group");
        if (ribbonGroup && Array.isArray(ribbonGroup.items)) {
          ribbonGroup.items.forEach((rItem) => {
            const catKey =
              rItem.toolbarGroup ||
              rItem.dataElement ||
              rItem.name ||
              "tools-header";
            categories[catKey] = categories[catKey] || [];

            const groupedNames = rItem.groupedItems || [];
            groupedNames.forEach((gname) => {
              try {
                const grouped = ui.getGroupedItems && ui.getGroupedItems(gname);
                const groups = Array.isArray(grouped)
                  ? grouped
                  : grouped
                  ? [grouped]
                  : [];
                groups.forEach((g) => {
                  const items = g.items || (g.getItems && g.getItems()) || [];
                  items.forEach((it) => {
                    let value = null;
                    let label = null;

                    if (typeof it === "string") {
                      value = it;
                      const comp =
                        (cfg &&
                          cfg.modularComponents &&
                          cfg.modularComponents[value]) ||
                        (config &&
                          config.modularComponents &&
                          config.modularComponents[value]);
                      label =
                        (comp &&
                          (comp.label || comp.toolName || comp.dataElement)) ||
                        value;
                    } else if (it && typeof it === "object") {
                      value = it.toolName || it.dataElement || it.value;
                      label =
                        it.label || it.toolName || it.dataElement || value;
                      if (it.dataElement) {
                        const comp =
                          (cfg &&
                            cfg.modularComponents &&
                            cfg.modularComponents[it.dataElement]) ||
                          (config &&
                            config.modularComponents &&
                            config.modularComponents[it.dataElement]);
                        if (comp)
                          label =
                            comp.label ||
                            comp.toolName ||
                            comp.dataElement ||
                            label;
                      }
                    }

                    if (
                      value &&
                      !categories[catKey].some((t) => t.value === value)
                    ) {
                      categories[catKey].push({ value, label });
                    }

                    // Only add non-divider/non-empty entries to selectable tools
                    if (
                      value &&
                      !value.startsWith("divider-") &&
                      !toolsMap.has(value)
                    ) {
                      toolsMap.set(value, { value, label });
                    }
                  });
                });
              } catch (e) {
                // ignore grouped items lookup failures
              }
            });
          });
        }
      } catch (e) {
        // ignore
      }

      // Fallback: if no categories found, try exported config traversal
      if (Object.keys(categories).length === 0) {
        try {
          const exported =
            ui.exportModularComponents && ui.exportModularComponents();
          if (exported) {
            const { categories: cfgCats, tools: cfgTools } =
              buildCategoriesFromConfig(exported);
            Object.assign(categories, cfgCats);
            cfgTools.forEach(
              (t) => !toolsMap.has(t.value) && toolsMap.set(t.value, t)
            );
          }
        } catch (e) {
          // ignore
        }
      }

      // Add SDK tool names
      try {
        const Tools = core.Tools && core.Tools.ToolNames;
        if (Tools)
          Object.values(Tools).forEach(
            (tn) =>
              !toolsMap.has(tn) && toolsMap.set(tn, { value: tn, label: tn })
          );
      } catch (e) {
        // ignore
      }

      const tools = Array.from(toolsMap.values());

      setRuntimeCategories(categories);
      setViewerTools(tools);
    } catch (err) {
      // no-op
    }
  }

  function buildCategoriesFromConfig(cfg) {
    const categories = {};
    const collectedTools = [];
    const components = cfg.modularComponents || {};
    const headers = cfg.modularHeaders || {};

    function addTool(cat, tool) {
      if (!cat) cat = "tools-header";
      categories[cat] = categories[cat] || [];
      if (!categories[cat].some((t) => t.value === tool.value))
        categories[cat].push(tool);
      if (!collectedTools.some((t) => t.value === tool.value))
        collectedTools.push(tool);
    }

    function processItem(itemId, inheritedCategory) {
      if (!itemId) return;
      const comp = components[itemId];
      if (comp) {
        const type = comp.type;
        if (type === "ribbonGroup") {
          const items = comp.items || [];
          items.forEach((ri) => {
            let rEntry = ri;
            if (typeof ri === "string")
              rEntry = components[ri] || { dataElement: ri };
            const catKey = rEntry.toolbarGroup || rEntry.dataElement;
            const grouped = rEntry.groupedItems || [];
            grouped.forEach((gname) => processItem(gname, catKey));
          });
        } else if (type === "ribbonItem") {
          const catKey = comp.toolbarGroup || comp.dataElement;
          const grouped = comp.groupedItems || [];
          grouped.forEach((gname) => processItem(gname, catKey));
        } else if (type === "groupedItems") {
          const items = comp.items || [];
          items.forEach((child) => {
            if (typeof child === "string") {
              processItem(child, inheritedCategory);
            } else if (child && child.dataElement) {
              processItem(child.dataElement, inheritedCategory);
            }
          });
        } else if (type === "toolButton") {
          const value = comp.toolName || comp.dataElement;
          const label = comp.label || comp.toolName || comp.dataElement;
          addTool(inheritedCategory, { value, label });
        } else if (
          type === "ribbonItem" ||
          type === "ribbonGroup" ||
          type === "groupedItems"
        ) {
          const items = comp.items || [];
          if (Array.isArray(items))
            items.forEach((it) => processItem(it, inheritedCategory));
        } else {
          // Treat other leaf component types (CustomButton, ToggleElementButton, PresetButton, etc.) as selectable items
          if (comp.dataElement) {
            const value = comp.dataElement;
            const label = comp.label || comp.toolName || comp.dataElement;
            addTool(inheritedCategory, { value, label });
          } else {
            const items = comp.items || [];
            if (Array.isArray(items))
              items.forEach((it) => processItem(it, inheritedCategory));
          }
        }
      } else {
        const headerEntry = headers[itemId];
        if (headerEntry && headerEntry.items) {
          headerEntry.items.forEach((it) => processItem(it, inheritedCategory));
        }
      }
    }

    // Walk headers
    for (const hdrKey of Object.keys(headers)) {
      const hdr = headers[hdrKey];
      const items = hdr.items || [];
      items.forEach((it) => {
        if (typeof it === "string") processItem(it, null);
        else if (it && it.dataElement) {
          if (it.toolbarGroup) {
            const catKey = it.toolbarGroup;
            const grouped = it.groupedItems || [];
            grouped.forEach((gname) => processItem(gname, catKey));
          } else if (it.groupedItems) {
            it.groupedItems.forEach((gname) => processItem(gname, null));
          }
        }
      });
    }

    // Also ensure any toolButtons not found are included as uncategorized
    for (const [k, comp] of Object.entries(components)) {
      if (comp && comp.type === "toolButton") {
        const value = comp.toolName || comp.dataElement;
        const label = comp.label || comp.toolName || comp.dataElement;
        const already = collectedTools.some((t) => t.value === value);
        if (!already) addTool(null, { value, label });
      }
    }

    return { categories, tools: collectedTools };
  }

  function addToolButton({ dataElement, toolName, label, header }) {
    if (!dataElement) return;

    setConfig((c) => {
      const modularComponents = {
        ...c.modularComponents,
        [dataElement]: { type: "toolButton", dataElement, toolName, label },
      };

      const headers = { ...c.modularHeaders };

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

    setStatus(`Deleted ${dataElement} and cleaned up references`);
  }

  function removeToolButtonFromGroup(dataElement, header) {
    if (!header) return;
    setConfig((c) => {
      const headers = { ...c.modularHeaders };
      if (!headers[header]) return c;
      headers[header] = {
        ...headers[header],
        items: (headers[header].items || []).filter((i) => i !== dataElement),
      };
      return { ...c, modularHeaders: headers };
    });
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

        <div style={{ marginTop: 8 }}>
          <h5>Tool Buttons by Toolbar Group</h5>
          {Object.keys(config.modularHeaders || {}).length === 0 ? (
            <em>No toolbar groups defined</em>
          ) : (
            Object.entries(config.modularHeaders || {}).map(([hdrKey, hdr]) => (
              <div key={hdrKey} style={{ marginBottom: 12 }}>
                <strong>{hdrKey}</strong>
                <div
                  style={{
                    maxHeight: 140,
                    overflow: "auto",
                    border: "1px solid #eee",
                    padding: 8,
                  }}
                >
                  {(hdr.items || []).filter((item) => {
                    const comp = (config.modularComponents || {})[item];
                    return comp && comp.type === "toolButton";
                  }).length === 0 ? (
                    <em>No tool buttons in this group</em>
                  ) : (
                    (hdr.items || []).map((item) => {
                      const comp = (config.modularComponents || {})[item];
                      if (!comp || comp.type !== "toolButton") return null;
                      return (
                        <div
                          key={item}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "4px 0",
                          }}
                        >
                          <div>
                            {item} —{" "}
                            {comp.toolName || comp.label || "toolButton"}
                          </div>
                          <div>
                            <button
                              onClick={() =>
                                removeToolButtonFromGroup(item, hdrKey)
                              }
                            >
                              Remove
                            </button>
                            <button
                              style={{ marginLeft: 8 }}
                              onClick={() => deleteToolButton(item)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ))
          )}

          {(() => {
            // Compute orphan tool buttons (not present in any header) and group them by discovered runtime categories
            const orphanList = Object.entries(
              config.modularComponents || {}
            ).filter(
              ([k, v]) =>
                v.type === "toolButton" &&
                !Object.values(config.modularHeaders || {}).some((h) =>
                  (h.items || []).includes(k)
                )
            );

            if (orphanList.length === 0) return null;

            const categorized = {};
            const uncategorized = [];

            for (const [k, v] of orphanList) {
              let assigned = false;
              const ui = window.viewerInstance && window.viewerInstance.UI;
              const needle = v.toolName || v.dataElement || v.label;

              for (const [cat, tools] of Object.entries(
                runtimeCategories || {}
              )) {
                if ((tools || []).some((t) => t.value === needle)) {
                  categorized[cat] = categorized[cat] || [];
                  categorized[cat].push([k, v]);
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
                          categorized[cat].push([k, v]);
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

              if (!assigned) uncategorized.push([k, v]);
            }

            return (
              <div style={{ marginTop: 12 }}>
                <h5>Orphan Tool Buttons (categorized)</h5>
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
                          {list.map(([k, v]) => (
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
                              </div>
                              <div>
                                <button onClick={() => deleteToolButton(k)}>
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
                      {uncategorized.map(([k, v]) => (
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
                          </div>
                          <div>
                            <button onClick={() => deleteToolButton(k)}>
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
        </div>
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
