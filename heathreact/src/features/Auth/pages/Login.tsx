import { useUserStore } from '@/stores/user';
import { ApiError } from '@/api/client';
import { authService, type OtpPurpose } from '@/api/services/auth.service';
import { signInWithGoogle } from '@/services/googleSignIn';
import { palette } from '@/theme/tokens';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { appStorage } from '@/utils/storage';
import React, { useEffect, useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SAVED_USER_KEY = 'saved_username';
const LEGACY_SAVED_PWD_KEY = 'saved_password';
const REMEMBER_ME_KEY = 'saved_remember_me';

const authSchemaFor = (mode: 'login' | 'signup') => z.object({
  username: z.string().trim().min(1, 'Vui lòng nhập tài khoản hoặc email.').refine(
    (value) => mode !== 'signup' || /^[^\s@]+@gmail\.com$/i.test(value),
    'Vui lòng sử dụng địa chỉ email @gmail.com hợp lệ.',
  ),
  pwd: z.string().min(1, 'Vui lòng nhập mật khẩu.').refine(
    (value) => mode !== 'signup' || value.length >= 8,
    'Mật khẩu cần tối thiểu 8 ký tự để bảo vệ tài khoản.',
  ),
  confirmPwd: z.string(),
}).superRefine((values, context) => {
  if (mode === 'signup' && values.pwd !== values.confirmPwd) {
    context.addIssue({ code: 'custom', path: ['confirmPwd'], message: 'Mật khẩu xác nhận không trùng khớp.' });
  }
});

type AuthFormValues = z.infer<ReturnType<typeof authSchemaFor>>;

export default function LoginPage() {
  const insets = useSafeAreaInsets();
  const login = useUserStore((state) => state.login);
  const completeLogin = useUserStore((state) => state.completeLogin);

  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [flow, setFlow] = useState<'AUTH' | 'FORGOT_EMAIL' | 'REGISTER_OTP' | 'RESET_OTP' | 'NEW_PASSWORD'>('AUTH');
  const [flowEmail, setFlowEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [otpExpiresIn, setOtpExpiresIn] = useState(0);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [flowMessage, setFlowMessage] = useState('');
  const [flowError, setFlowError] = useState('');
  const formSchema = useMemo(() => authSchemaFor(mode), [mode]);
  const { control, setValue, handleSubmit, clearErrors } = useForm<AuthFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { username: '', pwd: '', confirmPwd: '' },
    mode: 'onSubmit',
  });
  const username = useWatch({ control, name: 'username' }) ?? '';
  const pwd = useWatch({ control, name: 'pwd' }) ?? '';
  const confirmPwd = useWatch({ control, name: 'confirmPwd' }) ?? '';

  // Nạp tài khoản đã lưu nếu người dùng đã bật 'Ghi nhớ tôi'
  useEffect(() => {
    async function loadSavedCredentials() {
      try {
        const rem = await appStorage.getItem(REMEMBER_ME_KEY);
        if (rem === 'true' || rem === null) {
          const savedU = await appStorage.getItem(SAVED_USER_KEY);
          if (savedU) setValue('username', savedU);
          setRememberMe(true);
        } else if (rem === 'false') {
          setRememberMe(false);
        }
      } catch {
        // Fallback an toàn
      }
    }
    void appStorage.removeItem(LEGACY_SAVED_PWD_KEY);
    void loadSavedCredentials();
  }, [setValue]);

  useEffect(() => {
    if (flow !== 'REGISTER_OTP' && flow !== 'RESET_OTP') return;
    const timer = setInterval(() => {
      setOtpCountdown(current => Math.max(0, current - 1));
      setOtpExpiresIn(current => Math.max(0, current - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [flow]);

  const triggerHaptic = (type: 'light' | 'medium' | 'success' | 'error' = 'light') => {
    try {
      if (Platform.OS !== 'web') {
        if (type === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        else if (type === 'medium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        else if (type === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        else if (type === 'error') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch {
      // Haptics not supported or web
    }
  };

  const handleSwitchMode = (newMode: 'login' | 'signup') => {
    triggerHaptic('light');
    setMode(newMode);
    setError('');
    clearErrors();
  };

  const handleForgotPassword = () => {
    triggerHaptic('light');
    setFlowEmail(username.trim());
    setFlowError('');
    setFlowMessage('');
    setFlow('FORGOT_EMAIL');
    /* Alert.alert(
      'Khôi phục mật khẩu',
      'Nếu bạn quên mật khẩu hoặc tài khoản chưa kích hoạt, vui lòng liên hệ quản trị viên hoặc sử dụng email Gmail đã đăng ký để được cấp lại mật khẩu.',
      [{ text: 'Đã hiểu', style: 'default' }]
    ); */
  };

  const closeOtpFlow = () => {
    setFlow('AUTH'); setOtpCode(''); setResetToken(''); setNewPassword(''); setConfirmNewPassword('');
    setFlowError(''); setFlowMessage('');
  };

  const startPasswordReset = async () => {
    if (!/^[^\s@]+@gmail\.com$/i.test(flowEmail.trim())) { setFlowError('Nháº­p Ä‘á»‹a chá»‰ Gmail há»£p lá»‡.'); return; }
    setLoading(true); setFlowError(''); setFlowMessage('');
    try {
      const result = await authService.sendPasswordResetOtp(flowEmail.trim());
      setOtpCountdown(result.resendAfterSeconds); setOtpExpiresIn(result.expiresInSeconds); setOtpCode(''); setFlow('RESET_OTP'); setFlowMessage(result.message);
    } catch (err) { setFlowError(err instanceof ApiError ? err.message : 'KhÃ´ng thá»ƒ gá»­i yÃªu cáº§u lÃºc nÃ y.'); }
    finally { setLoading(false); }
  };

  const resendOtp = async () => {
    if (otpCountdown > 0 || loading) return;
    const purpose: OtpPurpose = flow === 'REGISTER_OTP' ? 'REGISTER' : 'RESET_PASSWORD';
    setLoading(true); setFlowError(''); setFlowMessage('');
    try {
      const result = await authService.resendOtp(flowEmail, purpose);
      setOtpCountdown(result.resendAfterSeconds); setOtpExpiresIn(result.expiresInSeconds); setOtpCode(''); setFlowMessage(result.message);
    } catch (err) { setFlowError(err instanceof ApiError ? err.message : 'KhÃ´ng thá»ƒ gá»­i láº¡i mÃ£ lÃºc nÃ y.'); }
    finally { setLoading(false); }
  };

  const verifyOtp = async () => {
    if (!/^\d{6}$/.test(otpCode)) { setFlowError('Nháº­p Ä‘á»§ 6 chá»¯ sá»‘.'); return; }
    const purpose: OtpPurpose = flow === 'REGISTER_OTP' ? 'REGISTER' : 'RESET_PASSWORD';
    setLoading(true); setFlowError(''); setFlowMessage('');
    try {
      const response = await authService.verifyOtp(flowEmail, purpose, otpCode);
      if (!response.verified) throw new Error(response.message);
      if (purpose === 'REGISTER') {
        if (!response.login?.token) throw new Error('MÃ¡y chá»§ chÆ°a tráº£ vá» phiÃªn Ä‘Äƒng nháº­p.');
        await completeLogin(response.login);
        if (rememberMe) { await appStorage.setItem(REMEMBER_ME_KEY, 'true'); await appStorage.setItem(SAVED_USER_KEY, flowEmail); }
        else { await appStorage.setItem(REMEMBER_ME_KEY, 'false'); await appStorage.removeItem(SAVED_USER_KEY); }
        triggerHaptic('success');
        return;
      }
      if (!response.resetToken) throw new Error('MÃ¡y chá»§ chÆ°a tráº£ vá» quyá»n Ä‘áº·t láº¡i máº­t kháº©u.');
      setResetToken(response.resetToken); setNewPassword(''); setConfirmNewPassword(''); setFlow('NEW_PASSWORD');
      setFlowMessage(response.message);
    } catch (err) { triggerHaptic('error'); setFlowError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'KhÃ´ng thá»ƒ xÃ¡c minh mÃ£.'); }
    finally { setLoading(false); }
  };

  const submitNewPassword = async () => {
    if (newPassword.length < 8 || newPassword.length > 72) { setFlowError('Máº­t kháº©u pháº£i cÃ³ tá»« 8 Ä‘áº¿n 72 kÃ½ tá»±.'); return; }
    if (newPassword !== confirmNewPassword) { setFlowError('Máº­t kháº©u xÃ¡c nháº­n khÃ´ng khá»›p.'); return; }
    setLoading(true); setFlowError(''); setFlowMessage('');
    try {
      await authService.resetPassword(flowEmail, resetToken, newPassword);
      setFlowMessage('ÄÃ£ Ä‘áº·t máº­t kháº©u má»›i. HÃ£y Ä‘Äƒng nháº­p láº¡i.');
      setMode('login'); setValue('username', flowEmail); setValue('pwd', ''); setValue('confirmPwd', '');
      setFlow('AUTH'); setResetToken(''); setOtpCode('');
    } catch (err) { setFlowError(err instanceof ApiError ? err.message : 'KhÃ´ng thá»ƒ Ä‘áº·t máº­t kháº©u má»›i.'); }
    finally { setLoading(false); }
  };

  const handleLogin = async (values: AuthFormValues) => {
    triggerHaptic('medium');
    const trimmedUser = values.username.trim();
    const rawPassword = values.pwd;

    setError('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        const response = await authService.signUp(trimmedUser, rawPassword);
        setFlowEmail(trimmedUser); setOtpCountdown(response.resendAfterSeconds); setOtpExpiresIn(response.expiresInSeconds); setOtpCode('');
        setFlowMessage(response.message); setFlowError(''); setFlow('REGISTER_OTP');
        triggerHaptic('success');
        return;
      } else {
        await login(trimmedUser, rawPassword);
      }

      // Lưu hoặc xóa thông tin đăng nhập theo lựa chọn 'Ghi nhớ tôi'
      try {
        if (rememberMe) {
          await appStorage.setItem(REMEMBER_ME_KEY, 'true');
          await appStorage.setItem(SAVED_USER_KEY, trimmedUser);
        } else {
          await appStorage.setItem(REMEMBER_ME_KEY, 'false');
          await appStorage.removeItem(SAVED_USER_KEY);
        }
      } catch (e) {
        console.warn('Lỗi lưu credentials:', e);
      }

      triggerHaptic('success');
    } catch (err: unknown) {
      triggerHaptic('error');
      if (err instanceof ApiError) {
        setError(err.message || 'Yêu cầu không thành công. Vui lòng thử lại.');
      } else {
        setError(
          mode === 'login'
            ? 'Đăng nhập thất bại. Kiểm tra lại tên tài khoản hoặc mật khẩu!'
            : 'Đăng ký không thành công. Tài khoản có thể đã tồn tại.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const submitLogin = handleSubmit(handleLogin, (fieldErrors) => {
    triggerHaptic('error');
    setError(fieldErrors.username?.message || fieldErrors.pwd?.message || fieldErrors.confirmPwd?.message || 'Vui lòng kiểm tra lại thông tin.');
  });

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const idToken = await signInWithGoogle();
      if (!idToken) return;
      await completeLogin(await authService.googleLogin(idToken));
      triggerHaptic('success');
    } catch (err: unknown) {
      triggerHaptic('error');
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Không thể đăng nhập Google.');
    } finally {
      setLoading(false);
    }
  };

  const isFieldActive = (field: string) => focusedField === field;

  if (flow !== 'AUTH') {
    const otpFlow = flow === 'REGISTER_OTP' || flow === 'RESET_OTP';
    const title = flow === 'FORGOT_EMAIL' ? 'KhÃ´i phá»¥c máº­t kháº©u'
      : flow === 'NEW_PASSWORD' ? 'Äáº·t máº­t kháº©u má»›i'
        : flow === 'REGISTER_OTP' ? 'XÃ¡c minh email' : 'Nháº­p mÃ£ OTP';
    const primaryLabel = flow === 'FORGOT_EMAIL' ? 'Gá»­i mÃ£ xÃ¡c minh'
      : flow === 'NEW_PASSWORD' ? 'LÆ°u máº­t kháº©u má»›i' : 'XÃ¡c minh mÃ£';
    const primaryAction = flow === 'FORGOT_EMAIL' ? startPasswordReset
      : flow === 'NEW_PASSWORD' ? submitNewPassword : verifyOtp;
    return <View style={{ flex: 1, backgroundColor: '#F7F8FC', paddingTop: insets.top + 20, paddingHorizontal: 22 }}>
      <StatusBar barStyle="dark-content" />
      <Pressable onPress={closeOtpFlow} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: palette.primary, fontSize: 16 }}>‹  Quay láº¡i</Text></Pressable>
      <View style={{ marginTop: 32, gap: 12 }}>
        <Text style={{ color: palette.text, fontSize: 25, fontWeight: '800' }}>{title}</Text>
        <Text style={{ color: palette.textMuted, lineHeight: 21 }}>{otpFlow ? `Nháº­p mÃ£ 6 chá»¯ sá»‘ gá»­i Ä‘áº¿n ${flowEmail}. MÃ£ chá»‰ dÃ¹ng má»™t láº§n.` : flow === 'FORGOT_EMAIL' ? 'Nháº­p Gmail Ä‘Ã£ Ä‘Äƒng kÃ½. Náº¿u thÃ´ng tin phÃ¹ há»£p, chÃºng tÃ´i sáº½ gá»­i mÃ£ xÃ¡c minh.' : 'Máº­t kháº©u má»›i cáº§n cÃ³ tá»« 8 Ä‘áº¿n 72 kÃ½ tá»±.'}</Text>
        {flow === 'FORGOT_EMAIL' ? <TextInput value={flowEmail} onChangeText={setFlowEmail} autoCapitalize="none" keyboardType="email-address" placeholder="email@gmail.com" placeholderTextColor={palette.textMuted} style={{ minHeight: 50, paddingHorizontal: 14, borderWidth: 1, borderColor: palette.border, borderRadius: 10, backgroundColor: '#FFFFFF', color: palette.text }} /> : null}
        {otpFlow ? <>
          <TextInput value={otpCode} onChangeText={value => setOtpCode(value.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" maxLength={6} autoComplete="one-time-code" textContentType="oneTimeCode" placeholder="000000" placeholderTextColor={palette.textMuted} style={{ minHeight: 58, paddingHorizontal: 14, borderWidth: 1, borderColor: palette.border, borderRadius: 10, backgroundColor: '#FFFFFF', color: palette.text, fontSize: 25, letterSpacing: 5, textAlign: 'center' }} />
          <Text style={{ color: otpExpiresIn > 0 ? palette.textMuted : palette.danger, fontSize: 13 }}>MÃ£ háº¿t háº¡n sau {otpExpiresIn}s</Text>
          <Pressable disabled={otpCountdown > 0 || loading} onPress={() => void resendOtp()} accessibilityRole="button" style={{ minHeight: 38, justifyContent: 'center', opacity: otpCountdown > 0 || loading ? 0.55 : 1 }}><Text style={{ color: palette.primary, fontWeight: '700' }}>{otpCountdown > 0 ? `Gá»­i láº¡i sau ${otpCountdown}s` : 'Gá»­i láº¡i mÃ£ OTP'}</Text></Pressable>
        </> : null}
        {flow === 'NEW_PASSWORD' ? <>
          <TextInput value={newPassword} onChangeText={setNewPassword} secureTextEntry placeholder="Máº­t kháº©u má»›i" placeholderTextColor={palette.textMuted} style={{ minHeight: 50, paddingHorizontal: 14, borderWidth: 1, borderColor: palette.border, borderRadius: 10, backgroundColor: '#FFFFFF', color: palette.text }} />
          <TextInput value={confirmNewPassword} onChangeText={setConfirmNewPassword} secureTextEntry placeholder="XÃ¡c nháº­n máº­t kháº©u má»›i" placeholderTextColor={palette.textMuted} style={{ minHeight: 50, paddingHorizontal: 14, borderWidth: 1, borderColor: palette.border, borderRadius: 10, backgroundColor: '#FFFFFF', color: palette.text }} />
        </> : null}
        {flowMessage ? <Text accessibilityLiveRegion="polite" style={{ color: palette.success, lineHeight: 20 }}>{flowMessage}</Text> : null}
        {flowError ? <Text accessibilityLiveRegion="polite" style={{ color: palette.danger, lineHeight: 20 }}>{flowError}</Text> : null}
        <Pressable onPress={() => void primaryAction()} disabled={loading} accessibilityRole="button" style={{ minHeight: 50, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: palette.primary, opacity: loading ? 0.6 : 1 }}>
          {loading ? <ActivityIndicator color="#FFFFFF" /> : null}<Text style={{ color: '#FFFFFF', fontWeight: '800' }}>{loading ? 'Äang xá»­ lÃ½...' : primaryLabel}</Text>
        </Pressable>
      </View>
    </View>;
  }

  return (
    <View nativeID="auth-screen" style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: insets.top + 16,
              paddingBottom: Math.max(insets.bottom, 24) + 20,
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Brand Hero */}
          <View style={styles.header}>
            <View style={styles.logoBadgeContainer}>
              <View style={styles.logoIconBox}>
                <Ionicons name="barbell" size={28} color={palette.primary} />
                <View style={styles.sparkleDot}>
                  <Ionicons name="sparkles" size={11} color="#FFFFFF" />
                </View>
              </View>
            </View>

            <View style={styles.aiTagPill}>
              <Ionicons name="flash" size={12} color={palette.primary} />
              <Text style={styles.aiTagText}>AI FITNESS & POSTURE ASSISTANT</Text>
            </View>

            <Text style={styles.title}>
              {mode === 'login' ? 'Chào mừng trở lại' : 'Tạo tài khoản mới'}
            </Text>
            <Text style={styles.subtitle}>
              {mode === 'login'
                ? 'Đăng nhập để tiếp tục lộ trình luyện tập & theo dõi tư thế'
                : 'Đăng ký nhanh với Gmail để bắt đầu tập luyện thông minh'}
            </Text>
          </View>

          {/* Segmented Mode Switcher */}
          <View style={styles.segmentContainer}>
            <Pressable
              onPress={() => handleSwitchMode('login')}
              style={[
                styles.segmentTab,
                mode === 'login' && styles.segmentTabActive,
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === 'login' }}
            >
              <Ionicons
                name="log-in-outline"
                size={17}
                color={mode === 'login' ? palette.primary : palette.textMuted}
              />
              <Text
                style={[
                  styles.segmentText,
                  mode === 'login' && styles.segmentTextActive,
                ]}
              >
                Đăng nhập
              </Text>
            </Pressable>

            <Pressable
              onPress={() => handleSwitchMode('signup')}
              style={[
                styles.segmentTab,
                mode === 'signup' && styles.segmentTabActive,
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === 'signup' }}
            >
              <Ionicons
                name="person-add-outline"
                size={16}
                color={mode === 'signup' ? palette.primary : palette.textMuted}
              />
              <Text
                style={[
                  styles.segmentText,
                  mode === 'signup' && styles.segmentTextActive,
                ]}
              >
                Đăng ký
              </Text>
            </Pressable>
          </View>

          {/* Main Form Card */}
          <View style={styles.card}>
            {/* Error Banner */}
            {Boolean(error) && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color={palette.danger} />
                <Text style={styles.errorText}>{error}</Text>
                <Pressable onPress={() => setError('')} hitSlop={8}>
                  <Ionicons name="close" size={16} color={palette.danger} />
                </Pressable>
              </View>
            )}

            {/* Input: Username / Email */}
            <View style={styles.fieldGroup}>
              <View style={styles.fieldLabelRow}>
                <Text style={styles.fieldLabel}>
                  {mode === 'login' ? 'Tài khoản hoặc Email' : 'Email đăng ký (@gmail.com)'}
                </Text>
                {mode === 'signup' && (
                  <Text style={styles.fieldHintBadge}>Bắt buộc Gmail</Text>
                )}
              </View>

              <View
                style={[
                  styles.inputWrapper,
                  isFieldActive('usr') && styles.inputWrapperFocused,
                ]}
              >
                <Ionicons
                  name={mode === 'login' ? 'person-outline' : 'mail-outline'}
                  size={19}
                  color={isFieldActive('usr') ? palette.primary : palette.textMuted}
                  style={styles.inputPrefixIcon}
                />
                <Controller control={control} name="username" render={({ field: { value, onChange, onBlur } }) => (
                  <TextInput
                    placeholder={mode === 'login' ? 'Nhập tên đăng nhập hoặc email' : 'ví dụ: nguyenvana@gmail.com'}
                    placeholderTextColor="#64748B"
                    value={value}
                    onChangeText={(val) => { onChange(val); if (error) setError(''); }}
                    onFocus={() => setFocusedField('usr')}
                    onBlur={() => { onBlur(); setFocusedField(null); }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete={mode === 'signup' ? 'email' : 'username'}
                    keyboardType={mode === 'signup' ? 'email-address' : 'default'}
                    style={styles.textInput}
                  />
                )} />
                {Boolean(username) && (
                  <Pressable
                    onPress={() => setValue('username', '')}
                    hitSlop={8}
                    style={styles.clearBtn}
                  >
                    <Ionicons name="close-circle" size={16} color="#64748B" />
                  </Pressable>
                )}
              </View>
            </View>

            {/* Input: Password */}
            <View style={styles.fieldGroup}>
              <View style={styles.fieldLabelRow}>
                <Text style={styles.fieldLabel}>Mật khẩu</Text>
                {mode === 'signup' && (
                  <Text style={styles.fieldHintBadge}>Tối thiểu 8 ký tự</Text>
                )}
              </View>

              <View
                style={[
                  styles.inputWrapper,
                  isFieldActive('pwd') && styles.inputWrapperFocused,
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={19}
                  color={isFieldActive('pwd') ? palette.primary : palette.textMuted}
                  style={styles.inputPrefixIcon}
                />
                <Controller control={control} name="pwd" render={({ field: { value, onChange, onBlur } }) => (
                  <TextInput
                    placeholder="Nhập mật khẩu của bạn"
                    placeholderTextColor="#64748B"
                    value={value}
                    onChangeText={(val) => { onChange(val); if (error) setError(''); }}
                    onFocus={() => setFocusedField('pwd')}
                    onBlur={() => { onBlur(); setFocusedField(null); }}
                    secureTextEntry={!showPwd}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    style={styles.textInput}
                  />
                )} />
                <Pressable
                  onPress={() => {
                    triggerHaptic('light');
                    setShowPwd(!showPwd);
                  }}
                  hitSlop={8}
                  style={styles.eyeBtn}
                >
                  <Ionicons
                    name={showPwd ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={showPwd ? palette.primary : '#64748B'}
                  />
                </Pressable>
              </View>
            </View>

            {/* Input: Confirm Password (Signup only) */}
            {mode === 'signup' && (
              <View style={styles.fieldGroup}>
                <View style={styles.fieldLabelRow}>
                  <Text style={styles.fieldLabel}>Xác nhận mật khẩu</Text>
                  {Boolean(confirmPwd) && pwd === confirmPwd && (
                    <View style={styles.matchBadge}>
                      <Ionicons name="checkmark-circle" size={12} color={palette.success} />
                      <Text style={styles.matchBadgeText}>Trùng khớp</Text>
                    </View>
                  )}
                </View>

                <View
                  style={[
                    styles.inputWrapper,
                    isFieldActive('confirmPwd') && styles.inputWrapperFocused,
                  ]}
                >
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={19}
                    color={isFieldActive('confirmPwd') ? palette.primary : palette.textMuted}
                    style={styles.inputPrefixIcon}
                  />
                  <Controller control={control} name="confirmPwd" render={({ field: { value, onChange, onBlur } }) => (
                    <TextInput
                      placeholder="Nhập lại mật khẩu để xác nhận"
                      placeholderTextColor="#64748B"
                      value={value}
                      onChangeText={(val) => { onChange(val); if (error) setError(''); }}
                      onFocus={() => setFocusedField('confirmPwd')}
                      onBlur={() => { onBlur(); setFocusedField(null); }}
                      secureTextEntry={!showConfirmPwd}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="new-password"
                      style={styles.textInput}
                    />
                  )} />
                  <Pressable
                    onPress={() => {
                      triggerHaptic('light');
                      setShowConfirmPwd(!showConfirmPwd);
                    }}
                    hitSlop={8}
                    style={styles.eyeBtn}
                  >
                    <Ionicons
                      name={showConfirmPwd ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={showConfirmPwd ? palette.primary : '#64748B'}
                    />
                  </Pressable>
                </View>
              </View>
            )}

            {/* Auxiliary Row (Remember me & Forgot Password) */}
            {mode === 'login' && (
              <View style={styles.auxRow}>
                <Pressable
                  onPress={() => {
                    triggerHaptic('light');
                    setRememberMe(!rememberMe);
                  }}
                  style={styles.rememberMeContainer}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: rememberMe }}
                >
                  <View
                    style={[
                      styles.checkbox,
                      rememberMe && styles.checkboxActive,
                    ]}
                  >
                    {rememberMe && (
                      <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                    )}
                  </View>
                  <Text style={styles.rememberMeText}>Ghi nhớ tôi</Text>
                </Pressable>

                <Pressable onPress={handleForgotPassword} hitSlop={6}>
                  <Text style={styles.forgotPwdText}>Quên mật khẩu?</Text>
                </Pressable>
              </View>
            )}

            {/* Submit Action Button */}
            <Pressable
              onPress={() => void submitLogin()}
              disabled={loading}
              style={({ pressed }) => [
                styles.submitBtn,
                loading && styles.submitBtnDisabled,
                pressed && styles.submitBtnPressed,
              ]}
              accessibilityRole="button"
            >
              {loading ? (
                <View style={styles.submitBtnContent}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.submitBtnText}>
                    {mode === 'login' ? 'Đang xác thực...' : 'Đang khởi tạo tài khoản...'}
                  </Text>
                </View>
              ) : (
                <View style={styles.submitBtnContent}>
                  <Text style={styles.submitBtnText}>
                    {mode === 'login' ? 'Đăng nhập ngay' : 'Đăng ký tài khoản'}
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </View>
              )}
            </Pressable>

            {Platform.OS !== 'web' ? (
              <>
                <View style={styles.authDivider}>
                  <View style={styles.authDividerLine} />
                  <Text style={styles.authDividerText}>HOẶC</Text>
                  <View style={styles.authDividerLine} />
                </View>
                <Pressable
                  onPress={() => void handleGoogleSignIn()}
                  disabled={loading}
                  style={({ pressed }) => [styles.googleButton, (pressed || loading) && styles.googleButtonPressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Tiếp tục với Google"
                >
                  <Ionicons name="logo-google" size={18} color="#4285F4" />
                  <Text style={styles.googleButtonText}>Tiếp tục với Google</Text>
                </Pressable>
              </>
            ) : null}

            {/* Switch Mode Footer */}
            <Pressable
              onPress={() => handleSwitchMode(mode === 'login' ? 'signup' : 'login')}
              style={styles.switchModeBtn}
              accessibilityRole="button"
            >
              <Text style={styles.switchModePrompt}>
                {mode === 'login' ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}
                <Text style={styles.switchModeAction}>
                  {mode === 'login' ? 'Đăng ký ngay' : 'Đăng nhập ngay'}
                </Text>
              </Text>
            </Pressable>
          </View>

          {/* Academic / Project Note Footer */}
          <Text style={styles.footerNote}>
            Health Assistant • Trợ lý sức khỏe & luyện tập thông minh
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },

  /* Header Branding */
  header: {
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 12,
  },
  logoBadgeContainer: {
    position: 'relative',
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoIconBox: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: palette.primary,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: palette.primary,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  sparkleDot: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: palette.bg,
  },
  aiTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.primarySoft,
    borderWidth: 1,
    borderColor: '#DFDDFF',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 10,
    gap: 6,
  },
  aiTagText: {
    color: palette.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  title: {
    color: palette.text,
    fontSize: 27,
    fontWeight: '800',
    letterSpacing: 0,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    color: palette.textMuted,
    fontSize: 13.5,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
  },

  /* Segmented Mode Switcher */
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#EEF0F8',
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: palette.border,
    marginBottom: 20,
    width: '100%',
    maxWidth: 400,
  },
  segmentTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  segmentTabActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DAD7FF',
  },
  segmentText: {
    color: palette.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: palette.primaryDark,
    fontWeight: '800',
  },

  /* Card */
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: '#34305E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3,
  },

  /* Error Banner */
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0F3',
    borderWidth: 1,
    borderColor: '#FFD6DF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    flex: 1,
    color: '#C94363',
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '500',
  },

  /* Fields */
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 7,
  },
  fieldLabel: {
    color: palette.text,
    fontSize: 13,
    fontWeight: '700',
  },
  fieldHintBadge: {
    color: palette.accent,
    fontSize: 11,
    fontWeight: '600',
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  matchBadgeText: {
    color: palette.success,
    fontSize: 11,
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: palette.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 52,
  },
  inputWrapperFocused: {
    borderColor: palette.primary,
    backgroundColor: '#FBFAFF',
    shadowColor: palette.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  inputPrefixIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    color: palette.text,
    fontSize: 15,
    paddingVertical: 12,
  },
  clearBtn: {
    padding: 4,
  },
  eyeBtn: {
    padding: 6,
  },

  /* Auxiliary Row */
  auxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 16,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#B7BBD0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  checkboxActive: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  rememberMeText: {
    color: palette.textMuted,
    fontSize: 13,
  },
  forgotPwdText: {
    color: palette.accent,
    fontSize: 13,
    fontWeight: '600',
  },

  /* Submit Button */
  submitBtn: {
    backgroundColor: palette.primary,
    borderRadius: 14,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: palette.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.9,
  },
  submitBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },

  authDivider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 17 },
  authDividerLine: { flex: 1, height: 1, backgroundColor: palette.border },
  authDividerText: { color: palette.textMuted, fontSize: 11, fontWeight: '700' },
  googleButton: { minHeight: 48, marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: palette.border },
  googleButtonPressed: { opacity: 0.75 },
  googleButtonText: { color: palette.text, fontSize: 14, fontWeight: '700' },

  /* Switch Mode Footer */
  switchModeBtn: {
    alignItems: 'center',
    marginTop: 18,
    paddingVertical: 6,
  },
  switchModePrompt: {
    color: palette.textMuted,
    fontSize: 13.5,
  },
  switchModeAction: {
    color: palette.accent,
    fontWeight: '800',
  },

  /* Footer Note */
  footerNote: {
    color: palette.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },
});
