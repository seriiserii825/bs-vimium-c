import { showToast } from './toast'

// Home-row first for comfortable typing
const CHARS = 'sadfjklewcmpgh'

function getCopyable(): HTMLElement[] {
  const all = Array.from(document.querySelectorAll<HTMLElement>(
    'p, h1, h2, h3, h4, h5, h6, li, td, th, span, a, button, label, dt, dd, blockquote, caption, figcaption, code, pre'
  ))
  return all.filter(el => {
    const text = el.innerText?.trim()
    if (!text) return false
    // skip if all text is just from children already in the list
    return isVisible(el)
  })
}

function getClickable(): HTMLElement[] {
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[onclick]',
    '[role="button"]',
    '[role="link"]',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ')

  return Array.from(document.querySelectorAll<HTMLElement>(selector)).filter(isVisible)
}

function isVisible(el: HTMLElement): boolean {
  const r = el.getBoundingClientRect()
  if (r.width === 0 || r.height === 0) return false
  if (r.bottom < 0 || r.top > window.innerHeight) return false
  if (r.right < 0 || r.left > window.innerWidth) return false
  const s = window.getComputedStyle(el)
  return s.display !== 'none' && s.visibility !== 'hidden' && parseFloat(s.opacity) > 0
}

function generateLabels(n: number): string[] {
  const labels: string[] = []
  if (n <= CHARS.length) {
    for (let i = 0; i < n; i++) labels.push(CHARS[i])
  } else {
    outer: for (let i = 0; i < CHARS.length; i++)
      for (let j = 0; j < CHARS.length; j++) {
        labels.push(CHARS[i] + CHARS[j])
        if (labels.length === n) break outer
      }
  }
  return labels
}

export type HintMode = 'f' | 'F' | 'y'

export interface HintEntry {
  el: HTMLElement
  label: string
  node: HTMLElement
}

export interface HintSession {
  mode: HintMode
  entries: HintEntry[]
  typed: string
  container: HTMLElement
}

export function beginHints(mode: HintMode): HintSession | null {
  const elements = mode === 'y' ? getCopyable() : getClickable()
  if (elements.length === 0) return null

  const labels = generateLabels(elements.length)

  const container = document.createElement('div')
  container.id = 'bs-vimium-hints'
  document.documentElement.appendChild(container)

  const entries: HintEntry[] = elements.map((el, i) => {
    const r = el.getBoundingClientRect()
    const node = document.createElement('div')
    node.className = 'bs-vimium-hint'
    node.textContent = labels[i]
    // Container is position:fixed at (0,0), so these are viewport coords
    node.style.left = `${Math.round(r.left)}px`
    node.style.top = `${Math.round(r.top)}px`
    container.appendChild(node)
    return { el, label: labels[i], node }
  })

  return { mode, entries, typed: '', container }
}

export function typeHint(session: HintSession, key: string): 'continue' | 'done' | 'cancel' {
  if (key === 'Escape') return 'cancel'

  if (key === 'Backspace') {
    session.typed = session.typed.slice(0, -1)
  } else if (/^[a-zA-Z]$/.test(key)) {
    session.typed += key.toLowerCase()
  } else {
    return 'continue'
  }

  const typed = session.typed

  const match = session.entries.find(e => e.label === typed)
  if (match) {
    activate(match, session.mode)
    return 'done'
  }

  let visible = 0
  for (const entry of session.entries) {
    const ok = entry.label.startsWith(typed)
    entry.node.classList.toggle('dim', !ok)
    if (ok) visible++
  }

  return visible > 0 ? 'continue' : 'cancel'
}

function activate(entry: HintEntry, mode: HintMode): void {
  if (mode === 'y') {
    const text = entry.el.innerText?.trim() || ''
    navigator.clipboard.writeText(text)
    showToast(text)
  } else if (mode === 'F' && entry.el instanceof HTMLAnchorElement && entry.el.href) {
    window.open(entry.el.href, '_blank')
  } else {
    entry.el.focus()
    entry.el.click()
  }
}

export function endHints(session: HintSession): void {
  session.container.remove()
}
