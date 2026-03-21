/**
 * 设置页 — 账号、渠道绑定、订阅管理
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useAuthStore } from '../../src/store/authStore';
import { channelsApi, ChannelBinding } from '../../src/api/client';
import { HamsterAvatar } from '../../src/components/HamsterAvatar';

const CHANNEL_NAMES: Record<string, string> = {
  wechat: '微信',
  feishu: '飞书',
  dingtalk: '钉钉',
};
const CHANNEL_ICONS: Record<string, string> = {
  wechat: '💬',
  feishu: '🔷',
  dingtalk: '🔶',
};

export default function SettingsScreen() {
  const { user, logout, cancelPremium } = useAuthStore();
  const [bindings, setBindings] = useState<ChannelBinding[]>([]);
  const [bindingChannel, setBindingChannel] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    loadBindings();
  }, []);

  const loadBindings = async () => {
    try {
      const res = await channelsApi.getBindings();
      setBindings(res.data.bindings);
    } catch {}
  };

  const isChannelBound = (channel: string) => bindings.some((b) => b.channel === channel && b.isActive);

  const handleBind = async (channel: 'wechat' | 'feishu' | 'dingtalk') => {
    setBindingChannel(channel);
    try {
      const res = await channelsApi.getBindUrl(channel);
      await Linking.openURL(res.data.bindUrl);
      // 等待用户绑定后刷新
      setTimeout(() => {
        loadBindings();
        setBindingChannel(null);
      }, 3000);
    } catch (err) {
      Alert.alert('绑定失败', '请稍后重试');
      setBindingChannel(null);
    }
  };

  const handleUnbind = (channel: string) => {
    Alert.alert(
      `解绑${CHANNEL_NAMES[channel]}`,
      `解绑后无法再通过${CHANNEL_NAMES[channel]}记账，确定吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '解绑',
          style: 'destructive',
          onPress: async () => {
            await channelsApi.unbind(channel);
            setBindings((prev) => prev.filter((b) => b.channel !== channel));
          },
        },
      ]
    );
  };

  const handleCancelPremium = () => {
    Alert.alert(
      '取消订阅',
      '取消后将立即恢复免费版，AI 分析功能将无法使用，确定吗？',
      [
        { text: '再想想', style: 'cancel' },
        {
          text: '确定取消',
          style: 'destructive',
          onPress: async () => {
            setIsCancelling(true);
            try {
              await cancelPremium();
              Alert.alert('已取消订阅', '你已恢复免费版，感谢使用花生记账。');
            } catch {
              Alert.alert('操作失败', '请稍后重试');
            } finally {
              setIsCancelling(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>我的</Text>
      </View>

      {/* 用户信息 */}
      <View style={styles.section}>
        <View style={styles.userCard}>
          <HamsterAvatar mood="default" size={56} />
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.assistantName || '花生'}</Text>
            <Text style={styles.userTier}>
              {user?.subscriptionTier === 'premium' ? '🌟 Premium 会员' : '免费版'}
            </Text>
          </View>
        </View>
      </View>

      {/* 渠道绑定 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>渠道绑定</Text>
        <Text style={styles.sectionDesc}>绑定后，在对应 App 里直接发消息就能记账</Text>
        {(['wechat', 'feishu', 'dingtalk'] as const).map((channel) => {
          const bound = isChannelBound(channel);
          const isLoading = bindingChannel === channel;
          return (
            <View key={channel} style={styles.channelRow}>
              <Text style={styles.channelIcon}>{CHANNEL_ICONS[channel]}</Text>
              <Text style={styles.channelName}>{CHANNEL_NAMES[channel]}</Text>
              <TouchableOpacity
                style={[styles.channelBtn, bound ? styles.channelBtnBound : styles.channelBtnUnbound]}
                onPress={() => (bound ? handleUnbind(channel) : handleBind(channel))}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[styles.channelBtnText, bound && styles.channelBtnTextBound]}>
                    {bound ? '已绑定' : '去绑定'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      {/* 订阅管理 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>订阅管理</Text>
        {user?.subscriptionTier === 'premium' ? (
          <View style={styles.premiumStatus}>
            <View style={styles.premiumStatusRow}>
              <Text style={styles.premiumStatusIcon}>🌟</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.premiumStatusTitle}>Premium 会员</Text>
                <Text style={styles.premiumStatusDesc}>所有 AI 分析功能已解锁</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={handleCancelPremium}
              disabled={isCancelling}
            >
              {isCancelling ? (
                <ActivityIndicator size="small" color="#888" />
              ) : (
                <Text style={styles.cancelBtnText}>取消订阅</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.upgradeBtn} onPress={() => {}}>
            <Text style={styles.upgradeBtnText}>解锁 AI 财务分析 →</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 其他 */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.menuItem} onPress={logout}>
          <Text style={styles.menuItemText}>退出登录</Text>
          <Text style={styles.menuItemArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 80 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F0' },
  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 12 },
  title: { fontSize: 28, fontWeight: '700', color: '#1A1A1A' },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F0EAE0',
  },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#1A1A1A', marginBottom: 6 },
  sectionDesc: { fontSize: 13, color: '#888', marginBottom: 12 },
  userCard: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  userInfo: { gap: 4 },
  userName: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  userTier: { fontSize: 13, color: '#888' },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F7F0E8',
    gap: 12,
  },
  channelIcon: { fontSize: 22, width: 28 },
  channelName: { flex: 1, fontSize: 15, color: '#1A1A1A' },
  channelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    minWidth: 70,
    alignItems: 'center',
  },
  channelBtnUnbound: { backgroundColor: '#FF8C42' },
  channelBtnBound: { backgroundColor: '#F0EAE0' },
  channelBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  channelBtnTextBound: { color: '#888' },
  upgradeBtn: {
    backgroundColor: '#FF8C42',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  upgradeBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  premiumStatus: { gap: 12 },
  premiumStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFF4EC',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FFD4A8',
  },
  premiumStatusIcon: { fontSize: 24 },
  premiumStatusTitle: { fontSize: 15, fontWeight: '700', color: '#FF8C42' },
  premiumStatusDesc: { fontSize: 13, color: '#888', marginTop: 2 },
  cancelBtn: {
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0D0C8',
  },
  cancelBtnText: { fontSize: 14, color: '#888' },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  menuItemText: { fontSize: 15, color: '#FF4444' },
  menuItemArrow: { fontSize: 18, color: '#CCC' },
});
