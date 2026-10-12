import { navigationService } from '@/routes';
import { useUserStore } from '@/stores/user';
import { ApiError } from '@/api/client';
import { authService } from '@/api/services/auth.service';
import { palette } from '@/theme/tokens';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { appStorage } from '@/utils/storage';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
const SAVED_PWD_KEY = 'saved_password';
const REMEMBER_ME_KEY = 'saved_remember_me';

export default function LoginPage() {
  const insets = useSafeAreaInsets();
  const login = useUserStore((state) => state.login);

  const [username, setUsername] = useState('');
  const [pwd, setPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  // Nạp tài khoản đã lưu nếu người dùng đã bật 'Ghi nhớ tôi'
  useEffect(() => {
    async function loadSavedCredentials() {
      try {
        const rem = await appStorage.getItem(REMEMBER_ME_KEY);
        if (rem === 'true' || rem === null) {
          const savedU = await appStorage.getItem(SAVED_USER_KEY);
          const savedP = await appStorage.getItem(SAVED_PWD_KEY);
          if (savedU) setUsername(savedU);
          if (savedP) setPwd(savedP);
          setRememberMe(true);
        } else if (rem === 'false') {
          setRememberMe(false);
        }
      } catch {
        // Fallback an toàn
      }
    }
    void loadSavedCredentials();
  }, []);

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
  };

  const handleDemoFill = () => {
    triggerHaptic('medium');
    setUsername('demo@gmail.com');
    setPwd('123456');
    if (mode === 'signup') {
      setConfirmPwd('123456');
    }
    setError('');
  };

  const handleForgotPassword = () => {
    triggerHaptic('light');
    Alert.alert(
      'Khôi phục mật khẩu',
      'Nếu bạn quên mật khẩu hoặc tài khoản chưa kích hoạt, vui lòng liên hệ quản trị viên hoặc sử dụng email Gmail đã đăng ký để được cấp lại mật khẩu.',
      [{ text: 'Đã hiểu', style: 'default' }]
    );
  };

  const handleLogin = async () => {
    triggerHaptic('medium');
    const trimmedUser = username.trim();
    const trimmedPwd = pwd.trim();

    if (!trimmedUser || !trimmedPwd) {
      triggerHaptic('error');
      setError('Vui lòng điền đầy đủ tài khoản và mật khẩu!');
      return;
    }

    if (mode === 'signup') {
      if (!/^[^\s@]+@gmail\.com$/i.test(trimmedUser)) {
        triggerHaptic('error');
        setError('Vui lòng sử dụng địa chỉ email @gmail.com hợp lệ.');
        return;
      }
      if (trimmedPwd.length < 6) {
        triggerHaptic('error');
        setError('Mật khẩu cần tối thiểu 6 ký tự để đảm bảo an toàn.');
        return;
      }
      if (trimmedPwd !== confirmPwd.trim()) {
        triggerHaptic('error');
        setError('Mật khẩu xác nhận không trùng khớp!');
        return;
      }
    }

    setError('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        await authService.signUp(trimmedUser, trimmedPwd);
      }
      await login(trimmedUser, trimmedPwd);

      // Lưu hoặc xóa thông tin đăng nhập theo lựa chọn 'Ghi nhớ tôi'
      try {
        if (rememberMe) {
          await appStorage.setItem(REMEMBER_ME_KEY, 'true');
          await appStorage.setItem(SAVED_USER_KEY, trimmedUser);
          await appStorage.setItem(SAVED_PWD_KEY, trimmedPwd);
        } else {
          await appStorage.setItem(REMEMBER_ME_KEY, 'false');
          await appStorage.removeItem(SAVED_USER_KEY);
          await appStorage.removeItem(SAVED_PWD_KEY);
        }
      } catch (e) {
        console.warn('Lỗi lưu credentials:', e);
      }

      triggerHaptic('success');
      navigationService.replace('Home');
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

  const isFieldActive = (field: string) => focusedField === field;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#080C11" translucent />

      {/* Ambient Cyber / Fitness Glow Orbs */}
      <View style={styles.glowTopRight} />
      <View style={styles.glowBottomLeft} />
      <View style={styles.glowCenter} />

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
              <View style={styles.logoGlowBackdrop} />
              <View style={styles.logoIconBox}>
                <Ionicons name="barbell" size={28} color={palette.primary} />
                <View style={styles.sparkleDot}>
                  <Ionicons name="sparkles" size={11} color="#080C11" />
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
                <TextInput
                  placeholder={
                    mode === 'login'
                      ? 'Nhập tên đăng nhập hoặc email'
                      : 'ví dụ: nguyenvana@gmail.com'
                  }
                  placeholderTextColor="#64748B"
                  value={username}
                  onChangeText={(val) => {
                    setUsername(val);
                    if (error) setError('');
                  }}
                  onFocus={() => setFocusedField('usr')}
                  onBlur={() => setFocusedField(null)}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType={mode === 'signup' ? 'email-address' : 'default'}
                  style={styles.textInput}
                />
                {Boolean(username) && (
                  <Pressable
                    onPress={() => setUsername('')}
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
                  <Text style={styles.fieldHintBadge}>Tối thiểu 6 ký tự</Text>
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
                <TextInput
                  placeholder="Nhập mật khẩu của bạn"
                  placeholderTextColor="#64748B"
                  value={pwd}
                  onChangeText={(val) => {
                    setPwd(val);
                    if (error) setError('');
                  }}
                  onFocus={() => setFocusedField('pwd')}
                  onBlur={() => setFocusedField(null)}
                  secureTextEntry={!showPwd}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.textInput}
                />
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
                  <TextInput
                    placeholder="Nhập lại mật khẩu để xác nhận"
                    placeholderTextColor="#64748B"
                    value={confirmPwd}
                    onChangeText={(val) => {
                      setConfirmPwd(val);
                      if (error) setError('');
                    }}
                    onFocus={() => setFocusedField('confirmPwd')}
                    onBlur={() => setFocusedField(null)}
                    secureTextEntry={!showConfirmPwd}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.textInput}
                  />
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
                      <Ionicons name="checkmark" size={13} color="#080C11" />
                    )}
                  </View>
                  <Text style={styles.rememberMeText}>Ghi nhớ tôi</Text>
                </Pressable>

                <Pressable onPress={handleForgotPassword} hitSlop={6}>
                  <Text style={styles.forgotPwdText}>Quên mật khẩu?</Text>
                </Pressable>
              </View>
            )}

            {/* Quick Demo Fill Pill */}
            <Pressable
              onPress={handleDemoFill}
              style={({ pressed }) => [
                styles.demoChip,
                pressed && styles.demoChipPressed,
              ]}
              accessibilityRole="button"
            >
              <Ionicons name="flash-outline" size={14} color={palette.accent} />
              <Text style={styles.demoChipText}>
                Điền nhanh tài khoản Demo (demo@gmail.com)
              </Text>
            </Pressable>

            {/* Submit Action Button */}
            <Pressable
              onPress={handleLogin}
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
                  <ActivityIndicator size="small" color="#080C11" />
                  <Text style={styles.submitBtnText}>
                    {mode === 'login' ? 'Đang xác thực...' : 'Đang khởi tạo tài khoản...'}
                  </Text>
                </View>
              ) : (
                <View style={styles.submitBtnContent}>
                  <Text style={styles.submitBtnText}>
                    {mode === 'login' ? 'Đăng nhập ngay' : 'Đăng ký tài khoản'}
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color="#080C11" />
                </View>
              )}
            </Pressable>

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

          {/* Trust & Feature Badges */}
          <View style={styles.featuresRow}>
            <View style={styles.featurePill}>
              <Ionicons name="shield-checkmark" size={13} color={palette.primary} />
              <Text style={styles.featurePillText}>JWT An toàn</Text>
            </View>
            <View style={styles.featurePill}>
              <Ionicons name="scan" size={13} color={palette.accent} />
              <Text style={styles.featurePillText}>AI Pose Scan</Text>
            </View>
            <View style={styles.featurePill}>
              <Ionicons name="fitness" size={13} color="#F59E0B" />
              <Text style={styles.featurePillText}>Lộ trình cá nhân</Text>
            </View>
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
    backgroundColor: '#080C11',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },

  /* Glow Orbs Background Effects */
  glowTopRight: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: '#22C55E',
    opacity: 0.12,
  },
  glowBottomLeft: {
    position: 'absolute',
    bottom: 40,
    left: -80,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#38BDF8',
    opacity: 0.08,
  },
  glowCenter: {
    position: 'absolute',
    top: '35%',
    left: '20%',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: '#1E293B',
    opacity: 0.25,
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
  logoGlowBackdrop: {
    position: 'absolute',
    width: 74,
    height: 74,
    borderRadius: 22,
    backgroundColor: '#22C55E',
    opacity: 0.22,
  },
  logoIconBox: {
    width: 66,
    height: 66,
    borderRadius: 20,
    backgroundColor: '#0E1724',
    borderWidth: 1.5,
    borderColor: '#22C55E55',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
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
    borderColor: '#080C11',
  },
  aiTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22C55E14',
    borderWidth: 1,
    borderColor: '#22C55E33',
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
    color: '#F8FAFC',
    fontSize: 27,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 13.5,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
  },

  /* Segmented Mode Switcher */
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#0E1622',
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: '#1E293B',
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
    backgroundColor: '#192636',
    borderWidth: 1,
    borderColor: '#22C55E44',
  },
  segmentText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: '#F8FAFC',
    fontWeight: '800',
  },

  /* Card */
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#0F1723',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: '#1E293B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 6,
  },

  /* Error Banner */
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF444415',
    borderWidth: 1,
    borderColor: '#EF444440',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    flex: 1,
    color: '#FCA5A5',
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
    color: '#CBD5E1',
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
    backgroundColor: '#090E17',
    borderWidth: 1.5,
    borderColor: '#1E293B',
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 52,
  },
  inputWrapperFocused: {
    borderColor: palette.primary,
    backgroundColor: '#0D1522',
    shadowColor: palette.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  inputPrefixIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    color: '#F8FAFC',
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
    borderColor: '#475569',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  checkboxActive: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  rememberMeText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  forgotPwdText: {
    color: palette.accent,
    fontSize: 13,
    fontWeight: '600',
  },

  /* Demo Chip */
  demoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#38BDF810',
    borderWidth: 1,
    borderColor: '#38BDF830',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    gap: 6,
  },
  demoChipPressed: {
    opacity: 0.7,
  },
  demoChipText: {
    color: palette.accent,
    fontSize: 12,
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
    color: '#080C11',
    fontSize: 16,
    fontWeight: '800',
  },

  /* Switch Mode Footer */
  switchModeBtn: {
    alignItems: 'center',
    marginTop: 18,
    paddingVertical: 6,
  },
  switchModePrompt: {
    color: '#94A3B8',
    fontSize: 13.5,
  },
  switchModeAction: {
    color: palette.accent,
    fontWeight: '800',
  },

  /* Feature Badges */
  featuresRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0E1622',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 5,
  },
  featurePillText: {
    color: '#94A3B8',
    fontSize: 11.5,
    fontWeight: '600',
  },

  /* Footer Note */
  footerNote: {
    color: '#475569',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },
});
