import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Transaction } from '../api/client';

interface TransactionItemProps {
  transaction: Transaction;
  onPress?: () => void;
}

const SOURCE_ICONS: Record<string, string> = {
  manual: '',
  text_ai: '🤖',
  voice_ai: '🎙️',
  wechat_bot: '💬',
  feishu_bot: '🔷',
  dingtalk_bot: '🔶',
};

export function TransactionItem({ transaction: tx, onPress }: TransactionItemProps) {
  const time = new Date(tx.occurredAt).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const yuan = (tx.amountCents / 100).toFixed(2).replace(/\.?0+$/, '');
  const isExpense = tx.direction === 'expense';
  const sourceIcon = SOURCE_ICONS[tx.source] || '';

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.iconBadge, { backgroundColor: tx.categoryColor ? `${tx.categoryColor}33` : '#F0EAE0' }]}>
        <Text style={styles.categoryIcon}>{tx.categoryIcon || '📌'}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.note} numberOfLines={1}>
          {tx.note || tx.merchant || tx.categoryName || '其他'}
        </Text>
        <Text style={styles.meta}>
          {time}
          {sourceIcon ? `  ${sourceIcon}` : ''}
        </Text>
      </View>
      <Text style={[styles.amount, { color: isExpense ? '#1A1A1A' : '#4CAF50' }]}>
        {isExpense ? '-' : '+'}¥{yuan}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 12,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryIcon: {
    fontSize: 18,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  note: {
    fontSize: 15,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  meta: {
    fontSize: 12,
    color: '#888',
  },
  amount: {
    fontSize: 16,
    fontWeight: '600',
  },
});
