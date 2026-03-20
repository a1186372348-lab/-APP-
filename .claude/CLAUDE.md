# 项目：仓鼠管钱 — AI 智能记账 App

## GitHub 仓库
**默认远程仓库**: https://github.com/a1186372348-lab/-APP-.git

每次提交代码后，默认推送到此仓库的 `master` 分支：
```bash
git push origin master
```

## 项目说明
- 产品文档见 `PRD.md`
- 技术架构：React Native (Expo SDK 55) + Node.js/Fastify + PostgreSQL
- 设计方向：方案 B（数据前置），仓鼠「花生」以助手 icon 形式存在

## 目录结构
- `app/` — React Native App（Expo）
- `server/` — 服务端（Fastify + Drizzle ORM）
- `src/` — App 共享代码（组件、状态、API 客户端）
