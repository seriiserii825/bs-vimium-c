chrome.runtime.onMessage.addListener((msg: { type: string; url?: string }) => {
  const type = msg.type;

  if (type === "downloadImage" && msg.url) {
    chrome.downloads.download({ url: msg.url });
    return;
  }

  if (type === "openTab" && msg.url) {
    chrome.tabs.create({ url: msg.url, active: false });
    return;
  }

  if (type === "navigateTo" && msg.url) {
    chrome.tabs.create({ url: msg.url, active: true });
    return;
  }

  const knownTypes = new Set(["prevTab","nextTab","moveTabRight","moveTabLeft","duplicateTab","newTab","closeTab","restoreTab","reloadTab","reloadTabHard","closeTabsRight","closeTabsOthers"]);
  if (!knownTypes.has(type)) return;

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
    } else if (type === "closeTab") {
      chrome.tabs.remove(sorted[activeIdx].id!);
    } else if (type === "restoreTab") {
      chrome.sessions.restore();
    } else if (type === "reloadTab") {
      chrome.tabs.reload(sorted[activeIdx].id!);
    } else if (type === "reloadTabHard") {
      chrome.tabs.reload(sorted[activeIdx].id!, { bypassCache: true });
    } else if (type === "closeTabsRight") {
      const toClose = sorted.slice(activeIdx + 1).map(t => t.id!);
      if (toClose.length) chrome.tabs.remove(toClose);
    } else if (type === "closeTabsOthers") {
      const toClose = sorted.filter((_, i) => i !== activeIdx).map(t => t.id!);
      if (toClose.length) chrome.tabs.remove(toClose);
    }
  });
});
