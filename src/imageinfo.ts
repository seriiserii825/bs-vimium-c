import { writeText } from './clipboard'

let panel: HTMLElement | null = null

export function showImageInfo(img: HTMLImageElement): void {
  hideImageInfo()

  const src = img.currentSrc || img.src
  const filename = decodeURIComponent(src.split('/').pop()?.split('?')[0] ?? 'image')
  const width = img.naturalWidth || img.width
  const height = img.naturalHeight || img.height
  const rect = img.getBoundingClientRect()

  panel = document.createElement('div')
  panel.id = 'bs-imginfo'

  // Header
  const header = document.createElement('div')
  header.id = 'bs-imginfo-header'
  const title = document.createElement('span')
  title.textContent = filename
  const closeBtn = document.createElement('button')
  closeBtn.id = 'bs-imginfo-close'
  closeBtn.textContent = '×'
  closeBtn.addEventListener('click', hideImageInfo)
  header.appendChild(title)
  header.appendChild(closeBtn)
  panel.appendChild(header)

  // Body
  const body = document.createElement('div')
  body.id = 'bs-imginfo-body'

  addRow(body, 'Size', width && height ? `${width} × ${height}` : '? × ?', '')
  addRow(body, 'Name', filename, '')
  addRow(body, 'Path', src, 'bs-imginfo-path')

  panel.appendChild(body)

  // Footer
  const footer = document.createElement('div')
  footer.id = 'bs-imginfo-footer'

  footer.appendChild(makeBtn('Copy path', () => writeText(src)))
  footer.appendChild(makeBtn('Copy name', () => writeText(filename)))

  panel.appendChild(footer)

  document.documentElement.appendChild(panel)

  // Position near image after layout
  const pw = panel.offsetWidth
  const ph = panel.offsetHeight
  const vw = window.innerWidth
  const vh = window.innerHeight

  let top = rect.bottom + 8
  if (top + ph > vh - 8) top = rect.top - ph - 8
  if (top < 8) top = 8

  let left = rect.left
  if (left + pw > vw - 8) left = vw - pw - 8
  if (left < 8) left = 8

  panel.style.top = `${Math.round(top)}px`
  panel.style.left = `${Math.round(left)}px`
}

function addRow(parent: HTMLElement, label: string, value: string, extraClass: string): void {
  const row = document.createElement('div')
  row.className = 'bs-imginfo-row'

  const lbl = document.createElement('span')
  lbl.className = 'bs-imginfo-label'
  lbl.textContent = label

  const val = document.createElement('span')
  val.className = 'bs-imginfo-val' + (extraClass ? ` ${extraClass}` : '')
  val.textContent = value
  val.title = value

  row.appendChild(lbl)
  row.appendChild(val)
  parent.appendChild(row)
}

function makeBtn(text: string, action: () => void): HTMLButtonElement {
  const btn = document.createElement('button')
  btn.className = 'bs-imginfo-btn'
  btn.textContent = text
  btn.addEventListener('click', () => {
    action()
    btn.textContent = 'Copied!'
    setTimeout(() => { btn.textContent = text }, 1500)
  })
  return btn
}

export function hideImageInfo(): void {
  panel?.remove()
  panel = null
}

export function isImageInfoVisible(): boolean {
  return panel !== null
}
