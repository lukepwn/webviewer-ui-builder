import React, { useState, useMemo } from 'react';
import {
  TOOLS_CATALOG,
  PRESET_BUTTONS_CATALOG,
  PANELS_CATALOG,
  LAYOUT_ELEMENTS_CATALOG,
  POPUPS_CATALOG,
  BUILTIN_POPUP_ITEMS_CATALOG,
  TAB_PANEL_SUPPORTED_TABS,
} from '../../constants/webviewerCatalog';
import {
  TOOL_ACTION_PREFIX,
  SUPPORTED_FLYOUT_PANEL_RENDERS,
} from '../../sdk/sdkRules';
import {
  collectAllExistingIds,
  generateUniqueDataElement,
} from '../../utils/idUtils';
import { getFriendlyComponentName } from '../../utils/labelUtils';

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'tool', label: 'Tools' },
  { id: 'preset', label: 'Presets' },
  { id: 'layout', label: 'Controls & Layout' },
  { id: 'panel', label: 'Panels' },
  { id: 'interactive', label: 'Custom & Toggles' },
  { id: 'popup', label: 'Popup Actions' },
  { id: 'container', label: 'Containers' },
];

export default function ComponentLibrary({
  config,
  activeTarget,
  onChangeTarget,
  onDone,
  onAddComponent,
  onAddHeader,
  onAddFlyout,
  onAddTabPanel,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [expandedBuilderId, setExpandedBuilderId] = useState(null);
  const [justAddedId, setJustAddedId] = useState(null);

  // Inline builder form states for custom/container items
  const [customLabel, setCustomLabel] = useState('Custom Action');
  const [customIcon, setCustomIcon] = useState('icon-tools-more');
  const [customToolAction, setCustomToolAction] = useState('');
  const [toggleTarget, setToggleTarget] = useState('viewControlsFlyout');
  const [submenuLabel, setSubmenuLabel] = useState('More Tools');
  const [newHeaderPlacement, setNewHeaderPlacement] = useState('top');
  const [newTabLabel, setNewTabLabel] = useState('Review');
  const [newFlyoutLabel, setNewFlyoutLabel] = useState('Custom Menu');
  const [newTabPanelLocation, setNewTabPanelLocation] = useState('left');

  const existingIds = useMemo(() => collectAllExistingIds(config), [config]);

  const userHeaderKeys = useMemo(
    () =>
      Object.keys(config.modularHeaders || {}).filter(
        (k) => k !== 'tools-header',
      ),
    [config.modularHeaders],
  );

  // Build list of all available target containers so user can see/switch in the banner
  const availableTargets = useMemo(() => {
    const list = [];

    userHeaderKeys.forEach((hKey) => {
      const hDef = config.modularHeaders[hKey];
      const hName = getFriendlyComponentName(hKey, hDef);
      list.push({
        key: `header:${hKey}`,
        type: 'header',
        headerKey: hKey,
        label: `Header: ${hName}`,
      });

      // Extract ribbon tabs in this header
      const items = Array.isArray(hDef?.items) ? hDef.items : [];
      items.forEach((entry) => {
        const k = typeof entry === 'string' ? entry : entry?.dataElement;
        const comp = config.modularComponents?.[k];
        if (comp?.type === 'ribbonGroup' || k === 'default-ribbon-group') {
          (comp?.items || []).forEach((tEntry) => {
            const tKey =
              typeof tEntry === 'string' ? tEntry : tEntry?.dataElement;
            if (!tKey) return;
            const tComp = config.modularComponents?.[tKey];
            const tName = getFriendlyComponentName(tKey, tComp);
            list.push({
              key: `ribbon:${hKey}:${tKey}`,
              type: 'ribbon',
              headerKey: hKey,
              ribbonTabKey: tKey,
              label: `Tab: ${tName} (${hName})`,
            });
          });
        } else if (comp?.type === 'ribbonItem') {
          const tName = getFriendlyComponentName(k, comp);
          list.push({
            key: `ribbon:${hKey}:${k}`,
            type: 'ribbon',
            headerKey: hKey,
            ribbonTabKey: k,
            label: `Tab: ${tName} (${hName})`,
          });
        }
      });
    });

    Object.keys(config.flyouts || {}).forEach((fKey) => {
      const fName = getFriendlyComponentName(fKey, config.flyouts[fKey]);
      list.push({
        key: `flyout:${fKey}`,
        type: 'flyout',
        flyoutKey: fKey,
        label: `Flyout: ${fName}`,
      });

      // Also collect submenus inside this flyout
      const walkSubmenus = (arr) => {
        (arr || []).forEach((item) => {
          const k = typeof item === 'string' ? item : item?.dataElement;
          const c =
            typeof item === 'object' ? item : config.modularComponents?.[k];
          if (c && (Array.isArray(c.children) || c.isSubmenu) && k) {
            list.push({
              key: `submenu:${fKey}:${k}`,
              type: 'submenu',
              parentKey: k,
              flyoutKey: fKey,
              label: `Submenu: ${getFriendlyComponentName(k, c)}`,
            });
            walkSubmenus(c.children);
          }
        });
      };
      walkSubmenus(config.flyouts[fKey]?.items);
    });

    POPUPS_CATALOG.forEach((p) => {
      list.push({
        key: `popup:${p.id}`,
        type: 'popup',
        popupKey: p.id,
        label: `Popup: ${p.name}`,
      });
    });

    return list;
  }, [config, userHeaderKeys]);

  // Resolve current target
  const currentTarget = useMemo(() => {
    if (activeTarget) {
      const match = availableTargets.find(
        (t) =>
          t.type === activeTarget.type &&
          (t.ribbonTabKey === activeTarget.ribbonTabKey ||
            t.flyoutKey === activeTarget.flyoutKey ||
            t.parentKey === activeTarget.parentKey ||
            t.popupKey === activeTarget.popupKey ||
            (t.type === 'header' && t.headerKey === activeTarget.headerKey)),
      );
      if (match) return match;
    }
    return (
      availableTargets[0] || {
        key: 'header:default-top-header',
        type: 'header',
        headerKey: userHeaderKeys[0] || 'default-top-header',
        label: 'Header: Default Top Header',
      }
    );
  }, [activeTarget, availableTargets, userHeaderKeys]);

  const isFlyoutTarget =
    currentTarget.type === 'flyout' || currentTarget.type === 'submenu';
  const isPopupTarget = currentTarget.type === 'popup';
  const defaultHeaderKey =
    currentTarget.headerKey || userHeaderKeys[0] || 'default-top-header';

  const triggerAddedFeedback = (id) => {
    setJustAddedId(id);
    setTimeout(() => {
      setJustAddedId((prev) => (prev === id ? null : prev));
    }, 900);
  };

  // --- Direct Insertion Handlers ---
  const handleInsertTool = (toolMeta) => {
    const dataElement = generateUniqueDataElement(
      toolMeta.defaultId || toolMeta.key,
      existingIds,
    );

    const component = isFlyoutTarget
      ? {
          type: 'customButton',
          dataElement,
          label: toolMeta.label,
          title: toolMeta.title || toolMeta.label,
          img: toolMeta.icon,
          toolName: toolMeta.toolName,
          onClick: `${TOOL_ACTION_PREFIX}${toolMeta.toolName}`,
        }
      : {
          type: 'toolButton',
          dataElement,
          toolName: toolMeta.toolName,
          label: toolMeta.label,
          title: toolMeta.title || toolMeta.label,
          img: toolMeta.icon,
        };

    onAddComponent({
      target: {
        headerKey: defaultHeaderKey,
        targetLocationType: currentTarget.type,
        ribbonTabKey: currentTarget.ribbonTabKey,
        flyoutKey: currentTarget.flyoutKey,
        parentKey: currentTarget.parentKey,
        popupKey: currentTarget.popupKey,
      },
      componentType: component.type,
      component,
    });
    triggerAddedFeedback(`tool:${toolMeta.key}`);
  };

  const handleInsertPreset = (presetMeta) => {
    const isMenuToggle = presetMeta.type === 'toggleButton';
    const dataElement = generateUniqueDataElement(
      presetMeta.defaultId || presetMeta.buttonType,
      existingIds,
    );

    const component = isMenuToggle
      ? {
          type: 'toggleButton',
          dataElement,
          toggleElement: presetMeta.toggleElement || 'MainMenuFlyout',
          element: presetMeta.toggleElement || 'MainMenuFlyout',
          label: presetMeta.label,
          title: presetMeta.title || presetMeta.label,
          img: presetMeta.icon,
        }
      : {
          type: 'presetButton',
          dataElement,
          buttonType: presetMeta.buttonType,
          label: presetMeta.label,
          title: presetMeta.title || presetMeta.label,
          img: presetMeta.icon,
        };

    onAddComponent({
      target: {
        headerKey: defaultHeaderKey,
        targetLocationType: currentTarget.type,
        ribbonTabKey: currentTarget.ribbonTabKey,
        flyoutKey: currentTarget.flyoutKey,
        parentKey: currentTarget.parentKey,
        popupKey: currentTarget.popupKey,
      },
      componentType: component.type,
      component,
    });
    triggerAddedFeedback(`preset:${presetMeta.buttonType}`);
  };

  const handleInsertLayout = (layoutMeta) => {
    const isDivider = layoutMeta.type === 'divider';
    const dataElement = isDivider
      ? 'divider'
      : generateUniqueDataElement(
          layoutMeta.defaultId || layoutMeta.type,
          existingIds,
        );

    const component = {
      type: layoutMeta.type,
      dataElement,
      ...(layoutMeta.type === 'label' ? { label: 'Section Label' } : {}),
    };

    onAddComponent({
      target: {
        headerKey: defaultHeaderKey,
        targetLocationType: currentTarget.type,
        ribbonTabKey: currentTarget.ribbonTabKey,
        flyoutKey: currentTarget.flyoutKey,
        parentKey: currentTarget.parentKey,
        popupKey: currentTarget.popupKey,
      },
      componentType: layoutMeta.type,
      component,
    });
    triggerAddedFeedback(`layout:${layoutMeta.type}`);
  };

  const handleInsertPanel = (panelMeta, asEmbeddedFlyoutPanel = false) => {
    if (asEmbeddedFlyoutPanel && isFlyoutTarget) {
      const component = {
        type: 'flyoutPanel',
        dataElement: panelMeta.render,
        render: panelMeta.render,
      };
      onAddComponent({
        target: {
          headerKey: defaultHeaderKey,
          targetLocationType: currentTarget.type,
          flyoutKey: currentTarget.flyoutKey,
          parentKey: currentTarget.parentKey,
        },
        componentType: 'flyoutPanel',
        component,
      });
      triggerAddedFeedback(`panel-embed:${panelMeta.id}`);
      return;
    }

    const dataElement = generateUniqueDataElement(
      `${panelMeta.id}Toggle`,
      existingIds,
    );
    const component = {
      type: 'toggleButton',
      dataElement,
      toggleElement: panelMeta.id,
      element: panelMeta.id,
      label: panelMeta.toggleLabel || panelMeta.name,
      title: panelMeta.toggleTitle || `Toggle ${panelMeta.name}`,
      img: panelMeta.toggleIcon || 'icon-header-sidebar-line',
      panelLocation: panelMeta.defaultLocation || 'left',
    };

    onAddComponent({
      target: {
        headerKey: defaultHeaderKey,
        targetLocationType: currentTarget.type,
        ribbonTabKey: currentTarget.ribbonTabKey,
        flyoutKey: currentTarget.flyoutKey,
        parentKey: currentTarget.parentKey,
        popupKey: currentTarget.popupKey,
      },
      componentType: 'toggleButton',
      component,
    });
    triggerAddedFeedback(`panel:${panelMeta.id}`);
  };

  const handleInsertPopupAction = (popupItemMeta) => {
    const popupKey = currentTarget.popupKey || 'annotationPopup';
    onAddComponent({
      target: {
        headerKey: defaultHeaderKey,
        targetLocationType: 'popup',
        popupKey,
      },
      componentType: 'popupAction',
      component: {
        type: 'popupAction',
        dataElement: popupItemMeta.dataElement,
        label: popupItemMeta.label,
      },
    });
    triggerAddedFeedback(`popup:${popupItemMeta.dataElement}`);
  };

  // --- Inline Custom / Container Creators ---
  const handleCreateCustomButton = () => {
    const dataElement = generateUniqueDataElement('customButton', existingIds);
    const component = {
      type: 'customButton',
      dataElement,
      label: customLabel || 'Custom Button',
      title: customLabel || 'Custom Button',
      img: customIcon || 'icon-tools-more',
      ...(customToolAction
        ? {
            toolName: customToolAction,
            onClick: `${TOOL_ACTION_PREFIX}${customToolAction}`,
          }
        : {}),
    };
    onAddComponent({
      target: {
        headerKey: defaultHeaderKey,
        targetLocationType: currentTarget.type,
        ribbonTabKey: currentTarget.ribbonTabKey,
        flyoutKey: currentTarget.flyoutKey,
        parentKey: currentTarget.parentKey,
        popupKey: currentTarget.popupKey,
      },
      componentType: 'customButton',
      component,
    });
    triggerAddedFeedback('interactive:customButton');
    setExpandedBuilderId(null);
  };

  const handleCreateToggleButton = () => {
    const dataElement = generateUniqueDataElement('customToggle', existingIds);
    const component = {
      type: 'toggleButton',
      dataElement,
      toggleElement: toggleTarget,
      element: toggleTarget,
      label: customLabel || 'Toggle',
      title: `Toggle ${toggleTarget}`,
      img: customIcon || 'icon-header-sidebar-line',
    };
    onAddComponent({
      target: {
        headerKey: defaultHeaderKey,
        targetLocationType: currentTarget.type,
        ribbonTabKey: currentTarget.ribbonTabKey,
        flyoutKey: currentTarget.flyoutKey,
        parentKey: currentTarget.parentKey,
        popupKey: currentTarget.popupKey,
      },
      componentType: 'toggleButton',
      component,
    });
    triggerAddedFeedback('interactive:toggleButton');
    setExpandedBuilderId(null);
  };

  const handleCreateSubmenu = () => {
    const flyoutKey =
      currentTarget.flyoutKey || Object.keys(config.flyouts || {})[0];
    if (!flyoutKey) return;
    const dataElement = generateUniqueDataElement('submenu', existingIds);
    const component = {
      type: 'customButton',
      dataElement,
      label: submenuLabel || 'Submenu',
      title: submenuLabel || 'Submenu',
      img: 'icon-header-chevron-right',
      isSubmenu: true,
      children: [],
    };
    onAddComponent({
      target: {
        headerKey: defaultHeaderKey,
        targetLocationType:
          currentTarget.type === 'submenu' ? 'submenu' : 'flyout',
        flyoutKey,
        parentKey: currentTarget.parentKey,
      },
      componentType: 'customButton',
      component,
    });
    triggerAddedFeedback('interactive:submenu');
    setExpandedBuilderId(null);
  };

  const handleCreateNewHeader = () => {
    const dataElement = generateUniqueDataElement(
      `${newHeaderPlacement}-header`,
      existingIds,
    );
    onAddHeader({
      dataElement,
      placement: newHeaderPlacement,
      gap: 8,
      justifyContent: 'start',
      grow: 0,
      stroke: true,
      items: [],
    });
    triggerAddedFeedback('container:header');
    setExpandedBuilderId(null);
  };

  const handleCreateNewRibbonTab = () => {
    const clean =
      (newTabLabel || 'Tab').trim().replace(/[^a-zA-Z0-9]/g, '') || 'custom';
    const baseId = `${clean.charAt(0).toLowerCase()}${clean.slice(1)}RibbonItem`;
    const dataElement = generateUniqueDataElement(baseId, existingIds);
    const groupKey = generateUniqueDataElement(
      `${clean.charAt(0).toLowerCase()}${clean.slice(1)}GroupedItems`,
      existingIds,
    );

    onAddComponent({
      target: {
        headerKey: defaultHeaderKey,
        targetLocationType: 'header',
      },
      componentType: 'ribbonItem',
      component: {
        type: 'ribbonItem',
        dataElement,
        label: newTabLabel || 'New Tab',
        title: newTabLabel || 'New Tab',
        toolbarGroup: dataElement,
        groupedItems: [groupKey],
        items: [],
      },
    });
    triggerAddedFeedback('container:ribbonTab');
    setExpandedBuilderId(null);
  };

  const handleCreateNewFlyout = () => {
    const clean =
      (newFlyoutLabel || 'Flyout').trim().replace(/[^a-zA-Z0-9]/g, '') ||
      'custom';
    const baseId = `${clean.charAt(0).toLowerCase()}${clean.slice(1)}Flyout`;
    const dataElement = generateUniqueDataElement(baseId, existingIds);

    onAddFlyout({
      dataElement,
      label: newFlyoutLabel || 'Custom Menu',
      title: newFlyoutLabel || 'Custom Menu',
      icon: 'icon-tools-more',
      targetHeader: defaultHeaderKey,
      targetLocationType: 'header',
    });
    triggerAddedFeedback('container:flyout');
    setExpandedBuilderId(null);
  };

  const handleCreateNewTabPanel = () => {
    const dataElement = generateUniqueDataElement('tabPanel', existingIds);
    onAddTabPanel({
      dataElement,
      location: newTabPanelLocation,
      panelsList: [
        { render: 'thumbnailsPanel' },
        { render: 'outlinesPanel' },
        { render: 'bookmarksPanel' },
      ],
      toggleLabel: 'Sidebar',
      targetHeader: defaultHeaderKey,
    });
    triggerAddedFeedback('container:tabPanel');
    setExpandedBuilderId(null);
  };

  const q = searchQuery.trim().toLowerCase();
  const matchesSearch = (title, sub = '', key = '') => {
    if (!q) return true;
    return (
      title.toLowerCase().includes(q) ||
      sub.toLowerCase().includes(q) ||
      key.toLowerCase().includes(q)
    );
  };

  const showCategory = (catId) => category === 'all' || category === catId;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
      }}
    >
      {/* TARGET CONTAINER CONTEXT BANNER */}
      <div className="library-target-banner">
        <div className="library-target-header">
          <span>Adding To Container</span>
          <button
            type="button"
            className="tree-action-icon"
            style={{ color: '#1d4ed8', fontWeight: 700 }}
            onClick={onDone}
          >
            Back to Outline
          </button>
        </div>
        <select
          className="library-target-select"
          value={currentTarget.key}
          onChange={(e) => {
            const next = availableTargets.find((t) => t.key === e.target.value);
            if (next && onChangeTarget) onChangeTarget(next);
          }}
        >
          {availableTargets.map((t) => (
            <option key={t.key} value={t.key}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* SEARCH BAR */}
      <div className="studio-pane-toolbar">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search 70+ tools, presets, panels..."
          className="studio-search-input"
        />
      </div>

      {/* CATEGORY PILLS */}
      <div className="library-categories">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className={`library-cat-pill ${category === cat.id ? 'active' : ''}`}
            onClick={() => setCategory(cat.id)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* CATALOG SCROLL LIST */}
      <div className="library-list-scroll">
        {/* 1. CONTAINERS & INTERACTIVE BUILDERS */}
        {(showCategory('container') || showCategory('interactive')) && (
          <>
            {showCategory('interactive') &&
              matchesSearch(
                'Custom Button',
                'Action button with icon and tool trigger',
              ) && (
                <div
                  className="library-card"
                  style={{ flexDirection: 'column', alignItems: 'stretch' }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div className="library-card-info">
                      <div className="library-card-title">Custom Button</div>
                      <div className="library-card-sub">
                        Button with custom label, icon, or tool activation
                      </div>
                    </div>
                    <button
                      type="button"
                      className="library-add-btn"
                      onClick={() =>
                        setExpandedBuilderId(
                          expandedBuilderId === 'customButton'
                            ? null
                            : 'customButton',
                        )
                      }
                    >
                      {expandedBuilderId === 'customButton'
                        ? 'Close'
                        : 'Configure'}
                    </button>
                  </div>
                  {expandedBuilderId === 'customButton' && (
                    <div
                      style={{
                        marginTop: 8,
                        paddingTop: 8,
                        borderTop: '1px solid #e2e8f0',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                      }}
                    >
                      <input
                        className="inspector-input"
                        placeholder="Button Label"
                        value={customLabel}
                        onChange={(e) => setCustomLabel(e.target.value)}
                      />
                      <input
                        className="inspector-input"
                        placeholder="Icon (e.g. icon-tools-more)"
                        value={customIcon}
                        onChange={(e) => setCustomIcon(e.target.value)}
                      />
                      <select
                        className="inspector-select"
                        value={customToolAction}
                        onChange={(e) => setCustomToolAction(e.target.value)}
                      >
                        <option value="">
                          (Optional) Activate Tool on Click
                        </option>
                        {TOOLS_CATALOG.map((t) => (
                          <option key={t.key} value={t.toolName}>
                            {t.label} ({t.toolName})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="studio-btn primary"
                        onClick={handleCreateCustomButton}
                      >
                        + Insert Custom Button
                      </button>
                    </div>
                  )}
                </div>
              )}

            {showCategory('interactive') &&
              !isFlyoutTarget &&
              matchesSearch(
                'Toggle Button',
                'Opens a Flyout menu or Sidebar Panel',
              ) && (
                <div
                  className="library-card"
                  style={{ flexDirection: 'column', alignItems: 'stretch' }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div className="library-card-info">
                      <div className="library-card-title">Toggle Button</div>
                      <div className="library-card-sub">
                        Opens a Flyout dropdown or Sidebar panel
                      </div>
                    </div>
                    <button
                      type="button"
                      className="library-add-btn"
                      onClick={() =>
                        setExpandedBuilderId(
                          expandedBuilderId === 'toggleButton'
                            ? null
                            : 'toggleButton',
                        )
                      }
                    >
                      {expandedBuilderId === 'toggleButton'
                        ? 'Close'
                        : 'Configure'}
                    </button>
                  </div>
                  {expandedBuilderId === 'toggleButton' && (
                    <div
                      style={{
                        marginTop: 8,
                        paddingTop: 8,
                        borderTop: '1px solid #e2e8f0',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                      }}
                    >
                      <input
                        className="inspector-input"
                        placeholder="Toggle Label"
                        value={customLabel}
                        onChange={(e) => setCustomLabel(e.target.value)}
                      />
                      <select
                        className="inspector-select"
                        value={toggleTarget}
                        onChange={(e) => setToggleTarget(e.target.value)}
                      >
                        <optgroup label="Flyout Menus">
                          {Object.keys(config.flyouts || {}).map((fKey) => (
                            <option key={fKey} value={fKey}>
                              Flyout: {fKey}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Sidebar Panels">
                          {PANELS_CATALOG.map((p) => (
                            <option key={p.id} value={p.id}>
                              Panel: {p.name}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                      <button
                        type="button"
                        className="studio-btn primary"
                        onClick={handleCreateToggleButton}
                      >
                        + Insert Toggle Button
                      </button>
                    </div>
                  )}
                </div>
              )}

            {showCategory('interactive') &&
              (isFlyoutTarget ||
                Object.keys(config.flyouts || {}).length > 0) &&
              matchesSearch(
                'Submenu',
                'Nested drilldown menu inside a flyout',
              ) && (
                <div
                  className="library-card"
                  style={{ flexDirection: 'column', alignItems: 'stretch' }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div className="library-card-info">
                      <div className="library-card-title">Nested Submenu</div>
                      <div className="library-card-sub">
                        Drill-down child menu inside a flyout
                      </div>
                    </div>
                    <button
                      type="button"
                      className="library-add-btn"
                      onClick={() =>
                        setExpandedBuilderId(
                          expandedBuilderId === 'submenu' ? null : 'submenu',
                        )
                      }
                    >
                      {expandedBuilderId === 'submenu' ? 'Close' : 'Configure'}
                    </button>
                  </div>
                  {expandedBuilderId === 'submenu' && (
                    <div
                      style={{
                        marginTop: 8,
                        paddingTop: 8,
                        borderTop: '1px solid #e2e8f0',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                      }}
                    >
                      <input
                        className="inspector-input"
                        placeholder="Submenu Label"
                        value={submenuLabel}
                        onChange={(e) => setSubmenuLabel(e.target.value)}
                      />
                      <button
                        type="button"
                        className="studio-btn primary"
                        onClick={handleCreateSubmenu}
                      >
                        + Create Submenu
                      </button>
                    </div>
                  )}
                </div>
              )}

            {showCategory('container') &&
              matchesSearch(
                'Modular Header',
                'Top, bottom, left, or right bar',
              ) && (
                <div
                  className="library-card"
                  style={{ flexDirection: 'column', alignItems: 'stretch' }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div className="library-card-info">
                      <div className="library-card-title">
                        Modular Header Bar
                      </div>
                      <div className="library-card-sub">
                        New edge toolbar (top, bottom, left, right)
                      </div>
                    </div>
                    <button
                      type="button"
                      className="library-add-btn"
                      onClick={() =>
                        setExpandedBuilderId(
                          expandedBuilderId === 'header' ? null : 'header',
                        )
                      }
                    >
                      {expandedBuilderId === 'header' ? 'Close' : 'Create'}
                    </button>
                  </div>
                  {expandedBuilderId === 'header' && (
                    <div
                      style={{
                        marginTop: 8,
                        paddingTop: 8,
                        borderTop: '1px solid #e2e8f0',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                      }}
                    >
                      <select
                        className="inspector-select"
                        value={newHeaderPlacement}
                        onChange={(e) => setNewHeaderPlacement(e.target.value)}
                      >
                        <option value="top">Top</option>
                        <option value="bottom">Bottom</option>
                        <option value="left">Left</option>
                        <option value="right">Right</option>
                      </select>
                      <button
                        type="button"
                        className="studio-btn primary"
                        onClick={handleCreateNewHeader}
                      >
                        + Create Header
                      </button>
                    </div>
                  )}
                </div>
              )}

            {showCategory('container') &&
              matchesSearch(
                'Ribbon Tab',
                'Interactive tab inside header RibbonGroup',
              ) && (
                <div
                  className="library-card"
                  style={{ flexDirection: 'column', alignItems: 'stretch' }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div className="library-card-info">
                      <div className="library-card-title">
                        Ribbon Tab (RibbonItem)
                      </div>
                      <div className="library-card-sub">
                        Interactive tab with auto-wired tool group
                      </div>
                    </div>
                    <button
                      type="button"
                      className="library-add-btn"
                      onClick={() =>
                        setExpandedBuilderId(
                          expandedBuilderId === 'ribbonTab'
                            ? null
                            : 'ribbonTab',
                        )
                      }
                    >
                      {expandedBuilderId === 'ribbonTab' ? 'Close' : 'Create'}
                    </button>
                  </div>
                  {expandedBuilderId === 'ribbonTab' && (
                    <div
                      style={{
                        marginTop: 8,
                        paddingTop: 8,
                        borderTop: '1px solid #e2e8f0',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                      }}
                    >
                      <input
                        className="inspector-input"
                        placeholder="Tab Label (e.g. Review, Forms)"
                        value={newTabLabel}
                        onChange={(e) => setNewTabLabel(e.target.value)}
                      />
                      <button
                        type="button"
                        className="studio-btn primary"
                        onClick={handleCreateNewRibbonTab}
                      >
                        + Create Ribbon Tab
                      </button>
                    </div>
                  )}
                </div>
              )}

            {showCategory('container') &&
              matchesSearch(
                'Flyout Menu',
                'Dropdown container with toggle button',
              ) && (
                <div
                  className="library-card"
                  style={{ flexDirection: 'column', alignItems: 'stretch' }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div className="library-card-info">
                      <div className="library-card-title">Flyout Menu</div>
                      <div className="library-card-sub">
                        Dropdown overlay container + header toggle button
                      </div>
                    </div>
                    <button
                      type="button"
                      className="library-add-btn"
                      onClick={() =>
                        setExpandedBuilderId(
                          expandedBuilderId === 'flyout' ? null : 'flyout',
                        )
                      }
                    >
                      {expandedBuilderId === 'flyout' ? 'Close' : 'Create'}
                    </button>
                  </div>
                  {expandedBuilderId === 'flyout' && (
                    <div
                      style={{
                        marginTop: 8,
                        paddingTop: 8,
                        borderTop: '1px solid #e2e8f0',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                      }}
                    >
                      <input
                        className="inspector-input"
                        placeholder="Flyout Toggle Label"
                        value={newFlyoutLabel}
                        onChange={(e) => setNewFlyoutLabel(e.target.value)}
                      />
                      <button
                        type="button"
                        className="studio-btn primary"
                        onClick={handleCreateNewFlyout}
                      >
                        + Create Flyout Menu
                      </button>
                    </div>
                  )}
                </div>
              )}

            {showCategory('container') &&
              matchesSearch(
                'Tab Panel Sidebar',
                'Multi-tab dockable sidebar',
              ) && (
                <div
                  className="library-card"
                  style={{ flexDirection: 'column', alignItems: 'stretch' }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div className="library-card-info">
                      <div className="library-card-title">
                        Tab Panel Sidebar
                      </div>
                      <div className="library-card-sub">
                        Dockable sidebar housing Thumbnails, Outlines, Bookmarks
                      </div>
                    </div>
                    <button
                      type="button"
                      className="library-add-btn"
                      onClick={() =>
                        setExpandedBuilderId(
                          expandedBuilderId === 'tabPanel' ? null : 'tabPanel',
                        )
                      }
                    >
                      {expandedBuilderId === 'tabPanel' ? 'Close' : 'Create'}
                    </button>
                  </div>
                  {expandedBuilderId === 'tabPanel' && (
                    <div
                      style={{
                        marginTop: 8,
                        paddingTop: 8,
                        borderTop: '1px solid #e2e8f0',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                      }}
                    >
                      <select
                        className="inspector-select"
                        value={newTabPanelLocation}
                        onChange={(e) => setNewTabPanelLocation(e.target.value)}
                      >
                        <option value="left">Dock Left</option>
                        <option value="right">Dock Right</option>
                      </select>
                      <button
                        type="button"
                        className="studio-btn primary"
                        onClick={handleCreateNewTabPanel}
                      >
                        + Create Tab Panel
                      </button>
                    </div>
                  )}
                </div>
              )}
          </>
        )}

        {/* 2. TOOLS CATALOG */}
        {showCategory('tool') &&
          TOOLS_CATALOG.map((tool) => {
            if (!matchesSearch(tool.label, tool.title, tool.toolName)) {
              return null;
            }
            const added = justAddedId === `tool:${tool.key}`;
            return (
              <div key={tool.key} className="library-card">
                <div className="library-card-info">
                  <div className="library-card-title">{tool.label}</div>
                  <div className="library-card-sub">
                    {tool.category} &bull; {tool.title}
                  </div>
                </div>
                <button
                  type="button"
                  className="library-add-btn"
                  onClick={() => handleInsertTool(tool)}
                >
                  {added ? 'Added' : '+ Add'}
                </button>
              </div>
            );
          })}

        {/* 3. PRESET BUTTONS CATALOG */}
        {showCategory('preset') &&
          PRESET_BUTTONS_CATALOG.map((preset) => {
            if (!matchesSearch(preset.label, preset.title, preset.buttonType)) {
              return null;
            }
            // Disallow flyout-targeting toggleButton inside another flyout
            if (isFlyoutTarget && preset.type === 'toggleButton') return null;

            const added = justAddedId === `preset:${preset.buttonType}`;
            return (
              <div key={preset.buttonType} className="library-card">
                <div className="library-card-info">
                  <div className="library-card-title">{preset.label}</div>
                  <div className="library-card-sub">
                    {preset.category} &bull; {preset.title}
                  </div>
                </div>
                <button
                  type="button"
                  className="library-add-btn"
                  onClick={() => handleInsertPreset(preset)}
                >
                  {added ? 'Added' : '+ Add'}
                </button>
              </div>
            );
          })}

        {/* 4. CONTROLS & LAYOUT CATALOG */}
        {showCategory('layout') &&
          !isPopupTarget &&
          LAYOUT_ELEMENTS_CATALOG.map((layout) => {
            if (!matchesSearch(layout.name, layout.description, layout.type)) {
              return null;
            }
            // In flyouts, only 'divider' is allowed from layout elements
            if (isFlyoutTarget && layout.type !== 'divider') return null;

            const added = justAddedId === `layout:${layout.type}`;
            return (
              <div key={layout.type} className="library-card">
                <div className="library-card-info">
                  <div className="library-card-title">{layout.name}</div>
                  <div className="library-card-sub">{layout.description}</div>
                </div>
                <button
                  type="button"
                  className="library-add-btn"
                  onClick={() => handleInsertLayout(layout)}
                >
                  {added ? 'Added' : '+ Add'}
                </button>
              </div>
            );
          })}

        {/* 5. PANELS CATALOG */}
        {showCategory('panel') &&
          PANELS_CATALOG.map((panel) => {
            if (!matchesSearch(panel.name, panel.toggleTitle, panel.id)) {
              return null;
            }
            const canEmbedInFlyout = SUPPORTED_FLYOUT_PANEL_RENDERS.has(
              panel.render,
            );
            const addedToggle = justAddedId === `panel:${panel.id}`;
            const addedEmbed = justAddedId === `panel-embed:${panel.id}`;

            return (
              <div key={panel.id} className="library-card">
                <div className="library-card-info">
                  <div className="library-card-title">{panel.name}</div>
                  <div className="library-card-sub">
                    {panel.category} Panel ({panel.defaultLocation})
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {isFlyoutTarget && canEmbedInFlyout && (
                    <button
                      type="button"
                      className="library-add-btn"
                      style={{
                        backgroundColor: '#059669',
                        borderColor: '#059669',
                      }}
                      onClick={() => handleInsertPanel(panel, true)}
                      title="Embed panel directly inside this flyout"
                    >
                      {addedEmbed ? 'Embedded' : '+ Embed'}
                    </button>
                  )}
                  <button
                    type="button"
                    className="library-add-btn"
                    onClick={() => handleInsertPanel(panel, false)}
                    title="Add toggle button for this sidebar panel"
                  >
                    {addedToggle ? 'Added' : '+ Toggle'}
                  </button>
                </div>
              </div>
            );
          })}

        {/* 6. POPUP ACTIONS CATALOG */}
        {(showCategory('popup') || isPopupTarget) &&
          BUILTIN_POPUP_ITEMS_CATALOG.map((pItem) => {
            if (!matchesSearch(pItem.label, pItem.context, pItem.dataElement)) {
              return null;
            }
            const added = justAddedId === `popup:${pItem.dataElement}`;
            return (
              <div key={pItem.dataElement} className="library-card">
                <div className="library-card-info">
                  <div className="library-card-title">{pItem.label}</div>
                  <div className="library-card-sub">
                    Popup Action &bull; {pItem.context}
                  </div>
                </div>
                <button
                  type="button"
                  className="library-add-btn"
                  onClick={() => handleInsertPopupAction(pItem)}
                >
                  {added ? 'Added' : '+ Add'}
                </button>
              </div>
            );
          })}
      </div>
    </div>
  );
}
