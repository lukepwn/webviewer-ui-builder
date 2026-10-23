1. inconsistent naming api vs json schema

For tools: class ToolButton → schema toolButton
For custom buttons: class CustomButton → schema customButton
For toggle buttons: class ToggleElementButton → schema toggleButton (drops "Element")

2. adding a label to a tool no longer shows it's selected/active
3. UI.importModularComponents strictly validates panels against a hardcoded whitelist of panel renderers and aborts the entire import if any non-panel key exists in `panels`, requiring a sanitizer guardrail to filter non-panel renderers.

4. UI.importModularComponents validates asynchronously and aborts the whole import on one bad item (flyout item type, unknown component type). The failure surfaces only as an unhandled rejection, so the old UI silently stays; try/catch cannot catch it. Notably, `validateFlyouts` omits `toolButton` from its whitelist (only allowing presetButton/customButton/statefulButton/toggleButton) even though the Flyout renderer supports it. Guardrail/workaround: `prepareConfigForImport` and `buildFunctionMap` in `src/sdk/importConfig.js` convert flyout toolButtons into `customButton` items wired to `onClick: 'activateTool:<toolName>'` via the functionMap, and filter out unsupported types before import.

5. A toggle item inside a flyout that targets another flyout crashes Flyout.js ("reading 'filter'") when clicked; targeting a panel works. Guardrail: such items are dropped from flyouts. Use submenu `children` for nesting.

6. Submenu `children` round trip: import needs inline objects but exportModularComponents returns component keys, and re-importing the keys wipes `children` to []. Guardrail: `prepareConfigForImport` (submenu step) inlines the keys before every import.

7. Toggle buttons with a nonexistent target import fine and `isElementOpen` returns true for it; flyouts/panels are identified by object key (inner `dataElement` ignored); a `tabPanel` without `panelsList` crashes on render. Guardrails: warn on dead targets, force key === dataElement, default `panelsList` to [].

8. Programmatic JS vs JSON export quirks: (a) `UI.exportModularComponents()` strips `ToolButton`, `Zoom`, `PageControls`, and `GroupedItems` from flyouts even if added via `new UI.Components.Flyout`, and writes `null` into `flyout.items` if a `StatefulButton` lacks a `dataElement` (which then crashes `validateFlyouts` on re-import); (b) `validateFlyouts` rejects a component with `type: 'divider'` but allows the literal string `'divider'` in `flyout.items`; (c) exported panels use `location: 'start' | 'end'` alongside `'left' | 'right'`; (d) exporting `new UI.Components.*` instances inside flyouts leaks an internal Redux `store` object (`{ dispatch: "", subscribe: "", ... }`), empty `onClick: ""` on `presetButton`s, and `icon` instead of `img`; (e) Apryse docs use singular `thumbnailPanel` / `bookmarkPanel` in `tabPanel.panelsList` examples while `validatePanels` requires plural `thumbnailsPanel` / `bookmarksPanel` and requires every `panelsList` entry to also exist as a top-level entry in `panels`. Guardrails in `prepareConfigForImport` handle all of these.
