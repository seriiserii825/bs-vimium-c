type Mapping = { hotkey: string; action: string; description: string; group: string };

let backdrop: HTMLElement | null = null;

function formatKey(hotkey: string): string {
  if (hotkey.startsWith("A-")) return `Alt+${hotkey.slice(2).toUpperCase()}`;
  return hotkey;
}

export function showHelp(mappings: Mapping[]): void {
  if (backdrop) return;

  backdrop = document.createElement("div");
  backdrop.id = "bs-vimium-help-backdrop";

  const panel = document.createElement("div");
  panel.id = "bs-vimium-help";

  const header = document.createElement("div");
  header.id = "bs-vimium-help-header";

  const title = document.createElement("span");
  title.textContent = "Keyboard Shortcuts";
  header.appendChild(title);

  const search = document.createElement("input");
  search.id = "bs-vimium-help-search";
  search.type = "text";
  search.placeholder = "Search shortcuts...";
  header.appendChild(search);

  const closeBtn = document.createElement("button");
  closeBtn.id = "bs-vimium-help-close";
  closeBtn.textContent = "×";
  closeBtn.addEventListener("click", hideHelp);
  header.appendChild(closeBtn);

  const body = document.createElement("div");
  body.id = "bs-vimium-help-body";

  type Row = { el: HTMLElement; hotkey: string; desc: string };
  const rows: Row[] = [];
  let currentGroup = "";

  for (const { hotkey, description, group } of mappings) {
    if (group && group !== currentGroup) {
      currentGroup = group;
      const groupRow = document.createElement("div");
      groupRow.className = "bs-vimium-help-row";
      const groupLabel = document.createElement("div");
      groupLabel.className = "bs-vimium-help-group";
      groupLabel.textContent = group;
      groupRow.appendChild(groupLabel);
      body.appendChild(groupRow);
    }

    const row = document.createElement("div");
    row.className = "bs-vimium-help-row";

    const keyCell = document.createElement("div");
    keyCell.className = "bs-vimium-help-key";
    const kbd = document.createElement("kbd");
    kbd.textContent = formatKey(hotkey);
    keyCell.appendChild(kbd);

    const descCell = document.createElement("div");
    descCell.className = "bs-vimium-help-desc";
    descCell.textContent = description;

    row.appendChild(keyCell);
    row.appendChild(descCell);
    body.appendChild(row);
    rows.push({ el: row, hotkey: hotkey.toLowerCase(), desc: description.toLowerCase() });
  }

  search.addEventListener("input", () => {
    const q = search.value.toLowerCase().trim();
    for (const r of rows) {
      r.el.style.display = !q || r.hotkey.includes(q) || r.desc.includes(q) ? "" : "none";
    }
    body.style.columns = q ? "1" : "";
  });

  panel.appendChild(header);
  panel.appendChild(body);
  backdrop.appendChild(panel);

  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) hideHelp();
  });

  backdrop.addEventListener("keydown", (e) => {
    if (e.key === "j") { e.preventDefault(); e.stopPropagation(); body.scrollBy(0, 80); }
    else if (e.key === "k") { e.preventDefault(); e.stopPropagation(); body.scrollBy(0, -80); }
  }, true);

  document.documentElement.appendChild(backdrop);
  requestAnimationFrame(() => search.focus());
}

export function hideHelp(): void {
  backdrop?.remove();
  backdrop = null;
}

export function isHelpVisible(): boolean {
  return backdrop !== null;
}
