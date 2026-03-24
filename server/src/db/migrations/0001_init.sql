-- 初始化数据库表结构
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  phone TEXT UNIQUE,
  wx_openid TEXT UNIQUE,
  feishu_user_id TEXT UNIQUE,
  dingtalk_user_id TEXT UNIQUE,
  assistant_name TEXT NOT NULL DEFAULT '花生',
  subscription_tier TEXT NOT NULL DEFAULT 'free',
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  type TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  is_system INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  direction TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'CNY',
  category_id TEXT REFERENCES categories(id),
  occurred_at BIGINT NOT NULL,
  merchant TEXT,
  note TEXT,
  source TEXT NOT NULL,
  raw_input_text TEXT,
  ai_confidence REAL,
  is_deleted INTEGER NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE INDEX idx_transactions_user_occurred ON transactions(user_id, occurred_at DESC);
CREATE INDEX idx_transactions_user_deleted ON transactions(user_id, is_deleted);

CREATE TABLE IF NOT EXISTS channel_bindings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  channel TEXT NOT NULL,
  channel_user_id TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  bound_at BIGINT NOT NULL,
  UNIQUE(channel, channel_user_id)
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  product_id TEXT NOT NULL,
  entitlement TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  expires_at BIGINT,
  platform TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_memory (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  memory_type TEXT NOT NULL,
  scope TEXT,
  title TEXT NOT NULL,
  summary TEXT,
  structured_payload TEXT,
  confidence REAL NOT NULL DEFAULT 1.0,
  salience REAL NOT NULL DEFAULT 1.0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS channel_bind_tokens (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  channel TEXT NOT NULL,
  expires_at BIGINT NOT NULL,
  used_at BIGINT
);

CREATE INDEX idx_bind_tokens_expires ON channel_bind_tokens(expires_at);
