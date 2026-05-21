import "./hints.css";
import { beginHints, typeHint, endHints, HintSession } from "./hints";
import { startScroll, stopScroll } from "./scroll";
import mappings from "../maps.csv";

let session: HintSession | null = null;

type Action = "followLink" | "followLinkNewTab" | "scrollDown" | "scrollUp";

const actions: Record<Action, () => void> = {
  followLink:       () => { session = beginHints("f") },
  followLinkNewTab: () => { session = beginHints("F") },
  scrollDown:       () => { startScroll(1) },
  scrollUp:         () => { startScroll(-1) },
};

// Actions that scroll continuously — need keyup to stop
const continuousActions = new Set<Action>(["scrollDown", "scrollUp"]);

const keyMap = new Map<string, Action>(
  mappings.map(({ hotkey, action }) => [hotkey, action as Action]),
);

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

document.addEventListener("keydown", (e: KeyboardEvent) => {
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

  const action = keyMap.get(e.key);
  if (action) {
    e.preventDefault();
    actions[action]();
  }
}, true);

document.addEventListener("keyup", (e: KeyboardEvent) => {
  const action = keyMap.get(e.key);
  if (action && continuousActions.has(action)) {
    stopScroll();
  }
}, true);
