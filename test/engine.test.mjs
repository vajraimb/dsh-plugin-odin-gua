import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtempSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { BY_NUMBER, ALL, number, binaryString, cuo, zong, hu, bian, title, draw, lineName, selfCheck } from '../lib/hexagram.js'
import { TEXTS_ZH, TEXTS_EN } from '../lib/texts.generated.js'
import { castWithSeed, valuesString, coinsString, coinsJson, coinsLine } from '../lib/cast.js'
import { reading, focusLabel, focusText } from '../lib/reading.js'
import * as journal from '../lib/journal.js'
import * as api from '../lib/api.js'

test('self check passes and the 64 hexagrams are a bijection', () => {
  assert.deepEqual(selfCheck(), { ok: true, msg: '' })
  const seen = new Set()
  for (let g = 0; g < 64; g += 1) seen.add(number(g))
  assert.equal(seen.size, 64)
  for (let n = 1; n <= 64; n += 1) assert.equal(number(BY_NUMBER[n]), n)
})

test('bit conventions match the upstream fixtures', () => {
  assert.equal(BY_NUMBER[1], ALL) // 乾 = 111111
  assert.equal(BY_NUMBER[2], 0) // 坤 = 000000
  assert.equal(number(0b000111), 11) // 泰 = 下乾上坤
  assert.equal(binaryString(BY_NUMBER[11]), '111000')
  assert.equal(title(ALL).startsWith('䷀ 第1卦 乾'), true)
})

test('错 / 综 / 互 / 之 behave like the upstream definitions', () => {
  for (let g = 0; g < 64; g += 1) {
    assert.equal(cuo(cuo(g)), g)
    assert.equal(zong(zong(g)), g)
    assert.equal(cuo(g), ALL & ~g)
  }
  assert.equal(hu(ALL), ALL) // 乾的互卦仍是乾
  assert.equal(hu(0), 0)
  assert.equal(bian(0b000111, 0b000001), 0b000110)
})

test('line names follow 初九 / 六二 / 上六', () => {
  assert.equal(lineName(0, true), '初九')
  assert.equal(lineName(1, false), '六二')
  assert.equal(lineName(5, true), '上九')
  assert.equal(lineName(4, false), '六五')
})

test('all 64 hexagrams carry a judgment and six line texts in both languages', () => {
  for (let n = 1; n <= 64; n += 1) {
    assert.ok(TEXTS_ZH[n][0].length > 0, `zh judgment ${n}`)
    assert.ok(TEXTS_EN[n][0].length > 0, `en judgment ${n}`)
    for (let y = 0; y < 6; y += 1) {
      assert.ok(TEXTS_ZH[n][y + 1].length > 0, `zh line ${n}.${y + 1}`)
      assert.ok(TEXTS_EN[n][y + 1].length > 0, `en line ${n}.${y + 1}`)
    }
  }
  assert.ok(TEXTS_ZH[1][7].length > 0)
  assert.ok(TEXTS_ZH[2][7].length > 0)
  assert.equal(TEXTS_ZH[3][7], null) // 屯 has no 用爻
})

test('the 朱熹 rule picks one focus per moving-line count', () => {
  const g = 0b000111 // 泰
  assert.equal(reading(g, 0).movingCount, 0)
  assert.equal(reading(g, 0).items[0].kind, 'judgment')
  assert.equal(reading(g, 0).rule, '无动爻：占本卦卦辞')

  const one = reading(g, 0b000001)
  assert.equal(one.items.length, 1)
  assert.equal(one.items[0].line, 0)
  assert.equal(one.items[0].main, true)

  const two = reading(g, 0b000011)
  assert.equal(two.items.length, 2)
  assert.equal(two.items[1].main, true)

  const three = reading(g, 0b000111)
  assert.equal(three.items.length, 2)
  assert.deepEqual(three.items.map((i) => i.source), ['primary', 'changed'])

  const four = reading(g, 0b001111)
  assert.equal(four.items.length, 2)
  assert.deepEqual(four.items.map((i) => i.source), ['changed', 'changed'])
  assert.deepEqual(four.items.map((i) => i.line), [4, 5])
  assert.equal(four.items[0].main, true)

  const five = reading(g, 0b011111)
  assert.equal(five.items.length, 1)
  assert.equal(five.items[0].line, 5)

  assert.equal(reading(ALL, ALL).items[0].kind, 'yong')
  assert.equal(reading(ALL, ALL).rule, '六爻皆动：乾占用九')
  assert.equal(reading(0, ALL).rule, '六爻皆动：坤占用六')
  assert.equal(reading(0b000111, ALL).items[0].source, 'changed')
})

test('the focus label and text resolve the right hexagram and line', () => {
  const g = BY_NUMBER[1]
  const r = reading(g, 0b000001)
  assert.equal(focusLabel(r.items[0], g, 0b000001), '本卦乾 初九（主）')
  assert.ok(focusText(r.items[0], g, 0b000001, 'zh').startsWith('潛龍'))
  assert.ok(focusText(r.items[0], g, 0b000001, 'en').includes('dragon lying hid'))
})

