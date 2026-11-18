import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { forwardRef, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod';
import { ApiError } from '@/api/client';
import { authService, type OtpPurpose } from '@/api/services/auth.service';
import { Pressable } from '@/components/ui/Pressable';
import { useUserStore } from '@/stores/user';
import { palette } from '@/theme/tokens';
import { appStorage } from '@/utils/storage';

const SAVED_USER_KEY = 'saved_username';
const LEGACY_SAVED_PWD_KEY = 'saved_password';
const REMEMBER_ME_KEY = 'saved_remember_me';
const GMAIL_PATTERN = /^[^\s@]+@gmail\.com$/i;

type Mode = 'login' | 'signup';
type Flow = 'AUTH' | 'REGISTER_OTP' | 'RESET_OTP' | 'NEW_PASSWORD';
type FieldName = 'username' | 'pwd' | 'confirmPwd';
type TextInputRef = React.ComponentRef<typeof TextInput>;

/** Kiểm tra form đăng nhập / đăng ký. Trả về thông báo lỗi đầu tiên, hoặc null nếu hợp lệ. */
export function validateAuthForm(mode: Mode, values: Record<FieldName, string>): string | null {
  const schema = z.object({
    username: z.string().trim().min(1, 'Vui lòng nhập tài khoản hoặc email.').refine(
      (value) => mode !== 'signup' || GMAIL_PATTERN.test(value),
      'Vui lòng sử dụng địa chỉ email @gmail.com hợp lệ.',
    ),
    pwd: z.string().min(1, 'Vui lòng nhập mật khẩu.').refine(
      (value) => mode !== 'signup' || value.length >= 8,
      'Mật khẩu cần tối thiểu 8 ký tự để bảo vệ tài khoản.',
    ),
    confirmPwd: z.string(),
  }).superRefine((data, context) => {
    if (mode === 'signup' && data.pwd !== data.confirmPwd) {
      context.addIssue({ code: 'custom', path: ['confirmPwd'], message: 'Mật khẩu xác nhận không trùng khớp.' });
    }
  });
  const result = schema.safeParse(values);
  return result.success ? null : result.error.issues[0]?.message ?? 'Vui lòng kiểm tra lại thông tin.';
}

function haptic(type: 'light' | 'medium' | 'success' | 'error' = 'light') {
  if (Platform.OS === 'web') return;
  try {
    if (type === 'light') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    else if (type === 'medium') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    else if (type === 'success') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } catch {
    // Thiết bị không hỗ trợ rung: bỏ qua.
  }
}

export default function LoginPage() {
  'use no memo';
  const insets = useSafeAreaInsets();
  const login = useUserStore((state) => state.login);
  const completeLogin = useUserStore((state) => state.completeLogin);

  // Form: dùng state thường (không dùng react-hook-form) để TextInput luôn là input "controlled" đơn giản nhất.
  const [username, setUsername] = useState('');
  const [pwd, setPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [mode, setMode] = useState<Mode>('login');
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [focusedField, setFocusedField] = useState<FieldName | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Luồng OTP (đăng ký) và đặt lại mật khẩu.
  const [flow, setFlow] = useState<Flow>('AUTH');
  const [flowEmail, setFlowEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [otpExpiresIn, setOtpExpiresIn] = useState(0);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [flowMessage, setFlowMessage] = useState('');
  const [flowError, setFlowError] = useState('');

  const pwdRef = useRef<TextInputRef>(null);
  const confirmRef = useRef<TextInputRef>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await appStorage.removeItem(LEGACY_SAVED_PWD_KEY);
        const remember = await appStorage.getItem(REMEMBER_ME_KEY);
        if (cancelled) return;
        if (remember === 'false') { setRememberMe(false); return; }
        const savedUser = await appStorage.getItem(SAVED_USER_KEY);
        if (!cancelled && savedUser) setUsername((current) => current || savedUser);
      } catch {
        // Không đọc được bộ nhớ: dùng mặc định.
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (flow !== 'REGISTER_OTP' && flow !== 'RESET_OTP') return;
    const timer = setInterval(() => {
      setOtpCountdown((current) => Math.max(0, current - 1));
      setOtpExpiresIn((current) => Math.max(0, current - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [flow]);

  const clearError = () => { if (error) setError(''); };

  const switchMode = () => {
    haptic('light');
    setMode((current) => (current === 'login' ? 'signup' : 'login'));
    setConfirmPwd('');
    setError('');
  };

  const persistRememberedUser = async (value: string) => {
    try {
      if (rememberMe) {
        await appStorage.setItem(REMEMBER_ME_KEY, 'true');
        await appStorage.setItem(SAVED_USER_KEY, value);
      } else {
        await appStorage.setItem(REMEMBER_ME_KEY, 'false');
        await appStorage.removeItem(SAVED_USER_KEY);
      }
    } catch {
      // Không lưu được "ghi nhớ" thì vẫn cho đăng nhập.
    }
  };

  const submit = async () => {
    if (loading) return;
    const validationError = validateAuthForm(mode, { username, pwd, confirmPwd });
    if (validationError) { haptic('error'); setError(validationError); return; }

    const trimmedUser = username.trim();
    haptic('medium');
    setError('');
    setLoading(true);
    try {
      if (mode === 'signup') {
        const response = await authService.signUp(trimmedUser, pwd);
        setFlowEmail(trimmedUser);
        setOtpCountdown(response.resendAfterSeconds);
        setOtpExpiresIn(response.expiresInSeconds);
        setOtpCode('');
        setFlowMessage(response.message);
        setFlowError('');
        setFlow('REGISTER_OTP');
        haptic('success');
        return;
      }
      await login(trimmedUser, pwd);
      await persistRememberedUser(trimmedUser);
      haptic('success');
    } catch (err) {
      haptic('error');
      if (err instanceof ApiError) setError(err.message || 'Yêu cầu không thành công. Vui lòng thử lại.');
      else setError(mode === 'login' ? 'Đăng nhập thất bại. Kiểm tra lại tên tài khoản hoặc mật khẩu!' : 'Đăng ký không thành công. Tài khoản có thể đã tồn tại.');
    } finally {
      setLoading(false);
    }
  };

  const closeOtpFlow = () => {
    setFlow('AUTH'); setOtpCode(''); setResetToken(''); setNewPassword(''); setConfirmNewPassword('');
    setFlowError(''); setFlowMessage('');
  };

  const resendOtp = async () => {
    if (otpCountdown > 0 || loading) return;
    const purpose: OtpPurpose = flow === 'REGISTER_OTP' ? 'REGISTER' : 'RESET_PASSWORD';
    setLoading(true); setFlowError(''); setFlowMessage('');
    try {
      const result = await authService.resendOtp(flowEmail, purpose);
      setOtpCountdown(result.resendAfterSeconds); setOtpExpiresIn(result.expiresInSeconds); setOtpCode(''); setFlowMessage(result.message);
    } catch (err) { setFlowError(err instanceof ApiError ? err.message : 'Không thể gửi lại mã lúc này.'); }
    finally { setLoading(false); }
  };

  const verifyOtp = async () => {
    if (!/^\d{6}$/.test(otpCode)) { setFlowError('Nhập đủ 6 chữ số.'); return; }
    const purpose: OtpPurpose = flow === 'REGISTER_OTP' ? 'REGISTER' : 'RESET_PASSWORD';
    setLoading(true); setFlowError(''); setFlowMessage('');
    try {
      const response = await authService.verifyOtp(flowEmail, purpose, otpCode);
      if (!response.verified) throw new Error(response.message);
      if (purpose === 'REGISTER') {
        if (!response.login?.token) throw new Error('Máy chủ chưa trả về phiên đăng nhập.');
        await completeLogin(response.login);
        await persistRememberedUser(flowEmail);
        haptic('success');
        return;
      }
      if (!response.resetToken) throw new Error('Máy chủ chưa trả về quyền đặt lại mật khẩu.');
      setResetToken(response.resetToken); setNewPassword(''); setConfirmNewPassword(''); setFlow('NEW_PASSWORD');
      setFlowMessage(response.message);
    } catch (err) {
      haptic('error');
      setFlowError(err instanceof Error ? err.message : 'Không thể xác minh mã.');
    } finally { setLoading(false); }
  };

  const submitNewPassword = async () => {
    if (newPassword.length < 8 || newPassword.length > 72) { setFlowError('Mật khẩu phải có từ 8 đến 72 ký tự.'); return; }
    if (newPassword !== confirmNewPassword) { setFlowError('Mật khẩu xác nhận không khớp.'); return; }
    setLoading(true); setFlowError(''); setFlowMessage('');
    try {
      await authService.resetPassword(flowEmail, resetToken, newPassword);
      setMode('login'); setUsername(flowEmail); setPwd(''); setConfirmPwd('');
      setFlow('AUTH'); setResetToken(''); setOtpCode('');
      setError('');
    } catch (err) { setFlowError(err instanceof ApiError ? err.message : 'Không thể đặt mật khẩu mới.'); }
    finally { setLoading(false); }
  };

  if (flow !== 'AUTH') {
    const otpFlow = flow === 'REGISTER_OTP' || flow === 'RESET_OTP';
    const title = flow === 'NEW_PASSWORD' ? 'Đặt mật khẩu mới' : flow === 'REGISTER_OTP' ? 'Xác minh email' : 'Nhập mã OTP';
    const primaryLabel = flow === 'NEW_PASSWORD' ? 'Lưu mật khẩu mới' : 'Xác minh mã';
    const primaryAction = flow === 'NEW_PASSWORD' ? submitNewPassword : verifyOtp;
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <ScrollView
          contentContainerStyle={[styles.flowContent, { paddingTop: insets.top + 20, paddingBottom: Math.max(insets.bottom, 24) + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable onPress={closeOtpFlow} accessibilityRole="button" style={styles.backButton}>
            <Text style={styles.backText}>‹  Quay lại</Text>
          </Pressable>
          <View style={styles.flowBody}>
            <Text style={styles.flowTitle}>{title}</Text>
            <Text style={styles.flowSubtitle}>
              {otpFlow ? `Nhập mã 6 chữ số gửi đến ${flowEmail}. Mã chỉ dùng một lần.` : 'Mật khẩu mới cần có từ 8 đến 72 ký tự.'}
            </Text>
            {otpFlow ? (
              <>
                <TextInput
                  testID="otp-input"
                  value={otpCode}
                  onChangeText={(value) => setOtpCode(value.replace(/\D/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoComplete="one-time-code"
                  textContentType="oneTimeCode"
                  placeholder="000000"
                  placeholderTextColor={palette.textMuted}
                  style={[styles.plainInput, styles.otpInput]}
                />
                <Text style={[styles.otpExpiry, otpExpiresIn <= 0 && { color: palette.danger }]}>Mã hết hạn sau {otpExpiresIn}s</Text>
                <Pressable disabled={otpCountdown > 0 || loading} onPress={() => void resendOtp()} accessibilityRole="button" style={[styles.resendButton, (otpCountdown > 0 || loading) && styles.dimmed]}>
                  <Text style={styles.resendText}>{otpCountdown > 0 ? `Gửi lại sau ${otpCountdown}s` : 'Gửi lại mã OTP'}</Text>
                </Pressable>
              </>
            ) : (
              <>
                <TextInput value={newPassword} onChangeText={setNewPassword} secureTextEntry autoCapitalize="none" placeholder="Mật khẩu mới" placeholderTextColor={palette.textMuted} style={styles.plainInput} />
                <TextInput value={confirmNewPassword} onChangeText={setConfirmNewPassword} secureTextEntry autoCapitalize="none" placeholder="Xác nhận mật khẩu mới" placeholderTextColor={palette.textMuted} style={styles.plainInput} />
              </>
            )}
            {flowMessage ? <Text accessibilityLiveRegion="polite" style={styles.flowMessage}>{flowMessage}</Text> : null}
            {flowError ? <Text accessibilityLiveRegion="polite" style={styles.flowError}>{flowError}</Text> : null}
            <PrimaryButton label={loading ? 'Đang xử lý...' : primaryLabel} loading={loading} onPress={() => void primaryAction()} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView nativeID="auth-screen" behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16, paddingBottom: Math.max(insets.bottom, 24) + 20 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.logoIconBox}>
            <Ionicons name="barbell" size={28} color="#FFFFFF" />
            <View style={styles.sparkleDot}><Ionicons name="sparkles" size={11} color="#FFFFFF" /></View>
          </View>
          <View style={styles.aiTagPill}>
            <Ionicons name="flash" size={12} color={palette.primary} />
            <Text style={styles.aiTagText}>AI FITNESS & POSTURE ASSISTANT</Text>
          </View>
          <Text style={styles.title}>{mode === 'login' ? 'Chào mừng trở lại' : 'Tạo tài khoản mới'}</Text>
          <Text style={styles.subtitle}>
            {mode === 'login' ? 'Đăng nhập để tiếp tục lộ trình luyện tập & theo dõi tư thế' : 'Đăng ký nhanh với Gmail để bắt đầu tập luyện thông minh'}
          </Text>
        </View>

        <View style={styles.card}>
          {error ? (
            <View style={styles.errorBox} accessibilityLiveRegion="polite">
              <Ionicons name="alert-circle" size={18} color={palette.danger} />
              <Text style={styles.errorText}>{error}</Text>
              <Pressable onPress={() => setError('')} hitSlop={8} accessibilityLabel="Đóng thông báo lỗi">
                <Ionicons name="close" size={16} color={palette.danger} />
              </Pressable>
            </View>
          ) : null}

          <FieldLabel label={mode === 'login' ? 'Tài khoản hoặc Email' : 'Email đăng ký (@gmail.com)'} hint={mode === 'signup' ? 'Bắt buộc Gmail' : undefined} />
          <AuthInput
            testID="login-username"
            icon={mode === 'login' ? 'person-outline' : 'mail-outline'}
            focused={focusedField === 'username'}
            value={username}
            onChangeText={(value) => { setUsername(value); clearError(); }}
            onFocus={() => setFocusedField('username')}
            onBlur={() => setFocusedField(null)}
            placeholder={mode === 'login' ? 'Nhập tên đăng nhập hoặc email' : 'ví dụ: nguyenvana@gmail.com'}
            autoComplete={mode === 'signup' ? 'email' : 'username'}
            textContentType={mode === 'signup' ? 'emailAddress' : 'username'}
            keyboardType={mode === 'signup' ? 'email-address' : 'default'}
            returnKeyType="next"
            onSubmitEditing={() => pwdRef.current?.focus()}
            trailing={username ? (
              <Pressable onPress={() => setUsername('')} hitSlop={8} style={styles.trailingButton} accessibilityLabel="Xoá tài khoản">
                <Ionicons name="close-circle" size={16} color="#64748B" />
              </Pressable>
            ) : null}
          />

          <FieldLabel label="Mật khẩu" hint={mode === 'signup' ? 'Tối thiểu 8 ký tự' : undefined} />
          <AuthInput
            ref={pwdRef}
            testID="login-password"
            icon="lock-closed-outline"
            focused={focusedField === 'pwd'}
            value={pwd}
            onChangeText={(value) => { setPwd(value); clearError(); }}
            onFocus={() => setFocusedField('pwd')}
            onBlur={() => setFocusedField(null)}
            placeholder="Nhập mật khẩu của bạn"
            secureTextEntry={!showPwd}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            textContentType={mode === 'signup' ? 'newPassword' : 'password'}
            returnKeyType={mode === 'signup' ? 'next' : 'go'}
            onSubmitEditing={() => (mode === 'signup' ? confirmRef.current?.focus() : void submit())}
            trailing={<EyeToggle visible={showPwd} onToggle={() => { haptic('light'); setShowPwd((v) => !v); }} />}
          />

          {mode === 'signup' ? (
            <>
              <FieldLabel
                label="Xác nhận mật khẩu"
                badge={confirmPwd && pwd === confirmPwd ? 'Trùng khớp' : undefined}
              />
              <AuthInput
                ref={confirmRef}
                testID="login-confirm-password"
                icon="shield-checkmark-outline"
                focused={focusedField === 'confirmPwd'}
                value={confirmPwd}
                onChangeText={(value) => { setConfirmPwd(value); clearError(); }}
                onFocus={() => setFocusedField('confirmPwd')}
                onBlur={() => setFocusedField(null)}
                placeholder="Nhập lại mật khẩu để xác nhận"
                secureTextEntry={!showConfirmPwd}
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="go"
                onSubmitEditing={() => void submit()}
                trailing={<EyeToggle visible={showConfirmPwd} onToggle={() => { haptic('light'); setShowConfirmPwd((v) => !v); }} />}
              />
            </>
          ) : (
            <View style={styles.auxRow}>
              <Pressable
                onPress={() => { haptic('light'); setRememberMe((v) => !v); }}
                style={styles.rememberMe}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: rememberMe }}
              >
                <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                  {rememberMe ? <Ionicons name="checkmark" size={13} color="#FFFFFF" /> : null}
                </View>
                <Text style={styles.rememberMeText}>Ghi nhớ tôi</Text>
              </Pressable>
              <Pressable
                onPress={() => { haptic('light'); router.push({ pathname: '/forgot-password', params: username.trim() ? { email: username.trim() } : {} }); }}
                hitSlop={6}
              >
                <Text style={styles.linkText}>Quên mật khẩu?</Text>
              </Pressable>
            </View>
          )}

          <PrimaryButton
            label={loading ? (mode === 'login' ? 'Đang xác thực...' : 'Đang khởi tạo tài khoản...') : (mode === 'login' ? 'Đăng nhập' : 'Đăng ký')}
            accessibilityLabel={mode === 'login' ? 'Đăng nhập' : 'Đăng ký'}
            loading={loading}
            onPress={() => void submit()}
          />

          <Pressable onPress={switchMode} style={styles.switchModeBtn} accessibilityRole="button">
            <Text style={styles.switchModePrompt}>
              {mode === 'login' ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}
              <Text style={styles.linkStrong}>{mode === 'login' ? 'Đăng ký ngay' : 'Đăng nhập ngay'}</Text>
            </Text>
          </Pressable>
        </View>

        <Text style={styles.footerNote}>Health Assistant • Trợ lý sức khỏe & luyện tập thông minh</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

type IconName = React.ComponentProps<typeof Ionicons>['name'];

type AuthInputProps = TextInputProps & { icon: IconName; focused: boolean; trailing?: React.ReactNode };

/**
 * Ô nhập có icon. Lưu ý quan trọng cho iOS:
 * - Khung ngoài KHÔNG đổi cấu trúc / thuộc tính shadow khi focus (chỉ đổi màu viền), tránh việc
 *   view bị dựng lại làm TextInput mất focus ngay và bàn phím không mở.
 * - Khung ngoài là View thường (không bọc Pressable) để không tranh sự kiện chạm với TextInput.
 */
const AuthInput = forwardRef<TextInputRef, AuthInputProps>(function AuthInput({ icon, focused, trailing, style, ...inputProps }, ref) {
  return (
    <View style={[styles.inputWrapper, { borderColor: focused ? palette.primary : palette.border }]}>
      <Ionicons name={icon} size={19} color={focused ? palette.primary : palette.textMuted} style={styles.inputIcon} />
      <TextInput
        ref={ref}
        placeholderTextColor="#64748B"
        autoCapitalize="none"
        autoCorrect={false}
        style={[styles.textInput, style]}
        {...inputProps}
      />
      {trailing}
    </View>
  );
});

function EyeToggle({ visible, onToggle }: { visible: boolean; onToggle: () => void }) {
  return (
    <Pressable onPress={onToggle} hitSlop={8} style={styles.trailingButton} accessibilityLabel={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
      <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color={visible ? palette.primary : '#64748B'} />
    </Pressable>
  );
}

function FieldLabel({ label, hint, badge }: { label: string; hint?: string; badge?: string }) {
  return (
    <View style={styles.fieldLabelRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
      {badge ? (
        <View style={styles.matchBadge}>
          <Ionicons name="checkmark-circle" size={12} color={palette.success} />
          <Text style={styles.matchBadgeText}>{badge}</Text>
        </View>
      ) : null}
    </View>
  );
}

function PrimaryButton({ label, loading, onPress, accessibilityLabel }: { label: string; loading: boolean; onPress: () => void; accessibilityLabel?: string }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: loading, busy: loading }}
      style={({ pressed }) => [styles.primaryButton, (loading || pressed) && styles.primaryButtonDim]}
    >
      {loading ? <ActivityIndicator color="#FFFFFF" /> : null}
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg },
  scrollContent: { flexGrow: 1, paddingHorizontal: 20, alignItems: 'center' },

  header: { alignItems: 'center', marginBottom: 24, paddingHorizontal: 12 },
  logoIconBox: { width: 58, height: 58, borderRadius: 18, marginBottom: 16, backgroundColor: palette.primary, alignItems: 'center', justifyContent: 'center' },
  sparkleDot: { position: 'absolute', top: -4, right: -4, width: 20, height: 20, borderRadius: 10, backgroundColor: palette.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: palette.bg },
  aiTagPill: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: palette.primarySoft, borderWidth: 1, borderColor: '#DFDDFF' },
  aiTagText: { color: palette.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1.1 },
  title: { color: palette.text, fontSize: 27, fontWeight: '800', textAlign: 'center', marginBottom: 6 },
  subtitle: { color: palette.textMuted, fontSize: 13.5, textAlign: 'center', lineHeight: 20, maxWidth: 320 },

  card: { width: '100%', maxWidth: 400, padding: 22, borderRadius: 24, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: palette.border },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: '#FFF0F3', borderWidth: 1, borderColor: '#FFD6DF' },
  errorText: { flex: 1, color: '#C94363', fontSize: 12.5, lineHeight: 18, fontWeight: '500' },

  fieldLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 },
  fieldLabel: { color: palette.text, fontSize: 13, fontWeight: '700' },
  fieldHint: { color: palette.accent, fontSize: 11, fontWeight: '600' },
  matchBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  matchBadgeText: { color: palette.success, fontSize: 11, fontWeight: '600' },

  inputWrapper: { flexDirection: 'row', alignItems: 'center', minHeight: 52, marginBottom: 16, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1.5, backgroundColor: '#FFFFFF' },
  inputIcon: { marginRight: 10 },
  textInput: { flex: 1, minHeight: 48, paddingVertical: 12, color: palette.text, fontSize: 15 },
  trailingButton: { padding: 6 },

  auxRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: -4, marginBottom: 16 },
  rememberMe: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 32 },
  checkbox: { width: 18, height: 18, borderRadius: 5, borderWidth: 1.5, borderColor: '#B7BBD0', alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: palette.primary, borderColor: palette.primary },
  rememberMeText: { color: palette.textMuted, fontSize: 13 },
  linkText: { color: palette.accent, fontSize: 13, fontWeight: '600' },
  linkStrong: { color: palette.accent, fontWeight: '800' },

  primaryButton: { minHeight: 52, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: palette.primary },
  primaryButtonDim: { opacity: 0.7 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15.5, fontWeight: '800' },

  switchModeBtn: { alignItems: 'center', marginTop: 18, paddingVertical: 6 },
  switchModePrompt: { color: palette.textMuted, fontSize: 13.5 },
  footerNote: { marginTop: 16, color: palette.textMuted, fontSize: 11, textAlign: 'center' },

  flowContent: { flexGrow: 1, paddingHorizontal: 22 },
  backButton: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  backText: { color: palette.primary, fontSize: 16 },
  flowBody: { marginTop: 32, gap: 12 },
  flowTitle: { color: palette.text, fontSize: 25, fontWeight: '800' },
  flowSubtitle: { color: palette.textMuted, lineHeight: 21 },
  plainInput: { minHeight: 50, paddingHorizontal: 14, borderWidth: 1, borderColor: palette.border, borderRadius: 10, backgroundColor: '#FFFFFF', color: palette.text, fontSize: 15 },
  otpInput: { minHeight: 58, fontSize: 25, letterSpacing: 5, textAlign: 'center' },
  otpExpiry: { color: palette.textMuted, fontSize: 13 },
  resendButton: { minHeight: 38, justifyContent: 'center' },
  resendText: { color: palette.primary, fontWeight: '700' },
  dimmed: { opacity: 0.55 },
  flowMessage: { color: palette.success, lineHeight: 20 },
  flowError: { color: palette.danger, lineHeight: 20 },
});