# WebViewer Modular UI: Edge Cases, Quirks & Workarounds

A concise reference guide detailing WebViewer's Modular UI component behaviors, architectural requirements, and SDK edge cases discovered during implementation.

---

## 1. Ribbon Architecture & Component Quad-Coupling

* **4-Way Component Coupling**: Creating a single Ribbon Tab is not an isolated component; WebViewer requires four interdependent structures wired together:
  1. **RibbonGroup (`ribbonGroup`)**: Resides in a top-level modular header to host the ribbon tabs.
  2. **RibbonItem (`ribbonItem`)**: The tab button itself inside the RibbonGroup, with its `toolbarGroup` property set to its ID.
  3. **GroupedItems (`groupedItems`)**: A standalone container component that holds the actual action and tool buttons for that tab.
  4. **Tools Header (`tools-header`)**: A secondary top modular header that MUST host the `groupedItems` container key. If `tools-header` is missing, the tools will never render when the ribbon tab is clicked.

* **Cascading Deletions**:
  * Deleting a Ribbon Tab must cascade: delete its associated `groupedItems` container, remove references from `tools-header`, and remove the tab from its parent `ribbonGroup`.
  * If a `ribbonGroup` or `tools-header` becomes empty after tab deletion, it must be automatically pruned to avoid rendering empty UI bars.
  * Deleting a `ribbonGroup` must cascade-delete all child RibbonTabs and their underlying `groupedItems`.

* **Active Tab Switching API Discrepancy**:
  * Depending on the WebViewer version, setting the active ribbon tab uses `setActiveRibbonItem(tabKey)` or `setToolbarGroup(tabKey)`. The implementation must probe for `setActiveRibbonItem` first and fall back to `setToolbarGroup`.

---

## 2. Flyout Menus & Rejection Traps

* **Strict Component Type Whitelist**:
  * Flyouts only accept: `presetButton`, `customButton`, `statefulButton`, and `toggleButton`.
  * Placing structural components (`ribbonGroup`, `groupedItems`, `headers`, `panels`) or component definitions of type `toolButton`, `divider`, or `label` causes the SDK to silently abort or reject the entire configuration import.

* **`toolButton` Rejection in Flyouts**:
  * WebViewer rejects standard `toolButton` components inside flyouts.
  * **Workaround**: Tool buttons inside flyouts must be transformed into `customButton` instances with an `onClick` action pointing to an activation handler, resolved via WebViewer's `functionMap` to switch tool mode programmatically.

* **Literal `'divider'` String Token vs Component Object**:
  * WebViewer accepts the literal string token `'divider'` inside a flyout's items array.
  * WebViewer rejects a component object `{ type: 'divider' }` inside a flyout.

* **Nested Flyout Crash (`Flyout.js`)**:
  * Placing a `toggleButton` inside a flyout that targets another flyout crashes WebViewer's internal `Flyout.js` (`filter` on undefined).
  * **Workaround**: Nested flyouts are forbidden; hierarchical navigation inside a flyout must be built using submenus (`children` property) instead.

* **Submenu `children` Serialization Mismatch**:
  * `importModularComponents` requires submenu `children` to be inline component objects.
  * `exportModularComponents` exports submenu children as component ID strings.
  * Re-importing a raw exported configuration wipes submenu `children` to empty arrays.
  * **Workaround**: Component key strings in `children` must be recursively expanded into full inline component definitions before importing.

---

## 3. Side Panels & TabPanels

* **`tabPanel` Crash Without `panelsList`**:
  * Defining a `tabPanel` without the `panelsList` property crashes WebViewer upon rendering.
  * Even an empty tab panel container must explicitly provide `panelsList: []`.

* **Sub-Panel Registration Prerequisite**:
  * Every sub-panel referenced inside a `tabPanel`'s `panelsList` must also be explicitly declared in the root `panels` configuration object. If missing, WebViewer cannot resolve the renderer.

