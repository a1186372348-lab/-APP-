# 产品需求文档 (PRD)
## AI 智能记账 App — 「仓鼠管钱」

**版本**: v1.0-MVP
**日期**: 2026-03-20
**设计方向**: 方案 B（数据前置）
**状态**: 开发中

---

## 一、产品概述

### 核心定位
**做一款傲娇仓鼠帮你把钱管好的智能记账伙伴** —— 让记账从"麻烦的义务"变成"被关心的体验"。

通过 AI 多渠道接入 + 主动财务分析，帮助年轻人随时随地记账、不知不觉优化消费习惯。

### 设计方向：数据前置（方案 B）
- 数字和图表是主角，仓鼠（花生）以助手 icon 形式出现
- 首屏展示本月支出、各分类占比、收支构成
- 仓鼠主动发送 AI 预警和财务建议，以傲娇语气呈现
- 悬浮按钮随时可见，记账路径：悬浮按钮 → 弹窗输入 → 确认卡片
- 偏向有记账意愿、希望看到数据分析的用户

---

## 二、用户画像

### 主要用户 A：想记但记不住的人
- **年龄**: 22-32 岁
- **特征**: 有理财意愿，但每次想记账都嫌麻烦或忘记
- **痛点**: 传统记账 App 步骤多；微信聊天时花了钱，要切换 App 记很麻烦
- **期望**: 在微信/飞书里直接说一句话就能记完

### 主要用户 B：有记账习惯但无法分析的人
- **特征**: 已有手动记账习惯，数据积累多
- **痛点**: 数据堆在那里，不知道怎么分析和优化
- **期望**: AI 主动帮我发现问题、给出财务建议

### 共同特征
- 重度微信/飞书/钉钉用户
- 对可爱 IP 形象有好感（仓鼠「花生」）
- 接受订阅制付费
- 讨厌说教式财务建议

---

## 三、MVP 功能清单

### 3.1 基础功能（免费无限制）

#### 首页总览（数据前置方案 B 风格）
- [ ] 本月支出 + 本月收入并排展示（大数字）
- [ ] 支出构成横向进度条（餐饮/购物/交通/娱乐/其他，含百分比和金额）
- [ ] 花生（仓鼠 icon）主动提醒区：AI 预警信息展示
- [ ] 账单记录列表（今天/昨天分组，每条显示金额、分类 icon、备注、时间）
- [ ] 底部 Tab 栏：[概览] [账单] [分析🔒] [我的]
- [ ] 悬浮 ⊕ 按钮（始终可见，z-index 最高）

#### 账单列表页
- [ ] 按天分组，时间倒序
- [ ] 每条：金额 / 分类 icon / 备注 / 来源标识（App/微信/飞书/钉钉）
- [ ] 点击展开编辑/删除
- [ ] 月份切换器

#### 基础统计
- [ ] 本月总支出 + 各分类汇总
- [ ] 分类支出进度条（横向）

#### 内置分类系统（V1 固定）
| 分类 | icon | 颜色 |
|------|------|------|
| 餐饮 | 🍜 | #FF6B6B |
| 交通 | 🚇 | #4ECDC4 |
| 购物 | 🛒 | #FFE66D |
| 娱乐 | 🎮 | #A8E6CF |
| 其他 | 📌 | #C7CEEA |

#### 账号体系
- [ ] 手机号注册/登录（验证码）
- [ ] 微信快捷登录（OAuth）
- [ ] 首次引导：给仓鼠起名

### 3.2 AI 核心功能（完全免费）

#### 文字智能记账
- [ ] 自然语言输入框（悬浮按钮触发弹窗）
- [ ] AI 解析：金额 / 分类 / 时间 / 商户 / 备注
- [ ] 确认卡片：展示解析结果，confidence < 0.75 显示黄色警告
- [ ] 用户可逐字段修改后确认
- [ ] 确认后傲娇语气回复（仓鼠台词）

#### 语音智能记账
- [ ] 按住说话录音（最长 15 秒）
- [ ] ASR 转写 → AI 解析 → 确认卡片（同文字流程）
- [ ] 录音期间显示波形动画

