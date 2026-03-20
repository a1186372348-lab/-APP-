/**
 * 账单列表页
 * 按天分组，月份切换，支持删除
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useTransactionStore } from '../../src/store/transactionStore';
import { transactionsApi, Transaction } from '../../src/api/client';
import { TransactionItem } from '../../src/components/TransactionItem';

export default function TransactionsScreen() {
  const { transactions, monthlyStats, currentMonth, isLoading, setMonth, refresh, removeTransaction } =
    useTransactionStore();

  const months = generateRecentMonths(6);

  const handleDelete = (tx: Transaction) => {
    Alert.alert(
      '删除账单',
      `确定删除这条 ¥${(tx.amountCents / 100).toFixed(2)} 的记录吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            await transactionsApi.delete(tx.id);
            removeTransaction(tx.id);
          },
        },
      ]
    );
  };

  // 按天分组
  const grouped = groupByDay(transactions);
  const days = Object.keys(grouped).sort().reverse();

  const [year, mon] = currentMonth.split('-');
  const totalExpense = monthlyStats?.totalExpenseCents || 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>账单</Text>
        <Text style={styles.totalText}>本月支出 ¥{(totalExpense / 100).toFixed(0)}</Text>
      </View>

      {/* 月份选择器 */}
      <View style={styles.monthPicker}>
        {months.map((m) => (
          <TouchableOpacity
            key={m}
            style={[styles.monthChip, currentMonth === m && styles.monthChipActive]}
            onPress={() => setMonth(m)}
          >
            <Text style={[styles.monthChipText, currentMonth === m && styles.monthChipTextActive]}>
              {parseInt(m.split('-')[1])}月
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 账单列表 */}
      <FlatList
        data={days}
        keyExtractor={(item) => item}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor="#FF8C42" />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>本月没有账单记录</Text>
          </View>
        }
        renderItem={({ item: day }) => (
          <View style={styles.dayGroup}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayLabel}>{formatDayLabel(day)}</Text>
              <Text style={styles.daySubtotal}>
                ¥{(grouped[day].filter((t) => t.direction === 'expense').reduce((s, t) => s + t.amountCents, 0) / 100).toFixed(0)}
              </Text>
            </View>
            {grouped[day].map((tx) => (
              <TransactionItem
                key={tx.id}
                transaction={tx}
                onPress={() => handleDelete(tx)}
              />
            ))}
          </View>
        )}
      />
    </View>
  );
}

// ──── 辅助 ────

function groupByDay(txs: Transaction[]): Record<string, Transaction[]> {
  const m: Record<string, Transaction[]> = {};
  for (const tx of txs) {
    const d = new Date(tx.occurredAt).toLocaleDateString('zh-CN');
    if (!m[d]) m[d] = [];
    m[d].push(tx);
  }
  return m;
}

function formatDayLabel(day: string): string {
  const d = new Date(day);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return '今天';
  if (d.toDateString() === yest.toDateString()) return '昨天';
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function generateRecentMonths(count: number): string[] {
  const months = [];
  const d = new Date();
  for (let i = 0; i < count; i++) {
    months.unshift(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    d.setMonth(d.getMonth() - 1);
  }
  return months;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F0' },
  header: {
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  title: { fontSize: 28, fontWeight: '700', color: '#1A1A1A' },
  totalText: { fontSize: 14, color: '#888', paddingBottom: 4 },
  monthPicker: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  monthChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#F0EAE0',
  },
  monthChipActive: { backgroundColor: '#FF8C42', borderColor: '#FF8C42' },
  monthChipText: { fontSize: 13, color: '#888' },
  monthChipTextActive: { color: '#fff', fontWeight: '600' },
  dayGroup: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0EAE0',
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFF8F0',
    borderBottomWidth: 1,
    borderBottomColor: '#F0EAE0',
  },
  dayLabel: { fontSize: 13, fontWeight: '600', color: '#3D2B1F' },
  daySubtotal: { fontSize: 13, color: '#888' },
  empty: { padding: 60, alignItems: 'center' },
  emptyText: { color: '#BBB', fontSize: 15 },
});
