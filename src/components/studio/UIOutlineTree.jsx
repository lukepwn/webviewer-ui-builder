import React, { useState, useEffect } from 'react';
import ComponentBadge from '../ComponentBadge';
import { getFriendlyComponentName, isDivider } from '../../utils/labelUtils';
import {
  getFlattenedHeaderItems,
  getFlattenedRibbonTabTools,
} from '../../utils/headerAndRibbonUtils';
import { POPUPS_CATALOG } from '../../constants/webviewerCatalog';
import { getItemFeatureRequirement } from '../../constants/featureRegistry';

export default function UIOutlineTree({
  config,
  selectedNode,
  onSelectNode,
  onOpenAddForTarget,
  onCreateHeader,
  onCreateRibbonTab,
  onCreateFlyout,
  onCreateTabPanel,
  onDeleteHeader,
  onDeleteRibbonTab,
  onDeleteFlyout,
  onDeleteTool,
  onDeletePanel,
  onRemovePopupItem,
  onReorderList,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedIds, setCollapsedIds] = useState(new Set(['section:popups']));
  // Ribbon tabs default to collapsed unless explicitly expanded so 10 tabs don't dump 100 tools at once
  const [expandedTabIds, setExpandedTabIds] = useState(new Set());
  const [dragState, setDragState] = useState(null);

  // When selectedNode changes, ensure its parent containers are uncollapsed and expanded
  useEffect(() => {
    if (!selectedNode) return;

    // 1. Expand Ribbon Tab if selected item is a tool or ribbonTab
    const tabKey =
      selectedNode.ribbonKey ||
      selectedNode.targetContext?.ribbonKey ||
      selectedNode.targetContext?.ribbonTabKey ||
      (selectedNode.type === 'ribbonTab' ? selectedNode.id : null);
    if (tabKey) {
      setExpandedTabIds((prev) => {
        if (prev.has(tabKey)) return prev;
        const next = new Set(prev);
        next.add(tabKey);
        return next;
      });
    }

    // 2. Uncollapse sections and parent containers
    setCollapsedIds((prev) => {
      let changed = false;
      const next = new Set(prev);

      // Section: Headers & specific header
      const headerKey =
        selectedNode.headerKey ||
        selectedNode.targetContext?.headerKey ||
        (selectedNode.type === 'header' ? selectedNode.id : null);
      if (headerKey) {
        if (next.has('section:headers')) {
          next.delete('section:headers');
          changed = true;
        }
        if (next.has(`header:${headerKey}`)) {
          next.delete(`header:${headerKey}`);
          changed = true;
        }
        if (next.has(`ribbon-group:${headerKey}`)) {
          next.delete(`ribbon-group:${headerKey}`);
          changed = true;
        }
      }

      // Section: Flyouts & specific flyout / submenu
      const flyoutKey =
        selectedNode.flyoutKey ||
        selectedNode.targetContext?.flyoutKey ||
        (selectedNode.type === 'flyout' ? selectedNode.id : null);
      if (flyoutKey) {
        if (next.has('section:flyouts')) {
          next.delete('section:flyouts');
          changed = true;
        }
        if (next.has(`flyout:${flyoutKey}`)) {
          next.delete(`flyout:${flyoutKey}`);
          changed = true;
        }
      }

      // Section: Panels
      if (selectedNode.type === 'panel') {
        if (next.has('section:panels')) {
          next.delete('section:panels');
          changed = true;
        }
        if (next.has(`panel:${selectedNode.id}`)) {
          next.delete(`panel:${selectedNode.id}`);
          changed = true;
        }
      }

      // Section: Popups & specific popup
      const popupKey =
        selectedNode.popupKey ||
        selectedNode.targetContext?.popupKey ||
        (selectedNode.type === 'popup' ? selectedNode.id : null);
      if (popupKey) {
        if (next.has('section:popups')) {
          next.delete('section:popups');
          changed = true;
        }
        if (next.has(`popup:${popupKey}`)) {
          next.delete(`popup:${popupKey}`);
          changed = true;
        }
      }

      return changed ? next : prev;
    });

    // 3. Scroll selected row into view
    const timer = setTimeout(() => {
      const el = document.querySelector('.tree-row.selected');
      if (el) {
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }, 60);
    return () => clearTimeout(timer);
  }, [selectedNode]);

  const toggleCollapse = (id, e) => {
    if (e) e.stopPropagation();
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const isCollapsed = (id) => collapsedIds.has(id);

  const toggleTabExpand = (tabKey, e) => {
    if (e) e.stopPropagation();
    setExpandedTabIds((prev) => {
      const next = new Set(prev);
      if (next.has(tabKey)) {
        next.delete(tabKey);
      } else {
        next.add(tabKey);
      }
      return next;
    });
  };

  const isTabExpanded = (tabKey) => expandedTabIds.has(tabKey);

  const q = searchQuery.trim().toLowerCase();
  const matchesFilter = (label, key) => {
    if (!q) return true;
    return (
      (label && label.toLowerCase().includes(q)) ||
      (key && key.toLowerCase().includes(q))
    );
  };

  // --- Drag & Drop Helpers ---
  const handleDragStart = (e, listId, index, contextPayload) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = 'move';
    try {
      e.dataTransfer.setData('text/plain', `${listId}:${index}`);
    } catch {
      // ignore
    }
    setDragState({
      listId,
      fromIndex: index,
      overIndex: index,
      contextPayload,
    });
  };

  const handleDragOver = (e, listId, index) => {
    if (!dragState || dragState.listId !== listId) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const position = e.clientY < midY ? 'top' : 'bottom';
    if (dragState.overIndex !== index || dragState.position !== position) {
      setDragState((prev) =>
        prev ? { ...prev, overIndex: index, position } : null,
      );
    }
  };

  const handleDrop = (e, listId, dropIndex) => {
    if (!dragState || dragState.listId !== listId) return;
    e.preventDefault();
    e.stopPropagation();
    const { fromIndex, position, contextPayload } = dragState;
    let toIndex = dropIndex;
    if (position === 'bottom' && fromIndex < dropIndex) {
      toIndex = dropIndex;
    } else if (position === 'top' && fromIndex > dropIndex) {
      toIndex = dropIndex;
    } else if (position === 'bottom' && fromIndex > dropIndex) {
      toIndex = dropIndex + 1;
    } else if (position === 'top' && fromIndex < dropIndex) {
      toIndex = dropIndex - 1;
    }

    if (fromIndex !== toIndex && onReorderList) {
      onReorderList(contextPayload, fromIndex, toIndex);
    }
    setDragState(null);
  };

  const handleDragEnd = () => {
    setDragState(null);
  };

  const getDragClass = (listId, index) => {
    if (!dragState || dragState.listId !== listId) return '';
    if (dragState.fromIndex === index) return 'dragging';
    if (dragState.overIndex === index) {
      return dragState.position === 'top'
        ? 'drag-over-top'
        : 'drag-over-bottom';
    }
    return '';
  };

  // --- Extract Header & Ribbon Data ---
  const userHeaderKeys = Object.keys(config.modularHeaders || {}).filter(
    (k) => k !== 'tools-header',
  );

  const getToolsForRibbonTab = (tabKey) => {
    const { toolKeys, primaryGroupKey } = getFlattenedRibbonTabTools(
      tabKey,
      config.modularComponents,
    );

    const tools = toolKeys.map((k, idx) => {
      const comp =
        config.modularComponents?.[k] ||
        (isDivider(k)
          ? { type: 'divider', dataElement: k }
          : { type: 'toolButton', dataElement: k, toolName: k });
      return {
        key: k,
        index: idx,
        component: comp,
        label: getFriendlyComponentName(k, comp),
      };
    });

    return { tools, groupKey: primaryGroupKey };
  };

  // Recursive Submenu / Flyout item renderer
  const renderFlyoutItems = (
    itemsArray,
    flyoutKey,
    parentSubmenuKey = null,
  ) => {
    const listId = parentSubmenuKey
      ? `submenu:${parentSubmenuKey}`
      : `flyout:${flyoutKey}`;
    const contextPayload = parentSubmenuKey
      ? { type: 'submenu', parentKey: parentSubmenuKey, flyoutKey }
      : { type: 'flyout', flyoutKey };

    return (itemsArray || []).map((entry, idx) => {
      const isObj = typeof entry === 'object' && entry !== null;
      const itemKey = isObj ? entry.dataElement || entry.render : entry;
      const comp = isObj
        ? entry.render && !entry.type
          ? { type: 'flyoutPanel', ...entry, dataElement: itemKey }
          : entry
        : config.modularComponents?.[itemKey] ||
          (isDivider(itemKey)
            ? { type: 'divider', dataElement: itemKey }
            : { dataElement: itemKey, type: 'customButton' });

      const isSubmenu =
        Array.isArray(comp?.children) || Boolean(comp?.isSubmenu);
      const label = getFriendlyComponentName(itemKey, comp);

      if (!matchesFilter(label, itemKey) && !isSubmenu) return null;

      const nodeType = isSubmenu
        ? 'submenu'
        : comp?.type === 'flyoutPanel' || Boolean(comp?.render)
          ? 'panel'
          : comp?.type === 'toggleButton'
            ? 'toggle'
            : 'component';

      const isSel =
        selectedNode?.type === nodeType &&
        selectedNode?.id === itemKey &&
        (selectedNode?.parentId === undefined ||
          selectedNode?.parentId === (parentSubmenuKey || flyoutKey)) &&
        (selectedNode?.index === undefined || selectedNode?.index === idx);

      const collapseKey = `submenu-node:${flyoutKey}:${itemKey}:${idx}`;

      return (
        <div key={`${itemKey}-${idx}`}>
          <div
            className={`tree-row ${isSel ? 'selected' : ''} ${getDragClass(listId, idx)}`}
            draggable={!q}
            onDragStart={(e) => handleDragStart(e, listId, idx, contextPayload)}
            onDragOver={(e) => handleDragOver(e, listId, idx)}
            onDrop={(e) => handleDrop(e, listId, idx)}
            onDragEnd={handleDragEnd}
            onClick={(e) => {
              e.stopPropagation();
              onSelectNode({
                type: nodeType,
                id: itemKey,
                parentId: parentSubmenuKey || flyoutKey,
                flyoutKey,
                index: idx,
                label,
                targetContext: contextPayload,
              });
            }}
          >
            <div className="tree-row-left">
              {isSubmenu ? (
                <span
                  className="tree-Caret"
                  onClick={(e) => toggleCollapse(collapseKey, e)}
                >
                  {isCollapsed(collapseKey) ? '▶' : '▼'}
                </span>
              ) : (
                <span className="tree-drag-handle" title="Drag to reorder">
                  ⋮⋮
                </span>
              )}
              <ComponentBadge component={comp} />
              <span className="tree-row-label">{label}</span>
              {isSubmenu && (
                <span className="tree-row-meta">
                  ({(comp.children || []).length})
                </span>
              )}
            </div>

            <div className="tree-row-actions">
              {isSubmenu && (
                <button
                  type="button"
                  className="tree-action-icon"
                  title="Add item to this submenu"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenAddForTarget({
                      type: 'submenu',
                      parentKey: itemKey,
                      flyoutKey,
                      label: `Submenu: ${label}`,
                    });
                  }}
                >
                  +
                </button>
              )}
              <button
                type="button"
                className="tree-action-icon delete"
                title="Remove item"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteTool(itemKey, {
                    ...contextPayload,
                    index: idx,
                  });
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {isSubmenu && !isCollapsed(collapseKey) && (
            <div className="tree-children">
              {(comp.children || []).length === 0 ? (
                <div className="empty-hint" style={{ paddingLeft: 8 }}>
                  Empty submenu
                </div>
              ) : (
                renderFlyoutItems(comp.children, flyoutKey, itemKey)
              )}
            </div>
          )}
        </div>
      );
    });
  };

  // Render a single Ribbon Tab row and its unwrapped tools
  const renderRibbonTabNode = (tabKey, tabIdx, headerKey, tabsListId) => {
    const tabComp = config.modularComponents?.[tabKey] || {
      type: 'ribbonItem',
      dataElement: tabKey,
    };
    const tabLabel = getFriendlyComponentName(tabKey, tabComp);
    const { tools, groupKey } = getToolsForRibbonTab(tabKey);

    const anyToolMatches =
      q && tools.some((t) => matchesFilter(t.label, t.key));
    if (q && !matchesFilter(tabLabel, tabKey) && !anyToolMatches) {
      return null;
    }

    const isExpanded = q ? true : isTabExpanded(tabKey);
    const isTabSel =
      selectedNode?.type === 'ribbonTab' && selectedNode?.id === tabKey;
    const toolsListId = `tab-tools:${tabKey}`;
    const tabFeatReq = getItemFeatureRequirement(tabKey, tabComp);

    return (
      <div key={`${tabKey}-${tabIdx}`}>
        <div
          className={`tree-row ${isTabSel ? 'selected' : ''} ${getDragClass(tabsListId, tabIdx)}`}
          draggable={!q}
          onDragStart={(e) =>
            handleDragStart(e, tabsListId, tabIdx, {
              type: 'ribbonTabs',
              headerKey,
            })
          }
          onDragOver={(e) => handleDragOver(e, tabsListId, tabIdx)}
          onDrop={(e) => handleDrop(e, tabsListId, tabIdx)}
          onDragEnd={handleDragEnd}
          onClick={(e) => {
            e.stopPropagation();
            // Clicking a ribbon tab selects/activates it AND expands its tools
            if (!isTabExpanded(tabKey)) {
              setExpandedTabIds((prev) => new Set(prev).add(tabKey));
            }
            onSelectNode({
              type: 'ribbonTab',
              id: tabKey,
              parentId: headerKey,
              headerKey,
              groupKey,
              label: tabLabel,
            });
          }}
        >
          <div className="tree-row-left">
            <span className="tree-drag-handle" title="Drag to reorder tab">
              ⋮⋮
            </span>
            <span
              className="tree-Caret"
              onClick={(e) => toggleTabExpand(tabKey, e)}
            >
              {isExpanded ? '▼' : '▶'}
            </span>
            <span className="tree-row-label" style={{ fontWeight: 600 }}>
              {tabLabel}
            </span>
            <span className="tree-row-meta">({tools.length})</span>
            {tabFeatReq && (
              <span
                title={tabFeatReq.tooltip}
                style={{ fontSize: 10, color: '#d97706' }}
              >
                !
              </span>
            )}
          </div>
          <div className="tree-row-actions">
            <button
              type="button"
              className="tree-action-icon"
              title={`Add tool to ${tabLabel}`}
              onClick={(e) => {
                e.stopPropagation();
                onOpenAddForTarget({
                  type: 'ribbon',
                  headerKey,
                  ribbonTabKey: tabKey,
                  label: `Tab: ${tabLabel}`,
                });
              }}
            >
              +
            </button>
            <button
              type="button"
              className="tree-action-icon delete"
              title={`Delete tab ${tabLabel}`}
              onClick={(e) => {
                e.stopPropagation();
                onDeleteRibbonTab(tabKey);
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="tree-children">
            {tools.length === 0 ? (
              <div className="empty-hint" style={{ paddingLeft: 8 }}>
                Empty tab
              </div>
            ) : (
              tools.map((tool, toolIdx) => {
                if (!matchesFilter(tool.label, tool.key)) {
                  return null;
                }
                const cType = tool.component?.type;
                const tNodeType =
                  cType === 'toggleButton' ||
                  cType === 'toggleElementButton' ||
                  Boolean(tool.component?.toggleElement)
                    ? 'toggle'
                    : 'component';

                const isToolSel =
                  selectedNode?.type === tNodeType &&
                  selectedNode?.id === tool.key &&
                  selectedNode?.parentId === tabKey &&
                  (selectedNode?.index === undefined ||
                    selectedNode?.index === toolIdx);

                const toolFeatReq = getItemFeatureRequirement(
                  tool.key,
                  tool.component,
                );

                return (
                  <div
                    key={`${tool.key}-${toolIdx}`}
                    className={`tree-row ${isToolSel ? 'selected' : ''} ${getDragClass(toolsListId, toolIdx)}`}
                    draggable={!q}
                    onDragStart={(e) =>
                      handleDragStart(e, toolsListId, toolIdx, {
                        type: 'ribbon',
                        ribbonKey: tabKey,
                        headerKey,
                      })
                    }
                    onDragOver={(e) => handleDragOver(e, toolsListId, toolIdx)}
                    onDrop={(e) => handleDrop(e, toolsListId, toolIdx)}
                    onDragEnd={handleDragEnd}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectNode({
                        type: tNodeType,
                        id: tool.key,
                        parentId: tabKey,
                        headerKey,
                        ribbonKey: tabKey,
                        index: toolIdx,
                        label: tool.label,
                        targetContext: {
                          type: 'ribbon',
                          ribbonKey: tabKey,
                          headerKey,
                          index: toolIdx,
                        },
                      });
                    }}
                  >
                    <div className="tree-row-left">
                      <span
                        className="tree-drag-handle"
                        title="Drag to reorder tool"
                      >
                        ⋮⋮
                      </span>
                      <ComponentBadge component={tool.component} />
                      <span className="tree-row-label">{tool.label}</span>
                      {toolFeatReq && (
                        <span
                          title={toolFeatReq.tooltip}
                          style={{ fontSize: 10, color: '#d97706' }}
                        >
                          !
                        </span>
                      )}
                    </div>
                    <div className="tree-row-actions">
                      <button
                        type="button"
                        className="tree-action-icon delete"
                        title="Remove tool"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteTool(tool.key, {
                            type: 'ribbon',
                            ribbonKey: tabKey,
                            headerKey,
                            index: toolIdx,
                          });
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    );
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
      <div className="studio-pane-toolbar">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter outline..."
          className="studio-search-input"
        />
      </div>

      <div className="studio-tree-scroll">
        {/* ================= 1. MODULAR HEADERS & RIBBONS ================= */}
        <div className="tree-section">
          <div className="tree-section-header">
            <div
              className="tree-section-header-left"
              onClick={() => toggleCollapse('section:headers')}
            >
              <span className="tree-Caret">
                {isCollapsed('section:headers') ? '▶' : '▼'}
              </span>
              <span>Headers &amp; Ribbons ({userHeaderKeys.length})</span>
            </div>
            <button
              type="button"
              className="tree-inline-add-btn"
              onClick={onCreateHeader}
              title="Create a new Modular Header bar"
            >
              + Header
            </button>
          </div>

          {!isCollapsed('section:headers') && (
            <div className="tree-children">
              {userHeaderKeys.length === 0 ? (
                <div className="empty-hint" style={{ padding: '4px 8px' }}>
                  No headers defined. Click &quot;+ Header&quot; to add one.
                </div>
              ) : (
                userHeaderKeys.map((headerKey) => {
                  const hDef = config.modularHeaders[headerKey];
                  const { visibleItems } = getFlattenedHeaderItems(
                    headerKey,
                    config.modularHeaders,
                    config.modularComponents,
                  );
                  const hCollapseId = `header:${headerKey}`;
                  const isHeaderSelected =
                    selectedNode?.type === 'header' &&
                    selectedNode?.id === headerKey;

                  const headerListId = `header-items:${headerKey}`;
                  const tabsListId = `header-tabs:${headerKey}`;

                  return (
                    <div key={headerKey}>
                      {/* HEADER NODE */}
                      <div
                        className={`tree-row ${isHeaderSelected ? 'selected' : ''}`}
                        onClick={() =>
                          onSelectNode({
                            type: 'header',
                            id: headerKey,
                            label: getFriendlyComponentName(headerKey, hDef),
                          })
                        }
                      >
                        <div className="tree-row-left">
                          <span
                            className="tree-Caret"
                            onClick={(e) => toggleCollapse(hCollapseId, e)}
                          >
                            {isCollapsed(hCollapseId) ? '▶' : '▼'}
                          </span>
                          <span
                            className="tree-row-label"
                            style={{ fontWeight: 600 }}
                          >
                            {getFriendlyComponentName(headerKey, hDef)}
                          </span>
                          <span className="tree-row-meta">
                            ({hDef?.placement || 'top'} · {visibleItems.length})
                          </span>
                        </div>
                        <div className="tree-row-actions">
                          <button
                            type="button"
                            className="tree-action-icon"
                            title="Add item directly to this header"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenAddForTarget({
                                type: 'header',
                                headerKey,
                                label: `Header: ${getFriendlyComponentName(headerKey, hDef)}`,
                              });
                            }}
                          >
                            +
                          </button>
                          <button
                            type="button"
                            className="tree-action-icon delete"
                            title="Delete header"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteHeader(headerKey);
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      {!isCollapsed(hCollapseId) && (
                        <div className="tree-children">
                          {visibleItems.length === 0 ? (
                            <div
                              className="empty-hint"
                              style={{ paddingLeft: 8 }}
                            >
                              Empty header
                            </div>
                          ) : (
                            visibleItems.map((itemKey, idx) => {
                              const comp = config.modularComponents?.[
                                itemKey
                              ] || {
                                type: isDivider(itemKey)
                                  ? 'divider'
                                  : 'toolButton',
                                dataElement: itemKey,
                              };

                              const isRibbonGroup =
                                comp?.type === 'ribbonGroup' ||
                                itemKey === 'default-ribbon-group';

                              // A. RIBBON GROUP NODE (IN ITS EXACT HEADER POSITION)
                              if (isRibbonGroup) {
                                const groupTabs = Array.isArray(comp?.items)
                                  ? comp.items
                                  : [];
                                const rgCollapseId = `ribbongroup:${headerKey}:${itemKey}`;
                                return (
                                  <div key={`${itemKey}-${idx}`}>
                                    <div
                                      className={`tree-row ${getDragClass(headerListId, idx)}`}
                                      draggable={!q}
                                      onDragStart={(e) =>
                                        handleDragStart(e, headerListId, idx, {
                                          type: 'header',
                                          headerKey,
                                        })
                                      }
                                      onDragOver={(e) =>
                                        handleDragOver(e, headerListId, idx)
                                      }
                                      onDrop={(e) =>
                                        handleDrop(e, headerListId, idx)
                                      }
                                      onDragEnd={handleDragEnd}
                                      onClick={() =>
                                        toggleCollapse(rgCollapseId)
                                      }
                                    >
                                      <div className="tree-row-left">
                                        <span
                                          className="tree-drag-handle"
                                          title="Drag to reorder Ribbon Tabs group within header"
                                        >
                                          ⋮⋮
                                        </span>
                                        <span className="tree-Caret">
                                          {isCollapsed(rgCollapseId)
                                            ? '▶'
                                            : '▼'}
                                        </span>
                                        <span
                                          className="tree-row-label"
                                          style={{
                                            color: '#1e293b',
                                            fontWeight: 600,
                                          }}
                                        >
                                          Ribbon Tabs
                                        </span>
                                        <span className="tree-row-meta">
                                          ({groupTabs.length})
                                        </span>
                                      </div>
                                      <div
                                        className="tree-row-actions"
                                        style={{ opacity: 1 }}
                                      >
                                        <button
                                          type="button"
                                          className="tree-action-icon"
                                          title="Create a new Ribbon Tab"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onCreateRibbonTab(headerKey);
                                          }}
                                        >
                                          + Tab
                                        </button>
                                      </div>
                                    </div>

                                    {!isCollapsed(rgCollapseId) && (
                                      <div className="tree-children">
                                        {groupTabs.length === 0 ? (
                                          <div
                                            className="empty-hint"
                                            style={{ paddingLeft: 8 }}
                                          >
                                            No ribbon tabs
                                          </div>
                                        ) : (
                                          groupTabs.map((tabEntry, tabIdx) => {
                                            const tKey =
                                              typeof tabEntry === 'string'
                                                ? tabEntry
                                                : tabEntry?.dataElement;
                                            if (!tKey) return null;
                                            return renderRibbonTabNode(
                                              tKey,
                                              tabIdx,
                                              headerKey,
                                              tabsListId,
                                            );
                                          })
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              }

                              // B. STANDALONE RIBBON ITEM DIRECTLY IN HEADER
                              if (comp?.type === 'ribbonItem') {
                                return renderRibbonTabNode(
                                  itemKey,
                                  idx,
                                  headerKey,
                                  headerListId,
                                );
                              }

                              // C. STANDARD HEADER ITEM (PAN, ZOOM, MENU, VIEW CONTROLS, SEARCH, ETC.)
                              const label = getFriendlyComponentName(
                                itemKey,
                                comp,
                              );
                              if (!matchesFilter(label, itemKey)) {
                                return null;
                              }

                              const compType = comp?.type;
                              const nodeType =
                                compType === 'toggleButton' ||
                                compType === 'toggleElementButton' ||
                                Boolean(comp?.toggleElement)
                                  ? 'toggle'
                                  : 'component';

                              const isItemSel =
                                selectedNode?.type === nodeType &&
                                selectedNode?.id === itemKey &&
                                selectedNode?.parentId === headerKey &&
                                (selectedNode?.index === undefined ||
                                  selectedNode?.index === idx);

                              const featReq = getItemFeatureRequirement(
                                itemKey,
                                comp,
                              );

                              return (
                                <div
                                  key={`${itemKey}-${idx}`}
                                  className={`tree-row ${isItemSel ? 'selected' : ''} ${getDragClass(headerListId, idx)}`}
                                  draggable={!q}
                                  onDragStart={(e) =>
                                    handleDragStart(e, headerListId, idx, {
                                      type: 'header',
                                      headerKey,
                                    })
                                  }
                                  onDragOver={(e) =>
                                    handleDragOver(e, headerListId, idx)
                                  }
                                  onDrop={(e) =>
                                    handleDrop(e, headerListId, idx)
                                  }
                                  onDragEnd={handleDragEnd}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectNode({
                                      type: nodeType,
                                      id: itemKey,
                                      parentId: headerKey,
                                      headerKey,
                                      index: idx,
                                      label,
                                      targetContext: {
                                        type: 'header',
                                        headerKey,
                                        index: idx,
                                      },
                                    });
                                  }}
                                >
                                  <div className="tree-row-left">
                                    <span
                                      className="tree-drag-handle"
                                      title="Drag to reorder"
                                    >
                                      ⋮⋮
                                    </span>
                                    <ComponentBadge component={comp} />
                                    <span className="tree-row-label">
                                      {label}
                                    </span>
                                    {featReq && (
                                      <span
                                        title={featReq.tooltip}
                                        style={{
                                          fontSize: 10,
                                          color: '#d97706',
                                        }}
                                      >
                                        !
                                      </span>
                                    )}
                                  </div>
                                  <div className="tree-row-actions">
                                    <button
                                      type="button"
                                      className="tree-action-icon delete"
                                      title="Remove from header"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteTool(itemKey, {
                                          type: 'header',
                                          headerKey,
                                          index: idx,
                                        });
                                      }}
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* ================= 2. FLYOUTS (DROPDOWN MENUS) ================= */}
        <div className="tree-section">
          <div className="tree-section-header">
            <div
              className="tree-section-header-left"
              onClick={() => toggleCollapse('section:flyouts')}
            >
              <span className="tree-Caret">
                {isCollapsed('section:flyouts') ? '▶' : '▼'}
              </span>
              <span>Flyouts ({Object.keys(config.flyouts || {}).length})</span>
            </div>
            <button
              type="button"
              className="tree-inline-add-btn"
              onClick={onCreateFlyout}
              title="Create a new Flyout menu"
            >
              + Flyout
            </button>
          </div>

          {!isCollapsed('section:flyouts') && (
            <div className="tree-children">
              {Object.keys(config.flyouts || {}).length === 0 ? (
                <div className="empty-hint" style={{ padding: '4px 8px' }}>
                  No flyouts defined
                </div>
              ) : (
                Object.entries(config.flyouts || {}).map(
                  ([flyoutKey, flyoutDef]) => {
                    const items = Array.isArray(flyoutDef?.items)
                      ? flyoutDef.items
                      : [];
                    const fCollapseId = `flyout:${flyoutKey}`;
                    const fLabel = getFriendlyComponentName(
                      flyoutKey,
                      flyoutDef,
                    );
                    const isFlyoutSel =
                      selectedNode?.type === 'flyout' &&
                      selectedNode?.id === flyoutKey;

                    return (
                      <div key={flyoutKey}>
                        <div
                          className={`tree-row ${isFlyoutSel ? 'selected' : ''}`}
                          onClick={() =>
                            onSelectNode({
                              type: 'flyout',
                              id: flyoutKey,
                              label: fLabel,
                            })
                          }
                        >
                          <div className="tree-row-left">
                            <span
                              className="tree-Caret"
                              onClick={(e) => toggleCollapse(fCollapseId, e)}
                            >
                              {isCollapsed(fCollapseId) ? '▶' : '▼'}
                            </span>
                            <span
                              className="tree-row-label"
                              style={{ fontWeight: 600 }}
                            >
                              {fLabel}
                            </span>
                            <span className="tree-row-meta">
                              ({items.length})
                            </span>
                          </div>
                          <div className="tree-row-actions">
                            <button
                              type="button"
                              className="tree-action-icon"
                              title="Add item to this flyout"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenAddForTarget({
                                  type: 'flyout',
                                  flyoutKey,
                                  label: `Flyout: ${fLabel}`,
                                });
                              }}
                            >
                              +
                            </button>
                            <button
                              type="button"
                              className="tree-action-icon delete"
                              title={
                                flyoutKey === 'viewControlsFlyout'
                                  ? 'Clear flyout items'
                                  : 'Delete flyout'
                              }
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteFlyout(flyoutKey);
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        </div>

                        {!isCollapsed(fCollapseId) && (
                          <div className="tree-children">
                            {items.length === 0 ? (
                              <div
                                className="empty-hint"
                                style={{ paddingLeft: 8 }}
                              >
                                Empty flyout
                              </div>
                            ) : (
                              renderFlyoutItems(items, flyoutKey)
                            )}
                          </div>
                        )}
                      </div>
                    );
                  },
                )
              )}
            </div>
          )}
        </div>

        {/* ================= 3. SIDEBAR PANELS ================= */}
        <div className="tree-section">
          <div className="tree-section-header">
            <div
              className="tree-section-header-left"
              onClick={() => toggleCollapse('section:panels')}
            >
              <span className="tree-Caret">
                {isCollapsed('section:panels') ? '▶' : '▼'}
              </span>
              <span>Panels ({Object.keys(config.panels || {}).length})</span>
            </div>
            <button
              type="button"
              className="tree-inline-add-btn"
              onClick={onCreateTabPanel}
              title="Create or configure a Sidebar TabPanel"
            >
              + Panel
            </button>
          </div>

          {!isCollapsed('section:panels') && (
            <div className="tree-children">
              {Object.keys(config.panels || {}).length === 0 ? (
                <div className="empty-hint" style={{ padding: '4px 8px' }}>
                  No panels configured
                </div>
              ) : (
                Object.entries(config.panels || {}).map(
                  ([panelId, panelDef]) => {
                    const pLabel = getFriendlyComponentName(panelId, panelDef);
                    if (!matchesFilter(pLabel, panelId)) return null;
                    const isPanelSel =
                      selectedNode?.type === 'panel' &&
                      selectedNode?.id === panelId &&
                      !selectedNode?.flyoutKey;

                    const isTabPanel = panelDef?.render === 'tabPanel';
                    const subPanels = Array.isArray(panelDef?.panelsList)
                      ? panelDef.panelsList
                      : [];

                    return (
                      <div key={panelId}>
                        <div
                          className={`tree-row ${isPanelSel ? 'selected' : ''}`}
                          onClick={() =>
                            onSelectNode({
                              type: 'panel',
                              id: panelId,
                              label: pLabel,
                            })
                          }
                        >
                          <div className="tree-row-left">
                            {isTabPanel ? (
                              <span
                                className="tree-Caret"
                                onClick={(e) =>
                                  toggleCollapse(`panel:${panelId}`, e)
                                }
                              >
                                {isCollapsed(`panel:${panelId}`) ? '▶' : '▼'}
                              </span>
                            ) : (
                              <span className="tree-Caret">•</span>
                            )}
                            <span className="tree-row-label">{pLabel}</span>
                            <span className="tree-row-meta">
                              ({panelDef?.location || 'left'})
                            </span>
                          </div>
                          <div className="tree-row-actions">
                            <button
                              type="button"
                              className="tree-action-icon delete"
                              title="Delete panel"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeletePanel(panelId);
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        </div>

                        {isTabPanel &&
                          !isCollapsed(`panel:${panelId}`) &&
                          subPanels.length > 0 && (
                            <div className="tree-children">
                              {subPanels.map((sp, spIdx) => {
                                const spKey =
                                  sp?.render || sp?.dataElement || '';
                                const spLabel = getFriendlyComponentName(
                                  spKey,
                                  sp,
                                );
                                return (
                                  <div
                                    key={`${spKey}-${spIdx}`}
                                    className="tree-row"
                                    onClick={() =>
                                      onSelectNode({
                                        type: 'panel',
                                        id: panelId,
                                        label: pLabel,
                                      })
                                    }
                                  >
                                    <div className="tree-row-left">
                                      <span className="tree-Caret">•</span>
                                      <span className="tree-row-label">
                                        {spLabel}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                      </div>
                    );
                  },
                )
              )}
            </div>
          )}
        </div>

        {/* ================= 4. POPUPS ================= */}
        <div className="tree-section">
          <div className="tree-section-header">
            <div
              className="tree-section-header-left"
              onClick={() => toggleCollapse('section:popups')}
            >
              <span className="tree-Caret">
                {isCollapsed('section:popups') ? '▶' : '▼'}
              </span>
              <span>Popups (3)</span>
            </div>
          </div>

          {!isCollapsed('section:popups') && (
            <div className="tree-children">
              {POPUPS_CATALOG.map((popupMeta) => {
                const popupKey = popupMeta.id;
                const popupItems = Array.isArray(config.popups?.[popupKey])
                  ? config.popups[popupKey]
                  : [];
                const pCollapseId = `popup:${popupKey}`;
                const isPopupSel =
                  selectedNode?.type === 'popup' &&
                  selectedNode?.id === popupKey;
                const popupListId = `popup-items:${popupKey}`;

                return (
                  <div key={popupKey}>
                    <div
                      className={`tree-row ${isPopupSel ? 'selected' : ''}`}
                      onClick={() =>
                        onSelectNode({
                          type: 'popup',
                          id: popupKey,
                          label: popupMeta.name,
                        })
                      }
                    >
                      <div className="tree-row-left">
                        <span
                          className="tree-Caret"
                          onClick={(e) => toggleCollapse(pCollapseId, e)}
                        >
                          {isCollapsed(pCollapseId) ? '▶' : '▼'}
                        </span>
                        <span
                          className="tree-row-label"
                          style={{ fontWeight: 600 }}
                        >
                          {popupMeta.name}
                        </span>
                        <span className="tree-row-meta">
                          ({popupItems.length})
                        </span>
                      </div>
                      <div className="tree-row-actions">
                        <button
                          type="button"
                          className="tree-action-icon"
                          title={`Add action to ${popupMeta.name}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenAddForTarget({
                              type: 'popup',
                              popupKey,
                              label: popupMeta.name,
                            });
                          }}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {!isCollapsed(pCollapseId) && (
                      <div className="tree-children">
                        {popupItems.length === 0 ? (
                          <div
                            className="empty-hint"
                            style={{ paddingLeft: 8 }}
                          >
                            No popup items
                          </div>
                        ) : (
                          popupItems.map((pItem, pIdx) => {
                            const itemKey =
                              typeof pItem === 'string'
                                ? pItem
                                : pItem?.dataElement;
                            const comp = (typeof pItem === 'object' &&
                            pItem?.type
                              ? pItem
                              : config.modularComponents?.[itemKey]) || {
                              dataElement: itemKey,
                              type: 'popupAction',
                            };
                            const pLabel = getFriendlyComponentName(
                              itemKey,
                              comp,
                            );
                            if (!matchesFilter(pLabel, itemKey)) return null;

                            const isPItemSel =
                              selectedNode?.type === 'popupItem' &&
                              selectedNode?.id === itemKey &&
                              (selectedNode?.parentId === undefined ||
                                selectedNode?.parentId === popupKey) &&
                              (selectedNode?.index === undefined ||
                                selectedNode?.index === pIdx);

                            return (
                              <div
                                key={`${itemKey}-${pIdx}`}
                                className={`tree-row ${isPItemSel ? 'selected' : ''} ${getDragClass(popupListId, pIdx)}`}
                                draggable={!q}
                                onDragStart={(e) =>
                                  handleDragStart(e, popupListId, pIdx, {
                                    type: 'popup',
                                    popupKey,
                                  })
                                }
                                onDragOver={(e) =>
                                  handleDragOver(e, popupListId, pIdx)
                                }
                                onDrop={(e) => handleDrop(e, popupListId, pIdx)}
                                onDragEnd={handleDragEnd}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectNode({
                                    type: 'popupItem',
                                    id: itemKey,
                                    parentId: popupKey,
                                    popupKey,
                                    index: pIdx,
                                    label: pLabel,
                                    component: comp,
                                  });
                                }}
                              >
                                <div className="tree-row-left">
                                  <span
                                    className="tree-drag-handle"
                                    title="Drag to reorder"
                                  >
                                    ⋮⋮
                                  </span>
                                  <ComponentBadge component={comp} />
                                  <span className="tree-row-label">
                                    {pLabel}
                                  </span>
                                </div>
                                <div className="tree-row-actions">
                                  <button
                                    type="button"
                                    className="tree-action-icon delete"
                                    title="Remove from popup"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onRemovePopupItem(popupKey, pIdx);
                                    }}
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
