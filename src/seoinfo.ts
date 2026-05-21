let backdrop: HTMLElement | null = null

function getMeta(name: string): string {
  return (
    document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)?.content ??
    document.querySelector<HTMLMetaElement>(`meta[property="${name}"]`)?.content ??
    ''
  )
}

export function showSeoInfo(): void {
  if (backdrop) return

  const title = document.title
  const desc = getMeta('description')
  const ogTitle = getMeta('og:title')
  const ogDesc = getMeta('og:description')
  const ogImage = getMeta('og:image')
  const robots = getMeta('robots')
  const googlebot = getMeta('googlebot')
  const isNoindex = robots.toLowerCase().includes('noindex') || googlebot.toLowerCase().includes('noindex')

  backdrop = document.createElement('div')
  backdrop.id = 'bs-seo-backdrop'

  const panel = document.createElement('div')
  panel.id = 'bs-seo'

  const header = document.createElement('div')
  header.id = 'bs-seo-header'
  const heading = document.createElement('span')
  heading.textContent = 'SEO'
  const closeBtn = document.createElement('button')
  closeBtn.id = 'bs-seo-close'
  closeBtn.textContent = '×'
  closeBtn.addEventListener('click', hideSeoInfo)
  header.appendChild(heading)
  header.appendChild(closeBtn)
  panel.appendChild(header)

  const body = document.createElement('div')
  body.id = 'bs-seo-body'

  addRow(body, 'Title', title)
  addRow(body, 'Description', desc)
  addRow(body, 'OG Title', ogTitle)
  addRow(body, 'OG Desc', ogDesc)
  addRow(body, 'Robots', robots)
  if (googlebot) addRow(body, 'Googlebot', googlebot)
  addStatusRow(body, 'No-index', isNoindex ? 'yes' : 'no', isNoindex ? 'danger' : 'ok')

  if (ogImage) {
    const imgRow = document.createElement('div')
    imgRow.className = 'bs-seo-row bs-seo-img-row'

    const lbl = document.createElement('span')
    lbl.className = 'bs-seo-label'
    lbl.textContent = 'OG Image'

    const right = document.createElement('div')
    right.className = 'bs-seo-img-right'

    const img = document.createElement('img')
    img.className = 'bs-seo-thumb'
    img.src = ogImage
    img.alt = 'og:image'

    const url = document.createElement('span')
    url.className = 'bs-seo-val bs-seo-url'
    url.textContent = ogImage
    url.title = ogImage

    right.appendChild(img)
    right.appendChild(url)
    imgRow.appendChild(lbl)
    imgRow.appendChild(right)
    body.appendChild(imgRow)
  } else {
    addRow(body, 'OG Image', '—')
  }

  panel.appendChild(body)
  backdrop.appendChild(panel)

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) hideSeoInfo()
  })

  document.documentElement.appendChild(backdrop)
}

function addStatusRow(parent: HTMLElement, label: string, text: string, status: 'ok' | 'danger'): void {
  const row = document.createElement('div')
  row.className = 'bs-seo-row'

  const lbl = document.createElement('span')
  lbl.className = 'bs-seo-label'
  lbl.textContent = label

  const badge = document.createElement('span')
  badge.className = `bs-seo-status bs-seo-status-${status}`
  badge.textContent = text

  row.appendChild(lbl)
  row.appendChild(badge)
  parent.appendChild(row)
}

function addRow(parent: HTMLElement, label: string, value: string): void {
  const row = document.createElement('div')
  row.className = 'bs-seo-row'

  const lbl = document.createElement('span')
  lbl.className = 'bs-seo-label'
  lbl.textContent = label

  const val = document.createElement('span')
  val.className = 'bs-seo-val'
  val.textContent = value || '—'
  val.title = value

  row.appendChild(lbl)
  row.appendChild(val)
  parent.appendChild(row)
}

export function hideSeoInfo(): void {
  backdrop?.remove()
  backdrop = null
}

export function isSeoInfoVisible(): boolean {
  return backdrop !== null
}
