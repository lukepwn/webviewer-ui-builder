import React, { useState, useEffect, useMemo } from 'react';
import {
  TOOLS_CATALOG,
  PRESET_BUTTONS_CATALOG,
  PANELS_CATALOG,
  LAYOUT_ELEMENTS_CATALOG,
  TAB_PANEL_SUPPORTED_TABS,
  PRESET_FLYOUTS_CATALOG,
} from '../constants/webviewerCatalog';
import ScrollableSelect from './ScrollableSelect';
import { isModalTabAllowedInFlyout } from '../sdk/importConfig';
import { TOOL_ACTION_PREFIX } from '../sdk/sdkRules';

export default function AddComponentModal({
  isOpen,
  onClose,
  initialTab = 'tool',
  initialLocation = null,
  initialFlyout = null,
  headerOptions = [],
  activeHeader = '',
  ribbonTabs = [],
  activeRibbonTab = '',
  panels = {},
  flyouts = {},
  onAddComponent,
  onAddTabPanel,
  onAddFlyout,
}) {
  const [activeTab, setActiveTab] = useState(initialTab || 'tool');
  const [targetLocationType, setTargetLocationType] = useState(
    initialLocation || (ribbonTabs.length > 0 ? 'ribbon' : 'header'),
  );
  const [selectedHeader, setSelectedHeader] = useState(
    activeHeader || headerOptions[0] || 'default-top-header',
  );
  const [selectedRibbonTab, setSelectedRibbonTab] = useState(
    (ribbonTabs.some((t) => t.key === activeRibbonTab) && activeRibbonTab) ||
      (ribbonTabs[0] && ribbonTabs[0].key) ||
      '',
  );
  const [selectedTargetFlyout, setSelectedTargetFlyout] = useState(
    initialFlyout || Object.keys(flyouts)[0] || '',
  );

  // Tool form state
  const [selectedToolKey, setSelectedToolKey] = useState(
    TOOLS_CATALOG[0]?.toolName || 'Pan',
  );
  const [toolLabel, setToolLabel] = useState('');
  const [toolTitle, setToolTitle] = useState('');
  const [toolDataElement, setToolDataElement] = useState('');
  const [toolIcon, setToolIcon] = useState(
    TOOLS_CATALOG[0]?.icon || 'icon-header-pan',
  );

  // Preset button state
  const [selectedPresetType, setSelectedPresetType] = useState(
    PRESET_BUTTONS_CATALOG[0]?.buttonType || 'downloadButton',
  );
  const [presetLabel, setPresetLabel] = useState('');
  const [presetTitle, setPresetTitle] = useState('');
  const [presetDataElement, setPresetDataElement] = useState('');
  const [presetIcon, setPresetIcon] = useState(
    PRESET_BUTTONS_CATALOG[0]?.icon || 'icon-download',
  );

  // Panel toggle state
  const [selectedPanelTarget, setSelectedPanelTarget] = useState(
    PANELS_CATALOG[0]?.id || 'thumbnailsPanel',
  );
  const [toggleLabel, setToggleLabel] = useState('');
  const [toggleTitle, setToggleTitle] = useState('');
  const [toggleDataElement, setToggleDataElement] = useState('');
  const [toggleIcon, setToggleIcon] = useState(
    PANELS_CATALOG[0]?.toggleIcon || 'icon-panel-thumbnail-line',
  );

  // New Flyout creation state
  const [newFlyoutId, setNewFlyoutId] = useState('customActionsFlyout');
  const [newFlyoutToggleLabel, setNewFlyoutToggleLabel] =
    useState('More Tools');
  const [newFlyoutToggleTitle, setNewFlyoutToggleTitle] =
    useState('Open flyout menu');
  const [newFlyoutToggleIcon, setNewFlyoutToggleIcon] = useState(
    'icon-header-more-tools',
  );

  // Flyout toggle state (for toggling existing flyouts)
  const [selectedFlyoutTarget, setSelectedFlyoutTarget] = useState(
    PRESET_FLYOUTS_CATALOG[0]?.id || 'MainMenuFlyout',
  );
  const [flyoutToggleLabel, setFlyoutToggleLabel] = useState('');
  const [flyoutToggleTitle, setFlyoutToggleTitle] = useState('');
  const [flyoutToggleDataElement, setFlyoutToggleDataElement] = useState('');
  const [flyoutToggleIcon, setFlyoutToggleIcon] = useState('');

  // Controls & layout state
  const [selectedLayoutType, setSelectedLayoutType] = useState(
    LAYOUT_ELEMENTS_CATALOG[0]?.type || 'pageControls',
  );
  const [layoutDataElement, setLayoutDataElement] = useState('');
  const [labelText, setLabelText] = useState('');
  const [labelTitle, setLabelTitle] = useState('');

  // New ribbon tab state
  const [newTabLabel, setNewTabLabel] = useState('');
  const [newTabGroupId, setNewTabGroupId] = useState('');
  const [isGroupIdCustomized, setIsGroupIdCustomized] = useState(false);

  // Multi-Tab Panel container state
  const [tabPanelId, setTabPanelId] = useState('tabPanel');
  const [tabPanelLocation, setTabPanelLocation] = useState('left');
  const [selectedTabPanelChildren, setSelectedTabPanelChildren] = useState(
    new Set(['thumbnailsPanel', 'outlinesPanel', 'bookmarksPanel']),
  );
  const [toggleButtonLabel, setToggleButtonLabel] = useState('Sidebar');

  const selectedPanelDef = useMemo(() => {
    return PANELS_CATALOG.find((p) => p.id === selectedPanelTarget);
  }, [selectedPanelTarget]);

  // Combined flyouts options for Toggle category (built-in MainMenu + custom flyouts)
  const flyoutToggleOptions = useMemo(() => {
    const list = [];
    const seen = new Set();

    for (const f of PRESET_FLYOUTS_CATALOG) {
      list.push({
        value: f.id,
        label: f.name,
        group: f.isBuiltIn ? 'Built-in Flyouts' : 'Preset Flyouts',
        icon: f.toggleIcon,
        requirement: f.description,
      });
      seen.add(f.id);
    }

    for (const [id, f] of Object.entries(flyouts || {})) {
      if (!seen.has(id)) {
        list.push({
          value: id,
          label: f.label || f.name || id,
          group: 'Custom Flyouts',
          icon: f.toggleIcon || 'icon-header-more-tools',
          requirement: `Custom flyout (${(f.items || []).length} items)`,
        });
      }
    }

    return list;
  }, [flyouts]);

  // Reset and synchronize state when modal opens or target context changes
  useEffect(() => {
    if (isOpen) {
      if (initialTab) {
        setActiveTab(initialTab);
      } else {
        setActiveTab('tool');
      }
      setLabelText('');
      setLabelTitle('');

      if (activeHeader) {
        setSelectedHeader(activeHeader);
      } else if (headerOptions.length > 0) {
        setSelectedHeader(headerOptions[0]);
      }

      if (initialFlyout) {
        setTargetLocationType('flyout');
        setSelectedTargetFlyout(initialFlyout);
      } else if (initialLocation) {
        setTargetLocationType(initialLocation);
      } else if (ribbonTabs.length === 0) {
        setTargetLocationType('header');
        setSelectedRibbonTab('');
      } else {
        const preferredLoc = activeRibbonTab ? 'ribbon' : 'header';
        setTargetLocationType(preferredLoc);
        if (
          activeRibbonTab &&
          ribbonTabs.some((t) => t.key === activeRibbonTab)
        ) {
          setSelectedRibbonTab(activeRibbonTab);
        } else {
          setSelectedRibbonTab(ribbonTabs[0]?.key || '');
        }
      }

      if (Object.keys(flyouts).length > 0 && !selectedTargetFlyout) {
        setSelectedTargetFlyout(Object.keys(flyouts)[0]);
      }

      setNewTabLabel('');
      setNewTabGroupId('');
      setIsGroupIdCustomized(false);

      setTabPanelId('tabPanel');
      setTabPanelLocation('left');
      setSelectedTabPanelChildren(
        new Set(['thumbnailsPanel', 'outlinesPanel', 'bookmarksPanel']),
      );
      setToggleButtonLabel('Sidebar');
    }
  }, [
    isOpen,
    initialTab,
    initialLocation,
    initialFlyout,
    activeHeader,
    activeRibbonTab,
    ribbonTabs,
    headerOptions,
    flyouts,
  ]);

  // Update tool defaults on tool selection
  useEffect(() => {
    const tool = TOOLS_CATALOG.find((t) => t.toolName === selectedToolKey);
    if (tool) {
      setToolLabel(tool.label);
      setToolTitle(tool.title);
      setToolDataElement(tool.defaultId);
      setToolIcon(tool.icon || '');
    }
  }, [selectedToolKey]);

  // Update preset defaults on preset selection
  useEffect(() => {
    const preset = PRESET_BUTTONS_CATALOG.find(
      (p) => p.buttonType === selectedPresetType,
    );
    if (preset) {
      setPresetLabel(preset.label);
      setPresetTitle(preset.title);
      setPresetDataElement(preset.defaultId);
      setPresetIcon(preset.icon || '');
    }
  }, [selectedPresetType]);

  // Update toggle defaults on panel selection
  useEffect(() => {
    const panelConfig = PANELS_CATALOG.find(
      (p) => p.id === selectedPanelTarget,
    );
    if (panelConfig) {
      setToggleLabel(panelConfig.toggleLabel);
      setToggleTitle(panelConfig.toggleTitle);
      setToggleDataElement(panelConfig.id + 'Toggle');
      setToggleIcon(panelConfig.toggleIcon || '');
    } else {
      setToggleLabel(selectedPanelTarget);
      setToggleTitle(`Toggle ${selectedPanelTarget}`);
      setToggleDataElement(`${selectedPanelTarget}Toggle`);
      setToggleIcon('icon-header-sidebar-line');
    }
  }, [selectedPanelTarget]);

  // Update toggle defaults on flyout selection
  useEffect(() => {
    const preset = PRESET_FLYOUTS_CATALOG.find(
      (f) => f.id === selectedFlyoutTarget,
    );
    if (preset) {
      setFlyoutToggleLabel(preset.toggleLabel || '');
      setFlyoutToggleTitle(preset.description || `Toggle ${preset.name}`);
      setFlyoutToggleDataElement(
        preset.defaultToggleId || `${preset.id}Toggle`,
      );
      setFlyoutToggleIcon(preset.toggleIcon || 'ic-hamburger-menu');
    } else {
      const custom = flyouts?.[selectedFlyoutTarget];
      setFlyoutToggleLabel(
        custom?.toggleLabel || custom?.label || selectedFlyoutTarget,
      );
      setFlyoutToggleTitle(`Toggle ${selectedFlyoutTarget}`);
      setFlyoutToggleDataElement(`${selectedFlyoutTarget}Toggle`);
      setFlyoutToggleIcon(custom?.toggleIcon || 'icon-header-more-tools');
    }
  }, [selectedFlyoutTarget, flyouts]);

  // Update layout defaults on layout type selection
  useEffect(() => {
    const layout = LAYOUT_ELEMENTS_CATALOG.find(
      (l) => l.type === selectedLayoutType,
    );
    if (layout) {
      setLayoutDataElement(layout.defaultId);
    }
  }, [selectedLayoutType]);

  // Flyouts only accept some item types (see sdk/importConfig.js). If the target
  // is a flyout while a disallowed tab or toggle-type preset is selected, move to
  // a valid choice so the user can't build something the SDK would reject.
  useEffect(() => {
    const inFlyout =
      targetLocationType === 'flyout' && Object.keys(flyouts || {}).length > 0;
    if (!inFlyout) return;
    if (!isModalTabAllowedInFlyout(activeTab)) {
      setActiveTab('preset');
    }
    const selected = PRESET_BUTTONS_CATALOG.find(
      (p) => p.buttonType === selectedPresetType,
    );
    if (selected?.type === 'toggleButton') {
      const firstAllowed = PRESET_BUTTONS_CATALOG.find(
        (p) => p.type !== 'toggleButton',
      );
      if (firstAllowed) setSelectedPresetType(firstAllowed.buttonType);
    }
    if (activeTab === 'layout' && selectedLayoutType !== 'divider') {
      setSelectedLayoutType('divider');
    }
  }, [
    targetLocationType,
    activeTab,
    flyouts,
    selectedPresetType,
    selectedLayoutType,
  ]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();

    if (activeTab === 'newFlyout') {
      if (!newFlyoutId.trim()) {
        alert('Flyout ID (dataElement) is required.');
        return;
      }
      if (onAddFlyout) {
        onAddFlyout({
          dataElement: newFlyoutId.trim(),
          label: newFlyoutToggleLabel.trim() || undefined,
          title: newFlyoutToggleTitle.trim() || undefined,
          icon: newFlyoutToggleIcon.trim() || undefined,
          targetHeader: selectedHeader,
        });
      }
      onClose();
      return;
    }

    if (activeTab === 'tabPanel') {
      if (!tabPanelId.trim()) {
        alert('Tab Panel Container ID is required.');
        return;
      }
      if (onAddTabPanel) {
        onAddTabPanel({
          dataElement: tabPanelId.trim(),
          location: tabPanelLocation,
          panelsList: Array.from(selectedTabPanelChildren).map((render) => ({
            render,
          })),
          toggleLabel: toggleButtonLabel.trim() || undefined,
          targetHeader: selectedHeader,
        });
      }
      onClose();
      return;
    }

    const isFlyoutTarget =
      targetLocationType === 'flyout' &&
      selectedTargetFlyout &&
      !!flyouts[selectedTargetFlyout];

    const isRibbonTarget =
      targetLocationType === 'ribbon' &&
      Array.isArray(ribbonTabs) &&
      ribbonTabs.length > 0 &&
      selectedRibbonTab &&
      ribbonTabs.some((t) => t.key === selectedRibbonTab);

    const target = {
      headerKey: selectedHeader,
      targetLocationType: isFlyoutTarget
        ? 'flyout'
        : isRibbonTarget
          ? 'ribbon'
          : 'header',
      ribbonTabKey: isRibbonTarget ? selectedRibbonTab : null,
      flyoutKey: isFlyoutTarget ? selectedTargetFlyout : null,
    };

    if (activeTab === 'tool') {
      if (!toolDataElement || !selectedToolKey) {
        alert('Tool name and Data Element ID are required.');
        return;
      }
      const isFlyoutTool = target.targetLocationType === 'flyout';
      onAddComponent({
        target,
        componentType: isFlyoutTool ? 'customButton' : 'toolButton',
        component: isFlyoutTool
          ? {
              type: 'customButton',
              dataElement: toolDataElement,
              toolName: selectedToolKey,
              onClick: `${TOOL_ACTION_PREFIX}${selectedToolKey}`,
              label: toolLabel || selectedToolKey,
              title: toolTitle || toolLabel || selectedToolKey,
              img: toolIcon || undefined,
            }
          : {
              type: 'toolButton',
              dataElement: toolDataElement,
              toolName: selectedToolKey,
              label: toolLabel || undefined,
              title: toolTitle || undefined,
              img: toolIcon || undefined,
            },
      });
    } else if (activeTab === 'preset') {
      if (!presetDataElement || !selectedPresetType) {
        alert('Preset action and Data Element ID are required.');
        return;
      }
      const presetDef = PRESET_BUTTONS_CATALOG.find(
        (p) => p.buttonType === selectedPresetType,
      );
      const isToggle = presetDef?.type === 'toggleButton';

      onAddComponent({
        target,
        componentType: isToggle ? 'toggleButton' : 'presetButton',
        component: {
          type: isToggle ? 'toggleButton' : 'presetButton',
          dataElement: presetDataElement,
          ...(isToggle
            ? { toggleElement: presetDef.toggleElement || 'MainMenuFlyout' }
            : { buttonType: selectedPresetType }),
          label: presetLabel || undefined,
          title: presetTitle || undefined,
          img: presetIcon || undefined,
        },
      });
    } else if (activeTab === 'toggle') {
      if (!toggleDataElement || !selectedPanelTarget) {
        alert('Target panel and Data Element ID are required.');
        return;
      }
      onAddComponent({
        target,
        componentType: 'toggleButton',
        component: {
          type: 'toggleButton',
          dataElement: toggleDataElement,
          toggleElement: selectedPanelTarget,
          element: selectedPanelTarget,
          label: toggleLabel || undefined,
          title: toggleTitle || undefined,
          img: toggleIcon || undefined,
        },
      });
    } else if (activeTab === 'flyout') {
      if (!flyoutToggleDataElement || !selectedFlyoutTarget) {
        alert('Target flyout and Data Element ID are required.');
        return;
      }
      onAddComponent({
        target,
        componentType: 'toggleButton',
        component: {
          type: 'toggleButton',
          dataElement: flyoutToggleDataElement,
          toggleElement: selectedFlyoutTarget,
          element: selectedFlyoutTarget,
          label: flyoutToggleLabel || undefined,
          title: flyoutToggleTitle || undefined,
          img: flyoutToggleIcon || undefined,
        },
      });
    } else if (activeTab === 'controls') {
      if (!layoutDataElement) {
        alert('Data Element ID is required.');
        return;
      }
      if (selectedLayoutType === 'viewControls') {
        onAddComponent({
          target,
          componentType: 'viewControls',
          component: {
            type: 'viewControls',
            dataElement: layoutDataElement,
            title: 'View Controls',
            icon: 'icon-header-page-manipulation-line',
          },
        });
      } else {
        onAddComponent({
          target,
          componentType: selectedLayoutType,
          component: {
            type: selectedLayoutType,
            dataElement: layoutDataElement,
          },
        });
      }
    } else if (activeTab === 'layout') {
      if (!layoutDataElement) {
        alert('Data Element ID is required.');
        return;
      }
      if (selectedLayoutType === 'label') {
        if (!labelText.trim()) {
          alert('Label text is required.');
          return;
        }
        onAddComponent({
          target,
          componentType: 'label',
          component: {
            type: 'label',
            dataElement: layoutDataElement,
            label: labelText.trim(),
            title: labelTitle.trim() || undefined,
          },
        });
      } else {
        onAddComponent({
          target,
          componentType: selectedLayoutType,
          component: {
            type: selectedLayoutType,
            dataElement: layoutDataElement,
          },
        });
      }
    } else if (activeTab === 'ribbonTab') {
      if (!newTabLabel.trim()) {
        alert('Ribbon Tab Label is required.');
        return;
      }
      const rawId =
        newTabGroupId.trim() ||
        `toolbarGroup-${newTabLabel.trim().replace(/\s+/g, '')}`;
      const groupId = rawId.startsWith('toolbarGroup-')
        ? rawId
        : `toolbarGroup-${rawId}`;
      const cleanName = groupId.replace(/^toolbarGroup-/, '');
      const groupContainerKey = `${cleanName.charAt(0).toLowerCase()}${cleanName.slice(1)}GroupedItems`;

      onAddComponent({
        target: { headerKey: selectedHeader },
        componentType: 'ribbonItem',
        component: {
          type: 'ribbonItem',
          dataElement: groupId,
          label: newTabLabel.trim(),
          title: newTabLabel.trim(),
          toolbarGroup: groupId,
          groupedItems: [groupContainerKey],
          items: [],
        },
      });
    }

    onClose();
  };

  const hasCustomFlyouts = Object.keys(flyouts || {}).length > 0;
  const isFlyoutLocation = targetLocationType === 'flyout' && hasCustomFlyouts;
  const tabBlockedByFlyout = (tab) =>
    isFlyoutLocation && !isModalTabAllowedInFlyout(tab);
  const flyoutBlockedTitle =
    'Flyouts only accept tools, preset buttons, and panel toggles. Choose a different target location to add this.';

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-2col">
        {/* Modal Top Header */}
        <div className="modal-header-row">
          <h3 className="modal-title">Add Component to WebViewer</h3>
          <button
            className="modal-close-icon"
            onClick={onClose}
            title="Close dialog"
          >
            ✕
          </button>
        </div>

        {/* 2-Column Body */}
        <div className="modal-body-layout">
          {/* Left Column: Vertical Category List */}
          <nav className="modal-sidebar-nav">
            <span
              className="field-hint"
              style={{
                padding: '2px 8px 4px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Components
            </span>
            <button
              type="button"
              className={`modal-nav-btn ${activeTab === 'tool' ? 'active' : ''}`}
              onClick={() => setActiveTab('tool')}
              disabled={tabBlockedByFlyout('tool')}
              title={
                tabBlockedByFlyout('tool') ? flyoutBlockedTitle : undefined
              }
            >
              Tool Button
            </button>
            <button
              type="button"
              className={`modal-nav-btn ${activeTab === 'preset' ? 'active' : ''}`}
              onClick={() => setActiveTab('preset')}
            >
              Preset Button
            </button>
            <button
              type="button"
              className={`modal-nav-btn ${activeTab === 'toggle' ? 'active' : ''}`}
              onClick={() => setActiveTab('toggle')}
            >
              Panel Toggle
            </button>
            <button
              type="button"
              className={`modal-nav-btn ${activeTab === 'flyout' ? 'active' : ''}`}
              onClick={() => setActiveTab('flyout')}
              disabled={tabBlockedByFlyout('flyout')}
              title={
                tabBlockedByFlyout('flyout')
                  ? 'A toggle to another flyout crashes inside a flyout. Add it to a header instead.'
                  : undefined
              }
            >
              Flyout Toggle
            </button>
            <button
              type="button"
              className={`modal-nav-btn ${activeTab === 'controls' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('controls');
                setSelectedLayoutType('pageControls');
              }}
              disabled={tabBlockedByFlyout('controls')}
              title={
                tabBlockedByFlyout('controls') ? flyoutBlockedTitle : undefined
              }
            >
              Controls
            </button>
            <button
              type="button"
              className={`modal-nav-btn ${activeTab === 'layout' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('layout');
                setSelectedLayoutType('divider');
              }}
              disabled={tabBlockedByFlyout('layout')}
              title={
                tabBlockedByFlyout('layout') ? flyoutBlockedTitle : undefined
              }
            >
              Layout & Labels
            </button>

            <span
              className="field-hint"
              style={{
                padding: '10px 8px 4px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Containers
            </span>
            <button
              type="button"
              className={`modal-nav-btn ${activeTab === 'ribbonTab' ? 'active' : ''}`}
              onClick={() => setActiveTab('ribbonTab')}
            >
              Ribbon Tab
            </button>
            <button
              type="button"
              className={`modal-nav-btn ${activeTab === 'tabPanel' ? 'active' : ''}`}
              onClick={() => setActiveTab('tabPanel')}
            >
              Tab Panel
            </button>
            <button
              type="button"
              className={`modal-nav-btn ${activeTab === 'newFlyout' ? 'active' : ''}`}
              onClick={() => setActiveTab('newFlyout')}
            >
              Flyout
            </button>
          </nav>

          {/* Right Column: Configuration Form Area */}
          <div className="modal-form-area">
            <form onSubmit={handleSubmit} className="modal-form-container">
              {/* Target Location Box (for toolbar or flyout elements) */}
              {activeTab !== 'ribbonTab' &&
                activeTab !== 'tabPanel' &&
                activeTab !== 'newFlyout' && (
                  <div className="target-location-box">
                    <label className="form-label font-bold">
                      Target Location:
                    </label>
                    <div className="target-selection-row">
                      <div className="form-subgroup">
                        <span className="field-hint">Header:</span>
                        <ScrollableSelect
                          value={selectedHeader}
                          onChange={setSelectedHeader}
                          options={headerOptions.map((h) => ({
                            value: h,
                            label: h,
                          }))}
                          maxHeight={160}
                        />
                      </div>

                      <div className="form-subgroup">
                        <span className="field-hint">Place inside:</span>
                        <select
                          value={targetLocationType}
                          onChange={(e) =>
                            setTargetLocationType(e.target.value)
                          }
                          className="form-select"
                        >
                          <option value="header">
                            Header Items (Always Visible)
                          </option>
                          {ribbonTabs && ribbonTabs.length > 0 && (
                            <option value="ribbon">Ribbon Tab</option>
                          )}
                          {hasCustomFlyouts && (
                            <option value="flyout">Flyout</option>
                          )}
                        </select>
                      </div>

                      {targetLocationType === 'ribbon' &&
                        ribbonTabs &&
                        ribbonTabs.length > 0 && (
                          <div className="form-subgroup">
                            <span className="field-hint">Ribbon Tab:</span>
                            <ScrollableSelect
                              value={selectedRibbonTab}
                              onChange={setSelectedRibbonTab}
                              options={ribbonTabs.map((tab) => ({
                                value: tab.key,
                                label: tab.label || tab.key,
                              }))}
                              maxHeight={160}
                            />
                          </div>
                        )}

                      {targetLocationType === 'flyout' && hasCustomFlyouts && (
                        <div className="form-subgroup">
                          <span className="field-hint">Flyout:</span>
                          <ScrollableSelect
                            value={selectedTargetFlyout}
                            onChange={setSelectedTargetFlyout}
                            options={Object.keys(flyouts).map((id) => ({
                              value: id,
                              label: `${id} (${(flyouts[id]?.items || []).length} items)`,
                            }))}
                            maxHeight={160}
                          />
                          <span className="field-hint">
                            Flyouts accept tools, preset buttons, panel toggles,
                            and dividers.
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              {/* TAB 1: TOOL BUTTON */}
              {activeTab === 'tool' && (
                <div className="tab-pane">
                  {isFlyoutLocation && (
                    <div
                      className="import-warnings"
                      style={{ marginBottom: 12 }}
                      role="note"
                    >
                      <strong>Requires functionMap in code:</strong> WebViewer
                      rejects <code>toolButton</code> inside flyouts. This tool
                      will be added as a <code>customButton</code> (
                      <code>
                        onClick: &quot;{TOOL_ACTION_PREFIX}
                        {selectedToolKey}&quot;
                      </code>
                      ), which requires passing a <code>functionMap</code> to{' '}
                      <code>
                        UI.importModularComponents(config, functionMap)
                      </code>{' '}
                      when using the exported JSON.
                    </div>
                  )}
                  <div className="form-group">
                    <label className="form-label">
                      Select Tool (Compact Scrollable List)
                    </label>
                    <ScrollableSelect
                      value={selectedToolKey}
                      onChange={setSelectedToolKey}
                      options={TOOLS_CATALOG.map((t) => ({
                        value: t.toolName,
                        label: `${t.label} (${t.toolName})`,
                        group: t.category,
                        icon: t.icon,
                      }))}
                      placeholder="Select a WebViewer tool..."
                      maxHeight={220}
                    />
                  </div>

                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label">
                        Button Label (optional)
                      </label>
                      <input
                        value={toolLabel}
                        onChange={(e) => setToolLabel(e.target.value)}
                        placeholder="e.g. Highlighter"
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">
                        Hover Tooltip (optional)
                      </label>
                      <input
                        value={toolTitle}
                        onChange={(e) => setToolTitle(e.target.value)}
                        placeholder="e.g. Highlight selected text"
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label">
                        Data Element ID <span className="required-star">*</span>
                      </label>
                      <input
                        value={toolDataElement}
                        onChange={(e) => setToolDataElement(e.target.value)}
                        placeholder="e.g. highlightToolButton"
                        className="form-input monospace"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Icon Class</label>
                      <input
                        value={toolIcon}
                        onChange={(e) => setToolIcon(e.target.value)}
                        placeholder="e.g. icon-tool-highlight"
                        className="form-input monospace"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: PRESET BUTTON */}
              {activeTab === 'preset' && (
                <div className="tab-pane">
                  <div className="form-group">
                    <label className="form-label">Preset Button</label>
                    <ScrollableSelect
                      value={selectedPresetType}
                      onChange={setSelectedPresetType}
                      options={PRESET_BUTTONS_CATALOG.filter(
                        // Presets of type toggleButton open flyouts, which crash inside a flyout
                        (p) => !isFlyoutLocation || p.type !== 'toggleButton',
                      ).map((p) => ({
                        value: p.buttonType,
                        label: `${p.label} (${p.buttonType})`,
                        group: p.category,
                        icon: p.icon,
                      }))}
                      placeholder="Select a preset action..."
                      maxHeight={220}
                    />
                  </div>

                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label">
                        Button Label (optional)
                      </label>
                      <input
                        value={presetLabel}
                        onChange={(e) => setPresetLabel(e.target.value)}
                        placeholder="e.g. Download PDF"
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">
                        Hover Tooltip (optional)
                      </label>
                      <input
                        value={presetTitle}
                        onChange={(e) => setPresetTitle(e.target.value)}
                        placeholder="e.g. Save a copy to your computer"
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label">
                        Data Element ID <span className="required-star">*</span>
                      </label>
                      <input
                        value={presetDataElement}
                        onChange={(e) => setPresetDataElement(e.target.value)}
                        placeholder="e.g. downloadButton"
                        className="form-input monospace"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Button Icon</label>
                      <input
                        value={presetIcon}
                        onChange={(e) => setPresetIcon(e.target.value)}
                        placeholder="e.g. icon-download"
                        className="form-input monospace"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: PANEL TOGGLE */}
              {activeTab === 'toggle' && (
                <div className="tab-pane">
                  <div className="form-group">
                    <label className="form-label">
                      Select Side Panel to Toggle{' '}
                      <span className="required-star">*</span>
                    </label>
                    <ScrollableSelect
                      value={selectedPanelTarget}
                      onChange={setSelectedPanelTarget}
                      options={[
                        ...PANELS_CATALOG.map((p) => ({
                          value: p.id,
                          label: `${p.name} (${p.id})`,
                          group:
                            p.category === 'Specialized'
                              ? 'Specialized Panels'
                              : 'Standard Panels',
                          icon: p.toggleIcon,
                          requirement: p.requirement,
                        })),
                        ...Object.keys(panels)
                          .filter(
                            (k) => !PANELS_CATALOG.some((p) => p.id === k),
                          )
                          .map((k) => ({
                            value: k,
                            label: `Custom Panel: ${k}`,
                            group: 'Custom Panels',
                            icon: 'icon-header-sidebar-line',
                          })),
                      ]}
                      placeholder="Select a side panel..."
                      maxHeight={220}
                    />
                  </div>

                  {selectedPanelDef?.requirement && (
                    <div className="panel-requirement-box">
                      <span className="requirement-tag">Specialized Panel</span>
                      <p className="requirement-desc">
                        {selectedPanelDef.requirement}
                      </p>
                    </div>
                  )}

                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label">
                        Button Label (optional)
                      </label>
                      <input
                        value={toggleLabel}
                        onChange={(e) => setToggleLabel(e.target.value)}
                        placeholder="e.g. Thumbnails"
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">
                        Hover Tooltip (optional)
                      </label>
                      <input
                        value={toggleTitle}
                        onChange={(e) => setToggleTitle(e.target.value)}
                        placeholder="e.g. Toggle Thumbnails panel"
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label">
                        Data Element ID <span className="required-star">*</span>
                      </label>
                      <input
                        value={toggleDataElement}
                        onChange={(e) => setToggleDataElement(e.target.value)}
                        placeholder="e.g. thumbnailsToggleButton"
                        className="form-input monospace"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Toggle Icon</label>
                      <input
                        value={toggleIcon}
                        onChange={(e) => setToggleIcon(e.target.value)}
                        placeholder="e.g. icon-panel-thumbnail-line"
                        className="form-input monospace"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: NEW FLYOUT */}
              {activeTab === 'newFlyout' && (
                <div className="tab-pane">
                  <p className="tab-description">
                    Create a custom <strong>Flyout Menu</strong> container. A
                    toggle button will be added to your destination header, and
                    you can add tool buttons, preset actions, and custom
                    components inside it.
                  </p>

                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label">
                        Flyout ID (dataElement){' '}
                        <span className="required-star">*</span>
                      </label>
                      <input
                        value={newFlyoutId}
                        onChange={(e) => setNewFlyoutId(e.target.value)}
                        placeholder="e.g. customActionsFlyout"
                        className="form-input monospace"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        Destination Header for Toggle Button
                      </label>
                      <ScrollableSelect
                        value={selectedHeader}
                        onChange={setSelectedHeader}
                        options={headerOptions.map((h) => ({
                          value: h,
                          label: h,
                        }))}
                        maxHeight={160}
                      />
                    </div>
                  </div>

                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label">Toggle Button Label</label>
                      <input
                        value={newFlyoutToggleLabel}
                        onChange={(e) =>
                          setNewFlyoutToggleLabel(e.target.value)
                        }
                        placeholder="e.g. More Tools"
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">
                        Hover Tooltip (optional)
                      </label>
                      <input
                        value={newFlyoutToggleTitle}
                        onChange={(e) =>
                          setNewFlyoutToggleTitle(e.target.value)
                        }
                        placeholder="e.g. Open more tools menu"
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Toggle Button Icon</label>
                    <input
                      value={newFlyoutToggleIcon}
                      onChange={(e) => setNewFlyoutToggleIcon(e.target.value)}
                      placeholder="e.g. icon-header-more-tools, ic-hamburger-menu"
                      className="form-input monospace"
                    />
                  </div>
                </div>
              )}

              {/* TAB 5: FLYOUT TOGGLE (FOR EXISTING FLYOUTS) */}
              {activeTab === 'flyout' && (
                <div className="tab-pane">
                  <p className="tab-description">
                    Add a button to your header or ribbon that toggles an
                    existing <strong>Flyout Menu</strong> (such as the Main Menu
                    or a previously created custom flyout).
                  </p>

                  <div className="form-group">
                    <label className="form-label">
                      Select Flyout Menu to Toggle{' '}
                      <span className="required-star">*</span>
                    </label>
                    <ScrollableSelect
                      value={selectedFlyoutTarget}
                      onChange={setSelectedFlyoutTarget}
                      options={flyoutToggleOptions}
                      placeholder="Select a flyout menu..."
                      maxHeight={220}
                    />
                  </div>

                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label">
                        Button Label (optional)
                      </label>
                      <input
                        value={flyoutToggleLabel}
                        onChange={(e) => setFlyoutToggleLabel(e.target.value)}
                        placeholder="e.g. Menu, More Tools"
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">
                        Hover Tooltip (optional)
                      </label>
                      <input
                        value={flyoutToggleTitle}
                        onChange={(e) => setFlyoutToggleTitle(e.target.value)}
                        placeholder="e.g. Open flyout menu"
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label">
                        Data Element ID <span className="required-star">*</span>
                      </label>
                      <input
                        value={flyoutToggleDataElement}
                        onChange={(e) =>
                          setFlyoutToggleDataElement(e.target.value)
                        }
                        placeholder="e.g. menuButton or moreToolsToggle"
                        className="form-input monospace"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Toggle Icon</label>
                      <input
                        value={flyoutToggleIcon}
                        onChange={(e) => setFlyoutToggleIcon(e.target.value)}
                        placeholder="e.g. ic-hamburger-menu, icon-header-more-tools"
                        className="form-input monospace"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 6: SIDE TAB PANEL CONTAINER */}
              {activeTab === 'tabPanel' && (
                <div className="tab-pane">
                  <p className="tab-description">
                    Create a Multi-Tab Sidebar Container (
                    <strong>TabPanel</strong>) docked to the left or right side
                    of WebViewer. WebViewer will automatically create a Toggle
                    Button in your active header.
                  </p>

                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label">
                        Container ID (dataElement){' '}
                        <span className="required-star">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-input monospace"
                        value={tabPanelId}
                        onChange={(e) => setTabPanelId(e.target.value)}
                        placeholder="e.g. tabPanel, leftTabPanel"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Dock Location</label>
                      <div
                        className="radio-group-inline"
                        style={{ marginTop: 6 }}
                      >
                        <label>
                          <input
                            type="radio"
                            name="tabPanelLocation"
                            value="left"
                            checked={tabPanelLocation === 'left'}
                            onChange={() => setTabPanelLocation('left')}
                          />{' '}
                          Left Side
                        </label>
                        <label>
                          <input
                            type="radio"
                            name="tabPanelLocation"
                            value="right"
                            checked={tabPanelLocation === 'right'}
                            onChange={() => setTabPanelLocation('right')}
                          />{' '}
                          Right Side
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label">
                        Destination Header for Toggle Button
                      </label>
                      <ScrollableSelect
                        value={selectedHeader}
                        onChange={setSelectedHeader}
                        options={headerOptions.map((h) => ({
                          value: h,
                          label: h,
                        }))}
                        maxHeight={160}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Toggle Button Label</label>
                      <input
                        type="text"
                        className="form-input"
                        value={toggleButtonLabel}
                        onChange={(e) => setToggleButtonLabel(e.target.value)}
                        placeholder="e.g. Sidebar"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 6,
                      }}
                    >
                      <label
                        className="form-label font-bold"
                        style={{ margin: 0 }}
                      >
                        Included Panel Tabs ({selectedTabPanelChildren.size}{' '}
                        selected)
                      </label>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          className="text-link-btn"
                          onClick={() =>
                            setSelectedTabPanelChildren(
                              new Set(
                                TAB_PANEL_SUPPORTED_TABS.map((t) => t.id),
                              ),
                            )
                          }
                        >
                          Select All
                        </button>
                        <span style={{ color: '#cbd5e1' }}>|</span>
                        <button
                          type="button"
                          className="text-link-btn"
                          onClick={() => setSelectedTabPanelChildren(new Set())}
                        >
                          Clear All
                        </button>
                      </div>
                    </div>

                    <div className="tab-panel-picker-grid">
                      {TAB_PANEL_SUPPORTED_TABS.map((tab) => {
                        const isChecked = selectedTabPanelChildren.has(tab.id);
                        return (
                          <label
                            key={tab.id}
                            className={`tab-check-card ${isChecked ? 'selected' : ''}`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const next = new Set(selectedTabPanelChildren);
                                if (e.target.checked) next.add(tab.id);
                                else next.delete(tab.id);
                                setSelectedTabPanelChildren(next);
                              }}
                            />
                            <div className="tab-card-content">
                              <span className="tab-card-name">{tab.name}</span>
                              <span className="tab-card-id">{tab.id}</span>
                              {tab.requirement && (
                                <span
                                  className="tab-card-specialized-tag"
                                  title={tab.requirement}
                                >
                                  Specialized
                                </span>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 7: PAGE & VIEW CONTROLS */}
              {activeTab === 'controls' && (
                <div className="tab-pane">
                  <div className="form-group">
                    <label className="form-label">Control Type</label>
                    <div className="radio-group">
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="controlType"
                          value="pageControls"
                          checked={selectedLayoutType === 'pageControls'}
                          onChange={() => setSelectedLayoutType('pageControls')}
                        />
                        Page Controls (Page number input, total pages, prev/next
                        arrows)
                      </label>
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="controlType"
                          value="zoom"
                          checked={selectedLayoutType === 'zoom'}
                          onChange={() => setSelectedLayoutType('zoom')}
                        />
                        Zoom Controls (Zoom level dropdown and zoom in/out
                        buttons)
                      </label>
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="controlType"
                          value="viewControls"
                          checked={selectedLayoutType === 'viewControls'}
                          onChange={() => setSelectedLayoutType('viewControls')}
                        />
                        View Controls (Page transition & document layout
                        dropdown)
                      </label>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Data Element ID <span className="required-star">*</span>
                    </label>
                    <input
                      value={layoutDataElement}
                      onChange={(e) => setLayoutDataElement(e.target.value)}
                      placeholder="e.g. pageControls"
                      className="form-input monospace"
                      required
                    />
                  </div>
                </div>
              )}

              {/* TAB 8: LAYOUT & LABELS */}
              {activeTab === 'layout' && (
                <div className="tab-pane">
                  <div className="form-group">
                    <label className="form-label">Layout Element Type</label>
                    <div className="radio-group">
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="layoutType"
                          value="divider"
                          checked={selectedLayoutType === 'divider'}
                          onChange={() => setSelectedLayoutType('divider')}
                        />
                        Divider (Separator line between tools / flyout items)
                      </label>
                      <label
                        className="radio-label"
                        style={isFlyoutLocation ? { opacity: 0.5 } : undefined}
                        title={
                          isFlyoutLocation
                            ? 'Spacers are only supported in headers and toolbars.'
                            : undefined
                        }
                      >
                        <input
                          type="radio"
                          name="layoutType"
                          value="spacer"
                          disabled={isFlyoutLocation}
                          checked={selectedLayoutType === 'spacer'}
                          onChange={() => setSelectedLayoutType('spacer')}
                        />
                        Spacer (Flexible space pushing subsequent items to the
                        end)
                      </label>
                      <label
                        className="radio-label"
                        style={isFlyoutLocation ? { opacity: 0.5 } : undefined}
                        title={
                          isFlyoutLocation
                            ? 'Text labels are only supported in headers and toolbars.'
                            : undefined
                        }
                      >
                        <input
                          type="radio"
                          name="layoutType"
                          value="label"
                          disabled={isFlyoutLocation}
                          checked={selectedLayoutType === 'label'}
                          onChange={() => setSelectedLayoutType('label')}
                        />
                        Text Label (Static text or section title)
                      </label>
                    </div>
                  </div>

                  {selectedLayoutType === 'label' && (
                    <div className="form-grid-2">
                      <div className="form-group">
                        <label className="form-label">
                          Label Text <span className="required-star">*</span>
                        </label>
                        <input
                          value={labelText}
                          onChange={(e) => setLabelText(e.target.value)}
                          placeholder="e.g. Tools"
                          className="form-input"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">
                          Hover Tooltip (optional)
                        </label>
                        <input
                          value={labelTitle}
                          onChange={(e) => setLabelTitle(e.target.value)}
                          placeholder="e.g. Main Document Tools"
                          className="form-input"
                        />
                      </div>
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">
                      Data Element ID <span className="required-star">*</span>
                    </label>
                    <input
                      value={layoutDataElement}
                      onChange={(e) => setLayoutDataElement(e.target.value)}
                      placeholder="e.g. divider-1 or headerLabel"
                      className="form-input monospace"
                      required
                    />
                  </div>
                </div>
              )}

              {/* TAB 9: NEW RIBBON TAB */}
              {activeTab === 'ribbonTab' && (
                <div className="tab-pane">
                  <p className="tab-description">
                    Create a brand new top-level Ribbon Tab (e.g.{' '}
                    <em>"Annotate"</em>, <em>"Forms"</em>, <em>"Sign"</em>).
                    Once created, you can select it and add specific tool
                    buttons into it.
                  </p>

                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label">
                        Tab Label <span className="required-star">*</span>
                      </label>
                      <input
                        value={newTabLabel}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewTabLabel(val);
                          if (!isGroupIdCustomized) {
                            const autoId = `toolbarGroup-${val.trim().replace(/\s+/g, '')}`;
                            setNewTabGroupId(autoId);
                          }
                        }}
                        placeholder="e.g. Review, Annotate, Forms"
                        className="form-input"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        Group ID (dataElement){' '}
                        <span className="required-star">*</span>
                      </label>
                      <input
                        value={newTabGroupId}
                        onChange={(e) => {
                          setNewTabGroupId(e.target.value);
                          setIsGroupIdCustomized(true);
                        }}
                        placeholder="e.g. toolbarGroup-Review"
                        className="form-input monospace"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Footer Actions */}
              <div className="button-group modal-footer">
                <button
                  type="button"
                  onClick={onClose}
                  className="cancel-button"
                >
                  Cancel
                </button>
                <button type="submit" className="submit-button">
                  {activeTab === 'ribbonTab'
                    ? 'Create Ribbon Tab'
                    : activeTab === 'tabPanel'
                      ? 'Create Tab Panel'
                      : activeTab === 'newFlyout'
                        ? 'Create Flyout Menu'
                        : activeTab === 'flyout'
                          ? 'Add Flyout Toggle'
                          : 'Add Component'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
