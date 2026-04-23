# x-batch-unfollow

A browser Console script + methodology for cleaning up your X/Twitter following list.
Identify marketing accounts and unfollow them in bulk — 20 seconds instead of 20 clicks.

> 🇨🇳 中文介绍见下方 "中文说明"

![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)

## What this does

Twitter/X doesn't let you mass-unfollow. This repo gives you:

1. A **methodology** (three-tier filter) to decide who to unfollow
2. A **browser Console script** that unfollows a list of handles in one run
3. A **Claude Code skill** that automates the whole flow: pull your following list, classify candidates, generate the unfollow script

## Quick start — script only (no Claude)

1. Open https://x.com and make sure you're logged in
2. Press **F12** → **Console** tab
3. Open [`scripts/unfollow.js`](scripts/unfollow.js), edit the `HANDLES` array
4. **Keep `DRY_RUN = true` for the first run** — it'll print what *would* happen without actually unfollowing
5. Paste entire script into Console, press Enter
6. If the dry-run output looks right, flip `DRY_RUN = false` and run again

```javascript
const HANDLES = [
  'marketing_account_1',
  'cringe_crypto_shill_2',
  'fake_guru_3',
];
const DRY_RUN = true;  // ← start with this
```

## Quick start — with Claude Code

If you use [Claude Code](https://claude.com/claude-code), drop the repo into your skills directory and invoke it via natural language:

```bash
cp -r x-batch-unfollow ~/.claude/skills/
```

Then in a Claude Code session:

> 分析我的 X 关注列表，给我营销号取关清单

Claude will:
1. Ask for your X handle
2. Use `xreach` (from [agent-reach](https://github.com/Panniantong/agent-reach)) to pull your full following list
3. Classify candidates by bio red flags + sample tweets
4. Output a three-tier list (🔴 unfollow / 🟡 watch / 🟢 keep)
5. Fill the `HANDLES` array in the script for you to paste

## The three-tier filter (the methodology)

### Tier 1 — Bio red flags (10 seconds)

Hit **2+** = suspicious, **3+** = likely marketing account:

**Financial promise words**
- "Financial freedom" / "Passive income" / "$X/month"
- "Super individual" / "Personal IP coach" / "AI side hustle"
- "I've helped X people make $Y"

**Funnel signals**
- Handle in bio (WeChat, Telegram, Discord, Substack)
- "DM for details" / "Join my group" / "Link in bio"

**Identity stacking**
- "Ex-FAANG + PhD + Founder" but no real product to be found
- Titles like "CEO / Evangelist" of a company that exists only in the bio

### Tier 2 — Tweet verification (1 minute, **critical**)

| Bio | Tweets | Verdict |
|---|---|---|
| Marketing | Normal tech/life | 🟡 Keep (bluffing) |
| Marketing | 50%+ monetization talk | 🔴 Unfollow |
| Innocent | Meme coin shilling / thirst-trap funnel | 🔴 Unfollow |
| Innocent | Celebrity quote mill / news aggregator | 🔴 Unfollow |

### Tier 3 — Exemptions (don't friendly-fire)

1. **Hard promo with a real product** (Levelsio, ShipFast, Builder.io) — keep
2. **Courses but 80% hard technical content** (@karpathy, @AndrewYNg, etc.) — keep
3. **Self-deprecating real "sheep"** — not targeting others, keep

### One-line takeaway

> **Bio is the self-introduction. Tweets are the real identity. When they disagree, trust the tweets.**

## Safety notes

- **Dry-run first.** The script defaults to `DRY_RUN = true`.
- **Rate limits.** X caps unfollows at ~400-500/day. Batches > 50 trigger a confirm dialog.
- **v1.1 endpoint.** Uses `/i/api/1.1/friendships/destroy.json`, still active as of 2026-04 but subject to X's deprecation. If it stops working, PRs welcome.
- **Your cookies never leave the browser.** The script runs entirely in your browser using your existing login session. No server involved.
- **Code is ~100 lines.** Read it before pasting. That's the point of open source.

## Why this isn't a browser extension

Extensions need review, approval, and ongoing maintenance. A Console script you paste once and done is simpler, auditable in 60 seconds, and doesn't ask for permissions you can't revoke.

## FAQ

**Q: Is this against X's ToS?**
A: Bulk unfollow with reasonable delays isn't banned. Aggressive follow/unfollow cycling (follow-farming) is. This tool only unfollows and adds per-request delay.

**Q: Will my account get flagged?**
A: Probably not for batches < 50 with 2-4s delays. The script refuses batches > 50 without explicit confirmation.

**Q: Can this follow people too?**
A: No by design — this repo is only for subtraction. Adding follows is where the spam/rate-limit trouble actually lives.

**Q: What about Twitter Circle / Lists?**
A: Not touched. Only the global "Following" list.

## Development

See [SKILL.md](SKILL.md) for the Claude Code skill spec (including the `xreach` integration for auto-discovering candidates).

## License

MIT — see [LICENSE](LICENSE).

---

## 中文说明

X/Twitter 官方不让批量取关。这个仓库给你三样东西：

1. **一套方法论**：三级筛选法，判断该不该取关
2. **一段浏览器 Console 脚本**：一次粘贴，批量取关
3. **Claude Code skill**：自动拉关注列表、筛营销号、生成脚本

### 三级筛选法

**第一级 · bio 红旗（10 秒）**
命中 2 条起疑，3 条判死：
- 「财务自由」「日入/月入 XXX」「被动收入」「超级个体」「个人 IP 教练」
- bio 直挂微信/电报/星球引流
- 「前大厂 + PhD + 创始人」buff 叠满但找不到真作品

**第二级 · 推文验证（1 分钟，关键）**
- bio 营销 + 推文正常 → 🟡 留（虚张声势）
- bio 营销 + 推文变现话术密集 → 🔴 取
- bio 温和 + 推文 meme 币 shill / 擦边引流 → 🔴 取
- 名人金句搬运流 / 娱乐八卦 → 🔴 取（内容农场）

**第三级 · 例外豁免**
- 硬广但产品真的在跑 → 留
- 开课但 80% 硬核内容 → 留
- 自嘲老韭菜不割别人 → 留

### 核心洞察

> **bio 是自报家门，推文是真身。两个对不上，信推文。**
>
> 真有货的人推产品卖的是产品，没货的人推产品卖的是你的焦虑。

### 快速开始

1. 打开 https://x.com 并登录
2. 按 F12 → Console
3. 打开 `scripts/unfollow.js`，填入要取关的 handle 列表
4. **首次 `DRY_RUN = true`**，Console 会打印 "would unfollow" 预览
5. 检查无误后改 `DRY_RUN = false` 再跑

### 安全设计

- 默认 dry-run 防误伤
- 随机 2.5-4 秒延迟防风控
- 自动捕获当前 bearer token（无硬编码过期风险）
- Cookie 不离开浏览器，纯客户端运行

### License

MIT

---

*Originally built for cleaning a cluttered AI-Twitter feed. The three-tier filter is general — works for any "too much marketing noise" feed.*
