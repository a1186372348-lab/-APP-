/**
 * 初始化系统分类数据
 * 运行: tsx src/db/seed.ts
 */
import { v4 as uuidv4 } from 'uuid';
import { getDb } from './index';
import { categories } from './schema';

const SYSTEM_CATEGORIES = [
  // 支出分类
  { code: 'catering', type: 'expense', name: '餐饮', icon: '🍜', color: '#FF6B6B', sortOrder: 1 },
  { code: 'transport', type: 'expense', name: '交通', icon: '🚇', color: '#4ECDC4', sortOrder: 2 },
  { code: 'shopping', type: 'expense', name: '购物', icon: '🛒', color: '#FFE66D', sortOrder: 3 },
  { code: 'entertainment', type: 'expense', name: '娱乐', icon: '🎮', color: '#A8E6CF', sortOrder: 4 },
  { code: 'medical', type: 'expense', name: '医疗', icon: '💊', color: '#FFB3BA', sortOrder: 5 },
  { code: 'other_expense', type: 'expense', name: '其他', icon: '📌', color: '#C7CEEA', sortOrder: 6 },
  // 收入分类
  { code: 'salary', type: 'income', name: '工资', icon: '💰', color: '#98D8C8', sortOrder: 1 },
  { code: 'bonus', type: 'income', name: '奖金', icon: '🎁', color: '#B8E0D2', sortOrder: 2 },
  { code: 'other_income', type: 'income', name: '其他收入', icon: '💵', color: '#D6EAF8', sortOrder: 3 },
];

async function seed() {
  const db = getDb();
  const now = Date.now();

  for (const cat of SYSTEM_CATEGORIES) {
    await db.insert(categories).values({
      id: uuidv4(),
      userId: null,
      type: cat.type,
      code: cat.code,
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      isSystem: 1,
      sortOrder: cat.sortOrder,
    }).onConflictDoNothing();
  }

  console.log('Seed complete: inserted system categories.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
