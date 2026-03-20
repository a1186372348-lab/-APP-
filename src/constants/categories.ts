export interface Category {
  id: string;
  code: string;
  type: 'expense' | 'income';
  name: string;
  icon: string;
  color: string;
}

export const SYSTEM_CATEGORIES: Category[] = [
  { id: 'sys_catering', code: 'catering', type: 'expense', name: '餐饮', icon: '🍜', color: '#FF6B6B' },
  { id: 'sys_transport', code: 'transport', type: 'expense', name: '交通', icon: '🚇', color: '#4ECDC4' },
  { id: 'sys_shopping', code: 'shopping', type: 'expense', name: '购物', icon: '🛒', color: '#FFE66D' },
  { id: 'sys_entertainment', code: 'entertainment', type: 'expense', name: '娱乐', icon: '🎮', color: '#A8E6CF' },
  { id: 'sys_medical', code: 'medical', type: 'expense', name: '医疗', icon: '💊', color: '#FFB3BA' },
  { id: 'sys_other_expense', code: 'other_expense', type: 'expense', name: '其他', icon: '📌', color: '#C7CEEA' },
  { id: 'sys_salary', code: 'salary', type: 'income', name: '工资', icon: '💰', color: '#98D8C8' },
  { id: 'sys_bonus', code: 'bonus', type: 'income', name: '奖金', icon: '🎁', color: '#B8E0D2' },
  { id: 'sys_other_income', code: 'other_income', type: 'income', name: '其他收入', icon: '💵', color: '#D6EAF8' },
];

export const EXPENSE_CATEGORIES = SYSTEM_CATEGORIES.filter((c) => c.type === 'expense');
export const INCOME_CATEGORIES = SYSTEM_CATEGORIES.filter((c) => c.type === 'income');

export function getCategoryByCode(code: string): Category | undefined {
  return SYSTEM_CATEGORIES.find((c) => c.code === code);
}
