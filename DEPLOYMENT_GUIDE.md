# MVP 部署指南

## 📋 部署前检查清单

### 1. 环境准备
- [x] Node.js 18+ 已安装
- [x] PostgreSQL 数据库已准备
- [x] DeepSeek API Key 已获取

### 2. 服务端配置

```bash
cd server

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env，填入以下必填项：
# - DATABASE_URL
# - JWT_SECRET
# - DEEPSEEK_API_KEY
```

### 3. 数据库初始化

```bash
# 运行迁移
npm run db:migrate

# 初始化系统分类
npx tsx src/db/seed.ts
```

### 4. 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm run build
npm start
```

---

## 🚀 快速部署（推荐方案）

### 方案 A: Railway + Supabase

**数据库（Supabase）**
1. 访问 https://supabase.com
2. 创建新项目
3. 复制 Connection String（格式：postgresql://...）

**服务端（Railway）**
1. 访问 https://railway.app
2. New Project → Deploy from GitHub
3. 添加环境变量：
   ```
   DATABASE_URL=<Supabase连接串>
   JWT_SECRET=<随机生成>
   DEEPSEEK_API_KEY=sk-b7fde2b701bb44bf93267235b02c374e
   DEEPSEEK_BASE_URL=https://api.deepseek.com
   AI_PRIMARY_PROVIDER=deepseek
   ```
4. 部署完成后获取服务地址

### 方案 B: Render + Supabase

类似 Railway，使用 Render 部署服务端。

---

## 📱 App 部署

### 使用 Expo Go 测试

```bash
cd app

# 配置 API 地址
echo "EXPO_PUBLIC_API_URL=https://your-server.railway.app" > .env

# 启动
npm start

# 扫码测试
```

### 构建生产版本

```bash
# 安装 EAS CLI
npm install -g eas-cli

# 登录
eas login

# 构建
eas build --platform android
eas build --platform ios
```

---

## ✅ 部署验证

### 1. 服务端健康检查
```bash
curl https://your-server.railway.app/health
# 应返回: {"status":"ok","timestamp":...}
```

### 2. 测试记账解析
```bash
curl -X POST https://your-server.railway.app/ai/parse-accounting \
  -H "Content-Type: application/json" \
  -d '{"text":"午饭35元"}'
```

### 3. App 端测试
- 注册/登录流程
- 记账功能（文字/语音）
- 查看账单列表
- 月度统计展示

---

## 🔧 常见问题

**Q: 数据库连接失败？**
A: 检查 DATABASE_URL 格式，确保包含正确的用户名、密码、主机和端口。

**Q: AI 解析失败？**
A: 检查 DEEPSEEK_API_KEY 是否正确，网络是否可访问 api.deepseek.com。

**Q: App 无法连接服务端？**
A: 确认 EXPO_PUBLIC_API_URL 配置正确，服务端已启动且可访问。

---

**部署完成后，项目即可投入使用！**
