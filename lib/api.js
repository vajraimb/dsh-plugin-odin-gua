// Tool business logic, independent of the DSH tool-definition layer so it can be
// tested and reused without a running Harness.

import { BY_NUMBER, number, hu, cuo, zong, bian } from './hexagram.js'
import { NAME_ZH, PINYIN, NAME_EN } from './tables.js'
import { castWithSeed, primary, moving, valuesString, coinsString, coinsJson, coinsLine, randomU64 } from './cast.js'
import { reading } from './reading.js'
import { TEXTS_ID } from './texts.js'
import * as journal from './journal.js'
import {
  hexJson,
  positions,
  readingJson,
  castText,
  lookupText,
  relationsText,
  journalText,
  annotateText,
  caseTitle,
  caseStatus,
  dueJson,
  STANCES,
} from './present.js'

/** 与上游 odin-gua 引擎对应的版本；写入日志的 server 字段保持同一语义。 */
export const ENGINE_VERSION = '0.4.1'
export const CLIENT = 'dsh'
export const DEFAULT_RECAST_HOURS = 72
export const DEFAULT_REVIEW_DAYS = 14

export class ToolError extends Error {}

const fail = (msg) => {
  throw new ToolError(msg)
}

function recastHours() {
  const raw = process.env.GUA_RECAST_HOURS
  if (raw !== undefined && raw !== '') {
    const v = Number(raw)
    if (Number.isFinite(v) && v >= 0) return v
  }
  return DEFAULT_RECAST_HOURS
}

function seedForCast() {
  const raw = process.env.GUA_SEED
  if (raw !== undefined && raw !== '') {
    try {
      return BigInt(raw)
    } catch {
      /* fall through to a random seed */
    }
  }
  return randomU64()
}

// ---------- 查找 ----------

function normalize(s) {
  return s.trim().toLowerCase().replaceAll(' ', '').replaceAll('ü', 'u').replaceAll('v', 'u')
}

export function find(query) {
  const qs = (query ?? '').trim()
  if (qs === '') return []
  // 六位二进制要先于纯数字判断：全是 0/1 的串也会被 /^\d+$/ 吃掉（上游
  // odin-gua 把这一段放在数字之后，等于永远走不到，这里按文档意图修正）。
  if (qs.length === 6 && /^[01]{6}$/.test(qs)) {
    let g = 0
    for (let i = 0; i < 6; i += 1) if (qs[i] === '1') g |= 1 << i
    return [g]
  }
  if (/^\d+$/.test(qs)) {
    const n = Number(qs)
    return n >= 1 && n <= 64 ? [BY_NUMBER[n]] : []
  }
  if (Array.from(qs).length === 1) {
    const cp = qs.codePointAt(0)
    if (cp >= 0x4dc0 && cp <= 0x4dff) return [BY_NUMBER[cp - 0x4dc0 + 1]]
  }
  const key = normalize(qs)
  const keyNoThe = key.startsWith('the') ? key.slice(3) : key
  const out = []
  for (let n = 1; n <= 64; n += 1) {
    const en = normalize(NAME_EN[n])
    const enNoThe = en.startsWith('the') ? en.slice(3) : en
    if (qs === NAME_ZH[n] || key === normalize(PINYIN[n]) || key === en || keyNoThe === enNoThe) out.push(BY_NUMBER[n])
  }
  return out
}

export function findOne(query) {
  const hits = find(query)
  if (hits.length === 0) return { hex: 0, err: `找不到卦：${query}` }
  if (hits.length === 1) return { hex: hits[0], err: '' }
  const names = hits.map((h) => `${number(h)} ${NAME_ZH[number(h)]}`).join('、')
  return { hex: 0, err: `“${query}”对应多卦，请指明：${names}` }
}

// ---------- cast ----------

export function cast(args = {}) {
  const question = (args.question ?? '').trim()
  if (question === '') fail('cast 需要 question：请把用户所问之事提炼成一句话再起卦。')
  const method = args.method ?? 'coins'
  if (method !== 'coins' && method !== 'yarrow') fail('method 只能是 coins 或 yarrow')

  const { cases } = journal.loadCases()
  const recast = args.recast === true
  const reason = (args.reason ?? '').trim()
  const { prev, found } = journal.findRecentSame(cases, question, recastHours())

  if (found && !recast) {
    const pid = prev.entry.id ?? ''
    const digits = typeof prev.entry.coins === 'string' ? prev.entry.coins : ''
    const lines = [
      `此问已于 ${prev.entry.ts ?? ''} 起过卦：${pid} ${caseTitle(prev.entry)}`,
      `原问：${prev.entry.question ?? ''}`,
      '',
      '初筮告，再三渎：不重摇，请沿用原卦解读（journal 可查看）。若情况确已改变，可带 recast:true 与 reason 重起，新卦记为“渎”、不计入统计。',
    ]
    const cl = coinsLine(digits)
    if (cl) lines.push(cl)
    return {
      text: lines.join('\n'),
      data: {
        duplicate_of: pid,
        journaled: false,
        cast: false,
        animate: false,
        method: prev.entry.method ?? '',
        values: prev.entry.values ?? '',
        coins: coinsJson(digits),
      },
    }
  }
  if (found && reason === '') fail('recast 需要 reason：说明情况有何变化')
  const du = found && recast

  const seed = seedForCast()
  const rolled = castWithSeed(seed, method)
  const digits = coinsString(rolled)
  const g = primary(rolled)
  const m = moving(rolled)
  const z = bian(g, m)
  const ts = journal.nowString()
  const id = journal.newId(ts)
  const seedHex = seed.toString(16).padStart(16, '0')

  const entry = {
    kind: 'cast',
    id,
    ts,
    question,
    method,
    seed: seedHex,
    values: valuesString(rolled),
    coins: digits,
    primary: number(g),
    changed: m ? number(z) : null,
    moving: positions(m),
    client: CLIENT,
    server: ENGINE_VERSION,
    texts: TEXTS_ID,
    du: du ? true : '',
    duplicate_of: du ? (prev.entry.id ?? '') : '',
    reason: du ? reason : '',
  }
  const saved = journal.appendLine(JSON.stringify(entry))

  const r = reading(g, m)
  const due = journal.due(cases, journal.today())
  const text = castText({
    id,
    methodZh: method === 'coins' ? '三钱法' : '大衍筮法',
    ts,
    question,
    g,
    values: rolled.values,
    coins: digits,
    m,
    reading: r,
    du,
    prevId: du ? prev.entry.id : '',
    dueCases: due,
    saved,
  })

  return {
    text,
    data: {
      id,
      ts,
      question,
      method,
      seed: seedHex,
      values: valuesString(rolled),
      coins: coinsJson(digits),
      animate: digits !== '',
      primary: hexJson(g),
      moving: positions(m),
      changed: m ? hexJson(z) : null,
      nuclear: hexJson(hu(g)),
      reading: readingJson(g, m),
      journaled: saved,
      du: du ? true : '',
      due_reviews: due.length > 0 ? dueJson(due) : [],
    },
  }
}

