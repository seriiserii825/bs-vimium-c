let bar: HTMLElement | null = null
let input: HTMLInputElement | null = null
let counter: HTMLElement | null = null
let marks: HTMLElement[] = []
let currentIndex = -1
let lastQuery = ''

function isVisible(el: Element): boolean {
  const style = getComputedStyle(el)
  return style.display !== 'none' && style.visibility !== 'hidden'
}

function clearMarks(): void {
  for (const mark of marks) {
    const parent = mark.parentNode
    if (!parent) continue
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark)
    parent.removeChild(mark)
  }
  marks = []
  currentIndex = -1
  document.body?.normalize()
}

function collectTextNodes(): Text[] {
  const nodes: Text[] = []
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = (node as Text).parentElement
      if (!parent) return NodeFilter.FILTER_REJECT
      const tag = parent.tagName
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'TEXTAREA') return NodeFilter.FILTER_REJECT
      if (parent.closest('#bs-find-bar')) return NodeFilter.FILTER_REJECT
      if (!(node as Text).nodeValue?.trim()) return NodeFilter.FILTER_REJECT
      if (!isVisible(parent)) return NodeFilter.FILTER_REJECT
      return NodeFilter.FILTER_ACCEPT
    },
  })
  let n: Node | null
  while ((n = walker.nextNode())) nodes.push(n as Text)
  return nodes
}

function updateCounter(): void {
  if (!counter) return
  counter.textContent = marks.length === 0 ? '0/0' : `${currentIndex + 1}/${marks.length}`
}

function focusMark(index: number): void {
  marks.forEach((m, i) => m.classList.toggle('bs-find-current', i === index))
  marks[index]?.scrollIntoView({ block: 'center', inline: 'nearest' })
}

function highlight(query: string): void {
  clearMarks()
  if (!query) { updateCounter(); return }

  const q = query.toLowerCase()
  const textNodes = collectTextNodes()

  for (const node of textNodes) {
    const text = node.nodeValue ?? ''
    const lower = text.toLowerCase()
    let idx = lower.indexOf(q)
    if (idx === -1) continue

    const frag = document.createDocumentFragment()
    let cursor = 0
    while (idx !== -1) {
      if (idx > cursor) frag.appendChild(document.createTextNode(text.slice(cursor, idx)))
      const mark = document.createElement('mark')
      mark.className = 'bs-find-mark'
      mark.textContent = text.slice(idx, idx + q.length)
      frag.appendChild(mark)
      marks.push(mark)
      cursor = idx + q.length
      idx = lower.indexOf(q, cursor)
    }
    if (cursor < text.length) frag.appendChild(document.createTextNode(text.slice(cursor)))

    node.parentNode?.replaceChild(frag, node)
  }

  if (marks.length > 0) {
    currentIndex = 0
    focusMark(0)
  }
  updateCounter()
}

function nextMatch(): void {
  if (marks.length === 0) return
  currentIndex = (currentIndex + 1) % marks.length
  focusMark(currentIndex)
  updateCounter()
}

function prevMatch(): void {
  if (marks.length === 0) return
  currentIndex = (currentIndex - 1 + marks.length) % marks.length
  focusMark(currentIndex)
  updateCounter()
}

export function showFind(): void {
  if (bar) {
    input?.focus()
    input?.select()
    return
  }

  bar = document.createElement('div')
  bar.id = 'bs-find-bar'

  input = document.createElement('input')
  input.id = 'bs-find-input'
  input.type = 'text'
  input.spellcheck = false
  input.placeholder = 'Find in page...'
  input.value = lastQuery

  counter = document.createElement('span')
  counter.id = 'bs-find-counter'

  input.addEventListener('input', () => {
    lastQuery = input!.value
    highlight(lastQuery)
  })

  input.addEventListener('keydown', (e) => {
    e.stopPropagation()
    if (e.key === 'Enter') {
      e.preventDefault()
      if (e.shiftKey) prevMatch()
      else nextMatch()
    }
  })

  bar.appendChild(input)
  bar.appendChild(counter)
  document.documentElement.appendChild(bar)

  requestAnimationFrame(() => {
    input?.focus()
    input?.select()
  })

  if (lastQuery) highlight(lastQuery)
  else updateCounter()
}

export function hideFind(): void {
  bar?.remove()
  bar = null
  input = null
  counter = null
  clearMarks()
}

export function isFindVisible(): boolean {
  return bar !== null
}
