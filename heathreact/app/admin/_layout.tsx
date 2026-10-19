import { useUserStore } from '@/stores/user';
import { Stack, router } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function AdminLayout() {
  const token = useUserStore((state) => state.token);
  const role = useUserStore((state) => state.role);
  const initialized = useUserStore((state) => state.initialized);

  React.useEffect(() => {
    if (!initialized) return;
    if (!token) router.replace('/login');
    else if (role !== 'ROLE_ADMIN') router.replace('/(user)');
  }, [initialized, role, token]);

  if (!initialized || !token || role !== 'ROLE_ADMIN') {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#080C11' }}><ActivityIndicator color="#22C55E" /></View>;
  }

  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />;
}
