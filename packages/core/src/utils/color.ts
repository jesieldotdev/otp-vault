const PALETTE = [
  '#f97316', '#a855f7', '#06b6d4', '#10b981',
  '#f43f5e', '#3b82f6', '#eab308', '#84cc16',
]

export function pickColor(seed: string): string {
  let h = 0
  for (const c of seed) h = ((h << 5) - h + c.charCodeAt(0)) | 0
  return PALETTE[Math.abs(h) % PALETTE.length]
}
