import { navigationService } from '@/routes';
import { useUserStore } from '@/stores/user';
import { ApiError } from '@/api/client';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function LoginPage() {
  const insets = useSafeAreaInsets();
  const login = useUserStore((state) => state.login);
  const [username, setUsername] = useState('');
  const [pwd, setPwd] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!username.trim() || !pwd.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ tài khoản và mật khẩu!');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(username.trim(), pwd);
      navigationService.replace('Home');
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        Alert.alert('Đăng nhập thất bại', 'Vui lòng kiểm tra lại thông tin!');
      }
    } finally {
      setLoading(false);
    }
  };

  const getBorder = (field: string) => focusedField === field ? '#38BDF8' : '#2A3542';
  const getBg = (field: string) => focusedField === field ? '#1B242E' : '#131A22';

  return (
    <View
      style={{ flex: 1, backgroundColor: '#0B0F14', paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* Logo & Header */}
        <View style={{ alignItems: 'center', marginTop: 48, marginBottom: 32, paddingHorizontal: 24 }}>
          <View style={{ width: 72, height: 72, borderRadius: 16, backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <Text style={{ color: '#0B0F14', fontSize: 32, fontWeight: '800' }}>H</Text>
          </View>
          <Text style={{ color: '#F2F5F8', fontSize: 26, fontWeight: '800', marginBottom: 4 }}>
            Chào mừng trở lại
          </Text>
          <Text style={{ color: '#9AA7B4', fontSize: 14 }}>Đăng nhập để tiếp tục</Text>
        </View>

        {/* Form Card */}
        <View style={{ backgroundColor: '#131A22', marginHorizontal: 16, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#2A3542' }}>
          {error ? <View style={{ marginBottom: 14, padding: 12, backgroundColor: '#EF444412', borderRadius: 10, borderWidth: 1, borderColor: '#EF444455' }}><Text style={{ color: '#F87171', fontSize: 12 }}>{error}</Text></View> : null}
          {/* Username */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ color: '#9AA7B4', fontSize: 12, fontWeight: '700', marginBottom: 8 }}>
              Username
            </Text>
            <TextInput
              placeholder="Nhập username"
              placeholderTextColor="#9AA7B4"
              value={username}
              onChangeText={setUsername}
              onFocus={() => setFocusedField('usr')}
              onBlur={() => setFocusedField(null)}
              autoCapitalize="none"
              autoCorrect={false}
              style={{ color: '#F2F5F8', backgroundColor: getBg('usr'), borderWidth: 1.5, borderColor: getBorder('usr'), borderRadius: 12, padding: 14, fontSize: 15 }}
            />
          </View>

          {/* Password */}
          <View style={{ marginBottom: 12 }}>
            <Text style={{ color: '#9AA7B4', fontSize: 12, fontWeight: '700', marginBottom: 8 }}>
              Password
            </Text>
            <View style={{ position: 'relative' }}>
              <TextInput
                placeholder="Nhập mật khẩu"
                placeholderTextColor="#9AA7B4"
                value={pwd}
                onChangeText={setPwd}
                onFocus={() => setFocusedField('pwd')}
                onBlur={() => setFocusedField(null)}
                secureTextEntry={!showPwd}
                style={{ color: '#F2F5F8', backgroundColor: getBg('pwd'), borderWidth: 1.5, borderColor: getBorder('pwd'), borderRadius: 12, padding: 14, paddingRight: 44, fontSize: 15 }}
              />
              <Pressable
                onPress={() => setShowPwd(!showPwd)}
                style={{ position: 'absolute', right: 12, top: 15 }}
              >
                <Text style={{ fontSize: 18 }}>{showPwd ? '👁️' : '🔒'}</Text>
              </Pressable>
            </View>
          </View>

          {/* Login Button */}
          <Pressable
            onPress={handleLogin}
            disabled={loading}
            style={{ borderRadius: 12, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: loading ? '#16A34A' : '#22C55E', opacity: loading ? 0.6 : 1, marginTop: 8 }}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={{ color: '#0B0F14', fontSize: 16, fontWeight: '800' }}>Đăng nhập</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