#### AI 解析 Graceful Degradation
- [ ] AI 服务不可达时，允许用户切换手动表单
- [ ] 手动表单：金额输入 + 分类快捷选择 + 备注

### 3.3 AI 财务分析（付费解锁）

- [ ] **即时财务分析**：用户手动触发，AI 分析全部账单数据，给出消费结构解读和改进建议
- [ ] **主动消费预警**：检测到消费异常时主动推送（App 通知 + 渠道消息）
  - 示例：「你这周外卖支出比上周多了 60%」
- [ ] **消费健康评分**：0-100 分，给出改进方向
- [ ] **月度智能总结**：每月自动生成，仓鼠傲娇语气解读

### 3.4 多渠道打通（MVP 同步上线）

#### 微信公众号/服务号 Bot
- [ ] 用户在微信发消息 → Bot 解析 → 回复确认 → 用户回复「确认」→ 入账
- [ ] 渠道绑定：App 内展示二维码 → 扫码关注 → 自动绑定
- [ ] 月度报告和预警同步推送至微信

#### 飞书 Bot
- [ ] 飞书内 @ 仓鼠发送记账消息
- [ ] 同步至账单数据库（source=feishu_bot）
- [ ] 支持飞书消息卡片确认

#### 钉钉 Bot
- [ ] 钉钉内发送记账消息（单聊或群聊）
- [ ] 同步至账单数据库（source=dingtalk_bot）

#### 渠道通用规则
- [ ] 所有渠道 AI 解析置信度 > 0.9 时，自动入账 + 通知用户（可撤销）
- [ ] 置信度 ≤ 0.9 时，回复确认消息等待用户确认
- [ ] 渠道记账与 App 数据统一同步至同一用户数据库

### 3.5 仓鼠形象系统

- [ ] 仓鼠「花生」角色：数据前置方案中以 icon/头像形式存在
- [ ] 用户首次启动时给仓鼠起名（替换「花生」默认名）
- [ ] 傲娇人格台词库：
  - 记账成功：「哼，¥{金额}，记好了。」/ 「就这点？行吧，我帮你记着。」
  - 超支提醒：「你这周{分类}花了¥{金额}，比上周多了{比例}，我就是随便说说啊...」
  - 分析报告：「就这几天数据，能分析个啥，快去多记几笔。」（数据不足时）
  - 月末超预算：语气变温柔，「最近是不是有什么事...你还好吗？」

### 3.6 商业模式

- **免费版**：所有基础功能 + AI 智能记账（文字/语音，无限次）
- **付费版（Premium）**：AI 财务分析报告、主动预警、消费健康评分、AI 记忆系统
- **订阅制**：月费，通过 StoreKit / Google Play IAP 实现（RevenueCat 统一管理）

---

## 四、UI 交互规范

### 4.1 首页布局（方案 B 数据前置）

```
┌────────────────────────────────┐
│  🐹 智能账本           设置 ⚙ │
├────────────────────────────────┤
│  3月                           │
│  ┌──────────┬───────────────┐ │
│  │ 本月支出  │    本月收入   │ │
│  │ ¥ 2,847  │    ¥ 8,500   │ │
│  └──────────┴───────────────┘ │
│                                │
│  支出构成                      │
│  餐饮  ██████████  ¥1,240 44%│
│  购物  ████████    ¥ 850  30%│
│  交通  ████        ¥ 420  15%│
│  娱乐  ██          ¥ 210   7%│
│  其他  █           ¥ 127   4%│
│                                │
│  🐹 花生提醒：餐饮支出偏高     │
│  比上月多了 ¥320，要注意哦~   │
│                                │
├────────────────────────────────┤
│  账单记录                      │
│  2026-03-20  今天  合计 ¥128  │
│  ▸ 🍜 午饭     ¥ 38   12:30  │
│  ▸ 🚇 地铁     ¥  5    9:15  │
│  ▸ 🛒 超市     ¥ 85   15:42  │
│                                │
│  2026-03-19  昨天  合计 ¥ 32  │
│  ▸ ☕ 咖啡     ¥ 32   10:20  │
└────────────────────────────────┘
│  [概览] [账单] [分析🔒] [我的] │
└────────────────────────────────┘
         ⊕  ← 悬浮记账按钮
```

