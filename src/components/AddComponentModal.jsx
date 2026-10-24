import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  TOOLS_CATALOG,
  PRESET_BUTTONS_CATALOG,
  PANELS_CATALOG,
  LAYOUT_ELEMENTS_CATALOG,
  TAB_PANEL_SUPPORTED_TABS,
  POPUPS_CATALOG,
  BUILTIN_POPUP_ITEMS_CATALOG,
  DEFAULT_POPUPS,
} from '../constants/webviewerCatalog';
import { isModalTabAllowedInFlyout } from '../sdk/importConfig';
import { TOOL_ACTION_PREFIX } from '../sdk/sdkRules';

// Category pills shown above the catalog list.
const CATEGORY_PILLS = [
  { id: 'all', label: 'All' },
  { id: 'tool', label: 'Tools' },
  { id: 'preset', label: 'Presets' },
  { id: 'panel', label: 'Panels' },
  { id: 'popup', label: 'Popups' },
  { id: 'layout', label: 'Controls & Layout' },
  { id: 'container', label: 'Containers' },
];

const KIND_BADGE = {
  tool: 'Tool',
  preset: 'Preset',
  panel: 'Panel',
  popup: 'Popup',
  control: 'Control',
  layout: 'Layout',
  container: 'Container',
};

// Which pill each kind lives under
const KIND_CATEGORY = {
  tool: 'tool',
  preset: 'preset',
  panel: 'panel',
  popup: 'popup',
  control: 'layout',
  layout: 'layout',
  container: 'container',
};

// Maps a catalog kind onto the legacy modal tab names used by
// isModalTabAllowedInFlyout / MODAL_TAB_ITEM_TYPES.
const KIND_TO_RULE_TAB = {
  tool: 'tool',
  preset: 'preset',
  panel: 'toggle',
  popup: 'popup',
  control: 'controls',
  layout: 'layout',
};

const CONTAINER_ITEMS = [
  {
    id: 'container:header',
    kind: 'container',
    containerType: 'header',
    name: 'Modular Header',
    sub: 'New header bar (top / bottom / left / right)',
  },
  {
    id: 'container:ribbonTab',
    kind: 'container',
    containerType: 'ribbonTab',
    name: 'RibbonItem (Tab)',
    sub: "Interactive tab inside a header's RibbonGroup",
  },
  {
    id: 'container:flyout',
    kind: 'container',
    containerType: 'flyout',
    name: 'Flyout Menu',
    sub: 'Dropdown container + its toggle button',
  },
  {
    id: 'container:tabPanel',
    kind: 'container',
    containerType: 'tabPanel',
    name: 'Tab Panel',
    sub: 'Dockable multi-tab sidebar container',
  },
];

const INITIAL_TAB_TO_CONTAINER = {
  ribbonTab: 'container:ribbonTab',
  newFlyout: 'container:flyout',
  tabPanel: 'container:tabPanel',
  header: 'container:header',
};

