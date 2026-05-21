const KEYS = 'asdfghjklqwertyuiopzxcvbnm';

interface TabInfo { title: string; active: boolean }
interface WindowInfo { id: number; tabCount: number; tabs: TabInfo[] }

async function init() {
  const { currentTabId, windows } = await chrome.storage.session.get(['currentTabId', 'windows']) as {
    currentTabId: number;
    windows: WindowInfo[];
  };
  const list = document.getElementById('list')!;

  windows.forEach((win, i) => {
    const key = KEYS[i];
    const item = document.createElement('div');
    item.className = 'item';
    const activeTab = win.tabs.find(t => t.active) || win.tabs[0];
    item.innerHTML = `
      <span class="key">${key}</span>
      <span class="title">${escapeHtml(activeTab.title)}</span>
      <span class="count">${win.tabCount} tab${win.tabCount !== 1 ? 's' : ''}</span>
    `;

    const tabsDiv = document.createElement('div');
    tabsDiv.className = 'tabs';
    win.tabs.forEach(t => {
      const el = document.createElement('div');
      el.className = 'tab-title' + (t.active ? ' is-active' : '');
      el.textContent = t.title;
      tabsDiv.appendChild(el);
    });

    const wrapper = document.createElement('div');
    wrapper.appendChild(item);
    wrapper.appendChild(tabsDiv);
    wrapper.addEventListener('click', () => move(currentTabId, win.id));
    list.appendChild(wrapper);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { window.close(); return; }
    const idx = KEYS.indexOf(e.key.toLowerCase());
    if (idx >= 0 && idx < windows.length) {
      move(currentTabId, windows[idx].id);
    }
  });
}

async function move(tabId: number, windowId: number) {
  await chrome.runtime.sendMessage({ type: 'moveTabConfirm', currentTabId: tabId, targetWindowId: windowId });
  window.close();
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

init();
