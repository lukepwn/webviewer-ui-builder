# Agent Instructions & Guidelines (`GEMINI.md`)

This file is automatically loaded by the AI assistant at the start of every chat session. You can review and update this file anytime to adjust how the assistant works with you.

---

## 1. Interaction & Workflow Preferences

- **Communication Style**: Direct, concise, and focused on practical solutions.
- **Code Changes**: Always preserve existing comments and structure unless refactoring is requested.
- **Safety**: Do not delete or overwrite files without explicit intent or confirmation.

---

## 2. Project Overview & Context

- **Project**: WebViewer UI Builder (`webviewer-ui-builder`)
- **Location**: Root directory (`./`) contains the React + Vite application.
- **Purpose**: Interactive UI builder using WebViewer (Apryse / PDFTron) Modular UI components to design and customize UI templates.
- **Key Concepts**:
  - Modular UI ribbon groups, headers, tool buttons, custom buttons, and panels.
  - JSON schema definitions for WebViewer UI configurations.
  - everything should be modular, so even if duplicatee buttons can be added to the header, that should be allowed.

---

## 3. Code Standards & Known Conventions

- **Component Hygiene**: Keep JSX clean, avoid excessive wrapper `div` nesting where fragments or flex/grid containers suffice.

---

## 5. Custom User Notes & Instructions

- stop using bugs.md or TODO.md as context. these are my personal files.
- if there's an sdk flaw design that you had to create a guardrail or specific workaround for, add a quick summary to bugs.md about it
- don't update changelog.md - this is my personal file
