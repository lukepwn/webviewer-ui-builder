import React from 'react';
import {
  TOOLS_CATALOG,
  PANELS_CATALOG,
  TAB_PANEL_SUPPORTED_TABS,
  POPUPS_CATALOG,
  DEFAULT_POPUPS,
  resolvePanelTarget,
} from '../../constants/webviewerCatalog';
import {
  SUPPORTED_FLYOUT_PANEL_RENDERS,
  TOOL_ACTION_PREFIX,
} from '../../sdk/sdkRules';
import { getFriendlyComponentName } from '../../utils/labelUtils';
import { getItemFeatureRequirement } from '../../constants/featureRegistry';

export default function PropertiesInspector({
  width,
  config,
  selectedNode,
  onOpenAddForTarget,
  onUpdateHeader,
  onUpdateToolsHeader,
  getRibbonLayoutForHeader,
  onSetRibbonLayout,
  onUpdateComponent,
  onCreateFlyoutAndLinkToggle,
  onCreateToggleForFlyout,
  onChangePanelLocation,
  onMovePanelBetweenSidebarAndFlyout,
  onUpdateTabPanelChildren,
  onUpdatePopup,
  onDeleteHeader,
  onDeleteRibbonTab,
  onDeleteFlyout,
  onDeleteTool,
  onDeletePanel,
  onRemovePopupItem,
}) {
  const paneStyle = width ? { width } : undefined;

  if (!selectedNode) {
    return (
      <aside className="studio-right-pane" style={paneStyle}>
        <div className="inspector-header">
          <span className="inspector-title">Properties</span>
        </div>
        <div className="inspector-empty">
          Select any header, tab, tool, flyout, panel, or popup in the Outline
          to inspect and edit its properties.
        </div>
      </aside>
    );
  }

  const { type, id } = selectedNode;

  // --- 1. HEADER INSPECTOR ---
  if (type === 'header') {
    const headerDef = config.modularHeaders?.[id];
    if (!headerDef) {
      return (
        <aside className="studio-right-pane" style={paneStyle}>
          <div className="inspector-header">
            <span className="inspector-title">Properties</span>
          </div>
          <div className="inspector-empty">Header not found.</div>
        </aside>
      );
    }

    const ribbonLayout = getRibbonLayoutForHeader
      ? getRibbonLayoutForHeader(id)
      : 'separate';
    const toolsHeaderDef = config.modularHeaders?.['tools-header'];
    const headerPlacement = headerDef.placement || 'top';

    return (
      <aside className="studio-right-pane" style={paneStyle}>
        <div className="inspector-header">
          <span className="inspector-title">Properties</span>
          <span className="inspector-type-badge">Header</span>
        </div>

        <div className="inspector-body">
          <div className="inspector-field">
            <label className="inspector-label">Header ID (dataElement)</label>
            <input className="inspector-input" value={id} disabled />
          </div>

          <div className="inspector-field">
            <label className="inspector-label">Viewport Placement</label>
            <select
              className="inspector-select"
              value={headerPlacement}
              onChange={(e) =>
                onUpdateHeader(id, { placement: e.target.value })
              }
            >
              <option value="top">Top</option>
              <option value="bottom">Bottom</option>
              <option value="left">Left</option>
              <option value="right">Right</option>
            </select>
          </div>

          <div className="inspector-field">
            <label className="inspector-label">Item Gap (px)</label>
            <input
              type="number"
              min="0"
              max="48"
              className="inspector-input"
              value={headerDef.gap ?? 12}
              onChange={(e) =>
                onUpdateHeader(id, { gap: Number(e.target.value) || 0 })
              }
            />
          </div>

          <div className="inspector-field">
            <label className="inspector-label">Justify Content</label>
            <select
              className="inspector-select"
              value={headerDef.justifyContent || 'start'}
              onChange={(e) =>
                onUpdateHeader(id, { justifyContent: e.target.value })
              }
            >
              <option value="start">Start</option>
              <option value="center">Center</option>
              <option value="end">End</option>
              <option value="space-between">Space Between</option>
            </select>
          </div>

          <label className="inspector-checkbox-row">
            <input
              type="checkbox"
              checked={headerDef.stroke !== false}
              onChange={(e) => onUpdateHeader(id, { stroke: e.target.checked })}
            />
            <span>Show Border Stroke</span>
          </label>

          {/* Ribbon Layout Settings */}
          <div className="inspector-section-card">
            <span className="inspector-section-title">Ribbon Layout</span>
            <div className="inspector-field">
              <label className="inspector-label">Tab &amp; Tool Mounting</label>
              <select
                className="inspector-select"
                value={ribbonLayout}
                onChange={(e) => onSetRibbonLayout(id, e.target.value)}
              >
                <option value="separate">Separate Headers (2 Rows)</option>
                <option value="inline">Inline Header (1 Single Bar)</option>
              </select>
            </div>

            {ribbonLayout === 'separate' && (
              <div className="inspector-field">
                <label className="inspector-label">Tools Bar Placement</label>
                <select
                  className="inspector-select"
                  value={
                    toolsHeaderDef?.placement ||
                    (headerPlacement === 'left' || headerPlacement === 'right'
                      ? 'top'
                      : headerPlacement)
                  }
                  onChange={(e) =>
                    onUpdateToolsHeader({ placement: e.target.value })
                  }
                >
                  <option value="top">Top</option>
                  <option value="bottom">Bottom</option>
                  <option value="left" disabled={headerPlacement === 'left'}>
                    Left {headerPlacement === 'left' ? '(1 header limit)' : ''}
                  </option>
                  <option value="right" disabled={headerPlacement === 'right'}>
                    Right{' '}
                    {headerPlacement === 'right' ? '(1 header limit)' : ''}
                  </option>
                </select>
              </div>
            )}
          </div>

          <div className="inspector-divider" />

          <button
            type="button"
            className="studio-btn primary"
            onClick={() =>
              onOpenAddForTarget({
                type: 'header',
                headerKey: id,
                label: `Header: ${getFriendlyComponentName(id, headerDef)}`,
              })
            }
          >
            + Add Component to Header
          </button>

          <button
            type="button"
            className="studio-btn danger"
            onClick={() => onDeleteHeader(id)}
          >
            Delete Header
          </button>
        </div>
      </aside>
    );
  }

  // --- 2. RIBBON TAB INSPECTOR ---
  if (type === 'ribbonTab') {
    const tabComp = config.modularComponents?.[id] || {};
    const groupKey =
      Array.isArray(tabComp.groupedItems) && tabComp.groupedItems[0];
    const groupComp = groupKey ? config.modularComponents?.[groupKey] : null;
    const headerKey = selectedNode.headerKey || 'default-top-header';

    return (
      <aside className="studio-right-pane" style={paneStyle}>
        <div className="inspector-header">
          <span className="inspector-title">Properties</span>
          <span className="inspector-type-badge">Ribbon Tab</span>
        </div>

        <div className="inspector-body">
          <div className="inspector-field">
            <label className="inspector-label">Tab ID (dataElement)</label>
            <input className="inspector-input" value={id} disabled />
          </div>

          <div className="inspector-field">
            <label className="inspector-label">Tab Label</label>
            <input
              className="inspector-input"
              value={tabComp.label || tabComp.title || ''}
              onChange={(e) =>
                onUpdateComponent(id, {
                  label: e.target.value,
                  title: e.target.value,
                })
              }
              placeholder="e.g. Annotate, Review"
            />
          </div>

          <div className="inspector-field">
            <label className="inspector-label">Hover Tooltip</label>
            <input
              className="inspector-input"
              value={tabComp.title || ''}
              onChange={(e) => onUpdateComponent(id, { title: e.target.value })}
            />
          </div>

          <div className="inspector-field">
            <label className="inspector-label">Tab Icon (optional)</label>
            <input
              className="inspector-input"
              value={tabComp.img || ''}
              onChange={(e) => onUpdateComponent(id, { img: e.target.value })}
              placeholder="e.g. icon-header-chat-line"
            />
          </div>

          {groupComp && (
            <div className="inspector-section-card">
              <span className="inspector-section-title">
                Tool Group Layout ({groupKey})
              </span>
              <div className="inspector-field">
                <label className="inspector-label">Tools Gap (px)</label>
                <input
                  type="number"
                  min="0"
                  max="48"
                  className="inspector-input"
                  value={groupComp.gap ?? 12}
                  onChange={(e) =>
                    onUpdateComponent(groupKey, {
                      gap: Number(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="inspector-field">
                <label className="inspector-label">Justify Tools</label>
                <select
                  className="inspector-select"
                  value={groupComp.justifyContent || 'center'}
                  onChange={(e) =>
                    onUpdateComponent(groupKey, {
                      justifyContent: e.target.value,
                    })
                  }
                >
                  <option value="start">Start</option>
                  <option value="center">Center</option>
                  <option value="end">End</option>
                  <option value="space-between">Space Between</option>
                </select>
              </div>
              <label className="inspector-checkbox-row">
                <input
                  type="checkbox"
                  checked={Boolean(groupComp.alwaysVisible)}
                  onChange={(e) =>
                    onUpdateComponent(groupKey, {
                      alwaysVisible: e.target.checked,
                    })
                  }
                />
                <span>Always Visible</span>
              </label>
            </div>
          )}

          <div className="inspector-divider" />

          <button
            type="button"
            className="studio-btn primary"
            onClick={() =>
              onOpenAddForTarget({
                type: 'ribbon',
                headerKey,
                ribbonTabKey: id,
                label: `Tab: ${getFriendlyComponentName(id, tabComp)}`,
              })
            }
          >
            + Add Tool to Tab
          </button>

          <button
            type="button"
            className="studio-btn danger"
            onClick={() => onDeleteRibbonTab(id)}
          >
            Delete Ribbon Tab
          </button>
        </div>
      </aside>
    );
  }

  // --- 3. TOGGLE BUTTON INSPECTOR ---
  if (type === 'toggle') {
    const comp = config.modularComponents?.[id] || {};
    const currentTarget = comp.toggleElement || comp.element || '';
    const isFlyoutContext = selectedNode.targetContext?.type === 'flyout';
    const panelTarget = resolvePanelTarget(comp);
    const panelDef = panelTarget
      ? config.panels?.[panelTarget] ||
        PANELS_CATALOG.find((p) => p.id === panelTarget)
      : null;

    const catalogPanelIds = new Set(PANELS_CATALOG.map((p) => p.id));
    const customPanelKeys = Object.keys(config.panels || {}).filter(
      (pKey) => !catalogPanelIds.has(pKey),
    );

    return (
      <aside className="studio-right-pane" style={paneStyle}>
        <div className="inspector-header">
          <span className="inspector-title">Properties</span>
          <span className="inspector-type-badge">Toggle Button</span>
        </div>

        <div className="inspector-body">
          <div className="inspector-field">
            <label className="inspector-label">
              Component ID (dataElement)
            </label>
            <input className="inspector-input" value={id} disabled />
          </div>

          <div className="inspector-field">
            <label className="inspector-label">Label</label>
            <input
              className="inspector-input"
              value={comp.label || ''}
              onChange={(e) =>
                onUpdateComponent(id, {
                  label: e.target.value,
                  title: comp.title || e.target.value,
                })
              }
              placeholder="Button label"
            />
          </div>

          <div className="inspector-field">
            <label className="inspector-label">Tooltip (title)</label>
            <input
              className="inspector-input"
              value={comp.title || ''}
              onChange={(e) => onUpdateComponent(id, { title: e.target.value })}
              placeholder="Hover tooltip"
            />
          </div>

          <div className="inspector-field">
            <label className="inspector-label">Icon (img)</label>
            <input
              className="inspector-input"
              value={comp.img || comp.icon || ''}
              onChange={(e) => onUpdateComponent(id, { img: e.target.value })}
              placeholder="e.g. icon-tools-more"
            />
          </div>

          {/* TARGET ELEMENT WIRING */}
          <div className="inspector-section-card">
            <span className="inspector-section-title">
              Target Element Wiring
            </span>
            <div className="inspector-field">
              <label className="inspector-label">Opens Flyout or Panel</label>
              <select
                className="inspector-select"
                value={currentTarget}
                onChange={(e) =>
                  onUpdateComponent(id, {
                    toggleElement: e.target.value,
                    element: e.target.value,
                  })
                }
              >
                {!isFlyoutContext && (
                  <optgroup label="Flyout Menus">
                    {Object.keys(config.flyouts || {}).map((fKey) => (
                      <option key={fKey} value={fKey}>
                        Flyout: {fKey}
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="Sidebar Panels">
                  {customPanelKeys.map((pKey) => {
                    const pDef = config.panels?.[pKey];
                    const isTab = pDef?.render === 'tabPanel';
                    return (
                      <option key={pKey} value={pKey}>
                        {isTab ? `Tab Panel: ${pKey}` : `Custom Panel: ${pKey}`}
                      </option>
                    );
                  })}
                  {PANELS_CATALOG.map((p) => (
                    <option key={p.id} value={p.id}>
                      Panel: {p.name} ({p.id})
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {!isFlyoutContext && (
              <button
                type="button"
                className="studio-btn primary"
                onClick={() => onCreateFlyoutAndLinkToggle(id)}
              >
                + Create New Flyout &amp; Link
              </button>
            )}

            {panelDef && (
              <div className="inspector-field" style={{ marginTop: 4 }}>
                <label className="inspector-label">
                  Sidebar Dock Location ({panelTarget})
                </label>
                <select
                  className="inspector-select"
                  value={
                    config.panels?.[panelTarget]?.location ||
                    panelDef.defaultLocation ||
                    'left'
                  }
                  onChange={(e) =>
                    onChangePanelLocation(panelTarget, e.target.value)
                  }
                >
                  <option value="left">Left Sidebar</option>
                  <option value="right">Right Sidebar</option>
                </select>
              </div>
            )}
          </div>

          <div className="inspector-divider" />

          <button
            type="button"
            className="studio-btn danger"
            onClick={() => onDeleteTool(id, selectedNode.targetContext || {})}
          >
            Delete Toggle Button
          </button>
        </div>
      </aside>
    );
  }

  // --- 4. PANEL INSPECTOR (SIDEBAR OR EMBEDDED IN FLYOUT) ---
  if (type === 'panel') {
    const isFlyoutEmbedded = Boolean(selectedNode.flyoutKey);
    const panelDef = config.panels?.[id] ||
      PANELS_CATALOG.find((p) => p.id === id || p.render === id) || {
        dataElement: id,
        render: id,
        location: 'left',
      };
    const renderName = panelDef.render || id;
    const canEmbedInFlyout = SUPPORTED_FLYOUT_PANEL_RENDERS.has(renderName);
    const isTabPanel = renderName === 'tabPanel';
    const flyoutKeys = Object.keys(config.flyouts || {});

    const activeTabPanelRenders = new Set(
      (panelDef.panelsList || []).map((item) => item.render),
    );

    return (
      <aside className="studio-right-pane" style={paneStyle}>
        <div className="inspector-header">
          <span className="inspector-title">Properties</span>
          <span className="inspector-type-badge">Panel</span>
        </div>

        <div className="inspector-body">
          <div className="inspector-field">
            <label className="inspector-label">Panel ID / Render</label>
            <input className="inspector-input" value={id} disabled />
          </div>

          {/* RENDER LOCATION SWITCH (SIDEBAR VS FLYOUT) */}
          <div className="inspector-section-card">
            <span className="inspector-section-title">Render Location</span>

            {canEmbedInFlyout && flyoutKeys.length > 0 ? (
              <div className="inspector-radio-group">
                <label className="inspector-radio-row">
                  <input
                    type="radio"
                    name="panelRenderMode"
                    checked={!isFlyoutEmbedded}
                    onChange={() =>
                      onMovePanelBetweenSidebarAndFlyout(
                        id,
                        'sidebar',
                        selectedNode.flyoutKey,
                      )
                    }
                  />
                  <span>Dock in Sidebar (Panels)</span>
                </label>
                <label className="inspector-radio-row">
                  <input
                    type="radio"
                    name="panelRenderMode"
                    checked={isFlyoutEmbedded}
                    onChange={() =>
                      onMovePanelBetweenSidebarAndFlyout(
                        id,
                        'flyout',
                        selectedNode.flyoutKey || flyoutKeys[0],
                      )
                    }
                  />
                  <span>Embed inside Flyout Dropdown</span>
                </label>
              </div>
            ) : (
              <div className="inspector-hint">
                Docked in Sidebar.{' '}
                {!isTabPanel &&
                  'Only rubberStampPanel, signatureListPanel, and stylePanel support direct flyout embedding.'}
              </div>
            )}

            {!isFlyoutEmbedded ? (
              <div className="inspector-field">
                <label className="inspector-label">Sidebar Dock Edge</label>
                <select
                  className="inspector-select"
                  value={panelDef.location || 'left'}
                  onChange={(e) => onChangePanelLocation(id, e.target.value)}
                >
                  <option value="left">Left Sidebar</option>
                  <option value="right">Right Sidebar</option>
                </select>
              </div>
            ) : (
              <div className="inspector-field">
                <label className="inspector-label">Host Flyout</label>
                <input
                  className="inspector-input"
                  value={selectedNode.flyoutKey}
                  disabled
                />
              </div>
            )}
          </div>

          {/* TAB PANEL SUB-PANELS */}
          {isTabPanel && (
            <div className="inspector-section-card">
              <span className="inspector-section-title">
                Included Sidebar Tabs
              </span>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  maxHeight: 220,
                  overflowY: 'auto',
                }}
              >
                {TAB_PANEL_SUPPORTED_TABS.map((tabMeta) => {
                  const checked = activeTabPanelRenders.has(tabMeta.render);
                  return (
                    <label key={tabMeta.id} className="inspector-checkbox-row">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const nextRenders = new Set(activeTabPanelRenders);
                          if (e.target.checked) {
                            nextRenders.add(tabMeta.render);
                          } else {
                            nextRenders.delete(tabMeta.render);
                          }
                          onUpdateTabPanelChildren(
                            id,
                            Array.from(nextRenders).map((r) => ({ render: r })),
                          );
                        }}
                      />
                      <span>{tabMeta.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div className="inspector-divider" />

          <button
            type="button"
            className="studio-btn danger"
            onClick={() => {
              if (isFlyoutEmbedded) {
                onDeleteTool(id, selectedNode.targetContext || {});
              } else {
                onDeletePanel(id);
              }
            }}
          >
            {isFlyoutEmbedded ? 'Remove from Flyout' : 'Delete Panel'}
          </button>
        </div>
      </aside>
    );
  }

  // --- 5. FLYOUT CONTAINER INSPECTOR ---
  if (type === 'flyout') {
    const flyoutDef = config.flyouts?.[id] || { items: [] };
    const linkedToggles = Object.entries(config.modularComponents || {}).filter(
      ([, c]) =>
        c?.type === 'toggleButton' &&
        (c.toggleElement === id || c.element === id),
    );

    return (
      <aside className="studio-right-pane" style={paneStyle}>
        <div className="inspector-header">
          <span className="inspector-title">Properties</span>
          <span className="inspector-type-badge">Flyout</span>
        </div>

        <div className="inspector-body">
          <div className="inspector-field">
            <label className="inspector-label">Flyout ID (dataElement)</label>
            <input className="inspector-input" value={id} disabled />
          </div>

          <div className="inspector-section-card">
            <span className="inspector-section-title">
              Trigger Toggle Buttons
            </span>
            {linkedToggles.length === 0 ? (
              <div className="inspector-hint">
                No toggle button currently targets this flyout.
              </div>
            ) : (
              linkedToggles.map(([tKey, tComp]) => (
                <div
                  key={tKey}
                  style={{
                    fontSize: 12,
                    padding: '4px 8px',
                    background: '#fff',
                    border: '1px solid #cbd5e1',
                    borderRadius: 5,
                  }}
                >
                  {getFriendlyComponentName(tKey, tComp)} ({tKey})
                </div>
              ))
            )}
            <button
              type="button"
              className="studio-btn"
              onClick={() => onCreateToggleForFlyout(id)}
            >
              + Add Toggle Button to Header
            </button>
          </div>

          <div className="inspector-divider" />

          <button
            type="button"
            className="studio-btn primary"
            onClick={() =>
              onOpenAddForTarget({
                type: 'flyout',
                flyoutKey: id,
                label: `Flyout: ${getFriendlyComponentName(id, flyoutDef)}`,
              })
            }
          >
            + Add Item to Flyout
          </button>

          <button
            type="button"
            className="studio-btn danger"
            onClick={() => onDeleteFlyout(id)}
          >
            {id === 'viewControlsFlyout'
              ? 'Clear Flyout Items'
              : 'Delete Flyout'}
          </button>
        </div>
      </aside>
    );
  }

  // --- 6. SUBMENU INSPECTOR ---
  if (type === 'submenu') {
    const comp = config.modularComponents?.[id] || {};
    return (
      <aside className="studio-right-pane" style={paneStyle}>
        <div className="inspector-header">
          <span className="inspector-title">Properties</span>
          <span className="inspector-type-badge">Submenu</span>
        </div>

        <div className="inspector-body">
          <div className="inspector-field">
            <label className="inspector-label">Submenu ID</label>
            <input className="inspector-input" value={id} disabled />
          </div>

          <div className="inspector-field">
            <label className="inspector-label">Label</label>
            <input
              className="inspector-input"
              value={comp.label || ''}
              onChange={(e) =>
                onUpdateComponent(id, {
                  label: e.target.value,
                  title: e.target.value,
                })
              }
            />
          </div>

          <div className="inspector-field">
            <label className="inspector-label">Icon</label>
            <input
              className="inspector-input"
              value={comp.img || 'icon-header-chevron-right'}
              onChange={(e) => onUpdateComponent(id, { img: e.target.value })}
            />
          </div>

          <div className="inspector-divider" />

          <button
            type="button"
            className="studio-btn primary"
            onClick={() =>
              onOpenAddForTarget({
                type: 'submenu',
                parentKey: id,
                flyoutKey: selectedNode.flyoutKey,
                label: `Submenu: ${getFriendlyComponentName(id, comp)}`,
              })
            }
          >
            + Add Item to Submenu
          </button>

          <button
            type="button"
            className="studio-btn danger"
            onClick={() => onDeleteTool(id, selectedNode.targetContext || {})}
          >
            Delete Submenu
          </button>
        </div>
      </aside>
    );
  }

  // --- 7. POPUP / POPUP ITEM INSPECTOR ---
  if (type === 'popup' || type === 'popupItem') {
    const popupKey = type === 'popup' ? id : selectedNode.popupKey;
    const popupMeta = POPUPS_CATALOG.find((p) => p.id === popupKey);

    return (
      <aside className="studio-right-pane" style={paneStyle}>
        <div className="inspector-header">
          <span className="inspector-title">Properties</span>
          <span className="inspector-type-badge">
            {type === 'popup' ? 'Popup' : 'Popup Action'}
          </span>
        </div>

        <div className="inspector-body">
          <div className="inspector-field">
            <label className="inspector-label">Popup Container</label>
            <input
              className="inspector-input"
              value={popupMeta?.name || popupKey}
              disabled
            />
          </div>

          {popupMeta?.description && (
            <div className="inspector-hint">{popupMeta.description}</div>
          )}

          {type === 'popupItem' && (
            <div className="inspector-section-card">
              <span className="inspector-section-title">Selected Item</span>
              <div className="inspector-field">
                <label className="inspector-label">Item ID (dataElement)</label>
                <input className="inspector-input" value={id} disabled />
              </div>
              <button
                type="button"
                className="studio-btn danger"
                onClick={() => onRemovePopupItem(popupKey, selectedNode.index)}
              >
                Remove from Popup
              </button>
            </div>
          )}

          <div className="inspector-divider" />

          <button
            type="button"
            className="studio-btn primary"
            onClick={() =>
              onOpenAddForTarget({
                type: 'popup',
                popupKey,
                label: popupMeta?.name || popupKey,
              })
            }
          >
            + Add Action to Popup
          </button>

          <button
            type="button"
            className="studio-btn"
            onClick={() =>
              onUpdatePopup(
                popupKey,
                (DEFAULT_POPUPS[popupKey] || []).map((i) => ({ ...i })),
              )
            }
          >
            Restore Default Popup Items
          </button>

          <button
            type="button"
            className="studio-btn danger"
            onClick={() => onUpdatePopup(popupKey, [])}
          >
            Clear All Popup Items
          </button>
        </div>
      </aside>
    );
  }

  // --- 8. STANDARD COMPONENT INSPECTOR (TOOL, PRESET, CUSTOM, CONTROL, LAYOUT) ---
  const comp = config.modularComponents?.[id] || {
    type: id === 'divider' ? 'divider' : 'toolButton',
    dataElement: id,
  };
  const compType = comp.type || 'component';
  const isDividerOrSpacer = compType === 'divider' || compType === 'spacer';
  const isToolOrCustom =
    compType === 'toolButton' || compType === 'customButton';
  const featureReq = getItemFeatureRequirement(id, comp);
  const implicitPanelId = resolvePanelTarget(comp);

  return (
    <aside className="studio-right-pane" style={paneStyle}>
      <div className="inspector-header">
        <span className="inspector-title">Properties</span>
        <span className="inspector-type-badge">{compType}</span>
      </div>

      <div className="inspector-body">
        <div className="inspector-field">
          <label className="inspector-label">Component ID (dataElement)</label>
          <input className="inspector-input" value={id} disabled />
        </div>

        {featureReq && (
          <div
            className="inspector-section-card"
            style={{ backgroundColor: '#fffbeb', borderColor: '#fde68a' }}
          >
            <span
              className="inspector-section-title"
              style={{ color: '#92400e' }}
            >
              Feature Requirement
            </span>
            <div className="inspector-hint" style={{ color: '#92400e' }}>
              {featureReq.tooltip}
            </div>
          </div>
        )}

        {!isDividerOrSpacer && (
          <>
            <div className="inspector-field">
              <label className="inspector-label">Label</label>
              <input
                className="inspector-input"
                value={comp.label || ''}
                onChange={(e) =>
                  onUpdateComponent(id, {
                    label: e.target.value,
                    title: comp.title || e.target.value,
                  })
                }
                placeholder={getFriendlyComponentName(id, comp)}
              />
            </div>

            <div className="inspector-field">
              <label className="inspector-label">Tooltip (title)</label>
              <input
                className="inspector-input"
                value={comp.title || ''}
                onChange={(e) =>
                  onUpdateComponent(id, { title: e.target.value })
                }
                placeholder="Hover tooltip"
              />
            </div>

            <div className="inspector-field">
              <label className="inspector-label">Icon (img)</label>
              <input
                className="inspector-input"
                value={comp.img || comp.icon || ''}
                onChange={(e) => onUpdateComponent(id, { img: e.target.value })}
                placeholder="e.g. icon-tool-pen-line"
              />
            </div>
          </>
        )}

        {isToolOrCustom && (
          <div className="inspector-section-card">
            <span className="inspector-section-title">Tool Activation</span>
            <div className="inspector-field">
              <label className="inspector-label">Target WebViewer Tool</label>
              <select
                className="inspector-select"
                value={comp.toolName || ''}
                onChange={(e) => {
                  const nextTool = e.target.value;
                  onUpdateComponent(id, {
                    toolName: nextTool,
                    ...(compType === 'customButton' && nextTool
                      ? { onClick: `${TOOL_ACTION_PREFIX}${nextTool}` }
                      : {}),
                  });
                }}
              >
                <option value="">(Default / Built-in)</option>
                {TOOLS_CATALOG.map((t) => (
                  <option key={t.key} value={t.toolName}>
                    {t.label} ({t.toolName})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {implicitPanelId && (
          <div className="inspector-section-card">
            <span className="inspector-section-title">
              Associated Panel ({implicitPanelId})
            </span>
            <div className="inspector-field">
              <label className="inspector-label">Sidebar Dock Location</label>
              <select
                className="inspector-select"
                value={config.panels?.[implicitPanelId]?.location || 'left'}
                onChange={(e) =>
                  onChangePanelLocation(implicitPanelId, e.target.value)
                }
              >
                <option value="left">Left Sidebar</option>
                <option value="right">Right Sidebar</option>
              </select>
            </div>
          </div>
        )}

        <div className="inspector-divider" />

        <button
          type="button"
          className="studio-btn danger"
          onClick={() => onDeleteTool(id, selectedNode.targetContext || {})}
        >
          Delete Component
        </button>
      </div>
    </aside>
  );
}
