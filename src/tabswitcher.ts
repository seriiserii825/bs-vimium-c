import { generateLabels } from './hints'

export interface TabInfo {
  id: number
  title: string
  url: string
  favIconUrl?: string
  active: boolean
}

export interface TabSwitchSession {
  tabs: TabInfo[]
  labels: string[]
  typed: string
  container: HTMLElement
}

export function beginTabSwitch(tabs: TabInfo[]): TabSwitchSession {
  const labels = generateLabels(tabs.length)

  const container = document.createElement('div')
  container.id = 'bs-tab-switcher'

  for (let i = 0; i < tabs.length; i++) {
    const tab = tabs[i]
    const chip = document.createElement('div')
    chip.className = 'bs-ts-tab' + (tab.active ? ' bs-ts-current' : '')

    const labelEl = document.createElement('span')
    labelEl.className = 'bs-ts-label'
    labelEl.textContent = labels[i]
    chip.appendChild(labelEl)

    if (tab.favIconUrl) {
      const favicon = document.createElement('img')
      favicon.className = 'bs-ts-favicon'
      favicon.src = tab.favIconUrl
      favicon.onerror = () => favicon.remove()
      chip.appendChild(favicon)
    }

    const title = document.createElement('span')
    title.className = 'bs-ts-title'
    title.textContent = tab.title || '(no title)'
    chip.appendChild(title)

    container.appendChild(chip)
  }

  document.documentElement.appendChild(container)

  // Scroll active tab into view
  const activeChip = container.querySelector<HTMLElement>('.bs-ts-current')
  activeChip?.scrollIntoView({ inline: 'center', block: 'nearest' })

  return { tabs, labels, typed: '', container }
}

export function typeTabSwitch(session: TabSwitchSession, key: string): { result: 'continue' | 'done' | 'cancel'; tabId?: number } {
  if (key === 'Escape') return { result: 'cancel' }

  if (key === 'Backspace') {
    session.typed = session.typed.slice(0, -1)
  } else if (/^[a-zA-Z]$/.test(key)) {
    session.typed += key.toLowerCase()
  } else {
    return { result: 'continue' }
  }

  const typed = session.typed
  const chips = Array.from(session.container.querySelectorAll<HTMLElement>('.bs-ts-tab'))

  const matchIdx = session.labels.findIndex(l => l === typed)
  if (matchIdx !== -1) {
    return { result: 'done', tabId: session.tabs[matchIdx].id }
  }

  let visible = 0
  for (let i = 0; i < session.labels.length; i++) {
    const ok = session.labels[i].startsWith(typed)
    chips[i]?.classList.toggle('bs-ts-dim', !ok)
    if (ok) {
      visible++
      // Scroll first matching chip into view as user types
      if (visible === 1) chips[i]?.scrollIntoView({ inline: 'nearest', block: 'nearest' })
    }
  }

  return visible > 0 ? { result: 'continue' } : { result: 'cancel' }
}

export function endTabSwitch(session: TabSwitchSession): void {
  session.container.remove()
}

export function isTabSwitchVisible(): boolean {
  return document.getElementById('bs-tab-switcher') !== null
}
