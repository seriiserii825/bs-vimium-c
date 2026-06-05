let backdrop: HTMLElement | null = null

export function showTimecode(): void {
  if (backdrop) return

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
  backdrop.appendChild(panel)

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) hideTimecode()
  })

  inputs.forEach((inp, idx) => {
    inp.addEventListener('keydown', (e) => {
      e.stopPropagation()

      if (e.key === 'Escape') { hideTimecode(); return }

      if (e.key === 'Enter') {
        const total = getSeconds()
        hideTimecode()
        seekToTime(total)
        return
      }

      if (e.key === 'Tab') {
        e.preventDefault()
        const next = e.shiftKey ? inputs[idx - 1] : inputs[idx + 1]
        if (next) { next.focus(); next.select() }
        return
      }

      if (e.key === 'ArrowRight' && inp.selectionStart === inp.value.length && idx < inputs.length - 1) {
        e.preventDefault()
        inputs[idx + 1].focus()
        inputs[idx + 1].setSelectionRange(0, 0)
        return
      }

      if (e.key === 'ArrowLeft' && inp.selectionStart === 0 && idx > 0) {
        e.preventDefault()
        const prev = inputs[idx - 1]
        prev.focus()
        prev.setSelectionRange(prev.value.length, prev.value.length)
        return
      }

      if (e.key === 'Backspace' && inp.value === '' && idx > 0) {
        e.preventDefault()
        inputs[idx - 1].focus()
        inputs[idx - 1].select()
        return
      }
    })

    inp.addEventListener('input', () => {
      inp.value = inp.value.replace(/\D/g, '').slice(0, 2)
      if (inp.value.length === 2 && idx < inputs.length - 1) {
        inputs[idx + 1].focus()
        inputs[idx + 1].select()
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
  if (video) {
    video.currentTime = seconds
    return
  }
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
