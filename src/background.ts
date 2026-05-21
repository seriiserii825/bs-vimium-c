chrome.runtime.onMessage.addListener((msg: { type: string }) => {
  const type = msg.type;
  if (type !== "prevTab" && type !== "nextTab" && type !== "moveTabRight" && type !== "moveTabLeft" && type !== "duplicateTab" && type !== "newTab") return;

  chrome.tabs.query({ currentWindow: true }, (tabs) => {
    const sorted = tabs
      .filter(t => t.index !== undefined)
      .sort((a, b) => a.index! - b.index!);
    const activeIdx = sorted.findIndex(t => t.active);
    if (activeIdx === -1) return;
    const len = sorted.length;

    if (type === "prevTab" || type === "nextTab") {
      const target = type === "prevTab"
        ? (activeIdx - 1 + len) % len
        : (activeIdx + 1) % len;
      chrome.tabs.update(sorted[target].id!, { active: true });
    } else if (type === "moveTabRight" || type === "moveTabLeft") {
      const delta = type === "moveTabRight" ? 1 : -1;
      const newIndex = Math.max(0, Math.min(len - 1, activeIdx + delta));
      if (newIndex !== activeIdx) {
        chrome.tabs.move(sorted[activeIdx].id!, { index: newIndex });
      }
    } else if (type === "duplicateTab") {
      chrome.tabs.duplicate(sorted[activeIdx].id!);
    } else if (type === "newTab") {
      chrome.tabs.create({});
    }
  });
});
