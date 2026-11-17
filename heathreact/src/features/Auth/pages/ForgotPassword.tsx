import { ApiError } from '@/api/client';
import { authService } from '@/api/services/auth.service';
import { palette } from '@/theme/tokens';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ResetStep = 'email' | 'otp' | 'password' | 'complete';

const GMAIL_PATTERN = /^[^\s@]+@gmail\.com$/i;

export default function ForgotPasswordPage() {
  const insets = useSafeAreaInsets();
  const { email: routeEmail } = useLocalSearchParams<{ email?: string }>();
  const [step, setStep] = useState<ResetStep>('email');
  const [email, setEmail] = useState(routeEmail ?? '');
  const [otpCode, setOtpCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [resendAfter, setResendAfter] = useState(0);
  const [expiresIn, setExpiresIn] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (step !== 'otp') return;
    const timer = setInterval(() => {
      setResendAfter((current) => Math.max(0, current - 1));
      setExpiresIn((current) => Math.max(0, current - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [step]);

  const getErrorMessage = (err: unknown, fallback: string) =>
    err instanceof ApiError ? err.message : fallback;

  const requestOtp = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!GMAIL_PATTERN.test(normalizedEmail)) {
      setError('Nhập địa chỉ Gmail hợp lệ.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');
    try {
      const result = await authService.sendPasswordResetOtp(normalizedEmail);
      setEmail(normalizedEmail);
      setOtpCode('');
      setResendAfter(result.resendAfterSeconds);
      setExpiresIn(result.expiresInSeconds);
      setMessage(result.message);
      setStep('otp');
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể gửi mã xác minh lúc này.'));
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    if (resendAfter > 0 || loading) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const result = await authService.resendOtp(email, 'RESET_PASSWORD');
      setOtpCode('');
      setResendAfter(result.resendAfterSeconds);
      setExpiresIn(result.expiresInSeconds);
      setMessage(result.message);
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể gửi lại mã lúc này.'));
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!/^\d{6}$/.test(otpCode)) {
      setError('Nhập đủ mã OTP gồm 6 chữ số.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');
    try {
      const response = await authService.verifyOtp(email, 'RESET_PASSWORD', otpCode);
      if (!response.verified || !response.resetToken) {
        throw new Error(response.message || 'Mã OTP không hợp lệ.');
      }
      setResetToken(response.resetToken);
      setPassword('');
      setConfirmPassword('');
      setMessage(response.message);
      setStep('password');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể xác minh mã OTP.');
    } finally {
      setLoading(false);
    }
  };

  const savePassword = async () => {
    if (password.length < 8 || password.length > 72) {
      setError('Mật khẩu phải có từ 8 đến 72 ký tự.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không trùng khớp.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');
    try {
      await authService.resetPassword(email, resetToken, password);
      setStep('complete');
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể đặt lại mật khẩu lúc này.'));
    } finally {
      setLoading(false);
    }
  };

  const title = step === 'email'
    ? 'Khôi phục mật khẩu'
    : step === 'otp'
      ? 'Xác minh OTP'
      : step === 'password'
        ? 'Đặt mật khẩu mới'
        : 'Đặt lại thành công';

  const subtitle = step === 'email'
    ? 'Nhập Gmail đã đăng ký để nhận mã xác minh.'
    : step === 'otp'
      ? `Mã gồm 6 chữ số đã được gửi đến ${email}.`
      : step === 'password'
        ? 'Tạo mật khẩu mới có ít nhất 8 ký tự.'
        : 'Bạn có thể đăng nhập bằng mật khẩu mới.';

  const primaryAction = step === 'email' ? requestOtp : step === 'otp' ? verifyOtp : savePassword;
  const primaryLabel = step === 'email' ? 'Gửi mã xác minh' : step === 'otp' ? 'Xác minh mã' : 'Lưu mật khẩu mới';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}
    >
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 16, paddingBottom: Math.max(insets.bottom, 24) + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.back()} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Quay lại đăng nhập">
          <Ionicons name="arrow-back" size={20} color={palette.primary} />
          <Text style={styles.backText}>Quay lại</Text>
        </Pressable>

        <View style={styles.card}>
          <View style={styles.iconBox}>
            <Ionicons name={step === 'complete' ? 'checkmark-circle' : 'key-outline'} size={30} color={palette.primary} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          {step === 'email' ? (
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              keyboardType="email-address"
              placeholder="email@gmail.com"
              placeholderTextColor={palette.textMuted}
              style={styles.input}
            />
          ) : null}

          {step === 'otp' ? (
            <>
              <TextInput
                value={otpCode}
                onChangeText={(value) => setOtpCode(value.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                placeholder="000000"
                placeholderTextColor={palette.textMuted}
                style={styles.otpInput}
              />
              <Text style={[styles.timerText, expiresIn === 0 && styles.timerExpired]}>
                Mã hết hạn sau {expiresIn}s
              </Text>
              <Pressable onPress={() => void resendOtp()} disabled={resendAfter > 0 || loading} style={styles.resendButton} accessibilityRole="button">
                <Text style={[styles.resendText, (resendAfter > 0 || loading) && styles.resendTextDisabled]}>
                  {resendAfter > 0 ? `Gửi lại sau ${resendAfter}s` : 'Gửi lại mã OTP'}
                </Text>
              </Pressable>
            </>
          ) : null}

          {step === 'password' ? (
            <>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="new-password"
                placeholder="Mật khẩu mới"
                placeholderTextColor={palette.textMuted}
                style={styles.input}
              />
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="new-password"
                placeholder="Xác nhận mật khẩu mới"
                placeholderTextColor={palette.textMuted}
                style={styles.input}
              />
            </>
          ) : null}

          {message ? <Text style={styles.message}>{message}</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}

          {step === 'complete' ? (
            <Pressable onPress={() => router.replace('/login')} style={styles.primaryButton} accessibilityRole="button">
              <Text style={styles.primaryButtonText}>Về trang đăng nhập</Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => void primaryAction()} disabled={loading} style={[styles.primaryButton, loading && styles.primaryButtonDisabled]} accessibilityRole="button">
              {loading ? <ActivityIndicator color="#FFFFFF" /> : null}
              <Text style={styles.primaryButtonText}>{loading ? 'Đang xử lý...' : primaryLabel}</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  content: { flexGrow: 1, paddingHorizontal: 20 },
  backButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 8 },
  backText: { color: palette.primary, fontSize: 16, fontWeight: '700' },
  card: { width: '100%', maxWidth: 420, alignSelf: 'center', marginTop: 30, padding: 24, borderRadius: 20, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border },
  iconBox: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', backgroundColor: palette.primarySoft, marginBottom: 18 },
  title: { color: palette.text, fontSize: 25, fontWeight: '800', textAlign: 'center' },
  subtitle: { color: palette.textMuted, fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: 10, marginBottom: 24 },
  input: { minHeight: 52, marginBottom: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: palette.border, borderRadius: 12, backgroundColor: palette.surface, color: palette.text, fontSize: 16 },
  otpInput: { minHeight: 58, paddingHorizontal: 14, borderWidth: 1, borderColor: palette.border, borderRadius: 12, backgroundColor: palette.surface, color: palette.text, fontSize: 25, letterSpacing: 6, textAlign: 'center' },
  timerText: { marginTop: 10, color: palette.textMuted, fontSize: 13, textAlign: 'center' },
  timerExpired: { color: palette.danger },
  resendButton: { minHeight: 42, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  resendText: { color: palette.primary, fontSize: 14, fontWeight: '700' },
  resendTextDisabled: { color: palette.textMuted },
  message: { color: palette.success, lineHeight: 20, marginTop: 12, textAlign: 'center' },
  error: { color: palette.danger, lineHeight: 20, marginTop: 12, textAlign: 'center' },
  primaryButton: { minHeight: 52, marginTop: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, backgroundColor: palette.primary, paddingHorizontal: 16 },
  primaryButtonDisabled: { opacity: 0.55 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});
