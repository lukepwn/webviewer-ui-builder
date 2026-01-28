import React, { useEffect, useRef, useState } from "react";
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

  const [runtimeCategories, setRuntimeCategories] = useState({});
  const [viewerTools, setViewerTools] = useState([]);
  const fileInputRef = useRef(null);

  // helper: resolve a tool-like item's canonical value (used for lookup/dedupe)
  function getValue(it) {
    if (!it) return "";
    return it.dataElement || "";
  }

  // helper: add a value string to a category, deduplicating by value (Set-based)
  function addCategoryItem(categories, key, value) {
    if (!value) return;
    categories[key] = Array.from(new Set([...categories[key], value]));
  }

  useEffect(() => {
    // 1. Webviewer instantiated in App.jsx and exposed as window.viewerInstance
    if (window.viewerInstance && window.viewerInstance.UI) {
      try {
        const exported = window.viewerInstance.UI.exportModularComponents();
        setConfig(exported);
      } catch (e) {
        // no-op
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

      // helpers: assume APIs return the expected shapes and iterate directly
      const addItemsArrayToCategory = (items, catKey) => {
        items.forEach((it) => {
          const value = getValue(it);
          addCategoryItem(categories, catKey, value);
        });
      };

      const addGroupedRefToCategory = (ref, catKey) => {
        const grouped = UI.getGroupedItems(ref);
        const groups = Array.isArray(grouped) ? grouped : [grouped];
        for (const g of groups) {
          const items = g.items || g.getItems();
          addItemsArrayToCategory(items, catKey);
        }
      };

      // generic helper to iterate grouped items array (from getGroupedItems() or similar)
      const addGroupedItemsToCategory = (groupedArray, catKey) => {
        groupedArray.forEach((g) => {
          const items = g.items || g.getItems();
          addItemsArrayToCategory(items, catKey);
        });
      };

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
            addItemsArrayToCategory(toolbarGroup.items, catKey);
          }

          const toolbarGroupedItems = toolbarGroup.groupedItems;
          toolbarGroupedItems.forEach((item) => {
            addGroupedRefToCategory(item, catKey);
          });
        });
      }

      // Also include items from the default top header (default-top-header)
      try {
        const topHeader =
          UI.getModularHeader && UI.getModularHeader("default-top-header");
        if (topHeader) {
          categories["default-top-header"] =
            categories["default-top-header"] || [];

          // get grouped items from the header
          const headerGrouped = topHeader.getGroupedItems();
          addGroupedItemsToCategory(headerGrouped, "default-top-header");
        }
      } catch (e) {
        // ignore
      }

      // Build a dropdown list from SDK tools only (Core.Tools.ToolNames)
      const Tools = Core && Core.Tools && Core.Tools.ToolNames;
      const viewerToolList = Object.values(Tools).map((tn) => ({ value: tn }));

      setRuntimeCategories(categories);
      setViewerTools(viewerToolList);
    } catch (err) {
      // no-op
    }
  }

  function addToolButton({ dataElement, toolName, label, header }) {
    if (!dataElement || !header) return;

    // react calls function and returns the latest new state
    // config to avoid stale state, then we modify and return new state
    setConfig((c) => {
      const modularComponents = {
        ...c.modularComponents,
        [dataElement]: { type: "toolButton", dataElement, toolName, label },
      };
      const headers = { ...c.modularHeaders };

      const headerComp = modularComponents[header];
      if (headerComp?.groupedItems?.length) {
        // Add to the first groupedItems component
        const groupedItemsKey = headerComp.groupedItems[0];
        const groupedItemsComp = modularComponents[groupedItemsKey] || {
          type: "groupedItems",
          dataElement: groupedItemsKey,
          items: [],
        };
        if (!groupedItemsComp.items.includes(dataElement)) {
          groupedItemsComp.items = [...groupedItemsComp.items, dataElement];
        }
        modularComponents[groupedItemsKey] = groupedItemsComp;

        return { ...c, modularComponents, modularHeaders: headers };
      }

      // Otherwise, add to the header directly (i.e. default-top-header)

      if (!headers[header].items.includes(dataElement)) {
        headers[header].items = [...headers[header].items, dataElement];
      }

      return { ...c, modularComponents, modularHeaders: headers };
    });
  }

  function deleteToolButton(dataElement) {
    // Remove component and clean up any references to it in headers and other components
    setConfig((c) => {
      const modularComponents = { ...c.modularComponents };
      // delete the component
      delete modularComponents[dataElement];

      const headers = { ...c.modularHeaders };
      for (const key of Object.keys(headers)) {
        if (Array.isArray(headers[key].items)) {
          headers[key].items = headers[key].items.filter(
            (i) => i !== dataElement,
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
        next[cat] = items.filter((t) => t !== dataElement);
      }
      return next;
    });

    // deleted component and cleaned up references
  }

  async function applyToViewer() {
    if (!window.viewerInstance || !window.viewerInstance.UI) {
      console.warn("WebViewer instance not available");
      return;
    }
    try {
      window.viewerInstance.UI.importModularComponents(config, {});
      // Refresh runtime-derived categories immediately so the builder UI reflects the imported config
      try {
        discoverRuntimeToolData();
        // imported and refreshed
      } catch (err) {
        // imported (refresh failed)
      }
    } catch (e) {
      console.error(e);
      console.error("Import failed: ", e.message);
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
          exampleFunctionMap,
        );
        // open the custom panel to show result
        try {
          window.viewerInstance.UI.openElements(["customPanel"]);
        } catch (err) {
          // ignore if not available
        }
        // example applied to viewer
      } catch (err) {
        console.error(err);
        console.error("Failed to apply example: ", err.message);
      }
    } else {
      // Example loaded into builder state; start the viewer and click Apply to Viewer
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

        // Apply the imported config to the viewer
        if (window.viewerInstance && window.viewerInstance.UI) {
          try {
            window.viewerInstance.UI.importModularComponents(parsed, {});
            // Refresh runtime-derived categories so the builder UI reflects the imported config
            try {
              discoverRuntimeToolData();
            } catch (err) {
              // ignore if refresh fails
            }
          } catch (err) {
            console.error("Failed to apply config to viewer: ", err.message);
          }
        }
      } catch (err) {
        console.error("Invalid JSON file");
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="ModularUIBuilder">
      <h3>Modular UI Builder</h3>

      <section style={{ marginBottom: 12 }}>
        <h4>Add / Remove Tool Button</h4>
        <ToolButtonForm
          headerOptions={Object.keys(runtimeCategories)}
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
        {/* Refresh Categories removed — Apply to Viewer now refreshes categories automatically */}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          onChange={importConfigFile}
          hidden
        />
        <button onClick={() => fileInputRef.current?.click()}>
          Import JSON
        </button>
      </div>

      <section style={{ marginTop: 12 }}>
        <h4>Current Config Preview</h4>
        <ConfigPreview config={config} />
      </section>
    </div>
  );
}
