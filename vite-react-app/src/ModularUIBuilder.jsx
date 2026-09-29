import React, { useEffect, useRef, useState, useCallback } from "react";
import ToolButtonsCategorized from "./components/ToolButtonsCategorized";
import HeaderManager from "./components/HeaderManager";
import PanelManager from "./components/PanelManager";
import AddComponentModal from "./components/AddComponentModal";
import ConfigPreview from "./components/ConfigPreview";
import {
  DEFAULT_BLANK_CONFIG,
  PANELS_CATALOG,
} from "./constants/webviewerCatalog";

function download(filename, content) {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Sanitizes configuration before passing to WebViewer importModularComponents
function sanitizeConfigForImport(rawConfig = {}) {
  const allowedPlacements = new Set(["top", "bottom", "left", "right"]);

  // 1. Sanitize components: ensure each has a valid type and dataElement
  const sanitizedComponents = {};
  for (const [key, value] of Object.entries(
    rawConfig.modularComponents || {},
  )) {
    if (!value || typeof value !== "object") continue;
    // Component must have a valid type string
    if (!value.type || typeof value.type !== "string") {
      console.warn(
        `sanitizeConfigForImport: Skipping component '${key}' because it lacks a valid 'type'.`,
        value,
      );
      continue;
    }
    const compCopy = { ...value, dataElement: value.dataElement || key };

    // Normalize known component type aliases to WebViewer's expected schema types
    if (compCopy.type === "toggleElementButton") {
      compCopy.type = "toggleButton";
    }
    if (compCopy.type === "button") {
      compCopy.type = "customButton";
    }
    if (compCopy.type === "mainMenu" || compCopy.type === "menuButton") {
      compCopy.type = "toggleButton";
      compCopy.toggleElement = compCopy.toggleElement || "MainMenuFlyout";
      if (!compCopy.img || compCopy.img === "icon-header-menu") {
        compCopy.img = "ic-hamburger-menu";
      }
      compCopy.title = compCopy.title || "Menu";
    }
    if (compCopy.type === "label") {
      compCopy.label = compCopy.label || compCopy.title || key;
    }

    // WebViewer requires ribbonItem to always have a groupedItems array (Ap selector)
    if (compCopy.type === "ribbonItem") {
      if (!Array.isArray(compCopy.groupedItems)) {
        compCopy.groupedItems = [];
      }
      if (!Array.isArray(compCopy.items)) {
        compCopy.items = [];
      }
      if (!compCopy.title) {
        compCopy.title = compCopy.label || key;
      }
      if (!compCopy.toolbarGroup) {
        compCopy.toolbarGroup = key;
      }
    }

    if (compCopy.type === "ribbonGroup" && !Array.isArray(compCopy.items)) {
      compCopy.items = [];
    }

    if (compCopy.type === "groupedItems" && !Array.isArray(compCopy.items)) {
      compCopy.items = [];
    }

    sanitizedComponents[key] = compCopy;
  }

  // Ensure child items of components point to valid components
  for (const [key, comp] of Object.entries(sanitizedComponents)) {
    if (Array.isArray(comp.items)) {
      comp.items = comp.items.filter((itemKey) => {
        return itemKey === "divider" || !!sanitizedComponents[itemKey];
      });
    }
    if (Array.isArray(comp.groupedItems)) {
      comp.groupedItems = comp.groupedItems.filter((itemKey) => {
        return !!sanitizedComponents[itemKey];
      });
    }
  }

  // 2. Sanitize headers
  const sanitizedHeaders = {};
  for (const [key, value] of Object.entries(rawConfig.modularHeaders || {})) {
    if (!value || typeof value !== "object") continue;
    const lowerKey = String(key).toLowerCase();
    if (lowerKey === "view" || lowerKey === "toolbargroup-view") continue;

    const headerCopy = { ...value, dataElement: value.dataElement || key };
    if (
      headerCopy.placement &&
      !allowedPlacements.has(String(headerCopy.placement).toLowerCase())
    ) {
      headerCopy.placement = "top";
    }

    if (!Array.isArray(headerCopy.items)) {
      headerCopy.items = [];
    } else {
      // Filter out any items that are not in sanitizedComponents (unless divider)
      headerCopy.items = headerCopy.items.filter((itemKey) => {
        return itemKey === "divider" || !!sanitizedComponents[itemKey];
      });
    }

    sanitizedHeaders[key] = headerCopy;
  }

  // 3. Sanitize panels
  const sanitizedPanels = {};
  for (const [key, value] of Object.entries(rawConfig.panels || {})) {
    if (!value || typeof value !== "object") continue;
    const location =
      String(value.location).toLowerCase() === "right" ? "right" : "left";
    const rawRender = value.render || key;
    const render = rawRender === "outlinePanel" ? "outlinesPanel" : rawRender;
    const dataElement =
      (value.dataElement || key) === "outlinePanel"
        ? "outlinesPanel"
        : value.dataElement || key;
    const panelKey = key === "outlinePanel" ? "outlinesPanel" : key;
    sanitizedPanels[panelKey] = {
      ...value,
      dataElement,
      location,
      render,
    };
  }

  return {
    ...rawConfig,
    modularComponents: sanitizedComponents,
    modularHeaders: sanitizedHeaders,
    panels: sanitizedPanels,
  };
}

export default function ModularUIBuilder() {
  const [config, setConfig] = useState({
    modularComponents: {},
    modularHeaders: {},
    panels: {},
    flyouts: {},
  });

  const [activeHeader, setActiveHeader] = useState("default-top-header");
  const [selectedRibbonTab, setSelectedRibbonTab] = useState("");
  const [autoApply, setAutoApply] = useState(true);
  const [builderTab, setBuilderTab] = useState("toolbars"); // "toolbars" | "panels"

  // Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalInitialTab, setModalInitialTab] = useState("tool");
  const [modalInitialLocation, setModalInitialLocation] = useState(null);

  // Keep a pristine backup of WebViewer's default UI configuration on mount
  const defaultConfigRef = useRef(null);
  const fileInputRef = useRef(null);
  const isInitialMount = useRef(true);

  // 1. Mount: Load default modular UI from running viewer
  useEffect(() => {
    if (window.viewerInstance && window.viewerInstance.UI) {
      try {
        const exported = window.viewerInstance.UI.exportModularComponents();
        if (exported && exported.modularHeaders) {
          defaultConfigRef.current = JSON.parse(JSON.stringify(exported));
          setConfig(exported);

          const headerKeys = Object.keys(exported.modularHeaders);
          if (headerKeys.length > 0) {
            setActiveHeader(headerKeys[0]);
          }
        }
      } catch (err) {
        console.warn(
          "Could not export initial WebViewer modular components:",
          err,
        );
      }
    }
  }, []);

  // 2. Auto-Apply effect: When config changes and autoApply is enabled, sync to WebViewer
  const applyConfigToViewer = useCallback((cfgToApply) => {
    if (!window.viewerInstance || !window.viewerInstance.UI) return;
    try {
      const sanitized = sanitizeConfigForImport(cfgToApply);
      window.viewerInstance.UI.importModularComponents(sanitized, {});
    } catch (err) {
      console.error("Failed to apply configuration to WebViewer:", err.message);
    }
  }, []);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (autoApply) {
      const timer = setTimeout(() => {
        applyConfigToViewer(config);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [config, autoApply, applyConfigToViewer]);

  // Keep active header valid
  useEffect(() => {
    const headerKeys = Object.keys(config.modularHeaders || {});
    if (headerKeys.length > 0 && !config.modularHeaders[activeHeader]) {
      setActiveHeader(headerKeys[0]);
    }
  }, [config.modularHeaders, activeHeader]);

  // Helper: Extract ribbon tabs belonging to active header
  const getRibbonTabs = useCallback(() => {
    if (!activeHeader || !config.modularHeaders[activeHeader]) return [];
    const headerItems = config.modularHeaders[activeHeader].items || [];
    const tabs = [];

    // Find ribbon group component in this header
    for (const itemKey of headerItems) {
      const comp = config.modularComponents[itemKey];
      if (comp?.type === "ribbonGroup" || itemKey === "default-ribbon-group") {
        const groupItems = Array.isArray(comp?.items) ? comp.items : [];
        for (const tabItem of groupItems) {
          const tabKey =
            typeof tabItem === "string" ? tabItem : tabItem?.dataElement;
          if (!tabKey) continue;
          const tabComp = config.modularComponents[tabKey] || tabItem;
          tabs.push({
            key: tabKey,
            label: tabComp?.label || tabComp?.title || tabKey,
            component: tabComp,
          });
        }
      } else if (comp?.type === "ribbonItem") {
        tabs.push({
          key: itemKey,
          label: comp.label || comp.title || itemKey,
          component: comp,
        });
      }
    }

    // Also include any top-level ribbon items in modularComponents if no ribbon group was explicitly defined
    if (tabs.length === 0) {
      for (const [key, comp] of Object.entries(
        config.modularComponents || {},
      )) {
        if (comp?.type === "ribbonItem") {
          tabs.push({
            key,
            label: comp.label || comp.title || key,
            component: comp,
          });
        }
      }
    }

    return tabs;
  }, [activeHeader, config]);

  const ribbonTabs = getRibbonTabs();

  // Set default selected ribbon tab if current is invalid
  useEffect(() => {
    if (ribbonTabs.length > 0) {
      if (
        !selectedRibbonTab ||
        !ribbonTabs.some((t) => t.key === selectedRibbonTab)
      ) {
        setSelectedRibbonTab(ribbonTabs[0].key);
      }
    } else {
      setSelectedRibbonTab("");
    }
  }, [ribbonTabs, selectedRibbonTab]);

  const handleSelectRibbonTab = useCallback((tabKey) => {
    setSelectedRibbonTab(tabKey);
    if (window.viewerInstance && window.viewerInstance.UI) {
      try {
        if (
          typeof window.viewerInstance.UI.setActiveRibbonItem === "function"
        ) {
          window.viewerInstance.UI.setActiveRibbonItem(tabKey);
        } else if (
          typeof window.viewerInstance.UI.setToolbarGroup === "function"
        ) {
          window.viewerInstance.UI.setToolbarGroup(tabKey);
        }
      } catch (err) {
        console.warn("Could not set active ribbon tab in WebViewer:", err);
      }
    }
  }, []);

  // Helper: Extract tools inside the active ribbon tab
  const getToolsInActiveRibbon = useCallback(() => {
    if (!selectedRibbonTab) return [];
    const tabComp = config.modularComponents[selectedRibbonTab];
    if (!tabComp) return [];

    const toolKeys = [];

    // Check direct items array
    if (Array.isArray(tabComp.items)) {
      toolKeys.push(...tabComp.items);
    }

    // Check groupedItems sub-containers (e.g. annotateGroupedItems, customGroupedItems)
    if (Array.isArray(tabComp.groupedItems)) {
      for (const groupKey of tabComp.groupedItems) {
        const groupComp = config.modularComponents[groupKey];
        if (groupComp && Array.isArray(groupComp.items)) {
          for (const subItemKey of groupComp.items) {
            const subComp = config.modularComponents[subItemKey];
            if (
              subComp &&
              subComp.type === "groupedItems" &&
              Array.isArray(subComp.items)
            ) {
              toolKeys.push(...subComp.items);
            } else {
              toolKeys.push(subItemKey);
            }
          }
        } else if (groupKey) {
          toolKeys.push(groupKey);
        }
      }
    }

    // Map keys to tree items
    const result = [];
    const visited = new Set();
    for (const key of toolKeys) {
      const itemKey = typeof key === "string" ? key : key?.dataElement;
      if (!itemKey || visited.has(itemKey)) continue;
      visited.add(itemKey);

      const comp = config.modularComponents[itemKey] || {
        type: "toolButton",
        dataElement: itemKey,
        toolName: itemKey,
      };

      result.push({
        key: itemKey,
        component: comp,
      });
    }

    return result;
  }, [selectedRibbonTab, config.modularComponents]);

  // Helper: Extract direct header items (controls not inside a ribbon tab)
  const getDirectHeaderItems = useCallback(() => {
    if (!activeHeader || !config.modularHeaders[activeHeader]) return [];
    const items = config.modularHeaders[activeHeader].items || [];
    const result = [];

    for (const itemKey of items) {
      if (!itemKey) continue;
      const comp = config.modularComponents[itemKey] || {
        type: itemKey.toLowerCase().includes("page") ? "pageControls" : "item",
        dataElement: itemKey,
      };

      // Exclude ribbon groups from the direct tools list
      if (comp.type === "ribbonGroup" || itemKey === "default-ribbon-group") {
        continue;
      }

      result.push({
        key: itemKey,
        component: comp,
      });
    }

    return result;
  }, [activeHeader, config]);

  // --- ACTIONS ---

  // 1. Reset to Blank (Remove all UI)
  const resetToBlank = () => {
    if (
      window.confirm(
        "Remove the entire WebViewer UI? This gives you a blank canvas to build custom headers and controls from scratch.",
      )
    ) {
      const blank = JSON.parse(JSON.stringify(DEFAULT_BLANK_CONFIG));
      setConfig(blank);
      setActiveHeader("");
      setSelectedRibbonTab("");
      applyConfigToViewer(blank);
    }
  };

  // 2. Restore Default WebViewer UI
  const restoreDefault = () => {
    if (defaultConfigRef.current) {
      const restored = JSON.parse(JSON.stringify(defaultConfigRef.current));
      setConfig(restored);
      const keys = Object.keys(restored.modularHeaders || {});
      if (keys.length > 0) setActiveHeader(keys[0]);
      applyConfigToViewer(restored);
    } else if (window.viewerInstance?.UI) {
      try {
        const fresh = window.viewerInstance.UI.exportModularComponents();
        setConfig(fresh);
        applyConfigToViewer(fresh);
      } catch (err) {
        console.error("Could not export default UI:", err);
      }
    }
  };

  // 3. Add Header
  const handleAddHeader = (headerDef) => {
    setConfig((prev) => {
      const nextHeaders = {
        ...prev.modularHeaders,
        [headerDef.dataElement]: headerDef,
      };
      return { ...prev, modularHeaders: nextHeaders };
    });
    setActiveHeader(headerDef.dataElement);
  };

  // 4. Delete Header
  const handleDeleteHeader = (headerKey) => {
    setConfig((prev) => {
      const nextHeaders = { ...prev.modularHeaders };
      delete nextHeaders[headerKey];
      return { ...prev, modularHeaders: nextHeaders };
    });
  };

  // 5. Add Component to Header or Ribbon Tab
  const handleAddComponent = ({ target, componentType, component }) => {
    const { headerKey, targetLocationType, ribbonTabKey } = target;
    const compKey = component.dataElement;

    setConfig((prev) => {
      const modularComponents = { ...prev.modularComponents };
      const modularHeaders = { ...prev.modularHeaders };

      // Ensure component definition exists
      modularComponents[compKey] = component;

      // Ensure destination header exists
      if (!modularHeaders[headerKey]) {
        modularHeaders[headerKey] = {
          dataElement: headerKey,
          placement: "top",
          items: [],
        };
      }
      const headerObj = { ...modularHeaders[headerKey] };
      headerObj.items = Array.isArray(headerObj.items)
        ? [...headerObj.items]
        : [];

      if (componentType === "ribbonItem") {
        const cleanName = compKey.replace(/^toolbarGroup-/, "");
        const groupContainerKey =
          (Array.isArray(component.groupedItems) &&
            component.groupedItems.length > 0 &&
            component.groupedItems[0]) ||
          `${cleanName.charAt(0).toLowerCase()}${cleanName.slice(1)}GroupedItems`;

        // 1. Ensure groupedItems container exists in modularComponents
        if (!modularComponents[groupContainerKey]) {
          modularComponents[groupContainerKey] = {
            type: "groupedItems",
            dataElement: groupContainerKey,
            items: [],
            gap: 12,
            grow: 0,
            justifyContent: "center",
            alwaysVisible: false,
          };
        }

        // 2. Ensure ribbonItem points to this container
        modularComponents[compKey] = {
          items: [],
          ...component,
          type: "ribbonItem",
          dataElement: compKey,
          toolbarGroup: component.toolbarGroup || compKey,
          title: component.title || component.label || compKey,
          label: component.label || component.title || compKey,
          groupedItems: [groupContainerKey],
        };

        // 3. Ensure the container is registered in tools-header so WebViewer renders its tools
        if (!modularHeaders["tools-header"]) {
          modularHeaders["tools-header"] = {
            dataElement: "tools-header",
            placement: "top",
            justifyContent: "center",
            grow: 0,
            gap: 12,
            position: "end",
            items: [groupContainerKey],
          };
        } else {
          const toolsHeader = { ...modularHeaders["tools-header"] };
          const thItems = Array.isArray(toolsHeader.items)
            ? [...toolsHeader.items]
            : [];
          if (!thItems.includes(groupContainerKey)) {
            thItems.push(groupContainerKey);
          }
          toolsHeader.items = thItems;
          modularHeaders["tools-header"] = toolsHeader;
        }

        // 4. Add ribbon tab to ribbon group in the target header
        let ribbonGroupKey = headerObj.items.find((k) => {
          const c = modularComponents[k];
          return c?.type === "ribbonGroup" || k === "default-ribbon-group";
        });

        if (!ribbonGroupKey) {
          ribbonGroupKey = "ribbon-group-" + headerKey;
          modularComponents[ribbonGroupKey] = {
            type: "ribbonGroup",
            dataElement: ribbonGroupKey,
            items: [compKey],
          };
          headerObj.items.push(ribbonGroupKey);
        } else {
          const groupComp = { ...modularComponents[ribbonGroupKey] };
          groupComp.items = Array.isArray(groupComp.items)
            ? [...groupComp.items]
            : [];
          if (!groupComp.items.includes(compKey)) {
            groupComp.items.push(compKey);
          }
          modularComponents[ribbonGroupKey] = groupComp;
        }

        modularHeaders[headerKey] = headerObj;
        setSelectedRibbonTab(compKey);
        return { ...prev, modularComponents, modularHeaders };
      }

      if (
        targetLocationType === "ribbon" &&
        ribbonTabKey &&
        modularComponents[ribbonTabKey]
      ) {
        // Add to active ribbon tab
        const tabComp = { ...modularComponents[ribbonTabKey] };
        let groupContainerKey =
          Array.isArray(tabComp.groupedItems) && tabComp.groupedItems.length > 0
            ? tabComp.groupedItems[0]
            : null;

        // Auto-create container if tab does not have one
        if (!groupContainerKey) {
          const cleanName = ribbonTabKey.replace(/^toolbarGroup-/, "");
          groupContainerKey = `${cleanName.charAt(0).toLowerCase()}${cleanName.slice(1)}GroupedItems`;
          tabComp.groupedItems = [groupContainerKey];
          modularComponents[ribbonTabKey] = tabComp;
        }

        // Ensure container component exists in modularComponents
        const groupComp = modularComponents[groupContainerKey] || {
          type: "groupedItems",
          dataElement: groupContainerKey,
          items: [],
          gap: 12,
          grow: 0,
          justifyContent: "center",
          alwaysVisible: false,
        };

        const nextItems = Array.isArray(groupComp.items)
          ? [...groupComp.items]
          : [];
        if (!nextItems.includes(compKey)) {
          nextItems.push(compKey);
        }
        modularComponents[groupContainerKey] = {
          ...groupComp,
          items: nextItems,
        };

        // Ensure groupContainerKey is in tools-header so WebViewer renders it
        if (!modularHeaders["tools-header"]) {
          modularHeaders["tools-header"] = {
            dataElement: "tools-header",
            placement: "top",
            justifyContent: "center",
            grow: 0,
            gap: 12,
            position: "end",
            items: [groupContainerKey],
          };
        } else {
          const toolsHeader = { ...modularHeaders["tools-header"] };
          const thItems = Array.isArray(toolsHeader.items)
            ? [...toolsHeader.items]
            : [];
          if (!thItems.includes(groupContainerKey)) {
            thItems.push(groupContainerKey);
          }
          toolsHeader.items = thItems;
          modularHeaders["tools-header"] = toolsHeader;
        }
      } else {
        // Add directly to header
        if (!headerObj.items.includes(compKey)) {
          headerObj.items.push(compKey);
        }
      }

      modularHeaders[headerKey] = headerObj;
      return { ...prev, modularComponents, modularHeaders };
    });
  };

  // 6. Delete Component
  const handleDeleteTool = (itemKey, targetContext = {}) => {
    setConfig((prev) => {
      const modularComponents = { ...prev.modularComponents };
      const modularHeaders = { ...prev.modularHeaders };

      const targetComp = modularComponents[itemKey];
      const associatedGroupedItems =
        targetComp?.type === "ribbonItem" &&
        Array.isArray(targetComp?.groupedItems)
          ? [...targetComp.groupedItems]
          : [];

      // Delete from modularComponents
      delete modularComponents[itemKey];
      for (const gKey of associatedGroupedItems) {
        delete modularComponents[gKey];
      }

      // Remove from header items (including tools-header)
      for (const [hKey, hConfig] of Object.entries(modularHeaders)) {
        if (Array.isArray(hConfig?.items)) {
          modularHeaders[hKey] = {
            ...hConfig,
            items: hConfig.items.filter(
              (k) => k !== itemKey && !associatedGroupedItems.includes(k),
            ),
          };
        }
      }

      // Remove from ribbon tabs and groupedItems
      for (const [compKey, comp] of Object.entries(modularComponents)) {
        if (Array.isArray(comp?.items) && comp.items.includes(itemKey)) {
          modularComponents[compKey] = {
            ...comp,
            items: comp.items.filter((k) => k !== itemKey),
          };
        }
        if (
          Array.isArray(comp?.groupedItems) &&
          comp.groupedItems.includes(itemKey)
        ) {
          modularComponents[compKey] = {
            ...comp,
            groupedItems: comp.groupedItems.filter((k) => k !== itemKey),
          };
        }
      }

      return { ...prev, modularComponents, modularHeaders };
    });
  };

  // 7. Reorder Item (Up/Down)
  const handleMoveItem = (item, direction, targetContext = {}) => {
    const itemKey = item.key;
    const { type, ribbonKey, headerKey } = targetContext;

    setConfig((prev) => {
      const modularComponents = { ...prev.modularComponents };
      const modularHeaders = { ...prev.modularHeaders };

      const moveInArray = (arr) => {
        const list = [...arr];
        const idx = list.indexOf(itemKey);
        if (idx < 0) return null;
        const targetIdx = idx + direction;
        if (targetIdx < 0 || targetIdx >= list.length) return null;
        list.splice(idx, 1);
        list.splice(targetIdx, 0, itemKey);
        return list;
      };

      if (type === "header" && headerKey && modularHeaders[headerKey]) {
        const headerObj = modularHeaders[headerKey];
        const nextItems = moveInArray(headerObj.items || []);
        if (nextItems) {
          modularHeaders[headerKey] = { ...headerObj, items: nextItems };
        }
        return { ...prev, modularHeaders };
      }

      if (type === "ribbon" && ribbonKey && modularComponents[ribbonKey]) {
        const tabComp = modularComponents[ribbonKey];
        if (
          Array.isArray(tabComp.groupedItems) &&
          tabComp.groupedItems.length > 0
        ) {
          const groupKey = tabComp.groupedItems[0];
          const groupComp = modularComponents[groupKey];
          if (groupComp && Array.isArray(groupComp.items)) {
            if (groupComp.items.includes(itemKey)) {
              const nextItems = moveInArray(groupComp.items);
              if (nextItems) {
                modularComponents[groupKey] = {
                  ...groupComp,
                  items: nextItems,
                };
              }
            } else {
              for (const subKey of groupComp.items) {
                const subComp = modularComponents[subKey];
                if (
                  subComp &&
                  subComp.type === "groupedItems" &&
                  Array.isArray(subComp.items) &&
                  subComp.items.includes(itemKey)
                ) {
                  const nextSubItems = moveInArray(subComp.items);
                  if (nextSubItems) {
                    modularComponents[subKey] = {
                      ...subComp,
                      items: nextSubItems,
                    };
                  }
                  break;
                }
              }
            }
          }
        } else if (Array.isArray(tabComp.items)) {
          const nextItems = moveInArray(tabComp.items);
          if (nextItems) {
            modularComponents[ribbonKey] = { ...tabComp, items: nextItems };
          }
        }
        return { ...prev, modularComponents };
      }

      return prev;
    });
  };

  // 8. Side Panels Manager handlers
  const handleTogglePanel = (panelId, render, location, enabled) => {
    setConfig((prev) => {
      const nextPanels = { ...prev.panels };
      if (enabled) {
        nextPanels[panelId] = {
          dataElement: panelId,
          location: location || "left",
          render: render || panelId,
        };
      } else {
        delete nextPanels[panelId];
      }
      return { ...prev, panels: nextPanels };
    });
  };

  const handleChangePanelLocation = (panelId, newLocation) => {
    setConfig((prev) => {
      if (!prev.panels[panelId]) return prev;
      return {
        ...prev,
        panels: {
          ...prev.panels,
          [panelId]: {
            ...prev.panels[panelId],
            location: newLocation,
          },
        },
      };
    });
  };

  const handleAddToggleToHeader = ({ panelId, label, title, icon }) => {
    if (!activeHeader) {
      alert("Please select or create an active header first.");
      return;
    }
    const toggleKey = `${panelId}Toggle`;
    handleAddComponent({
      target: {
        headerKey: activeHeader,
        targetLocationType: "header",
      },
      componentType: "toggleButton",
      component: {
        type: "toggleButton",
        dataElement: toggleKey,
        toggleElement: panelId,
        label,
        title,
        img: icon,
      },
    });
  };

  // 9. Export & Import JSON
  const handleExportJSON = () => {
    download("webviewer-ui-config.json", JSON.stringify(config, null, 2));
  };

  const handleImportFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        setConfig(parsed);
        const headerKeys = Object.keys(parsed.modularHeaders || {});
        if (headerKeys.length > 0) setActiveHeader(headerKeys[0]);
        applyConfigToViewer(parsed);
      } catch (err) {
        alert("Invalid JSON configuration file: " + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Open Add Modal
  const openAddModal = (tabName = "tool", targetLocation = null) => {
    setModalInitialTab(tabName);
    setModalInitialLocation(targetLocation);
    setIsAddModalOpen(true);
  };

  const activePanelsCount = Object.keys(config.panels || {}).length;

  return (
    <div className="ModularUIBuilder">
      <h3>Modular UI Designer</h3>

      {/* QUICK STARTERS BAR */}
      <div className="quick-bar-row">
        <button
          className="quick-btn danger"
          onClick={resetToBlank}
          title="Remove all headers, toolbars, and panels for a blank canvas"
        >
          🗑️ Reset to Blank
        </button>
        <button
          className="quick-btn"
          onClick={restoreDefault}
          title="Restore standard full WebViewer UI"
        >
          🔄 Restore Default
        </button>
      </div>

      <div style={{ marginTop: 8, marginBottom: 10 }}>
        <label className="auto-apply-label">
          <input
            type="checkbox"
            checked={autoApply}
            onChange={(e) => setAutoApply(e.target.checked)}
          />
          ⚡ Auto-apply live changes to WebViewer
        </label>
      </div>

      {/* BUILDER NAVIGATION TABS */}
      <div className="builder-tabs-nav">
        <button
          type="button"
          className={`builder-tab-btn ${builderTab === "toolbars" ? "active" : ""}`}
          onClick={() => setBuilderTab("toolbars")}
        >
          <span>🛠️ Toolbars & Ribbon</span>
        </button>
        <button
          type="button"
          className={`builder-tab-btn ${builderTab === "panels" ? "active" : ""}`}
          onClick={() => setBuilderTab("panels")}
        >
          <span>📑 Side Panels</span>
          {activePanelsCount > 0 && (
            <span className="builder-tab-badge">{activePanelsCount}</span>
          )}
        </button>
      </div>

      {/* 1. TOOLBARS & RIBBON TAB CONTENT */}
      {builderTab === "toolbars" && (
        <div className="builder-tab-content">
          <section>
            <HeaderManager
              headers={config.modularHeaders || {}}
              activeHeader={activeHeader}
              onSelectHeader={setActiveHeader}
              onAddHeader={handleAddHeader}
              onDeleteHeader={handleDeleteHeader}
            />
          </section>

          {activeHeader && config.modularHeaders[activeHeader] && (
            <section>
              <ToolButtonsCategorized
                activeHeader={activeHeader}
                headerPlacement={
                  config.modularHeaders[activeHeader]?.placement || "top"
                }
                ribbonTabs={ribbonTabs}
                selectedRibbonTab={selectedRibbonTab}
                onSelectRibbonTab={handleSelectRibbonTab}
                ribbonTools={getToolsInActiveRibbon()}
                directHeaderItems={getDirectHeaderItems()}
                onDeleteTool={handleDeleteTool}
                onMoveItem={handleMoveItem}
                onOpenAddModal={openAddModal}
              />
            </section>
          )}
        </div>
      )}

      {/* 2. SIDE PANELS TAB CONTENT */}
      {builderTab === "panels" && (
        <div className="builder-tab-content">
          <section>
            <PanelManager
              panels={config.panels || {}}
              onTogglePanel={handleTogglePanel}
              onChangePanelLocation={handleChangePanelLocation}
              onAddToggleToHeader={handleAddToggleToHeader}
            />
          </section>
        </div>
      )}

      {/* 3. ACTIONS BAR (ALWAYS VISIBLE) */}
      <div className="action-buttons">
        <button
          className="primary-button"
          onClick={() => applyConfigToViewer(config)}
        >
          Apply to Viewer
        </button>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="secondary-button"
            style={{ flex: 1 }}
            onClick={handleExportJSON}
          >
            Export JSON
          </button>
          <button
            className="secondary-button"
            style={{ flex: 1 }}
            onClick={() => fileInputRef.current?.click()}
          >
            Import JSON
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            onChange={handleImportFile}
            hidden
          />
        </div>
      </div>

      {/* 5. CONFIG PREVIEW */}
      <section style={{ marginTop: 16 }}>
        <h4>Current Config Preview</h4>
        <ConfigPreview config={config} />
      </section>

      {/* ADD COMPONENT MODAL */}
      <AddComponentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        initialTab={modalInitialTab}
        initialLocation={modalInitialLocation}
        headerOptions={Object.keys(config.modularHeaders || {})}
        activeHeader={activeHeader}
        ribbonTabs={ribbonTabs}
        activeRibbonTab={selectedRibbonTab}
        panels={config.panels || {}}
        onAddComponent={handleAddComponent}
      />
    </div>
  );
}
