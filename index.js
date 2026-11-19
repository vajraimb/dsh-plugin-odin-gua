// dsh-plugin-odin-gua — 易经起卦 for DeepSeek Harness.
//
// A dependency-free port of odin-gua (https://github.com/vajraimb/odin-gua, MIT)
// from an Odin MCP server into a native DSH/Cordis plugin: the same five tools,
// the same 朱熹 reading rule, the same journal file (~/.gua/journal.jsonl), no
// external binary and no MCP transport.

import { defineTool } from '@deepseek-ai/dsh-tools'

import { selfCheck } from './lib/hexagram.js'
import * as api from './lib/api.js'
import { STANCES } from './lib/present.js'

export const name = 'odin-gua'
export const inject = ['tools']

const textOutput = {
  schema: { type: 'object', properties: { text: { type: 'string' }, data: { type: 'json' } }, additionalProperties: false },
  render: (_args, value) => [{ type: 'text', text: value.text }],
}

export const castTool = defineTool({
  name: 'cast',
  description: `起一卦（默认三钱法），返回本卦、动爻、之卦、互卦与按朱熹规则应读的卦辞/爻辞位置（含中英原文），并自动记入卦例日志。必须提供 question。

用户说起卦、占卜、问卦时调用它，并把用户关心的事提炼成一句 question；不要让用户自己抛硬币。卦象只能来自本工具的返回，绝不要自行编造。同一问题 72 小时内不重摇、返回原卦（初筮告，再三渎），不要换说法绕开；确需重起须带 recast:true 与 reason，新卦记为“渎”、不计入统计。

Cast an I Ching hexagram for a question: the hexagram, moving lines, changed and nuclear hexagrams, and the 朱熹 rule for which judgment/line text to read. The result is random, reproducible by seed, and journaled.`,
  parameters: {
    question: { type: 'string', required: true, description: '用户所问之事，一句话' },
    method: { type: 'string', enum: ['coins', 'yarrow'], default: 'coins', description: 'coins 三钱法；yarrow 大衍筮法概率' },
    recast: { type: 'boolean', default: false, description: '同一问题窗口期内确需重起时才设 true（新卦记为渎）' },
    reason: { type: 'string', description: 'recast 时必填：情况有何变化' },
  },
  output: textOutput,
  async execute(args) {
    return api.cast(args)
  },
})

export const lookupTool = defineTool({
  name: 'lookup',
  description:
    '按文王序号(1-64)、中文名、拼音、英文名、Unicode 卦符或六位二进制(自初爻到上爻，1 为阳)查卦，并附卦辞。Look up a hexagram by number, name, pinyin, English name, symbol, or 6-bit string.',
  parameters: {
    query: { type: 'string', required: true, description: '序号 / 卦名 / 拼音 / 英文名 / 卦符 / 六位二进制' },
  },
  output: textOutput,
  async execute(args) {
    return api.lookup(args)
  },
})

export const relationsTool = defineTool({
  name: 'relations',
  description:
    '给出一卦的互卦、错卦、综卦；若提供 moving（动爻位置 1-6），再给出之卦与取辞位置及原文。Nuclear, inverse, reverse and changed hexagrams.',
  parameters: {
    query: { type: 'string', required: true, description: '同 lookup：序号 / 卦名 / 拼音 / 英文名 / 卦符 / 六位二进制' },
    moving: { type: 'array', items: { type: 'integer' }, description: '动爻位置，1 为初爻' },
  },
  output: textOutput,
  async execute(args) {
    return api.relations(args)
  },
})

export const journalTool = defineTool({
  name: 'journal',
  description:
    '列出最近的起卦记录（新的在前）及其状态（待解读 / 待复盘 / 已到复盘日 / 渎）；due:true 只看到期待复盘的卦例。Recent casts from the local journal.',
  parameters: {
    limit: { type: 'integer', default: 10, description: '返回条数（1–50，默认 10）' },
    due: { type: 'boolean', default: false, description: '只看已到复盘日、尚未复盘的卦例' },
  },
  output: textOutput,
  async execute(args) {
    return api.listJournal(args)
  },
})

export const annotateTool = defineTool({
  name: 'annotate',
  description:
    '解卦后记下模型的解读与可检验的预测，供日后复盘。每卦只记一次，写下不改。Record the reading (stance, confidence, prediction) and the review date for a cast; one per cast, immutable.',
  parameters: {
    id: { type: 'string', required: true, description: 'cast 返回的卦例 id' },
    stance: { type: 'string', enum: STANCES, required: true, description: '倾向：偏吉/偏凶/参半/不明' },
    confidence: { type: 'number', required: true, description: '对此倾向的把握，0–1' },
    prediction: { type: 'string', required: true, description: '一句将来能对照结果检验的具体判断' },
    summary: { type: 'string', description: '解读要点（可选）' },
    review_after: { type: 'string', description: '复盘日期 YYYY-MM-DD' },
    review_in_days: { type: 'integer', description: '或：几天后复盘（默认 14）' },
  },
  output: textOutput,
  async execute(args) {
    return api.annotate(args)
  },
})

export const tools = [castTool, lookupTool, relationsTool, journalTool, annotateTool]

export function apply(ctx) {
  const check = selfCheck()
  if (!check.ok) throw new Error(`odin-gua: 卦表自检失败：${check.msg}`)
  for (const tool of tools) {
    ctx.effect(() => ctx.tools.register(tool))
  }
  ctx.logger?.info?.('odin-gua: 5 tools registered (cast / lookup / relations / journal / annotate)')
  if (process.env.GUA_DEBUG) {
    // 无 LLM 也能确认插件真的挂上了：GUA_DEBUG=1 dsh <profile> --dump-config 时可见。
    console.error(`[odin-gua] registered ${tools.map((t) => t.name).join(', ')}; journal=${process.env.GUA_HOME || '~/.gua'}`)
  }
}

export const INSTRUCTIONS = `易经起卦服务（I Ching casting）。
- 用户想起卦、占卜、问卦时（如“起一卦”“帮我卜一下”“cast the I Ching”）调用 cast，把用户关心的事提炼成一句 question；不要让用户自己抛硬币。
- 卦象由工具随机决定并自动记入日志，绝不自行编造。同一问题 72 小时内不重摇，会返回原卦（初筮告，再三渎）；只有情况确已改变、用户明确要求时，才传 recast:true 和 reason，新卦记为“渎”、不计入统计。
- 解读以返回的 reading.focus 为主线，其中 text_zh（通行本）与 text_en（Legge 1882）是原文，引用时照录。
- 讲完解读后立刻调用 annotate 记下 stance、confidence、prediction、review_after/review_in_days。每卦只记一次，写下不改。
- cast 与 journal 的结果里若有“复盘提醒”，在回答末尾顺便问用户那几件事结果如何。
- 查卦用 lookup，看互错综变用 relations，回看历史用 journal（due:true 只看到期待复盘的）。
- 提醒用户：这是供自我反思的参考，不构成任何决策（包括投资）依据。`
