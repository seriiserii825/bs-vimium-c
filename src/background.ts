chrome.runtime.onMessage.addListener((msg: { type: string; url?: string; currentTabId?: number; targetWindowId?: number; ratio?: number; tabId?: number }, _sender, sendResponse) => {
  const type = msg.type;

  if (type === "getTabs") {
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
      const sorted = tabs.filter(t => t.index !== undefined).sort((a, b) => a.index! - b.index!)
      sendResponse({ tabs: sorted.map(t => ({ id: t.id!, title: t.title || '', url: t.url || '', favIconUrl: t.favIconUrl, active: t.active })) })
    })
    return true
  }

  if (type === "switchToTab" && msg.tabId !== undefined) {
    chrome.tabs.update(msg.tabId, { active: true })
    return
  }

  if (type === "getCookies" && msg.url) {
    chrome.cookies.getAll({ url: msg.url }, (cookies) => {
      sendResponse({ cookies: cookies.map(c => ({ name: c.name, value: c.value, domain: c.domain, secure: c.secure, path: c.path })) });
    });
    return true;
  }

  if (type === "deleteCookiesRefresh" && msg.url) {
    (async () => {
      const cookies = await chrome.cookies.getAll({ url: msg.url! });
      await Promise.all(cookies.map(c => {
        const cookieUrl = `${c.secure ? 'https' : 'http'}://${c.domain.startsWith('.') ? c.domain.slice(1) : c.domain}${c.path}`;
        return chrome.cookies.remove({ url: cookieUrl, name: c.name });
      }));
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.id) chrome.tabs.reload(tab.id);
    })();
    return;
  }


  if (type === "moveTabToWindow") {
    (async () => {
      const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const allWindows = await chrome.windows.getAll({ populate: true });
      const otherWindows = allWindows.filter(w => w.id !== currentTab.windowId);
      if (otherWindows.length === 0) return;
      await chrome.storage.session.set({
        currentTabId: currentTab.id,
        windows: otherWindows.map(w => ({
          id: w.id,
          tabCount: w.tabs!.length,
          tabs: w.tabs!.map(t => ({ title: t.title || t.url || "New Tab", active: t.active })),
        })),
      });
      chrome.windows.create({
        url: chrome.runtime.getURL("picker.html"),
        type: "popup",
        width: 520,
        height: 360,
        focused: true,
      });
    })();
    return;
  }

  if (type === "moveTabConfirm" && msg.currentTabId !== undefined && msg.targetWindowId !== undefined) {
    (async () => {
      await chrome.tabs.move(msg.currentTabId!, { windowId: msg.targetWindowId!, index: -1 });
      await chrome.tabs.update(msg.currentTabId!, { active: true });
      await chrome.windows.update(msg.targetWindowId!, { focused: true });
    })();
    return;
  }

  if (type === "zoomFitWindow") {
    (async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) return;
      if (msg.ratio !== undefined) {
        const current = await chrome.tabs.getZoom(tab.id);
        chrome.tabs.setZoom(tab.id, current * msg.ratio);
      } else {
        chrome.tabs.setZoom(tab.id, 0);
      }
    })();
    return;
  }

  if (type === "zoomFull") {
    (async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.id) chrome.tabs.setZoom(tab.id, 1.0);
    })();
    return;
  }

  if (type === "zoomIn" || type === "zoomOut") {
    const ZOOM_STEPS = [0.25, 0.33, 0.5, 0.67, 0.75, 0.8, 0.9, 1.0, 1.1, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0, 4.0, 5.0];
    (async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) return;
      const current = await chrome.tabs.getZoom(tab.id);
      const pct = Math.round(current * 100);
      const idx = ZOOM_STEPS.findIndex(z => Math.round(z * 100) === pct);
      let next: number;
      if (type === "zoomIn") {
        next = idx === -1 ? 1.1 : ZOOM_STEPS[Math.min(idx + 1, ZOOM_STEPS.length - 1)];
      } else {
        next = idx === -1 ? 0.9 : ZOOM_STEPS[Math.max(idx - 1, 0)];
      }
      chrome.tabs.setZoom(tab.id, next);
    })();
    return;
  }

  if (type === "openIncognito") {
    (async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.url) chrome.windows.create({ url: tab.url, incognito: true });
    })();
    return;
  }

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
