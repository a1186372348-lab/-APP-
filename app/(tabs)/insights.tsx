/**
 * AI 分析页（付费功能）
 * 入口页 + Paywall（套餐选择）+ 分析结果展示
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
  Modal,
} from 'react-native';
import { useAuthStore } from '../../src/store/authStore';
import { aiApi } from '../../src/api/client';
import { HamsterAvatar } from '../../src/components/HamsterAvatar';

const PLANS = [
  {
    id: 'premium_monthly',
    label: '月度会员',
    price: '¥18',
    period: '/ 月',
    tag: null,
  },
  {
    id: 'premium_yearly',
    label: '年度会员',
    price: '¥128',
    period: '/ 年',
    tag: '省 ¥88',
  },
];

export default function InsightsScreen() {
  const { user, upgradeToPremium } = useAuthStore();
  const isPremium = user?.subscriptionTier === 'premium';

  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [healthScore, setHealthScore] = useState<{ score: number; level: string; comment: string } | null>(null);

  // Paywall 弹窗
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(PLANS[1].id); // 默认年度
  const [isPurchasing, setIsPurchasing] = useState(false);

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

  const handlePurchase = async () => {
    setIsPurchasing(true);
    try {
      await upgradeToPremium(selectedPlan);
      setPaywallVisible(false);
      Alert.alert('升级成功 🎉', '欢迎加入 Premium！花生现在可以帮你深度分析了。');
    } catch (err: any) {
      Alert.alert('购买失败', err.response?.data?.error || '请稍后重试');
    } finally {
      setIsPurchasing(false);
    }
  };

  if (!isPremium) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>AI 分析</Text>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
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

            {/* 套餐卡片 */}
            <View style={styles.plansRow}>
              {PLANS.map((plan) => (
                <TouchableOpacity
                  key={plan.id}
                  style={[styles.planCard, selectedPlan === plan.id && styles.planCardActive]}
                  onPress={() => setSelectedPlan(plan.id)}
                >
                  {plan.tag && (
                    <View style={styles.planTag}>
                      <Text style={styles.planTagText}>{plan.tag}</Text>
                    </View>
                  )}
                  <Text style={[styles.planLabel, selectedPlan === plan.id && styles.planLabelActive]}>
                    {plan.label}
                  </Text>
                  <Text style={[styles.planPrice, selectedPlan === plan.id && styles.planPriceActive]}>
                    {plan.price}
                  </Text>
                  <Text style={[styles.planPeriod, selectedPlan === plan.id && styles.planPeriodActive]}>
                    {plan.period}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.upgradeBtn} onPress={() => setPaywallVisible(true)}>
              <Text style={styles.upgradeBtnText}>立即升级 Premium</Text>
            </TouchableOpacity>
            <Text style={styles.paywallNote}>订阅后随时可取消</Text>
          </View>
        </ScrollView>

        {/* 购买确认弹窗 */}
        <PurchaseModal
          visible={paywallVisible}
          plan={PLANS.find((p) => p.id === selectedPlan)!}
          isPurchasing={isPurchasing}
          onConfirm={handlePurchase}
          onCancel={() => setPaywallVisible(false)}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>AI 分析</Text>
        <View style={styles.premiumBadge}>
          <Text style={styles.premiumBadgeText}>✦ Premium</Text>
        </View>
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        {/* 健康评分 */}
        {healthScore && (
          <View style={[styles.scoreCard, { borderColor: scoreColor(healthScore.level) }]}>
            <Text style={[styles.scoreNumber, { color: scoreColor(healthScore.level) }]}>
              {healthScore.score}
            </Text>
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

// ──── 购买确认弹窗 ────

interface PurchaseModalProps {
  visible: boolean;
  plan: (typeof PLANS)[0];
  isPurchasing: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function PurchaseModal({ visible, plan, isPurchasing, onConfirm, onCancel }: PurchaseModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={modal.overlay}>
        <View style={modal.sheet}>
          <HamsterAvatar mood="happy" size={56} />
          <Text style={modal.title}>确认升级</Text>
          <Text style={modal.planName}>{plan.label}</Text>
          <Text style={modal.planPriceText}>
            {plan.price}
            <Text style={modal.planPeriodSmall}>{plan.period}</Text>
          </Text>
          <Text style={modal.note}>
            这是模拟购买，不会产生真实扣款。{'\n'}正式上线后将接入 App Store / Google Play。
          </Text>
          <TouchableOpacity
            style={[modal.confirmBtn, isPurchasing && { opacity: 0.6 }]}
            onPress={onConfirm}
            disabled={isPurchasing}
          >
            {isPurchasing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={modal.confirmBtnText}>确认购买</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={onCancel} disabled={isPurchasing}>
            <Text style={modal.cancelText}>取消</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: { fontSize: 28, fontWeight: '700', color: '#1A1A1A' },
  premiumBadge: {
    backgroundColor: '#FF8C42',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 4,
  },
  premiumBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  body: { flex: 1 },
  paywall: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 16,
  },
  paywallTitle: { fontSize: 22, fontWeight: '700', color: '#1A1A1A', textAlign: 'center' },
  paywallDesc: { fontSize: 15, color: '#888', textAlign: 'center', lineHeight: 22 },
  featureList: { width: '100%', gap: 10, marginVertical: 4 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureIcon: { fontSize: 15, color: '#4CAF50', fontWeight: '700', width: 20 },
  featureText: { fontSize: 15, color: '#3D2B1F' },
  plansRow: { flexDirection: 'row', gap: 12, width: '100%' },
  planCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F0EAE0',
    gap: 4,
    position: 'relative',
  },
  planCardActive: { borderColor: '#FF8C42', backgroundColor: '#FFF4EC' },
  planTag: {
    position: 'absolute',
    top: -10,
    backgroundColor: '#FF8C42',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  planTagText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  planLabel: { fontSize: 13, color: '#888', marginTop: 8 },
  planLabelActive: { color: '#FF8C42' },
  planPrice: { fontSize: 24, fontWeight: '800', color: '#1A1A1A' },
  planPriceActive: { color: '#FF8C42' },
  planPeriod: { fontSize: 12, color: '#BBB' },
  planPeriodActive: { color: '#FF8C42' },
  upgradeBtn: {
    width: '100%',
    backgroundColor: '#FF8C42',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
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
  scoreNumber: { fontSize: 56, fontWeight: '800' },
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

const modal = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFF8F0',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 28,
    alignItems: 'center',
    gap: 12,
    paddingBottom: 40,
  },
  title: { fontSize: 20, fontWeight: '700', color: '#1A1A1A' },
  planName: { fontSize: 15, color: '#888' },
  planPriceText: { fontSize: 36, fontWeight: '800', color: '#FF8C42' },
  planPeriodSmall: { fontSize: 16, fontWeight: '400', color: '#888' },
  note: {
    fontSize: 13,
    color: '#BBB',
    textAlign: 'center',
    lineHeight: 20,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: 12,
    width: '100%',
  },
  confirmBtn: {
    width: '100%',
    backgroundColor: '#FF8C42',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
  },
  confirmBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  cancelText: { fontSize: 15, color: '#888', paddingVertical: 4 },
});
