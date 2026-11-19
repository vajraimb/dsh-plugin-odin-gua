# 发布状态与后续步骤

**npm 已发布**：`dsh-plugin-odin-gua@0.1.0`（2026-11-19，账号 `vajrabisj`）。
任何人都可以装：

```sh
dsh plugin --profile web add dsh-plugin-odin-gua
```

**本机已切换**：`desktop` profile 现在装的是 npm 上的 `^0.1.0`，不再指向本地目录。

---

## 已经完成

| 步骤 | 状态 |
|---|---|
| 插件开发 + 13 项测试 | ✅ |
| 真实 DSH profile 加载（工具注册） | ✅ |
| npm 发布 `dsh-plugin-odin-gua@0.1.0` | ✅ |
| desktop profile 切到 npm 版本 | ✅ |
| 从 registry 重新下载校验 tarball 一致 | ✅ |

## 还需要两步（都在浏览器里，需要你的账号）

### 1. 建 GitHub 仓库并加 topic

dshbase 的索引信号是 GitHub 的 `dsh-plugin` topic；没有仓库，目录页不会收录。

```powershell
cd "C:\Users\Michael.Bi\OneDrive - EY CHINA\Documents\deepseek-harness\default-workspace\dsh-plugin-odin-gua"
git init -b main
git add .
git commit -m "feat: 易经起卦 DSH 插件 0.1.0（移植自 odin-gua）"
```

在 github.com 建空仓库 `dsh-plugin-odin-gua`，然后：

```powershell
git remote add origin https://github.com/<你的用户名>/dsh-plugin-odin-gua.git
git push -u origin main
```

推完去仓库 **Settings → Topics** 加 `dsh-plugin`。

### 2. 提交到 dsh.so

<https://www.dsh.so/zh/submit/> → 条目类型选「dsh 插件」→ 粘贴 `dsh-plugin-odin-gua`（或仓库地址）→ **开始检查**（自动拉包、schema 校验、安全扫描）→ **提交到 dsh.so**。

检查要求的都对得上：SPDX 许可证 MIT、README 有安装说明、包里有 `dsh.bundle`、仓库名 `dsh-plugin-odin-gua` 符合 `^[a-z0-9]+(-[a-z0-9]+)*$`。

**dshbase 不用单独提交**：它的数据源是「GitHub `dsh-plugin` topic + dsh.so catalog 合并」，上面两步完成后自动出现，通常几小时到一天。

---

## 关于 npm 的 staged publishing

npm 现在对新包首发有审核机制：发布瞬间 registry 上会出现一个 `0.0.0-stage` 占位版本，
批准后才是正式版本。这次没有卡住，`dist-tags` 已经是 `0.1.0`。如果以后某次发布只看到
`0.0.0-stage`：

- 网页：npmjs.com → 你的头像 → **Staged Packages** → 选中版本 → Approve（要 2FA）；
- 或 CLI：`npm stage approve <stage-id>`（同样要 2FA）。

---

## 后续发版

```powershell
# 1. 改版本号（0.1.1 ...）
# 2. 重新打包/发布
$node = 'C:\Users\Michael.Bi\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe'
$pnpm = 'C:\Users\Michael.Bi\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\pnpm\bin\pnpm.mjs'
& $node $pnpm publish --access public --no-git-checks
```

`.npmrc` 里放 token（用 `NPM_TOKEN` 环境变量插值），发布完立刻删掉。
**本次用的 token 建议现在就去 npmjs.com 撤销**：<https://www.npmjs.com/settings/~/tokens>。

---

## 安全提醒

那个 token 已经出现在聊天记录里，等这批提交做完就撤销/轮换。我本地只在包目录的临时
`.npmrc` 里用过它，发布后已删除。
