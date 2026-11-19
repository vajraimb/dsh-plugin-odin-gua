// 取辞 — port of odin-gua src/gua/reading.odin.
//
// 按朱熹《易学启蒙·考变占》的常用规则，由动爻数决定读哪段原文：
//   0 爻动：本卦卦辞
//   1 爻动：本卦该动爻爻辞
//   2 爻动：本卦两动爻爻辞，以上爻为主
//   3 爻动：本卦与之卦卦辞，本卦为贞、之卦为悔
//   4 爻动：之卦两不变爻爻辞，以下爻为主
//   5 爻动：之卦不变爻爻辞
//   6 爻动：乾占用九、坤占用六；余卦占之卦卦辞

import { ALL, QIAN, KUN, number, bian, lineName, isYang } from './hexagram.js'
import { NAME_ZH } from './tables.js'
import { judgmentText, lineText, yongText } from './texts.js'

export const SOURCE = { PRIMARY: 'primary', CHANGED: 'changed' }
export const KIND = { JUDGMENT: 'judgment', LINE: 'line', YONG: 'yong' }

/** @returns {{movingCount:number, rule:string, items:Array<{source:string,kind:string,line:number,main:boolean}>}} */
export function reading(g, moving) {
  let cnt = 0
  for (let y = 0; y < 6; y += 1) if ((moving >> y) & 1) cnt += 1
  const items = []
  let rule = ''
  const push = (it) => items.push({ line: -1, main: false, ...it })

  switch (cnt) {
    case 0:
      push({ source: SOURCE.PRIMARY, kind: KIND.JUDGMENT, main: true })
      rule = '无动爻：占本卦卦辞'
      break
    case 1:
    case 2: {
      let top = 0
      for (let y = 0; y < 6; y += 1) if ((moving >> y) & 1) top = y
      for (let y = 0; y < 6; y += 1) {
        if ((moving >> y) & 1) push({ source: SOURCE.PRIMARY, kind: KIND.LINE, line: y, main: y === top })
      }
      rule = cnt === 1 ? '一爻动：占本卦动爻爻辞' : '二爻动：占本卦两动爻爻辞，以上爻为主'
      break
    }
    case 3:
      push({ source: SOURCE.PRIMARY, kind: KIND.JUDGMENT, main: true })
      push({ source: SOURCE.CHANGED, kind: KIND.JUDGMENT })
      rule = '三爻动：占本卦与之卦卦辞，本卦为贞、之卦为悔'
      break
    case 4:
    case 5: {
      const still = ALL & ~moving
      let low = 5
      for (let y = 0; y < 6; y += 1) {
        if ((still >> y) & 1) {
          low = y
          break
        }
      }
      for (let y = 0; y < 6; y += 1) {
        if ((still >> y) & 1) push({ source: SOURCE.CHANGED, kind: KIND.LINE, line: y, main: y === low })
      }
      rule = cnt === 4 ? '四爻动：占之卦两不变爻爻辞，以下爻为主' : '五爻动：占之卦不变爻爻辞'
      break
    }
    case 6:
      if (g === QIAN || g === KUN) {
        push({ source: SOURCE.PRIMARY, kind: KIND.YONG, main: true })
        rule = g === QIAN ? '六爻皆动：乾占用九' : '六爻皆动：坤占用六'
      } else {
        push({ source: SOURCE.CHANGED, kind: KIND.JUDGMENT, main: true })
        rule = '六爻皆动：占之卦卦辞'
      }
      break
    default:
      break
  }
  return { movingCount: cnt, rule, items }
}

/** 取辞项对应的卦体（本卦或之卦）。 */
export const hexOf = (item, g, m) => (item.source === SOURCE.PRIMARY ? g : bian(g, m))

/** 人读的标签，如“本卦 九三（主）”“之卦 卦辞”。 */
export function focusLabel(item, g, m) {
  const src = item.source === SOURCE.PRIMARY ? '本卦' : '之卦'
  const h = hexOf(item, g, m)
  let what
  if (item.kind === KIND.JUDGMENT) what = '卦辞'
  else if (item.kind === KIND.YONG) what = h === QIAN ? '用九' : '用六'
  else what = lineName(item.line, isYang(h, item.line))
  const main = item.main ? '（主）' : ''
  return `${src}${NAME_ZH[number(h)]} ${what}${main}`
}

/** 取辞项对应的原文。 */
export function focusText(item, g, m, lang = 'zh') {
  const h = hexOf(item, g, m)
  const n = number(h)
  if (item.kind === KIND.JUDGMENT) return judgmentText(n, lang)
  if (item.kind === KIND.LINE) return lineText(n, item.line, lang)
  return yongText(n, lang)
}

/** “本卦 九三（主）；之卦 卦辞” */
export const focusSummary = (r, g, m) => r.items.map((it) => focusLabel(it, g, m)).join('；')
