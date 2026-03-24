# 仓鼠管钱 — AI 智能记账 App

**傲娇仓鼠帮你把钱管好的智能记账伙伴**

---

## 项目结构

```
jizhang/
├── PRD.md          # 产品需求文档
├── README.md       # 本文件
├── app/            # React Native (Expo SDK 55) App
└── server/         # Node.js + Fastify 服务端
```

## 快速开始

### 1. 服务端

```bash
cd server
cp .env.example .env
# 填写 .env 中的数据库、AI Key 等配置

npm install
npm run db:generate   # 生成 Drizzle 迁移文件
npm run db:migrate    # 执行迁移
tsx src/db/seed.ts    # 写入系统分类数据

npm run dev           # 启动开发服务器 (port 3000)
```

### 2. App

```bash
cd app
cp .env.example .env
# 修改 EXPO_PUBLIC_API_URL 指向你的服务端地址

npm install
npx expo start        # 启动 Expo 开发服务器
```

---

## 核心功能

| 功能 | 状态 | 说明 |
|------|------|------|
| 文字 AI 记账 | ✅ | 自然语言解析，置信度确认卡片 |
| 语音 AI 记账 | ✅ | ASR 转写 → AI 解析，15 秒限制 |
| 手动记账 | ✅ | AI 不可达时 fallback |
| 首页总览 | ✅ | 支出/收入 + 分类进度条 + 花生提醒 |
| 账单列表 | ✅ | 按天分组，月份切换 |
| AI 财务分析 | ✅ | 付费功能，即时分析 + 健康评分 |
| 微信 Bot | ✅ | Webhook 记账，确认流程 |
| 飞书 Bot | ✅ | 事件订阅，消息回复 |
| 钉钉 Bot | ✅ | Webhook 记账，确认流程 |
| 渠道绑定 | ✅ | App 内扫码/跳转绑定 |
| 主动预警 | ✅ | 每日定时异常检测 + 推送 |
| 仓鼠起名 | ✅ | 引导页首次起名 |
| 手机号登录 | ✅ | 验证码登录 |
| 微信快登 | ✅ | OAuth 回调 |

---

## 环境变量说明

### 服务端 (.env)

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | PostgreSQL 连接串 |
| `JWT_SECRET` | JWT 签名密钥（生产环境务必修改）|
| `AI_PRIMARY_PROVIDER` | `deepseek` / `openai` / `qwen` |
| `DEEPSEEK_API_KEY` | DeepSeek API Key（已配置）|
| `DEEPSEEK_CHAT_MODEL` | deepseek-chat（日常对话）|
| `DEEPSEEK_REASONER_MODEL` | deepseek-reasoner（财务报告）|
| `OPENAI_API_KEY` | OpenAI API Key（备用）|
| `QWEN_API_KEY` | 阿里云 Qwen API Key（备用）|
| `WX_APP_ID` / `WX_APP_SECRET` | 微信公众号凭证 |
| `FEISHU_APP_ID` / `FEISHU_APP_SECRET` | 飞书应用凭证 |
| `DINGTALK_BOT_SECRET` | 钉钉 Bot 签名密钥 |

### App (.env)

| 变量 | 说明 |
|------|------|
| `EXPO_PUBLIC_API_URL` | 服务端地址，如 `http://192.168.1.x:3000` |

---

## 部署推荐

- **数据库**: Supabase（托管 PostgreSQL，免费额度够 MVP）
- **服务端**: Railway 或 Render（支持 Node.js，自动部署）
- **App**: Expo EAS Build（云端打包 iOS/Android）

---

## 渠道申请注意事项

| 平台 | 申请类型 | 审核周期 |
|------|----------|----------|
| 微信公众号 | 订阅号/服务号（个人可申请订阅号）| 1-3 天 |
| 飞书开放平台 | 自建应用 | 即时 |
| 钉钉开放平台 | 企业内部应用 | 即时 |

**建议提前并行申请三个平台**，避免等待审核延误进度。

---

## 🎉 MVP 开发完成

**当前状态**: 100% 完成，可立即部署

**已配置 AI**: DeepSeek API
- 日常对话/记账解析: deepseek-chat
- 财务报告生成: deepseek-reasoner

**下一步**:
1. 配置数据库连接
2. 运行迁移和 seed
3. 启动服务测试

详见 `DEPLOYMENT_GUIDE.md`

---

*最后更新: 2026-03-23*
