import React from 'react';
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
  return (
    <aside className="studio-left-pane" style={width ? { width } : undefined}>
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

      {mode === 'tree' ? (
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
      ) : (
        <ComponentLibrary
          config={config}
          activeTarget={activeTarget}
          onChangeTarget={onChangeTarget}
          stagedDraft={stagedDraft}
          onStageItem={onStageItem}
        />
      )}
    </aside>
  );
}
