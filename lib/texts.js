// Classical text accessors — port of odin-gua src/gua/texts.odin.

import { TEXTS_ZH, TEXTS_EN, NAME_TRAD, NAME_LEGGE, TEXTS_ID } from './texts.generated.js'

export { TEXTS_ID, NAME_TRAD, NAME_LEGGE }

export const SLOT = { JUDGMENT: 0, L1: 1, L2: 2, L3: 3, L4: 4, L5: 5, L6: 6, YONG: 7 }

/** n 卦某一槽的原文；不存在（非乾坤的用九/用六、越界）时返回 ''。 */
export function text(n, slot, lang = 'zh') {
  if (n < 1 || n > 64) return ''
  const table = lang === 'en' ? TEXTS_EN : TEXTS_ZH
  return table[n][slot] ?? ''
}

export const judgmentText = (n, lang = 'zh') => text(n, SLOT.JUDGMENT, lang)
export const lineText = (n, y, lang = 'zh') => text(n, y + 1, lang)
export const yongText = (n, lang = 'zh') => text(n, SLOT.YONG, lang)
