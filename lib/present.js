// Presentation helpers — port of the text shapes produced by odin-gua
// (src/main.odin, src/review.odin, src/gua/render.odin).

import { NAME_ZH, PINYIN, NAME_EN, TRIGRAMS } from './tables.js'
import { number, symbol, binaryString, title, draw, lineName, hu, cuo, zong, bian, isYang } from './hexagram.js'
import { reading, focusLabel, focusText, hexOf, SOURCE, KIND } from './reading.js'
import { judgmentText, lineText, yongText, NAME_TRAD, NAME_LEGGE } from './texts.js'
import { coinsLine } from './cast.js'
import { shortTitle } from './hexagram.js'

export function trigramJson(i) {
  const t = TRIGRAMS[i]
  return { name_zh: t.zh, symbol: t.symbol, name_en: t.en, nature: t.nature, pinyin: t.pinyin }
}

export function hexJson(g) {
  const n = number(g)
  return {
    number: n,
    symbol: symbol(n),
    name_zh: NAME_ZH[n],
    pinyin: PINYIN[n],
    name_en: NAME_EN[n],
    name_trad: NAME_TRAD[n],
    name_legge: NAME_LEGGE[n],
    binary: binaryString(g),
    judgment_zh: judgmentText(n),
    judgment_en: judgmentText(n, 'en'),
    upper: trigramJson(g >> 3),
    lower: trigramJson(g & 7),
  }
}

export function positions(m) {
  const out = []
  for (let y = 0; y < 6; y += 1) if ((m >> y) & 1) out.push(y + 1)
  return out
}

export function movingNames(g, m) {
  const out = []
  for (let y = 0; y < 6; y += 1) if ((m >> y) & 1) out.push(lineName(y, isYang(g, y)))
  return out.join('、')
}

export function readingJson(g, m) {
  const r = reading(g, m)
  return {
    moving_count: r.movingCount,
    rule: r.rule,
    focus: r.items.map((it) => {
      const h = hexOf(it, g, m)
      return {
        hexagram: number(h),
        source: it.source === SOURCE.PRIMARY ? 'primary' : 'changed',
        kind: it.kind,
        line: it.kind === KIND.LINE ? it.line + 1 : '',
        line_name: it.kind === KIND.LINE ? lineName(it.line, isYang(h, it.line)) : '',
        main: it.main,
        label: focusLabel(it, g, m),
        text_zh: focusText(it, g, m, 'zh'),
        text_en: focusText(it, g, m, 'en'),
      }
    }),
  }
}

/** 取辞项逐条列出，附中英原文。 */
export function writeFocus(r, g, m) {
  return r.items
    .map((it) => `  → ${focusLabel(it, g, m)}\n    ${focusText(it, g, m, 'zh')}\n    ${focusText(it, g, m, 'en')}`)
    .join('\n')
}

export const STANCES = ['favorable', 'unfavorable', 'mixed', 'unclear']

export function stanceZh(s) {
  switch (s) {
    case 'favorable':
      return '偏吉'
    case 'unfavorable':
      return '偏凶'
    case 'mixed':
      return '吉凶参半'
    case 'unclear':
      return '不明'
    default:
      return s
  }
}

/** 卦例标题：䷈ 小畜 之 ䷍ 大有 */
export function caseTitle(entry) {
  const p = Math.min(Math.max(Number(entry.primary) || 1, 1), 64)
  const changed = entry.changed === null || entry.changed === undefined ? null : Math.min(Math.max(Number(entry.changed) || 1, 1), 64)
  return shortTitle(p, changed)
}

/** 待解读 / 待复盘 YYYY-MM-DD / 已到复盘日 / 已复盘 / 渎 */
export function caseStatus(c, today) {
  if (c.entry.du === true) return '渎（不计统计）'
  if (c.reviewed) return '已复盘'
  if (c.note === null) return '待解读'
  const d = c.note.review_after ?? ''
  if (d <= today) return `已到复盘日（${d}）`
  return `待复盘 ${d}`
}

