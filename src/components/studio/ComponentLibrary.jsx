import React, { useState, useMemo, useEffect } from 'react';
import {
  TOOLS_CATALOG,
  PRESET_BUTTONS_CATALOG,
  PANELS_CATALOG,
  LAYOUT_ELEMENTS_CATALOG,
  BUILTIN_POPUP_ITEMS_CATALOG,
} from '../../constants/webviewerCatalog';
import {
  buildAvailableTargets,
  resolveTargetContainer,
} from '../../utils/draftBuilders';
import ComponentBadge from '../ComponentBadge';

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
  stagedDraft,
  onStageItem,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('all');

  const availableTargets = useMemo(
    () => buildAvailableTargets(config),
    [config],
  );

  const currentTarget = useMemo(
    () => resolveTargetContainer(activeTarget, config, availableTargets),
    [activeTarget, config, availableTargets],
  );

  const isFlyoutTarget =
    currentTarget.type === 'flyout' || currentTarget.type === 'submenu';
  const isPopupTarget = currentTarget.type === 'popup';
  const stagedKey = stagedDraft?.stageKey || null;

  // Auto-switch category and scroll into view when a draft is staged
  useEffect(() => {
    if (!stagedDraft?.kind) return;
    const kind = stagedDraft.kind;
    if (['header', 'ribbonTab', 'flyout', 'tabPanel'].includes(kind)) {
      if (category !== 'all' && category !== 'container') {
        setCategory('container');
      }
    } else if (kind === 'tool' && category !== 'all' && category !== 'tool') {
      setCategory('tool');
    } else if (
      kind === 'preset' &&
      category !== 'all' &&
      category !== 'preset'
    ) {
      setCategory('preset');
    } else if (
      kind === 'layout' &&
      category !== 'all' &&
      category !== 'layout'
    ) {
      setCategory('layout');
    } else if (kind === 'panel' && category !== 'all' && category !== 'panel') {
      setCategory('panel');
    } else if (
      (kind === 'toggleButton' || kind === 'submenu') &&
      category !== 'all' &&
      category !== 'interactive'
    ) {
      setCategory('interactive');
    } else if (
      kind === 'popupAction' &&
      category !== 'all' &&
      category !== 'popup'
    ) {
      setCategory('popup');
    }

    const timer = setTimeout(() => {
      const el = document.querySelector('.library-card.staged');
      if (el) {
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [stagedDraft]);

  // When activeTarget changes without a staged draft, preset the most relevant category
  useEffect(() => {
    if (stagedDraft) return;
    if (activeTarget?.type === 'popup') {
      setCategory('popup');
    } else {
      setCategory('all');
    }
  }, [activeTarget, stagedDraft]);

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

  const handleStage = (itemSpec) => {
    if (onStageItem) {
      let targetToUse = currentTarget;
      if (itemSpec.kind === 'toggleButton' && isFlyoutTarget) {
        targetToUse =
          availableTargets.find(
            (t) => t.type !== 'flyout' && t.type !== 'submenu',
          ) || currentTarget;
      }
      onStageItem(itemSpec, targetToUse);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
      }}
    >
      {/* SEARCH BAR */}
      <div className="studio-pane-toolbar">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search..."
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
                'Toggle Button',
                'Opens a Flyout menu or Sidebar Panel',
              ) && (
                <div
                  className={`library-card ${stagedKey === 'interactive:toggleButton' ? 'staged' : ''}`}
                  title="Toggle Button • Opens a Flyout dropdown or Sidebar panel"
                  onClick={() => {
                    handleStage({ kind: 'toggleButton' });
                  }}
                >
                  <div className="library-card-icon-col">
                    <ComponentBadge
                      component={{
                        type: 'toggleButton',
                        dataElement: 'customToggle',
                        img: 'icon-header-sidebar-line',
                      }}
                    />
                  </div>
                  <div className="library-card-info">
                    <div className="library-card-title">Toggle Button</div>
                  </div>
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
                  className={`library-card ${stagedKey === 'interactive:submenu' ? 'staged' : ''}`}
                  title="Nested Submenu • Drill-down child menu inside a flyout"
                  onClick={() => handleStage({ kind: 'submenu' })}
                >
                  <div className="library-card-icon-col">
                    <ComponentBadge
                      component={{
                        type: 'customButton',
                        dataElement: 'submenu',
                        img: 'icon-header-chevron-right',
                        isSubmenu: true,
                      }}
                    />
                  </div>
                  <div className="library-card-info">
                    <div className="library-card-title">Nested Submenu</div>
                  </div>
                </div>
              )}

            {showCategory('container') &&
              matchesSearch(
                'Modular Header',
                'Top, bottom, left, or right bar',
              ) && (
                <div
                  className={`library-card ${stagedKey === 'container:header' ? 'staged' : ''}`}
                  title="Modular Header Bar • New edge toolbar (top, bottom, left, right)"
                  onClick={() => handleStage({ kind: 'header' })}
                >
                  <div className="library-card-icon-col">
                    <ComponentBadge
                      component={{
                        type: 'header',
                        dataElement: 'top-header',
                      }}
                    />
                  </div>
                  <div className="library-card-info">
                    <div className="library-card-title">Modular Header Bar</div>
                  </div>
                </div>
              )}

            {showCategory('container') &&
              matchesSearch(
                'Ribbon Tab',
                'Interactive tab inside header RibbonGroup',
              ) && (
                <div
                  className={`library-card ${stagedKey === 'container:ribbonTab' ? 'staged' : ''}`}
                  title="Ribbon Tab (RibbonItem) • Interactive tab with auto-wired tool group"
                  onClick={() => handleStage({ kind: 'ribbonTab' })}
                >
                  <div className="library-card-icon-col">
                    <ComponentBadge
                      component={{
                        type: 'ribbonItem',
                        dataElement: 'reviewRibbonItem',
                      }}
                    />
                  </div>
                  <div className="library-card-info">
                    <div className="library-card-title">
                      Ribbon Tab (RibbonItem)
                    </div>
                  </div>
                </div>
              )}

            {showCategory('container') &&
              matchesSearch(
                'Flyout Menu',
                'Dropdown container with toggle button',
              ) && (
                <div
                  className={`library-card ${stagedKey === 'container:flyout' ? 'staged' : ''}`}
                  title="Flyout Menu • Dropdown overlay container + header toggle button"
                  onClick={() => handleStage({ kind: 'flyout' })}
                >
                  <div className="library-card-icon-col">
                    <ComponentBadge
                      component={{
                        type: 'flyout',
                        dataElement: 'customFlyout',
                        img: 'icon-tools-more',
                      }}
                    />
                  </div>
                  <div className="library-card-info">
                    <div className="library-card-title">Flyout Menu</div>
                  </div>
                </div>
              )}

            {showCategory('container') &&
              matchesSearch(
                'Tab Panel Sidebar',
                'Multi-tab dockable sidebar',
              ) && (
                <div
                  className={`library-card ${stagedKey === 'container:tabPanel' ? 'staged' : ''}`}
                  title="Tab Panel Sidebar • Dockable sidebar housing Thumbnails, Outlines, Bookmarks"
                  onClick={() => handleStage({ kind: 'tabPanel' })}
                >
                  <div className="library-card-icon-col">
                    <ComponentBadge
                      component={{
                        type: 'flyoutPanel',
                        render: 'tabPanel',
                        dataElement: 'tabPanel',
                        img: 'icon-header-sidebar-line',
                      }}
                    />
                  </div>
                  <div className="library-card-info">
                    <div className="library-card-title">Tab Panel Sidebar</div>
                  </div>
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
            const itemStageKey = `tool:${tool.key}`;
            return (
              <div
                key={tool.key}
                className={`library-card ${stagedKey === itemStageKey ? 'staged' : ''}`}
                title={`${tool.label} (${tool.toolName}) • ${tool.category} • ${tool.title}`}
                onClick={() => handleStage({ kind: 'tool', meta: tool })}
              >
                <div className="library-card-icon-col">
                  <ComponentBadge
                    component={{
                      type: 'toolButton',
                      toolName: tool.toolName,
                      dataElement: tool.defaultId || tool.key,
                      img: tool.icon,
                    }}
                  />
                </div>
                <div className="library-card-info">
                  <div className="library-card-title">{tool.label}</div>
                </div>
              </div>
            );
          })}

        {/* 3. PRESET BUTTONS CATALOG */}
        {showCategory('preset') &&
          PRESET_BUTTONS_CATALOG.map((preset) => {
            if (!matchesSearch(preset.label, preset.title, preset.buttonType)) {
              return null;
            }

            const itemStageKey = `preset:${preset.buttonType}`;
            return (
              <div
                key={preset.buttonType}
                className={`library-card ${stagedKey === itemStageKey ? 'staged' : ''}`}
                title={`${preset.label} (${preset.buttonType}) • ${preset.category} • ${preset.title}`}
                onClick={() => handleStage({ kind: 'preset', meta: preset })}
              >
                <div className="library-card-icon-col">
                  <ComponentBadge
                    component={{
                      type: preset.type || 'presetButton',
                      dataElement: preset.defaultId || preset.buttonType,
                      img: preset.icon,
                      toggleElement: preset.toggleElement,
                    }}
                  />
                </div>
                <div className="library-card-info">
                  <div className="library-card-title">{preset.label}</div>
                </div>
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

            const itemStageKey = `layout:${layout.type}`;
            return (
              <div
                key={layout.type}
                className={`library-card ${stagedKey === itemStageKey ? 'staged' : ''}`}
                title={`${layout.name} • ${layout.description}`}
                onClick={() => handleStage({ kind: 'layout', meta: layout })}
              >
                <div className="library-card-icon-col">
                  <ComponentBadge
                    component={{
                      type: layout.type,
                      dataElement: layout.type,
                    }}
                  />
                </div>
                <div className="library-card-info">
                  <div className="library-card-title">{layout.name}</div>
                </div>
              </div>
            );
          })}

        {/* 5. PANELS CATALOG */}
        {showCategory('panel') &&
          PANELS_CATALOG.map((panel) => {
            if (!matchesSearch(panel.name, panel.toggleTitle, panel.id)) {
              return null;
            }
            const itemStageKey = `panel:${panel.id}`;
            return (
              <div
                key={panel.id}
                className={`library-card ${stagedKey === itemStageKey ? 'staged' : ''}`}
                title={`${panel.name} (${panel.id}) • ${panel.category} Panel • Default: ${panel.defaultLocation}`}
                onClick={() => handleStage({ kind: 'panel', meta: panel })}
              >
                <div className="library-card-icon-col">
                  <ComponentBadge
                    component={{
                      type: 'flyoutPanel',
                      render: panel.render,
                      dataElement: panel.id,
                      img: panel.toggleIcon,
                    }}
                  />
                </div>
                <div className="library-card-info">
                  <div className="library-card-title">{panel.name}</div>
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
            const itemStageKey = `popup:${pItem.dataElement}`;
            return (
              <div
                key={pItem.dataElement}
                className={`library-card ${stagedKey === itemStageKey ? 'staged' : ''}`}
                title={`${pItem.label} (${pItem.dataElement}) • Context: ${pItem.context}`}
                onClick={() =>
                  handleStage({ kind: 'popupAction', meta: pItem })
                }
              >
                <div className="library-card-icon-col">
                  <ComponentBadge
                    component={{
                      type: 'popupAction',
                      dataElement: pItem.dataElement,
                      img: pItem.icon,
                    }}
                  />
                </div>
                <div className="library-card-info">
                  <div className="library-card-title">{pItem.label}</div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
