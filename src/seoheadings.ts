let overlay: HTMLElement | null = null
let backdrop: HTMLElement | null = null

export function showSeoHeadings(): void {
  if (backdrop) return

  const headings = Array.from(document.querySelectorAll<HTMLElement>('h1, h2, h3'))

  // Page overlays — absolute so they scroll with content
  overlay = document.createElement('div')
  overlay.id = 'bs-seoh-overlay'

  for (const el of headings) {
    const rect = el.getBoundingClientRect()
    const tag = el.tagName.toLowerCase()
    const badge = document.createElement('span')
    badge.className = `bs-seoh-badge bs-seoh-${tag}`
    badge.textContent = tag
    badge.style.top = `${Math.round(rect.top + scrollY)}px`
    badge.style.left = `${Math.round(rect.left + scrollX)}px`
    overlay.appendChild(badge)
  }

  document.documentElement.appendChild(overlay)

  // Popup
  backdrop = document.createElement('div')
  backdrop.id = 'bs-seoh-backdrop'

  const panel = document.createElement('div')
  panel.id = 'bs-seoh-panel'

  const header = document.createElement('div')
  header.id = 'bs-seoh-header'
  const title = document.createElement('span')
  title.textContent = 'Headings'
  const closeBtn = document.createElement('button')
  closeBtn.id = 'bs-seoh-close'
  closeBtn.textContent = '×'
  closeBtn.addEventListener('click', hideSeoHeadings)
  header.appendChild(title)
  header.appendChild(closeBtn)
  panel.appendChild(header)

  const body = document.createElement('div')
  body.id = 'bs-seoh-body'

  if (headings.length === 0) {
    const empty = document.createElement('div')
    empty.id = 'bs-seoh-empty'
    empty.textContent = 'No headings found'
    body.appendChild(empty)
  } else {
    for (const el of headings) {
      const tag = el.tagName.toLowerCase()
      const row = document.createElement('div')
      row.className = `bs-seoh-row bs-seoh-row-${tag}`

      const badge = document.createElement('span')
      badge.className = `bs-seoh-badge bs-seoh-${tag}`
      badge.textContent = tag

      const text = document.createElement('span')
      text.className = 'bs-seoh-text'
      text.textContent = el.textContent?.trim() ?? ''

      row.appendChild(badge)
      row.appendChild(text)

      row.addEventListener('click', () => {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        hideSeoHeadings()
      })

      body.appendChild(row)
    }
  }

  panel.appendChild(body)
  backdrop.appendChild(panel)

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) hideSeoHeadings()
  })

  document.documentElement.appendChild(backdrop)
}

export function hideSeoHeadings(): void {
  overlay?.remove()
  overlay = null
  backdrop?.remove()
  backdrop = null
}

export function isSeoHeadingsVisible(): boolean {
  return backdrop !== null
}