export default function AddComponentModal({
  isOpen,
  onClose,
  initialTab = 'tool',
  initialLocation = null,
  initialFlyout = null,
  initialPopup = null,
  headerOptions = [],
  activeHeader = '',
  ribbonTabs: propRibbonTabs = [],
  getRibbonTabs,
  onHeaderChange,
  activeRibbonTab = '',
  panels = {},
  flyouts = {},
  popups = {},
  onAddComponent,
  onAddTabPanel,
  onAddFlyout,
  onAddHeader,
}) {
  // ---- Unified catalog -----------------------------------------------------
  const catalog = useMemo(() => {
    const items = [];

    for (const t of TOOLS_CATALOG) {
      items.push({
        id: `tool:${t.toolName}`,
        kind: 'tool',
        name: t.label,
        sub: t.toolName,
        ref: t,
        defaults: {
          dataElement: t.defaultId,
          label: t.label,
          title: t.title,
          icon: t.icon || '',
        },
      });
    }

    for (const p of PRESET_BUTTONS_CATALOG) {
      items.push({
        id: `preset:${p.buttonType}`,
        kind: 'preset',
        name: p.label,
        sub: p.buttonType,
        ref: p,
        defaults: {
          dataElement: p.defaultId,
          label: p.label,
          title: p.title,
          icon: p.icon || '',
        },
      });
    }

    for (const p of PANELS_CATALOG) {
      items.push({
        id: `panel:${p.id}`,
        kind: 'panel',
        name: p.name,
        sub: p.id,
        ref: p,
        requirement: p.requirement,
        defaults: {
          dataElement: `${p.id}Toggle`,
          label: p.toggleLabel,
          title: p.toggleTitle,
          icon: p.toggleIcon || '',
        },
      });
    }
    for (const k of Object.keys(panels || {})) {
      if (PANELS_CATALOG.some((p) => p.id === k)) continue;
      items.push({
        id: `panel:${k}`,
        kind: 'panel',
        name: `Custom Panel: ${k}`,
        sub: k,
        ref: { id: k },
        defaults: {
          dataElement: `${k}Toggle`,
          label: k,
          title: `Toggle ${k}`,
          icon: 'icon-header-sidebar-line',
        },
      });
    }

    for (const l of LAYOUT_ELEMENTS_CATALOG) {
      const isControl = ['pageControls', 'zoom', 'viewControls'].includes(
        l.type,
      );
      items.push({
        id: `layout:${l.type}`,
        kind: isControl ? 'control' : 'layout',
        name: l.name,
        sub: l.description,
        ref: l,
        defaults: {
          dataElement: l.defaultId,
          label: '',
          title: '',
          icon: '',
        },
      });
    }

    for (const p of BUILTIN_POPUP_ITEMS_CATALOG) {
      items.push({
        id: `popup:${p.dataElement}`,
        kind: 'popup',
        name: p.label,
        sub: p.context ? `${p.dataElement} — ${p.context}` : p.dataElement,
        ref: p,
        defaults: {
          dataElement: p.dataElement,
          label: p.label,
          title: p.label,
          icon: '',
        },
      });
    }

    return [...items, ...CONTAINER_ITEMS];
  }, [panels]);

  // ---- State ---------------------------------------------------------------
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('tool:Pan');
  const [form, setForm] = useState({
    dataElement: '',
    label: '',
    title: '',
    icon: '',
  });
  const [addedMsg, setAddedMsg] = useState('');

  // Destination: 'header' | `ribbon:<key>` | `flyout:<id>`
  const [targetValue, setTargetValue] = useState('header');
  const [selectedHeader, setSelectedHeader] = useState(
    activeHeader || headerOptions[0] || 'default-top-header',
  );

  const currentRibbonTabs = useMemo(() => {
    if (typeof getRibbonTabs === 'function') {
      return getRibbonTabs(selectedHeader);
    }
    return propRibbonTabs || [];
  }, [getRibbonTabs, selectedHeader, propRibbonTabs]);

  const handleHeaderChange = (newHeader) => {
    setSelectedHeader(newHeader);
    onHeaderChange?.(newHeader);

    const tabsForNewHeader =
      typeof getRibbonTabs === 'function'
        ? getRibbonTabs(newHeader)
        : propRibbonTabs;

    if (targetValue.startsWith('ribbon:')) {
      const currentKey = targetValue.slice('ribbon:'.length);
      const exists = tabsForNewHeader.some((t) => t.key === currentKey);
      if (!exists) {
        if (tabsForNewHeader.length > 0) {
          setTargetValue(`ribbon:${tabsForNewHeader[0].key}`);
        } else {
          setTargetValue('header');
        }
      }
    } else if (
      targetValue === 'header' &&
      initialLocation === 'ribbon' &&
      tabsForNewHeader.length > 0
    ) {
      setTargetValue(`ribbon:${tabsForNewHeader[0].key}`);
    }
  };

  // Container form state
  const [newHeaderId, setNewHeaderId] = useState('');
  const [newHeaderPlacement, setNewHeaderPlacement] = useState('top');
  const [newTabLabel, setNewTabLabel] = useState('');
  const [newTabGroupId, setNewTabGroupId] = useState('');
  const [isGroupIdCustomized, setIsGroupIdCustomized] = useState(false);
  const [newFlyoutId, setNewFlyoutId] = useState('customActionsFlyout');
  const [newFlyoutToggleLabel, setNewFlyoutToggleLabel] =
    useState('More Tools');
  const [newFlyoutToggleTitle, setNewFlyoutToggleTitle] =
    useState('Open flyout menu');
  const [newFlyoutToggleIcon, setNewFlyoutToggleIcon] =
    useState('icon-tools-more');
  const [tabPanelId, setTabPanelId] = useState('tabPanel');
  const [tabPanelLocation, setTabPanelLocation] = useState('left');
  const [selectedTabPanelChildren, setSelectedTabPanelChildren] = useState(
    new Set(['thumbnailsPanel', 'outlinesPanel', 'bookmarksPanel']),
  );
  const [toggleButtonLabel, setToggleButtonLabel] = useState('Sidebar');

  const searchRef = useRef(null);
  const listRef = useRef(null);

  const hasFlyouts = Object.keys(flyouts || {}).length > 0;
  const isFlyoutTarget =
    targetValue.startsWith('flyout:') &&
    !!flyouts[targetValue.slice('flyout:'.length)];
  const isPopupTarget = targetValue.startsWith('popup:');
  const [flyoutToggleTarget, setFlyoutToggleTarget] = useState('header');

  // Reset only when the modal opens (or is re-opened for a new context). It must
  // NOT run on every parent render: the modal stays open across multiple adds.
  useEffect(() => {
    if (!isOpen) return;

    const containerId = INITIAL_TAB_TO_CONTAINER[initialTab];
    setCategory(containerId ? 'container' : 'all');
    setSearch('');
    setAddedMsg('');
    setSelectedItemId(containerId || 'tool:Pan');

    const initialHeader =
      activeHeader || headerOptions[0] || 'default-top-header';
    setSelectedHeader(initialHeader);

    const initialTabs =
      typeof getRibbonTabs === 'function'
        ? getRibbonTabs(initialHeader)
        : propRibbonTabs;

    if (initialPopup && POPUPS_CATALOG.some((p) => p.id === initialPopup)) {
      setTargetValue(`popup:${initialPopup}`);
    } else if (initialLocation === 'popup') {
      setTargetValue(`popup:${initialPopup || 'annotationPopup'}`);
    } else if (initialFlyout && flyouts[initialFlyout]) {
      setTargetValue(`flyout:${initialFlyout}`);
    } else if (
      (initialLocation === 'ribbon' || (!initialLocation && activeRibbonTab)) &&
      initialTabs.some((t) => t.key === activeRibbonTab)
    ) {
      setTargetValue(`ribbon:${activeRibbonTab}`);
    } else if (initialLocation === 'ribbon' && initialTabs.length > 0) {
      setTargetValue(`ribbon:${initialTabs[0].key}`);
    } else {
      setTargetValue('header');
    }

    if (initialLocation === 'popup' || initialPopup) {
      setFlyoutToggleTarget(
        initialPopup ? `popup:${initialPopup}` : 'popup:annotationPopup',
      );
      if (initialTab === 'popup') {
        setCategory('popup');
      }
    } else {
      setFlyoutToggleTarget('header');
    }

    setNewHeaderId('');
    setNewHeaderPlacement('top');
    setNewTabLabel('');
    setNewTabGroupId('');
    setIsGroupIdCustomized(false);
    setTabPanelId('tabPanel');
    setTabPanelLocation('left');
    setSelectedTabPanelChildren(
      new Set(['thumbnailsPanel', 'outlinesPanel', 'bookmarksPanel']),
    );
    setToggleButtonLabel('Sidebar');
  }, [isOpen, initialTab, initialLocation, initialFlyout, initialPopup]);

  // Drop a stale destination (e.g. its ribbon tab/flyout was deleted)
  useEffect(() => {
    if (!isOpen) return;
    if (
      targetValue.startsWith('ribbon:') &&
      !currentRibbonTabs.some(
        (t) => t.key === targetValue.slice('ribbon:'.length),
      )
    ) {
      if (currentRibbonTabs.length > 0) {
        setTargetValue(`ribbon:${currentRibbonTabs[0].key}`);
      } else {
        setTargetValue('header');
      }
    } else if (
      targetValue.startsWith('flyout:') &&
      !flyouts[targetValue.slice('flyout:'.length)]
    ) {
      setTargetValue('header');
    } else if (
      targetValue.startsWith('popup:') &&
      !POPUPS_CATALOG.some((p) => p.id === targetValue.slice('popup:'.length))
    ) {
      setTargetValue('header');
    }
  }, [isOpen, targetValue, currentRibbonTabs, flyouts]);

  const selectedItem = useMemo(
    () => catalog.find((i) => i.id === selectedItemId) || null,
    [catalog, selectedItemId],
  );

  // Flyouts only accept some item types (see sdk/importConfig.js)
  const isBlockedInFlyout = (item) => {
    if (!isFlyoutTarget || item.kind === 'container') return false;
    if (!isModalTabAllowedInFlyout(KIND_TO_RULE_TAB[item.kind])) return true;
    // Presets of type toggleButton open flyouts, which crash inside a flyout
    if (item.kind === 'preset' && item.ref?.type === 'toggleButton')
      return true;
    // Only literal dividers are valid layout items in a flyout
    if (item.kind === 'layout' && item.ref?.type !== 'divider') return true;
    // Built-in popup items cannot be placed inside flyouts
    if (item.kind === 'popup') return true;
    return false;
  };

  const isBlockedInPopup = (item) => {
    if (!isPopupTarget) return false;
    // Structural containers cannot be placed inside popups
    if (
      item.kind === 'container' &&
      (item.containerType === 'header' ||
        item.containerType === 'ribbonTab' ||
        item.containerType === 'tabPanel')
    ) {
      return true;
    }
    // Controls and layout elements cannot be placed inside popups
    if (item.kind === 'control' || item.kind === 'layout') return true;
    return false;
  };

  const isBlockedInNonPopup = (item) => {
    if (isPopupTarget || item.kind === 'container') return false;
    // Built-in popup items require a popup canvas context
    if (item.kind === 'popup') return true;
    return false;
  };

  const isItemBlocked = (item) => {
    if (isFlyoutTarget) return isBlockedInFlyout(item);
    if (isPopupTarget) return isBlockedInPopup(item);
    return isBlockedInNonPopup(item);
  };

  const getBlockedTooltip = (item) => {
    if (isFlyoutTarget) {
      return 'Flyouts only accept tools, preset buttons, panel toggles, and dividers.';
    }
    if (isPopupTarget) {
      if (item.kind === 'container') {
        return 'Structural containers (headers, ribbons, tab panels) cannot be placed inside popups.';
      }
      return 'Layout controls and dividers are not supported inside popups.';
    }
    if (item.kind === 'popup') {
      return 'Built-in popup actions require a popup selection context (Annotation, Text, or Context Menu).';
    }
    return '';
  };

  // Populate the property form with the selected component's defaults
  useEffect(() => {
    if (selectedItem && selectedItem.kind !== 'container') {
      setForm({ ...selectedItem.defaults });
    }
    setAddedMsg('');
  }, [selectedItemId]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return catalog.filter((item) => {
      if (q) {
        const hay = [
          item.name,
          item.sub,
          item.defaults?.dataElement,
          KIND_BADGE[item.kind],
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
        // While searching, "All" also surfaces containers
        return category === 'all' || KIND_CATEGORY[item.kind] === category;
      }
      if (category === 'all') return item.kind !== 'container';
      return KIND_CATEGORY[item.kind] === category;
    });
  }, [catalog, search, category]);

  const categoryCount = (id) =>
    catalog.filter((i) =>
      id === 'all' ? i.kind !== 'container' : KIND_CATEGORY[i.kind] === id,
    ).length;

  // Auto-select the first allowed item if the current selection is no longer in filtered items
  useEffect(() => {
    if (!isOpen) return;
    const isSelectedVisible = filteredItems.some(
      (i) => i.id === selectedItemId && !isItemBlocked(i),
    );
    if (!isSelectedVisible) {
      const firstAllowed = filteredItems.find((i) => !isItemBlocked(i));
      if (firstAllowed) {
        setSelectedItemId(firstAllowed.id);
      }
    }
  }, [filteredItems, selectedItemId, isOpen, targetValue]);

  // When clicking a category filter, switch category and select its first item
  const handleCategoryClick = (catId) => {
    setCategory(catId);
    const q = search.trim().toLowerCase();
    const itemsInCat = catalog.filter((item) => {
      if (q) {
        const hay = [
          item.name,
          item.sub,
          item.defaults?.dataElement,
          KIND_BADGE[item.kind],
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
        return catId === 'all' || KIND_CATEGORY[item.kind] === catId;
      }
      if (catId === 'all') return item.kind !== 'container';
      return KIND_CATEGORY[item.kind] === catId;
    });
    const first = itemsInCat.find((i) => !isItemBlocked(i));
    if (first) {
      setSelectedItemId(first.id);
    }
  };

  // If the selected component isn't allowed in the chosen destination, move to a valid one
  useEffect(() => {
    if (!isOpen || !selectedItem) return;
    if (isItemBlocked(selectedItem)) {
      const firstAllowed = catalog.find((i) => !isItemBlocked(i));
      if (firstAllowed) setSelectedItemId(firstAllowed.id);
    }
  }, [isOpen, targetValue, selectedItemId, flyouts]);

  // Keep the highlighted row in view while arrowing through the list
  useEffect(() => {
    const el = listRef.current?.querySelector('.catalog-row.active');
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
  }, [selectedItemId, filteredItems]);

  if (!isOpen) return null;

  const setField = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const moveSelection = (dir) => {
    const enabled = filteredItems.filter((i) => !isItemBlocked(i));
    if (enabled.length === 0) return;
    const idx = enabled.findIndex((i) => i.id === selectedItemId);
    const next = enabled[(idx + dir + enabled.length) % enabled.length];
    setSelectedItemId(next.id);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveSelection(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveSelection(-1);
    }
  };

  // ---- Destination ---------------------------------------------------------
  const resolveTarget = () => {
    const popupKey = isPopupTarget ? targetValue.slice('popup:'.length) : null;
    const flyoutKey = isFlyoutTarget
      ? targetValue.slice('flyout:'.length)
      : null;
    const ribbonKey =
      targetValue.startsWith('ribbon:') &&
      currentRibbonTabs.some(
        (t) => t.key === targetValue.slice('ribbon:'.length),
      )
        ? targetValue.slice('ribbon:'.length)
        : null;
    return {
      headerKey: selectedHeader,
      targetLocationType: popupKey
        ? 'popup'
        : flyoutKey
          ? 'flyout'
          : ribbonKey
            ? 'ribbon'
            : 'header',
      ribbonTabKey: ribbonKey,
      flyoutKey,
      popupKey,
    };
  };

  const describeTarget = (t) =>
    t.targetLocationType === 'popup'
      ? `Popup: ${POPUPS_CATALOG.find((p) => p.id === t.popupKey)?.name || t.popupKey}`
      : t.targetLocationType === 'flyout'
        ? `Flyout: ${t.flyoutKey}`
        : t.targetLocationType === 'ribbon'
          ? `Ribbon: ${currentRibbonTabs.find((r) => r.key === t.ribbonTabKey)?.label || t.ribbonTabKey}`
          : `Header: ${t.headerKey}`;

  // After creating a container, return to the catalog so the user can fill it
  const backToCatalog = (nextTargetValue) => {
    if (nextTargetValue) setTargetValue(nextTargetValue);
    setCategory('all');
    setSearch('');
    setSelectedItemId('tool:Pan');
  };

  // ---- Submit --------------------------------------------------------------
  const submitContainer = () => {
    const type = selectedItem.containerType;

    if (type === 'header') {
      const id = newHeaderId.trim();
      if (!id) {
        alert('Header ID (dataElement) is required.');
        return;
      }
      if (id.toLowerCase() === 'tools-header' || headerOptions.includes(id)) {
        alert(
          id.toLowerCase() === 'tools-header'
            ? '"tools-header" is a reserved system header for ribbon tools.'
            : `Header "${id}" already exists.`,
        );
        return;
      }
      onAddHeader?.({
        dataElement: id,
        placement: newHeaderPlacement,
        justifyContent: 'start',
        gap: 8,
        items: [],
      });
      setSelectedHeader(id);
      setNewHeaderId('');
      setAddedMsg(`✓ Created header ${id} (${newHeaderPlacement})`);
      backToCatalog('header');
      return;
    }

    if (type === 'flyout') {
      if (!newFlyoutId.trim()) {
        alert('Flyout ID (dataElement) is required.');
        return;
      }
      const id = newFlyoutId.trim();
      const inPopup = flyoutToggleTarget.startsWith('popup:');
      const targetPopupKey = inPopup
        ? flyoutToggleTarget.slice('popup:'.length)
        : null;
      onAddFlyout?.({
        dataElement: id,
        label: newFlyoutToggleLabel.trim() || undefined,
        title: newFlyoutToggleTitle.trim() || undefined,
        icon: newFlyoutToggleIcon.trim() || undefined,
        targetHeader: selectedHeader,
        targetLocationType: inPopup ? 'popup' : 'header',
        targetPopup: targetPopupKey,
      });
      setAddedMsg(
        inPopup
          ? `✓ Created flyout ${id} (toggle in ${POPUPS_CATALOG.find((p) => p.id === targetPopupKey)?.name || targetPopupKey}) - now targeting it`
          : `✓ Created flyout ${id} - now targeting it`,
      );
      backToCatalog(`flyout:${id}`);
      return;
    }

    if (type === 'tabPanel') {
      if (!tabPanelId.trim()) {
        alert('Tab Panel Container ID is required.');
        return;
      }
      onAddTabPanel?.({
        dataElement: tabPanelId.trim(),
        location: tabPanelLocation,
        panelsList: Array.from(selectedTabPanelChildren).map((render) => ({
          render,
        })),
        toggleLabel: toggleButtonLabel.trim() || undefined,
        targetHeader: selectedHeader,
      });
      setAddedMsg(`✓ Created tab panel ${tabPanelId.trim()}`);
      return;
    }

    if (type === 'ribbonTab') {
      if (!newTabLabel.trim()) {
        alert('Ribbon Tab Label is required.');
        return;
      }
      const cleanLabel = newTabLabel.trim().replace(/[^a-zA-Z0-9]/g, '');
      const defaultCamel = cleanLabel
        ? cleanLabel.charAt(0).toLowerCase() + cleanLabel.slice(1)
        : 'custom';
      const groupId = newTabGroupId.trim() || `${defaultCamel}RibbonItem`;

      const cleanName = groupId
        .replace(/RibbonItem$/i, '')
        .replace(/^toolbarGroup-/, '')
        .replace(/^ribbon-/, '');
      const groupBase = cleanName
        ? cleanName.charAt(0).toLowerCase() + cleanName.slice(1)
        : 'ribbon';
      const groupContainerKey = `${groupBase}GroupedItems`;

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
      setAddedMsg(`✓ Created RibbonItem "${newTabLabel.trim()}" (${groupId})`);
      setNewTabLabel('');
      setNewTabGroupId('');
      setIsGroupIdCustomized(false);
      backToCatalog(`ribbon:${groupId}`);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedItem) return;

    if (selectedItem.kind === 'container') {
      submitContainer();
      return;
    }

    const dataElement = form.dataElement.trim();
    if (!dataElement) {
      alert('Data Element ID is required.');
      return;
    }

    const target = resolveTarget();
    const inFlyout = target.targetLocationType === 'flyout';
    const { kind, ref } = selectedItem;
    let componentType;
    let component;

    if (kind === 'tool') {
      componentType = inFlyout ? 'customButton' : 'toolButton';
      component = inFlyout
        ? {
            type: 'customButton',
            dataElement,
            toolName: ref.toolName,
            onClick: `${TOOL_ACTION_PREFIX}${ref.toolName}`,
            label: form.label || ref.toolName,
            title: form.title || form.label || ref.toolName,
            img: form.icon || undefined,
          }
        : {
            type: 'toolButton',
            dataElement,
            toolName: ref.toolName,
            label: form.label || undefined,
            title: form.title || undefined,
            img: form.icon || undefined,
          };
    } else if (kind === 'preset') {
      const isToggle = ref.type === 'toggleButton';
      componentType = isToggle ? 'toggleButton' : 'presetButton';
      component = {
        type: componentType,
        dataElement,
        ...(isToggle
          ? { toggleElement: ref.toggleElement || 'MainMenuFlyout' }
          : { buttonType: ref.buttonType }),
        label: form.label || undefined,
        title: form.title || undefined,
        img: form.icon || undefined,
      };
    } else if (kind === 'panel') {
      componentType = 'toggleButton';
      component = {
        type: 'toggleButton',
        dataElement,
        toggleElement: ref.id,
        element: ref.id,
        label: form.label || undefined,
        title: form.title || undefined,
        img: form.icon || undefined,
      };
    } else if (ref.type === 'viewControls') {
      componentType = 'viewControls';
      component = {
        type: 'viewControls',
        dataElement,
        title: 'View Controls',
        icon: 'icon-header-page-manipulation-line',
      };
    } else if (ref.type === 'label') {
      if (!form.label.trim()) {
        alert('Label text is required.');
        return;
      }
      componentType = 'label';
      component = {
        type: 'label',
        dataElement,
        label: form.label.trim(),
        title: form.title.trim() || undefined,
      };
    } else if (kind === 'popup') {
      componentType = 'popupAction';
      component = {
        type: 'popupAction',
        dataElement,
        label: form.label || ref.label,
        title: form.title || form.label || ref.label,
      };
    } else {
      componentType = ref.type;
      component = { type: ref.type, dataElement };
    }

    onAddComponent({ target, componentType, component });
    setAddedMsg(
      `✓ Added ${selectedItem.name} (${dataElement}) to ${describeTarget(target)}`,
    );
  };

  // ---- Render helpers ------------------------------------------------------
  const isContainer = selectedItem?.kind === 'container';
  const containerType = isContainer ? selectedItem.containerType : null;

  const showLabelField = ['tool', 'preset', 'panel', 'popup'].includes(
    selectedItem?.kind,
  );
  const isTextLabel = selectedItem?.ref?.type === 'label';
  const showIconField = showLabelField;

  const headerSelect = (
    <select
      value={selectedHeader}
      onChange={(e) => handleHeaderChange(e.target.value)}
      className="form-select"
    >
      {headerOptions.map((h) => (
        <option key={h} value={h}>
          {h}
        </option>
      ))}
    </select>
  );

  const submitLabel = isContainer
    ? {
        header: 'Create Modular Header',
        ribbonTab: 'Create RibbonItem',
        flyout: 'Create Flyout Menu',
        tabPanel: 'Create Tab Panel',
      }[containerType]
    : 'Add Component';

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-catalog">
        {/* Modal Top Header */}
        <div className="modal-header-row">
          <h3 className="modal-title">Add Component to WebViewer</h3>
          <button
            type="button"
            className="modal-close-icon"
            onClick={onClose}
            title="Close dialog"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="catalog-form">
          {/* Target destination (not needed when creating containers) */}
          {!isContainer && (
            <div className="catalog-dest-bar">
              <span className="catalog-dest-label">Add to:</span>
              {!isFlyoutTarget && !isPopupTarget && headerSelect}
              {!isFlyoutTarget && !isPopupTarget && (
                <span className="catalog-dest-arrow">➔</span>
              )}
              <select
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                className="form-select"
              >
                <optgroup label="Header">
                  <option value="header">Header Items</option>
                </optgroup>
                {currentRibbonTabs.length > 0 && (
                  <optgroup label="Ribbon Tabs">
                    {currentRibbonTabs.map((t) => (
                      <option key={t.key} value={`ribbon:${t.key}`}>
                        Ribbon: {t.label || t.key}
                      </option>
                    ))}
                  </optgroup>
                )}
                {hasFlyouts && (
                  <optgroup label="Flyouts">
                    {Object.keys(flyouts).map((id) => (
                      <option key={id} value={`flyout:${id}`}>
                        Flyout: {id} ({(flyouts[id]?.items || []).length})
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="Popups">
                  {POPUPS_CATALOG.map((p) => {
                    const count = (
                      popups && Array.isArray(popups[p.id])
                        ? popups[p.id]
                        : DEFAULT_POPUPS[p.id] || []
                    ).length;
                    return (
                      <option key={p.id} value={`popup:${p.id}`}>
                        Popup: {p.name} ({count})
                      </option>
                    );
                  })}
                </optgroup>
              </select>
            </div>
          )}

          <div className="catalog-body">
            {/* Left: search + list */}
            <div className="catalog-left">
              <input
                ref={searchRef}
                type="text"
                className="form-input catalog-search"
                placeholder='Search components (e.g. "highlight", "undo", "header")...'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                autoFocus
              />
              <div className="catalog-pills">
                {CATEGORY_PILLS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`catalog-pill ${category === p.id ? 'active' : ''}`}
                    onClick={() => handleCategoryClick(p.id)}
                  >
                    {p.label} ({categoryCount(p.id)})
                  </button>
                ))}
              </div>

              <div className="catalog-list" ref={listRef}>
                {filteredItems.length === 0 && (
                  <p className="empty-hint">No components match "{search}".</p>
                )}
                {filteredItems.map((item) => {
                  const blocked = isItemBlocked(item);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`catalog-row ${selectedItemId === item.id ? 'active' : ''}`}
                      onClick={() => setSelectedItemId(item.id)}
                      disabled={blocked}
                      title={blocked ? getBlockedTooltip(item) : undefined}
                    >
                      <span className="catalog-row-name">{item.name}</span>
                      <span className="catalog-row-sub">{item.sub}</span>
                      <span className={`catalog-badge badge-${item.kind}`}>
                        {KIND_BADGE[item.kind]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: properties / container form */}
            <div className="catalog-right">
              {selectedItem && !isContainer && (
                <div className="catalog-props">
                  <div className="catalog-props-title">
                    {selectedItem.name}
                    <span
                      className={`catalog-badge badge-${selectedItem.kind}`}
                    >
                      {KIND_BADGE[selectedItem.kind]}
                    </span>
                  </div>

                  {selectedItem.kind === 'tool' && isFlyoutTarget && (
                    <div className="import-warnings" role="note">
                      <strong>Requires functionMap in code:</strong> WebViewer
                      rejects <code>toolButton</code> inside flyouts. This tool
                      will be added as a <code>customButton</code> (
                      <code>
                        onClick: &quot;{TOOL_ACTION_PREFIX}
                        {selectedItem.ref.toolName}&quot;
                      </code>
                      ), which requires passing a <code>functionMap</code> to{' '}
                      <code>
                        UI.importModularComponents(config, functionMap)
                      </code>
                      .
                    </div>
                  )}

                  {selectedItem.requirement && (
                    <div className="panel-requirement-box">
                      <span className="requirement-tag">Specialized Panel</span>
                      <p className="requirement-desc">
                        {selectedItem.requirement}
                      </p>
                    </div>
                  )}

                  {selectedItem.kind === 'popup' && (
                    <div
                      className="panel-requirement-box"
                      style={{
                        background: '#fdf2f8',
                        borderColor: '#fbcfe8',
                      }}
                    >
                      <span
                        className="requirement-tag"
                        style={{ background: '#db2777' }}
                      >
                        Built-in Popup Action
                      </span>
                      <p
                        className="requirement-desc"
                        style={{ color: '#831843' }}
                      >
                        {selectedItem.ref.context
                          ? `Context: ${selectedItem.ref.context}`
                          : 'Core popup action'}
                      </p>
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">
                      Data Element ID <span className="required-star">*</span>
                    </label>
                    <input
                      value={form.dataElement}
                      onChange={setField('dataElement')}
                      className="form-input monospace"
                      required
                    />
                  </div>

                  {(showLabelField || isTextLabel) && (
                    <div className="form-group">
                      <label className="form-label">
                        {isTextLabel ? 'Label Text' : 'Button Label (optional)'}
                        {isTextLabel && (
                          <span className="required-star"> *</span>
                        )}
                      </label>
                      <input
                        value={form.label}
                        onChange={setField('label')}
                        placeholder={isTextLabel ? 'e.g. Tools' : undefined}
                        className="form-input"
                        required={isTextLabel}
                      />
                    </div>
                  )}

                  {(showLabelField || isTextLabel) && (
                    <div className="form-group">
                      <label className="form-label">
                        Hover Tooltip (optional)
                      </label>
                      <input
                        value={form.title}
                        onChange={setField('title')}
                        className="form-input"
                      />
                    </div>
                  )}

                  {showIconField && (
                    <div className="form-group">
                      <label className="form-label">Icon Class</label>
                      <input
                        value={form.icon}
                        onChange={setField('icon')}
                        className="form-input monospace"
                      />
                    </div>
                  )}

                  {!showLabelField && !isTextLabel && (
                    <p className="field-hint">{selectedItem.sub}</p>
                  )}
                </div>
              )}

              {isContainer && containerType === 'header' && (
                <div className="catalog-props">
                  <p className="tab-description">
                    Create a new <strong>Modular Header</strong> bar. Add items
                    to it afterwards from the catalog.
                  </p>
                  <div className="form-group">
                    <label className="form-label">
                      Header ID (dataElement){' '}
                      <span className="required-star">*</span>
                    </label>
                    <input
                      value={newHeaderId}
                      onChange={(e) => setNewHeaderId(e.target.value)}
                      placeholder="e.g. my-bottom-header"
                      className="form-input monospace"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Placement on Screen</label>
                    <div className="radio-group-inline">
                      {['top', 'bottom', 'left', 'right'].map((p) => (
                        <label key={p}>
                          <input
                            type="radio"
                            name="newHeaderPlacement"
                            value={p}
                            checked={newHeaderPlacement === p}
                            onChange={() => setNewHeaderPlacement(p)}
                          />{' '}
                          {p.charAt(0).toUpperCase() + p.slice(1)}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {isContainer && containerType === 'ribbonTab' && (
                <div className="catalog-props">
                  <p className="tab-description">
                    Create a <strong>RibbonItem</strong> tab inside the
                    destination header&apos;s <strong>RibbonGroup</strong> (e.g.{' '}
                    <em>&quot;Review&quot;</em>, <em>&quot;Forms&quot;</em>).
                    Then target it to add tools.
                  </p>
                  <div className="form-group">
                    <label className="form-label">Destination Header</label>
                    {headerSelect}
                  </div>
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
                          const clean = val.trim().replace(/[^a-zA-Z0-9]/g, '');
                          const camel = clean
                            ? clean.charAt(0).toLowerCase() + clean.slice(1)
                            : '';
                          setNewTabGroupId(camel ? `${camel}RibbonItem` : '');
                        }
                      }}
                      placeholder="e.g. Review, Annotate, Forms"
                      className="form-input"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      RibbonItem ID (dataElement){' '}
                      <span className="required-star">*</span>
                    </label>
                    <input
                      value={newTabGroupId}
                      onChange={(e) => {
                        setNewTabGroupId(e.target.value);
                        setIsGroupIdCustomized(true);
                      }}
                      placeholder="e.g. reviewRibbonItem"
                      className="form-input monospace"
                      required
                    />
                  </div>
                </div>
              )}

              {isContainer && containerType === 'flyout' && (
                <div className="catalog-props">
                  <p className="tab-description">
                    Create a custom <strong>Flyout Menu</strong>. A toggle
                    button is added to the destination header; then choose the
                    flyout as the target to fill it.
                  </p>
                  <div className="form-group">
                    <label className="form-label">
                      Flyout ID (dataElement){' '}
                      <span className="required-star">*</span>
                    </label>
                    <input
                      value={newFlyoutId}
                      onChange={(e) => setNewFlyoutId(e.target.value)}
                      className="form-input monospace"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      Destination for Toggle Button
                    </label>
                    <select
                      className="form-select"
                      value={flyoutToggleTarget}
                      onChange={(e) => setFlyoutToggleTarget(e.target.value)}
                    >
                      <optgroup label="Header">
                        <option value="header">
                          Header ({selectedHeader})
                        </option>
                      </optgroup>
                      <optgroup label="Popups">
                        {POPUPS_CATALOG.map((p) => (
                          <option key={p.id} value={`popup:${p.id}`}>
                            Popup: {p.name}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Toggle Button Label</label>
                    <input
                      value={newFlyoutToggleLabel}
                      onChange={(e) => setNewFlyoutToggleLabel(e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      Hover Tooltip (optional)
                    </label>
                    <input
                      value={newFlyoutToggleTitle}
                      onChange={(e) => setNewFlyoutToggleTitle(e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Toggle Button Icon</label>
                    <input
                      value={newFlyoutToggleIcon}
                      onChange={(e) => setNewFlyoutToggleIcon(e.target.value)}
                      placeholder="e.g. icon-tools-more, ic-hamburger-menu"
                      className="form-input monospace"
                    />
                  </div>
                </div>
              )}

              {isContainer && containerType === 'tabPanel' && (
                <div className="catalog-props">
                  <p className="tab-description">
                    Create a multi-tab sidebar (<strong>TabPanel</strong>)
                    docked left or right, with a toggle button in the
                    destination header.
                  </p>
                  <div className="form-group">
                    <label className="form-label">
                      Container ID (dataElement){' '}
                      <span className="required-star">*</span>
                    </label>
                    <input
                      className="form-input monospace"
                      value={tabPanelId}
                      onChange={(e) => setTabPanelId(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Dock Location</label>
                    <div className="radio-group-inline">
                      {['left', 'right'].map((side) => (
                        <label key={side}>
                          <input
                            type="radio"
                            name="tabPanelLocation"
                            value={side}
                            checked={tabPanelLocation === side}
                            onChange={() => setTabPanelLocation(side)}
                          />{' '}
                          {side === 'left' ? 'Left Side' : 'Right Side'}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      Destination Header for Toggle Button
                    </label>
                    {headerSelect}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Toggle Button Label</label>
                    <input
                      className="form-input"
                      value={toggleButtonLabel}
                      onChange={(e) => setToggleButtonLabel(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <div className="catalog-props-split">
                      <label className="form-label font-bold">
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
            </div>
          </div>

          {/* Footer */}
          <div className="catalog-footer">
            <span className="catalog-added-banner">{addedMsg}</span>
            <div className="button-group">
              <button type="button" onClick={onClose} className="cancel-button">
                Close
              </button>
              <button type="submit" className="submit-button">
                {submitLabel}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