test('a seed reproduces the same cast; coins sum to the values', () => {
  const a = castWithSeed(42n, 'coins')
  const b = castWithSeed(42n, 'coins')
  assert.deepEqual(a, b)
  assert.equal(valuesString(a).length, 6)
  assert.equal(coinsString(a).length, 18)
  for (let i = 0; i < 6; i += 1) {
    assert.equal(a.coins[i].reduce((x, y) => x + y, 0), a.values[i])
    assert.ok(a.values[i] >= 6 && a.values[i] <= 9)
  }
  assert.equal(coinsString(castWithSeed(42n, 'yarrow')), '')
  assert.deepEqual(coinsJson('232332233233232233'), [[2, 3, 2], [3, 3, 2], [2, 3, 3], [2, 3, 3], [2, 3, 2], [2, 3, 3]])
  assert.match(coinsLine('232332233233232233'), /^钱面（初爻→上爻，2阴 3阳）：232 332 233 233 232 233$/)
})

test('journal round-trips through a GUA_HOME directory', (t) => {
  const home = mkdtempSync(join(tmpdir(), 'gua-journal-'))
  const old = process.env.GUA_HOME
  process.env.GUA_HOME = home
  t.after(() => {
    if (old === undefined) delete process.env.GUA_HOME
    else process.env.GUA_HOME = old
    rmSync(home, { recursive: true, force: true })
  })

  const ts = journal.nowString()
  assert.match(ts, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/)
  const id = journal.newId(ts)
  assert.match(id, /^g\d{8}-[0-9a-f]{6}$/)
  assert.equal(journal.appendLine(JSON.stringify({ kind: 'cast', id, ts, question: '测试', primary: 1 })), true)
  assert.equal(journal.appendLine(JSON.stringify({ kind: 'annotation', cast_id: id, stance: 'mixed', prediction: 'x', review_after: '2099-01-01' })), true)

  const { cases, index } = journal.loadCases()
  assert.equal(cases.length, 1)
  assert.equal(index.get(id), 0)
  assert.equal(cases[0].note.stance, 'mixed')

  const raw = readFileSync(journal.filePath(), 'utf8')
  assert.equal(raw.split('\n').filter(Boolean).length, 2)
})

test('question similarity drives 不再三', () => {
  assert.equal(journal.similarity('下周谈判能成吗？', '下周谈判能成吗'), 1)
  assert.ok(journal.similarity('下周的谈判能成吗', '下周谈判能成吗') >= 0.7)
  assert.ok(journal.similarity('下周谈判能成吗', '今天天气怎么样') < 0.2)
  assert.equal(journal.similarity('', 'abc'), 0)
})

test('cast → annotate flow with a pinned seed, then dedupe and recast', (t) => {
  const home = mkdtempSync(join(tmpdir(), 'gua-flow-'))
  const oldHome = process.env.GUA_HOME
  const oldSeed = process.env.GUA_SEED
  process.env.GUA_HOME = home
  process.env.GUA_SEED = '12345'
  t.after(() => {
    if (oldHome === undefined) delete process.env.GUA_HOME
    else process.env.GUA_HOME = oldHome
    if (oldSeed === undefined) delete process.env.GUA_SEED
    else process.env.GUA_SEED = oldSeed
    rmSync(home, { recursive: true, force: true })
  })

  const first = api.cast({ question: '下周的谈判能成吗' })
  assert.match(first.text, /起卦 g\d{8}-[0-9a-f]{6}/)
  assert.match(first.text, /取辞（朱熹）/)
  assert.match(first.text, /仅供自我反思/)
  assert.equal(first.data.journaled, true)
  assert.equal(first.data.seed, '0000000000003039')

  const again = api.cast({ question: '下周的谈判能成吗' })
  assert.match(again.text, /初筮告，再三渎/)
  assert.equal(again.data.cast, false)

  const dup = api.cast({ question: '下周 谈判 能成吗?', recast: true, reason: '情况有变' })
  assert.equal(dup.data.du, true)
  assert.match(dup.text, /记为“渎”/)

  const annotated = api.annotate({
    id: first.data.id,
    stance: 'mixed',
    confidence: 0.62,
    prediction: '两周内对方会让步，但价格不到预期',
    review_in_days: 14,
  })
  assert.match(annotated.text, /已记下/)
  assert.equal(annotated.data.confidence, 0.62)
  assert.throws(() => api.annotate({ id: first.data.id, stance: 'mixed', confidence: 0.5, prediction: 'again' }), /落笔不改/)

  const list = api.listJournal({ limit: 10 })
  assert.equal(list.data.entries.length, 2)
  assert.equal(api.listJournal({ due: true }).text, '没有到期待复盘的卦例。')
})

test('lookup and relations answer by number, name, pinyin, symbol and bits', () => {
  assert.equal(api.find('1').length, 1)
  assert.equal(api.find('乾').length, 1)
  assert.equal(api.find('qian').length, 2) // 乾 and 谦 share the pinyin
  assert.equal(api.find('111111').length, 1)
  assert.equal(api.find('䷀').length, 1)
  assert.equal(api.find('the creative heaven').length, 1)

  const r = api.relations({ query: '乾', moving: [1, 6] })
  assert.match(r.text, /本卦 ䷀ 第1卦 乾/)
  assert.match(r.text, /动爻 初九、上九/)
  assert.match(r.text, /之卦/)

  assert.throws(() => api.relations({ query: '乾', moving: [7] }), /1 到 6/)
  assert.throws(() => api.lookup({ query: '不存在' }), /找不到卦/)
})

test('draw marks 老阳 and 老阴', () => {
  const g = BY_NUMBER[1]
  const art = draw(g, [9, 7, 7, 7, 7, 6])
  assert.match(art, /初九  ━━━━━━━  ○ 老阳·动/)
  assert.match(art, /上九  ━━━━━━━  × 老阴·动/)
})
