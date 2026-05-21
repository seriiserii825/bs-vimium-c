let backdrop: HTMLElement | null = null

export function showPrompt(label: string, initialValue: string, onConfirm: (value: string) => void): void {
  if (backdrop) return

  backdrop = document.createElement('div')
  backdrop.id = 'bs-vimium-prompt-backdrop'

  const panel = document.createElement('div')
  panel.id = 'bs-vimium-prompt'

  const labelEl = document.createElement('div')
  labelEl.id = 'bs-vimium-prompt-label'
  labelEl.textContent = label

  const input = document.createElement('input')
  input.id = 'bs-vimium-prompt-input'
  input.type = 'text'
  input.value = initialValue
  input.spellcheck = false

  input.addEventListener('keydown', (e) => {
    e.stopPropagation()
    if (e.key === 'Enter') {
      const val = input.value.trim()
      hidePrompt()
      if (val) onConfirm(val)
    }
  })

  panel.appendChild(labelEl)
  panel.appendChild(input)
  backdrop.appendChild(panel)

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) hidePrompt()
  })

  document.documentElement.appendChild(backdrop)

  requestAnimationFrame(() => {
    input.focus()
    input.select()
  })
}

export function hidePrompt(): void {
  backdrop?.remove()
  backdrop = null
}

export function isPromptVisible(): boolean {
  return backdrop !== null
}
