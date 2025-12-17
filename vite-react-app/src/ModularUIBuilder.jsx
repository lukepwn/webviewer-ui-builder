import React, { useEffect, useState } from "react";
import ToolButtonForm from "./components/ToolButtonForm";
import ToolButtonsCategorized from "./components/ToolButtonsCategorized";
import ConfigPreview from "./components/ConfigPreview";

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

  // helper: resolve a tool-like item's canonical value (used for lookup/dedupe)
  function getValue(it) {
    if (!it) return "";
    return it.toolName || it.dataElement || it.value || "";
  }

  // helper: add a value string to a category, deduplicating by value
  function addCategoryItem(categories, key, value) {
    if (!value) return;
    categories[key] = categories[key] || [];
    if (!categories[key].includes(value)) {
      categories[key].push(value);
    }
  }

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
      const Core =
        window.viewerInstance.Core || window.viewerInstance.core || {};

      // Primary discovery: use the runtime ribbon group to find toolbar groups and their items
      const categories = {};

      try {
        const ribbonGroup = UI.getRibbonGroup("default-ribbon-group");

        // proceed to examine toolbar groups if present
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
                  const value = getValue(it);
                  addCategoryItem(categories, catKey, value);
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
                  const groupedItems =
                    grouped.items ||
                    (grouped.getItems && grouped.getItems()) ||
                    [];
                  groupedItems.forEach((it) => {
                    try {
                      const value = getValue(it);
                      addCategoryItem(categories, catKey, value);
                    } catch (e) {
                      // ignore
                    }
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
                try {
                  const value = getValue(it);
                  addCategoryItem(categories, "default-top-header", value);
                } catch (e) {
                  // ignore
                }
              });
            } catch (e) {
              // ignore
            }
          });
        }
      } catch (e) {
        // ignore
      }

      // Build a dropdown list from SDK tools only (Core.Tools.ToolNames)
      const Tools = Core && Core.Tools && Core.Tools.ToolNames;
      const viewerToolList = Tools
        ? Object.values(Tools).map((tn) => ({ value: tn }))
        : [];

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
          if (arr.some((t) => t === value)) return prev;
          return {
            ...prev,
            "default-top-header": [...arr, value],
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
        next[cat] = (items || []).filter((t) => t !== needle);
      }
      return next;
    });

    setStatus(`Deleted ${dataElement} and cleaned up references`);
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

        <ToolButtonsCategorized
          config={config}
          runtimeCategories={runtimeCategories}
          deleteToolButton={deleteToolButton}
        />
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
        <ConfigPreview config={config} />
      </section>
    </div>
  );
}


