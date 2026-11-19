# 发布状态与后续步骤

| 项目 | 值 |
|---|---|
| npm | [`dsh-plugin-odin-gua@0.1.3`](https://www.npmjs.com/package/dsh-plugin-odin-gua)（账号 `vajrabisj`） |
| GitHub | <https://github.com/vajraimb/dsh-plugin-odin-gua>（topic: `dsh-plugin`） |
| 本机 | `desktop` profile 装的是 `0.1.3`（registry 版本，不是本地目录） |
| 许可 | MIT |

安装：

```sh
dsh plugin --profile web add dsh-plugin-odin-gua
```

## 已完成

| 步骤 | 状态 |
|---|---|
| 插件开发 + 13 项测试全绿 | ✅ |
| 真实 DSH profile 加载（五个工具注册成功） | ✅ |
| npm 发布 0.1.0 → 0.1.3（补 repository / homepage，LICENSE 规范化） | ✅ |
| GitHub 仓库 + 源码推送 + `dsh-plugin` topic | ✅ |
| desktop profile 切到 registry 版本 | ✅ |

## 只剩 dsh.so 提交

dshbase 的数据源是「GitHub `dsh-plugin` topic + dsh.so catalog 合并」，topic 已经打上，
npm 也在，所以 dshbase 会自己收录（几小时到一天）。

dsh.so 需要人工点一次：

1. <https://www.dsh.so/zh/submit/>
2. 条目类型选 **「dsh 插件」**
3. 粘贴 `dsh-plugin-odin-gua`（或 `vajraimb/dsh-plugin-odin-gua`）
4. **开始检查** → 通过后 **提交到 dsh.so**（会生成 Issue 进审核队列）

检查要求都对得上：SPDX 许可证 MIT、README 有安装说明、`package.json` 有 `dsh.bundle`、
仓库名符合 `^[a-z0-9]+(-[a-z0-9]+)*$`。

## 发版流程

```powershell
# 1. 改 package.json 的 version
# 2. 发布
$node = 'C:\Users\Michael.Bi\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe'
$pnpm = 'C:\Users\Michael.Bi\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\pnpm\bin\pnpm.mjs'
Set-Content .npmrc "//registry.npmjs.org/:_authToken=$env:NPM_TOKEN"
& $node $pnpm publish --access public --no-git-checks
Remove-Item .npmrc
# 3. 推送 tag
git tag v0.1.2; git push --tags
```

发布后 registry 有约 2 分钟传播延迟；这段时间 `npm view` 可能还看不到新版本。
如果长时间只看到 `0.0.0-stage`，说明这次发布进了 npm 的 staged publishing 队列，
去 npmjs.com → 头像 → **Staged Packages** 里 2FA 批准（或 `npm stage approve <stage-id>`）。

## 安全

- 用过的 npm token 建议撤销：<https://www.npmjs.com/settings/~/tokens>
- 仓库里的 `.npmrc` 已在 `.gitignore` 中，不会提交。

## 一个坑：LICENSE 不要加 SPDX 行

在标准 MIT 文本里插入 `SPDX-License-Identifier: MIT` 会让 GitHub 的 licensee 判定变成
`NOASSERTION`，dsh.so 的检查器就会报「无法确定 SPDX 标识」。保持标准 MIT 文本
（`MIT License` + 版权行 + 正文）即可，SPDX 由 GitHub 自动识别为 `MIT`。
