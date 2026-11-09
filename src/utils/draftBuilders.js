import { PANELS_CATALOG, POPUPS_CATALOG } from '../constants/webviewerCatalog';
import {
  SUPPORTED_FLYOUT_PANEL_RENDERS,
  TOOL_ACTION_PREFIX,
} from '../sdk/sdkRules';
import { collectAllExistingIds, generateUniqueDataElement } from './idUtils';
import { getFriendlyComponentName } from './labelUtils';

/**
 * Builds the flat list of all targetable containers (Headers, Ribbon Tabs,
 * Flyouts, Submenus, and Popups) in the current configuration.
 */
export function buildAvailableTargets(config) {
  const list = [];
  const userHeaderKeys = Object.keys(config?.modularHeaders || {}).filter(
    (k) => k !== 'tools-header',
  );

  userHeaderKeys.forEach((hKey) => {
    const hDef = config.modularHeaders[hKey];
    const hName = getFriendlyComponentName(hKey, hDef);
    list.push({
      key: `header:${hKey}`,
      type: 'header',
      headerKey: hKey,
      label: `Header: ${hName}`,
    });

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

  Object.keys(config?.flyouts || {}).forEach((fKey) => {
    const fName = getFriendlyComponentName(fKey, config.flyouts[fKey]);
    list.push({
      key: `flyout:${fKey}`,
      type: 'flyout',
      flyoutKey: fKey,
      label: `Flyout: ${fName}`,
    });

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
}

/**
 * Resolves `activeTarget` against `availableTargets` with safe fallbacks.
 */
export function resolveTargetContainer(
  activeTarget,
  config,
  availableTargetsInput,
) {
  const availableTargets =
    availableTargetsInput || buildAvailableTargets(config);
  const userHeaderKeys = Object.keys(config?.modularHeaders || {}).filter(
    (k) => k !== 'tools-header',
  );

  if (activeTarget) {
    if (activeTarget.key) {
      const direct = availableTargets.find((t) => t.key === activeTarget.key);
      if (direct) return direct;
    }
    const match = availableTargets.find((t) => {
      if (t.type !== activeTarget.type) return false;
      if (t.type === 'header') return t.headerKey === activeTarget.headerKey;
      if (t.type === 'ribbon') {
        return (
          t.ribbonTabKey === activeTarget.ribbonTabKey &&
          (!activeTarget.headerKey || t.headerKey === activeTarget.headerKey)
        );
      }
      if (t.type === 'flyout') return t.flyoutKey === activeTarget.flyoutKey;
      if (t.type === 'submenu') return t.parentKey === activeTarget.parentKey;
      if (t.type === 'popup') return t.popupKey === activeTarget.popupKey;
      return false;
    });
    if (match) return match;
    if (activeTarget.type === 'flyout' && activeTarget.flyoutKey) {
      return {
        key: activeTarget.key || `flyout:${activeTarget.flyoutKey}`,
        type: 'flyout',
        flyoutKey: activeTarget.flyoutKey,
        label: activeTarget.label || `Flyout: ${activeTarget.flyoutKey}`,
      };
    }
    if (activeTarget.type === 'popup' && activeTarget.popupKey) {
      return {
        key: activeTarget.key || `popup:${activeTarget.popupKey}`,
        type: 'popup',
        popupKey: activeTarget.popupKey,
        label: activeTarget.label || `Popup: ${activeTarget.popupKey}`,
      };
    }
  }

  return (
    availableTargets[0] || {
      key: 'header:default-top-header',
      type: 'header',
      headerKey: userHeaderKeys[0] || 'default-top-header',
      label: 'Header: Default Top Header',
    }
  );
}

/**
 * Creates a pre-filled draft state object when a user clicks a card in ComponentLibrary.
 */
export function defaultDraftFor(itemSpec, config, currentTarget) {
  if (!itemSpec) return null;
  const existingIds = collectAllExistingIds(config);
  const userHeaderKeys = Object.keys(config?.modularHeaders || {}).filter(
    (k) => k !== 'tools-header',
  );
  const flyoutKeys = Object.keys(config?.flyouts || {});
  const defaultHeaderKey =
    currentTarget?.headerKey || userHeaderKeys[0] || 'default-top-header';
  const isFlyoutTarget =
    currentTarget?.type === 'flyout' || currentTarget?.type === 'submenu';

  const { kind, meta } = itemSpec;

  switch (kind) {
    case 'tool': {
      const baseId = meta.defaultId || meta.key;
      return {
        kind: 'tool',
        stageKey: `tool:${meta.key}`,
        typeBadge: 'Tool Button',
        titleText: meta.label,
        baseId,
        dataElement: generateUniqueDataElement(baseId, existingIds),
        label: meta.label || '',
        title: meta.title || meta.label || '',
        img: meta.icon || '',
        toolName: meta.toolName,
        category: meta.category,
      };
    }

    case 'preset': {
      const baseId = meta.defaultId || meta.buttonType;
      return {
        kind: 'preset',
        stageKey: `preset:${meta.buttonType}`,
        typeBadge: 'Preset Button',
        titleText: meta.label,
        baseId,
        dataElement: generateUniqueDataElement(baseId, existingIds),
        label: meta.label || '',
        title: meta.title || meta.label || '',
        img: meta.icon || '',
        buttonType: meta.buttonType,
        presetType: meta.type || 'presetButton',
        toggleElement: meta.toggleElement || 'MainMenuFlyout',
      };
    }

    case 'layout': {
      const isDivider = meta.type === 'divider';
      const baseId = meta.defaultId || meta.type;
      return {
        kind: 'layout',
        stageKey: `layout:${meta.type}`,
        typeBadge: meta.name,
        titleText: meta.name,
        layoutType: meta.type,
        baseId,
        dataElement: isDivider
          ? 'divider'
          : generateUniqueDataElement(baseId, existingIds),
        label: meta.type === 'label' ? 'Section Label' : '',
        description: meta.description || '',
      };
    }

    case 'panel': {
      const isRootFlyout = currentTarget?.type === 'flyout';
      const canEmbedInFlyout = SUPPORTED_FLYOUT_PANEL_RENDERS.has(meta.render);
      const baseId = `${meta.id}Toggle`;
      return {
        kind: 'panel',
        stageKey: `panel:${meta.id}`,
        typeBadge: 'Panel',
        titleText: meta.name,
        panelId: meta.id,
        render: meta.render,
        canEmbedInFlyout,
        mode: isRootFlyout && canEmbedInFlyout ? 'embed' : 'toggle',
        embedFlyoutKey: isRootFlyout
          ? currentTarget.flyoutKey
          : flyoutKeys[0] || '',
        baseId,
        dataElement: generateUniqueDataElement(baseId, existingIds),
        label: meta.toggleLabel || meta.name || '',
        title: meta.toggleTitle || `Toggle ${meta.name}`,
        img: meta.toggleIcon || 'icon-header-sidebar-line',
        panelLocation:
          config?.panels?.[meta.id]?.location || meta.defaultLocation || 'left',
      };
    }

    case 'popupAction': {
      return {
        kind: 'popupAction',
        stageKey: `popup:${meta.dataElement}`,
        typeBadge: 'Popup Action',
        titleText: meta.label,
        dataElement: meta.dataElement,
        label: meta.label,
        context: meta.context || '',
        popups: meta.popups || [],
      };
    }

    case 'toggleButton': {
      const baseId = 'customToggle';
      const defaultToggleTarget =
        flyoutKeys[0] || PANELS_CATALOG[0]?.id || 'viewControlsFlyout';
      return {
        kind: 'toggleButton',
        stageKey: 'interactive:toggleButton',
        typeBadge: 'Toggle Button',
        titleText: 'Toggle Button',
        baseId,
        dataElement: generateUniqueDataElement(baseId, existingIds),
        label: 'Toggle',
        title: `Toggle ${defaultToggleTarget}`,
        img: 'icon-header-sidebar-line',
        toggleTarget: defaultToggleTarget,
        panelLocation: 'left',
      };
    }

    case 'submenu': {
      const baseId = 'submenu';
      return {
        kind: 'submenu',
        stageKey: 'interactive:submenu',
        typeBadge: 'Submenu',
        titleText: 'Nested Submenu',
        baseId,
        dataElement: generateUniqueDataElement(baseId, existingIds),
        label: 'More Tools',
        title: 'More Tools',
        img: 'icon-header-chevron-right',
        flyoutKey: currentTarget?.flyoutKey || flyoutKeys[0] || '',
      };
    }

    case 'header': {
      const baseId = 'top-header';
      return {
        kind: 'header',
        stageKey: 'container:header',
        typeBadge: 'Container',
        titleText: 'Modular Header Bar',
        baseId,
        dataElement: generateUniqueDataElement(baseId, existingIds),
        placement: 'top',
        gap: 8,
        justifyContent: 'start',
        stroke: true,
      };
    }

    case 'ribbonTab': {
      const baseId = 'reviewRibbonItem';
      return {
        kind: 'ribbonTab',
        stageKey: 'container:ribbonTab',
        typeBadge: 'Container',
        titleText: 'Ribbon Tab',
        baseId,
        dataElement: generateUniqueDataElement(baseId, existingIds),
        label: 'Review',
        title: 'Review',
        img: '',
        headerKey: defaultHeaderKey,
      };
    }

    case 'flyout': {
      const baseId = 'customMenuFlyout';
      return {
        kind: 'flyout',
        stageKey: 'container:flyout',
        typeBadge: 'Container',
        titleText: 'Flyout Menu',
        baseId,
        dataElement: generateUniqueDataElement(baseId, existingIds),
        label: 'Custom Menu',
        title: 'Custom Menu',
        img: 'icon-tools-more',
        createToggle: true,
        targetLocationType: 'header',
        targetHeader: defaultHeaderKey,
        targetPopup: 'annotationPopup',
      };
    }

    case 'tabPanel': {
      const baseId = 'tabPanel';
      return {
        kind: 'tabPanel',
        stageKey: 'container:tabPanel',
        typeBadge: 'Container',
        titleText: 'Tab Panel Sidebar',
        baseId,
        dataElement: generateUniqueDataElement(baseId, existingIds),
        location: 'left',
        toggleLabel: 'Sidebar',
        createToggle: true,
        targetHeader: defaultHeaderKey,
        panelsList: [
          { render: 'thumbnailsPanel' },
          { render: 'outlinesPanel' },
          { render: 'bookmarksPanel' },
        ],
      };
    }

    default:
      return null;
  }
}

/**
 * Builds the commit payload from the current `draft` and `currentTarget`.
 * Guarantees a collision-free `dataElement` if the user commits the same draft multiple times.
 */
export function buildCommitFromDraft(draft, currentTarget, config) {
  if (!draft) return null;
  const existingIds = collectAllExistingIds(config);
  const userHeaderKeys = Object.keys(config?.modularHeaders || {}).filter(
    (k) => k !== 'tools-header',
  );
  const flyoutKeys = Object.keys(config?.flyouts || {});
  const defaultHeaderKey =
    currentTarget?.headerKey || userHeaderKeys[0] || 'default-top-header';
  const isFlyoutTarget =
    currentTarget?.type === 'flyout' || currentTarget?.type === 'submenu';

  const ensureUniqueId = (preferred, fallbackBase) => {
    const clean = (preferred || '').trim() || fallbackBase || 'customItem';
    if (!existingIds.has(clean)) return clean;
    return generateUniqueDataElement(fallbackBase || clean, existingIds);
  };

  const computeNextDraftId = (usedId, fallbackBase) => {
    const nextSet = new Set(existingIds);
    nextSet.add(usedId);
    return generateUniqueDataElement(fallbackBase || usedId, nextSet);
  };

  const targetPayload = {
    headerKey: defaultHeaderKey,
    targetLocationType: currentTarget?.type || 'header',
    ribbonTabKey: currentTarget?.ribbonTabKey,
    flyoutKey: currentTarget?.flyoutKey,
    parentKey: currentTarget?.parentKey,
    popupKey: currentTarget?.popupKey,
  };

  const makeItemNode = (type, id, label, extra = {}) => {
    let parentId = undefined;
    if (currentTarget?.type === 'ribbon') parentId = currentTarget.ribbonTabKey;
    else if (currentTarget?.type === 'submenu')
      parentId = currentTarget.parentKey;
    else if (currentTarget?.type === 'flyout')
      parentId = currentTarget.flyoutKey;
    else if (currentTarget?.type === 'popup') parentId = currentTarget.popupKey;
    else if (currentTarget?.type === 'header')
      parentId = currentTarget.headerKey;
    else parentId = defaultHeaderKey;

    return {
      type: currentTarget?.type === 'popup' ? 'popupItem' : type,
      id,
      label,
      parentId,
      headerKey: defaultHeaderKey,
      ribbonKey: currentTarget?.ribbonTabKey,
      flyoutKey: currentTarget?.flyoutKey,
      parentSubmenuKey: currentTarget?.parentKey,
      parentKey: currentTarget?.parentKey,
      popupKey: currentTarget?.popupKey,
      targetContext: targetPayload,
      ...extra,
    };
  };

  switch (draft.kind) {
    case 'tool': {
      const dataElement = ensureUniqueId(draft.dataElement, draft.baseId);
      const component = isFlyoutTarget
        ? {
            type: 'customButton',
            dataElement,
            label: draft.label || draft.title || draft.toolName,
            title: draft.title || draft.label || draft.toolName,
            img: draft.img,
            toolName: draft.toolName,
            onClick: `${TOOL_ACTION_PREFIX}${draft.toolName}`,
          }
        : {
            type: 'toolButton',
            dataElement,
            toolName: draft.toolName,
            label: draft.label,
            title: draft.title || draft.label,
            img: draft.img,
          };

      return {
        actionType: 'addComponent',
        payload: {
          target: targetPayload,
          componentType: component.type,
          component,
        },
        createdNode: makeItemNode(
          component.type,
          dataElement,
          draft.label || draft.title || draft.toolName,
          { toolName: draft.toolName, component },
        ),
        nextDataElement: computeNextDraftId(dataElement, draft.baseId),
      };
    }

    case 'preset': {
      const dataElement = ensureUniqueId(draft.dataElement, draft.baseId);
      const isMenuToggle = draft.presetType === 'toggleButton';
      const component = isMenuToggle
        ? {
            type: 'toggleButton',
            dataElement,
            toggleElement: draft.toggleElement || 'MainMenuFlyout',
            element: draft.toggleElement || 'MainMenuFlyout',
            label: draft.label,
            title: draft.title || draft.label,
            img: draft.img,
          }
        : {
            type: 'presetButton',
            dataElement,
            buttonType: draft.buttonType,
            label: draft.label,
            title: draft.title || draft.label,
            img: draft.img,
          };

      return {
        actionType: 'addComponent',
        payload: {
          target: targetPayload,
          componentType: component.type,
          component,
        },
        createdNode: makeItemNode(
          component.type,
          dataElement,
          draft.label || draft.title || draft.buttonType,
          { component },
        ),
        nextDataElement: computeNextDraftId(dataElement, draft.baseId),
      };
    }

    case 'layout': {
      const isDivider = draft.layoutType === 'divider';
      const dataElement = isDivider
        ? 'divider'
        : ensureUniqueId(draft.dataElement, draft.baseId);
      const component = {
        type: draft.layoutType,
        dataElement,
        ...(draft.layoutType === 'label'
          ? { label: draft.label || 'Section Label' }
          : {}),
      };

      return {
        actionType: 'addComponent',
        payload: {
          target: targetPayload,
          componentType: draft.layoutType,
          component,
        },
        createdNode: makeItemNode(
          draft.layoutType,
          dataElement,
          isDivider ? 'Divider' : draft.label || 'Section Label',
          { component },
        ),
        nextDataElement: isDivider
          ? 'divider'
          : computeNextDraftId(dataElement, draft.baseId),
      };
    }

    case 'panel': {
      const targetFlyout =
        draft.embedFlyoutKey ||
        (isFlyoutTarget ? currentTarget.flyoutKey : flyoutKeys[0] || '');
      if (draft.mode === 'embed' && draft.canEmbedInFlyout && targetFlyout) {
        const component = {
          type: 'flyoutPanel',
          dataElement: draft.render,
          render: draft.render,
        };
        return {
          actionType: 'addComponent',
          payload: {
            target: {
              headerKey: defaultHeaderKey,
              targetLocationType: 'flyout',
              flyoutKey: targetFlyout,
            },
            componentType: 'flyoutPanel',
            component,
          },
          createdNode: {
            type: 'flyoutPanel',
            id: draft.render,
            label: draft.name || draft.render,
            parentId: targetFlyout,
            flyoutKey: targetFlyout,
            component,
            targetContext: {
              headerKey: defaultHeaderKey,
              targetLocationType: 'flyout',
              flyoutKey: targetFlyout,
            },
          },
          nextDataElement: draft.dataElement,
        };
      }

      const dataElement = ensureUniqueId(draft.dataElement, draft.baseId);
      const component = {
        type: 'toggleButton',
        dataElement,
        toggleElement: draft.panelId,
        element: draft.panelId,
        label: draft.label || draft.titleText,
        title: draft.title || `Toggle ${draft.titleText}`,
        img: draft.img || 'icon-header-sidebar-line',
        panelLocation: draft.panelLocation || 'left',
      };

      const safeTargetPayload =
        targetPayload.targetLocationType === 'flyout' ||
        targetPayload.targetLocationType === 'submenu'
          ? {
              headerKey: defaultHeaderKey,
              targetLocationType: 'header',
            }
          : targetPayload;

      return {
        actionType: 'addComponent',
        payload: {
          target: safeTargetPayload,
          componentType: 'toggleButton',
          component,
        },
        createdNode: makeItemNode(
          'toggleButton',
          dataElement,
          draft.label || draft.titleText,
          { component },
        ),
        nextDataElement: computeNextDraftId(dataElement, draft.baseId),
      };
    }

    case 'popupAction': {
      const popupKey = currentTarget?.popupKey || 'annotationPopup';
      return {
        actionType: 'addComponent',
        payload: {
          target: {
            headerKey: defaultHeaderKey,
            targetLocationType: 'popup',
            popupKey,
          },
          componentType: 'popupAction',
          component: {
            type: 'popupAction',
            dataElement: draft.dataElement,
            label: draft.label,
          },
        },
        createdNode: {
          type: 'popupItem',
          id: draft.dataElement,
          label: draft.label,
          parentId: popupKey,
          popupKey,
          targetContext: {
            headerKey: defaultHeaderKey,
            targetLocationType: 'popup',
            popupKey,
          },
        },
        nextDataElement: draft.dataElement,
      };
    }

    case 'toggleButton': {
      const dataElement = ensureUniqueId(draft.dataElement, draft.baseId);
      const targetEl = draft.toggleTarget || 'viewControlsFlyout';
      const component = {
        type: 'toggleButton',
        dataElement,
        toggleElement: targetEl,
        element: targetEl,
        label: draft.label || 'Toggle',
        title: draft.title || `Toggle ${targetEl}`,
        img: draft.img || 'icon-header-sidebar-line',
        ...(draft.panelLocation ? { panelLocation: draft.panelLocation } : {}),
      };
      const safeTargetPayload =
        targetPayload.targetLocationType === 'flyout' ||
        targetPayload.targetLocationType === 'submenu'
          ? {
              headerKey: defaultHeaderKey,
              targetLocationType: 'header',
            }
          : targetPayload;

      return {
        actionType: 'addComponent',
        payload: {
          target: safeTargetPayload,
          componentType: 'toggleButton',
          component,
        },
        createdNode: makeItemNode(
          'toggleButton',
          dataElement,
          draft.label || 'Toggle',
          { component },
        ),
        nextDataElement: computeNextDraftId(dataElement, draft.baseId),
      };
    }

    case 'submenu': {
      const effectiveTarget =
        currentTarget?.type === 'flyout' || currentTarget?.type === 'submenu'
          ? currentTarget
          : availableTargets.find(
              (t) => t.type === 'flyout' || t.type === 'submenu',
            );
      const flyoutKey =
        effectiveTarget?.flyoutKey || draft.flyoutKey || flyoutKeys[0];
      if (!flyoutKey) return null;
      const dataElement = ensureUniqueId(draft.dataElement, draft.baseId);
      const label = draft.label || 'Submenu';
      const component = {
        type: 'customButton',
        dataElement,
        label,
        title: draft.title || label,
        img: draft.img || 'icon-header-chevron-right',
        isSubmenu: true,
        children: [],
      };
      const isNestedInCurrentSubmenu =
        effectiveTarget?.type === 'submenu' &&
        effectiveTarget?.flyoutKey === flyoutKey;

      return {
        actionType: 'addComponent',
        payload: {
          target: {
            headerKey: defaultHeaderKey,
            targetLocationType: isNestedInCurrentSubmenu ? 'submenu' : 'flyout',
            flyoutKey,
            parentKey: isNestedInCurrentSubmenu
              ? effectiveTarget.parentKey
              : undefined,
          },
          componentType: 'customButton',
          component,
        },
        createdNode: {
          type: 'customButton',
          id: dataElement,
          label,
          parentId: isNestedInCurrentSubmenu
            ? effectiveTarget.parentKey
            : flyoutKey,
          flyoutKey,
          parentSubmenuKey: isNestedInCurrentSubmenu
            ? effectiveTarget.parentKey
            : undefined,
          isSubmenu: true,
          component,
          targetContext: {
            headerKey: defaultHeaderKey,
            targetLocationType: isNestedInCurrentSubmenu ? 'submenu' : 'flyout',
            flyoutKey,
            parentKey: isNestedInCurrentSubmenu
              ? effectiveTarget.parentKey
              : undefined,
          },
        },
        nextTarget: {
          key: `submenu:${flyoutKey}:${dataElement}`,
          type: 'submenu',
          parentKey: dataElement,
          flyoutKey,
          label: `Submenu: ${label}`,
        },
        nextDataElement: computeNextDraftId(dataElement, draft.baseId),
      };
    }

    case 'header': {
      const placement = draft.placement || 'top';
      const baseId = `${placement}-header`;
      const dataElement = ensureUniqueId(draft.dataElement, baseId);
      const headerDef = {
        dataElement,
        placement,
        gap: Number(draft.gap) || 0,
        justifyContent: draft.justifyContent || 'start',
        grow: 0,
        stroke: draft.stroke !== false,
        items: [],
      };
      return {
        actionType: 'addHeader',
        payload: headerDef,
        createdNode: {
          type: 'header',
          id: dataElement,
          label: getFriendlyComponentName(dataElement, headerDef),
        },
        nextTarget: {
          key: `header:${dataElement}`,
          type: 'header',
          headerKey: dataElement,
          label: `Header: ${getFriendlyComponentName(dataElement, headerDef)}`,
        },
        nextDataElement: computeNextDraftId(dataElement, baseId),
      };
    }

    case 'ribbonTab': {
      const tabLabel = draft.label || 'New Tab';
      const clean = tabLabel.trim().replace(/[^a-zA-Z0-9]/g, '') || 'custom';
      const baseId = `${clean.charAt(0).toLowerCase()}${clean.slice(1)}RibbonItem`;
      const dataElement = ensureUniqueId(draft.dataElement, baseId);
      const nextSet = new Set(existingIds);
      nextSet.add(dataElement);
      const groupKey = generateUniqueDataElement(
        `${clean.charAt(0).toLowerCase()}${clean.slice(1)}GroupedItems`,
        nextSet,
      );
      const headerKey = draft.headerKey || defaultHeaderKey;
      const hDef = config?.modularHeaders?.[headerKey];
      const hName = getFriendlyComponentName(headerKey, hDef);

      return {
        actionType: 'addComponent',
        payload: {
          target: {
            headerKey,
            targetLocationType: 'header',
          },
          componentType: 'ribbonItem',
          component: {
            type: 'ribbonItem',
            dataElement,
            label: tabLabel,
            title: draft.title || tabLabel,
            ...(draft.img ? { img: draft.img } : {}),
            toolbarGroup: dataElement,
            groupedItems: [groupKey],
            items: [],
          },
        },
        createdNode: {
          type: 'ribbonTab',
          id: dataElement,
          label: tabLabel,
          headerKey,
        },
        nextTarget: {
          key: `ribbon:${headerKey}:${dataElement}`,
          type: 'ribbon',
          headerKey,
          ribbonTabKey: dataElement,
          label: `Tab: ${tabLabel} (${hName})`,
        },
        nextDataElement: computeNextDraftId(dataElement, baseId),
      };
    }

    case 'flyout': {
      const flyoutName = draft.label || 'Custom Menu';
      const clean = flyoutName.trim().replace(/[^a-zA-Z0-9]/g, '') || 'custom';
      const baseId = `${clean.charAt(0).toLowerCase()}${clean.slice(1)}Flyout`;
      const dataElement = ensureUniqueId(draft.dataElement, baseId);
      const isPopup = draft.targetLocationType === 'popup';
      const targetHeader = draft.targetHeader || defaultHeaderKey;
      const targetPopup = draft.targetPopup || 'annotationPopup';

      return {
        actionType: 'addFlyout',
        payload: {
          dataElement,
          label: flyoutName,
          title: draft.title || flyoutName,
          icon: draft.img || 'icon-tools-more',
          createToggle: true,
          targetLocationType: isPopup ? 'popup' : 'header',
          targetHeader: isPopup ? null : targetHeader,
          targetPopup: isPopup ? targetPopup : null,
        },
        createdNode: {
          type: 'flyout',
          id: dataElement,
          label: flyoutName,
        },
        nextTarget: {
          key: `flyout:${dataElement}`,
          type: 'flyout',
          flyoutKey: dataElement,
          label: `Flyout: ${flyoutName}`,
        },
        nextDataElement: computeNextDraftId(dataElement, baseId),
      };
    }

    case 'tabPanel': {
      const baseId = 'tabPanel';
      const dataElement = ensureUniqueId(draft.dataElement, baseId);
      const targetHeader = draft.targetHeader || defaultHeaderKey;

      return {
        actionType: 'addTabPanel',
        payload: {
          dataElement,
          location: draft.location || 'left',
          panelsList:
            Array.isArray(draft.panelsList) && draft.panelsList.length > 0
              ? draft.panelsList
              : [
                  { render: 'thumbnailsPanel' },
                  { render: 'outlinesPanel' },
                  { render: 'bookmarksPanel' },
                ],
          toggleLabel: draft.toggleLabel || 'Sidebar',
          targetHeader: draft.createToggle !== false ? targetHeader : null,
        },
        createdNode: {
          type: 'panel',
          id: dataElement,
          label: getFriendlyComponentName(dataElement, { render: 'tabPanel' }),
        },
        nextDataElement: computeNextDraftId(dataElement, baseId),
      };
    }

    default:
      return null;
  }
}
