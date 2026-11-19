# dsh-plugin-odin-gua · 易经起卦

[odin-gua](https://github.com/vajraimb/odin-gua) 的 DeepSeek Harness 原生插件版：把那个用 Odin 写的 MCP 服务器，重写成一组 DSH 工具 —— 不需要编译、不需要 MCP 传输、不需要外部二进制，`dsh plugin add` 装上就能用。

> 仅供娱乐与自我反思，不构成任何决策（含投资）依据。

## 装

```sh
# 装进你正在用的 profile（web / tui / headless 或自定义名字）
dsh plugin --profile web add dsh-plugin-odin-gua

# 从本地 checkout 装（还没发布 npm 时）
dsh plugin --profile web add ./dsh-plugin-odin-gua
```

装完重开一个会话，说“帮我起一卦，问下周的谈判”即可。

## 五个工具

| 工具 | 作用 |
|---|---|
| `cast` | 起卦（三钱法 / 大衍法），返回本卦、动爻、之卦、互卦、按朱熹规则该读的卦辞/爻辞（中英原文），并自动记日志 |
| `lookup` | 按序号、中文名、拼音、英文名、Unicode 卦符、六位二进制查卦，附卦辞 |
| `relations` | 互卦、错卦、综卦；给 `moving` 时再给之卦与取辞 |
| `journal` | 最近的卦例与状态（待解读 / 待复盘 / 已到复盘日 / 渎）；`due:true` 只看到期的 |
| `annotate` | 记下模型的解读：倾向、把握（0–1）、可检验的预测、复盘日；每卦一次，写下不改 |

规则与上游一致：**排卦归程序，解卦归模型**。随机数、互错综变、取哪条爻辞都由代码确定并记入日志；模型只负责联系问题去解释。

- **取辞**按朱熹《易学启蒙·考变占》的常用规则，由动爻数决定。
- **不再三**：同一问题（去标点后字二元组相似度 ≥ 0.7）72 小时内不重摇，直接返回原卦；确需重起要带 `recast:true` 与 `reason`，新卦记为“渎”，不计入统计。`GUA_RECAST_HOURS` 可调，设 0 关闭。
- **落笔不改**：每卦只收第一条 `annotate`。
- **复盘提醒**：到期的卦例会附在 `cast` 结果末尾，并在 `journal` 顶部计数。

## 与 odin-gua 共用一份卦例日志

日志路径与格式完全一致：`$GUA_HOME/journal.jsonl`，默认 `~/.gua/journal.jsonl`，只追加、权限 0600。已经在 Claude Code / Codex / Cursor 里用 odin-gua 起过的卦，装了这个插件后 `journal` 一样看得到；反过来也一样。

同一台机器上混用两者时注意：

- 每台机器只有一个随机源序列，但**种子复现只在各自实现内部成立**：同一个 `seed` 在 Odin 二进制与这个 JS 移植里不会得到同一卦（PRNG 不同）。卦例本身不影响，因为结果已写进日志。
- 这个移植没有 MCP Apps 的掷钱回放（`ui://odin-gua/coins`）——DSH 工具卡片不走 MCP UI；钱面仍以 `cast` 返回的 `coins` 为准。
- 上游的“更新通告”机制没有移植（它依赖 MCP 会话）。

## 配置

全部可选，读环境变量：

| 变量 | 作用 |
|---|---|
| `GUA_HOME` | 日志目录，默认 `~/.gua` |
| `GUA_TZ` | 时间戳时区（IANA 名，如 `Asia/Shanghai`），默认系统时区 |
| `GUA_RECAST_HOURS` | 同一问题的重摇窗口，默认 72；0 关闭 |
| `GUA_SEED` | 固定随机种子（仅测试用） |

## 开发

```sh
node tools/gen-texts.mjs   # 由 data/zhouyi.txt、data/legge.txt 重新生成 lib/texts.generated.js
node test/engine.test.mjs  # 引擎与流程测试（node:test，进程内跑）
```

经文数据来自上游仓库：中文为通行本（繁体），英文为 Legge 1882，来源与逐条出处见 `data/README.md` 与上游的 `data/provenance.tsv`。生成脚本会在写出前核对 64 卦齐全、爻题“九/六”与卦画一致、英文 `undivided/divided` 与卦画一致。

## 许可

MIT。引擎、经文数据与工具设计来自 [vajraimb/odin-gua](https://github.com/vajraimb/odin-gua)（MIT, © 2026 vajraimb）；本移植同样以 MIT 发布，详见 [LICENSE](./LICENSE) 与 [NOTICE](./NOTICE)。

发布到 npm、提交到 dshbase / dsh.so 的步骤见 [PUBLISHING.md](./PUBLISHING.md)。
