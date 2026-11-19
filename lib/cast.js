// Casting — port of odin-gua src/gua/cast.odin.
//
// 三钱法：每爻三枚，2 阴（字）、3 阳（背），和为 6/7/8/9（1/8、3/8、3/8、1/8）。
// 大衍筮法：直接按 1/16、5/16、7/16、3/16 抽 6/7/8/9。

import { randomBytes } from 'node:crypto'

export const METHODS = ['coins', 'yarrow']

/**
 * A small deterministic PRNG. odin-gua seeds Odin's `core:math/rand`; this port
 * uses its own generator, so a seed reproduces the same cast **within this
 * implementation**, not across the Odin binary.
 */
function mulberry32(a) {
  let state = a >>> 0
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function generatorFor(seed) {
  const lo = Number(seed & 0xffffffffn)
  const hi = Number((seed >> 32n) & 0xffffffffn)
  return mulberry32((lo ^ hi ^ 0x9e3779b9) >>> 0)
}

export function randomU64() {
  return BigInt(`0x${randomBytes(8).toString('hex')}`)
}

/** 同一 seed + method 必得同一卦。 */
export function castWithSeed(seed, method = 'coins') {
  if (method !== 'coins' && method !== 'yarrow') throw new Error('method 只能是 coins 或 yarrow')
  const next = generatorFor(seed)
  const intMax = (n) => Math.floor(next() * n)
  const values = new Array(6).fill(0)
  const coins = []
  for (let i = 0; i < 6; i += 1) {
    if (method === 'coins') {
      const faces = [0, 0, 0]
      let sum = 0
      for (let k = 0; k < 3; k += 1) {
        const face = intMax(2) === 1 ? 3 : 2
        faces[k] = face
        sum += face
      }
      coins.push(faces)
      values[i] = sum
    } else {
      const r = intMax(16)
      values[i] = r < 1 ? 6 : r < 6 ? 7 : r < 13 ? 8 : 9
    }
  }
  return { values, coins, method, seed }
}

/** 本卦：7、9 为阳。 */
export function primary(cast) {
  let g = 0
  cast.values.forEach((v, i) => {
    if (v === 7 || v === 9) g |= 1 << i
  })
  return g
}

/** 动爻：6、9。 */
export function moving(cast) {
  let m = 0
  cast.values.forEach((v, i) => {
    if (v === 6 || v === 9) m |= 1 << i
  })
  return m
}

/** 六爻的 6/7/8/9 串，自初爻到上爻。 */
export const valuesString = (cast) => cast.values.join('')

/** 三钱法钱面：18 个字符；大衍法返回 ''。 */
export function coinsString(cast) {
  if (cast.method !== 'coins') return ''
  return cast.coins.map((f) => f.join('')).join('')
}

/** "232332…" → [[2,3,2],…]；不是 18 位 2/3 则返回 null。 */
export function coinsJson(digits) {
  if (!digits || digits.length !== 18) return null
  const rows = []
  for (let i = 0; i < 6; i += 1) {
    const cell = []
    for (let k = 0; k < 3; k += 1) {
      const d = digits[i * 3 + k]
      if (d !== '2' && d !== '3') return null
      cell.push(Number(d))
    }
    rows.push(cell)
  }
  return rows
}

/** 钱面一行：钱面（初爻→上爻，2阴 3阳）：232 332 233 233 232 233 */
export function coinsLine(digits) {
  if (!digits || digits.length !== 18) return ''
  const groups = []
  for (let i = 0; i < 6; i += 1) groups.push(digits.slice(i * 3, i * 3 + 3))
  return `钱面（初爻→上爻，2阴 3阳）：${groups.join(' ')}`
}
