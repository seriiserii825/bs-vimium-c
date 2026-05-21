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

**content.ts** — injected into every page. Owns the keyboard event pipeline: reads hotkey→action mappings from `maps.csv` (parsed at build time into a JS array by a Vite plugin), resolves single-key and two-key chord sequences, and dispatches to action handlers. Tab-related actions are forwarded to the background via `chrome.runtime.sendMessage`. In-page actions (scroll, hints) are handled directly.

**background.ts** — service worker. Receives tab management messages from content and executes them using `chrome.tabs` / `chrome.sessions` APIs, which content scripts cannot call.

**Hotkey system** — `maps.csv` is the single source of truth for all keybindings. Adding a new action requires: a new row in `maps.csv`, a new entry in the `Action` union type in `content.ts`, and a handler in the `actions` record. For tab actions, also add the message type string to `knownTypes` in `background.ts`.

**Hints system** (`hints.ts`) — activated by `f`, `F`, or `y`. Overlays labeled `<div>` nodes at viewport coordinates over clickable or copyable elements. Labels use home-row chars (`sadfjklewcmpgh`), single-char for ≤14 elements, two-char pairs beyond that. `typeHint` filters visible hints on each keypress; `endHints` removes the container. The `y` mode copies element `innerText` to clipboard and shows a toast via `toast.ts`.

**Scroll** (`scroll.ts`) — physics-based: constant velocity while key held, linear deceleration after keyup via `requestAnimationFrame`. `scrollToTop`/`scrollToBottom` cancel any in-flight animation before calling `window.scrollTo`.

**Build** — Vite handles `content.ts` (IIFE, with CSS inlined). Background is built separately via an esbuild call in the `closeBundle` Vite plugin hook (Vite's Rollup pipeline can't produce a Manifest V3-compatible service worker directly). `manifest.json` is copied as-is.
