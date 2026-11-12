import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from 'react';
import ConfigPreview from './components/ConfigPreview';
import LeftStudioPane from './components/studio/LeftStudioPane';
import PropertiesInspector from './components/studio/PropertiesInspector';
import {
  DEFAULT_BLANK_CONFIG,
  DEFAULT_POPUPS,
  PANELS_CATALOG,
  resolvePanelTarget,
} from './constants/webviewerCatalog';
import { buildFunctionMap, prepareConfigForImport } from './sdk/importConfig';
import {
  collectAllExistingIds,
  generateUniqueDataElement,
} from './utils/idUtils';
import { getFriendlyComponentName } from './utils/labelUtils';
import {
  findRibbonTabToolContainer,
  getFlattenedHeaderItems,
  getFlattenedRibbonTabTools,
} from './utils/headerAndRibbonUtils';
import {
  defaultDraftFor,
  buildCommitFromDraft,
  resolveTargetContainer,
  buildAvailableTargets,
} from './utils/draftBuilders';
import { highlightElementInViewer } from './utils/domHighlight';
import './components/ToolButtonsCategorized.css';
import './components/studio/Studio.css';

function download(filename, content) {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ModularUIBuilder({ viewerRef, viewerReady }) {
  const [config, setConfig] = useState({
    modularComponents: {},
    modularHeaders: {},
    panels: {},
    flyouts: {},
    popups: DEFAULT_POPUPS,
  });

  const [showStudio, setShowStudio] = useState(true);
  const [leftPaneMode, setLeftPaneMode] = useState('tree'); // 'tree' | 'library'
  const [selectedNode, setSelectedNode] = useState(null);
  const [activeTarget, setActiveTarget] = useState(null);
  const [stagedDraft, setStagedDraft] = useState(null);
  const [leftPaneWidth, setLeftPaneWidth] = useState(320);
  const [rightPaneWidth, setRightPaneWidth] = useState(310);
  const [resizingSide, setResizingSide] = useState(null); // 'left' | 'right' | null

  useEffect(() => {
    if (!resizingSide) return;

    const handleMouseMove = (e) => {
      if (resizingSide === 'left') {
        const nextWidth = Math.max(240, Math.min(620, e.clientX));
        setLeftPaneWidth(nextWidth);
      } else if (resizingSide === 'right') {
        const nextWidth = Math.max(
          240,
          Math.min(560, window.innerWidth - e.clientX),
        );
        setRightPaneWidth(nextWidth);
      }
    };

    const handleMouseUp = () => {
      setResizingSide(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingSide]);

  const [activeHeader, setActiveHeader] = useState('default-top-header');
  const [selectedRibbonTab, setSelectedRibbonTab] = useState('');
  const [activeFlyout, setActiveFlyout] = useState('');
  const [activePopup, setActivePopup] = useState('annotationPopup');
  const [autoApply, setAutoApply] = useState(true);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [jsonCopied, setJsonCopied] = useState(false);

  const configJsonString = useMemo(
    () => JSON.stringify(config, null, 2),
    [config],
  );
  const configLineCount = useMemo(
    () => configJsonString.split('\n').length,
    [configJsonString],
  );

  const handleCopyJSON = () => {
    try {
      navigator.clipboard?.writeText(configJsonString);
      setJsonCopied(true);
      setTimeout(() => setJsonCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  // Keep a pristine backup of WebViewer's default UI configuration on mount
  const defaultConfigRef = useRef(null);
  const fileInputRef = useRef(null);
  const isInitialMount = useRef(true);
  const lastWarningsRef = useRef(new Set());

  const logNewWarnings = useCallback((warnings = [], isFullReset = false) => {
    if (isFullReset) {
      lastWarningsRef.current = new Set();
    }
    const currentSet = new Set(warnings || []);
    const newWarnings = (warnings || []).filter(
      (w) => !lastWarningsRef.current.has(w),
    );
    lastWarningsRef.current = currentSet;

    if (newWarnings.length === 1) {
      console.warn(`[WebViewer UI Builder] ${newWarnings[0]}`);
    } else if (newWarnings.length > 1) {
      console.groupCollapsed(
        `[WebViewer UI Builder] ${newWarnings.length} compatibility warnings`,
      );
      newWarnings.forEach((w) => console.warn(w));
      console.groupEnd();
    }
  }, []);

  // 1. Mount / Viewer Ready: Load default modular UI from running viewer
  useEffect(() => {
    if (window.viewerInstance && window.viewerInstance.UI) {
      try {
        const exported = window.viewerInstance.UI.exportModularComponents();
        if (exported && exported.modularHeaders) {
          defaultConfigRef.current = JSON.parse(JSON.stringify(exported));
          isInitialMount.current = true;
          setConfig(exported);

          const headerKeys = Object.keys(exported.modularHeaders).filter(
            (k) => k !== 'tools-header',
          );
          if (headerKeys.length > 0) {
            const firstH = headerKeys[0];
            setActiveHeader(firstH);
            setSelectedNode({
              type: 'header',
              id: firstH,
              label: getFriendlyComponentName(
                firstH,
                exported.modularHeaders[firstH],
              ),
            });
            setActiveTarget({
              type: 'header',
              headerKey: firstH,
              label: `Header: ${getFriendlyComponentName(
                firstH,
                exported.modularHeaders[firstH],
              )}`,
            });
          }
        }
      } catch (err) {
        console.warn(
          'Could not export initial WebViewer modular components:',
          err,
        );
      }
    }
  }, [viewerReady]);

  // 2. Auto-Apply effect: When config changes and autoApply is enabled, sync to WebViewer
  const applyConfigToViewer = useCallback(
    (cfgToApply) => {
      if (!window.viewerInstance || !window.viewerInstance.UI) return;
      try {
        const { config: sanitized, warnings } = prepareConfigForImport(
          cfgToApply,
          { forViewer: true },
        );
        const functionMap = buildFunctionMap(sanitized, window.viewerInstance);
        logNewWarnings(warnings);
        window.viewerInstance.UI.importModularComponents(
          sanitized,
          functionMap,
        );
      } catch (err) {
        console.error(
          'Failed to apply configuration to WebViewer:',
          err.message,
        );
      }
    },
    [logNewWarnings],
  );

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

  const activateRibbonTabInViewer = useCallback((tabKey) => {
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

  const handleModeChange = useCallback((nextMode) => {
    setLeftPaneMode(nextMode);
    if (nextMode === 'tree') {
      setStagedDraft(null);
    }
  }, []);

  // Select a node in the Studio Outline Tree
  const handleSelectNode = useCallback(
    (node) => {
      setStagedDraft(null);
      setSelectedNode(node);
      if (!node) return;

      if (node.id) {
        highlightElementInViewer(node.id);
      }

      if (node.type === 'header') {
        setActiveHeader(node.id);
        setActiveTarget({
          key: `header:${node.id}`,
          type: 'header',
          headerKey: node.id,
          label: `Header: ${node.label || node.id}`,
        });
      } else if (node.type === 'groupedItems') {
        if (node.headerKey) setActiveHeader(node.headerKey);
        if (node.ribbonKey) activateRibbonTabInViewer(node.ribbonKey);
        setActiveTarget({
          key: `groupedItems:${node.id}`,
          type: 'groupedItems',
          groupKey: node.id,
          headerKey: node.headerKey || activeHeader,
          ribbonTabKey: node.ribbonKey,
          label: `Group: ${node.label || node.id}`,
        });
      } else if (node.type === 'ribbonTab') {
        if (node.headerKey) setActiveHeader(node.headerKey);
        activateRibbonTabInViewer(node.id);
        const hKey = node.headerKey || activeHeader;
        setActiveTarget({
          key: `ribbon:${hKey}:${node.id}`,
          type: 'ribbon',
          headerKey: hKey,
          ribbonTabKey: node.id,
          label: `Tab: ${node.label || node.id}`,
        });
      } else if (node.type === 'flyout') {
        setActiveFlyout(node.id);
        setActiveTarget({
          key: `flyout:${node.id}`,
          type: 'flyout',
          flyoutKey: node.id,
          label: `Flyout: ${node.label || node.id}`,
        });
      } else if (node.type === 'submenu') {
        setActiveTarget({
          key: `submenu:${node.flyoutKey}:${node.id}`,
          type: 'submenu',
          parentKey: node.id,
          flyoutKey: node.flyoutKey,
          label: `Submenu: ${node.label || node.id}`,
        });
      } else if (node.type === 'popup' || node.type === 'popupItem') {
        const pKey = node.type === 'popup' ? node.id : node.popupKey;
        setActivePopup(pKey);
        setActiveTarget({
          key: `popup:${pKey}`,
          type: 'popup',
          popupKey: pKey,
          label: `Popup: ${node.label || pKey}`,
        });
      } else if (node.targetContext) {
        const ctx = node.targetContext;
        if (ctx.type === 'groupedItems' && ctx.groupKey) {
          setActiveTarget({
            key: `groupedItems:${ctx.groupKey}`,
            type: 'groupedItems',
            groupKey: ctx.groupKey,
            headerKey: ctx.headerKey || activeHeader,
            ribbonTabKey: ctx.ribbonKey,
          });
        } else if (ctx.type === 'ribbon' && ctx.ribbonKey) {
          const hKey = ctx.headerKey || activeHeader;
          setActiveTarget({
            key: `ribbon:${hKey}:${ctx.ribbonKey}`,
            type: 'ribbon',
            headerKey: hKey,
            ribbonTabKey: ctx.ribbonKey,
          });
        } else if (ctx.type === 'flyout' && ctx.flyoutKey) {
          setActiveTarget({
            key: `flyout:${ctx.flyoutKey}`,
            type: 'flyout',
            flyoutKey: ctx.flyoutKey,
          });
        } else if (ctx.type === 'submenu' && ctx.parentKey) {
          setActiveTarget({
            key: `submenu:${ctx.flyoutKey}:${ctx.parentKey}`,
            type: 'submenu',
            parentKey: ctx.parentKey,
            flyoutKey: ctx.flyoutKey,
          });
        } else if (ctx.type === 'header' && ctx.headerKey) {
          setActiveTarget({
            key: `header:${ctx.headerKey}`,
            type: 'header',
            headerKey: ctx.headerKey,
          });
        } else if (ctx.type === 'popup' && ctx.popupKey) {
          setActiveTarget({
            key: `popup:${ctx.popupKey}`,
            type: 'popup',
            popupKey: ctx.popupKey,
          });
        }
      }
    },
    [activeHeader, activateRibbonTabInViewer],
  );

  const handleOpenAddForTarget = useCallback((targetSpec) => {
    let key = targetSpec?.key;
    if (!key && targetSpec) {
      if (targetSpec.type === 'header') key = `header:${targetSpec.headerKey}`;
      else if (targetSpec.type === 'groupedItems')
        key = `groupedItems:${targetSpec.groupKey}`;
      else if (targetSpec.type === 'ribbon')
        key = `ribbon:${targetSpec.headerKey}:${targetSpec.ribbonTabKey}`;
      else if (targetSpec.type === 'flyout')
        key = `flyout:${targetSpec.flyoutKey}`;
      else if (targetSpec.type === 'submenu')
        key = `submenu:${targetSpec.flyoutKey}:${targetSpec.parentKey}`;
      else if (targetSpec.type === 'popup')
        key = `popup:${targetSpec.popupKey}`;
    }
    setActiveTarget(key ? { ...targetSpec, key } : targetSpec);
    setLeftPaneMode('library');
  }, []);

  // --- ACTIONS ---

  // 1. Reset to Blank (Remove all UI)
  const resetToBlank = () => {
    const blank = JSON.parse(JSON.stringify(DEFAULT_BLANK_CONFIG));
    setConfig(blank);
    setActiveHeader('');
    setSelectedRibbonTab('');
    setSelectedNode(null);
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
      if (keys.length > 0) {
        setActiveHeader(keys[0]);
        setSelectedNode({
          type: 'header',
          id: keys[0],
          label: getFriendlyComponentName(
            keys[0],
            restored.modularHeaders[keys[0]],
          ),
        });
      }
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
    const friendlyLabel = getFriendlyComponentName(
      headerDef.dataElement,
      headerDef,
    );
    setActiveHeader(headerDef.dataElement);
    setSelectedNode({
      type: 'header',
      id: headerDef.dataElement,
      label: friendlyLabel,
    });
    setActiveTarget({
      key: `header:${headerDef.dataElement}`,
      type: 'header',
      headerKey: headerDef.dataElement,
      label: `Header: ${friendlyLabel}`,
    });
  };

  const handleQuickCreateHeader = () => {
    const existingIds = collectAllExistingIds(config);
    const dataElement = generateUniqueDataElement('custom-header', existingIds);
    const headerDef = {
      dataElement,
      placement: 'bottom',
      gap: 8,
      justifyContent: 'start',
      grow: 0,
      stroke: true,
      items: [],
    };
    handleAddHeader(headerDef);
  };

  // 4. Delete Header
  const handleDeleteHeader = (headerKey) => {
    setConfig((prev) => {
      const nextHeaders = { ...prev.modularHeaders };
      delete nextHeaders[headerKey];
      return { ...prev, modularHeaders: nextHeaders };
    });
    if (selectedNode?.id === headerKey) {
      setSelectedNode(null);
    }
  };

  // 4a. Update Header properties (placement, gap, justifyContent, stroke)
  const handleUpdateHeader = (headerKey, updates) => {
    setConfig((prev) => {
      const current = prev.modularHeaders?.[headerKey];
      if (!current) return prev;
      const nextHeaders = {
        ...prev.modularHeaders,
        [headerKey]: {
          ...current,
          ...updates,
        },
      };

      const nextComponents = { ...prev.modularComponents };
      if (updates.placement && Array.isArray(current.items)) {
        current.items.forEach((itemKey) => {
          const comp = nextComponents[itemKey];
          if (comp?.type === 'ribbonGroup') {
            nextComponents[itemKey] = {
              ...comp,
              placement: updates.placement,
            };
          }
        });
      }

      if (updates.placement && nextHeaders['tools-header']) {
        const safePlacement =
          updates.placement === 'left' || updates.placement === 'right'
            ? nextHeaders['tools-header'].placement === updates.placement
              ? 'top'
              : nextHeaders['tools-header'].placement || 'top'
            : updates.placement;

        nextHeaders['tools-header'] = {
          ...nextHeaders['tools-header'],
          placement: safePlacement,
        };
      }

      return {
        ...prev,
        modularHeaders: nextHeaders,
        modularComponents: nextComponents,
      };
    });
  };

  // 4b. Update Tools Header properties
  const handleUpdateToolsHeader = (updates) => {
    setConfig((prev) => {
      const current = prev.modularHeaders?.['tools-header'];
      if (!current) return prev;
      return {
        ...prev,
        modularHeaders: {
          ...prev.modularHeaders,
          'tools-header': {
            ...current,
            ...updates,
          },
        },
      };
    });
  };

  // 4c. Ribbon Layout Helpers (inline 1-bar vs separate 2-rows)
  const getRibbonLayoutForHeader = (headerKey) => {
    const h = config.modularHeaders?.[headerKey];
    if (!h) return 'separate';
    const tabs = getRibbonTabsForHeader(headerKey);
    const allGroupedItems = tabs.flatMap(
      (t) => t.component?.groupedItems || [],
    );
    const inActiveHeader = allGroupedItems.some(
      (gKey) => Array.isArray(h.items) && h.items.includes(gKey),
    );
    return inActiveHeader ? 'inline' : 'separate';
  };

  const handleSetRibbonLayout = (targetHeaderKey, newLayout) => {
    const hKey = targetHeaderKey || activeHeader;
    setConfig((prev) => {
      const nextHeaders = { ...prev.modularHeaders };
      const activeH = nextHeaders[hKey];
      if (!activeH) return prev;

      const tabs = getRibbonTabsForHeader(hKey);
      const allGroupedItems = tabs.flatMap(
        (t) => t.component?.groupedItems || [],
      );
      if (allGroupedItems.length === 0) return prev;

      if (newLayout === 'inline') {
        const headerItems = [...(activeH.items || [])];
        allGroupedItems.forEach((gKey) => {
          if (!headerItems.includes(gKey)) {
            headerItems.push(gKey);
          }
        });
        nextHeaders[hKey] = {
          ...activeH,
          items: headerItems,
        };

        if (nextHeaders['tools-header']) {
          const toolsItems = (nextHeaders['tools-header'].items || []).filter(
            (k) => !allGroupedItems.includes(k),
          );
          if (toolsItems.length === 0) {
            delete nextHeaders['tools-header'];
          } else {
            nextHeaders['tools-header'] = {
              ...nextHeaders['tools-header'],
              items: toolsItems,
            };
          }
        }
      } else {
        const headerItems = (activeH.items || []).filter(
          (k) => !allGroupedItems.includes(k),
        );
        nextHeaders[hKey] = {
          ...activeH,
          items: headerItems,
        };

        let hostPlacement = activeH.placement || 'top';
        if (hostPlacement === 'left' || hostPlacement === 'right') {
          hostPlacement = 'top';
        }

        const toolsHeader = nextHeaders['tools-header']
          ? { ...nextHeaders['tools-header'] }
          : {
              dataElement: 'tools-header',
              placement: hostPlacement,
              gap: 8,
              justifyContent: 'center',
              grow: 0,
              stroke: true,
              items: [],
            };

        const toolsItems = [...(toolsHeader.items || [])];
        allGroupedItems.forEach((gKey) => {
          if (!toolsItems.includes(gKey)) {
            toolsItems.push(gKey);
          }
        });
        toolsHeader.items = toolsItems;
        nextHeaders['tools-header'] = toolsHeader;
      }

      return {
        ...prev,
        modularHeaders: nextHeaders,
      };
    });
  };

  // 4d. Delete Ribbon Tab (RibbonItem)
  const handleDeleteRibbonTab = (ribbonKey) => {
    setConfig((prev) => {
      const nextComponents = { ...prev.modularComponents };
      const nextHeaders = { ...prev.modularHeaders };

      const tabComp = nextComponents[ribbonKey];
      const associatedGroupedItems =
        tabComp && Array.isArray(tabComp.groupedItems)
          ? [...tabComp.groupedItems]
          : [];

      for (const groupKey of associatedGroupedItems) {
        delete nextComponents[groupKey];
      }
      delete nextComponents[ribbonKey];

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
    if (selectedNode?.id === ribbonKey) {
      setSelectedNode(null);
    }
  };

  // 5. Add Component to Header, Ribbon Tab, Flyout, Submenu, or Popup
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
        const panelId = resolvePanelTarget(component);
        if (panelId) {
          const catalogDef = PANELS_CATALOG.find((p) => p.id === panelId);
          if (!nextPanels[panelId]) {
            nextPanels[panelId] = {
              dataElement: panelId,
              location:
                component.panelLocation ||
                catalogDef?.defaultLocation ||
                'left',
              render: catalogDef?.render || panelId,
            };
          } else if (component.panelLocation) {
            nextPanels[panelId] = {
              ...nextPanels[panelId],
              location: component.panelLocation,
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

      const isFlyoutPanelItem =
        componentType === 'flyoutPanel' || component?.type === 'flyoutPanel';

      if (!isFlyoutDivider && !isFlyoutPanelItem) {
        modularComponents[compKey] = component;
      }

      const effectiveHeaderKey =
        headerKey ||
        activeHeader ||
        Object.keys(modularHeaders).find((k) => k !== 'tools-header') ||
        'default-top-header';

      if (!modularHeaders[effectiveHeaderKey]) {
        modularHeaders[effectiveHeaderKey] = {
          dataElement: effectiveHeaderKey,
          placement: 'top',
          items: [],
        };
      }
      const headerObj = { ...modularHeaders[effectiveHeaderKey] };
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

        let ribbonGroupKey = headerObj.items.find((k) => {
          const c = modularComponents[k];
          return c?.type === 'ribbonGroup' || k === 'default-ribbon-group';
        });

        if (!ribbonGroupKey) {
          ribbonGroupKey = 'ribbon-group-' + effectiveHeaderKey;
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

        modularHeaders[effectiveHeaderKey] = headerObj;
        setSelectedRibbonTab(compKey);
        return { ...prev, modularComponents, modularHeaders };
      }

      if (
        targetLocationType === 'groupedItems' &&
        target.groupKey &&
        modularComponents[target.groupKey]
      ) {
        const groupComp = { ...modularComponents[target.groupKey] };
        const groupItems = Array.isArray(groupComp.items)
          ? [...groupComp.items]
          : [];
        if (!groupItems.includes(compKey)) {
          groupItems.push(compKey);
        }
        modularComponents[target.groupKey] = {
          ...groupComp,
          items: groupItems,
        };
      } else if (
        targetLocationType === 'ribbon' &&
        ribbonTabKey &&
        modularComponents[ribbonTabKey]
      ) {
        const tabComp = { ...modularComponents[ribbonTabKey] };
        const toolContainerKey = findRibbonTabToolContainer(
          ribbonTabKey,
          modularComponents,
        );

        if (toolContainerKey && modularComponents[toolContainerKey]) {
          const containerComp = { ...modularComponents[toolContainerKey] };
          const containerItems = Array.isArray(containerComp.items)
            ? [...containerComp.items]
            : [];
          if (!containerItems.includes(compKey)) {
            containerItems.push(compKey);
          }
          modularComponents[toolContainerKey] = {
            ...containerComp,
            items: containerItems,
          };
          return { ...prev, modularComponents, modularHeaders };
        }

        // If tab has no existing tool container, create one
        let primaryGroupKey =
          Array.isArray(tabComp.groupedItems) && tabComp.groupedItems.length > 0
            ? tabComp.groupedItems[0]
            : null;

        if (!primaryGroupKey) {
          const cleanName = ribbonTabKey
            .replace(/RibbonItem$/i, '')
            .replace(/^toolbarGroup-/, '')
            .replace(/^ribbon-/, '');
          primaryGroupKey = `${cleanName.charAt(0).toLowerCase()}${cleanName.slice(1)}GroupedItems`;
          tabComp.groupedItems = [primaryGroupKey];
          modularComponents[ribbonTabKey] = tabComp;
        }

        const groupComp = modularComponents[primaryGroupKey] || {
          type: 'groupedItems',
          dataElement: primaryGroupKey,
          items: [],
          gap: 12,
          grow: 0,
          justifyContent: 'center',
          alwaysVisible: false,
        };

        const existingItems = Array.isArray(groupComp.items)
          ? [...groupComp.items]
          : [];
        if (!existingItems.includes(compKey)) {
          existingItems.push(compKey);
        }

        modularComponents[primaryGroupKey] = {
          ...groupComp,
          items: existingItems,
        };

        if (!modularHeaders['tools-header']) {
          modularHeaders['tools-header'] = {
            dataElement: 'tools-header',
            placement: 'top',
            justifyContent: 'center',
            grow: 0,
            gap: 12,
            position: 'end',
            items: [primaryGroupKey],
          };
        } else {
          const toolsHeader = { ...modularHeaders['tools-header'] };
          const thItems = Array.isArray(toolsHeader.items)
            ? [...toolsHeader.items]
            : [];
          if (!thItems.includes(primaryGroupKey)) {
            thItems.push(primaryGroupKey);
          }
          toolsHeader.items = thItems;
          modularHeaders['tools-header'] = toolsHeader;
        }
      } else if (targetLocationType === 'submenu' && target.parentKey) {
        const parentKey = target.parentKey;
        const parentComp = modularComponents[parentKey] || {
          type: 'customButton',
          dataElement: parentKey,
          children: [],
        };
        const currentChildren = Array.isArray(parentComp.children)
          ? [...parentComp.children]
          : [];
        currentChildren.push(compKey);
        modularComponents[parentKey] = {
          ...parentComp,
          children: currentChildren,
        };
      } else if (targetLocationType === 'flyout' && target.flyoutKey) {
        const flyoutKey = target.flyoutKey;
        const currentFlyout = nextFlyouts[flyoutKey] || {
          dataElement: flyoutKey,
          items: [],
        };
        const currentItems = Array.isArray(currentFlyout.items)
          ? [...currentFlyout.items]
          : [];
        if (isFlyoutPanelItem) {
          currentItems.push({
            dataElement: component.render || compKey,
            render: component.render || compKey,
          });
        } else {
          currentItems.push(isFlyoutDivider ? 'divider' : compKey);
        }
        nextFlyouts[flyoutKey] = {
          ...currentFlyout,
          items: currentItems,
        };
      } else {
        const { visibleItems, inlineRibbonGroupedKeys } =
          getFlattenedHeaderItems(
            effectiveHeaderKey,
            modularHeaders,
            modularComponents,
          );
        headerObj.items = [
          ...visibleItems,
          compKey,
          ...inlineRibbonGroupedKeys,
        ];
      }

      const nextPanels = { ...prev.panels };
      const panelId = isFlyoutPanelItem ? null : resolvePanelTarget(component);
      if (panelId) {
        const catalogDef = PANELS_CATALOG.find((p) => p.id === panelId);
        if (!nextPanels[panelId]) {
          nextPanels[panelId] = {
            dataElement: panelId,
            location:
              component.panelLocation || catalogDef?.defaultLocation || 'left',
            render: catalogDef?.render || panelId,
          };
        } else if (component.panelLocation) {
          nextPanels[panelId] = {
            ...nextPanels[panelId],
            location: component.panelLocation,
          };
        }
      }

      modularHeaders[effectiveHeaderKey] = headerObj;
      return {
        ...prev,
        modularComponents,
        modularHeaders,
        panels: nextPanels,
        flyouts: nextFlyouts,
      };
    });
  };

  const handleQuickCreateRibbonTab = (targetHeaderKey) => {
    const hKey = targetHeaderKey || activeHeader || 'default-top-header';
    const existingIds = collectAllExistingIds(config);
    const dataElement = generateUniqueDataElement(
      'customRibbonItem',
      existingIds,
    );
    const groupKey = generateUniqueDataElement(
      'customGroupedItems',
      existingIds,
    );

    handleAddComponent({
      target: {
        headerKey: hKey,
        targetLocationType: 'header',
      },
      componentType: 'ribbonItem',
      component: {
        type: 'ribbonItem',
        dataElement,
        label: 'New Tab',
        title: 'New Tab',
        toolbarGroup: dataElement,
        groupedItems: [groupKey],
        items: [],
      },
    });
    setSelectedNode({
      type: 'ribbonTab',
      id: dataElement,
      headerKey: hKey,
      groupKey,
      label: 'New Tab',
    });
    setActiveTarget({
      key: `ribbon:${hKey}:${dataElement}`,
      type: 'ribbon',
      headerKey: hKey,
      ribbonTabKey: dataElement,
      label: 'Tab: New Tab',
    });
  };

  // 6. Delete Component
  const handleDeleteTool = (itemKey, targetContext = {}) => {
    setConfig((prev) => {
      const modularComponents = { ...prev.modularComponents };
      const modularHeaders = { ...prev.modularHeaders };
      const nextFlyouts = { ...prev.flyouts };

      const {
        type,
        groupKey,
        ribbonKey,
        headerKey,
        flyoutKey,
        parentKey,
        index,
      } = targetContext;

      if (type === 'groupedItems' && groupKey && modularComponents[groupKey]) {
        const gItems = [...(modularComponents[groupKey].items || [])];
        if (typeof index === 'number' && index >= 0 && index < gItems.length) {
          gItems.splice(index, 1);
        } else {
          const foundIdx = gItems.indexOf(itemKey);
          if (foundIdx >= 0) gItems.splice(foundIdx, 1);
        }
        modularComponents[groupKey] = {
          ...modularComponents[groupKey],
          items: gItems,
        };
      } else if (type === 'flyout' && flyoutKey && nextFlyouts[flyoutKey]) {
        const fItems = [...(nextFlyouts[flyoutKey].items || [])];
        if (typeof index === 'number' && index >= 0 && index < fItems.length) {
          fItems.splice(index, 1);
        } else {
          const foundIdx = fItems.findIndex((entry) =>
            typeof entry === 'object'
              ? entry?.dataElement === itemKey || entry?.render === itemKey
              : entry === itemKey,
          );
          if (foundIdx >= 0) fItems.splice(foundIdx, 1);
        }
        nextFlyouts[flyoutKey] = {
          ...nextFlyouts[flyoutKey],
          items: fItems,
        };
      } else if (
        type === 'submenu' &&
        parentKey &&
        modularComponents[parentKey]
      ) {
        const subChildren = [...(modularComponents[parentKey].children || [])];
        if (
          typeof index === 'number' &&
          index >= 0 &&
          index < subChildren.length
        ) {
          subChildren.splice(index, 1);
        } else {
          const foundIdx = subChildren.indexOf(itemKey);
          if (foundIdx >= 0) subChildren.splice(foundIdx, 1);
        }
        modularComponents[parentKey] = {
          ...modularComponents[parentKey],
          children: subChildren,
        };
      } else if (
        type === 'ribbon' &&
        ribbonKey &&
        modularComponents[ribbonKey]
      ) {
        const tabComp = modularComponents[ribbonKey];
        let removed = false;

        // 1. Check if tool is inside any nested or direct groupedItems of this ribbon tab
        if (Array.isArray(tabComp.groupedItems)) {
          for (const gk of tabComp.groupedItems) {
            const g = modularComponents[gk];
            if (g && Array.isArray(g.items)) {
              if (g.items.includes(itemKey)) {
                modularComponents[gk] = {
                  ...g,
                  items: g.items.filter((k) => k !== itemKey),
                };
                removed = true;
                break;
              }
              for (const subKey of g.items) {
                const sub = modularComponents[subKey];
                if (
                  sub?.type === 'groupedItems' &&
                  Array.isArray(sub.items) &&
                  sub.items.includes(itemKey)
                ) {
                  modularComponents[subKey] = {
                    ...sub,
                    items: sub.items.filter((k) => k !== itemKey),
                  };
                  removed = true;
                  break;
                }
              }
              if (removed) break;
            }
          }
        }

        // 2. Check tab items directly
        if (
          !removed &&
          Array.isArray(tabComp.items) &&
          tabComp.items.includes(itemKey)
        ) {
          modularComponents[ribbonKey] = {
            ...tabComp,
            items: tabComp.items.filter((k) => k !== itemKey),
          };
        }
      } else if (type === 'header' && headerKey && modularHeaders[headerKey]) {
        const { visibleItems, inlineRibbonGroupedKeys } =
          getFlattenedHeaderItems(headerKey, modularHeaders, modularComponents);
        const nextVisible = [...visibleItems];
        if (
          typeof index === 'number' &&
          index >= 0 &&
          index < nextVisible.length
        ) {
          nextVisible.splice(index, 1);
        } else {
          const foundIdx = nextVisible.indexOf(itemKey);
          if (foundIdx >= 0) nextVisible.splice(foundIdx, 1);
        }
        modularHeaders[headerKey] = {
          ...modularHeaders[headerKey],
          items: [...nextVisible, ...inlineRibbonGroupedKeys],
        };
      } else {
        // Fallback global removal
        for (const [hKey, hConfig] of Object.entries(modularHeaders)) {
          if (Array.isArray(hConfig?.items)) {
            modularHeaders[hKey] = {
              ...hConfig,
              items: hConfig.items.filter((k) => k !== itemKey),
            };
          }
        }
      }

      // Prune component definition if unreferenced
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
          if (Array.isArray(c?.children) && c.children.includes(itemKey)) {
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

      return {
        ...prev,
        modularComponents,
        modularHeaders,
        flyouts: nextFlyouts,
      };
    });

    if (selectedNode?.id === itemKey) {
      setSelectedNode(null);
    }
  };

  // 7. HTML5 Drag-and-Drop Reorder List Handler
  const handleReorderList = useCallback(
    (contextPayload, fromIndex, toIndex) => {
      if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;

      setConfig((prev) => {
        const modularComponents = { ...prev.modularComponents };
        const modularHeaders = { ...prev.modularHeaders };
        const nextFlyouts = { ...prev.flyouts };
        const nextPopups = { ...prev.popups };

        const reorderArray = (arr, from, to) => {
          const list = [...arr];
          if (from >= list.length) return list;
          const [moved] = list.splice(from, 1);
          const clampedTo = Math.max(0, Math.min(list.length, to));
          list.splice(clampedTo, 0, moved);
          return list;
        };

        const {
          type,
          groupKey,
          headerKey,
          ribbonKey,
          flyoutKey,
          parentKey,
          popupKey,
        } = contextPayload;

        if (
          type === 'groupedItems' &&
          groupKey &&
          modularComponents[groupKey] &&
          Array.isArray(modularComponents[groupKey].items)
        ) {
          modularComponents[groupKey] = {
            ...modularComponents[groupKey],
            items: reorderArray(
              modularComponents[groupKey].items,
              fromIndex,
              toIndex,
            ),
          };
        } else if (
          type === 'header' &&
          headerKey &&
          modularHeaders[headerKey]
        ) {
          const { visibleItems, inlineRibbonGroupedKeys } =
            getFlattenedHeaderItems(
              headerKey,
              modularHeaders,
              modularComponents,
            );
          const reordered = reorderArray(visibleItems, fromIndex, toIndex);
          modularHeaders[headerKey] = {
            ...modularHeaders[headerKey],
            items: [...reordered, ...inlineRibbonGroupedKeys],
          };
        } else if (
          type === 'ribbonTabs' &&
          headerKey &&
          modularHeaders[headerKey]
        ) {
          const { visibleItems } = getFlattenedHeaderItems(
            headerKey,
            modularHeaders,
            modularComponents,
          );
          const rgKey = visibleItems.find((k) => {
            const c = modularComponents[k];
            return c?.type === 'ribbonGroup' || k === 'default-ribbon-group';
          });
          if (rgKey && modularComponents[rgKey]) {
            modularComponents[rgKey] = {
              ...modularComponents[rgKey],
              items: reorderArray(
                modularComponents[rgKey].items || [],
                fromIndex,
                toIndex,
              ),
            };
          }
        } else if (
          type === 'ribbon' &&
          ribbonKey &&
          modularComponents[ribbonKey]
        ) {
          const toolContainerKey = findRibbonTabToolContainer(
            ribbonKey,
            modularComponents,
          );
          if (
            toolContainerKey &&
            modularComponents[toolContainerKey] &&
            Array.isArray(modularComponents[toolContainerKey].items)
          ) {
            modularComponents[toolContainerKey] = {
              ...modularComponents[toolContainerKey],
              items: reorderArray(
                modularComponents[toolContainerKey].items,
                fromIndex,
                toIndex,
              ),
            };
          } else {
            const { toolKeys, primaryGroupKey } = getFlattenedRibbonTabTools(
              ribbonKey,
              modularComponents,
            );
            const reorderedTools = reorderArray(toolKeys, fromIndex, toIndex);
            if (primaryGroupKey && modularComponents[primaryGroupKey]) {
              modularComponents[primaryGroupKey] = {
                ...modularComponents[primaryGroupKey],
                items: reorderedTools,
              };
              modularComponents[ribbonKey] = {
                ...modularComponents[ribbonKey],
                groupedItems: [primaryGroupKey],
                items: [],
              };
            } else {
              modularComponents[ribbonKey] = {
                ...modularComponents[ribbonKey],
                items: reorderedTools,
              };
            }
          }
        } else if (type === 'flyout' && flyoutKey && nextFlyouts[flyoutKey]) {
          nextFlyouts[flyoutKey] = {
            ...nextFlyouts[flyoutKey],
            items: reorderArray(
              nextFlyouts[flyoutKey].items || [],
              fromIndex,
              toIndex,
            ),
          };
        } else if (
          type === 'submenu' &&
          parentKey &&
          modularComponents[parentKey]
        ) {
          modularComponents[parentKey] = {
            ...modularComponents[parentKey],
            children: reorderArray(
              modularComponents[parentKey].children || [],
              fromIndex,
              toIndex,
            ),
          };
        } else if (type === 'popup' && popupKey) {
          nextPopups[popupKey] = reorderArray(
            nextPopups[popupKey] || [],
            fromIndex,
            toIndex,
          );
        }

        return {
          ...prev,
          modularComponents,
          modularHeaders,
          flyouts: nextFlyouts,
          popups: nextPopups,
        };
      });
    },
    [],
  );

  // 8. In-Place Component Property Updates from Inspector
  const handleUpdateComponent = useCallback((compId, updates) => {
    setConfig((prev) => {
      const nextComponents = { ...prev.modularComponents };
      const existing = nextComponents[compId] || {
        type: 'customButton',
        dataElement: compId,
      };
      const updated = { ...existing, ...updates };
      nextComponents[compId] = updated;

      // If toggle target updated to a panel, ensure panel exists in config.panels
      const nextPanels = { ...prev.panels };
      const panelId = resolvePanelTarget(updated);
      if (panelId && !prev.flyouts?.[panelId]) {
        const catalogDef = PANELS_CATALOG.find((p) => p.id === panelId);
        if (catalogDef && !nextPanels[panelId]) {
          nextPanels[panelId] = {
            dataElement: panelId,
            render: catalogDef.render || panelId,
            location: catalogDef.defaultLocation || 'left',
          };
        }
      }

      return {
        ...prev,
        modularComponents: nextComponents,
        panels: nextPanels,
      };
    });
  }, []);

  // 9. Side TabPanel & Flyout handlers
  const handleAddTabPanel = ({
    dataElement,
    location,
    panelsList,
    toggleLabel,
    targetHeader,
  }) => {
    setConfig((prev) => {
      const nextPanels = { ...prev.panels };

      panelsList.forEach((item) => {
        if (!nextPanels[item.render]) {
          nextPanels[item.render] = {
            dataElement: item.render,
            render: item.render,
            location: location || 'left',
          };
        }
      });

      nextPanels[dataElement] = {
        dataElement,
        render: 'tabPanel',
        location: location || 'left',
        panelsList,
      };

      const nextComponents = { ...prev.modularComponents };
      const nextHeaders = { ...prev.modularHeaders };

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
    setSelectedNode({
      type: 'panel',
      id: dataElement,
      label: getFriendlyComponentName(dataElement, { render: 'tabPanel' }),
    });
  };

  const handleQuickCreateTabPanel = () => {
    const existingIds = collectAllExistingIds(config);
    const dataElement = generateUniqueDataElement('tabPanel', existingIds);
    handleAddTabPanel({
      dataElement,
      location: 'left',
      panelsList: [
        { render: 'thumbnailsPanel' },
        { render: 'outlinesPanel' },
        { render: 'bookmarksPanel' },
      ],
      toggleLabel: 'Sidebar',
      targetHeader: activeHeader,
    });
  };

  const handleUpdateTabPanelChildren = (tabPanelId, nextPanelsList) => {
    setConfig((prev) => {
      const nextPanels = { ...prev.panels };
      const current = nextPanels[tabPanelId] || {
        dataElement: tabPanelId,
        render: 'tabPanel',
        location: 'left',
      };
      nextPanelsList.forEach((item) => {
        if (!nextPanels[item.render]) {
          nextPanels[item.render] = {
            dataElement: item.render,
            render: item.render,
            location: current.location || 'left',
          };
        }
      });
      nextPanels[tabPanelId] = {
        ...current,
        panelsList: nextPanelsList,
      };
      return { ...prev, panels: nextPanels };
    });
  };

  const handleChangePanelLocation = (panelId, newLocation) => {
    setConfig((prev) => {
      const nextPanels = { ...prev.panels };
      const catalogDef = PANELS_CATALOG.find((p) => p.id === panelId);
      const targetPanel = nextPanels[panelId] || {
        dataElement: panelId,
        render: catalogDef?.render || panelId,
        location: newLocation,
      };
      nextPanels[panelId] = {
        ...targetPanel,
        location: newLocation,
      };

      if (
        targetPanel.render === 'tabPanel' &&
        Array.isArray(targetPanel.panelsList)
      ) {
        targetPanel.panelsList.forEach((sub) => {
          if (sub.render && nextPanels[sub.render]) {
            nextPanels[sub.render] = {
              ...nextPanels[sub.render],
              location: newLocation,
            };
          }
        });
      }

      return {
        ...prev,
        panels: nextPanels,
      };
    });
  };

  const handleMovePanelBetweenSidebarAndFlyout = (
    panelId,
    targetMode,
    flyoutKey,
    sourceFlyoutKey,
  ) => {
    setConfig((prev) => {
      const nextPanels = { ...prev.panels };
      const nextFlyouts = { ...prev.flyouts };
      const catalogDef = PANELS_CATALOG.find(
        (p) => p.id === panelId || p.render === panelId,
      );
      const renderName = catalogDef?.render || panelId;

      const isPanelMatch = (item) =>
        typeof item === 'object'
          ? item?.render === renderName ||
            item?.dataElement === panelId ||
            item?.dataElement === renderName
          : item === panelId || item === renderName;

      // Clean up the panel from other flyouts to prevent duplicates
      Object.keys(nextFlyouts).forEach((fKey) => {
        if (targetMode === 'flyout' && fKey === flyoutKey) return;
        if (Array.isArray(nextFlyouts[fKey]?.items)) {
          const filtered = nextFlyouts[fKey].items.filter(
            (item) => !isPanelMatch(item),
          );
          if (filtered.length !== nextFlyouts[fKey].items.length) {
            nextFlyouts[fKey] = {
              ...nextFlyouts[fKey],
              items: filtered,
            };
          }
        }
      });

      if (targetMode === 'flyout' && flyoutKey && nextFlyouts[flyoutKey]) {
        delete nextPanels[panelId];
        delete nextPanels[renderName];
        const fItems = [...(nextFlyouts[flyoutKey].items || [])];
        const alreadyIn = fItems.some(isPanelMatch);
        if (!alreadyIn) {
          fItems.push({
            dataElement: renderName,
            render: renderName,
          });
        }
        nextFlyouts[flyoutKey] = {
          ...nextFlyouts[flyoutKey],
          items: fItems,
        };
      } else {
        // Move to sidebar
        nextPanels[panelId] = {
          dataElement: panelId,
          render: renderName,
          location: catalogDef?.defaultLocation || 'left',
        };
      }

      return {
        ...prev,
        panels: nextPanels,
        flyouts: nextFlyouts,
      };
    });

    setSelectedNode((prev) =>
      prev
        ? {
            ...prev,
            parentId: targetMode === 'flyout' ? flyoutKey : undefined,
            flyoutKey: targetMode === 'flyout' ? flyoutKey : undefined,
            targetContext:
              targetMode === 'flyout'
                ? {
                    ...(prev.targetContext || {}),
                    type: 'flyout',
                    flyoutKey,
                  }
                : {
                    ...(prev.targetContext || {}),
                    type: 'panel',
                    flyoutKey: undefined,
                  },
          }
        : null,
    );
  };

  const handleDeletePanel = (panelId) => {
    setConfig((prev) => {
      const nextPanels = { ...prev.panels };
      delete nextPanels[panelId];
      return { ...prev, panels: nextPanels };
    });
    if (selectedNode?.id === panelId) {
      setSelectedNode(null);
    }
  };

  const handleAddFlyout = ({
    dataElement,
    label,
    title,
    icon,
    targetHeader,
    targetLocationType,
    targetPopup,
    targetRibbonTab,
    createToggle = true,
  }) => {
    setConfig((prev) => {
      const nextFlyouts = { ...prev.flyouts };
      const nextComponents = { ...prev.modularComponents };
      const nextHeaders = { ...prev.modularHeaders };
      const nextPopups = { ...prev.popups };

      nextFlyouts[dataElement] = {
        dataElement,
        items: [],
      };

      if (createToggle) {
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

        nextComponents[toggleKey] = toggleButtonObj;

        if (targetLocationType === 'popup' && targetPopup) {
          const popupItems = Array.isArray(nextPopups[targetPopup])
            ? [...nextPopups[targetPopup]]
            : (DEFAULT_POPUPS[targetPopup] || []).map((i) => ({ ...i }));
          popupItems.push(toggleButtonObj);
          nextPopups[targetPopup] = popupItems;
        } else if (
          targetLocationType === 'ribbon' &&
          targetRibbonTab &&
          nextComponents[targetRibbonTab]
        ) {
          const { toolKeys, primaryGroupKey } = getFlattenedRibbonTabTools(
            targetRibbonTab,
            nextComponents,
          );
          const tabComp = { ...nextComponents[targetRibbonTab] };
          let groupContainerKey = primaryGroupKey;

          if (!groupContainerKey) {
            const cleanName = targetRibbonTab
              .replace(/RibbonItem$/i, '')
              .replace(/^toolbarGroup-/, '')
              .replace(/^ribbon-/, '');
            groupContainerKey = `${cleanName.charAt(0).toLowerCase()}${cleanName.slice(1)}GroupedItems`;
          }

          tabComp.groupedItems = [groupContainerKey];
          tabComp.items = [];
          nextComponents[targetRibbonTab] = tabComp;

          const groupComp = nextComponents[groupContainerKey] || {
            type: 'groupedItems',
            dataElement: groupContainerKey,
            items: [],
            gap: 12,
            grow: 0,
            justifyContent: 'center',
            alwaysVisible: false,
          };

          nextComponents[groupContainerKey] = {
            ...groupComp,
            items: [...toolKeys, toggleKey],
          };

          if (!nextHeaders['tools-header']) {
            nextHeaders['tools-header'] = {
              dataElement: 'tools-header',
              placement: 'top',
              justifyContent: 'center',
              grow: 0,
              gap: 12,
              position: 'end',
              items: [groupContainerKey],
            };
          } else {
            const toolsHeader = { ...nextHeaders['tools-header'] };
            const thItems = Array.isArray(toolsHeader.items)
              ? [...toolsHeader.items]
              : [];
            if (!thItems.includes(groupContainerKey)) {
              thItems.push(groupContainerKey);
            }
            toolsHeader.items = thItems;
            nextHeaders['tools-header'] = toolsHeader;
          }
        } else {
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
    setSelectedNode({
      type: 'flyout',
      id: dataElement,
      label: label || dataElement,
    });
    setActiveTarget({
      key: `flyout:${dataElement}`,
      type: 'flyout',
      flyoutKey: dataElement,
      label: `Flyout: ${label || dataElement}`,
    });
  };

  const handleQuickCreateFlyout = () => {
    const existingIds = collectAllExistingIds(config);
    const dataElement = generateUniqueDataElement('customFlyout', existingIds);
    handleAddFlyout({
      dataElement,
      label: 'Custom Menu',
      title: 'Custom Menu',
      icon: 'icon-tools-more',
      targetHeader: activeHeader,
      targetLocationType: 'header',
      createToggle: true,
    });
  };

  const handleDeleteFlyout = (flyoutId) => {
    setConfig((prev) => {
      const nextFlyouts = { ...prev.flyouts };
      if (flyoutId === 'viewControlsFlyout') {
        nextFlyouts[flyoutId] = {
          ...(nextFlyouts[flyoutId] || { dataElement: flyoutId }),
          items: [],
        };
        return {
          ...prev,
          flyouts: nextFlyouts,
        };
      }
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
    if (selectedNode?.id === flyoutId) {
      setSelectedNode(null);
    }
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

  const handleRemovePopupItem = (popupKey, itemIndex) => {
    setConfig((prev) => {
      const list = Array.isArray(prev.popups?.[popupKey])
        ? [...prev.popups[popupKey]]
        : [];
      list.splice(itemIndex, 1);
      return {
        ...prev,
        popups: {
          ...prev.popups,
          [popupKey]: list,
        },
      };
    });
    if (
      selectedNode?.type === 'popupItem' &&
      selectedNode?.popupKey === popupKey &&
      selectedNode?.index === itemIndex
    ) {
      setSelectedNode({ type: 'popup', id: popupKey, label: popupKey });
    }
  };

  const availableTargets = React.useMemo(
    () => buildAvailableTargets(config),
    [config],
  );
  const resolvedTarget = resolveTargetContainer(
    activeTarget,
    config,
    availableTargets,
  );

  const handleStageItem = useCallback(
    (itemSpec, targetOverride) => {
      const target =
        targetOverride ||
        resolveTargetContainer(activeTarget, config, availableTargets);
      setStagedDraft(defaultDraftFor(itemSpec, config, target));
      setLeftPaneMode('library');
    },
    [activeTarget, config, availableTargets],
  );

  const handleCommitDraft = () => {
    if (!stagedDraft) return;
    const target = resolveTargetContainer(
      activeTarget,
      config,
      availableTargets,
    );
    const commit = buildCommitFromDraft(stagedDraft, target, config);
    if (!commit) return;

    if (commit.actionType === 'addComponent') {
      handleAddComponent(commit.payload);
    } else if (commit.actionType === 'addHeader') {
      handleAddHeader(commit.payload);
    } else if (commit.actionType === 'addFlyout') {
      handleAddFlyout(commit.payload);
    } else if (commit.actionType === 'addTabPanel') {
      handleAddTabPanel(commit.payload);
    }

    if (commit.nextTarget) {
      setActiveTarget(commit.nextTarget);
    }

    if (commit.createdNode) {
      setSelectedNode(commit.createdNode);
    }

    setStagedDraft(null);
    setLeftPaneMode('tree');
  };

  // Export & Import JSON
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
        logNewWarnings(warnings, true);
        setConfig(normalized);
        const headerKeys = Object.keys(normalized.modularHeaders || {}).filter(
          (k) => k !== 'tools-header',
        );
        if (headerKeys.length > 0) {
          const firstH = headerKeys[0];
          setActiveHeader(firstH);
          setSelectedNode({
            type: 'header',
            id: firstH,
            label: getFriendlyComponentName(
              firstH,
              normalized.modularHeaders[firstH],
            ),
          });
          setActiveTarget({
            type: 'header',
            headerKey: firstH,
            label: `Header: ${getFriendlyComponentName(
              firstH,
              normalized.modularHeaders[firstH],
            )}`,
          });
        }
        applyConfigToViewer(normalized);
      } catch (err) {
        alert('Invalid JSON configuration file: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="studio-shell">
      {/* 1. STUDIO TOP BAR */}
      <header className="studio-topbar">
        <div className="studio-topbar-left">
          <h1 className="studio-brand">WebViewer Modular UI Studio</h1>
          <button
            type="button"
            className={`studio-btn ${showStudio ? 'active' : ''}`}
            onClick={() => setShowStudio((s) => !s)}
          >
            {showStudio ? 'Hide Studio Panels' : 'Show Studio Panels'}
          </button>
        </div>

        <div className="studio-topbar-right">
          <label
            className="studio-autosync-label"
            title="Automatically sync changes to WebViewer"
          >
            <input
              type="checkbox"
              checked={autoApply}
              onChange={(e) => setAutoApply(e.target.checked)}
            />
            <span>Auto-apply</span>
          </label>

          {!autoApply && (
            <button
              type="button"
              className="studio-btn primary"
              onClick={() => applyConfigToViewer(config)}
            >
              Apply to Viewer
            </button>
          )}

          <button
            type="button"
            className="studio-btn"
            onClick={restoreDefault}
            title="Restore standard full WebViewer UI"
          >
            Restore Default
          </button>

          <button
            type="button"
            className="studio-btn danger"
            onClick={resetToBlank}
            title="Remove all headers, toolbars, and panels for a blank canvas"
          >
            Reset to Blank
          </button>

          <button
            type="button"
            className="studio-btn"
            onClick={handleExportJSON}
          >
            Export JSON
          </button>

          <button
            type="button"
            className="studio-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            Import JSON
          </button>

          <button
            type="button"
            className={`studio-btn ${isPreviewOpen ? 'active' : ''}`}
            onClick={() => setIsPreviewOpen((o) => !o)}
          >
            JSON
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            onChange={handleImportFile}
            hidden
          />
        </div>
      </header>

      {/* 2. 3-PANE STUDIO WORKSPACE */}
      <div className={`studio-workspace ${resizingSide ? 'is-resizing' : ''}`}>
        {/* LEFT PANE: OUTLINE TREE & COMPONENT LIBRARY */}
        {showStudio && (
          <>
            <LeftStudioPane
              width={leftPaneWidth}
              mode={leftPaneMode}
              onModeChange={handleModeChange}
              config={config}
              selectedNode={selectedNode}
              onSelectNode={handleSelectNode}
              activeTarget={activeTarget}
              onChangeTarget={setActiveTarget}
              onOpenAddForTarget={handleOpenAddForTarget}
              onCreateHeader={() => handleStageItem({ kind: 'header' })}
              onCreateRibbonTab={(headerKey) =>
                handleStageItem(
                  { kind: 'ribbonTab' },
                  headerKey
                    ? resolveTargetContainer(
                        { type: 'header', headerKey },
                        config,
                        availableTargets,
                      )
                    : undefined,
                )
              }
              onCreateFlyout={() => handleStageItem({ kind: 'flyout' })}
              onCreateTabPanel={() => handleStageItem({ kind: 'tabPanel' })}
              stagedDraft={stagedDraft}
              onStageItem={handleStageItem}
              onDeleteHeader={handleDeleteHeader}
              onDeleteRibbonTab={handleDeleteRibbonTab}
              onDeleteFlyout={handleDeleteFlyout}
              onDeleteTool={handleDeleteTool}
              onDeletePanel={handleDeletePanel}
              onRemovePopupItem={handleRemovePopupItem}
              onReorderList={handleReorderList}
            />
            <div
              className={`studio-resize-handle ${resizingSide === 'left' ? 'active' : ''}`}
              onMouseDown={() => setResizingSide('left')}
              title="Drag to resize left panel"
            />
          </>
        )}

        {/* CENTER PANE: LIVE WEBVIEWER CANVAS */}
        <main className="studio-center-pane">
          <div
            className="webviewer"
            ref={viewerRef}
            style={{ flex: 1, minWidth: 0, minHeight: 0 }}
          />

          {isPreviewOpen && (
            <div className="studio-json-drawer">
              <div className="studio-json-header">
                <div className="studio-json-header-title">
                  <span>Configuration JSON Preview</span>
                  <span className="studio-json-badge">
                    {configLineCount} lines
                  </span>
                </div>
                <div className="studio-json-header-actions">
                  <button
                    type="button"
                    className="studio-btn studio-json-copy-btn"
                    onClick={handleCopyJSON}
                  >
                    {jsonCopied ? '✓ Copied' : 'Copy JSON'}
                  </button>
                  <button
                    type="button"
                    className="studio-btn"
                    onClick={() => setIsPreviewOpen(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
              <div className="studio-json-body">
                <ConfigPreview config={config} />
              </div>
            </div>
          )}
        </main>

        {/* RIGHT PANE: CONTEXTUAL PROPERTIES INSPECTOR */}
        {showStudio && (
          <>
            <div
              className={`studio-resize-handle ${resizingSide === 'right' ? 'active' : ''}`}
              onMouseDown={() => setResizingSide('right')}
              title="Drag to resize right panel"
            />
            <PropertiesInspector
              width={rightPaneWidth}
              config={config}
              selectedNode={selectedNode}
              stagedDraft={stagedDraft}
              currentTarget={resolvedTarget}
              availableTargets={availableTargets}
              onChangeTarget={setActiveTarget}
              onChangeDraft={setStagedDraft}
              onCommitDraft={handleCommitDraft}
              onUpdateHeader={handleUpdateHeader}
              onUpdateToolsHeader={handleUpdateToolsHeader}
              getRibbonLayoutForHeader={getRibbonLayoutForHeader}
              onSetRibbonLayout={handleSetRibbonLayout}
              onUpdateComponent={handleUpdateComponent}
              onChangePanelLocation={handleChangePanelLocation}
              onMovePanelBetweenSidebarAndFlyout={
                handleMovePanelBetweenSidebarAndFlyout
              }
              onUpdateTabPanelChildren={handleUpdateTabPanelChildren}
              onUpdatePopup={handleUpdatePopup}
              onDeleteHeader={handleDeleteHeader}
              onDeleteRibbonTab={handleDeleteRibbonTab}
              onDeleteFlyout={handleDeleteFlyout}
              onDeleteTool={handleDeleteTool}
              onDeletePanel={handleDeletePanel}
              onRemovePopupItem={handleRemovePopupItem}
            />
          </>
        )}
      </div>
    </div>
  );
}