export function dueJson(dueCases) {
  return dueCases.map((c) => ({
    id: c.entry.id,
    question: c.entry.question,
    review_after: c.note.review_after,
    prediction: c.note.prediction,
  }))
}

export function writeDue(dueCases) {
  if (dueCases.length === 0) return ''
  let s = `\n\n复盘提醒：${dueCases.length} 卦已到复盘日，请顺便问用户结果如何：`
  for (const c of dueCases) {
    s += `\n  · ${c.entry.id}（${c.note.review_after}）问：${c.entry.question}\n    当时预测：${c.note.prediction}`
  }
  return s
}

/**
 * cast 的正文。
 * @param {object} p
 */
export function castText({ id, methodZh, ts, question, g, values, coins, m, reading: r, du, prevId, dueCases, saved }) {
  const lines = []
  lines.push(`起卦 ${id} · ${methodZh} · ${ts}`)
  lines.push(`问：${question}`)
  lines.push('')
  lines.push(`本卦 ${title(g)}`)
  lines.push(draw(g, values))
  const cl = coinsLine(coins)
  if (cl) lines.push(cl)
  if (m) {
    lines.push(`动爻：${movingNames(g, m)}`)
    lines.push(`之卦 ${title(bian(g, m))}`)
  } else {
    lines.push('动爻：无')
  }
  lines.push(`互卦 ${title(hu(g))}`)
  lines.push('')
  lines.push(`取辞（朱熹）：${r.rule}`)
  lines.push(writeFocus(r, g, m))
  if (du) lines.push('', `此卦为重摇（原卦 ${prevId}），记为“渎”，不计入统计。`)
  lines.push('\n仅供自我反思，不构成决策依据。')
  lines.push(`\n解读后请调用 annotate(id=${id}) 记下倾向、把握与可检验的预测。`)
  const due = writeDue(dueCases)
  if (due) lines.push(due)
  if (!saved) lines.push(`\n（注意：日志写入失败：请检查 GUA_HOME 是否可写）`)
  return lines.join('\n')
}

export function lookupText(hits) {
  return hits
    .map((h) => {
      const n = number(h)
      return `${title(h)}\n${draw(h)}\n卦辞：${judgmentText(n)}\n${judgmentText(n, 'en')}`
    })
    .join('\n\n')
}

export function relationsText(g, m) {
  let s = `本卦 ${title(g)}\n互卦 ${title(hu(g))}\n错卦 ${title(cuo(g))}\n综卦 ${title(zong(g))}`
  if (m) {
    const r = reading(g, m)
    s += `\n动爻 ${movingNames(g, m)} → 之卦 ${title(bian(g, m))}\n取辞（朱熹）：${r.rule}\n${writeFocus(r, g, m)}`
  }
  return s
}

export function journalText(rows, dueCount, today, onlyDue, path) {
  if (rows.length === 0) {
    return onlyDue ? '没有到期待复盘的卦例。' : `还没有起卦记录（${path}）。`
  }
  const out = []
  if (dueCount > 0 && !onlyDue) out.push(`${dueCount} 卦已到复盘日（journal due:true 查看）。`, '')
  rows.forEach((c, i) => {
    if (i > 0) out.push('')
    const o = c.entry
    const ts = String(o.ts ?? '')
    out.push(`${ts.slice(0, 16)}  ${o.id}  ${caseTitle(o)}  [${caseStatus(c, today)}]\n    问：${o.question}`)
    if (c.note !== null) {
      const conf = Number(c.note.confidence) * 100
      out.push(`    解读：${stanceZh(c.note.stance)}，把握 ${Math.round(conf)}%；预测：${c.note.prediction}`)
    }
  })
  return out.join('\n')
}

export function annotateText({ id, stance, confidence, prediction, reviewAfter, du }) {
  let s = `已记下 ${id} 的解读：${stanceZh(stance)}，把握 ${Math.round(confidence * 100)}%\n预测：${prediction}\n复盘日：${reviewAfter}（到期后我会在起卦或查日志时提醒）`
  if (du) s += '\n（此卦为重摇所得，记为“渎”，复盘时不计入统计。）'
  return s
}

export { judgmentText, lineText, yongText, shortTitle }