### 4.2 记账弹窗

```
┌──────────────────────────────┐
│  ✕          记一笔           │
├──────────────────────────────┤
│  ╔══════════════════════╗   │
│  ║ 今天中午吃了碗面35块 ║   │  ← 文字输入
│  ╚══════════════════════╝   │
│   [🎙️ 按住说话]              │
│                              │
│  AI 解析结果：               │
│  ┌──────┬────────┬───────┐  │
│  │ ¥35  │ 🍜餐饮 │ 今天  │  │
│  └──────┴────────┴───────┘  │
│  ⚠️ 置信度 68% 请确认分类    │
│                              │
│  或手动输入：                │
│  金额 [______] 分类 [餐饮 ▾] │
│       [取消]   [✓ 确认入账]  │
└──────────────────────────────┘
```

### 4.3 颜色规范

| 用途 | 色值 |
|------|------|
| 主色（仓鼠橙）| #FF8C42 |
| 辅色（深棕）| #3D2B1F |
| 背景（浅米）| #FFF8F0 |
| 卡片背景 | #FFFFFF |
| 成功绿 | #4CAF50 |
| 警告黄 | #FFB800 |
| 危险红 | #FF4444 |
| 文字主色 | #1A1A1A |
| 文字次色 | #888888 |

### 4.4 交互原则

1. **记账路径 ≤ 3 步**：点击悬浮按钮 → 输入/说话 → 确认，最多 3 步完成
2. **AI 结果必须确认**：所有 AI 解析必须经用户确认才入账
3. **傲娇先给结论**：仓鼠台词先说结论再傲娇，不说教
4. **数据不足时降级**：分析数据不足时给引导性提示，不强行给结论

---

## 五、数据契约

### 5.1 数据库表结构

