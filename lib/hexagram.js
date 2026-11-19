// Hexagram representation and transformations — port of odin-gua src/gua/gua.odin
// and src/gua/render.odin. Bits: 0 = 初爻 (bottom), 5 = 上爻 (top); 1 = 阳.

import { KW, NAME_ZH, PINYIN, NAME_EN, TRIGRAMS, POS_ZH } from './tables.js'

export const ALL = 0b111111
export const QIAN = ALL
export const KUN = 0

/** 文王序号 → 六位卦体。 */
export const BY_NUMBER = new Array(65).fill(0)
for (let i = 0; i < 64; i += 1) BY_NUMBER[KW[i & 7][i >> 3]] = i

export const lower = (g) => g & 7
export const upper = (g) => g >> 3

/** 文王序号 of a hexagram body. */
export const number = (g) => KW[g & 7][g >> 3]

/** Unicode 卦符 U+4DC0…U+4DFF, by King Wen number. */
export const symbol = (n) => String.fromCodePoint(0x4dc0 + n - 1)

/** 六位串，自初爻到上爻，如乾 "111111"、泰 "111000"。 */
export function binaryString(g) {
  let s = ''
  for (let i = 0; i < 6; i += 1) s += (g >> i) & 1 ? '1' : '0'
  return s
}

export const isYang = (g, y) => ((g >> y) & 1) === 1
export const withLine = (g, y) => g | (1 << y)
export const countLines = (g) => {
  let n = 0
  for (let i = 0; i < 6; i += 1) n += (g >> i) & 1
  return n
}

/** 错卦：六爻全反。 */
export const cuo = (g) => ~g & ALL

/** 综卦：上下颠倒。 */
export function zong(g) {
  let r = 0
  for (let y = 0; y < 6; y += 1) if ((g >> y) & 1) r |= 1 << (5 - y)
  return r
}

/** 互卦：二三四爻作下卦，三四五爻作上卦。 */
export const hu = (g) => ((g >> 1) & 7) | (((g >> 2) & 7) << 3)

/** 之卦：动爻变。 */
export const bian = (g, moving) => g ^ moving

/** 初九 / 六二 / 上六 …… */
export function lineName(y, yang) {
  const num = yang ? '九' : '六'
  if (y === 0) return `初${num}`
  if (y === 5) return `上${num}`
  return `${num}${POS_ZH[y]}`
}

/** 一行标题：䷈ 第9卦 小畜 Xiao Chu · Small Taming（上巽☴ 下乾☰） */
export function title(g) {
  const n = number(g)
  const u = TRIGRAMS[upper(g)]
  const l = TRIGRAMS[lower(g)]
  return `${symbol(n)} 第${n}卦 ${NAME_ZH[n]} ${PINYIN[n]} · ${NAME_EN[n]}（上${u.zh}${u.symbol} 下${l.zh}${l.symbol}）`
}

/** 紧凑标题，用于日志列表：䷈ 小畜 之 ䷍ 大有 */
export function shortTitle(n, changed) {
  let s = `${symbol(n)} ${NAME_ZH[n]}`
  if (changed !== null && changed !== undefined) s += ` 之 ${symbol(changed)} ${NAME_ZH[changed]}`
  return s
}

/**
 * 六爻图，自上而下。老阳标 ○，老阴标 ×。
 * @param {number} g hexagram body
 * @param {number[]|null} values 六爻的 6/7/8/9，自初爻到上爻
 */
export function draw(g, values = null) {
  const rows = []
  for (let i = 5; i >= 0; i -= 1) {
    const yang = isYang(g, i)
    const bar = yang ? '━━━━━━━' : '━━━ ━━━'
    let row = `  ${lineName(i, yang)}  ${bar}`
    if (values) {
      if (values[i] === 9) row += '  ○ 老阳·动'
      else if (values[i] === 6) row += '  × 老阴·动'
    }
    rows.push(row)
  }
  return rows.join('\n')
}

/**
 * 启动自检（对应 odin-gua 的 gua.self_check）：64 卦齐全、文王序两两成对、
 * 反查一致、卦名表不错位。返回 { ok, msg }。
 */
export function selfCheck() {
  const seen = new Array(65).fill(false)
  for (let i = 0; i < 64; i += 1) {
    const n = number(i)
    if (n < 1 || n > 64) return { ok: false, msg: `序号越界: ${n}` }
    if (seen[n]) return { ok: false, msg: `重复序号: ${n}` }
    seen[n] = true
    if (BY_NUMBER[n] !== i) return { ok: false, msg: `反查失败: ${n}` }
    const pair = n % 2 === 1 ? n + 1 : n - 1
    const z = zong(i)
    const want = z === i ? cuo(i) : z
    if (number(want) !== pair) return { ok: false, msg: `文王配对不符: ${n}` }
  }
  if (NAME_ZH[1] !== '乾' || NAME_ZH[64] !== '未济') return { ok: false, msg: '卦名表错位' }
  return { ok: true, msg: '' }
}
