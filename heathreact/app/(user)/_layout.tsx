import { useUserStore } from '@/stores/user';
import { Stack, router } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { palette } from '@/theme/tokens';

export default function UserLayout() {
  const token = useUserStore((state) => state.token);
  const role = useUserStore((state) => state.role);
  const initialized = useUserStore((state) => state.initialized);

  React.useEffect(() => {
    if (!initialized) return;
    if (!token) router.replace('/login');
    else if (role === 'ROLE_ADMIN') router.replace('/admin/knowledge');
  }, [initialized, role, token]);

  if (!initialized || !token || role !== 'ROLE_USER') {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.bg }}><ActivityIndicator color={palette.primary} /></View>;
  }

  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />;
}
