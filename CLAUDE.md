# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun run build        # type-check + lint + build to dist/
bun run dev          # watch mode (no type-check/lint)
bun run type:check   # tsc --noEmit only
bun run lint         # eslint only
bun run lint:fix     # eslint with auto-fix
```

No tests exist in this project.

To load the extension in Chrome: open `chrome://extensions`, enable Developer mode, click "Load unpacked", and select the `dist/` folder.

## Architecture

This is a Manifest V3 Chrome extension with two independent scripts built from `src/` into `dist/`:

**content.ts** — injected into every page. Owns the keyboard event pipeline: reads hotkey→action mappings from `maps.csv` (parsed at build time into a JS array by a Vite plugin), resolves n-character chord sequences (e.g. `g`, `gg`, `ymv`, `oml`), and dispatches to action handlers. Tab-related actions are forwarded to the background via `chrome.runtime.sendMessage`. In-page actions (scroll, hints, hover, help, prompt) are handled directly.

**background.ts** — service worker. Receives messages from content and executes them using `chrome.tabs` / `chrome.sessions` / `chrome.downloads` APIs. Message types: `openTab`, `navigateTo`, `downloadImage`, plus the standard tab management types in `knownTypes`.

**Hotkey system** — `maps.csv` is the single source of truth for all keybindings. Columns: `hotkey`, `action`, `description`. Hotkeys support:
- Single keys: `f`, `G`, `x`
- N-char chords: `gg`, `yv`, `ymv`, `oml` (prefix keys are auto-detected at build time)
- Alt combos: `A-h` prefix notation (e.g. `A-h` = Alt+H)

Adding a new action requires: a new row in `maps.csv`, a new entry in the `Action` union type in `content.ts`, and a handler in the `actions` record. For background actions, also handle the message type in `background.ts`.

**Hints system** (`hints.ts`) — activated by various keys. Overlays labeled `<div>` nodes at viewport coordinates. Labels use home-row chars (`sadfjklewcmpgh`), single-char for ≤14 elements, two-char pairs beyond that. `typeHint` filters visible hints on each keypress; `endHints` removes the container.

Hint modes:
- `f` — follow link (click) in current tab
- `F` — follow link in new tab
- `y` — copy element `innerText` to clipboard
- `yl` — copy link `href` to clipboard
- `yi` — copy input/textarea value (or placeholder if empty)
- `ym` — multi-select copy: accumulate text from multiple elements, Enter to copy all joined by `\n`
- `om` — multi-select open: open each selected link in background tab (no focus switch)
- `h` — hover element: activates CSS `:hover` via stylesheet rewriting + dispatches JS mouse events up ancestor chain
- `di` — download image via `chrome.downloads`
- `ci` — copy image to clipboard as PNG blob (canvas approach for cross-origin)
- `oi` — open image src in new tab

**Hover system** (`hints.ts`) — `A-h` activates hover mode. Two-pronged approach:
1. CSS injection: reads all page stylesheets, rewrites `:hover` → `[data-bs-hover]`, injects as `<style>` tag, adds `data-bs-hover` attribute to target and ancestors. Handles CSS `:hover` effects (e.g. WordPress row-actions).
2. JS events: dispatches `mouseenter` (non-bubbling) on each ancestor from root to target, then `mouseover` + `mousemove` on target. Handles JS event listener-based hover effects (e.g. Vue `@mouseenter`).
Escape calls `unhoverLast()` which reverses both.

**Help popup** (`help.ts` / `help.css`) — `?` opens a centered modal listing all hotkeys from `maps.csv` in a 2-column grid. Escape / click backdrop / `×` closes it.

**Prompt** (`prompt.ts` / `prompt.css`) — reusable inline input popup. `showPrompt(label, initialValue, onConfirm)`. Used by `eu` (edit URL → current tab) and `eU` (edit URL → new tab). Enter confirms, Escape cancels.

**Scroll** (`scroll.ts`) — physics-based: constant velocity while key held, linear deceleration after keyup via `requestAnimationFrame`. `scrollToTop`/`scrollToBottom` cancel any in-flight animation before calling `window.scrollTo`.

**Build** — Vite handles `content.ts` (IIFE, with CSS inlined). Background is built separately via an esbuild call in the `closeBundle` Vite plugin hook (Vite's Rollup pipeline can't produce a Manifest V3-compatible service worker directly). `manifest.json` is copied as-is.

## Source files

| File | Purpose |
|------|---------|
| `content.ts` | Keyboard pipeline, action dispatch |
| `background.ts` | Tab/download/navigation API calls |
| `hints.ts` | All hint modes + hover logic |
| `hints.css` | Hint overlay styles |
| `scroll.ts` | Physics scroll |
| `toast.ts` | Toast notifications |
| `help.ts` | Keyboard shortcuts popup |
| `help.css` | Help popup styles |
| `prompt.ts` | Reusable input prompt popup |
| `prompt.css` | Prompt styles |
| `maps.csv` | All keybindings (single source of truth) |
| `maps.d.ts` | TypeScript type for CSV import |
