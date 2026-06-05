const STORAGE_KEY = 'bs-timecodes'
const MAX_PER_VIDEO = 10

interface TimecodeEntry {
  videoId: string
  seconds: number
}

function getVideoId(): string | null {
  if (!location.hostname.includes('youtube.com')) return null
  return new URLSearchParams(location.search).get('v')
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return [h, m, s].map(n => String(n).padStart(2, '0')).join(':')
}

function loadEntries(): TimecodeEntry[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}

function saveEntry(videoId: string, seconds: number): void {
  const all = loadEntries().filter(e => !(e.videoId === videoId && e.seconds === seconds))
  const forVideo = all.filter(e => e.videoId === videoId).slice(0, MAX_PER_VIDEO - 1)
  const others = all.filter(e => e.videoId !== videoId)
  localStorage.setItem(STORAGE_KEY, JSON.stringify([{ videoId, seconds }, ...forVideo, ...others]))
}

function deleteEntry(videoId: string, seconds: number): void {
  const all = loadEntries().filter(e => !(e.videoId === videoId && e.seconds === seconds))
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
}

// ---

let backdrop: HTMLElement | null = null

export function showTimecode(): void {
  if (backdrop) return

  const videoId = getVideoId()
  const history = videoId ? loadEntries().filter(e => e.videoId === videoId) : []

  backdrop = document.createElement('div')
  backdrop.id = 'bs-timecode-backdrop'

  const panel = document.createElement('div')
  panel.id = 'bs-timecode'

  const label = document.createElement('div')
  label.id = 'bs-timecode-label'
  label.textContent = 'Go to time'

  const row = document.createElement('div')
  row.id = 'bs-timecode-row'

  const inputs: HTMLInputElement[] = []

  function makeInput(): HTMLInputElement {
    const inp = document.createElement('input')
    inp.type = 'text'
    inp.className = 'bs-timecode-inp'
    inp.maxLength = 2
    inp.value = '00'
    inp.spellcheck = false
    inp.inputMode = 'numeric'
    return inp
  }

  function sep(): HTMLSpanElement {
    const s = document.createElement('span')
    s.className = 'bs-timecode-sep'
    s.textContent = ':'
    return s
  }

  const hh = makeInput()
  const mm = makeInput()
  const ss = makeInput()
  inputs.push(hh, mm, ss)

  row.appendChild(hh)
  row.appendChild(sep())
  row.appendChild(mm)
  row.appendChild(sep())
  row.appendChild(ss)

  panel.appendChild(label)
  panel.appendChild(row)

  // History items
  const historyItems: HTMLElement[] = []
  if (history.length > 0) {
    const histList = document.createElement('div')
    histList.id = 'bs-timecode-history'

    history.forEach((entry) => {
      const item = document.createElement('div')
      item.className = 'bs-timecode-hist-item'
      item.tabIndex = 0
      item.dataset.seconds = String(entry.seconds)

      const radio = document.createElement('span')
      radio.className = 'bs-timecode-radio'

      const timeLabel = document.createElement('span')
      timeLabel.textContent = formatTime(entry.seconds)

      const deleteBtn = document.createElement('span')
      deleteBtn.className = 'bs-timecode-delete'
      deleteBtn.textContent = '×'
      deleteBtn.title = 'Delete'
      deleteBtn.tabIndex = -1

      item.appendChild(radio)
      item.appendChild(timeLabel)
      item.appendChild(deleteBtn)
      histList.appendChild(item)
      historyItems.push(item)

      function removeItem(): void {
        if (!videoId) return
        deleteEntry(videoId, entry.seconds)
        const currentIdx = historyItems.indexOf(item)
        const focusNext = historyItems[currentIdx + 1] ?? historyItems[currentIdx - 1]
        item.remove()
        historyItems.splice(currentIdx, 1)
        if (historyItems.length === 0) histList.remove()
        if (focusNext) focusNext.focus()
        else { hh.focus(); hh.select() }
      }

      item.addEventListener('keydown', (e) => {
        e.stopPropagation()
        if (e.key === 'Escape') { hideTimecode(); return }
        if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); removeItem(); return }
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          hideTimecode()
          seekToTime(entry.seconds)
          return
        }
        if (e.key === 'Tab' && !e.shiftKey) {
          e.preventDefault()
          const next = historyItems[historyItems.indexOf(item) + 1]
          if (next) next.focus()
          else hh.focus()
          return
        }
        if (e.key === 'Tab' && e.shiftKey) {
          e.preventDefault()
          const prev = historyItems[historyItems.indexOf(item) - 1]
          if (prev) prev.focus()
          else { ss.focus(); ss.select() }
          return
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          historyItems[historyItems.indexOf(item) + 1]?.focus()
          return
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          const i = historyItems.indexOf(item)
          if (i === 0) { ss.focus(); ss.select() }
          else historyItems[i - 1].focus()
          return
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault()
          deleteBtn.focus()
          return
        }
      })

      deleteBtn.addEventListener('keydown', (e) => {
        e.stopPropagation()
        if (e.key === 'Escape') { hideTimecode(); return }
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); removeItem(); return }
        if (e.key === 'ArrowLeft') { e.preventDefault(); item.focus(); return }
      })

      item.addEventListener('focus', () => {
        historyItems.forEach(i => i.classList.remove('focused'))
        item.classList.add('focused')
      })
      item.addEventListener('blur', () => { item.classList.remove('focused') })
      item.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('.bs-timecode-delete')) { removeItem(); return }
        hideTimecode()
        seekToTime(entry.seconds)
      })

      deleteBtn.addEventListener('click', (e) => { e.stopPropagation(); removeItem() })
    })

    panel.appendChild(histList)
  }

  backdrop.appendChild(panel)
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) hideTimecode() })

  inputs.forEach((inp, idx) => {
    inp.addEventListener('keydown', (e) => {
      e.stopPropagation()
      if (e.key === 'Escape') { hideTimecode(); return }

      if (e.key === 'Enter') {
        const total = getSeconds()
        if (videoId) saveEntry(videoId, total)
        hideTimecode()
        seekToTime(total)
        return
      }

      if (e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault()
        if (inputs[idx + 1]) { inputs[idx + 1].focus(); inputs[idx + 1].select() }
        else if (historyItems[0]) historyItems[0].focus()
        return
      }

      if (e.key === 'Tab' && e.shiftKey) {
        e.preventDefault()
        if (inputs[idx - 1]) { inputs[idx - 1].focus(); inputs[idx - 1].select() }
        return
      }

      if (e.key === 'ArrowRight' && inp.selectionStart === inp.value.length && idx < inputs.length - 1) {
        e.preventDefault()
        inputs[idx + 1].focus(); inputs[idx + 1].setSelectionRange(0, 0)
        return
      }

      if (e.key === 'ArrowLeft' && inp.selectionStart === 0 && idx > 0) {
        e.preventDefault()
        const prev = inputs[idx - 1]
        prev.focus(); prev.setSelectionRange(prev.value.length, prev.value.length)
        return
      }

      if (e.key === 'Backspace' && inp.value === '' && idx > 0) {
        e.preventDefault()
        inputs[idx - 1].focus(); inputs[idx - 1].select()
        return
      }
    })

    inp.addEventListener('input', () => {
      inp.value = inp.value.replace(/\D/g, '').slice(0, 2)
      if (inp.value.length === 2 && idx < inputs.length - 1) {
        inputs[idx + 1].focus(); inputs[idx + 1].select()
      }
    })

    inp.addEventListener('focus', () => { inp.select() })
  })

  document.documentElement.appendChild(backdrop)
  requestAnimationFrame(() => { hh.focus(); hh.select() })

  function getSeconds(): number {
    const h = parseInt(hh.value || '0', 10)
    const m = parseInt(mm.value || '0', 10)
    const s = parseInt(ss.value || '0', 10)
    return h * 3600 + m * 60 + s
  }
}

function seekToTime(seconds: number): void {
  const video = document.querySelector('video')
  if (video) { video.currentTime = seconds; video.play(); return }
  const url = new URL(window.location.href)
  url.searchParams.set('t', `${seconds}s`)
  window.location.href = url.href
}

export function hideTimecode(): void {
  backdrop?.remove()
  backdrop = null
}

export function isTimecodeVisible(): boolean {
  return backdrop !== null
}
