import { showToast } from './toast'

// Home-row first for comfortable typing
const CHARS = 'sadfjklewcmpgh'

function getCopyable(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('*')).filter(el => {
    if (!isVisible(el)) return false
    for (const child of Array.from(el.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim()) return true
    }
    return false
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

export type HintMode = 'f' | 'F' | 'y' | 'ym' | 'h'

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
  collected?: string[]
}

let lastHovered: HTMLElement | null = null
let hoverStyleEl: HTMLStyleElement | null = null

function dispatchMouse(el: HTMLElement, type: string, x: number, y: number, bubbles = true): void {
  el.dispatchEvent(new MouseEvent(type, { bubbles, cancelable: true, view: window, clientX: x, clientY: y }))
}

function ancestorPath(el: HTMLElement): HTMLElement[] {
  const path: HTMLElement[] = []
  let node: HTMLElement | null = el
  while (node && node !== document.documentElement) {
    path.push(node)
    node = node.parentElement
  }
  return path
}

// CSS :hover не активируется синтетическими JS-событиями — Chrome обновляет
// :hover только от реальных OS-событий. Поэтому читаем все CSS-правила страницы,
// заменяем :hover на [data-bs-hover] и инжектируем как отдельный <style> тег.
function extractHoverRules(ruleList: CSSRuleList): string[] {
  const result: string[] = []
  for (const rule of Array.from(ruleList)) {
    if (rule instanceof CSSStyleRule && rule.selectorText.includes(':hover')) {
      const newSel = rule.selectorText.replace(/:hover\b/g, '[data-bs-hover]')
      result.push(`${newSel} { ${rule.style.cssText} }`)
    } else if (rule instanceof CSSMediaRule) {
      const inner = extractHoverRules(rule.cssRules)
      if (inner.length > 0) {
        result.push(`@media ${rule.conditionText} { ${inner.join('\n')} }`)
      }
    }
  }
  return result
}

function activateCSSHover(el: HTMLElement): void {
  const path = ancestorPath(el)
  for (const a of path) a.dataset.bsHover = '1'

  const rules: string[] = []
  for (const sheet of Array.from(document.styleSheets)) {
    try { rules.push(...extractHoverRules(sheet.cssRules)) } catch { /* cross-origin */ }
  }
  if (rules.length === 0) return
  hoverStyleEl = document.createElement('style')
  hoverStyleEl.textContent = rules.join('\n')
  document.head.appendChild(hoverStyleEl)
}

function deactivateCSSHover(): void {
  for (const el of Array.from(document.querySelectorAll<HTMLElement>('[data-bs-hover]'))) {
    delete el.dataset.bsHover
  }
  hoverStyleEl?.remove()
  hoverStyleEl = null
}

export function unhoverLast(): void {
  if (!lastHovered) return
  const el = lastHovered
  lastHovered = null

  deactivateCSSHover()

  const r = el.getBoundingClientRect()
  const cx = r.left + r.width / 2
  const cy = r.top + r.height / 2
  dispatchMouse(el, 'mouseout', cx, cy)
  for (const ancestor of ancestorPath(el)) {
    dispatchMouse(ancestor, 'mouseleave', cx, cy, false)
  }
}

function getHoverable(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('*')).filter(el => {
    if (!isVisible(el)) return false
    return window.getComputedStyle(el).cursor === 'pointer'
  })
}

export function beginHints(mode: HintMode): HintSession | null {
  const elements = (mode === 'y' || mode === 'ym') ? getCopyable() : mode === 'h' ? getHoverable() : getClickable()
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

  // Enter завершает multi-yank и копирует накопленный текст
  if (key === 'Enter' && session.mode === 'ym') {
    const collected = session.collected
    if (collected && collected.length > 0) {
      navigator.clipboard.writeText(collected.join('\n'))
      showToast(`Copied ${collected.length} items`)
    }
    return 'done'
  }

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
    if (session.mode === 'ym') {
      const text = match.el.innerText?.trim() || ''
      if (text) {
        session.collected = session.collected ?? []
        session.collected.push(text)
        match.node.classList.add('selected')
      }
      session.typed = ''
      for (const entry of session.entries) entry.node.classList.remove('dim')
      return 'continue'
    }
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
  } else if (mode === 'h') {
    unhoverLast()
    lastHovered = entry.el
    const r = entry.el.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    // CSS :hover: инжектируем переписанные правила с [data-bs-hover]
    activateCSSHover(entry.el)
    // JS-события: mouseenter не всплывает, поэтому диспатчим от корня до цели
    const path = ancestorPath(entry.el).reverse()
    for (const ancestor of path) {
      dispatchMouse(ancestor, 'mouseenter', cx, cy, false)
    }
    dispatchMouse(entry.el, 'mouseover', cx, cy)
    dispatchMouse(entry.el, 'mousemove', cx, cy)
  } else {
    entry.el.focus()
    entry.el.click()
  }
}

export function endHints(session: HintSession): void {
  session.container.remove()
}
