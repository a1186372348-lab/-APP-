import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTransactionStore } from '../src/store/transactionStore';
import { useAuthStore } from '../src/store/authStore';
import { aiApi, transactionsApi, ParsedTransaction, categoriesApi } from '../src/api/client';
import { EXPENSE_CATEGORIES, getCategoryByCode } from '../src/constants/categories';
import { HamsterAvatar } from '../src/components/HamsterAvatar';
import { useVoiceRecorder } from '../src/hooks/useVoiceRecorder';

interface AccountingModalProps {
  visible: boolean;
  onClose: () => void;
}

type Step = 'input' | 'confirm' | 'manual';

export default function AccountingModal({ visible, onClose }: AccountingModalProps) {
  const [step, setStep] = useState<Step>('input');
  const [inputText, setInputText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parsed, setParsed] = useState<ParsedTransaction | null>(null);
  const [confirmLine, setConfirmLine] = useState('');

  // 手动输入状态
  const [manualAmount, setManualAmount] = useState('');
  const [manualCategory, setManualCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [manualNote, setManualNote] = useState('');

  const { addTransaction } = useTransactionStore();
  const { user } = useAuthStore();

  // 语音录音
  const { status: recordingStatus, duration, startRecording, stopRecording, cancelRecording } =
    useVoiceRecorder(
      (text) => {
        setInputText(text);
        handleParseText(text);
      },
      (err) => Alert.alert('录音错误', err)
    );

  const handleParseText = async (text: string) => {
    if (!text.trim()) return;
    setIsParsing(true);
    try {
      const res = await aiApi.parseAccounting(text.trim());
      setParsed(res.data);

      // 获取傲娇台词
      if (res.data.category?.name) {
        try {
          const lineRes = await aiApi.confirmLine(res.data.amount_cents, res.data.category.name);
          setConfirmLine(lineRes.data.line);
        } catch {
          setConfirmLine(`¥${(res.data.amount_cents / 100).toFixed(0)}，是这样吗？`);
        }
      }

      setStep('confirm');
    } catch (err: any) {
      if (err.response?.status === 422) {
        // 无法解析，切换手动
        Alert.alert('解析失败', '没看懂这条记录，手动输入一下吧', [
          { text: '手动输入', onPress: () => setStep('manual') },
        ]);
      } else {
        // AI 服务不可达 fallback
        setStep('manual');
      }
    } finally {
      setIsParsing(false);
    }
  };

  const handleConfirm = async () => {
    if (!parsed) return;
    try {
      const res = await transactionsApi.create({
        direction: parsed.direction,
        amountCents: parsed.amount_cents,
        categoryId: parsed.category?.id,
        occurredAt: new Date(parsed.occurred_at).getTime(),
        merchant: parsed.merchant || undefined,
        note: parsed.note || undefined,
        source: recordingStatus === 'idle' && !inputText ? 'manual' : 'text_ai',
        rawInputText: inputText,
        aiConfidence: parsed.confidence,
      });

      addTransaction({
        id: res.data.id,
        direction: parsed.direction as any,
        amountCents: parsed.amount_cents,
        currency: 'CNY',
        categoryId: parsed.category?.id || null,
        categoryCode: parsed.category?.code || null,
        categoryName: parsed.category?.name || null,
        categoryIcon: parsed.category?.icon || null,
        categoryColor: null,
        occurredAt: new Date(parsed.occurred_at).getTime(),
        merchant: parsed.merchant,
        note: parsed.note,
        source: 'text_ai',
        aiConfidence: parsed.confidence,
        createdAt: Date.now(),
      });

      resetAndClose();
    } catch (err) {
      Alert.alert('保存失败', '请稍后重试');
    }
  };

  const handleManualSave = async () => {
    const amount = parseFloat(manualAmount);
    if (!manualAmount || isNaN(amount) || amount <= 0) {
      Alert.alert('', '请输入正确的金额');
      return;
    }

    try {
      const res = await transactionsApi.create({
        direction: 'expense',
        amountCents: Math.round(amount * 100),
        categoryId: manualCategory.id,
        occurredAt: Date.now(),
        note: manualNote || undefined,
        source: 'manual',
      });

      addTransaction({
        id: res.data.id,
        direction: 'expense',
        amountCents: Math.round(amount * 100),
        currency: 'CNY',
        categoryId: manualCategory.id,
        categoryCode: manualCategory.code,
        categoryName: manualCategory.name,
        categoryIcon: manualCategory.icon,
        categoryColor: manualCategory.color,
        occurredAt: Date.now(),
        merchant: null,
        note: manualNote || null,
        source: 'manual',
        aiConfidence: null,
        createdAt: Date.now(),
      });

      resetAndClose();
    } catch (err) {
      Alert.alert('保存失败', '请稍后重试');
    }
  };

  const resetAndClose = () => {
    setStep('input');
    setInputText('');
    setParsed(null);
    setConfirmLine('');
    setManualAmount('');
    setManualNote('');
    onClose();
  };

  const yuan = parsed ? (parsed.amount_cents / 100).toFixed(2).replace(/\.?0+$/, '') : '0';
  const isLowConfidence = parsed && parsed.confidence < 0.75;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={resetAndClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={resetAndClose}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.title}>
              {step === 'input' ? '记一笔' : step === 'confirm' ? '确认一下' : '手动记账'}
            </Text>
            <View style={{ width: 32 }} />
          </View>

          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
            {step === 'input' && (
              <View style={styles.section}>
                <TextInput
                  style={styles.textInput}
                  placeholder="说一句话，比如「午饭35元」..."
                  placeholderTextColor="#BBAAAA"
                  value={inputText}
                  onChangeText={setInputText}
                  multiline
                  autoFocus
                  returnKeyType="send"
                  onSubmitEditing={() => handleParseText(inputText)}
                />

                {isParsing && (
                  <View style={styles.parseLoading}>
                    <ActivityIndicator color="#FF8C42" />
                    <Text style={styles.parseLoadingText}>花生解析中...</Text>
                  </View>
                )}

                {/* 语音按钮 */}
                <TouchableOpacity
                  style={[styles.voiceBtn, recordingStatus === 'recording' && styles.voiceBtnActive]}
                  onPressIn={startRecording}
                  onPressOut={stopRecording}
                  disabled={isParsing}
                >
                  <Text style={styles.voiceBtnText}>
                    {recordingStatus === 'recording'
                      ? `🔴 录音中... ${duration}s`
                      : recordingStatus === 'processing'
                      ? '转写中...'
                      : '🎙️ 按住说话'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.sendBtn} onPress={() => handleParseText(inputText)} disabled={!inputText.trim() || isParsing}>
                  <Text style={styles.sendBtnText}>解析</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setStep('manual')}>
                  <Text style={styles.manualLink}>或者手动输入</Text>
                </TouchableOpacity>
              </View>
            )}

            {step === 'confirm' && parsed && (
              <View style={styles.section}>
                {/* 仓鼠说话 */}
                <HamsterAvatar
                  mood={isLowConfidence ? 'warning' : 'happy'}
                  size={44}
                  showSpeech
                  speechText={confirmLine || `¥${yuan}，是这样吗？`}
                />

                {/* 解析结果卡片 */}
                {isLowConfidence && (
                  <View style={styles.warningBadge}>
                    <Text style={styles.warningText}>⚠️ 置信度偏低，请确认</Text>
                  </View>
                )}

                <View style={styles.resultCard}>
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>金额</Text>
                    <Text style={styles.resultValue}>¥{yuan}</Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>分类</Text>
                    <Text style={styles.resultValue}>
                      {parsed.category?.icon} {parsed.category?.name || parsed.category_code}
                    </Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>时间</Text>
                    <Text style={styles.resultValue}>
                      {new Date(parsed.occurred_at).toLocaleString('zh-CN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                  {(parsed.merchant || parsed.note) && (
                    <>
                      <View style={styles.divider} />
                      <View style={styles.resultRow}>
                        <Text style={styles.resultLabel}>备注</Text>
                        <Text style={styles.resultValue}>{parsed.note || parsed.merchant}</Text>
                      </View>
                    </>
                  )}
                </View>

                <View style={styles.btnRow}>
                  <TouchableOpacity style={styles.modifyBtn} onPress={() => setStep('manual')}>
                    <Text style={styles.modifyBtnText}>修改</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
                    <Text style={styles.confirmBtnText}>✓ 确认入账</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {step === 'manual' && (
              <View style={styles.section}>
                <Text style={styles.fieldLabel}>金额</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0.00"
                  placeholderTextColor="#CCC"
                  value={manualAmount}
                  onChangeText={setManualAmount}
                  keyboardType="decimal-pad"
                  autoFocus
                />

                <Text style={styles.fieldLabel}>分类</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat.code}
                      style={[styles.catChip, manualCategory.code === cat.code && styles.catChipActive]}
                      onPress={() => setManualCategory(cat)}
                    >
                      <Text style={styles.catChipText}>{cat.icon} {cat.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={styles.fieldLabel}>备注（选填）</Text>
                <TextInput
                  style={styles.noteInput}
                  placeholder="备注..."
                  placeholderTextColor="#CCC"
                  value={manualNote}
                  onChangeText={setManualNote}
                />

                <TouchableOpacity style={styles.confirmBtn} onPress={handleManualSave}>
                  <Text style={styles.confirmBtnText}>✓ 保存</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F0' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EAE0',
  },
  closeBtn: { fontSize: 18, color: '#888', width: 32, textAlign: 'center' },
  title: { fontSize: 17, fontWeight: '600', color: '#1A1A1A' },
  body: { flex: 1 },
  section: { padding: 20, gap: 16 },
  textInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1A1A1A',
    minHeight: 80,
    borderWidth: 1,
    borderColor: '#F0EAE0',
    textAlignVertical: 'top',
  },
  parseLoading: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
  parseLoadingText: { color: '#888', fontSize: 14 },
  voiceBtn: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F0EAE0',
    borderStyle: 'dashed',
  },
  voiceBtnActive: { borderColor: '#FF4444', backgroundColor: '#FFF0F0' },
  voiceBtnText: { fontSize: 16, color: '#3D2B1F', fontWeight: '500' },
  sendBtn: {
    backgroundColor: '#FF8C42',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  sendBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  manualLink: { textAlign: 'center', color: '#888', fontSize: 14 },
  warningBadge: {
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#FFB800',
  },
  warningText: { color: '#B8860B', fontSize: 13 },
  resultCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0EAE0',
  },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 14, alignItems: 'center' },
  resultLabel: { fontSize: 14, color: '#888' },
  resultValue: { fontSize: 16, color: '#1A1A1A', fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#F7F0E8', marginHorizontal: 14 },
  btnRow: { flexDirection: 'row', gap: 12 },
  modifyBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF8C42',
    alignItems: 'center',
  },
  modifyBtnText: { color: '#FF8C42', fontSize: 16, fontWeight: '600' },
  confirmBtn: { flex: 2, backgroundColor: '#FF8C42', borderRadius: 12, padding: 16, alignItems: 'center' },
  confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  fieldLabel: { fontSize: 14, color: '#3D2B1F', fontWeight: '600' },
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
