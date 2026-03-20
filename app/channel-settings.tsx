/**
 * 渠道绑定设置页（独立页面，从 settings 跳转）
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { channelsApi, ChannelBinding } from '../src/api/client';

const CHANNELS = [
  { key: 'wechat' as const, name: '微信', icon: '💬', desc: '在微信公众号对话窗口发消息记账' },
  { key: 'feishu' as const, name: '飞书', icon: '🔷', desc: '在飞书机器人对话框发消息记账' },
  { key: 'dingtalk' as const, name: '钉钉', icon: '🔶', desc: '在钉钉机器人对话框发消息记账' },
];

export default function ChannelSettingsScreen() {
  const [bindings, setBindings] = useState<ChannelBinding[]>([]);
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    loadBindings();
  }, []);

  const loadBindings = async () => {
    try {
      const res = await channelsApi.getBindings();
      setBindings(res.data.bindings);
    } catch {}
  };

  const isBound = (channel: string) => bindings.some((b) => b.channel === channel && b.isActive);

  const handleBind = async (channel: 'wechat' | 'feishu' | 'dingtalk') => {
    setLoading(channel);
    try {
      const res = await channelsApi.getBindUrl(channel);
      await Linking.openURL(res.data.bindUrl);
      // 轮询检查绑定状态
      let retries = 0;
      const poll = setInterval(async () => {
        retries++;
        await loadBindings();
        if (isBound(channel) || retries > 10) {
          clearInterval(poll);
          setLoading(null);
        }
      }, 3000);
    } catch {
      Alert.alert('绑定失败', '请稍后重试');
      setLoading(null);
    }
  };

  const handleUnbind = (channel: string, name: string) => {
    Alert.alert(`解绑${name}`, `解绑后无法再通过${name}记账，确定吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '解绑',
        style: 'destructive',
        onPress: async () => {
          await channelsApi.unbind(channel);
          await loadBindings();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>渠道绑定</Text>
        <Text style={styles.subtitle}>绑定后，在对应 App 里直接发消息就能记账，数据自动同步</Text>
      </View>

      {CHANNELS.map((ch) => {
        const bound = isBound(ch.key);
        const isLoadingThis = loading === ch.key;
        return (
          <View key={ch.key} style={styles.channelCard}>
            <Text style={styles.channelIcon}>{ch.icon}</Text>
            <View style={styles.channelInfo}>
              <Text style={styles.channelName}>{ch.name}</Text>
              <Text style={styles.channelDesc}>{ch.desc}</Text>
            </View>
            <TouchableOpacity
              style={[styles.actionBtn, bound ? styles.actionBtnBound : styles.actionBtnUnbound]}
              onPress={() => bound ? handleUnbind(ch.key, ch.name) : handleBind(ch.key)}
              disabled={isLoadingThis}
            >
              {isLoadingThis ? (
                <ActivityIndicator size="small" color={bound ? '#888' : '#fff'} />
              ) : (
                <Text style={[styles.actionBtnText, bound && styles.actionBtnTextBound]}>
                  {bound ? '解绑' : '绑定'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F0' },
  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 20, gap: 8 },
  title: { fontSize: 24, fontWeight: '700', color: '#1A1A1A' },
  subtitle: { fontSize: 14, color: '#888', lineHeight: 20 },
  channelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 16,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: '#F0EAE0',
  },
  channelIcon: { fontSize: 32, width: 40, textAlign: 'center' },
  channelInfo: { flex: 1, gap: 4 },
  channelName: { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
  channelDesc: { fontSize: 13, color: '#888', lineHeight: 18 },
  actionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 60,
    alignItems: 'center',
  },
  actionBtnUnbound: { backgroundColor: '#FF8C42' },
  actionBtnBound: { backgroundColor: '#F0EAE0' },
  actionBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  actionBtnTextBound: { color: '#888' },
});
