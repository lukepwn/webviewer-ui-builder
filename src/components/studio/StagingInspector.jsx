import React, { useState } from 'react';
import {
  DEFAULT_POPUPS,
  PANELS_CATALOG,
  POPUPS_CATALOG,
  TAB_PANEL_SUPPORTED_TABS,
  TOOLS_CATALOG,
} from '../../constants/webviewerCatalog';
import { getItemFeatureRequirement } from '../../constants/featureRegistry';
import { getFriendlyComponentName } from '../../utils/labelUtils';

export default function StagingInspector({
  width,
  config,
  draft,
  currentTarget,
  availableTargets = [],
  onChangeTarget,
  onChangeDraft,
  onCommitDraft,
}) {
  const [justCommitted, setJustCommitted] = useState(false);
  const paneStyle = width ? { width } : undefined;

  if (!draft) return null;

  const userHeaderKeys = Object.keys(config?.modularHeaders || {}).filter(
    (k) => k !== 'tools-header',
  );
  const flyoutKeys = Object.keys(config?.flyouts || {});
  const isFlyoutTarget =
    currentTarget?.type === 'flyout' || currentTarget?.type === 'submenu';

  const update = (patch) => {
    if (onChangeDraft) {
      onChangeDraft({ ...draft, ...patch });
    }
  };

  const handleCommit = () => {
    if (onCommitDraft) {
      onCommitDraft();
      setJustCommitted(true);
      setTimeout(() => {
        setJustCommitted(false);
      }, 900);
    }
  };

  // Compute target label for button & summary
  const targetPopupKey =
    currentTarget?.type === 'popup'
      ? currentTarget.popupKey
      : 'annotationPopup';
  const targetPopupMeta = POPUPS_CATALOG.find((p) => p.id === targetPopupKey);

  const getCommitButtonLabel = () => {
    if (justCommitted) return '✓ Added';
    switch (draft.kind) {
      case 'header':
        return '+ Create Header';
      case 'ribbonTab':
        return '+ Create Ribbon Tab';
      case 'flyout':
        return '+ Create Flyout Menu';
      case 'tabPanel':
        return '+ Create Tab Panel';
      case 'submenu':
        return '+ Add Submenu';
      case 'popupAction':
        return `+ Add to ${targetPopupMeta?.name || targetPopupKey}`;
      case 'panel':
        return draft.mode === 'embed'
          ? '+ Embed Panel in Flyout'
          : `+ Add Toggle to ${currentTarget?.label || 'Container'}`;
      default:
        return `+ Add to ${currentTarget?.label || 'Container'}`;
    }
  };

  // Check if popupAction is already in the target popup
  const isPopupActionAlreadyPresent = (() => {
    if (draft.kind !== 'popupAction') return false;
    const list =
      config?.popups?.[targetPopupKey] || DEFAULT_POPUPS[targetPopupKey] || [];
    return list.some(
      (entry) =>
        (typeof entry === 'string' ? entry : entry?.dataElement) ===
        draft.dataElement,
    );
  })();

  const featureReq =
    draft.kind === 'tool'
      ? getItemFeatureRequirement(draft.dataElement, {
          type: 'toolButton',
          toolName: draft.toolName,
          dataElement: draft.dataElement,
        })
      : null;

  const catalogPanelIds = new Set(PANELS_CATALOG.map((p) => p.id));
  const customPanelKeys = Object.keys(config?.panels || {}).filter(
    (pKey) => !catalogPanelIds.has(pKey),
  );

  return (
    <aside className="studio-right-pane" style={paneStyle}>
      <div className="inspector-header">
        <span className="inspector-title">New {draft.titleText}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="inspector-type-badge">{draft.typeBadge}</span>
          <button
            type="button"
            className="tree-action-icon"
            title="Cancel"
            onClick={() => onChangeDraft && onChangeDraft(null)}
            style={{ fontSize: 13, lineHeight: 1 }}
          >
            ✕
          </button>
        </div>
      </div>

      <div className="inspector-body">
        {/* Target Container Selector for non-standalone containers */}
        {draft.kind !== 'header' &&
          draft.kind !== 'ribbonTab' &&
          draft.kind !== 'flyout' &&
          draft.kind !== 'tabPanel' && (
            <div className="inspector-section-card">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 6,
                }}
              >
                <span className="inspector-section-title" style={{ margin: 0 }}>
                  Destination
                </span>
                <span
                  style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}
                >
                  TARGET CONTAINER
                </span>
              </div>
              {draft.kind === 'popupAction' ? (
                <select
                  className="inspector-select"
                  value={currentTarget?.popupKey || 'annotationPopup'}
                  onChange={(e) => {
                    const next = availableTargets.find(
                      (t) =>
                        t.type === 'popup' && t.popupKey === e.target.value,
                    );
                    if (next && onChangeTarget) onChangeTarget(next);
                  }}
                >
                  {POPUPS_CATALOG.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              ) : draft.kind === 'panel' && draft.mode === 'embed' ? (
                <select
                  className="inspector-select"
                  value={
                    draft.embedFlyoutKey ||
                    currentTarget?.flyoutKey ||
                    flyoutKeys[0] ||
                    ''
                  }
                  onChange={(e) => {
                    const fKey = e.target.value;
                    update({ embedFlyoutKey: fKey });
                    const next = availableTargets.find(
                      (t) => t.type === 'flyout' && t.flyoutKey === fKey,
                    );
                    if (next && onChangeTarget) onChangeTarget(next);
                  }}
                >
                  {flyoutKeys.map((fKey) => (
                    <option key={fKey} value={fKey}>
                      Flyout:{' '}
                      {getFriendlyComponentName(fKey, config.flyouts[fKey])}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  className="inspector-select"
                  value={currentTarget?.key}
                  onChange={(e) => {
                    const next = availableTargets.find(
                      (t) => t.key === e.target.value,
                    );
                    if (next && onChangeTarget) onChangeTarget(next);
                  }}
                >
                  {!availableTargets.some(
                    (t) => t.key === currentTarget?.key,
                  ) &&
                    currentTarget?.key && (
                      <option key={currentTarget.key} value={currentTarget.key}>
                        {currentTarget.label}
                      </option>
                    )}
                  {availableTargets.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

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

        {/* 1. TOOL DRAFT */}
        {draft.kind === 'tool' && (
          <>
            <div className="inspector-field">
              <label className="inspector-label">
                Component ID (dataElement)
              </label>
              <input
                className="inspector-input"
                value={draft.dataElement || ''}
                onChange={(e) => update({ dataElement: e.target.value })}
              />
            </div>

            <div className="inspector-field">
              <label className="inspector-label">Label</label>
              <input
                className="inspector-input"
                value={draft.label || ''}
                onChange={(e) =>
                  update({
                    label: e.target.value,
                    title: draft.title || e.target.value,
                  })
                }
                placeholder="Button label"
              />
            </div>

            <div className="inspector-field">
              <label className="inspector-label">Tooltip (title)</label>
              <input
                className="inspector-input"
                value={draft.title || ''}
                onChange={(e) => update({ title: e.target.value })}
                placeholder="Hover tooltip"
              />
            </div>

            <div className="inspector-field">
              <label className="inspector-label">Icon (img)</label>
              <input
                className="inspector-input"
                value={draft.img || ''}
                onChange={(e) => update({ img: e.target.value })}
                placeholder="e.g. icon-tool-pen-line"
              />
            </div>

            <div className="inspector-field">
              <label className="inspector-label">Tool Action (toolName)</label>
              <input
                className="inspector-input"
                value={draft.toolName || ''}
                disabled
              />
            </div>
          </>
        )}

        {/* 2. PRESET DRAFT */}
        {draft.kind === 'preset' && (
          <>
            <div className="inspector-field">
              <label className="inspector-label">
                Component ID (dataElement)
              </label>
              <input
                className="inspector-input"
                value={draft.dataElement || ''}
                onChange={(e) => update({ dataElement: e.target.value })}
              />
            </div>

            <div className="inspector-field">
              <label className="inspector-label">Label</label>
              <input
                className="inspector-input"
                value={draft.label || ''}
                onChange={(e) =>
                  update({
                    label: e.target.value,
                    title: draft.title || e.target.value,
                  })
                }
              />
            </div>

            <div className="inspector-field">
              <label className="inspector-label">Tooltip (title)</label>
              <input
                className="inspector-input"
                value={draft.title || ''}
                onChange={(e) => update({ title: e.target.value })}
              />
            </div>

            <div className="inspector-field">
              <label className="inspector-label">Icon (img)</label>
              <input
                className="inspector-input"
                value={draft.img || ''}
                onChange={(e) => update({ img: e.target.value })}
              />
            </div>

            <div className="inspector-field">
              <label className="inspector-label">
                Preset Type (buttonType)
              </label>
              <input
                className="inspector-input"
                value={draft.buttonType || ''}
                disabled
              />
            </div>
          </>
        )}

        {/* 3. LAYOUT ELEMENT DRAFT */}
        {draft.kind === 'layout' && (
          <>
            <div className="inspector-field">
              <label className="inspector-label">
                Element ID (dataElement)
              </label>
              <input
                className="inspector-input"
                value={draft.dataElement || ''}
                disabled={draft.layoutType === 'divider'}
                onChange={(e) => update({ dataElement: e.target.value })}
              />
            </div>

            {draft.description && (
              <div className="inspector-hint">{draft.description}</div>
            )}

            {draft.layoutType === 'label' && (
              <div className="inspector-field">
                <label className="inspector-label">Label Text</label>
                <input
                  className="inspector-input"
                  value={draft.label || ''}
                  onChange={(e) => update({ label: e.target.value })}
                  placeholder="Section Label"
                />
              </div>
            )}
          </>
        )}

        {/* 4. PANEL DRAFT */}
        {draft.kind === 'panel' && (
          <>
            {draft.canEmbedInFlyout &&
              (isFlyoutTarget || flyoutKeys.length > 0) && (
                <div className="inspector-section-card">
                  <span className="inspector-section-title">
                    Insertion Mode
                  </span>
                  <div className="inspector-radio-group">
                    <label className="inspector-radio-row">
                      <input
                        type="radio"
                        name="draftPanelMode"
                        checked={draft.mode !== 'embed'}
                        onChange={() => update({ mode: 'toggle' })}
                      />
                      <span>Add Sidebar Toggle Button</span>
                    </label>
                    <label className="inspector-radio-row">
                      <input
                        type="radio"
                        name="draftPanelMode"
                        checked={draft.mode === 'embed'}
                        onChange={() =>
                          update({
                            mode: 'embed',
                            embedFlyoutKey:
                              draft.embedFlyoutKey ||
                              (isFlyoutTarget
                                ? currentTarget.flyoutKey
                                : flyoutKeys[0] || ''),
                          })
                        }
                      />
                      <span>Embed Panel Inside Flyout</span>
                    </label>
                  </div>
                </div>
              )}

            {draft.mode === 'embed' ? (
              <>
                <div className="inspector-field">
                  <label className="inspector-label">Panel Render</label>
                  <input
                    className="inspector-input"
                    value={draft.render || ''}
                    disabled
                  />
                </div>
                <div className="inspector-field">
                  <label className="inspector-label">Destination Flyout</label>
                  <select
                    className="inspector-select"
                    value={
                      draft.embedFlyoutKey ||
                      currentTarget?.flyoutKey ||
                      flyoutKeys[0] ||
                      ''
                    }
                    onChange={(e) => update({ embedFlyoutKey: e.target.value })}
                  >
                    {flyoutKeys.map((fKey) => {
                      const fDef = config?.flyouts?.[fKey];
                      const fName = getFriendlyComponentName(fKey, fDef);
                      return (
                        <option key={fKey} value={fKey}>
                          Flyout: {fName} ({fKey})
                        </option>
                      );
                    })}
                  </select>
                </div>
              </>
            ) : (
              <>
                <div className="inspector-field">
                  <label className="inspector-label">
                    Toggle ID (dataElement)
                  </label>
                  <input
                    className="inspector-input"
                    value={draft.dataElement || ''}
                    onChange={(e) => update({ dataElement: e.target.value })}
                  />
                </div>

                <div className="inspector-field">
                  <label className="inspector-label">Toggle Label</label>
                  <input
                    className="inspector-input"
                    value={draft.label || ''}
                    onChange={(e) =>
                      update({
                        label: e.target.value,
                        title: draft.title || e.target.value,
                      })
                    }
                  />
                </div>

                <div className="inspector-field">
                  <label className="inspector-label">Tooltip (title)</label>
                  <input
                    className="inspector-input"
                    value={draft.title || ''}
                    onChange={(e) => update({ title: e.target.value })}
                  />
                </div>

                <div className="inspector-field">
                  <label className="inspector-label">Icon (img)</label>
                  <input
                    className="inspector-input"
                    value={draft.img || ''}
                    onChange={(e) => update({ img: e.target.value })}
                  />
                </div>

                <div className="inspector-field">
                  <label className="inspector-label">
                    Sidebar Dock Location ({draft.panelId})
                  </label>
                  <select
                    className="inspector-select"
                    value={draft.panelLocation || 'left'}
                    onChange={(e) => update({ panelLocation: e.target.value })}
                  >
                    <option value="left">Left Sidebar</option>
                    <option value="right">Right Sidebar</option>
                  </select>
                </div>
              </>
            )}
          </>
        )}

        {/* 5. POPUP ACTION DRAFT */}
        {draft.kind === 'popupAction' && (
          <>
            <div className="inspector-field">
              <label className="inspector-label">Action ID (dataElement)</label>
              <input
                className="inspector-input"
                value={draft.dataElement || ''}
                disabled
              />
            </div>

            <div className="inspector-field">
              <label className="inspector-label">Action Label</label>
              <input
                className="inspector-input"
                value={draft.label || ''}
                disabled
              />
            </div>

            {draft.context && (
              <div className="inspector-hint">
                Context: <strong>{draft.context}</strong>
              </div>
            )}

            {isPopupActionAlreadyPresent && (
              <div
                className="inspector-section-card"
                style={{ backgroundColor: '#fffbeb', borderColor: '#fde68a' }}
              >
                <span
                  className="inspector-section-title"
                  style={{ color: '#92400e' }}
                >
                  Already in this Popup
                </span>
                <div className="inspector-hint" style={{ color: '#92400e' }}>
                  <code>{draft.dataElement}</code> is already included in{' '}
                  {targetPopupMeta?.name || targetPopupKey}. You can still add
                  another copy if desired.
                </div>
              </div>
            )}
          </>
        )}

        {/* 7. TOGGLE BUTTON DRAFT */}
        {draft.kind === 'toggleButton' && (
          <>
            <div className="inspector-field">
              <label className="inspector-label">
                Component ID (dataElement)
              </label>
              <input
                className="inspector-input"
                value={draft.dataElement || ''}
                onChange={(e) => update({ dataElement: e.target.value })}
              />
            </div>

            <div className="inspector-field">
              <label className="inspector-label">Label</label>
              <input
                className="inspector-input"
                value={draft.label || ''}
                onChange={(e) => update({ label: e.target.value })}
                placeholder="Toggle Label"
              />
            </div>

            <div className="inspector-field">
              <label className="inspector-label">Tooltip (title)</label>
              <input
                className="inspector-input"
                value={draft.title || ''}
                onChange={(e) => update({ title: e.target.value })}
                placeholder="Hover tooltip"
              />
            </div>

            <div className="inspector-field">
              <label className="inspector-label">Icon (img)</label>
              <input
                className="inspector-input"
                value={draft.img || ''}
                onChange={(e) => update({ img: e.target.value })}
                placeholder="e.g. icon-header-sidebar-line"
              />
            </div>

            <div className="inspector-section-card">
              <span className="inspector-section-title">
                Target Element Wiring
              </span>
              <div className="inspector-field">
                <label className="inspector-label">Opens Flyout or Panel</label>
                <select
                  className="inspector-select"
                  value={draft.toggleTarget || ''}
                  onChange={(e) =>
                    update({
                      toggleTarget: e.target.value,
                      title: `Toggle ${e.target.value}`,
                    })
                  }
                >
                  {!isFlyoutTarget && (
                    <optgroup label="Flyout Menus">
                      {flyoutKeys.map((fKey) => (
                        <option key={fKey} value={fKey}>
                          Flyout: {fKey}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="Sidebar Panels">
                    {customPanelKeys.map((pKey) => (
                      <option key={pKey} value={pKey}>
                        Panel: {pKey}
                      </option>
                    ))}
                    {PANELS_CATALOG.map((p) => (
                      <option key={p.id} value={p.id}>
                        Panel: {p.name} ({p.id})
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
            </div>
          </>
        )}

        {/* 8. SUBMENU DRAFT */}
        {draft.kind === 'submenu' && (
          <>
            <div className="inspector-field">
              <label className="inspector-label">
                Submenu ID (dataElement)
              </label>
              <input
                className="inspector-input"
                value={draft.dataElement || ''}
                onChange={(e) => update({ dataElement: e.target.value })}
              />
            </div>

            <div className="inspector-field">
              <label className="inspector-label">Submenu Label</label>
              <input
                className="inspector-input"
                value={draft.label || ''}
                onChange={(e) =>
                  update({
                    label: e.target.value,
                    title: e.target.value,
                  })
                }
                placeholder="More Tools"
              />
            </div>

            <div className="inspector-field">
              <label className="inspector-label">Icon (img)</label>
              <input
                className="inspector-input"
                value={draft.img || ''}
                onChange={(e) => update({ img: e.target.value })}
              />
            </div>

            {!isFlyoutTarget && flyoutKeys.length > 0 && (
              <div className="inspector-field">
                <label className="inspector-label">Parent Flyout</label>
                <select
                  className="inspector-select"
                  value={draft.flyoutKey || flyoutKeys[0] || ''}
                  onChange={(e) => update({ flyoutKey: e.target.value })}
                >
                  {flyoutKeys.map((fKey) => (
                    <option key={fKey} value={fKey}>
                      Flyout:{' '}
                      {getFriendlyComponentName(fKey, config.flyouts?.[fKey])} (
                      {fKey})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}

        {/* 9. HEADER DRAFT */}
        {draft.kind === 'header' && (
          <>
            <div className="inspector-field">
              <label className="inspector-label">Header ID (dataElement)</label>
              <input
                className="inspector-input"
                value={draft.dataElement || ''}
                onChange={(e) => update({ dataElement: e.target.value })}
              />
            </div>

            <div className="inspector-field">
              <label className="inspector-label">Viewport Placement</label>
              <select
                className="inspector-select"
                value={draft.placement || 'top'}
                onChange={(e) => update({ placement: e.target.value })}
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
                value={draft.gap ?? 8}
                onChange={(e) => update({ gap: Number(e.target.value) || 0 })}
              />
            </div>

            <div className="inspector-field">
              <label className="inspector-label">Justify Content</label>
              <select
                className="inspector-select"
                value={draft.justifyContent || 'start'}
                onChange={(e) => update({ justifyContent: e.target.value })}
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
                checked={draft.stroke !== false}
                onChange={(e) => update({ stroke: e.target.checked })}
              />
              <span>Show Border Stroke</span>
            </label>
          </>
        )}

        {/* 10. RIBBON TAB DRAFT */}
        {draft.kind === 'ribbonTab' && (
          <>
            <div className="inspector-field">
              <label className="inspector-label">Tab ID (dataElement)</label>
              <input
                className="inspector-input"
                value={draft.dataElement || ''}
                onChange={(e) => update({ dataElement: e.target.value })}
              />
            </div>

            {userHeaderKeys.length > 0 && (
              <div className="inspector-field">
                <label className="inspector-label">Parent Header</label>
                <select
                  className="inspector-select"
                  value={draft.headerKey || userHeaderKeys[0]}
                  onChange={(e) => update({ headerKey: e.target.value })}
                >
                  {userHeaderKeys.map((hKey) => (
                    <option key={hKey} value={hKey}>
                      {getFriendlyComponentName(
                        hKey,
                        config.modularHeaders?.[hKey],
                      )}{' '}
                      ({hKey})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="inspector-field">
              <label className="inspector-label">Tab Label</label>
              <input
                className="inspector-input"
                value={draft.label || ''}
                onChange={(e) =>
                  update({
                    label: e.target.value,
                    title: e.target.value,
                  })
                }
                placeholder="e.g. Review, Forms"
              />
            </div>

            <div className="inspector-field">
              <label className="inspector-label">Hover Tooltip</label>
              <input
                className="inspector-input"
                value={draft.title || ''}
                onChange={(e) => update({ title: e.target.value })}
              />
            </div>

            <div className="inspector-field">
              <label className="inspector-label">Tab Icon (optional)</label>
              <input
                className="inspector-input"
                value={draft.img || ''}
                onChange={(e) => update({ img: e.target.value })}
                placeholder="e.g. icon-header-chat-line"
              />
            </div>
          </>
        )}

        {/* 11. FLYOUT MENU DRAFT */}
        {draft.kind === 'flyout' && (
          <>
            <div className="inspector-field">
              <label className="inspector-label">Flyout ID (dataElement)</label>
              <input
                className="inspector-input"
                value={draft.dataElement || ''}
                onChange={(e) => update({ dataElement: e.target.value })}
              />
            </div>

            <div className="inspector-field">
              <label className="inspector-label">Flyout Label</label>
              <input
                className="inspector-input"
                value={draft.label || ''}
                onChange={(e) =>
                  update({
                    label: e.target.value,
                    title: e.target.value,
                  })
                }
                placeholder="Custom Menu"
              />
            </div>

            <div className="inspector-field">
              <label className="inspector-label">Toggle Icon (img)</label>
              <input
                className="inspector-input"
                value={draft.img || ''}
                onChange={(e) => update({ img: e.target.value })}
                placeholder="icon-tools-more"
              />
            </div>

            <label className="inspector-checkbox-row">
              <input
                type="checkbox"
                checked={draft.createToggle !== false}
                onChange={(e) => update({ createToggle: e.target.checked })}
              />
              <span>Also create toggle button in header</span>
            </label>

            {draft.createToggle !== false && userHeaderKeys.length > 0 && (
              <div className="inspector-field">
                <label className="inspector-label">Toggle Button Header</label>
                <select
                  className="inspector-select"
                  value={draft.targetHeader || userHeaderKeys[0]}
                  onChange={(e) => update({ targetHeader: e.target.value })}
                >
                  {userHeaderKeys.map((hKey) => (
                    <option key={hKey} value={hKey}>
                      {getFriendlyComponentName(
                        hKey,
                        config.modularHeaders?.[hKey],
                      )}{' '}
                      ({hKey})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}

        {/* 12. TAB PANEL SIDEBAR DRAFT */}
        {draft.kind === 'tabPanel' && (
          <>
            <div className="inspector-field">
              <label className="inspector-label">Panel ID (dataElement)</label>
              <input
                className="inspector-input"
                value={draft.dataElement || ''}
                onChange={(e) => update({ dataElement: e.target.value })}
              />
            </div>

            <div className="inspector-field">
              <label className="inspector-label">Sidebar Dock Edge</label>
              <select
                className="inspector-select"
                value={draft.location || 'left'}
                onChange={(e) => update({ location: e.target.value })}
              >
                <option value="left">Left Sidebar</option>
                <option value="right">Right Sidebar</option>
              </select>
            </div>

            <div className="inspector-section-card">
              <span className="inspector-section-title">
                Included Sidebar Tabs
              </span>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  maxHeight: 200,
                  overflowY: 'auto',
                }}
              >
                {TAB_PANEL_SUPPORTED_TABS.map((tabMeta) => {
                  const activeRenders = new Set(
                    (draft.panelsList || []).map((item) => item.render),
                  );
                  const checked = activeRenders.has(tabMeta.render);
                  return (
                    <label key={tabMeta.id} className="inspector-checkbox-row">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const nextRenders = new Set(activeRenders);
                          if (e.target.checked) {
                            nextRenders.add(tabMeta.render);
                          } else {
                            nextRenders.delete(tabMeta.render);
                          }
                          update({
                            panelsList: Array.from(nextRenders).map((r) => ({
                              render: r,
                            })),
                          });
                        }}
                      />
                      <span>{tabMeta.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <label className="inspector-checkbox-row">
              <input
                type="checkbox"
                checked={draft.createToggle !== false}
                onChange={(e) => update({ createToggle: e.target.checked })}
              />
              <span>Also create toggle button in header</span>
            </label>

            {draft.createToggle !== false && (
              <>
                <div className="inspector-field">
                  <label className="inspector-label">Toggle Button Label</label>
                  <input
                    className="inspector-input"
                    value={draft.toggleLabel || ''}
                    onChange={(e) => update({ toggleLabel: e.target.value })}
                    placeholder="Sidebar"
                  />
                </div>

                {userHeaderKeys.length > 0 && (
                  <div className="inspector-field">
                    <label className="inspector-label">
                      Toggle Button Header
                    </label>
                    <select
                      className="inspector-select"
                      value={draft.targetHeader || userHeaderKeys[0]}
                      onChange={(e) => update({ targetHeader: e.target.value })}
                    >
                      {userHeaderKeys.map((hKey) => (
                        <option key={hKey} value={hKey}>
                          {getFriendlyComponentName(
                            hKey,
                            config.modularHeaders?.[hKey],
                          )}{' '}
                          ({hKey})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            )}
          </>
        )}

        <div className="inspector-divider" />

        <button
          type="button"
          className="studio-btn primary"
          onClick={handleCommit}
        >
          {getCommitButtonLabel()}
        </button>
      </div>
    </aside>
  );
}
