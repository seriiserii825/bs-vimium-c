import { showToast } from "./toast";

const PREFERRED = ['hd1080', 'hd720']

const LABELS: Record<string, string> = {
  hd1080: '1080p',
  hd720:  '720p',
}

export async function applyBestQuality(): Promise<void> {
  if (!location.hostname.includes('youtube.com')) return

  const data: { levels: string[], current: string } | null = await new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'getYoutubeQualities' }, resolve)
  })

  if (!data?.levels?.length) return

  const best = PREFERRED.find(q => data.levels.includes(q))
  if (!best) return

  chrome.runtime.sendMessage({ type: 'setYoutubeQuality', quality: best })
  showToast(LABELS[best] ?? best, 'Quality: ')
}
