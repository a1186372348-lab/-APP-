/**
 * 账单列表页
 * 按天分组，月份切换，点击展开编辑/删除
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useTransactionStore } from '../../src/store/transactionStore';
import { transactionsApi, Transaction } from '../../src/api/client';
import { TransactionItem } from '../../src/components/TransactionItem';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, SYSTEM_CATEGORIES } from '../../src/constants/categories';

export default function TransactionsScreen() {
  const { transactions, monthlyStats, currentMonth, isLoading, setMonth, refresh, removeTransaction } =
    useTransactionStore();

  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editNote, setEditNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const months = generateRecentMonths(6);

  const openEdit = (tx: Transaction) => {
    setEditingTx(tx);
    setEditAmount(((tx.amountCents) / 100).toString());
    setEditCategoryId(tx.categoryId || '');
    setEditNote(tx.note || '');
  };

  const handleItemPress = (tx: Transaction) => {
    Alert.alert(
      tx.note || tx.merchant || tx.categoryName || '账单',
      `¥${(tx.amountCents / 100).toFixed(2)}`,
      [
        { text: '编辑', onPress: () => openEdit(tx) },
        {
          text: '删除',
          style: 'destructive',
          onPress: () => confirmDelete(tx),
        },
        { text: '取消', style: 'cancel' },
      ]
    );
  };

  const confirmDelete = (tx: Transaction) => {
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

  const handleSaveEdit = async () => {
    if (!editingTx) return;
    const amount = parseFloat(editAmount);
    if (!editAmount || isNaN(amount) || amount <= 0) {
      Alert.alert('', '请输入正确的金额');
      return;
    }
    setIsSaving(true);
    try {
      await transactionsApi.update(editingTx.id, {
        amountCents: Math.round(amount * 100),
        categoryId: editCategoryId || undefined,
        note: editNote || undefined,
      });
      // 刷新列表
      await refresh();
      setEditingTx(null);
    } catch {
      Alert.alert('保存失败', '请稍后重试');
    } finally {
      setIsSaving(false);
    }
  };

  // 按天分组
  const grouped = groupByDay(transactions);
  const days = Object.keys(grouped).sort().reverse();

  const totalExpense = monthlyStats?.totalExpenseCents || 0;

  const allCategories = SYSTEM_CATEGORIES;
  const editingDirection = editingTx?.direction || 'expense';
  const categoryOptions = editingDirection === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>账单</Text>
        <Text style={styles.totalText}>本月支出 ¥{(totalExpense / 100).toFixed(0)}</Text>
      </View>

      {/* 月份选择器 */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthPicker} contentContainerStyle={styles.monthPickerContent}>
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
      </ScrollView>

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
                onPress={() => handleItemPress(tx)}
              />
            ))}
          </View>
        )}
      />

      {/* 编辑弹窗 */}
      <Modal
        visible={!!editingTx}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditingTx(null)}
      >
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.editContainer}>
            <View style={styles.editHeader}>
              <TouchableOpacity onPress={() => setEditingTx(null)}>
                <Text style={styles.editClose}>取消</Text>
              </TouchableOpacity>
              <Text style={styles.editTitle}>编辑账单</Text>
              <TouchableOpacity onPress={handleSaveEdit} disabled={isSaving}>
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FF8C42" />
                ) : (
                  <Text style={styles.editSave}>保存</Text>
                )}
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.editBody} keyboardShouldPersistTaps="handled">
              <Text style={styles.fieldLabel}>金额</Text>
              <TextInput
                style={styles.amountInput}
                value={editAmount}
                onChangeText={setEditAmount}
                keyboardType="decimal-pad"
                autoFocus
                placeholder="0.00"
                placeholderTextColor="#CCC"
              />

              <Text style={styles.fieldLabel}>分类</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
                {categoryOptions.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.catChip, editCategoryId === cat.id && styles.catChipActive]}
                    onPress={() => setEditCategoryId(cat.id)}
                  >
                    <Text style={styles.catChipText}>{cat.icon} {cat.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.fieldLabel}>备注（选填）</Text>
              <TextInput
                style={styles.noteInput}
                value={editNote}
                onChangeText={setEditNote}
                placeholder="备注..."
                placeholderTextColor="#CCC"
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  monthPicker: { flexGrow: 0 },
  monthPickerContent: {
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
  // 编辑弹窗
  editContainer: { flex: 1, backgroundColor: '#FFF8F0' },
  editHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EAE0',
    backgroundColor: '#fff',
  },
  editClose: { fontSize: 16, color: '#888' },
  editTitle: { fontSize: 17, fontWeight: '600', color: '#1A1A1A' },
  editSave: { fontSize: 16, color: '#FF8C42', fontWeight: '600' },
  editBody: { flex: 1, padding: 20 },
  fieldLabel: { fontSize: 14, color: '#3D2B1F', fontWeight: '600', marginBottom: 8, marginTop: 16 },
  amountInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 32,
    fontWeight: '700',
    color: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#F0EAE0',
    textAlign: 'center',
  },
  catScroll: { flexGrow: 0 },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#F0EAE0',
    marginRight: 8,
  },
  catChipActive: { backgroundColor: '#FF8C42', borderColor: '#FF8C42' },
  catChipText: { fontSize: 14, color: '#3D2B1F' },
  noteInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#F0EAE0',
  },
});
