import "./hints.css";
import { beginHints, typeHint, endHints, unhoverLast, HintSession } from "./hints";
import { startScroll, stopScroll, scrollToTop, scrollToBottom } from "./scroll";
import mappings from "../maps.csv";

let session: HintSession | null = null;

type Action =
  | "followLink"
  | "followLinkNewTab"
  | "scrollDown"
  | "scrollUp"
  | "scrollToTop"
  | "scrollToBottom"
  | "prevTab"
  | "nextTab"
  | "moveTabRight"
  | "moveTabLeft"
  | "duplicateTab"
  | "newTab"
  | "closeTab"
  | "restoreTab"
  | "reloadTab"
  | "reloadTabHard"
  | "closeTabsRight"
  | "closeTabsOthers"
  | "yankText"
  | "yankMultiText"
  | "hoverElement";

const actions: Record<Action, () => void> = {
  followLink: () => {
    session = beginHints("f");
  },
  followLinkNewTab: () => {
    session = beginHints("F");
  },
  yankText: () => {
    session = beginHints("y");
  },
  yankMultiText: () => {
    session = beginHints("ym");
  },
  hoverElement: () => {
    session = beginHints("h");
  },
  scrollDown: () => {
    startScroll(1);
  },
  scrollUp: () => {
    startScroll(-1);
  },
  scrollToTop: scrollToTop,
  scrollToBottom: scrollToBottom,
  prevTab:      () => { chrome.runtime.sendMessage({ type: "prevTab" }) },
  nextTab:      () => { chrome.runtime.sendMessage({ type: "nextTab" }) },
  moveTabRight: () => { chrome.runtime.sendMessage({ type: "moveTabRight" }) },
  moveTabLeft:  () => { chrome.runtime.sendMessage({ type: "moveTabLeft" }) },
  duplicateTab:     () => { chrome.runtime.sendMessage({ type: "duplicateTab" }) },
  newTab:           () => { chrome.runtime.sendMessage({ type: "newTab" }) },
  closeTab:         () => { chrome.runtime.sendMessage({ type: "closeTab" }) },
  restoreTab:       () => { chrome.runtime.sendMessage({ type: "restoreTab" }) },
  reloadTab:        () => { chrome.runtime.sendMessage({ type: "reloadTab" }) },
  reloadTabHard:    () => { chrome.runtime.sendMessage({ type: "reloadTabHard" }) },
  closeTabsRight:   () => { chrome.runtime.sendMessage({ type: "closeTabsRight" }) },
  closeTabsOthers:  () => { chrome.runtime.sendMessage({ type: "closeTabsOthers" }) },
};

// Actions that scroll continuously — need keyup to stop
const continuousActions = new Set<Action>(["scrollDown", "scrollUp"]);

const keyMap = new Map<string, Action>(
  mappings.filter(({ hotkey }) => !hotkey.startsWith("A-")).map(({ hotkey, action }) => [hotkey, action as Action]),
);

const altKeyMap = new Map<string, Action>(
  mappings.filter(({ hotkey }) => hotkey.startsWith("A-")).map(({ hotkey, action }) => [hotkey.slice(2), action as Action]),
);

// All proper prefixes of multi-char hotkeys (e.g. "y", "ym", "g", ">", "<", "d")
const prefixStrings = new Set<string>();
for (const hotkey of keyMap.keys()) {
  for (let i = 1; i < hotkey.length; i++) prefixStrings.add(hotkey.slice(0, i));
}

let pendingPrefix = "";
let prefixTimeout: ReturnType<typeof setTimeout> | null = null;

function clearPending(): void {
  pendingPrefix = "";
  if (prefixTimeout !== null) {
    clearTimeout(prefixTimeout);
    prefixTimeout = null;
  }
}

function isEditing(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return (
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    (el as HTMLElement).isContentEditable
  );
}

document.addEventListener(
  "keydown",
  (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) return;

    if (e.altKey) {
      const action = altKeyMap.get(e.key);
      if (action) {
        e.preventDefault();
        actions[action]();
      }
      return;
    }

    if (session) {
      e.preventDefault();
      e.stopPropagation();
      const result = typeHint(session, e.key);
      if (result !== "continue") {
        endHints(session);
        session = null;
      }
      return;
    }

    if (e.key === "Escape") {
      (document.activeElement as HTMLElement)?.blur();
      unhoverLast();
      return;
    }

    if (isEditing()) return;
    if (e.repeat) return; // ignore OS key-repeat, we handle held keys ourselves

    if (pendingPrefix) {
      const combo = pendingPrefix + e.key;
      if (keyMap.has(combo)) {
        clearPending();
        e.preventDefault();
        actions[keyMap.get(combo)!]();
      } else if (prefixStrings.has(combo)) {
        e.preventDefault();
        pendingPrefix = combo;
        if (prefixTimeout !== null) clearTimeout(prefixTimeout);
        prefixTimeout = setTimeout(clearPending, 1000);
      } else {
        clearPending();
      }
      return;
    }

    if (prefixStrings.has(e.key)) {
      e.preventDefault();
      pendingPrefix = e.key;
      prefixTimeout = setTimeout(clearPending, 1000);
      return;
    }

    const action = keyMap.get(e.key);
    if (action) {
      e.preventDefault();
      actions[action]();
    }
  },
  true,
);

document.addEventListener(
  "keyup",
  (e: KeyboardEvent) => {
    const action = keyMap.get(e.key);
    if (action && continuousActions.has(action)) {
      stopScroll();
    }
  },
  true,
);
