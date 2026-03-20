/**
 * AI 分析页（付费功能）
 * 入口页 + Paywall + 分析结果展示
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuthStore } from '../../src/store/authStore';
import { aiApi } from '../../src/api/client';
import { HamsterAvatar } from '../../src/components/HamsterAvatar';

export default function InsightsScreen() {
  const { user } = useAuthStore();
  const isPremium = user?.subscriptionTier === 'premium';

  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [healthScore, setHealthScore] = useState<{ score: number; level: string; comment: string } | null>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const [analyzeRes, scoreRes] = await Promise.all([
        aiApi.analyze(),
        aiApi.healthScore(),
      ]);
      setAnalysis(analyzeRes.data.analysis);
      setHealthScore(scoreRes.data);
    } catch (err: any) {
      Alert.alert('分析失败', err.response?.data?.error || '请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  if (!isPremium) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>AI 分析</Text>
        </View>
        <View style={styles.paywall}>
          <HamsterAvatar mood="default" size={72} />
          <Text style={styles.paywallTitle}>解锁 AI 财务分析</Text>
          <Text style={styles.paywallDesc}>
            升级到 Premium，花生帮你深度分析消费习惯，发现潜在问题，给出改进建议。
          </Text>
          <View style={styles.featureList}>
            {['即时财务分析报告', '主动消费预警', '消费健康评分', '月度智能总结'].map((f) => (
              <View key={f} style={styles.featureRow}>
                <Text style={styles.featureIcon}>✓</Text>
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity style={styles.upgradeBtn}>
            <Text style={styles.upgradeBtnText}>升级 Premium</Text>
          </TouchableOpacity>
          <Text style={styles.paywallNote}>月费订阅，随时可取消</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>AI 分析</Text>
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        {/* 健康评分 */}
        {healthScore && (
          <View style={[styles.scoreCard, { borderColor: scoreColor(healthScore.level) }]}>
            <Text style={styles.scoreNumber}>{healthScore.score}</Text>
            <Text style={styles.scoreLabel}>消费健康评分</Text>
            <Text style={styles.scoreComment}>{healthScore.comment}</Text>
          </View>
        )}

        {/* 立即分析按钮 */}
        <TouchableOpacity style={styles.analyzeBtn} onPress={handleAnalyze} disabled={loading}>
          {loading ? (
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.analyzeBtnText}>花生分析中...</Text>
            </View>
          ) : (
            <Text style={styles.analyzeBtnText}>
              {analysis ? '重新分析' : '立即分析本月消费'}
            </Text>
          )}
        </TouchableOpacity>

        {/* 分析结果 */}
        {analysis && (
          <View style={styles.analysisCard}>
            <View style={styles.analysisHeader}>
              <HamsterAvatar mood="thinking" size={32} />
              <Text style={styles.analysisTitle}>花生的分析报告</Text>
            </View>
            <Text style={styles.analysisText}>{analysis}</Text>
          </View>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

function scoreColor(level: string): string {
  switch (level) {
    case 'excellent': return '#4CAF50';
    case 'good': return '#FF8C42';
    case 'warning': return '#FFB800';
    case 'danger': return '#FF4444';
    default: return '#888';
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F0' },
  header: {
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: { fontSize: 28, fontWeight: '700', color: '#1A1A1A' },
  body: { flex: 1 },
  paywall: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 24,
    gap: 16,
  },
  paywallTitle: { fontSize: 22, fontWeight: '700', color: '#1A1A1A', textAlign: 'center' },
  paywallDesc: { fontSize: 15, color: '#888', textAlign: 'center', lineHeight: 22 },
  featureList: { width: '100%', gap: 10, marginVertical: 8 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureIcon: { fontSize: 16, color: '#4CAF50', fontWeight: '700', width: 20 },
  featureText: { fontSize: 15, color: '#3D2B1F' },
  upgradeBtn: {
    width: '100%',
    backgroundColor: '#FF8C42',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  upgradeBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  paywallNote: { fontSize: 12, color: '#BBB' },
  scoreCard: {
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    gap: 6,
  },
  scoreNumber: { fontSize: 56, fontWeight: '800', color: '#1A1A1A' },
  scoreLabel: { fontSize: 13, color: '#888' },
  scoreComment: { fontSize: 14, color: '#3D2B1F', textAlign: 'center' },
  analyzeBtn: {
    marginHorizontal: 16,
    backgroundColor: '#FF8C42',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    marginBottom: 16,
  },
  analyzeBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  analysisCard: {
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F0EAE0',
    gap: 12,
  },
  analysisHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  analysisTitle: { fontSize: 15, fontWeight: '600', color: '#1A1A1A' },
  analysisText: { fontSize: 14, color: '#3D2B1F', lineHeight: 22 },
});
