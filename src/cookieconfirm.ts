type CookieInfo = { name: string; value: string; domain: string }

let panel: HTMLElement | null = null

export function showCookieConfirm(url: string, cookies: CookieInfo[]): void {
  if (panel) return

  const hostname = new URL(url).hostname

  panel = document.createElement('div')
  panel.id = 'bs-cookieconfirm-backdrop'

  const dialog = document.createElement('div')
  dialog.id = 'bs-cookieconfirm'

  // Header
  const header = document.createElement('div')
  header.id = 'bs-cookieconfirm-header'
  header.textContent = `Delete all cookies for ${hostname}?`
  dialog.appendChild(header)

  // Cookie list
  const list = document.createElement('div')
  list.id = 'bs-cookieconfirm-list'

  if (cookies.length === 0) {
    const empty = document.createElement('div')
    empty.className = 'bs-cookieconfirm-empty'
    empty.textContent = 'No cookies found for this domain.'
    list.appendChild(empty)
  } else {
    for (const c of cookies) {
      const row = document.createElement('div')
      row.className = 'bs-cookieconfirm-row'

      const name = document.createElement('span')
      name.className = 'bs-cookieconfirm-name'
      name.textContent = c.name

      const val = document.createElement('span')
      val.className = 'bs-cookieconfirm-value'
      val.textContent = c.value.length > 40 ? c.value.slice(0, 40) + '…' : c.value

      row.appendChild(name)
      row.appendChild(val)
      list.appendChild(row)
    }
  }

  dialog.appendChild(list)

  // Footer
  const footer = document.createElement('div')
  footer.id = 'bs-cookieconfirm-footer'

  const count = document.createElement('span')
  count.id = 'bs-cookieconfirm-count'
  count.textContent = `${cookies.length} cookie${cookies.length !== 1 ? 's' : ''}`
  footer.appendChild(count)

  const btnCancel = document.createElement('button')
  btnCancel.className = 'bs-cookieconfirm-btn'
  btnCancel.textContent = 'Cancel'
  btnCancel.addEventListener('click', hideCookieConfirm)

  const btnDelete = document.createElement('button')
  btnDelete.className = 'bs-cookieconfirm-btn bs-cookieconfirm-btn-danger'
  btnDelete.textContent = 'Delete & Refresh'
  btnDelete.disabled = cookies.length === 0
  btnDelete.addEventListener('click', () => {
    hideCookieConfirm()
    chrome.runtime.sendMessage({ type: 'deleteCookiesRefresh', url })
  })

  footer.appendChild(btnCancel)
  footer.appendChild(btnDelete)
  dialog.appendChild(footer)

  panel.appendChild(dialog)
  panel.addEventListener('click', (e) => { if (e.target === panel) hideCookieConfirm() })

  document.documentElement.appendChild(panel)
}

export function hideCookieConfirm(): void {
  panel?.remove()
  panel = null
}

export function isCookieConfirmVisible(): boolean {
  return panel !== null
}