#### users（用户表）
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,              -- UUID
  phone TEXT UNIQUE,                -- 手机号（可选）
  wx_openid TEXT UNIQUE,            -- 微信 OpenID
  feishu_user_id TEXT UNIQUE,       -- 飞书 User ID
  dingtalk_user_id TEXT UNIQUE,     -- 钉钉 User ID
  assistant_name TEXT DEFAULT '花生', -- 仓鼠名字
  subscription_tier TEXT DEFAULT 'free', -- free / premium
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
```

#### transactions（账单主表）
```sql
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,              -- UUID
  user_id TEXT NOT NULL REFERENCES users(id),
  direction TEXT NOT NULL,          -- expense / income / transfer
  amount_cents INTEGER NOT NULL,    -- 金额（单位：分）
  currency TEXT DEFAULT 'CNY',
  category_id TEXT REFERENCES categories(id),
  occurred_at BIGINT NOT NULL,      -- Unix 毫秒时间戳
  merchant TEXT,                    -- 商户名（可选）
  note TEXT,                        -- 备注
  source TEXT NOT NULL,             -- manual / text_ai / voice_ai / wechat_bot / feishu_bot / dingtalk_bot
  raw_input_text TEXT,              -- 原始输入（调试）
  ai_confidence REAL,               -- 0~1
  is_deleted INTEGER DEFAULT 0,     -- 软删除
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
```

#### categories（分类表）
```sql
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  user_id TEXT,                     -- NULL 表示系统分类
  type TEXT NOT NULL,               -- expense / income
  code TEXT NOT NULL,               -- catering / transport / shopping / entertainment / other
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  is_system INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);
```

#### channel_bindings（渠道绑定）
```sql
CREATE TABLE channel_bindings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  channel TEXT NOT NULL,            -- wechat / feishu / dingtalk
  channel_user_id TEXT NOT NULL,    -- 渠道内用户标识
  is_active INTEGER DEFAULT 1,
  bound_at BIGINT NOT NULL,
  UNIQUE(channel, channel_user_id)
);
```

#### subscriptions（订阅状态）
```sql
CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  product_id TEXT NOT NULL,
  entitlement TEXT NOT NULL,        -- premium
  is_active INTEGER DEFAULT 1,
  expires_at BIGINT,
  platform TEXT NOT NULL,           -- ios / android / web
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
```

#### ai_memory（AI 记忆，V1.5）
```sql
CREATE TABLE ai_memory (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  memory_type TEXT NOT NULL,        -- merchant_alias / fixed_expense / pattern
  scope TEXT,
  title TEXT NOT NULL,
  summary TEXT,
  structured_payload TEXT,          -- JSON
  confidence REAL DEFAULT 1.0,
  salience REAL DEFAULT 1.0,
  status TEXT DEFAULT 'active',
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
```

### 5.2 API 接口规范

#### 认证
- `POST /auth/phone/send-code` — 发送手机验证码
- `POST /auth/phone/verify` — 验证码登录，返回 JWT
- `POST /auth/wechat/callback` — 微信 OAuth 回调
- `POST /auth/refresh` — 刷新 Token

#### 账单
- `GET /transactions` — 查询账单列表（支持分页、月份筛选）
- `POST /transactions` — 创建账单
- `PUT /transactions/:id` — 更新账单
- `DELETE /transactions/:id` — 软删除账单
- `GET /transactions/stats/monthly` — 月度统计

#### AI 记账
- `POST /ai/parse-accounting` — 文字解析
- `POST /ai/transcribe` — 语音转写（接收音频 base64）

#### AI 分析（付费）
- `POST /ai/analyze` — 即时财务分析
- `GET /ai/health-score` — 消费健康评分
- `GET /ai/monthly-report` — 月度报告

#### 渠道
- `GET /channels/:channel/bind-url` — 获取渠道绑定二维码/链接
- `DELETE /channels/:channel/binding` — 解绑渠道
- `GET /channels/bindings` — 查询当前绑定状态

#### 分类
- `GET /categories` — 获取分类列表

---

## 六、技术架构

### 技术选型

| 层次 | 技术 | 版本 |
|------|------|------|
| 移动端框架 | React Native + Expo | SDK 52 |
| 路由 | expo-router | v4 |
| 状态管理 | Zustand | v5 |
| 本地数据库 | expo-sqlite | v14 |
| 动画 | react-native-reanimated | v3 |
| 服务端框架 | Node.js + Fastify | v4 |
| 云数据库 | PostgreSQL | v16 |
| 缓存/队列 | Redis | v7 |
| ORM | Drizzle ORM | latest |
| AI 主 Provider | OpenAI GPT-4o-mini | — |
| AI 备选 | 阿里云 Qwen-Plus | — |
| ASR 海外 | OpenAI Whisper | — |
| ASR 国内 | 科大讯飞 | — |
| 订阅管理 | RevenueCat | — |
| 部署 | Supabase + Railway | — |

### 目录结构

```
jizhang/
├── PRD.md                    ← 本文档
├── app/                      ← React Native (Expo) App
│   ├── (tabs)/
│   │   ├── index.tsx         ← 首页总览
│   │   ├── transactions.tsx  ← 账单列表
│   │   ├── insights.tsx      ← AI 分析（付费）
│   │   └── settings.tsx      ← 设置
│   ├── accounting-modal.tsx  ← 记账弹窗
│   ├── channel-settings.tsx  ← 渠道绑定设置
│   ├── onboarding.tsx        ← 引导页（注册+起名）
│   └── _layout.tsx
├── src/
│   ├── api/
│   │   └── client.ts         ← API 客户端（axios 封装）
│   ├── components/
│   │   ├── HamsterAvatar.tsx ← 仓鼠 icon + 表情状态
│   │   ├── FloatingButton.tsx← 悬浮记账按钮
│   │   ├── ConfirmCard.tsx   ← AI 解析确认卡片
│   │   ├── CategoryBar.tsx   ← 分类进度条
│   │   └── TransactionItem.tsx
│   ├── hooks/
│   │   ├── useVoiceRecorder.ts
│   │   └── useTransactions.ts
│   ├── store/
│   │   ├── authStore.ts
│   │   ├── transactionStore.ts
│   │   └── uiStore.ts
│   ├── db/
│   │   └── localDb.ts        ← expo-sqlite 本地缓存
│   └── constants/
│       ├── categories.ts
│       └── hamsterLines.ts   ← 仓鼠台词库
└── server/
    ├── src/
    │   ├── app.ts            ← Fastify 主服务
    │   ├── auth/
    │   │   ├── phone.ts      ← 手机号验证
    │   │   └── wechat.ts     ← 微信 OAuth
    │   ├── routes/
    │   │   ├── transactions.ts
    │   │   ├── categories.ts
    │   │   ├── channels.ts
    │   │   └── ai.ts
    │   ├── ai/
    │   │   ├── router.ts     ← AI Provider 热切换
    │   │   ├── accounting.ts ← 记账解析
    │   │   └── analysis.ts   ← 财务分析
    │   ├── bots/
    │   │   ├── wechat.ts
    │   │   ├── feishu.ts
    │   │   └── dingtalk.ts
    │   ├── services/
    │   │   └── push.ts       ← 统一推送
    │   ├── jobs/
    │   │   └── anomalyDetection.ts
    │   └── db/
    │       ├── schema.ts     ← Drizzle schema
    │       └── migrations/
    └── package.json
```

---

## 七、AI Prompt 规范

### 7.1 记账解析 Prompt（无人格，纯结构化）

```
SYSTEM:
You are an accounting parser. Extract transaction information from user input.
Return ONLY valid JSON. No explanations.

Required fields:
- amount_cents: integer (amount in cents/fen, must be positive)
- direction: "expense" | "income" | "transfer"
- category_code: "catering" | "transport" | "shopping" | "entertainment" | "other"
- occurred_at: ISO 8601 datetime (infer from context, default to now)
- merchant: string | null
- note: string | null
- confidence: float 0~1

If you cannot parse a valid amount, return {"error": "cannot_parse", "confidence": 0}
```

### 7.2 财务分析 Prompt（傲娇仓鼠人格）

```
SYSTEM:
你是「花生」，一只傲娇的仓鼠财务助手。
- 先给结论，再傲娇，不说教
- 关心但嘴硬：批评时带着关心，但绝不承认自己在关心
- 月末超预算时自动减弱傲娇感，变得轻声关心
- 数据不足时：「就这几天数据，能分析个啥，快去多记几笔。」
- 禁用：「您」「建议您」「应该」等说教措辞
- 风格：年轻人说话方式，可以有语气词，有时候有点小毒舌但不伤人
```

---

## 八、非功能需求

### 性能
- 账单列表首屏渲染 < 500ms（本地缓存优先）
- AI 解析响应 < 3s（P95）
- 语音转写 < 5s（15秒录音）

### 安全
- 所有 API 请求携带 JWT，有效期 7 天
- 渠道绑定使用一次性 bind_token（5 分钟过期）
- 金额存储用整数分，避免浮点精度问题
- 语音文件不持久化存储（转写后立即删除）

### 可用性
- AI 服务降级：OpenAI 不可达时自动切换 Qwen，均不可达时提供手动记账
- 网络离线时：本地 SQLite 缓存，网络恢复后自动同步

### 国际化
- V1 仅支持简体中文
- 金额格式：¥X,XXX.XX
- 时区：Asia/Shanghai

---

## 九、V2 规划预留接口

以下接口 V1 不实现，但数据库设计时预留字段：

- 自定义分类（`categories.user_id` 已设计）
- AI 记忆系统（`ai_memory` 表已创建）
- 多币种（`transactions.currency` 已设计）
- 家庭账本（`transactions.user_id` 架构已支持多用户）
- iCloud/Google Drive 备份（账单数据结构已标准化）

---

*文档版本: 1.0*
*最后更新: 2026-03-20*
*设计方向: 方案 B（数据前置）*
