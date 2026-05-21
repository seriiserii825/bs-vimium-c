type Mapping = { hotkey: string; action: string; description: string }

let backdrop: HTMLElement | null = null

function formatKey(hotkey: string): string {
  if (hotkey.startsWith('A-')) return `Alt+${hotkey.slice(2).toUpperCase()}`
  return hotkey
}

export function showHelp(mappings: Mapping[]): void {
  if (backdrop) return

  backdrop = document.createElement('div')
  backdrop.id = 'bs-vimium-help-backdrop'

  const panel = document.createElement('div')
  panel.id = 'bs-vimium-help'

  const header = document.createElement('div')
  header.id = 'bs-vimium-help-header'
  header.textContent = 'Keyboard Shortcuts'

  const closeBtn = document.createElement('button')
  closeBtn.id = 'bs-vimium-help-close'
  closeBtn.textContent = '×'
  closeBtn.addEventListener('click', hideHelp)
  header.appendChild(closeBtn)

  const body = document.createElement('div')
  body.id = 'bs-vimium-help-body'

  for (const { hotkey, description } of mappings) {
    const row = document.createElement('div')
    row.className = 'bs-vimium-help-row'

    const keyCell = document.createElement('div')
    keyCell.className = 'bs-vimium-help-key'
    const kbd = document.createElement('kbd')
    kbd.textContent = formatKey(hotkey)
    keyCell.appendChild(kbd)

    const descCell = document.createElement('div')
    descCell.className = 'bs-vimium-help-desc'
    descCell.textContent = description

    row.appendChild(keyCell)
    row.appendChild(descCell)
    body.appendChild(row)
  }

  panel.appendChild(header)
  panel.appendChild(body)
  backdrop.appendChild(panel)

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) hideHelp()
  })

  document.documentElement.appendChild(backdrop)
}

export function hideHelp(): void {
  backdrop?.remove()
  backdrop = null
}

export function isHelpVisible(): boolean {
  return backdrop !== null
}
