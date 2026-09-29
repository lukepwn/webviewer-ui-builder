import React, { useState, useEffect, useMemo } from "react";
import {
  TOOLS_CATALOG,
  PRESET_BUTTONS_CATALOG,
  PANELS_CATALOG,
  LAYOUT_ELEMENTS_CATALOG,
} from "../constants/webviewerCatalog";

export default function AddComponentModal({
  isOpen,
  onClose,
  initialTab = "tool",
  initialLocation = null,
  headerOptions = [],
  activeHeader = "",
  ribbonTabs = [],
  activeRibbonTab = "",
  panels = {},
  onAddComponent,
}) {
  const [activeTab, setActiveTab] = useState(initialTab || "tool"); // 'tool' | 'preset' | 'toggle' | 'controls' | 'layout' | 'ribbonTab'
  const [targetLocationType, setTargetLocationType] = useState(
    initialLocation || (ribbonTabs.length > 0 ? "ribbon" : "header"),
  ); // 'header' | 'ribbon'
  const [selectedHeader, setSelectedHeader] = useState(
    activeHeader || headerOptions[0] || "default-top-header",
  );
  const [selectedRibbonTab, setSelectedRibbonTab] = useState(
    (ribbonTabs.some((t) => t.key === activeRibbonTab) && activeRibbonTab) ||
      (ribbonTabs[0] && ribbonTabs[0].key) ||
      "",
  );

  // Tool form state
  const [toolSearch, setToolSearch] = useState("");
  const [selectedToolKey, setSelectedToolKey] = useState(
    TOOLS_CATALOG[0]?.toolName || "Pan",
  );
  const [toolLabel, setToolLabel] = useState("");
  const [toolTitle, setToolTitle] = useState("");
  const [toolDataElement, setToolDataElement] = useState("");
  const [toolIcon, setToolIcon] = useState(
    TOOLS_CATALOG[0]?.icon || "icon-header-pan",
  );

  const filteredTools = useMemo(() => {
    if (!toolSearch.trim()) return TOOLS_CATALOG;
    const q = toolSearch.toLowerCase();
    return TOOLS_CATALOG.filter(
      (t) =>
        t.label.toLowerCase().includes(q) ||
        t.toolName.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q),
    );
  }, [toolSearch]);

  // Preset button state
  const [selectedPresetType, setSelectedPresetType] = useState(
    PRESET_BUTTONS_CATALOG[0]?.buttonType || "downloadButton",
  );
  const [presetLabel, setPresetLabel] = useState("");
  const [presetTitle, setPresetTitle] = useState("");
  const [presetDataElement, setPresetDataElement] = useState("");
  const [presetIcon, setPresetIcon] = useState(
    PRESET_BUTTONS_CATALOG[0]?.icon || "icon-download",
  );

  // Panel toggle state
  const [selectedPanelTarget, setSelectedPanelTarget] = useState(
    Object.keys(panels)[0] || PANELS_CATALOG[0]?.id || "thumbnailsPanel",
  );
  const [toggleLabel, setToggleLabel] = useState("");
  const [toggleTitle, setToggleTitle] = useState("");
  const [toggleDataElement, setToggleDataElement] = useState("");
  const [toggleIcon, setToggleIcon] = useState(
    PANELS_CATALOG[0]?.toggleIcon || "icon-panel-thumbnail-line",
  );

  // Controls & layout state
  const [selectedLayoutType, setSelectedLayoutType] = useState(
    LAYOUT_ELEMENTS_CATALOG[0]?.type || "pageControls",
  );
  const [layoutDataElement, setLayoutDataElement] = useState("");
  const [labelText, setLabelText] = useState("");
  const [labelTitle, setLabelTitle] = useState("");

  // New ribbon tab state
  const [newTabLabel, setNewTabLabel] = useState("");
  const [newTabGroupId, setNewTabGroupId] = useState("");
  const [isGroupIdCustomized, setIsGroupIdCustomized] = useState(false);

  // Reset and synchronize state when modal opens or target context changes
  useEffect(() => {
    if (isOpen) {
      if (initialTab) setActiveTab(initialTab);
      setLabelText("");
      setLabelTitle("");

      if (activeHeader) {
        setSelectedHeader(activeHeader);
      } else if (headerOptions.length > 0) {
        setSelectedHeader(headerOptions[0]);
      }

      if (ribbonTabs.length === 0) {
        setTargetLocationType("header");
        setSelectedRibbonTab("");
      } else {
        const preferredLoc =
          initialLocation || (activeRibbonTab ? "ribbon" : "header");
        setTargetLocationType(preferredLoc);
        if (
          activeRibbonTab &&
          ribbonTabs.some((t) => t.key === activeRibbonTab)
        ) {
          setSelectedRibbonTab(activeRibbonTab);
        } else {
          setSelectedRibbonTab(ribbonTabs[0]?.key || "");
        }
      }

      setToolSearch("");
      setNewTabLabel("");
      setNewTabGroupId("");
      setIsGroupIdCustomized(false);
    }
  }, [
    isOpen,
    initialTab,
    initialLocation,
    activeHeader,
    activeRibbonTab,
    ribbonTabs,
    headerOptions,
  ]);

  // Auto-select first matching tool when search filters the list
  useEffect(() => {
    if (filteredTools.length > 0) {
      const isSelectedInFiltered = filteredTools.some(
        (t) => t.toolName === selectedToolKey,
      );
      if (!isSelectedInFiltered) {
        setSelectedToolKey(filteredTools[0].toolName);
      }
    }
  }, [filteredTools, selectedToolKey]);

  // Update tool defaults on tool selection
  useEffect(() => {
    const tool = TOOLS_CATALOG.find((t) => t.toolName === selectedToolKey);
    if (tool) {
      setToolLabel(tool.label);
      setToolTitle(tool.title);
      setToolDataElement(tool.defaultId);
      setToolIcon(tool.icon || "");
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
      setPresetIcon(preset.icon || "");
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
      setToggleDataElement(panelConfig.id + "Toggle");
      setToggleIcon(panelConfig.toggleIcon || "");
    } else {
      setToggleLabel(selectedPanelTarget);
      setToggleTitle(`Toggle ${selectedPanelTarget}`);
      setToggleDataElement(`${selectedPanelTarget}Toggle`);
      setToggleIcon("icon-header-sidebar-line");
    }
  }, [selectedPanelTarget]);

  // Update layout defaults on layout type selection
  useEffect(() => {
    const layout = LAYOUT_ELEMENTS_CATALOG.find(
      (l) => l.type === selectedLayoutType,
    );
    if (layout) {
      setLayoutDataElement(layout.defaultId);
    }
  }, [selectedLayoutType]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();

    const isRibbonTarget =
      targetLocationType === "ribbon" &&
      Array.isArray(ribbonTabs) &&
      ribbonTabs.length > 0 &&
      selectedRibbonTab &&
      ribbonTabs.some((t) => t.key === selectedRibbonTab);

    const target = {
      headerKey: selectedHeader,
      targetLocationType: isRibbonTarget ? "ribbon" : "header",
      ribbonTabKey: isRibbonTarget ? selectedRibbonTab : null,
    };

    if (activeTab === "tool") {
      if (!toolDataElement || !selectedToolKey) {
        alert("Tool name and Data Element ID are required.");
        return;
      }
      onAddComponent({
        target,
        componentType: "toolButton",
        component: {
          type: "toolButton",
          dataElement: toolDataElement,
          toolName: selectedToolKey,
          label: toolLabel || undefined,
          title: toolTitle || undefined,
          img: toolIcon || undefined,
        },
      });
    } else if (activeTab === "preset") {
      if (!presetDataElement || !selectedPresetType) {
        alert("Preset action and Data Element ID are required.");
        return;
      }
      const presetDef = PRESET_BUTTONS_CATALOG.find(
        (p) => p.buttonType === selectedPresetType,
      );
      const isToggle = presetDef?.type === "toggleButton";

      onAddComponent({
        target,
        componentType: isToggle ? "toggleButton" : "presetButton",
        component: {
          type: isToggle ? "toggleButton" : "presetButton",
          dataElement: presetDataElement,
          ...(isToggle
            ? { toggleElement: presetDef.toggleElement || "MainMenuFlyout" }
            : { buttonType: selectedPresetType }),
          label: presetLabel || undefined,
          title: presetTitle || undefined,
          img: presetIcon || undefined,
        },
      });
    } else if (activeTab === "toggle") {
      if (!toggleDataElement || !selectedPanelTarget) {
        alert("Target panel and Data Element ID are required.");
        return;
      }
      onAddComponent({
        target,
        componentType: "toggleButton",
        component: {
          type: "toggleButton",
          dataElement: toggleDataElement,
          toggleElement: selectedPanelTarget,
          label: toggleLabel || undefined,
          title: toggleTitle || undefined,
          img: toggleIcon || undefined,
        },
      });
    } else if (activeTab === "controls") {
      if (!layoutDataElement) {
        alert("Data Element ID is required.");
        return;
      }
      if (selectedLayoutType === "viewControls") {
        onAddComponent({
          target,
          componentType: "viewControls",
          component: {
            type: "viewControls",
            dataElement: layoutDataElement,
            title: "View Controls",
            icon: "icon-header-page-manipulation-line",
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
    } else if (activeTab === "layout") {
      if (!layoutDataElement) {
        alert("Data Element ID is required.");
        return;
      }
      if (selectedLayoutType === "label") {
        if (!labelText.trim()) {
          alert("Label text is required.");
          return;
        }
        onAddComponent({
          target,
          componentType: "label",
          component: {
            type: "label",
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
    } else if (activeTab === "ribbonTab") {
      if (!newTabLabel.trim()) {
        alert("Ribbon Tab Label is required.");
        return;
      }
      const rawId =
        newTabGroupId.trim() ||
        `toolbarGroup-${newTabLabel.trim().replace(/\s+/g, "")}`;
      const groupId = rawId.startsWith("toolbarGroup-")
        ? rawId
        : `toolbarGroup-${rawId}`;
      const cleanName = groupId.replace(/^toolbarGroup-/, "");
      const groupContainerKey = `${cleanName.charAt(0).toLowerCase()}${cleanName.slice(1)}GroupedItems`;

      onAddComponent({
        target: { headerKey: selectedHeader },
        componentType: "ribbonItem",
        component: {
          type: "ribbonItem",
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

  return (
    <div className="modal-overlay">
      <div className="modal-content large-modal">
        <div className="modal-header-row">
          <h3 className="modal-title">Add Component to WebViewer</h3>
          <button className="modal-close-icon" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Component Category Tabs */}
        <div className="modal-tabs">
          <button
            type="button"
            className={`modal-tab ${activeTab === "tool" ? "active" : ""}`}
            onClick={() => setActiveTab("tool")}
          >
            ✏️ Tool Button
          </button>
          <button
            type="button"
            className={`modal-tab ${activeTab === "preset" ? "active" : ""}`}
            onClick={() => setActiveTab("preset")}
          >
            ⚡ Preset Action
          </button>
          <button
            type="button"
            className={`modal-tab ${activeTab === "toggle" ? "active" : ""}`}
            onClick={() => setActiveTab("toggle")}
          >
            📂 Panel Toggle
          </button>
          <button
            type="button"
            className={`modal-tab ${activeTab === "controls" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("controls");
              setSelectedLayoutType("pageControls");
            }}
          >
            🔢 View & Page
          </button>
          <button
            type="button"
            className={`modal-tab ${activeTab === "layout" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("layout");
              setSelectedLayoutType("divider");
            }}
          >
            📏 Layout & Labels
          </button>
          <button
            type="button"
            className={`modal-tab ${activeTab === "ribbonTab" ? "active" : ""}`}
            onClick={() => setActiveTab("ribbonTab")}
          >
            🏷️ New Ribbon Tab
          </button>
        </div>

        <form onSubmit={handleSubmit} className="form-container">
          {/* Target Location Box */}
          {activeTab !== "ribbonTab" && (
            <div className="target-location-box">
              <label className="form-label font-bold">Target Location:</label>
              <div className="target-selection-row">
                <div className="form-subgroup">
                  <span className="field-hint">Destination Header:</span>
                  <select
                    value={selectedHeader}
                    onChange={(e) => setSelectedHeader(e.target.value)}
                    className="form-select"
                  >
                    {headerOptions.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                {ribbonTabs && ribbonTabs.length > 0 ? (
                  <>
                    <div className="form-subgroup">
                      <span className="field-hint">Place inside:</span>
                      <select
                        value={targetLocationType}
                        onChange={(e) => setTargetLocationType(e.target.value)}
                        className="form-select"
                      >
                        <option value="ribbon">Ribbon Tab (Category)</option>
                        <option value="header">
                          Direct Header (Always Visible)
                        </option>
                      </select>
                    </div>

                    {targetLocationType === "ribbon" && (
                      <div className="form-subgroup">
                        <span className="field-hint">Ribbon Tab:</span>
                        <select
                          value={selectedRibbonTab}
                          onChange={(e) => setSelectedRibbonTab(e.target.value)}
                          className="form-select"
                        >
                          {ribbonTabs.map((tab) => (
                            <option key={tab.key} value={tab.key}>
                              {tab.label || tab.key}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="form-subgroup">
                    <span className="field-hint">Placement:</span>
                    <span className="direct-header-pill">
                      Direct Header (Always Visible)
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 1: TOOL BUTTON */}
          {activeTab === "tool" && (
            <div className="tab-pane">
              <div className="form-group">
                <label className="form-label">Search Tools</label>
                <input
                  type="text"
                  placeholder="Search tools by name or category (e.g. FreeHand, Highlight, Rect)..."
                  value={toolSearch}
                  onChange={(e) => setToolSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                    }
                  }}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Select Tool ({filteredTools.length} available)
                </label>
                {filteredTools.length === 0 ? (
                  <p className="empty-hint">
                    No tools found matching "{toolSearch}".
                  </p>
                ) : (
                  <select
                    value={selectedToolKey}
                    onChange={(e) => setSelectedToolKey(e.target.value)}
                    className="form-select"
                    size={5}
                  >
                    {filteredTools.map((t) => (
                      <option key={t.toolName} value={t.toolName}>
                        [{t.category}] {t.label} ({t.toolName})
                      </option>
                    ))}
                  </select>
                )}
                {selectedToolKey && (
                  <span className="field-hint">
                    Selected Tool: <strong>{selectedToolKey}</strong>
                  </span>
                )}
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Display Label (optional)</label>
                  <input
                    value={toolLabel}
                    onChange={(e) => setToolLabel(e.target.value)}
                    placeholder="e.g. Pencil"
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Hover Tooltip (optional)</label>
                  <input
                    value={toolTitle}
                    onChange={(e) => setToolTitle(e.target.value)}
                    placeholder="e.g. Draw freehand annotations"
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
                    placeholder="e.g. freeHandButton"
                    className="form-input monospace"
                    required
                  />
                  <span className="field-hint">
                    Unique identifier used in WebViewer DOM.
                  </span>
                </div>
                <div className="form-group">
                  <label className="form-label">Button Icon</label>
                  <input
                    value={toolIcon}
                    onChange={(e) => setToolIcon(e.target.value)}
                    placeholder="e.g. icon-tool-pen-line"
                    className="form-input monospace"
                  />
                  <span className="field-hint">
                    WebViewer icon glyph identifier.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PRESET ACTION BUTTON */}
          {activeTab === "preset" && (
            <div className="tab-pane">
              <div className="form-group">
                <label className="form-label">Select Preset Action</label>
                <select
                  value={selectedPresetType}
                  onChange={(e) => setSelectedPresetType(e.target.value)}
                  className="form-select"
                >
                  {PRESET_BUTTONS_CATALOG.map((p) => (
                    <option key={p.buttonType} value={p.buttonType}>
                      [{p.category}] {p.label} — {p.buttonType}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Display Label (optional)</label>
                  <input
                    value={presetLabel}
                    onChange={(e) => setPresetLabel(e.target.value)}
                    placeholder="e.g. Download PDF"
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Hover Tooltip (optional)</label>
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

          {/* TAB 3: PANEL TOGGLE BUTTON */}
          {activeTab === "toggle" && (
            <div className="tab-pane">
              <div className="form-group">
                <label className="form-label">
                  Target Side Panel to Toggle
                </label>
                <select
                  value={selectedPanelTarget}
                  onChange={(e) => setSelectedPanelTarget(e.target.value)}
                  className="form-select"
                >
                  {PANELS_CATALOG.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.id})
                    </option>
                  ))}
                  {Object.keys(panels)
                    .filter((k) => !PANELS_CATALOG.some((p) => p.id === k))
                    .map((k) => (
                      <option key={k} value={k}>
                        Custom Panel: {k}
                      </option>
                    ))}
                </select>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Button Label (optional)</label>
                  <input
                    value={toggleLabel}
                    onChange={(e) => setToggleLabel(e.target.value)}
                    placeholder="e.g. Thumbnails"
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Hover Tooltip (optional)</label>
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

          {/* TAB 4: PAGE & ZOOM CONTROLS */}
          {activeTab === "controls" && (
            <div className="tab-pane">
              <div className="form-group">
                <label className="form-label">Control Type</label>
                <div className="radio-group">
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="controlType"
                      value="pageControls"
                      checked={selectedLayoutType === "pageControls"}
                      onChange={() => setSelectedLayoutType("pageControls")}
                    />
                    Page Controls (Page number input, total pages, prev/next
                    arrows)
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="controlType"
                      value="zoom"
                      checked={selectedLayoutType === "zoom"}
                      onChange={() => setSelectedLayoutType("zoom")}
                    />
                    Zoom Controls (Zoom in, Zoom out, Zoom percentage)
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="controlType"
                      value="viewControls"
                      checked={selectedLayoutType === "viewControls"}
                      onChange={() => setSelectedLayoutType("viewControls")}
                    />
                    View Controls (Layout mode & page rotation dropdown)
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Data Element ID</label>
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

          {/* TAB 5: DIVIDERS, SPACERS & LABELS */}
          {activeTab === "layout" && (
            <div className="tab-pane">
              <div className="form-group">
                <label className="form-label">Layout Element Type</label>
                <div className="radio-group">
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="layoutType"
                      value="divider"
                      checked={selectedLayoutType === "divider"}
                      onChange={() => setSelectedLayoutType("divider")}
                    />
                    Divider (Vertical separator line)
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="layoutType"
                      value="spacer"
                      checked={selectedLayoutType === "spacer"}
                      onChange={() => setSelectedLayoutType("spacer")}
                    />
                    Spacer (Invisible flex expander pushing subsequent items
                    right)
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="layoutType"
                      value="label"
                      checked={selectedLayoutType === "label"}
                      onChange={() => setSelectedLayoutType("label")}
                    />
                    Text Label (Static text or section title)
                  </label>
                </div>
              </div>

              {selectedLayoutType === "label" && (
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">
                      Label Text <span className="required-star">*</span>
                    </label>
                    <input
                      value={labelText}
                      onChange={(e) => setLabelText(e.target.value)}
                      placeholder="e.g. Review Mode"
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
                      placeholder="e.g. Current document mode"
                      className="form-input"
                    />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Data Element ID</label>
                <input
                  value={layoutDataElement}
                  onChange={(e) => setLayoutDataElement(e.target.value)}
                  placeholder={
                    selectedLayoutType === "label"
                      ? "e.g. headerLabel"
                      : "e.g. divider-1"
                  }
                  className="form-input monospace"
                  required
                />
              </div>
            </div>
          )}

          {/* TAB 6: NEW RIBBON TAB */}
          {activeTab === "ribbonTab" && (
            <div className="tab-pane">
              <p className="tab-description">
                Create a new Ribbon Tab (Category) inside the selected header.
                Once created, you can add tools and components specifically
                under this tab.
              </p>

              <div className="form-group">
                <label className="form-label">
                  Ribbon Tab Label <span className="required-star">*</span>
                </label>
                <input
                  value={newTabLabel}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewTabLabel(val);
                    if (!isGroupIdCustomized) {
                      setNewTabGroupId(
                        val.trim()
                          ? `toolbarGroup-${val.trim().replace(/\s+/g, "")}`
                          : "",
                      );
                    }
                  }}
                  placeholder="e.g. Legal Review, Quick Sign, My Tools"
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Toolbar Group ID (optional)
                </label>
                <input
                  value={newTabGroupId}
                  onChange={(e) => {
                    setNewTabGroupId(e.target.value);
                    setIsGroupIdCustomized(e.target.value.trim().length > 0);
                  }}
                  placeholder="e.g. toolbarGroup-LegalReview"
                  className="form-input monospace"
                />
                <span className="field-hint">
                  Identifier that WebViewer uses to switch active tools for this
                  tab.
                </span>
              </div>
            </div>
          )}

          <div className="button-group modal-footer">
            <button type="button" onClick={onClose} className="cancel-button">
              Cancel
            </button>
            <button type="submit" className="submit-button">
              {activeTab === "ribbonTab"
                ? "+ Create Ribbon Tab"
                : "+ Add Component"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
