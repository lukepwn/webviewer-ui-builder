1. inconsistent naming api vs json schema

For tools: class ToolButton → schema toolButton
For custom buttons: class CustomButton → schema customButton
For toggle buttons: class ToggleElementButton → schema toggleButton (drops "Element")

2. adding a label to a tool no longer shows it's selected/active
3. UI.importModularComponents strictly validates panels against a hardcoded whitelist of panel renderers and aborts the entire import if any non-panel key exists in `panels`, requiring a sanitizer guardrail to filter non-panel renderers.

4. Notably, `validateFlyouts` omits `toolButton` from its whitelist (only allowing presetButton/customButton/statefulButton/toggleButton) even though the Flyout renderer supports it. Guardrail/workaround: `prepareConfigForImport` and `buildFunctionMap` in `src/sdk/importConfig.js` convert flyout toolButtons into `customButton` items wired to `onClick: 'activateTool:<toolName>'` via the functionMap, and filter out unsupported types before import.

5. A toggle item inside a flyout that targets another flyout crashes Flyout.js ("reading 'filter'") when clicked; targeting a panel works. Guardrail: such items are dropped from flyouts. Use submenu `children` for nesting.

6. Submenu `children` round trip: import needs inline objects but exportModularComponents returns component keys, and re-importing the keys wipes `children` to []. Guardrail: `prepareConfigForImport` (submenu step) inlines the keys before every import.

7. Toggle buttons with a nonexistent target import fine and `isElementOpen` returns true for it; flyouts/panels are identified by object key (inner `dataElement` ignored); a `tabPanel` without `panelsList` crashes on render. Guardrails: warn on dead targets, force key === dataElement, default `panelsList` to [].

8. Programmatic JS vs JSON export quirks: (a) `UI.exportModularComponents()` strips `ToolButton`, `Zoom`, `PageControls`, and `GroupedItems` from flyouts even if added via `new UI.Components.Flyout`, and writes `null` into `flyout.items` if a `StatefulButton` lacks a `dataElement` (which then crashes `validateFlyouts` on re-import); (b) `validateFlyouts` rejects a component with `type: 'divider'` but allows the literal string `'divider'` in `flyout.items`; (c) exported panels use `location: 'start' | 'end'` alongside `'left' | 'right'`; (d) exporting `new UI.Components.*` instances inside flyouts leaks an internal Redux `store` object (`{ dispatch: "", subscribe: "", ... }`), empty `onClick: ""` on `presetButton`s, and `icon` instead of `img`; (e) Apryse docs use singular `thumbnailPanel` / `bookmarkPanel` in `tabPanel.panelsList` examples while `validatePanels` requires plural `thumbnailsPanel` / `bookmarksPanel` and requires every `panelsList` entry to also exist as a top-level entry in `panels`. Guardrails in `prepareConfigForImport` handle all of these.

9. WebViewer Modular UI popup item specification: In Apryse Modular UI (see `customizing-popup` and `ui-import-and-export#modular-ui-configuration-structure`), custom popup items are defined self-contained inline inside `config.popups[popupKey]` (with `dataElement`, `type`, `toolName`, `title`, `img`, etc.) rather than referencing keys in `modularComponents`. Popups are not referential containers. Items added to popups live directly inside `config.popups`, not in `modularComponents`, avoiding duplicate entries. For backward compatibility with configs that only provided `{ dataElement }`, `prepareConfigForImport` in `src/sdk/importConfig.js` also hydrates from `modularComponents` if found.

10. In WebViewer Modular UI, `modularComponents` is a dictionary keyed by `dataElement`. Duplicate buttons that perform the same function (e.g. two Pan buttons sharing `toolName: 'Pan'`) must have unique `dataElement`s (e.g. `panButton` and `panButton2`), otherwise the second component definition overwrites the first in `modularComponents`. Guardrail: `AddComponentModal` auto-suggests unique numeric suffixes, blocks duplicate submissions with inline warnings, and `handleAddComponent` auto-disambiguates keys to prevent accidental state overwrites.

### WebViewer SDK Limitation: Left/Right Headers Only Support 1 Full-Length Header

- **SDK Issue**: WebViewer hardcodes `[floatList, fullList[0]]` for left and right headers (`DH` and `JH` layout components in `webviewer-ui.min.js`), logging: `Left headers only support one full length header but 2 were added. Only the first one will be rendered.` Any second full-length left or right header (such as a companion `tools-header`) is dropped and never mounted into the DOM.
- **Workaround & Guardrail in UI Builder**:
  1. Guardrail: In `ToolButtonsCategorized.jsx` and `HeaderManager.jsx`, disable setting `tools-header` placement to `left` when host header is `left` (and `right` when host is `right`), with a warning hint.
  2. Workaround: For Left/Right vertical ribbon headers, use **Inline (1 Single Bar)** layout so both ribbon tabs and active tool groups reside on the same single vertical header bar. Alternatively, cross-place the companion `tools-header` at `top` or `bottom`.

## SDK Design Quirk: Mandatory `viewControlsFlyout` Re-creation in `importModularComponents`

- **Issue**: In `webviewer-ui.min.js`, `UI.importModularComponents` explicitly checks `u.getFlyout(state, 'viewControlsFlyout') || t.dispatch(G.addFlyout(MI['viewControlsFlyout']))`. If `viewControlsFlyout` is omitted or deleted (`flyouts: {}`), the SDK forcefully revives it with 15 default preset buttons. Having other custom flyouts defined does NOT prevent this because the check looks strictly for the ID `'viewControlsFlyout'`.
- **Workaround / Guardrail**:
  1. `DEFAULT_BLANK_CONFIG` explicitly sets `flyouts: { viewControlsFlyout: { dataElement: 'viewControlsFlyout', items: [] } }`. WebViewer sees the key is defined and skips injecting its default items.
  2. Attempting to delete `viewControlsFlyout` in the Flyout Manager clears its items to `[]` instead of deleting the key, keeping it suppressed without triggering the SDK's default injection.

## SDK Design Quirk: Implicit Side-Panel Tools & Stamp vs. Rubber Stamp Naming

- **Issue**:
  1. WebViewer differentiates between `AnnotationCreateStamp` (which is the Image/Custom Stamp tool, default ID `stampToolButton`, icon `icon-tool-image-line`, prompting to upload an image) and `AnnotationCreateRubberStamp` (which is the Rubber Stamp tool, default ID `rubberStampToolButton`, icon `icon-tool-stamp-line`, opening the standard stamps panel). Cataloging `AnnotationCreateStamp` as "Rubber Stamp" caused users to get an insert-image tool on their toolbar instead of the stamp panel.
  2. Tools like `AnnotationCreateRubberStamp`, `AnnotationCreateSignature`, and `AnnotationCreateFileAttachment` are `type: 'toolButton'`, but WebViewer automatically triggers `openElements([associatedPanel])` on activation without requiring a `toggleButton`. Because they are not explicit toggles, they lacked panel docking controls and defaulted to Left dock.
- **Workaround / Guardrail**:
  1. Updated `TOOLS_CATALOG` to cleanly separate `AnnotationCreateRubberStamp` (`rubberStampToolButton`, Rubber Stamp) from `AnnotationCreateStamp` (`stampToolButton`, Image Stamp).
  2. Created `TOOL_TO_PANEL_MAP` and `resolvePanelTarget` helper so tool buttons that implicitly launch side panels get the inline `[Left | Right]` dock toggle directly on their item pill and dock radio during creation modal, auto-registering their target panel in `config.panels[panelId].location`.
