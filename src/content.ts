import "./hints.css";
import { beginHints, typeHint, endHints, HintSession } from "./hints";
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
  | "nextTab";

const actions: Record<Action, () => void> = {
  followLink: () => {
    session = beginHints("f");
  },
  followLinkNewTab: () => {
    session = beginHints("F");
  },
  scrollDown: () => {
    startScroll(1);
  },
  scrollUp: () => {
    startScroll(-1);
  },
  scrollToTop: scrollToTop,
  scrollToBottom: scrollToBottom,
  prevTab: () => { chrome.runtime.sendMessage({ type: "prevTab" }) },
  nextTab: () => { chrome.runtime.sendMessage({ type: "nextTab" }) },
};

// Actions that scroll continuously — need keyup to stop
const continuousActions = new Set<Action>(["scrollDown", "scrollUp"]);

const keyMap = new Map<string, Action>(
  mappings.map(({ hotkey, action }) => [hotkey, action as Action]),
);

// Keys that are the first character of a multi-char hotkey
const prefixKeys = new Set<string>([...keyMap.keys()].filter((h) => h.length > 1).map((h) => h[0]));

let pendingPrefix: string | null = null;
let prefixTimeout: ReturnType<typeof setTimeout> | null = null;

function clearPending(): void {
  pendingPrefix = null;
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
    if (e.ctrlKey || e.metaKey || e.altKey) return;

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

    if (isEditing()) return;
    if (e.repeat) return; // ignore OS key-repeat, we handle held keys ourselves

    if (pendingPrefix !== null) {
      const combo = pendingPrefix + e.key;
      clearPending();
      const action = keyMap.get(combo);
      if (action) {
        e.preventDefault();
        actions[action]();
      }
      return;
    }

    if (prefixKeys.has(e.key)) {
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
