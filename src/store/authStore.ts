import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, authApi, setAuthToken } from '../api/client';

interface AuthState {
  token: string | null;
  user: UserProfile | null;
  isLoading: boolean;
  isOnboarded: boolean;

  login: (token: string, user: UserProfile) => Promise<void>;
  logout: () => Promise<void>;
  updateAssistantName: (name: string) => Promise<void>;
  loadPersistedAuth: () => Promise<void>;
  setOnboarded: () => Promise<void>;
}

const TOKEN_KEY = '@jizhang_token';
const ONBOARDED_KEY = '@jizhang_onboarded';

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  isLoading: true,
  isOnboarded: false,

  login: async (token, user) => {
    setAuthToken(token);
    await AsyncStorage.setItem(TOKEN_KEY, token);
    set({ token, user });
  },

  logout: async () => {
    setAuthToken(null);
    await AsyncStorage.removeItem(TOKEN_KEY);
    set({ token: null, user: null });
  },

  updateAssistantName: async (name) => {
    await authApi.updateAssistantName(name);
    set((state) => ({
      user: state.user ? { ...state.user, assistantName: name } : state.user,
    }));
  },

  loadPersistedAuth: async () => {
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      const onboarded = await AsyncStorage.getItem(ONBOARDED_KEY);
      if (token) {
        setAuthToken(token);
        const res = await authApi.getMe();
        set({ token, user: res.data, isOnboarded: !!onboarded, isLoading: false });
      } else {
        set({ isLoading: false, isOnboarded: !!onboarded });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  setOnboarded: async () => {
    await AsyncStorage.setItem(ONBOARDED_KEY, '1');
    set({ isOnboarded: true });
  },
}));
