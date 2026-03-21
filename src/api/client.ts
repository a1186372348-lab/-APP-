import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// 请求拦截：自动加 JWT
apiClient.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

// 响应拦截：统一错误处理
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token 过期，清除本地 token
      setAuthToken(null);
    }
    return Promise.reject(error);
  }
);

// ──── Auth ────

export const authApi = {
  sendCode: (phone: string) => apiClient.post('/auth/phone/send-code', { phone }),
  verifyCode: (phone: string, code: string) =>
    apiClient.post<{ token: string; user: UserProfile }>('/auth/phone/verify', { phone, code }),
  wechatCallback: (code: string) =>
    apiClient.post<{ token: string; user: UserProfile }>('/auth/wechat/callback', { code }),
  getMe: () => apiClient.get<UserProfile>('/auth/me'),
  updateAssistantName: (name: string) => apiClient.put('/auth/assistant-name', { assistantName: name }),
};

// ──── Transactions ────

export const transactionsApi = {
  list: (params?: { month?: string; page?: number; limit?: number }) =>
    apiClient.get<{ data: Transaction[]; page: number; limit: number }>('/transactions', { params }),
  create: (data: CreateTransactionBody) =>
    apiClient.post<{ id: string }>('/transactions', data),
  update: (id: string, data: Partial<CreateTransactionBody>) =>
    apiClient.put(`/transactions/${id}`, data),
  delete: (id: string) => apiClient.delete(`/transactions/${id}`),
  monthlyStats: (month?: string) =>
    apiClient.get<MonthlyStats>('/transactions/stats/monthly', { params: { month } }),
};

// ──── AI ────

export const aiApi = {
  parseAccounting: (text: string) =>
    apiClient.post<ParsedTransaction>('/ai/parse-accounting', { text }),
  transcribe: (formData: FormData) =>
    apiClient.post<{ text: string }>('/ai/transcribe', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  confirmLine: (amountCents: number, categoryName: string) =>
    apiClient.post<{ line: string }>('/ai/confirm-line', { amountCents, categoryName }),
  analyze: (month?: string) =>
    apiClient.post<{ analysis: string; stats: MonthlyStats }>('/ai/analyze', { month }),
  healthScore: () =>
    apiClient.get<{ score: number; level: string; comment: string }>('/ai/health-score'),
  monthlyReport: (month?: string) =>
    apiClient.get<{ report: string; stats: MonthlyStats }>('/ai/monthly-report', { params: { month } }),
};

// ──── Categories ────

export const categoriesApi = {
  list: () => apiClient.get<{ data: Category[] }>('/categories'),
};

// ──── Channels ────

export const channelsApi = {
  getBindUrl: (channel: 'wechat' | 'feishu' | 'dingtalk') =>
    apiClient.get<{ token: string; bindUrl: string; expiresAt: number }>(`/channels/${channel}/bind-url`),
  getBindings: () => apiClient.get<{ bindings: ChannelBinding[] }>('/channels/bindings'),
  unbind: (channel: string) => apiClient.delete(`/channels/${channel}/binding`),
};

// ──── Subscriptions ────

export const subscriptionsApi = {
  getStatus: () =>
    apiClient.get<{ subscriptionTier: 'free' | 'premium'; activeSubscription: SubscriptionInfo | null }>('/subscriptions/status'),
  mockPurchase: (productId: string) =>
    apiClient.post<{ success: boolean; subscriptionTier: 'premium'; productId: string; expiresAt: number }>(
      '/subscriptions/mock-purchase',
      { productId, platform: 'mock' }
    ),
  mockCancel: () =>
    apiClient.delete<{ success: boolean; subscriptionTier: 'free' }>('/subscriptions/mock-cancel'),
};

// ──── Types ────

export interface UserProfile {
  id: string;
  phone?: string;
  assistantName: string;
  subscriptionTier: 'free' | 'premium';
}

export interface Transaction {
  id: string;
  direction: 'expense' | 'income' | 'transfer';
  amountCents: number;
  currency: string;
  categoryId: string | null;
  categoryCode: string | null;
  categoryName: string | null;
  categoryIcon: string | null;
  categoryColor: string | null;
  occurredAt: number;
  merchant: string | null;
  note: string | null;
  source: string;
  aiConfidence: number | null;
  createdAt: number;
}

export interface CreateTransactionBody {
  direction: string;
  amountCents: number;
  categoryId?: string;
  occurredAt?: number;
  merchant?: string;
  note?: string;
  source: string;
  rawInputText?: string;
  aiConfidence?: number;
}

export interface MonthlyStats {
  month: string;
  totalExpenseCents: number;
  totalIncomeCents: number;
  transactionCount: number;
  categoryBreakdown: Array<{
    code: string;
    name: string;
    icon?: string;
    color?: string;
    amountCents: number;
    percentage: number;
  }>;
}

export interface ParsedTransaction {
  amount_cents: number;
  direction: string;
  category_code: string;
  occurred_at: string;
  merchant: string | null;
  note: string | null;
  confidence: number;
  category?: { id: string; code: string; name: string; icon: string } | null;
}

export interface Category {
  id: string;
  code: string;
  type: string;
  name: string;
  icon: string;
  color: string;
}

export interface ChannelBinding {
  id: string;
  channel: string;
  channelUserId: string;
  isActive: number;
  boundAt: number;
}

export interface SubscriptionInfo {
  id: string;
  productId: string;
  entitlement: string;
  isActive: number;
  expiresAt: number | null;
  platform: string;
}
