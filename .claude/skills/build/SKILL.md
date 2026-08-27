---
name: build
description: Always run at the end of any coding task in this project (chrome-vimium-c) that touched files under src/, maps.csv, manifest.json, or picker.html — runs bun run build (type-check + lint + build to dist/) and reports the result.
---

Run this as the last step of any task that changed project source:

1. Run `bun run build` in the project root.
2. If it fails, fix the reported type/lint errors and re-run until it passes. Do not report the task as done while the build is failing.
3. Once it passes, tell the user the build succeeded and remind them to reload the extension: `chrome://extensions` → reload chrome-vimium-c.

Skip this skill for changes that don't affect the build (e.g. editing only this SKILL.md or other docs).
