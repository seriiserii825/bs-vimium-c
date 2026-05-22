import { showToast } from './toast'
import { showImageInfo } from './imageinfo'
import { writeText } from './clipboard'

// Home-row first for comfortable typography
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

  const fromSelector = new Set(Array.from(document.querySelectorAll<HTMLElement>(selector)))
  const result: HTMLElement[] = []
  for (const el of Array.from(document.querySelectorAll<HTMLElement>('*'))) {
    if (!isVisible(el)) continue
    if (fromSelector.has(el)) {
      result.push(el)
    } else if (window.getComputedStyle(el).cursor === 'pointer' && !el.closest('svg')) {
      result.push(el)
    }
  }
  return result
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

export type HintMode = 'f' | 'F' | 'y' | 'yl' | 'yi' | 'ym' | 'om' | 'h' | 'di' | 'ci' | 'cs' | 'oI' | 'ii' | 'ctc' | 'ctmc'

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

function getTableColumns(): HTMLElement[] {
  const result: HTMLElement[] = []
  for (const table of Array.from(document.querySelectorAll<HTMLTableElement>('table'))) {
    if (!isVisible(table)) continue
    const headerRow = table.querySelector('thead tr') ?? table.querySelector('tr')
    if (!headerRow) continue
    for (const cell of Array.from((headerRow as HTMLTableRowElement).cells)) {
      if (isVisible(cell as HTMLElement)) result.push(cell as HTMLElement)
    }
  }
  return result
}

function getColumnText(cell: HTMLTableCellElement): string {
  const table = cell.closest('table')
  if (!table) return cell.innerText.trim()
  const colIndex = cell.cellIndex
  return Array.from(table.querySelectorAll('tr'))
    .map(row => ((row as HTMLTableRowElement).cells[colIndex]?.innerText.trim() ?? ''))
    .filter(t => t)
    .join('\n')
}

function getHoverable(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('*')).filter(el => {
    if (!isVisible(el)) return false
    return window.getComputedStyle(el).cursor === 'pointer'
  })
}

export function beginHints(mode: HintMode): HintSession | null {
  const elements = (mode === 'y' || mode === 'ym') ? getCopyable()
    : mode === 'yl' ? Array.from(document.querySelectorAll<HTMLElement>('a[href]')).filter(isVisible)
    : mode === 'yi' ? Array.from(document.querySelectorAll<HTMLElement>(
        'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([disabled]), textarea:not([disabled])'
      )).filter(isVisible)
    : mode === 'cs' ? Array.from(document.querySelectorAll<HTMLElement>('svg')).filter(el => isVisible(el) && !el.parentElement?.closest('svg'))
    : (mode === 'di' || mode === 'ci' || mode === 'oI' || mode === 'ii') ? Array.from(document.querySelectorAll<HTMLElement>('img[src]')).filter(isVisible)
    : mode === 'h' ? getHoverable()
    : (mode === 'ctc' || mode === 'ctmc') ? getTableColumns()
    : getClickable()
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
  if (key === 'Enter' && (session.mode === 'ym' || session.mode === 'ctmc')) {
    const collected = session.collected
    if (collected && collected.length > 0) {
      writeText(collected.join('\n'))
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
    if (session.mode === 'ctmc') {
      const text = getColumnText(match.el as HTMLTableCellElement)
      if (text) {
        session.collected = session.collected ?? []
        session.collected.push(text)
        match.node.classList.add('selected')
      }
      session.typed = ''
      for (const entry of session.entries) entry.node.classList.remove('dim')
      return 'continue'
    }
    if (session.mode === 'om') {
      const el = match.el
      if (el instanceof HTMLAnchorElement && el.href) {
        chrome.runtime.sendMessage({ type: 'openTab', url: el.href })
      } else {
        el.click()
      }
      match.node.classList.add('selected')
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

async function copyImageToClipboard(src: string): Promise<void> {
  try {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject()
      img.src = src
    })
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    canvas.getContext('2d')!.drawImage(img, 0, 0)
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(b => b ? resolve(b) : reject(), 'image/png')
    )
    if (!navigator.clipboard?.write) { showToast('Copy failed (HTTPS required)'); return }
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
    showToast('Image copied')
  } catch {
    showToast('Copy failed (CORS)')
  }
}

function activate(entry: HintEntry, mode: HintMode): void {
  if (mode === 'ctc') {
    const text = getColumnText(entry.el as HTMLTableCellElement)
    writeText(text)
    showToast(`Copied ${text.split('\n').length} cells`)
  } else if (mode === 'ii') {
    showImageInfo(entry.el as HTMLImageElement)
  } else if (mode === 'di') {
    const src = (entry.el as HTMLImageElement).src
    if (src) chrome.runtime.sendMessage({ type: 'downloadImage', url: src })
  } else if (mode === 'oI') {
    const src = (entry.el as HTMLImageElement).src
    if (src) chrome.runtime.sendMessage({ type: 'navigateTo', url: src })
  } else if (mode === 'ci') {
    const src = (entry.el as HTMLImageElement).src
    if (src) copyImageToClipboard(src)
  } else if (mode === 'cs') {
    const svg = entry.el as unknown as SVGElement
    const code = new XMLSerializer().serializeToString(svg)
    writeText(code)
    showToast('SVG copied')
  } else if (mode === 'yl') {
    const url = (entry.el as HTMLAnchorElement).href
    writeText(url)
    showToast(url)
  } else if (mode === 'yi') {
    const el = entry.el as HTMLInputElement | HTMLTextAreaElement
    const text = el.value.trim() || (el as HTMLInputElement).placeholder?.trim() || ''
    writeText(text)
    showToast(text)
  } else if (mode === 'y') {
    const text = entry.el.innerText?.trim() || ''
    writeText(text)
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
