-- 初始化数据库（手动建表，或使用 drizzle-kit 生成迁移）
-- 运行: psql -U postgres -d jizhang -f init.sql

CREATE DATABASE jizhang;

-- 可以用 drizzle-kit generate 自动生成迁移文件
-- 然后 tsx src/db/migrate.ts 执行迁移
-- 最后 tsx src/db/seed.ts 写入系统分类
