# 开发指南

## 项目状态

**当前完成度：60%**

### ✅ 已完成

#### 1. 数据库架构（100%）
- 所有表结构已定义（users, transactions, categories, channel_bindings, subscriptions, ai_memory）
- 符合 PRD 设计，包含 V2 预留字段

#### 2. 服务端核心（85%）
- ✅ Fastify 主服务框架
- ✅ JWT 认证中间件
- ✅ 完整的 API 路由：auth, transactions, categories, channels, ai
- ✅ AI 模块：记账解析、财务分析、健康评分、月度报告
- ✅ AI Provider 热切换（OpenAI/Qwen）
- ✅ 微信/飞书/钉钉 Bot 完整实现
- ✅ 数据库 ORM（Drizzle）
- ⚠️ 缺少：数据库迁移文件、异常检测定时任务实现

#### 3. App 前端（70%）
- ✅ Expo SDK 55 + React Native 配置
- ✅ 首页（数据前置方案 B）完整实现
- ✅ 记账弹窗（文字/语音 AI + 手动）完整实现
- ✅ 核心组件：HamsterAvatar, FloatingButton, CategoryBar, TransactionItem
- ✅ Store：authStore, transactionStore
- ✅ API 客户端封装
- ⚠️ 缺少：账单列表页、AI 分析页、设置页、引导页的完整实现

#### 4. 共享代码（90%）
- ✅ API 客户端
- ✅ 状态管理
- ✅ 常量定义
- ✅ 语音录音 Hook

### ⚠️ 待完成

#### P0 - 核心功能
- [ ] 数据库迁移脚本（drizzle-kit generate）
- [ ] 系统分类初始化（seed.ts）
- [ ] App 页面完整实现：
  - [ ] 账单列表页（transactions.tsx）
  - [ ] AI 分析页（insights.tsx）
  - [ ] 设置页（settings.tsx）
  - [ ] 引导页（onboarding.tsx）

#### P1 - 基础设施
- [ ] 环境变量配置（复制 .env.example 为 .env）
- [ ] 数据库部署（PostgreSQL）
- [ ] Redis 部署（可选，用于缓存）
- [ ] AI API Key 配置

#### P2 - 测试与优化
- [ ] 端到端测试（记账流程）
- [ ] Bot 消息处理测试
- [ ] 性能优化（首屏加载）

#### P3 - 增值功能
- [ ] 订阅付费系统（RevenueCat）
- [ ] 推送通知
- [ ] 本地 SQLite 缓存

---

## 快速开始

### 1. 环境准备

```bash
# 安装依赖
cd server && npm install
cd ../app && npm install
```

### 2. 配置环境变量

```bash
# 服务端
cp server/.env.example server/.env
# 编辑 server/.env，填入数据库连接、AI API Key 等

# App
cp app/.env.example app/.env
# 编辑 app/.env，填入服务端地址
```

### 3. 数据库初始化

```bash
cd server

# 生成迁移文件
npm run db:generate

# 执行迁移
npm run db:migrate

# 初始化系统分类
npx tsx src/db/seed.ts
```

### 4. 启动服务

```bash
# 启动服务端（开发模式）
cd server
npm run dev

# 启动 App（另一个终端）
cd app
npm start
```

---

## 开发任务清单

### 立即可做

1. **完善 App 页面**
   - 实现账单列表页的筛选、编辑、删除功能
   - 实现 AI 分析页（付费墙提示 + Premium 内容）
   - 实现设置页（仓鼠改名、渠道绑定、退出登录）
   - 实现引导页（注册 + 给仓鼠起名）

2. **数据库部署**
   - 使用 Supabase 或 Railway 部署 PostgreSQL
   - 配置 DATABASE_URL
   - 运行迁移和 seed

3. **AI 配置**
   - 获取 OpenAI API Key 或阿里云 Qwen API Key
   - 配置 .env 中的 AI_PRIMARY_PROVIDER

### 后续优化

4. **Bot 测试**
   - 配置微信公众号测试号
   - 测试飞书/钉钉 Bot 消息流程

5. **订阅系统**
   - 集成 RevenueCat
   - 实现 Premium 功能解锁

---

## 技术栈

- **服务端**: Node.js + Fastify + Drizzle ORM + PostgreSQL
- **App**: React Native + Expo SDK 55 + Zustand
- **AI**: OpenAI GPT-4o-mini / 阿里云 Qwen-Plus
- **部署**: Supabase (DB) + Railway (Server) + Expo EAS (App)

---

## 常见问题

### Q: 如何切换 AI Provider？
A: 修改 `server/.env` 中的 `AI_PRIMARY_PROVIDER=qwen`，服务会自动切换到阿里云 Qwen。

### Q: 如何测试微信 Bot？
A: 需要申请微信公众号测试号，配置 Webhook URL 为 `https://your-domain.com/webhooks/wechat`。

### Q: 数据库迁移失败怎么办？
A: 检查 DATABASE_URL 是否正确，确保 PostgreSQL 服务正在运行。

---

**最后更新**: 2026-03-23
