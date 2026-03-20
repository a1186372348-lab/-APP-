import { pgTable, text, integer, real, bigint, uniqueIndex } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  phone: text('phone').unique(),
  wxOpenid: text('wx_openid').unique(),
  feishuUserId: text('feishu_user_id').unique(),
  dingtalkUserId: text('dingtalk_user_id').unique(),
  assistantName: text('assistant_name').default('花生').notNull(),
  subscriptionTier: text('subscription_tier').default('free').notNull(), // free | premium
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  updatedAt: bigint('updated_at', { mode: 'number' }).notNull(),
});

export const categories = pgTable('categories', {
  id: text('id').primaryKey(),
  userId: text('user_id'), // NULL = 系统分类
  type: text('type').notNull(), // expense | income
  code: text('code').notNull(), // catering | transport | shopping | entertainment | other
  name: text('name').notNull(),
  icon: text('icon').notNull(),
  color: text('color').notNull(),
  isSystem: integer('is_system').default(0).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
});

export const transactions = pgTable('transactions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  direction: text('direction').notNull(), // expense | income | transfer
  amountCents: integer('amount_cents').notNull(), // 金额（分）
  currency: text('currency').default('CNY').notNull(),
  categoryId: text('category_id').references(() => categories.id),
  occurredAt: bigint('occurred_at', { mode: 'number' }).notNull(),
  merchant: text('merchant'),
  note: text('note'),
  source: text('source').notNull(), // manual | text_ai | voice_ai | wechat_bot | feishu_bot | dingtalk_bot
  rawInputText: text('raw_input_text'),
  aiConfidence: real('ai_confidence'),
  isDeleted: integer('is_deleted').default(0).notNull(),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  updatedAt: bigint('updated_at', { mode: 'number' }).notNull(),
});

export const channelBindings = pgTable('channel_bindings', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  channel: text('channel').notNull(), // wechat | feishu | dingtalk
  channelUserId: text('channel_user_id').notNull(),
  isActive: integer('is_active').default(1).notNull(),
  boundAt: bigint('bound_at', { mode: 'number' }).notNull(),
}, (table) => ({
  channelUserUniq: uniqueIndex('channel_user_uniq').on(table.channel, table.channelUserId),
}));

export const subscriptions = pgTable('subscriptions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  productId: text('product_id').notNull(),
  entitlement: text('entitlement').notNull(), // premium
  isActive: integer('is_active').default(1).notNull(),
  expiresAt: bigint('expires_at', { mode: 'number' }),
  platform: text('platform').notNull(), // ios | android | web
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  updatedAt: bigint('updated_at', { mode: 'number' }).notNull(),
});

export const aiMemory = pgTable('ai_memory', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  memoryType: text('memory_type').notNull(), // merchant_alias | fixed_expense | pattern
  scope: text('scope'),
  title: text('title').notNull(),
  summary: text('summary'),
  structuredPayload: text('structured_payload'), // JSON string
  confidence: real('confidence').default(1.0).notNull(),
  salience: real('salience').default(1.0).notNull(),
  status: text('status').default('active').notNull(),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  updatedAt: bigint('updated_at', { mode: 'number' }).notNull(),
});

// 渠道绑定临时 token（用于二维码绑定流程）
export const channelBindTokens = pgTable('channel_bind_tokens', {
  token: text('token').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  channel: text('channel').notNull(),
  expiresAt: bigint('expires_at', { mode: 'number' }).notNull(),
  usedAt: bigint('used_at', { mode: 'number' }),
});

export type User = typeof users.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type ChannelBinding = typeof channelBindings.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