// ---------- lookup / relations ----------

export function lookup(args = {}) {
  const hits = find(args.query ?? '')
  if (hits.length === 0) fail(`找不到卦：${args.query ?? ''}`)
  return { text: lookupText(hits), data: { results: hits.map(hexJson) } }
}

export function relations(args = {}) {
  const { hex, err } = findOne(args.query ?? '')
  if (err) fail(err)
  let m = 0
  for (const raw of args.moving ?? []) {
    const p = Number(raw)
    if (!Number.isInteger(p) || p < 1 || p > 6) fail('moving 里的爻位必须是 1 到 6 的整数')
    m |= 1 << (p - 1)
  }
  return {
    text: relationsText(hex, m),
    data: {
      hexagram: hexJson(hex),
      nuclear: hexJson(hu(hex)),
      inverse: hexJson(cuo(hex)),
      reverse: hexJson(zong(hex)),
      moving: m ? positions(m) : [],
      changed: m ? hexJson(bian(hex, m)) : null,
      reading: m ? readingJson(hex, m) : null,
    },
  }
}

// ---------- journal / annotate ----------

export function listJournal(args = {}) {
  const limit = Math.min(Math.max(Number(args.limit ?? 10) || 10, 1), 50)
  const onlyDue = args.due === true
  const { cases } = journal.loadCases()
  const today = journal.today()
  const due = journal.due(cases, today)
  const rows = onlyDue ? due.slice(0, limit) : cases.slice(-limit).reverse()
  return {
    text: journalText(rows, due.length, today, onlyDue, journal.filePath()),
    data: {
      entries: rows.map((c) => ({ ...c.entry, status: caseStatus(c, today), annotation: c.note })),
      due_count: due.length,
      path: journal.filePath(),
    },
  }
}

export function annotate(args = {}) {
  const id = (args.id ?? '').trim()
  if (id === '') fail('annotate 需要 id（cast 返回的卦例 id，如 g20261112-3fa9c2）')
  const { cases, index } = journal.loadCases()
  const i = index.get(id)
  if (i === undefined) fail(`日志里没有卦例 ${id}`)
  const cs = cases[i]
  if (cs.note !== null) {
    fail(`${id} 已于 ${cs.note.ts ?? ''} 写过解读，落笔不改（复盘才有意义）。当时的预测：${cs.note.prediction ?? ''}`)
  }

  const stance = args.stance ?? ''
  if (!STANCES.includes(stance)) fail('stance 只能是 favorable / unfavorable / mixed / unclear')
  const confidence = Number(args.confidence)
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    fail('confidence 必须是 0 到 1 之间的数（模型对这个倾向的把握）')
  }
  const prediction = (args.prediction ?? '').trim()
  if (prediction === '') fail('prediction 必填：写一句将来能对照结果检验的具体判断，例如“两周内对方会让步，但价格不到预期”')
  const summary = (args.summary ?? '').trim()

  const today = journal.today()
  let reviewAfter = (args.review_after ?? '').trim()
  if (reviewAfter === '') {
    let days = DEFAULT_REVIEW_DAYS
    const raw = args.review_in_days
    if (raw !== undefined && raw !== null && raw !== '') {
      const v = Math.trunc(Number(raw))
      if (Number.isFinite(v)) days = Math.min(Math.max(v, 1), 3650)
    }
    reviewAfter = journal.dateAfterDays(days)
  } else if (!journal.validDate(reviewAfter)) {
    fail('review_after 格式应为 YYYY-MM-DD')
  } else if (reviewAfter < today) {
    fail(`review_after 不能早于今天（${today}）`)
  }

  const ts = journal.nowString()
  const entry = {
    kind: 'annotation',
    cast_id: id,
    ts,
    stance,
    confidence: Math.round(confidence * 100) / 100,
    prediction,
    summary,
    review_after: reviewAfter,
    client: CLIENT,
    server: ENGINE_VERSION,
  }
  if (!journal.appendLine(JSON.stringify(entry))) fail(`日志写入失败：${journal.filePath()}`)

  const du = cs.entry.du === true
  return {
    text: annotateText({ id, stance, confidence, prediction, reviewAfter, du }),
    data: { id, stance, confidence: entry.confidence, review_after: reviewAfter, saved: true },
  }
}
