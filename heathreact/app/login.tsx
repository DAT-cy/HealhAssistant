import LoginPage from '@/features/Auth/pages/Login';
import { useUserStore } from '@/stores/user';
import { router } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function LoginRoute() {
  const token = useUserStore((state) => state.token);
  const role = useUserStore((state) => state.role);
  const initialized = useUserStore((state) => state.initialized);

  React.useEffect(() => {
    if (initialized && token) router.replace(role === 'ROLE_ADMIN' ? '/admin/knowledge' : '/(user)');
  }, [initialized, role, token]);

  if (!initialized || token) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#080C11' }}><ActivityIndicator color="#22C55E" /></View>;
  }
  return <LoginPage />;
}
