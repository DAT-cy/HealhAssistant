import { useUserStore } from '@/stores/user';
import { router } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function IndexRoute() {
  const token = useUserStore((state) => state.token);
  const role = useUserStore((state) => state.role);
  const initialized = useUserStore((state) => state.initialized);

  React.useEffect(() => {
    if (!initialized) return;
    // Authentication is the only decision at the app entry point. Subscription
    // status is a feature concern and must never affect the initial destination.
    router.replace(!token ? '/login' : role === 'ROLE_ADMIN' ? '/admin' : role === 'ROLE_DOCTOR' ? '/doctor' : '/(user)');
  }, [initialized, role, token]);

  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#080C11' }}><ActivityIndicator color="#22C55E" /></View>;
}
