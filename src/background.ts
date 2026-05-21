chrome.runtime.onMessage.addListener((msg: { type: string }) => {
  if (msg.type !== "prevTab" && msg.type !== "nextTab") return;

  chrome.tabs.query({ currentWindow: true }, (tabs) => {
    const sorted = tabs
      .filter(t => t.index !== undefined)
      .sort((a, b) => a.index! - b.index!);
    const activeIdx = sorted.findIndex(t => t.active);
    if (activeIdx === -1) return;
    const len = sorted.length;
    const target = msg.type === "prevTab"
      ? (activeIdx - 1 + len) % len
      : (activeIdx + 1) % len;
    chrome.tabs.update(sorted[target].id!, { active: true });
  });
});
