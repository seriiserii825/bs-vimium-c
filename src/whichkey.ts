type Mapping = { hotkey: string; action: string; description: string }

let panel: HTMLElement | null = null

export function showWhichKey(prefix: string, mappings: Mapping[]): void {
  const matches = mappings.filter(
    m => !m.hotkey.startsWith('A-') && m.hotkey.startsWith(prefix) && m.hotkey !== prefix
  )

  if (matches.length === 0) {
    hideWhichKey()
    return
  }

  // Group by the next character after the current prefix
  const groups = new Map<string, { exact: Mapping | null; hasDeeper: boolean }>()
  for (const m of matches) {
    const nextChar = m.hotkey[prefix.length]
    if (!groups.has(nextChar)) groups.set(nextChar, { exact: null, hasDeeper: false })
    const group = groups.get(nextChar)!
    if (m.hotkey.length === prefix.length + 1) group.exact = m
    else group.hasDeeper = true
  }

  if (!panel) {
    panel = document.createElement('div')
    panel.id = 'bs-whichkey'
    document.documentElement.appendChild(panel)
  }

  panel.innerHTML = ''

  const prefixEl = document.createElement('span')
  prefixEl.id = 'bs-whichkey-prefix'
  prefixEl.textContent = prefix
  panel.appendChild(prefixEl)

  for (const [char, { exact, hasDeeper }] of groups) {
    const item = document.createElement('span')
    item.className = 'bs-whichkey-item'

    const kbd = document.createElement('kbd')
    kbd.textContent = char
    item.appendChild(kbd)

    const desc = document.createElement('span')
    if (exact) {
      desc.textContent = exact.description + (hasDeeper ? ' +' : '')
    } else {
      const deeper = matches.find(m => m.hotkey.startsWith(prefix + char))
      desc.textContent = (deeper?.description ?? '') + ' →'
    }
    item.appendChild(desc)

    panel.appendChild(item)
  }
}

export function hideWhichKey(): void {
  panel?.remove()
  panel = null
}

export function isWhichKeyVisible(): boolean {
  return panel !== null
}
