// 卦例日志 — port of odin-gua src/journal/journal.odin and cases.odin.
//
// $GUA_HOME/journal.jsonl，默认 ~/.gua/journal.jsonl。只追加、不改写。
// 文件格式与 odin-gua 完全相同：同一台机器上，MCP 客户端与 DSH 插件可以共用
// 同一份卦例历史（id、ts、kind、cast_id 字段都一致）。

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { randomBytes } from 'node:crypto'

export const FILE_NAME = 'journal.jsonl'
const RECENT_LIMIT = 2000

export function dir() {
  return process.env.GUA_HOME || path.join(os.homedir(), '.gua')
}

export function filePath() {
  return path.join(dir(), FILE_NAME)
}

// ---------- 时区与时间 ----------

function zone() {
  return process.env.GUA_TZ || process.env.TZ || ''
}

function wallClock(date, tz) {
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })
  const p = {}
  for (const part of dtf.formatToParts(date)) p[part.type] = part.value
  return { y: +p.year, mo: +p.month, d: +p.day, h: +p.hour, mi: +p.minute, s: +p.second }
}

function localWall(date) {
  return {
    y: date.getFullYear(),
    mo: date.getMonth() + 1,
    d: date.getDate(),
    h: date.getHours(),
    mi: date.getMinutes(),
    s: date.getSeconds(),
  }
}

function offsetMinutes(date, tz) {
  if (!tz) return -date.getTimezoneOffset()
  const w = wallClock(date, tz)
  const asUtc = Date.UTC(w.y, w.mo - 1, w.d, w.h, w.mi, w.s)
  return Math.round((asUtc - date.getTime()) / 60000)
}

const pad2 = (n) => String(n).padStart(2, '0')

/** RFC3339 本地时间戳，如 2026-11-19T11:34:36+08:00。 */
export function nowString(date = new Date()) {
  const tz = zone()
  const w = tz ? wallClock(date, tz) : localWall(date)
  const off = offsetMinutes(date, tz)
  const sign = off < 0 ? '-' : '+'
  const abs = Math.abs(off)
  return `${w.y}-${pad2(w.mo)}-${pad2(w.d)}T${pad2(w.h)}:${pad2(w.mi)}:${pad2(w.s)}${sign}${pad2(Math.floor(abs / 60))}:${pad2(abs % 60)}`
}

export function today() {
  const s = nowString()
  return s.slice(0, 10)
}

/** 今天之后第 n 天（当地日历）。 */
export function dateAfterDays(n) {
  const tz = zone()
  const base = tz ? wallClock(new Date(), tz) : localWall(new Date())
  const d = new Date(Date.UTC(base.y, base.mo - 1, base.d + n))
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`
}

export function validDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const d = new Date(`${s}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s
}

/** 距 ts（RFC3339）过去了多少小时；解析失败返回很大的数。 */
export function hoursSince(ts) {
  const t = Date.parse(ts)
  if (Number.isNaN(t)) return 1e9
  return (Date.now() - t) / 3600000
}

// ---------- 写入 ----------

/** 追加一行；日志含个人问题，权限 0600。 */
export function appendLine(line) {
  try {
    fs.mkdirSync(dir(), { recursive: true, mode: 0o700 })
    const fd = fs.openSync(filePath(), 'a', 0o600)
    try {
      fs.writeSync(fd, `${line}\n`)
    } finally {
      fs.closeSync(fd)
    }
    return true
  } catch {
    return false
  }
}

/** 卦例 id：g + 本地日期 + 6 位随机十六进制，如 g20261111-3fa9c2。 */
export function newId(ts) {
  const date = ts.length >= 10 ? `${ts.slice(0, 4)}${ts.slice(5, 7)}${ts.slice(8, 10)}` : '00000000'
  return `g${date}-${randomBytes(3).toString('hex')}`
}

// ---------- 读取 ----------

/** 全部卦例，按起卦先后排列。 */
export function loadCases() {
  const cases = []
  const index = new Map()
  let data
  try {
    data = fs.readFileSync(filePath(), 'utf8')
  } catch {
    return { cases, index }
  }
  for (const raw of data.split(/\r?\n/)) {
    const line = raw.trim()
    if (line === '') continue
    let o
    try {
      o = JSON.parse(line)
    } catch {
      continue
    }
    if (o === null || typeof o !== 'object' || Array.isArray(o)) continue
    if (o.kind === 'cast') {
      index.set(o.id, cases.length)
      cases.push({ entry: o, note: null, reviewed: false })
    } else if (o.kind === 'annotation' || o.kind === 'review') {
      const i = index.get(o.cast_id)
      if (i === undefined) continue
      if (o.kind === 'annotation') {
        if (cases[i].note === null) cases[i].note = o // 只认第一条：预测落笔不改
      } else {
        cases[i].reviewed = true
      }
    }
  }
  return { cases, index }
}

/** 已到复盘日、尚未复盘的卦例（新的在前）。 */
export function due(cases, todayStr) {
  const out = []
  for (let i = cases.length - 1; i >= 0; i -= 1) {
    const c = cases[i]
    if (c.note === null || c.reviewed) continue
    const d = c.note.review_after
    if (typeof d === 'string' && d !== '' && d <= todayStr) out.push(c)
  }
  return out
}

/** 最近的起卦记录（新的在前）。 */
export function recentCasts(n) {
  const { cases } = loadCases()
  return cases.slice(-n).reverse()
}

// ---------- 问题相似度（防重摇） ----------

/** 去掉空白与标点、转小写。 */
export function normalizeQuestion(s) {
  return s.replace(/[\s\p{P}]/gu, '').toLowerCase()
}

/** 字二元组 Dice 系数，0..1；完全相同为 1。 */
export function similarity(a, b) {
  const x = Array.from(normalizeQuestion(a))
  const y = Array.from(normalizeQuestion(b))
  if (x.length === 0 || y.length === 0) return 0
  if (x.length === y.length && x.every((r, i) => r === y[i])) return 1
  if (x.length < 2 || y.length < 2) return 0
  const grams = new Map()
  for (let i = 0; i < x.length - 1; i += 1) {
    const k = x[i] + x[i + 1]
    grams.set(k, (grams.get(k) ?? 0) + 1)
  }
  let common = 0
  for (let i = 0; i < y.length - 1; i += 1) {
    const k = y[i] + y[i + 1]
    const left = grams.get(k) ?? 0
    if (left > 0) {
      grams.set(k, left - 1)
      common += 1
    }
  }
  return (2 * common) / (x.length - 1 + y.length - 1)
}

/** 窗口期内问过的相似问题（跳过标记为渎的卦，取最近一条）。 */
export function findRecentSame(cases, question, windowHours) {
  for (let i = cases.length - 1; i >= 0; i -= 1) {
    const c = cases[i]
    if (hoursSince(c.entry.ts) > windowHours) break
    if (c.entry.du === true) continue
    if (similarity(c.entry.question ?? '', question) >= 0.7) return { prev: c, found: true }
  }
  return { prev: null, found: false }
}

export { RECENT_LIMIT }
