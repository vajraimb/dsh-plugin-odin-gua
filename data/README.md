# 经文数据

这两个文件直接来自 [vajraimb/odin-gua](https://github.com/vajraimb/odin-gua) 的 `data/`（MIT），
用于 `tools/gen-texts.mjs` 生成 `lib/texts.generated.js`。

| 文件 | 内容 |
|---|---|
| `zhouyi.txt` | 通行本《周易》经文（繁体）：每卦卦辞、六爻爻辞、乾坤的用九/用六 |
| `legge.txt` | James Legge 1882 英译（公有领域），同结构 |

上游对来源的说明（`docs`/`data/SOURCES.md`）：

- 中文底本为 ctext 武英殿本《周易正義》，以維基文庫、四部叢刊、Project Gutenberg 互校；
- 逐条来源与改字记在上游 `data/provenance.tsv`；
- 英文为 James Legge, *The Sacred Books of the East*, Vol. XVI (1882)，公有领域。

`lib/texts.generated.js` 顶部记录了中文/英文两个文件的 FNV-1a 64 指纹；生成脚本在写出前
会核对 64 卦齐全、爻题“九/六”与卦画一致、英文 `undivided/divided` 与卦画一致。
