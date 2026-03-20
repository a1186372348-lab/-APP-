import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Text, View } from 'react-native';
import { useAuthStore } from '../src/store/authStore';
import OnboardingScreen from './onboarding';

export default function RootLayout() {
  const { token, isLoading, isOnboarded, loadPersistedAuth } = useAuthStore();

  useEffect(() => {
    loadPersistedAuth();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF8F0' }}>
        <Text style={{ fontSize: 40 }}>🐹</Text>
      </View>
    );
  }

  if (!token || !isOnboarded) {
    return <OnboardingScreen />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#F0EAE0',
          borderTopWidth: 1,
          height: 56,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: '#FF8C42',
        tabBarInactiveTintColor: '#888',
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="(tabs)/index"
        options={{
          title: '概览',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 20 }}>{focused ? '🏠' : '🏡'}</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="(tabs)/transactions"
        options={{
          title: '账单',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 20 }}>📋</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="(tabs)/insights"
        options={{
          title: '分析',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 20 }}>{focused ? '📊' : '📈'}</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="(tabs)/settings"
        options={{
          title: '我的',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 20 }}>👤</Text>
          ),
        }}
      />
    </Tabs>
  );
}
