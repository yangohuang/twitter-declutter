---
name: x-batch-unfollow
description: >
  批量分析 X/Twitter 关注列表并一键取关营销号/割韭菜号。
  两种用法：(1) 全流程 — 拉 following、按营销号话术打分、给出取关清单、生成浏览器 Console 一键脚本；
  (2) 已有 handle 列表 — 只生成一键取关脚本。
  当用户说「X 批量取关」「推特取关营销号」「把关注里的韭菜号干掉」「X unfollow 脚本」
  「分析我关注的人」「清理 X 关注列表」「Twitter 一键取关」时使用。
---

# X 批量取关 Skill

> 面向人类用户的说明见 [README.md](README.md)。
> 本文件是给 Claude Code agent 执行流程的参考。

## 核心能力

Twitter/X 没有官方批量取关接口，手动点 15+ 个账号太慢。本 skill 用浏览器 Console 脚本直接调 X 的内部 API `/i/api/1.1/friendships/destroy.json`，10 秒内搞定一批。

脚本本体在 [`scripts/unfollow.js`](scripts/unfollow.js)。默认 `DRY_RUN = true`，安全优先。

## 两种场景

### 场景 A：全流程（用户没有清单）

用户说「分析我的 X 关注列表」「帮我看看关注里哪些是韭菜号」时走这条路：

**步骤**：

1. **拉 following 列表**
   - 问用户 X handle
   - `xreach user <handle> --json` 确认账号是否 `protected`
   - 如果是 protected：告诉用户需要临时改公开，改完等 10-30 分钟让推特索引更新（GraphQL 对刚开放的账号有延迟，第三方视角 tweets/following 端点会返 0）
   - 分页拉：`xreach following <handle> -n 50 --json`，用返回的 `cursor` 继续 `xreach following <handle> -n 50 --cursor <c> --json` 直到拉完
   - ⚠️ `xreach following --all` 模式有 bug，始终返回 0；必须手动分页
   - **不要**让 Monitor 等 `--all` 进程，会挂住；直接单页拉或后台跑 `run_in_background: true`

2. **按 bio 初筛嫌疑号**
   - 🔴 话术红旗：「财务自由」「日入 XXX」「月入 XXX」「帮 XXX 人变现」「超级个体」「个人 IP 教练」「牛马 AI」「被动收入」「Marketing = $$$」「躺赚」「副业日入」bio 里直接挂微信/电报/星球引流
   - 🔴 币圈 shill：「坐庄逻辑」「meme 交易」「代币推荐」「冲就完了」
   - 🟡 软广偏软：「AI 干货」「分享变现」「运营干货」「效率工具」「赚美刀」
   - 🟢 硬核技术/研究者/硬广（直接推自家产品但东西是真的）可保留

3. **拉嫌疑号的推文样本验证**（关键步骤，避免冤枉）
   ```bash
   xreach tweets <handle> -n 5 --json
   ```
   **并行跑**（20 个账号用 `&` + `wait` 一起跑只要 10 秒）：
   ```bash
   for h in $HANDLES; do
     (xreach tweets "$h" -n 5 --json > /tmp/tweet_samples/$h.json) &
   done
   wait
   ```
   看推文是否匹配 bio 话术。常见翻车：
   - bio 营销但实际推文正常 → 保留（降到 🟡）
   - bio 温和但推文是 meme 币 shill / 擦边引流 → 取关（升到 🔴）
   - 内容农场搬运（名人金句流、娱乐八卦流）→ 取关

4. **产出取关清单 + 一键脚本**（进入场景 B）

### 场景 B：已有清单（用户给 handle 列表）

直接生成浏览器 Console 脚本：复制 [`scripts/unfollow.js`](scripts/unfollow.js) 的内容，在 `HANDLES` 数组里填上 handle，给用户。

告诉用户：

1. 打开 `https://x.com` 确认登录的是他本人账号
2. 按 F12 打开 DevTools → Console 标签
3. 粘贴脚本回车
4. **先跑 dry-run**（脚本默认 `DRY_RUN = true`）—— 只预览不执行
5. 确认无误后，改 `DRY_RUN = false` 再跑
6. 每个账号之间随机延迟 2.5-4 秒（避免 Twitter 批量操作风控）
7. 失败的会打印出来，可以单独手动处理或再跑一次

### 取关标准的方法论

用户要方法论而不是代码时，引用 README.md 的"三级筛选法"：

1. **第一级 · bio 红旗**（10 秒）—— 话术红旗 + 闭环红旗 + 身份表演
2. **第二级 · 推文验证**（1 分钟，关键）—— bio 和推文对不上时信推文
3. **第三级 · 例外豁免**（别误伤）—— 硬广真产品 / 开课但硬核内容 / 自嘲真韭菜

一句话核心：**bio 是自报家门，推文是真身。两个对不上，信推文。**

## 关键细节（踩过的坑）

1. **私密账号必须先转公开**：`protected: true` 的账号，xreach 看不到 tweets/following。但转完有 10-30 分钟索引延迟。
2. **xreach cookie 身份**：xreach 用的 cookie 可能不是用户本人，验证方法 `xreach home -n 1 --json` 看第一条推文作者是谁。第三方 cookie 看 protected 或新公开账号有限制，`search from:<handle>` 能绕过部分限制。
3. **`--all` 模式 bug**：xreach 的 `following --all` 会卡 `Page 0 | 0 items fetched`，用手动 cursor 分页替代。
4. **bearer token 捕获**：脚本里的 monkey-patch `window.fetch` 可以在 5 秒内捕获到页面正在用的真实 bearer，避免硬编码过期失效。如果捕获失败显式报错（没有静默 fallback）。
5. **风控**：随机 2.5-4 秒延迟，15 个账号没问题。50+ 的批次脚本会 confirm 一次（X 日限约 400-500）。
6. **不能在服务器端代执行**：unfollow 需要用户本人 cookie（auth_token + ct0），credential exploration 被 Claude Code 沙箱拦截，所以只能用浏览器 Console 方案。

## 其他补充动作

- 取关完提醒用户刷新 `https://x.com/<handle>/following` 确认数字变化
- 如果之前临时转公开，提醒用户可以改回 protected：Settings → Privacy and safety → Audience and tagging → 勾上 Protect your posts
- 保存 following 全名单和取关清单到 `~/obsidian-vault/` 或 `~/shared/documents/` 留档（按用户偏好决定）
- **隐私注意**：保存到用户私人目录，**不要**把 handle 列表、user ID 等个人数据写进本 skill 目录（本目录可能被开源）

## 相关资源

- [README.md](README.md) — 面向所有人的使用说明（开源版）
- [scripts/unfollow.js](scripts/unfollow.js) — 独立 Console 脚本
- [agent-reach](https://github.com/Panniantong/agent-reach) — xreach 来源
