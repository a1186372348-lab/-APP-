/**
 * 首页总览 — 方案 B 数据前置风格
 * 布局：本月支出/收入 → 支出构成进度条 → 花生提醒 → 账单列表
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useTransactionStore } from '../../src/store/transactionStore';
import { useAuthStore } from '../../src/store/authStore';
import { CategoryBar } from '../../src/components/CategoryBar';
import { HamsterAvatar } from '../../src/components/HamsterAvatar';
import { TransactionItem } from '../../src/components/TransactionItem';
import { FloatingButton } from '../../src/components/FloatingButton';
import AccountingModal from '../accounting-modal';
import { Transaction } from '../../src/api/client';

export default function HomeScreen() {
  const { transactions, monthlyStats, currentMonth, isLoading, refresh, fetchTransactions, fetchMonthlyStats } =
    useTransactionStore();
  const { user } = useAuthStore();

  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    refresh();
  }, []);

  const assistantName = user?.assistantName || '花生';

  // 按天分组账单（只显示最近 5 天）
  const groupedByDay = groupTransactionsByDay(transactions);
  const recentDays = Object.keys(groupedByDay).slice(0, 5);

  const totalExpenseYuan = monthlyStats ? (monthlyStats.totalExpenseCents / 100).toFixed(0) : '0';
  const totalIncomeYuan = monthlyStats ? (monthlyStats.totalIncomeCents / 100).toFixed(0) : '0';

  // 生成花生提醒文案
  const hamsterAlert = generateHamsterAlert(monthlyStats, assistantName);

  const [year, mon] = currentMonth.split('-');
  const monthLabel = `${parseInt(mon)}月`;

  return (
    <View style={styles.flex}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF8F0" />

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor="#FF8C42" />}
      >
        {/* 页头 */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🐹 智能账本</Text>
          <TouchableOpacity>
            <Text style={styles.headerRight}>⚙</Text>
          </TouchableOpacity>
        </View>

        {/* 月份 */}
        <View style={styles.monthRow}>
          <Text style={styles.monthLabel}>{monthLabel}</Text>
        </View>

        {/* 支出/收入卡片 */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { borderRightWidth: 1, borderRightColor: '#F0EAE0' }]}>
            <Text style={styles.summaryLabel}>本月支出</Text>
            <Text style={styles.summaryAmount}>¥ {totalExpenseYuan}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>本月收入</Text>
            <Text style={[styles.summaryAmount, { color: '#4CAF50' }]}>¥ {totalIncomeYuan}</Text>
          </View>
        </View>

        {/* 支出构成 */}
        {monthlyStats && monthlyStats.categoryBreakdown.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>支出构成</Text>
            {monthlyStats.categoryBreakdown.map((cat) => (
              <CategoryBar
                key={cat.code}
                name={cat.name}
                icon={cat.icon || '📌'}
                amountCents={cat.amountCents}
                percentage={cat.percentage}
                color={cat.color || '#FF8C42'}
              />
            ))}
          </View>
        )}

        {/* 花生提醒 */}
        {hamsterAlert && (
          <View style={styles.alertSection}>
            <HamsterAvatar
              mood="warning"
              size={36}
              showSpeech
              speechText={hamsterAlert}
            />
          </View>
        )}

        {/* 账单记录 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>账单记录</Text>
          {recentDays.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>还没有账单，点右下角开始记第一笔吧</Text>
            </View>
          ) : (
            recentDays.map((day) => (
              <View key={day}>
                <View style={styles.dayHeader}>
                  <Text style={styles.dayLabel}>{formatDayLabel(day)}</Text>
                  <Text style={styles.dayTotal}>
                    合计 ¥{(groupedByDay[day].reduce((s, t) => s + (t.direction === 'expense' ? t.amountCents : 0), 0) / 100).toFixed(0)}
                  </Text>
                </View>
                {groupedByDay[day].map((tx) => (
                  <TransactionItem key={tx.id} transaction={tx} />
                ))}
              </View>
            ))
          )}
        </View>

        {/* 底部 padding */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* 悬浮记账按钮 */}
      <FloatingButton onPress={() => setModalVisible(true)} />

      {/* 记账弹窗 */}
      <AccountingModal visible={modalVisible} onClose={() => setModalVisible(false)} />
    </View>
  );
}

// ──── 辅助函数 ────

function groupTransactionsByDay(txs: Transaction[]): Record<string, Transaction[]> {
  const grouped: Record<string, Transaction[]> = {};
  for (const tx of txs) {
    const day = new Date(tx.occurredAt).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(tx);
  }
  return grouped;
}

function formatDayLabel(day: string): string {
  const d = new Date(day);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return '今天';
  if (d.toDateString() === yesterday.toDateString()) return '昨天';
  return day;
}

function generateHamsterAlert(stats: any, name: string): string | null {
  if (!stats || stats.transactionCount === 0) return null;

  // 找支出占比最高的分类
  const top = stats.categoryBreakdown?.[0];
  if (!top || top.percentage < 40) return null;

  return `${name}提醒：${top.name}支出偏高，占了 ${top.percentage.toFixed(0)}%，你要好好想想哦。`;
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#FFF8F0' },
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 8,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  headerRight: { fontSize: 22, color: '#888' },
  monthRow: { paddingHorizontal: 20, paddingBottom: 8 },
  monthLabel: { fontSize: 15, color: '#888' },
  summaryRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0EAE0',
    marginBottom: 16,
  },
  summaryCard: { flex: 1, padding: 20, alignItems: 'center', gap: 6 },
  summaryLabel: { fontSize: 13, color: '#888' },
  summaryAmount: { fontSize: 26, fontWeight: '700', color: '#1A1A1A' },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F0EAE0',
  },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#1A1A1A', marginBottom: 12 },
  alertSection: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#FFF8E1',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#F7F0E8',
    marginHorizontal: -16,
    marginTop: 4,
    paddingHorizontal: 16,
  },
  dayLabel: { fontSize: 13, fontWeight: '600', color: '#3D2B1F' },
  dayTotal: { fontSize: 12, color: '#888' },
  emptyState: { padding: 24, alignItems: 'center' },
  emptyText: { color: '#BBB', fontSize: 14, textAlign: 'center' },
});
