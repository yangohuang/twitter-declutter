# 取关.skill

> 一套浏览器 Console 脚本 + 判断方法论，帮你在 20 秒内清理 X/Twitter 关注列表里的营销号、割韭菜号、内容农场号。

![License: MIT](https://img.shields.io/badge/license-MIT-green.svg) ![Lang](https://img.shields.io/badge/中文-优先-red.svg)

---

## 为什么做这个

关注列表清一色「财务自由」「超级个体」「个人 IP 教练」的时候，你知道需要清理了。

但 X/Twitter 官方**不让批量取关**。手动一个个点要点半天，还容易看着看着就上头点错。

这个仓库给你三件套：

1. **一套判断方法论** — 三级筛选法，2 分钟判断一个号该不该留
2. **一段浏览器 Console 脚本** — 一次粘贴，批量取关（带 dry-run 预防误伤）
3. **Claude Code skill** — 自动拉关注列表、分析营销痕迹、生成取关脚本

---

## 核心洞察

> **bio 是自报家门，推文是真身。两个对不上，信推文。**
>
> **真有货的人推产品卖的是产品。没货的人推产品卖的是你的焦虑。**

「普通人也能月入 10 万」「AI 让每个人成为一人公司」「超级个体从 0 到 1」——
这些话只对一种人管用：**自己还没成的那群人**。

割韭菜的本质不是「赚钱」，
是「把你的时间、注意力、认知焦虑，换成他的钱」的单向阀。

---

## 三级筛选法

### 🚩 第一级 · bio 红旗（10 秒）

命中 **2 条** 起疑，**3 条** 判死：

**话术红旗**
- 「财务自由」「日入 XXX」「月入 XXX」「被动收入」
- 「超级个体」「个人 IP 教练」「牛马 AI」「一人公司」
- 「帮 XXX 人变现」「已成就 XXX 粉丝」「Marketing + AI = $$$」

**闭环红旗**
- bio 直挂 微信 / 电报 / 星球 / 公众号 引流
- 「感兴趣扣 1」「私信领资料」「扫码进群」

**身份表演红旗**
- 「前大厂 + 清北 + PhD + 创始人」buff 叠满，但找不到一个真实作品
- 「CEO / 布道师」但公司名只能在 bio 里见到

### 🔍 第二级 · 推文验证（1 分钟，关键）

第一级筛出嫌疑后，**必须抽样 3-5 条推文**。四种典型翻车：

| bio 状态 | 推文状态 | 判决 |
|---|---|---|
| 营销满屏 | 正常技术分享 / 生活吐槽 | 🟡 保留观察（虚张声势） |
| 营销满屏 | 变现话术密度 > 50% | 🔴 取关（说到做到型韭菜） |
| bio 温和 | 纯 meme 币 shill / 擦边引流 | 🔴 取关（闷声型） |
| bio 温和 | 名人金句批量流 / 娱乐八卦搬运 | 🔴 取关（内容农场） |

### ✅ 第三级 · 例外豁免（别误伤好人）

1. **硬广但产品是真的** — Levelsio、ShipFast、Builder.io CEO 这类
   也挂 `$XXk/m`，但成品公开可用、公司在跑、代码能看 → **留**
2. **开课但 80% 硬核内容的技术 KOL** — @karpathy、@AndrewYNg、dotey、lijigang 这类
   信息密度够高，软广是副产品 → **留**
3. **自嘲型真韭菜** — 「亏过 500 万，现在用 AI 搞钱」这种
   自己是韭菜不割别人，偶尔真有料 → **留**

> 工具要有刀锋，但不能伤好人。

---

## 快速开始（只用脚本，不装 Claude）

1. 打开 https://x.com 并登录
2. 按 **F12** 打开 DevTools → **Console** 标签
3. 打开 [`scripts/unfollow.js`](scripts/unfollow.js)，编辑 `HANDLES` 数组（不带 `@`）
4. **首次保持 `DRY_RUN = true`** — 只打印「would unfollow」预览，不实际取关
5. 整段脚本粘进 Console，回车
6. dry-run 输出确认无误后，改 `DRY_RUN = false` 再跑一次

```javascript
const HANDLES = [
  'marketing_account_1',
  'cringe_crypto_shill_2',
  'fake_guru_3',
];
const DRY_RUN = true;  // ← 首次保持 true，预览完再改 false
```

---

## 快速开始（用 Claude Code 全自动）

如果你用 [Claude Code](https://claude.com/claude-code)，把仓库放到 skills 目录就能通过自然语言触发：

```bash
git clone https://github.com/yangohuang/twitter-declutter ~/.claude/skills/取关.skill
```

然后对 Claude 说：

> 分析我的 X 关注列表，给我营销号取关清单

Claude 会自动：
1. 问你 X handle
2. 用 [`xreach`](https://github.com/Panniantong/agent-reach) 拉完整 following 列表
3. 按 bio 红旗初筛 + 推文采样验证
4. 输出三级清单（🔴 取关 / 🟡 观察 / 🟢 留）
5. 生成可粘贴的 Console 脚本

---

## 安全设计

- **默认 Dry-run**：脚本默认 `DRY_RUN = true`，防止粘完就误伤
- **自动捕获 Bearer**：通过 monkey-patch `window.fetch` 捕获页面正在用的真实 bearer token，避免硬编码过期失效
- **Rate-limit 保护**：50+ 批次触发 confirm 对话框（X 日限约 400-500）
- **随机延迟**：请求之间 2.5-4 秒随机等待，降低风控概率
- **Cookie 不离开浏览器**：全程客户端运行，无服务器中转
- **代码 ~100 行**：粘进 Console 之前自己读一遍，这就是开源的意义

---

## 为什么不做成浏览器扩展

扩展要审核、要持续维护、要申请用户可能不会细看的权限。
Console 脚本你粘一次用完，60 秒内可审计完，拿不到你不想给的任何权限。

---

## FAQ

**Q：这违反 X 的 ToS 吗？**
A：带合理延迟的批量取关不违规。违规的是「follow/unfollow 反复循环」那种涨粉骗术（follow-farming）。本工具只做取关，且有延迟。

**Q：我的账号会不会被限流？**
A：< 50 个账号 + 2-4 秒延迟，基本没事。> 50 脚本会强制 confirm 一次才继续。

**Q：能顺便帮我关注吗？**
A：不行，设计上就是只做减法。加关注才是 rate-limit / 封号的高发地。

**Q：能清 Twitter Circle / Lists 吗？**
A：不能。只处理全局 Following 列表。

---

## 使用建议

- **每季度跑一次**，定期清扫
- **每年做一次大清理**，对着硬核标准筛一轮
- 关注列表是认知的入口 —— **入口长什么样，你就长什么样**

---

## 开发

- [SKILL.md](SKILL.md) — Claude Code skill 规格（含 `xreach` 集成 agent 自动化流程）
- [scripts/unfollow.js](scripts/unfollow.js) — 独立 Console 脚本（131 行）
- [LICENSE](LICENSE) — MIT

---

## English (TL;DR)

A browser Console script + methodology to bulk-unfollow marketing accounts on X/Twitter.
20 seconds instead of 20 clicks.

**Core insight**:
> Bio is the self-introduction. Tweets are the real identity. When they disagree, trust the tweets.
>
> People who actually have value sell products. People without value sell your anxiety.

**The three-tier filter**:
1. **Bio red flags** (10s) — "financial freedom", "super individual", "personal IP coach", WeChat in bio, stacked prestige with no visible work
2. **Tweet verification** (1min, critical) — when bio and tweets disagree, trust the tweets
3. **Exemptions** — real product hard-promo (Levelsio, ShipFast), 80% hard-tech content KOLs (@karpathy), self-deprecating honest "sheep"

**Usage**:
1. Open https://x.com, log in
2. F12 → Console
3. Edit `HANDLES` in [`scripts/unfollow.js`](scripts/unfollow.js)
4. Keep `DRY_RUN = true` first; verify, then flip to `false`
5. Paste, enter

**Safety**: Dry-run default, auto bearer capture (no hardcoded token rot), randomized 2.5-4s delays, confirm dialog for batches > 50. Cookies stay in browser. ~100 lines of code — read it before you paste it.

MIT License.

---

*Originally built for cleaning a cluttered AI-Twitter feed. The three-tier filter generalizes — works for any «too much marketing noise» feed.*
