/**
 * 引导页 — 注册 + 给仓鼠起名
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuthStore } from '../src/store/authStore';
import { authApi } from '../src/api/client';
import { HamsterAvatar } from '../src/components/HamsterAvatar';

type Step = 'welcome' | 'phone' | 'code' | 'naming';

export default function OnboardingScreen() {
  const [step, setStep] = useState<Step>('welcome');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [hamsterName, setHamsterName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login, updateAssistantName, setOnboarded } = useAuthStore();

  const handleSendCode = async () => {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      Alert.alert('', '请输入正确的手机号');
      return;
    }
    setIsLoading(true);
    try {
      await authApi.sendCode(phone);
      setStep('code');
    } catch {
      Alert.alert('发送失败', '请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (code.length !== 6) {
      Alert.alert('', '请输入 6 位验证码');
      return;
    }
    setIsLoading(true);
    try {
      const res = await authApi.verifyCode(phone, code);
      await login(res.data.token, res.data.user);
      setStep('naming');
    } catch {
      Alert.alert('验证失败', '验证码错误或已过期');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNaming = async () => {
    const name = hamsterName.trim() || '花生';
    setIsLoading(true);
    try {
      await updateAssistantName(name);
      await setOnboarded();
    } catch {
      await setOnboarded(); // 即使改名失败也继续
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {step === 'welcome' && (
        <View style={styles.content}>
          <HamsterAvatar mood="happy" size={96} />
          <Text style={styles.mainTitle}>嗯，你终于来了</Text>
          <Text style={styles.subtitle}>我是你的记账仓鼠，以后的账，{'\n'}就交给我来帮你管着吧。</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => setStep('phone')}>
            <Text style={styles.primaryBtnText}>开始记账</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 'phone' && (
        <View style={styles.content}>
          <Text style={styles.stepTitle}>手机号登录</Text>
          <TextInput
            style={styles.input}
            placeholder="请输入手机号"
            placeholderTextColor="#CCC"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            maxLength={11}
            autoFocus
          />
          <TouchableOpacity
            style={[styles.primaryBtn, (!phone || isLoading) && styles.btnDisabled]}
            onPress={handleSendCode}
            disabled={!phone || isLoading}
          >
            {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>发送验证码</Text>}
          </TouchableOpacity>
        </View>
      )}

      {step === 'code' && (
        <View style={styles.content}>
          <Text style={styles.stepTitle}>输入验证码</Text>
          <Text style={styles.codeHint}>已发送至 {phone}</Text>
          <TextInput
            style={[styles.input, styles.codeInput]}
            placeholder="6 位验证码"
            placeholderTextColor="#CCC"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
          />
          <TouchableOpacity
            style={[styles.primaryBtn, (code.length !== 6 || isLoading) && styles.btnDisabled]}
            onPress={handleVerifyCode}
            disabled={code.length !== 6 || isLoading}
          >
            {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>验证</Text>}
          </TouchableOpacity>
        </View>
      )}

      {step === 'naming' && (
        <View style={styles.content}>
          <HamsterAvatar mood="happy" size={80} />
          <Text style={styles.stepTitle}>给我起个名字吧</Text>
          <Text style={styles.subtitle}>不起的话，我就叫花生了（哼）</Text>
          <TextInput
            style={styles.input}
            placeholder="花生、小橘、豆豆..."
            placeholderTextColor="#CCC"
            value={hamsterName}
            onChangeText={setHamsterName}
            maxLength={20}
            autoFocus
          />
          <TouchableOpacity style={styles.primaryBtn} onPress={handleNaming} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>{hamsterName.trim() ? '就叫这个！' : '就叫花生好了'}</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F0' },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 20,
  },
  mainTitle: { fontSize: 28, fontWeight: '800', color: '#1A1A1A', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#888', textAlign: 'center', lineHeight: 24 },
  stepTitle: { fontSize: 24, fontWeight: '700', color: '#1A1A1A' },
  codeHint: { fontSize: 14, color: '#888', marginTop: -10 },
  input: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
    fontSize: 18,
    color: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#F0EAE0',
    textAlign: 'center',
  },
  codeInput: { letterSpacing: 6, fontWeight: '700' },
  primaryBtn: {
    width: '100%',
    backgroundColor: '#FF8C42',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