* **Panel Renderer Whitelist & Name Aliases**:
  * WebViewer's internal panel validator enforces a strict whitelist of known renderer names. Unrecognized render names abort the import unless declared as custom functions in `functionMap`.
  * Documentation snippets frequently use singular names that WebViewer rejects:
    * `outlinePanel` must be normalized to `outlinesPanel`.
    * `thumbnailPanel` must be normalized to `thumbnailsPanel`.
    * `bookmarkPanel` must be normalized to `bookmarksPanel`.

* **Panels Cannot Host Buttons Directly**:
  * Panels are render-only components and cannot host modular buttons or tool lists.
  * **Workaround**: To create a vertical "side tab" or action strip, a left-positioned header (`placement: 'left'`) with toggle buttons must be used instead.

* **Panel Auto-Registration for Toggle Buttons**:
  * Adding a toggle button pointing to a built-in panel requires automatically ensuring that panel is present in the `panels` configuration object; otherwise, clicking the toggle is a dead action.

---

## 4. Headers & Layout Rules

* **Placement Restrictions**:
  * Modular headers only accept four placements: `top`, `bottom`, `left`, and `right`. Any invalid placement must default to `top`.

* **Clashing Header Names**:
  * Headers named `view` or `toolbargroup-view` conflict with WebViewer's internal view toolbar groups and must be filtered out or renamed to prevent collision.

* **Divider Handling**:
  * Unlike standard components that require defined component objects, headers accept literal `'divider'` string tokens directly in their `items` arrays.

---

## 5. SDK Export Sanitization & Leaks

* **Redux Store Object Leak**:
  * Exporting components from a live viewer instance can leak internal Redux `store` objects into the component JSON. These must be stripped before re-importing to prevent invalid payload errors.

* **Leaked Empty `onClick` on Preset Buttons**:
  * Preset buttons exported from flyouts frequently leak `onClick: ""` strings, which override and break built-in preset button actions. Empty `onClick` properties must be deleted.

* **Button Property Normalization (`icon` vs `img`)**:
  * WebViewer modular components use `img` to specify icon glyphs, but documentation and templates frequently use `icon`. If `icon` is provided without `img`, it must be normalized to `img`.

* **Component Type Normalization**:
  * `toggleElementButton` must be normalized to `toggleButton`, ensuring reciprocal synchronization between `element` and `toggleElement`.
  * Generic `button` must be normalized to `customButton`.
  * `mainMenu` or `menuButton` components must be normalized to `toggleButton` targeting `MainMenuFlyout` with the hamburger menu icon.

* **Mandatory RibbonItem Schema Fields**:
  * A `ribbonItem` definition must always supply `groupedItems: []`, `items: []`, `title`, and `toolbarGroup`, otherwise internal selectors throw.

---

## 6. Popups Configuration (v11.8+)

* **Data Structure Requirements**:
  * Popups must be provided as a top-level `popups` object containing arrays of `{ dataElement: string }` objects for `annotationPopup`, `textPopup`, and `contextMenuPopup`. Any other shape causes import failures.

* **Omission vs. Empty Array Semantics**:
  * **Omitted key**: WebViewer displays its built-in default item list for that popup.
  * **Empty array `[]`**: WebViewer explicitly disables that popup.
  * **Custom list**: WebViewer renders only the specified items.

---

## 7. Multi-Instance & Duplicate Item Handling

* **Allowing Duplicates in Headers & Menus**:
  * Modular UI allows identical components or multiple dividers in the same header or flyout.
  * **State Disambiguation**: Handlers cannot rely on component ID alone when reordering or deleting items. The implementation must track occurrence indices (`nthIndexOf`) so operations target the intended instance without mutating duplicates.

---

## 8. Function Map Lifecycle Contract

* **Synchronous Callback Requirement**:
  * Any `customButton` click handler, tool activation from a flyout (`activateTool:<name>`), or custom panel renderer cannot be represented in static JSON alone.
  * They must be supplied via a secondary `functionMap` dictionary passed alongside the config: `UI.importModularComponents(config, functionMap)`.
