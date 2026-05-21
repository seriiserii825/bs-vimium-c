import './hints.css'
import { beginHints, typeHint, endHints, HintSession } from './hints'

let session: HintSession | null = null

function isEditing(): boolean {
  const el = document.activeElement
  if (!el) return false
  const tag = el.tagName.toLowerCase()
  return (
    tag === 'input' ||
    tag === 'textarea' ||
    tag === 'select' ||
    (el as HTMLElement).isContentEditable
  )
}

// capture:true so we run before the page's own keydown handlers
document.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return

  if (session) {
    e.preventDefault()
    e.stopPropagation()
    const result = typeHint(session, e.key)
    if (result !== 'continue') {
      endHints(session)
      session = null
    }
    return
  }

  if (isEditing()) return

  if (e.key === 'f' || e.key === 'F') {
    e.preventDefault()
    session = beginHints(e.key as 'f' | 'F')
  }
}, true)
