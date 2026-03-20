import { create } from 'zustand';
import { Transaction, MonthlyStats, transactionsApi } from '../api/client';

interface TransactionState {
  transactions: Transaction[];
  monthlyStats: MonthlyStats | null;
  currentMonth: string;
  isLoading: boolean;
  error: string | null;

  fetchTransactions: (month?: string) => Promise<void>;
  fetchMonthlyStats: (month?: string) => Promise<void>;
  addTransaction: (tx: Transaction) => void;
  removeTransaction: (id: string) => void;
  setMonth: (month: string) => void;
  refresh: () => Promise<void>;
}

function currentMonthStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],
  monthlyStats: null,
  currentMonth: currentMonthStr(),
  isLoading: false,
  error: null,

  fetchTransactions: async (month) => {
    const targetMonth = month || get().currentMonth;
    set({ isLoading: true, error: null });
    try {
      const res = await transactionsApi.list({ month: targetMonth, limit: 100 });
      set({ transactions: res.data.data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  fetchMonthlyStats: async (month) => {
    const targetMonth = month || get().currentMonth;
    try {
      const res = await transactionsApi.monthlyStats(targetMonth);
      set({ monthlyStats: res.data });
    } catch (err: any) {
      console.error('Failed to fetch monthly stats:', err.message);
    }
  },

  addTransaction: (tx) => {
    set((state) => ({ transactions: [tx, ...state.transactions] }));
    // 刷新统计
    get().fetchMonthlyStats();
  },

  removeTransaction: (id) => {
    set((state) => ({
      transactions: state.transactions.filter((t) => t.id !== id),
    }));
    get().fetchMonthlyStats();
  },

  setMonth: (month) => {
    set({ currentMonth: month });
    get().fetchTransactions(month);
    get().fetchMonthlyStats(month);
  },

  refresh: async () => {
    const month = get().currentMonth;
    await Promise.all([get().fetchTransactions(month), get().fetchMonthlyStats(month)]);
  },
}));
