import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from 'react';
import ToolButtonsCategorized from './components/ToolButtonsCategorized';
import HeaderManager from './components/HeaderManager';
import AddComponentModal from './components/AddComponentModal';
import PopupsManager from './components/PopupsManager';
import ConfigPreview from './components/ConfigPreview';
import {
  DEFAULT_BLANK_CONFIG,
  DEFAULT_POPUPS,
} from './constants/webviewerCatalog';
import { buildFunctionMap, prepareConfigForImport } from './sdk/importConfig';

function download(filename, content) {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ModularUIBuilder() {
  const [config, setConfig] = useState({
    modularComponents: {},
    modularHeaders: {},
    panels: {},
    flyouts: {},
    popups: DEFAULT_POPUPS,
  });

  const [activeSection, setActiveSection] = useState('headers');
  const [activeHeader, setActiveHeader] = useState('default-top-header');
  const [selectedRibbonTab, setSelectedRibbonTab] = useState('');
  const [headerSubView, setHeaderSubView] = useState('header');
  const [activeFlyout, setActiveFlyout] = useState('');
  const [activePopup, setActivePopup] = useState('annotationPopup');
  const [autoApply, setAutoApply] = useState(true);
  // Items the SDK guardrails removed/adjusted on the last apply (from prepareConfigForImport)
  const [importWarnings, setImportWarnings] = useState([]);

  // Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalInitialTab, setModalInitialTab] = useState('tool');
  const [modalInitialLocation, setModalInitialLocation] = useState(null);
  const [modalInitialFlyout, setModalInitialFlyout] = useState(null);
  const [modalInitialPopup, setModalInitialPopup] = useState(null);

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
          'Could not export initial WebViewer modular components:',
          err,
        );
      }
    }
  }, []);

  // 2. Auto-Apply effect: When config changes and autoApply is enabled, sync to WebViewer
  const applyConfigToViewer = useCallback((cfgToApply) => {
    if (!window.viewerInstance || !window.viewerInstance.UI) return;
    try {
      const { config: sanitized, warnings } =
        prepareConfigForImport(cfgToApply);
      const functionMap = buildFunctionMap(sanitized, window.viewerInstance);
      warnings.forEach((w) => console.warn(`prepareConfigForImport: ${w}`));
      setImportWarnings(warnings);
      window.viewerInstance.UI.importModularComponents(sanitized, functionMap);
    } catch (err) {
      console.error('Failed to apply configuration to WebViewer:', err.message);
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

  // Keep active header valid (excluding internal tools-header)
  useEffect(() => {
    const userHeaderKeys = Object.keys(config.modularHeaders || {}).filter(
      (k) => k !== 'tools-header',
    );
    if (userHeaderKeys.length > 0) {
      if (
        !activeHeader ||
        activeHeader === 'tools-header' ||
        !config.modularHeaders[activeHeader]
      ) {
        setActiveHeader(userHeaderKeys[0]);
      }
    } else {
      setActiveHeader('');
    }
  }, [config.modularHeaders, activeHeader]);

  // Keep active flyout valid
  useEffect(() => {
    const flyoutKeys = Object.keys(config.flyouts || {});
    if (flyoutKeys.length > 0) {
      if (!activeFlyout || !config.flyouts[activeFlyout]) {
        setActiveFlyout(flyoutKeys[0]);
      }
    } else {
      setActiveFlyout('');
    }
  }, [config.flyouts, activeFlyout]);

  // Helper: Extract ribbon tabs belonging to a specific header
  const getRibbonTabsForHeader = useCallback(
    (headerKey) => {
      if (!headerKey || !config.modularHeaders?.[headerKey]) return [];
      const headerItems = config.modularHeaders[headerKey].items || [];
      const tabs = [];

      // Find ribbon group component in this header
      for (const itemKey of headerItems) {
        const comp = config.modularComponents?.[itemKey];
        if (
          comp?.type === 'ribbonGroup' ||
          itemKey === 'default-ribbon-group'
        ) {
          const groupItems = Array.isArray(comp?.items) ? comp.items : [];
          for (const tabItem of groupItems) {
            const tabKey =
              typeof tabItem === 'string' ? tabItem : tabItem?.dataElement;
            if (!tabKey) continue;
            const tabComp = config.modularComponents?.[tabKey] || tabItem;
            tabs.push({
              key: tabKey,
              label: tabComp?.label || tabComp?.title || tabKey,
              component: tabComp,
            });
          }
        } else if (comp?.type === 'ribbonItem') {
          tabs.push({
            key: itemKey,
            label: comp.label || comp.title || itemKey,
            component: comp,
          });
        }
      }

      return tabs;
    },
    [config],
  );

  const ribbonTabs = useMemo(
    () => getRibbonTabsForHeader(activeHeader),
    [getRibbonTabsForHeader, activeHeader],
  );

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
      setSelectedRibbonTab('');
    }
  }, [ribbonTabs, selectedRibbonTab]);

  // Default to header items if active header has no ribbon tabs
  useEffect(() => {
    if (ribbonTabs.length === 0) {
      setHeaderSubView('header');
    }
  }, [ribbonTabs.length]);

  const handleSelectRibbonTab = useCallback((tabKey) => {
    setSelectedRibbonTab(tabKey);
    if (window.viewerInstance && window.viewerInstance.UI) {
      try {
        if (
          typeof window.viewerInstance.UI.setActiveRibbonItem === 'function'
        ) {
          window.viewerInstance.UI.setActiveRibbonItem(tabKey);
        } else if (
          typeof window.viewerInstance.UI.setToolbarGroup === 'function'
        ) {
          window.viewerInstance.UI.setToolbarGroup(tabKey);
        }
      } catch (err) {
        console.warn('Could not set active ribbon tab in WebViewer:', err);
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
              subComp.type === 'groupedItems' &&
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

    // Map keys to tree items (preserve duplicate occurrences such as multiple dividers)
    const result = [];
    for (const key of toolKeys) {
      const itemKey = typeof key === 'string' ? key : key?.dataElement;
      if (!itemKey) continue;

      const comp =
        config.modularComponents[itemKey] ||
        (itemKey === 'divider'
          ? { type: 'divider', dataElement: 'divider' }
          : {
              type: 'toolButton',
              dataElement: itemKey,
              toolName: itemKey,
            });

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
        type: itemKey.toLowerCase().includes('page') ? 'pageControls' : 'item',
        dataElement: itemKey,
      };

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
    const blank = JSON.parse(JSON.stringify(DEFAULT_BLANK_CONFIG));
    setConfig(blank);
    setActiveHeader('');
    setSelectedRibbonTab('');
    applyConfigToViewer(blank);
  };

  // 2. Restore Default WebViewer UI
  const restoreDefault = () => {
    if (defaultConfigRef.current) {
      const restored = JSON.parse(JSON.stringify(defaultConfigRef.current));
      setConfig(restored);
      const keys = Object.keys(restored.modularHeaders || {}).filter(
        (k) => k !== 'tools-header',
      );
      if (keys.length > 0) setActiveHeader(keys[0]);
      applyConfigToViewer(restored);
    } else if (window.viewerInstance?.UI) {
      try {
        const fresh = window.viewerInstance.UI.exportModularComponents();
        setConfig(fresh);
        applyConfigToViewer(fresh);
      } catch (err) {
        console.error('Could not export default UI:', err);
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

  // 4b. Delete Ribbon Tab (RibbonItem)
  const handleDeleteRibbonTab = (ribbonKey) => {
    setConfig((prev) => {
      const nextComponents = { ...prev.modularComponents };
      const nextHeaders = { ...prev.modularHeaders };

      const tabComp = nextComponents[ribbonKey];
      const associatedGroupedItems =
        tabComp && Array.isArray(tabComp.groupedItems)
          ? [...tabComp.groupedItems]
          : [];

      // Clean up groupedItems containers belonging to this ribbon tab
      for (const groupKey of associatedGroupedItems) {
        delete nextComponents[groupKey];
      }
      delete nextComponents[ribbonKey];

      // Clean up tools-header
      if (
        nextHeaders['tools-header'] &&
        Array.isArray(nextHeaders['tools-header'].items)
      ) {
        const filteredTh = nextHeaders['tools-header'].items.filter(
          (k) => !associatedGroupedItems.includes(k),
        );
        if (filteredTh.length === 0) {
          delete nextHeaders['tools-header'];
        } else {
          nextHeaders['tools-header'] = {
            ...nextHeaders['tools-header'],
            items: filteredTh,
          };
        }
      }

      // Remove from any ribbonGroup.items in modularComponents
      const emptyRibbonGroups = new Set();
      for (const [k, comp] of Object.entries(nextComponents)) {
        if (comp?.type === 'ribbonGroup' && Array.isArray(comp.items)) {
          const filtered = comp.items.filter((item) => {
            const id = typeof item === 'string' ? item : item?.dataElement;
            return id !== ribbonKey;
          });
          if (filtered.length !== comp.items.length) {
            nextComponents[k] = { ...comp, items: filtered };
          }
          if (filtered.length === 0) {
            emptyRibbonGroups.add(k);
          }
        }
      }

      // Auto-clean empty RibbonGroups
      for (const emptyGroupKey of emptyRibbonGroups) {
        delete nextComponents[emptyGroupKey];
        for (const [hKey, hConfig] of Object.entries(nextHeaders)) {
          if (
            Array.isArray(hConfig.items) &&
            hConfig.items.includes(emptyGroupKey)
          ) {
            nextHeaders[hKey] = {
              ...hConfig,
              items: hConfig.items.filter((id) => id !== emptyGroupKey),
            };
          }
        }
      }

      // Also remove if referenced directly in any header's items
      for (const [hKey, hConfig] of Object.entries(nextHeaders)) {
        if (Array.isArray(hConfig.items) && hConfig.items.includes(ribbonKey)) {
          nextHeaders[hKey] = {
            ...hConfig,
            items: hConfig.items.filter((id) => id !== ribbonKey),
          };
        }
      }

      return {
        ...prev,
        modularComponents: nextComponents,
        modularHeaders: nextHeaders,
      };
    });
  };

  // 5. Add Component to Header or Ribbon Tab
  const handleAddComponent = ({ target, componentType, component }) => {
    const { headerKey, targetLocationType, ribbonTabKey, popupKey } = target;
    const compKey = component.dataElement;

    setConfig((prev) => {
      const modularComponents = { ...prev.modularComponents };
      const modularHeaders = { ...prev.modularHeaders };
      const nextFlyouts = { ...prev.flyouts };
      const nextPopups = { ...prev.popups };

      if (targetLocationType === 'popup' && popupKey) {
        const currentPopupList = Array.isArray(nextPopups[popupKey])
          ? [...nextPopups[popupKey]]
          : (DEFAULT_POPUPS[popupKey] || []).map((i) => ({ ...i }));

        const popupItem =
          componentType !== 'popupAction'
            ? { ...component, dataElement: compKey }
            : { dataElement: compKey };

        currentPopupList.push(popupItem);
        nextPopups[popupKey] = currentPopupList;

        const nextPanels = { ...prev.panels };
        if (
          (componentType === 'toggleButton' ||
            component.type === 'toggleButton') &&
          (component.toggleElement || component.element)
        ) {
          const panelId = component.toggleElement || component.element;
          const catalogDef = PANELS_CATALOG.find((p) => p.id === panelId);
          if (catalogDef && !nextPanels[panelId]) {
            nextPanels[panelId] = {
              dataElement: panelId,
              location: catalogDef?.defaultLocation || 'left',
              render: catalogDef?.render || panelId,
            };
          }
        }

        return {
          ...prev,
          popups: nextPopups,
          panels: nextPanels,
        };
      }

      const isFlyoutDivider =
        targetLocationType === 'flyout' &&
        target.flyoutKey &&
        (componentType === 'divider' || component.type === 'divider');

      // Ensure component definition exists (unless it's a literal 'divider' token in a flyout)
      if (!isFlyoutDivider) {
        modularComponents[compKey] = component;
      }

      // Ensure destination header exists
      if (!modularHeaders[headerKey]) {
        modularHeaders[headerKey] = {
          dataElement: headerKey,
          placement: 'top',
          items: [],
        };
      }
      const headerObj = { ...modularHeaders[headerKey] };
      headerObj.items = Array.isArray(headerObj.items)
        ? [...headerObj.items]
        : [];

      if (componentType === 'ribbonItem') {
        const cleanName = compKey
          .replace(/RibbonItem$/i, '')
          .replace(/^toolbarGroup-/, '')
          .replace(/^ribbon-/, '');
        const groupContainerKey =
          (Array.isArray(component.groupedItems) &&
            component.groupedItems.length > 0 &&
            component.groupedItems[0]) ||
          `${cleanName.charAt(0).toLowerCase()}${cleanName.slice(1)}GroupedItems`;

        // 1. Ensure groupedItems container exists in modularComponents
        if (!modularComponents[groupContainerKey]) {
          modularComponents[groupContainerKey] = {
            type: 'groupedItems',
            dataElement: groupContainerKey,
            items: [],
            gap: 12,
            grow: 0,
            justifyContent: 'center',
            alwaysVisible: false,
          };
        }

        // 2. Ensure ribbonItem points to this container
        modularComponents[compKey] = {
          items: [],
          ...component,
          type: 'ribbonItem',
          dataElement: compKey,
          toolbarGroup: component.toolbarGroup || compKey,
          title: component.title || component.label || compKey,
          label: component.label || component.title || compKey,
          groupedItems: [groupContainerKey],
        };

        // 3. Ensure the container is registered in tools-header so WebViewer renders its tools
        if (!modularHeaders['tools-header']) {
          modularHeaders['tools-header'] = {
            dataElement: 'tools-header',
            placement: 'top',
            justifyContent: 'center',
            grow: 0,
            gap: 12,
            position: 'end',
            items: [groupContainerKey],
          };
        } else {
          const toolsHeader = { ...modularHeaders['tools-header'] };
          const thItems = Array.isArray(toolsHeader.items)
            ? [...toolsHeader.items]
            : [];
          if (!thItems.includes(groupContainerKey)) {
            thItems.push(groupContainerKey);
          }
          toolsHeader.items = thItems;
          modularHeaders['tools-header'] = toolsHeader;
        }

        // 4. Add ribbon tab to ribbon group in the target header
        let ribbonGroupKey = headerObj.items.find((k) => {
          const c = modularComponents[k];
          return c?.type === 'ribbonGroup' || k === 'default-ribbon-group';
        });

        if (!ribbonGroupKey) {
          ribbonGroupKey = 'ribbon-group-' + headerKey;
          modularComponents[ribbonGroupKey] = {
            type: 'ribbonGroup',
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
        if (headerKey && headerKey !== activeHeader) {
          setActiveHeader(headerKey);
        }
        return { ...prev, modularComponents, modularHeaders };
      }

      if (
        targetLocationType === 'ribbon' &&
        ribbonTabKey &&
        modularComponents[ribbonTabKey]
      ) {
        if (headerKey && headerKey !== activeHeader) {
          setActiveHeader(headerKey);
        }
        setSelectedRibbonTab(ribbonTabKey);
        // Add to active ribbon tab
        const tabComp = { ...modularComponents[ribbonTabKey] };
        let groupContainerKey =
          Array.isArray(tabComp.groupedItems) && tabComp.groupedItems.length > 0
            ? tabComp.groupedItems[0]
            : null;

        // Auto-create container if tab does not have one
        if (!groupContainerKey) {
          const cleanName = ribbonTabKey
            .replace(/RibbonItem$/i, '')
            .replace(/^toolbarGroup-/, '')
            .replace(/^ribbon-/, '');
          groupContainerKey = `${cleanName.charAt(0).toLowerCase()}${cleanName.slice(1)}GroupedItems`;
          tabComp.groupedItems = [groupContainerKey];
          modularComponents[ribbonTabKey] = tabComp;
        }

        // Ensure container component exists in modularComponents
        const groupComp = modularComponents[groupContainerKey] || {
          type: 'groupedItems',
          dataElement: groupContainerKey,
          items: [],
          gap: 12,
          grow: 0,
          justifyContent: 'center',
          alwaysVisible: false,
        };

        const nextItems = Array.isArray(groupComp.items)
          ? [...groupComp.items]
          : [];
        nextItems.push(compKey);
        modularComponents[groupContainerKey] = {
          ...groupComp,
          items: nextItems,
        };

        // Ensure groupContainerKey is in tools-header so WebViewer renders it
        if (!modularHeaders['tools-header']) {
          modularHeaders['tools-header'] = {
            dataElement: 'tools-header',
            placement: 'top',
            justifyContent: 'center',
            grow: 0,
            gap: 12,
            position: 'end',
            items: [groupContainerKey],
          };
        } else {
          const toolsHeader = { ...modularHeaders['tools-header'] };
          const thItems = Array.isArray(toolsHeader.items)
            ? [...toolsHeader.items]
            : [];
          if (!thItems.includes(groupContainerKey)) {
            thItems.push(groupContainerKey);
          }
          toolsHeader.items = thItems;
          modularHeaders['tools-header'] = toolsHeader;
        }
      } else if (targetLocationType === 'flyout' && target.flyoutKey) {
        // Add to flyout items (use literal 'divider' token for dividers)
        const flyoutKey = target.flyoutKey;
        const currentFlyout = nextFlyouts[flyoutKey] || {
          dataElement: flyoutKey,
          items: [],
        };
        const currentItems = Array.isArray(currentFlyout.items)
          ? [...currentFlyout.items]
          : [];
        currentItems.push(isFlyoutDivider ? 'divider' : compKey);
        nextFlyouts[flyoutKey] = {
          ...currentFlyout,
          items: currentItems,
        };
      } else {
        // Add directly to header (allow duplicate buttons/dividers per modular UI spec)
        headerObj.items.push(compKey);
      }

      // Auto-enable panel in config.panels ONLY if it's a known panel toggle
      const nextPanels = { ...prev.panels };
      if (
        (componentType === 'toggleButton' ||
          component.type === 'toggleButton') &&
        (component.toggleElement || component.element)
      ) {
        const panelId = component.toggleElement || component.element;
        const catalogDef = PANELS_CATALOG.find((p) => p.id === panelId);
        if (catalogDef && !nextPanels[panelId]) {
          nextPanels[panelId] = {
            dataElement: panelId,
            location: catalogDef?.defaultLocation || 'left',
            render: catalogDef?.render || panelId,
          };
        }
      }

      modularHeaders[headerKey] = headerObj;
      return {
        ...prev,
        modularComponents,
        modularHeaders,
        panels: nextPanels,
        flyouts: nextFlyouts,
      };
    });
  };

  // 6. Delete Component
  const handleDeleteTool = (itemKey, targetContext = {}) => {
    setConfig((prev) => {
      const modularComponents = { ...prev.modularComponents };
      const modularHeaders = { ...prev.modularHeaders };
      const nextFlyouts = { ...prev.flyouts };

      const targetComp = modularComponents[itemKey];

      // A. If deleting a RibbonGroup: cascade delete child RibbonItems, their GroupedItems, and clean tools-header
      if (targetComp?.type === 'ribbonGroup') {
        const childRibbonKeys = Array.isArray(targetComp.items)
          ? [...targetComp.items]
          : [];
        const allAssociatedGroupedItems = [];

        for (const rKey of childRibbonKeys) {
          const rComp = modularComponents[rKey];
          if (rComp && Array.isArray(rComp.groupedItems)) {
            for (const gKey of rComp.groupedItems) {
              allAssociatedGroupedItems.push(gKey);
              delete modularComponents[gKey];
            }
          }
          delete modularComponents[rKey];
        }

        delete modularComponents[itemKey];

        // Clean up headers (including tools-header)
        for (const [hKey, hConfig] of Object.entries(modularHeaders)) {
          if (Array.isArray(hConfig?.items)) {
            modularHeaders[hKey] = {
              ...hConfig,
              items: hConfig.items.filter(
                (k) =>
                  k !== itemKey &&
                  !childRibbonKeys.includes(k) &&
                  !allAssociatedGroupedItems.includes(k),
              ),
            };
          }
        }

        // Clean up tools-header if empty
        if (
          modularHeaders['tools-header'] &&
          Array.isArray(modularHeaders['tools-header'].items) &&
          modularHeaders['tools-header'].items.length === 0
        ) {
          delete modularHeaders['tools-header'];
        }

        return {
          ...prev,
          modularComponents,
          modularHeaders,
          flyouts: nextFlyouts,
        };
      }

      // B. If deleting a RibbonItem: cascade delete its groupedItems, remove from tools-header and ribbonGroup
      if (targetComp?.type === 'ribbonItem') {
        const associatedGroupedItems = Array.isArray(targetComp?.groupedItems)
          ? [...targetComp.groupedItems]
          : [];

        delete modularComponents[itemKey];
        for (const gKey of associatedGroupedItems) {
          delete modularComponents[gKey];
        }

        // Clean up headers
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

        // Remove from parent ribbon groups and auto-clean empty ribbon groups
        const emptyRibbonGroups = new Set();
        for (const [compKey, comp] of Object.entries(modularComponents)) {
          if (comp?.type === 'ribbonGroup' && Array.isArray(comp?.items)) {
            const filtered = comp.items.filter((k) => k !== itemKey);
            if (filtered.length !== comp.items.length) {
              modularComponents[compKey] = { ...comp, items: filtered };
            }
            if (filtered.length === 0) {
              emptyRibbonGroups.add(compKey);
            }
          }
        }

        // Auto-clean empty RibbonGroups
        for (const emptyGroupKey of emptyRibbonGroups) {
          delete modularComponents[emptyGroupKey];
          for (const [hKey, hConfig] of Object.entries(modularHeaders)) {
            if (
              Array.isArray(hConfig?.items) &&
              hConfig.items.includes(emptyGroupKey)
            ) {
              modularHeaders[hKey] = {
                ...hConfig,
                items: hConfig.items.filter((id) => id !== emptyGroupKey),
              };
            }
          }
        }

        // Clean up tools-header if empty
        if (
          modularHeaders['tools-header'] &&
          Array.isArray(modularHeaders['tools-header'].items) &&
          modularHeaders['tools-header'].items.length === 0
        ) {
          delete modularHeaders['tools-header'];
        }

        return {
          ...prev,
          modularComponents,
          modularHeaders,
          flyouts: nextFlyouts,
        };
      }

      // C. Regular component/tool targeted deletion
      const state = { modularComponents, modularHeaders, nextFlyouts };
      const applied = updateContextList(
        state,
        itemKey,
        targetContext,
        (arr) => {
          const occurrence = targetContext.occurrence || 0;
          const idx = nthIndexOf(arr, itemKey, occurrence);
          if (idx < 0) {
            const firstIdx = arr.indexOf(itemKey);
            if (firstIdx < 0) return null;
            const list = [...arr];
            list.splice(firstIdx, 1);
            return list;
          }
          const list = [...arr];
          list.splice(idx, 1);
          return list;
        },
      );

      if (!applied) {
        delete modularComponents[itemKey];
        for (const [hKey, hConfig] of Object.entries(modularHeaders)) {
          if (Array.isArray(hConfig?.items)) {
            modularHeaders[hKey] = {
              ...hConfig,
              items: hConfig.items.filter((k) => k !== itemKey),
            };
          }
        }
        for (const [cKey, comp] of Object.entries(modularComponents)) {
          if (Array.isArray(comp?.items)) {
            modularComponents[cKey] = {
              ...comp,
              items: comp.items.filter((k) => k !== itemKey),
            };
          }
          if (Array.isArray(comp?.groupedItems)) {
            modularComponents[cKey] = {
              ...comp,
              groupedItems: comp.groupedItems.filter((k) => k !== itemKey),
            };
          }
        }
        for (const [fKey, fConfig] of Object.entries(nextFlyouts)) {
          if (Array.isArray(fConfig?.items)) {
            nextFlyouts[fKey] = {
              ...fConfig,
              items: fConfig.items.filter((k) => k !== itemKey),
            };
          }
        }
      } else {
        // If the component definition is no longer referenced anywhere, prune it
        let isReferenced = false;
        for (const h of Object.values(modularHeaders)) {
          if (Array.isArray(h?.items) && h.items.includes(itemKey)) {
            isReferenced = true;
            break;
          }
        }
        if (!isReferenced) {
          for (const c of Object.values(modularComponents)) {
            if (Array.isArray(c?.items) && c.items.includes(itemKey)) {
              isReferenced = true;
              break;
            }
            if (
              Array.isArray(c?.groupedItems) &&
              c.groupedItems.includes(itemKey)
            ) {
              isReferenced = true;
              break;
            }
          }
        }
        if (!isReferenced) {
          for (const f of Object.values(nextFlyouts)) {
            if (Array.isArray(f?.items) && f.items.includes(itemKey)) {
              isReferenced = true;
              break;
            }
          }
        }
        if (!isReferenced && itemKey !== 'divider') {
          delete modularComponents[itemKey];
        }
      }

      return {
        ...prev,
        modularComponents,
        modularHeaders,
        flyouts: nextFlyouts,
      };
    });
  };

  // Index of the n-th (0-based) occurrence of `key` in `list`, or -1.
  // Items may legitimately repeat (e.g. several dividers), so operations target
  // one occurrence instead of every entry with that key.
  const nthIndexOf = (list, key, n = 0) => {
    let seen = -1;
    for (let i = 0; i < list.length; i++) {
      if (list[i] === key && ++seen === n) return i;
    }
    return -1;
  };

  // Applies `fn(list) -> newList | null` to the exact array that holds the items
  // for a target context (flyout, header, or ribbon tab). Mutates the passed
  // state copies. Returns true if a list was found and replaced.
  const updateContextList = (state, itemKey, targetContext, fn) => {
    const { modularComponents, modularHeaders, nextFlyouts } = state;
    const { type, ribbonKey, headerKey, flyoutKey } = targetContext;

    if (type === 'flyout' && flyoutKey && nextFlyouts[flyoutKey]) {
      const fObj = nextFlyouts[flyoutKey];
      const nextItems = fn(fObj.items || []);
      if (nextItems) nextFlyouts[flyoutKey] = { ...fObj, items: nextItems };
      return true;
    }

    if (type === 'header' && headerKey && modularHeaders[headerKey]) {
      const headerObj = modularHeaders[headerKey];
      const nextItems = fn(headerObj.items || []);
      if (nextItems) {
        modularHeaders[headerKey] = { ...headerObj, items: nextItems };
      }
      return true;
    }

    if (type === 'ribbon' && ribbonKey && modularComponents[ribbonKey]) {
      const tabComp = modularComponents[ribbonKey];
      if (
        Array.isArray(tabComp.groupedItems) &&
        tabComp.groupedItems.length > 0
      ) {
        const groupKey = tabComp.groupedItems[0];
        const groupComp = modularComponents[groupKey];
        if (groupComp && Array.isArray(groupComp.items)) {
          if (groupComp.items.includes(itemKey)) {
            const nextItems = fn(groupComp.items);
            if (nextItems) {
              modularComponents[groupKey] = { ...groupComp, items: nextItems };
            }
          } else {
            for (const subKey of groupComp.items) {
              const subComp = modularComponents[subKey];
              if (
                subComp &&
                subComp.type === 'groupedItems' &&
                Array.isArray(subComp.items) &&
                subComp.items.includes(itemKey)
              ) {
                const nextSubItems = fn(subComp.items);
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
        const nextItems = fn(tabComp.items);
        if (nextItems) {
          modularComponents[ribbonKey] = { ...tabComp, items: nextItems };
        }
      }
      return true;
    }

    return false;
  };

  // 7. Reorder Item (Up/Down)
  const handleMoveItem = (item, direction, targetContext = {}) => {
    const itemKey = item.key;
    const occurrence = targetContext.occurrence || 0;

    setConfig((prev) => {
      const state = {
        modularComponents: { ...prev.modularComponents },
        modularHeaders: { ...prev.modularHeaders },
        nextFlyouts: { ...prev.flyouts },
      };

      const moveInArray = (arr) => {
        const list = [...arr];
        const idx = nthIndexOf(list, itemKey, occurrence);
        if (idx < 0) return null;
        const targetIdx = idx + direction;
        if (targetIdx < 0 || targetIdx >= list.length) return null;
        list.splice(idx, 1);
        list.splice(targetIdx, 0, itemKey);
        return list;
      };

      if (!updateContextList(state, itemKey, targetContext, moveInArray)) {
        return prev;
      }
      return {
        ...prev,
        modularComponents: state.modularComponents,
        modularHeaders: state.modularHeaders,
        flyouts: state.nextFlyouts,
      };
    });
  };

  // 8. Side TabPanel & Flyout handlers
  const handleAddTabPanel = ({
    dataElement,
    location,
    panelsList,
    toggleLabel,
    targetHeader,
  }) => {
    setConfig((prev) => {
      const nextPanels = { ...prev.panels };

      // 1. Ensure each sub-panel in panelsList is registered in panels so WebViewer can resolve its renderer
      panelsList.forEach((item) => {
        if (!nextPanels[item.render]) {
          nextPanels[item.render] = {
            dataElement: item.render,
            render: item.render,
            location: location || 'left',
          };
        }
      });

      // 2. Register the TabPanel container
      nextPanels[dataElement] = {
        dataElement,
        render: 'tabPanel',
        location: location || 'left',
        panelsList,
      };

      let nextComponents = { ...prev.modularComponents };
      let nextHeaders = { ...prev.modularHeaders };

      // 3. Always automatically create a toggle button in the header
      const headerToUse = targetHeader || activeHeader;
      if (headerToUse && nextHeaders[headerToUse]) {
        const toggleKey = `${dataElement}Toggle`;
        nextComponents[toggleKey] = {
          type: 'toggleButton',
          dataElement: toggleKey,
          toggleElement: dataElement,
          element: dataElement,
          label: toggleLabel || 'Sidebar',
          title: `Toggle ${dataElement}`,
          img: 'icon-header-sidebar-line',
        };
        const headerItems = [...(nextHeaders[headerToUse].items || [])];
        if (!headerItems.includes(toggleKey)) {
          headerItems.push(toggleKey);
        }
        nextHeaders[headerToUse] = {
          ...nextHeaders[headerToUse],
          items: headerItems,
        };
      }

      return {
        ...prev,
        panels: nextPanels,
        modularComponents: nextComponents,
        modularHeaders: nextHeaders,
      };
    });
  };

  const handleAddFlyout = ({
    dataElement,
    label,
    title,
    icon,
    targetHeader,
    targetLocationType,
    targetPopup,
  }) => {
    setConfig((prev) => {
      const nextFlyouts = { ...prev.flyouts };
      const nextComponents = { ...prev.modularComponents };
      const nextHeaders = { ...prev.modularHeaders };
      const nextPopups = { ...prev.popups };

      // 1. Register flyout container
      nextFlyouts[dataElement] = {
        dataElement,
        items: [],
      };

      // 2. Register toggle button
      const toggleKey = `${dataElement}Toggle`;
      const toggleButtonObj = {
        type: 'toggleButton',
        dataElement: toggleKey,
        toggleElement: dataElement,
        element: dataElement,
        label: label || 'Flyout',
        title: title || `Toggle ${dataElement}`,
        img: icon || 'icon-tools-more',
      };

      // 3. Add toggle button to destination (header or popup)
      if (targetLocationType === 'popup' && targetPopup) {
        const popupItems = Array.isArray(nextPopups[targetPopup])
          ? [...nextPopups[targetPopup]]
          : (DEFAULT_POPUPS[targetPopup] || []).map((i) => ({ ...i }));
        popupItems.push(toggleButtonObj);
        nextPopups[targetPopup] = popupItems;
      } else {
        nextComponents[toggleKey] = toggleButtonObj;
        const headerToUse = targetHeader || activeHeader;
        if (headerToUse && nextHeaders[headerToUse]) {
          const headerItems = [...(nextHeaders[headerToUse].items || [])];
          if (!headerItems.includes(toggleKey)) {
            headerItems.push(toggleKey);
          }
          nextHeaders[headerToUse] = {
            ...nextHeaders[headerToUse],
            items: headerItems,
          };
        }
      }

      return {
        ...prev,
        flyouts: nextFlyouts,
        modularComponents: nextComponents,
        modularHeaders: nextHeaders,
        popups: nextPopups,
      };
    });
    setActiveFlyout(dataElement);
  };

  const handleDeleteFlyout = (flyoutId) => {
    setConfig((prev) => {
      const nextFlyouts = { ...prev.flyouts };
      delete nextFlyouts[flyoutId];

      const nextComponents = { ...prev.modularComponents };
      const nextHeaders = { ...prev.modularHeaders };

      for (const [key, comp] of Object.entries(nextComponents)) {
        if (
          comp?.type === 'toggleButton' &&
          (comp.toggleElement === flyoutId || comp.element === flyoutId)
        ) {
          delete nextComponents[key];
          for (const [hKey, hConfig] of Object.entries(nextHeaders)) {
            if (Array.isArray(hConfig.items)) {
              nextHeaders[hKey] = {
                ...hConfig,
                items: hConfig.items.filter((itemKey) => itemKey !== key),
              };
            }
          }
        }
      }

      return {
        ...prev,
        flyouts: nextFlyouts,
        modularComponents: nextComponents,
        modularHeaders: nextHeaders,
      };
    });
  };

  const handleRemoveItemFromFlyout = (flyoutId, itemIndex) => {
    setConfig((prev) => {
      const targetFlyout = prev.flyouts[flyoutId];
      if (!targetFlyout || !Array.isArray(targetFlyout.items)) return prev;
      return {
        ...prev,
        flyouts: {
          ...prev.flyouts,
          [flyoutId]: {
            ...targetFlyout,
            items: targetFlyout.items.filter((_, idx) => idx !== itemIndex),
          },
        },
      };
    });
  };

  const handleUpdatePopup = (popupId, nextItems) => {
    setConfig((prev) => ({
      ...prev,
      popups: {
        ...(prev.popups || {}),
        [popupId]: nextItems,
      },
    }));
  };

  // 9. Export & Import JSON
  const handleExportJSON = () => {
    download('webviewer-ui-config.json', JSON.stringify(config, null, 2));
  };

  const handleImportFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        const { config: normalized, warnings } = prepareConfigForImport(parsed);
        setImportWarnings(warnings);
        setConfig(normalized);
        const headerKeys = Object.keys(normalized.modularHeaders || {});
        if (headerKeys.length > 0) setActiveHeader(headerKeys[0]);
        applyConfigToViewer(normalized);
      } catch (err) {
        alert('Invalid JSON configuration file: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Open Add Modal
  const openAddModal = (
    tabName = 'tool',
    targetLocation = null,
    targetKey = null,
  ) => {
    setModalInitialTab(tabName);
    setModalInitialLocation(targetLocation);
    if (targetLocation === 'flyout') {
      setModalInitialFlyout(targetKey);
      setModalInitialPopup(null);
    } else if (targetLocation === 'popup') {
      setModalInitialPopup(targetKey || activePopup || 'annotationPopup');
      setModalInitialFlyout(null);
    } else {
      setModalInitialFlyout(null);
      setModalInitialPopup(null);
    }
    setIsAddModalOpen(true);
  };

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
          Reset to Blank
        </button>
        <button
          className="quick-btn"
          onClick={restoreDefault}
          title="Restore standard full WebViewer UI"
        >
          Restore Default
        </button>
      </div>

      <div className="auto-apply-bar">
        <label className="auto-apply-label">
          <input
            type="checkbox"
            checked={autoApply}
            onChange={(e) => setAutoApply(e.target.checked)}
          />
          Auto-apply live changes to WebViewer
        </label>
      </div>

      {importWarnings.length > 0 && (
        <div className="import-warnings" role="status">
          <strong>
            {importWarnings.length} item
            {importWarnings.length === 1 ? '' : 's'} adjusted so WebViewer
            accepts this config:
          </strong>
          <ul>
            {importWarnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* GLOBAL ELEVATED ADD COMPONENT ACTION */}
      <div className="global-add-bar" style={{ marginBottom: 12 }}>
        <button
          type="button"
          className="central-add-button"
          style={{
            width: '100%',
            padding: '10px 14px',
            fontSize: 13,
            fontWeight: 600,
          }}
          onClick={() => {
            if (activeSection === 'popups') {
              openAddModal('tool', 'popup', activePopup || 'annotationPopup');
            } else if (activeSection === 'flyouts' && activeFlyout) {
              openAddModal('tool', 'flyout', activeFlyout);
            } else if (
              activeSection === 'headers' &&
              headerSubView === 'ribbon' &&
              selectedRibbonTab
            ) {
              openAddModal('tool', 'ribbon');
            } else {
              openAddModal('tool', 'header');
            }
          }}
          title="Add tools, preset buttons, toggles, controls, or containers"
        >
          + Add Component
        </button>
      </div>

      {/* TOP-LEVEL BUILDER SECTION TABS */}
      <div
        className="filter-container"
        style={{
          marginBottom: 12,
          paddingBottom: 10,
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <button
          type="button"
          className={`filter-button ${activeSection === 'headers' ? 'active' : ''}`}
          onClick={() => setActiveSection('headers')}
        >
          Headers &amp; Ribbons (
          {Object.keys(config.modularHeaders || {}).length})
        </button>
        <button
          type="button"
          className={`filter-button ${activeSection === 'flyouts' ? 'active' : ''}`}
          onClick={() => setActiveSection('flyouts')}
        >
          Flyouts ({Object.keys(config.flyouts || {}).length})
        </button>
        <button
          type="button"
          className={`filter-button ${activeSection === 'popups' ? 'active' : ''}`}
          onClick={() => setActiveSection('popups')}
        >
          Popups (3)
        </button>
      </div>

      {/* MAIN BUILDER CONTENT */}
      <div className="builder-main-content">
        {/* TAB 1: HEADERS & RIBBONS */}
        {activeSection === 'headers' && (
          <>
            <section>
              <HeaderManager
                headers={config.modularHeaders || {}}
                activeHeader={activeHeader}
                onSelectHeader={setActiveHeader}
                onAddHeader={handleAddHeader}
                onDeleteHeader={handleDeleteHeader}
                onOpenAddModal={openAddModal}
              />
            </section>

            {activeHeader && config.modularHeaders[activeHeader] && (
              <section>
                <ToolButtonsCategorized
                  activeHeader={activeHeader}
                  headerPlacement={
                    config.modularHeaders[activeHeader]?.placement || 'top'
                  }
                  ribbonTabs={ribbonTabs}
                  selectedRibbonTab={selectedRibbonTab}
                  onSelectRibbonTab={handleSelectRibbonTab}
                  onDeleteRibbonTab={handleDeleteRibbonTab}
                  ribbonTools={getToolsInActiveRibbon()}
                  directHeaderItems={getDirectHeaderItems()}
                  onDeleteTool={handleDeleteTool}
                  onMoveItem={handleMoveItem}
                  onOpenAddModal={openAddModal}
                  subView={headerSubView}
                  onSubViewChange={setHeaderSubView}
                />
              </section>
            )}
          </>
        )}

        {/* TAB 2: FLYOUTS */}
        {activeSection === 'flyouts' && (
          <section className="tool-buttons-container">
            <div className="section-header-row" style={{ marginBottom: 8 }}>
              <span className="section-title">
                Flyouts ({Object.keys(config.flyouts || {}).length})
              </span>
              <button
                type="button"
                className="small-action-button"
                onClick={() => openAddModal('newFlyout')}
                title="Create a new Flyout container"
              >
                + New Flyout
              </button>
            </div>

            {Object.keys(config.flyouts || {}).length === 0 ? (
              <p className="empty-hint">
                No flyouts defined. Click &quot;+ New Flyout&quot; above to
                create one.
              </p>
            ) : (
              <>
                <div className="filter-container" style={{ marginBottom: 10 }}>
                  {Object.entries(config.flyouts || {}).map(
                    ([flyoutId, flyoutDef]) => {
                      const count = Array.isArray(flyoutDef?.items)
                        ? flyoutDef.items.length
                        : 0;
                      const isActive = flyoutId === activeFlyout;
                      return (
                        <button
                          key={flyoutId}
                          type="button"
                          className={`filter-button ${isActive ? 'active' : ''}`}
                          onClick={() => setActiveFlyout(flyoutId)}
                        >
                          {flyoutId} ({count})
                        </button>
                      );
                    },
                  )}
                </div>

                {activeFlyout && config.flyouts[activeFlyout] && (
                  <div>
                    <div
                      className="section-header-row"
                      style={{ marginBottom: 8 }}
                    >
                      <span className="section-subtitle">
                        Items in <strong>{activeFlyout}</strong>
                      </span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          className="add-toggle-btn"
                          style={{ fontSize: 11, padding: '3px 8px' }}
                          onClick={() =>
                            openAddModal('tool', 'flyout', activeFlyout)
                          }
                          title="Add an item to this flyout"
                        >
                          + Add Item
                        </button>
                        <button
                          type="button"
                          className="secondary-button"
                          style={{
                            fontSize: 11,
                            padding: '3px 8px',
                            color: '#dc2626',
                          }}
                          onClick={() => handleDeleteFlyout(activeFlyout)}
                          title="Delete this flyout and its header toggle button"
                        >
                          Delete Flyout
                        </button>
                      </div>
                    </div>

                    <div
                      className="tools-display"
                      style={{ maxHeight: 240, overflowY: 'auto' }}
                    >
                      {(config.flyouts[activeFlyout]?.items || []).length ===
                      0 ? (
                        <p className="no-tools-message">
                          No items in this flyout. Click &quot;+ Add Item&quot;
                          above to add items.
                        </p>
                      ) : (
                        (config.flyouts[activeFlyout]?.items || []).map(
                          (itemKey, itemIndex, arr) => {
                            const comp =
                              config.modularComponents?.[itemKey] ||
                              (itemKey === 'divider'
                                ? { type: 'divider', dataElement: 'divider' }
                                : { dataElement: itemKey });
                            const label =
                              comp.label ||
                              comp.title ||
                              comp.toolName ||
                              (itemKey === 'divider' ? 'Divider' : itemKey);
                            const requiresFnMap =
                              comp.type === 'customButton' &&
                              typeof comp.onClick === 'string' &&
                              comp.onClick.length > 0;
                            const occurrence = arr
                              .slice(0, itemIndex)
                              .filter((k) => k === itemKey).length;

                            return (
                              <div
                                key={`${itemKey}-${itemIndex}`}
                                className="tool-item"
                              >
                                <div className="tool-info">
                                  <div className="tool-name-container">
                                    <span className="tool-display-name">
                                      {label}
                                    </span>
                                    {itemKey !== label && (
                                      <span className="tool-subtext">
                                        ({itemKey})
                                      </span>
                                    )}
                                  </div>
                                  {requiresFnMap && (
                                    <span
                                      className="tool-icon-pill"
                                      title={`Uses customButton (${comp.onClick}) — requires passing functionMap to UI.importModularComponents`}
                                    >
                                      functionMap
                                    </span>
                                  )}
                                </div>
                                <div className="tool-item-actions">
                                  <div className="tool-move-controls">
                                    <button
                                      type="button"
                                      className="move-button"
                                      disabled={itemIndex === 0}
                                      onClick={() =>
                                        handleMoveItem({ key: itemKey }, -1, {
                                          type: 'flyout',
                                          flyoutKey: activeFlyout,
                                          occurrence,
                                        })
                                      }
                                      title={`Move ${label} up`}
                                    >
                                      ↑
                                    </button>
                                    <button
                                      type="button"
                                      className="move-button"
                                      disabled={itemIndex === arr.length - 1}
                                      onClick={() =>
                                        handleMoveItem({ key: itemKey }, 1, {
                                          type: 'flyout',
                                          flyoutKey: activeFlyout,
                                          occurrence,
                                        })
                                      }
                                      title={`Move ${label} down`}
                                    >
                                      ↓
                                    </button>
                                  </div>
                                  <button
                                    type="button"
                                    className="delete-button"
                                    onClick={() =>
                                      handleRemoveItemFromFlyout(
                                        activeFlyout,
                                        itemIndex,
                                      )
                                    }
                                    title={`Remove ${label} from ${activeFlyout}`}
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                            );
                          },
                        )
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {/* TAB 3: POPUPS */}
        {activeSection === 'popups' && (
          <section>
            <PopupsManager
              popups={config.popups || {}}
              modularComponents={config.modularComponents || {}}
              activePopupId={activePopup}
              onSelectPopup={setActivePopup}
              onUpdatePopup={handleUpdatePopup}
              onOpenAddModal={openAddModal}
            />
          </section>
        )}
      </div>

      {/* 3. ACTIONS BAR (ALWAYS VISIBLE) */}
      <div className="action-buttons">
        <button
          className="primary-button"
          onClick={() => applyConfigToViewer(config)}
        >
          Apply to Viewer
        </button>

        <div style={{ display: 'flex', gap: 8 }}>
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
        initialFlyout={modalInitialFlyout}
        initialPopup={modalInitialPopup}
        headerOptions={Object.keys(config.modularHeaders || {}).filter(
          (k) => k !== 'tools-header',
        )}
        activeHeader={activeHeader}
        ribbonTabs={ribbonTabs}
        getRibbonTabs={getRibbonTabsForHeader}
        onHeaderChange={setActiveHeader}
        activeRibbonTab={selectedRibbonTab}
        panels={config.panels || {}}
        flyouts={config.flyouts || {}}
        popups={config.popups || {}}
        onAddComponent={handleAddComponent}
        onAddTabPanel={handleAddTabPanel}
        onAddFlyout={handleAddFlyout}
        onAddHeader={handleAddHeader}
      />
    </div>
  );
}
