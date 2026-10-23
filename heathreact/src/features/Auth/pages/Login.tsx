import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ApiError } from '@/api/client';
import { authService } from '@/api/services/auth.service';
import { palette } from '@/theme/tokens';
import { useUserStore } from '@/stores/user';
import { appStorage } from '@/utils/storage';

const SAVED_USER_KEY = 'saved_username';
const REMEMBER_ME_KEY = 'saved_remember_me';

export default function LoginPage() {
  const insets = useSafeAreaInsets();
  const login = useUserStore((state) => state.login);
  const completeLogin = useUserStore((state) => state.completeLogin);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void appStorage.getItem(REMEMBER_ME_KEY).then(async (savedRememberMe) => {
      const shouldRemember = savedRememberMe !== 'false';
      setRememberMe(shouldRemember);
      if (shouldRemember) setUsername((await appStorage.getItem(SAVED_USER_KEY)) ?? '');
    }).catch(() => {});
  }, []);

  const vibrate = (kind: 'light' | 'success' | 'error') => {
    const action = kind === 'light' ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      : kind === 'success' ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    void action.catch(() => {});
  };

  const switchMode = () => {
    vibrate('light');
    setMode((current) => current === 'login' ? 'signup' : 'login');
    setConfirmPassword('');
    setError('');
  };

  const submit = async () => {
    const trimmedUsername = username.trim();
    if (!trimmedUsername || !password) {
      setError('Nhập tài khoản và mật khẩu để tiếp tục.');
      vibrate('error');
      return;
    }
    if (mode === 'signup') {
      if (!/^[^\s@]+@gmail\.com$/i.test(trimmedUsername)) {
        setError('Đăng ký cần sử dụng địa chỉ email Gmail hợp lệ.');
        vibrate('error');
        return;
      }
      if (password.length < 8) {
        setError('Mật khẩu cần có ít nhất 8 ký tự.');
        vibrate('error');
        return;
      }
      if (password !== confirmPassword) {
        setError('Mật khẩu xác nhận không khớp.');
        vibrate('error');
        return;
      }
    }

    setError('');
    setLoading(true);
    try {
      if (mode === 'login') await login(trimmedUsername, password);
      else await completeLogin(await authService.signUp(trimmedUsername, password));
      if (rememberMe) {
        await appStorage.setItem(REMEMBER_ME_KEY, 'true');
        await appStorage.setItem(SAVED_USER_KEY, trimmedUsername);
      } else {
        await appStorage.setItem(REMEMBER_ME_KEY, 'false');
        await appStorage.removeItem(SAVED_USER_KEY);
      }
      vibrate('success');
      router.replace(useUserStore.getState().role === 'ROLE_ADMIN' ? '/admin/knowledge' : '/(user)');
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : mode === 'login' ? 'Đăng nhập không thành công. Kiểm tra lại thông tin.' : 'Không thể tạo tài khoản.');
      vibrate('error');
    } finally {
      setLoading(false);
    }
  };

  return <View style={styles.screen}>
    <StatusBar barStyle="dark-content" backgroundColor={palette.bg} />
    <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 28, paddingBottom: Math.max(insets.bottom, 24) + 28 }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}>
        <View style={styles.brandIcon}><Ionicons name="barbell" size={27} color="#FFFFFF" /></View>
        <Text style={styles.title}>{mode === 'login' ? 'Chào mừng trở lại' : 'Tạo tài khoản mới'}</Text>
        <Text style={styles.subtitle}>{mode === 'login' ? 'Đăng nhập để tiếp tục hành trình luyện tập.' : 'Tạo tài khoản để bắt đầu hành trình luyện tập.'}</Text>
        <View style={styles.card}>
          {error ? <View style={styles.errorBox}><Ionicons name="alert-circle-outline" size={19} color={palette.danger} /><Text style={styles.errorText}>{error}</Text></View> : null}
          <Field label={mode === 'login' ? 'Tài khoản hoặc email' : 'Email Gmail'} icon={mode === 'login' ? 'person-outline' : 'mail-outline'} value={username} onChangeText={(value) => { setUsername(value); setError(''); }} placeholder={mode === 'login' ? 'Nhập tên đăng nhập hoặc email' : 'example@gmail.com'} keyboardType={mode === 'signup' ? 'email-address' : 'default'} autoComplete={mode === 'signup' ? 'email' : 'username'} />
          <Field label="Mật khẩu" icon="lock-closed-outline" value={password} onChangeText={(value) => { setPassword(value); setError(''); }} placeholder="Nhập mật khẩu" secureTextEntry={!showPassword} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} onTogglePassword={() => setShowPassword((value) => !value)} passwordVisible={showPassword} />
          {mode === 'signup' ? <Field label="Xác nhận mật khẩu" icon="shield-checkmark-outline" value={confirmPassword} onChangeText={(value) => { setConfirmPassword(value); setError(''); }} placeholder="Nhập lại mật khẩu" secureTextEntry={!showConfirmPassword} autoComplete="new-password" onTogglePassword={() => setShowConfirmPassword((value) => !value)} passwordVisible={showConfirmPassword} /> : null}
          {mode === 'login' ? <View style={styles.optionsRow}>
            <Pressable onPress={() => setRememberMe((value) => !value)} style={styles.rememberButton} accessibilityRole="checkbox" accessibilityState={{ checked: rememberMe }}><View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>{rememberMe ? <Ionicons name="checkmark" size={13} color="#FFFFFF" /> : null}</View><Text style={styles.rememberText}>Ghi nhớ tôi</Text></Pressable>
            <Pressable onPress={() => Alert.alert('Quên mật khẩu', 'Vui lòng liên hệ quản trị viên để được hỗ trợ khôi phục tài khoản.')}><Text style={styles.forgotText}>Quên mật khẩu?</Text></Pressable>
          </View> : null}
          <TouchableOpacity
            testID="login-submit-button"
            onPress={() => void submit()}
            disabled={loading}
            activeOpacity={0.82}
            style={{
              width: '100%',
              height: 50,
              marginTop: 4,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 14,
              backgroundColor: '#2563EB',
              opacity: loading ? 0.65 : 1,
            }}
            accessibilityRole="button"
            accessibilityLabel={mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800', lineHeight: 20, textAlign: 'center' }}>
              Đăng nhập
            </Text>
          </TouchableOpacity>
          <Pressable onPress={switchMode} style={styles.switchButton} accessibilityRole="button"><Text style={styles.switchText}>{mode === 'login' ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}<Text style={styles.switchLink}>{mode === 'login' ? 'Đăng ký ngay' : 'Đăng nhập ngay'}</Text></Text></Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </View>;
}

