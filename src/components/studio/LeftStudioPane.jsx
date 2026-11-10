import React, { useRef, useLayoutEffect } from 'react';
import UIOutlineTree from './UIOutlineTree';
import ComponentLibrary from './ComponentLibrary';

export default function LeftStudioPane({
  width,
  mode,
  onModeChange,
  config,
  selectedNode,
  onSelectNode,
  activeTarget,
  onChangeTarget,
  onOpenAddForTarget,
  onCreateHeader,
  onCreateRibbonTab,
  onCreateFlyout,
  onCreateTabPanel,
  stagedDraft,
  onStageItem,
  onDeleteHeader,
  onDeleteRibbonTab,
  onDeleteFlyout,
  onDeleteTool,
  onDeletePanel,
  onRemovePopupItem,
  onReorderList,
}) {
  const containerRef = useRef(null);
  const scrollCacheRef = useRef({ tree: 0, library: 0 });

  // Capture scroll positions while each tab's scrollable container is visible
  const handleScrollCapture = (e) => {
    const target = e.target;
    if (!target || !target.classList) return;
    if (target.classList.contains('studio-tree-scroll')) {
      scrollCacheRef.current.tree = target.scrollTop;
    } else if (target.classList.contains('library-list-scroll')) {
      scrollCacheRef.current.library = target.scrollTop;
    }
  };

  // Restore saved scroll position synchronously when switching tabs
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const selector =
      mode === 'tree' ? '.studio-tree-scroll' : '.library-list-scroll';
    const scrollEl = containerRef.current.querySelector(selector);
    if (scrollEl && scrollCacheRef.current[mode] !== undefined) {
      scrollEl.scrollTop = scrollCacheRef.current[mode];
    }
  }, [mode]);

  return (
    <aside
      ref={containerRef}
      className="studio-left-pane"
      style={width ? { width } : undefined}
      onScrollCapture={handleScrollCapture}
    >
      {/* CLEAN TEXT MODE SWITCHER (Outline | Add Components) */}
      <div className="studio-mode-switcher">
        <button
          type="button"
          className={`studio-mode-tab ${mode === 'tree' ? 'active' : ''}`}
          onClick={() => onModeChange('tree')}
        >
          Outline
        </button>
        <button
          type="button"
          className={`studio-mode-tab ${mode === 'library' ? 'active' : ''}`}
          onClick={() => onModeChange('library')}
        >
          Add Components
        </button>
      </div>

      <div
        style={{
          display: mode === 'tree' ? 'flex' : 'none',
          flex: 1,
          minHeight: 0,
          flexDirection: 'column',
        }}
      >
        <UIOutlineTree
          config={config}
          selectedNode={selectedNode}
          onSelectNode={onSelectNode}
          onOpenAddForTarget={onOpenAddForTarget}
          onCreateHeader={onCreateHeader}
          onCreateRibbonTab={onCreateRibbonTab}
          onCreateFlyout={onCreateFlyout}
          onCreateTabPanel={onCreateTabPanel}
          onDeleteHeader={onDeleteHeader}
          onDeleteRibbonTab={onDeleteRibbonTab}
          onDeleteFlyout={onDeleteFlyout}
          onDeleteTool={onDeleteTool}
          onDeletePanel={onDeletePanel}
          onRemovePopupItem={onRemovePopupItem}
          onReorderList={onReorderList}
        />
      </div>

      <div
        style={{
          display: mode === 'library' ? 'flex' : 'none',
          flex: 1,
          minHeight: 0,
          flexDirection: 'column',
        }}
      >
        <ComponentLibrary
          config={config}
          activeTarget={activeTarget}
          onChangeTarget={onChangeTarget}
          stagedDraft={stagedDraft}
          onStageItem={onStageItem}
        />
      </div>
    </aside>
  );
}
