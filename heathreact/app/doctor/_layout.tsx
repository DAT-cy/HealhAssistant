import { Stack, router } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useUserStore } from '@/stores/user';

export default function DoctorLayout() {
  const token = useUserStore((state) => state.token);
  const role = useUserStore((state) => state.role);
  const initialized = useUserStore((state) => state.initialized);
  React.useEffect(() => { if (!initialized) return; if (!token) router.replace('/login'); else if (role !== 'ROLE_DOCTOR') router.replace('/(user)'); }, [initialized, role, token]);
  if (!initialized || !token || role !== 'ROLE_DOCTOR') return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color="#635BFF" /></View>;
  return <Stack screenOptions={{ headerShown: false }} />;
}