function Field({ label, icon, value, onChangeText, placeholder, secureTextEntry, onTogglePassword, passwordVisible, ...inputProps }: React.ComponentProps<typeof TextInput> & { label: string; icon: keyof typeof Ionicons.glyphMap; onTogglePassword?: () => void; passwordVisible?: boolean }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><View style={styles.inputShell}><Ionicons name={icon} size={20} color={palette.textMuted} style={styles.inputIcon} /><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#8C93AA" secureTextEntry={secureTextEntry} autoCapitalize="none" autoCorrect={false} style={styles.input} {...inputProps} />{onTogglePassword ? <Pressable onPress={onTogglePassword} hitSlop={10} accessibilityRole="button" accessibilityLabel={passwordVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}><Ionicons name={passwordVisible ? 'eye-off-outline' : 'eye-outline'} size={21} color={palette.textMuted} /></Pressable> : null}</View></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg }, keyboard: { flex: 1 }, content: { flexGrow: 1, width: '100%', maxWidth: 480, alignSelf: 'center', paddingHorizontal: 20 },
  brandIcon: { width: 60, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', backgroundColor: palette.primary, marginBottom: 18 },
  title: { color: palette.text, fontSize: 29, lineHeight: 36, fontWeight: '800', textAlign: 'center' }, subtitle: { color: palette.textMuted, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 7, marginBottom: 24 },
  card: { backgroundColor: palette.surface, borderRadius: 18, padding: 20, borderWidth: 1, borderColor: palette.border }, errorBox: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', borderRadius: 10, borderWidth: 1, borderColor: '#FFD5DD', backgroundColor: palette.dangerLight, padding: 10, marginBottom: 16 }, errorText: { flex: 1, color: palette.danger, fontSize: 12, lineHeight: 18 },
  field: { marginBottom: 15 }, label: { color: palette.text, fontSize: 13, fontWeight: '700', marginBottom: 7 }, inputShell: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: palette.border, borderRadius: 13, backgroundColor: '#FFFFFF' }, inputIcon: { flexShrink: 0 }, input: { flex: 1, minWidth: 0, color: palette.text, fontSize: 15, paddingVertical: 12 },
  optionsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: -2, marginBottom: 18 }, rememberButton: { flexDirection: 'row', alignItems: 'center', gap: 8 }, checkbox: { width: 19, height: 19, borderWidth: 1, borderColor: palette.border, borderRadius: 5, alignItems: 'center', justifyContent: 'center' }, checkboxChecked: { backgroundColor: palette.primary, borderColor: palette.primary }, rememberText: { color: palette.textMuted, fontSize: 13 }, forgotText: { color: palette.accent, fontSize: 13, fontWeight: '700' },
  switchButton: { alignItems: 'center', paddingVertical: 15 }, switchText: { color: palette.textMuted, fontSize: 13 }, switchLink: { color: palette.accent, fontWeight: '800' },
});
