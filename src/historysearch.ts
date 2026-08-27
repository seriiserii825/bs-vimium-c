export interface HistoryEntry {
  title: string
  url: string
}

let backdrop: HTMLElement | null = null
let input: HTMLInputElement | null = null
let list: HTMLElement | null = null
let allEntries: HistoryEntry[] = []
let entries: HistoryEntry[] = []
let selectedIndex = 0
let onSelectCb: ((url: string, newTab: boolean) => void) | null = null

// Subsequence fuzzy match: every char of query must appear in target, in order,
// possibly with gaps (e.g. "sicuges" matches "sicurezza gestione"). Consecutive
// runs score higher so tighter matches rank first.
function fuzzyScore(query: string, target: string): number | null {
  if (!query) return 0
  let qi = 0
  let score = 0
  let consecutive = 0
  for (let ti = 0; ti < target.length && qi < query.length; ti++) {
    if (target[ti] === query[qi]) {
      qi++
      consecutive++
      score += consecutive
    } else {
      consecutive = 0
    }
  }
  return qi === query.length ? score : null
}

function filterEntries(query: string): HistoryEntry[] {
  const q = query.toLowerCase().trim()
  if (!q) return allEntries.slice(0, 30)

  const scored: { entry: HistoryEntry; score: number }[] = []
  for (const entry of allEntries) {
    const haystack = `${entry.title} ${entry.url}`.toLowerCase()
    const score = fuzzyScore(q, haystack)
    if (score !== null) scored.push({ entry, score })
  }
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, 30).map((s) => s.entry)
}

function renderList(): void {
  if (!list) return
  list.innerHTML = ''

  if (entries.length === 0) {
    const empty = document.createElement('div')
    empty.id = 'bs-hist-empty'
    empty.textContent = 'No matching history'
    list.appendChild(empty)
    return
  }

  entries.forEach((entry, i) => {
    const row = document.createElement('div')
    row.className = 'bs-hist-row' + (i === selectedIndex ? ' bs-hist-selected' : '')

    const title = document.createElement('div')
    title.className = 'bs-hist-title'
    title.textContent = entry.title || entry.url

    const url = document.createElement('div')
    url.className = 'bs-hist-url'
    url.textContent = entry.url

    row.appendChild(title)
    row.appendChild(url)

    row.addEventListener('click', (e) => {
      onSelectCb?.(entry.url, e.ctrlKey || e.metaKey)
      hideHistorySearch()
    })

    list!.appendChild(row)
  })
}

function setSelected(index: number): void {
  if (entries.length === 0) return
  selectedIndex = Math.max(0, Math.min(entries.length - 1, index))
  const rows = list?.querySelectorAll<HTMLElement>('.bs-hist-row')
  rows?.forEach((r, i) => r.classList.toggle('bs-hist-selected', i === selectedIndex))
  rows?.[selectedIndex]?.scrollIntoView({ block: 'nearest' })
}

function runFilter(query: string): void {
  entries = filterEntries(query)
  selectedIndex = 0
  renderList()
}

export function showHistorySearch(
  historyEntries: HistoryEntry[],
  onSelect: (url: string, newTab: boolean) => void,
): void {
  if (backdrop) return

  allEntries = historyEntries
  onSelectCb = onSelect
  entries = []
  selectedIndex = 0

  backdrop = document.createElement('div')
  backdrop.id = 'bs-hist-backdrop'

  const panel = document.createElement('div')
  panel.id = 'bs-hist-panel'

  input = document.createElement('input')
  input.id = 'bs-hist-input'
  input.type = 'text'
  input.placeholder = 'Search history...'
  input.spellcheck = false

  input.addEventListener('input', () => {
    runFilter(input!.value)
  })

  input.addEventListener('keydown', (e) => {
    e.stopPropagation()
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelected(selectedIndex + 1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelected(selectedIndex - 1)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const entry = entries[selectedIndex]
      if (entry) {
        onSelectCb?.(entry.url, e.ctrlKey || e.metaKey)
        hideHistorySearch()
      }
    }
  })

  list = document.createElement('div')
  list.id = 'bs-hist-list'

  panel.appendChild(input)
  panel.appendChild(list)
  backdrop.appendChild(panel)

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) hideHistorySearch()
  })

  document.documentElement.appendChild(backdrop)

  requestAnimationFrame(() => input?.focus())

  runFilter('')
}

export function hideHistorySearch(): void {
  backdrop?.remove()
  backdrop = null
  input = null
  list = null
  allEntries = []
  entries = []
  onSelectCb = null
}

export function isHistorySearchVisible(): boolean {
  return backdrop !== null
}
