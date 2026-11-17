import '@/global.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import React, { useState } from 'react';
import * as SystemUI from 'expo-system-ui';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useUserStore } from '@/stores/user';

// Keep the file-based root route as the only app entry point. The root route
// then decides between auth and the protected area after token restoration.
export const unstable_settings = { initialRouteName: 'index' };

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false },
      mutations: { retry: 0 },
    },
  }));
  const init = useUserStore((state) => state.init);

  React.useEffect(() => {
    void init();
    void SystemUI.setBackgroundColorAsync('#F7F8FC').catch(() => {});
  }, [init]);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
          <Stack.Screen name="index" options={{ animation: 'fade' }} />
          <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
          <Stack.Screen name="login" options={{ animation: 'fade' }} />
          <Stack.Screen name="forgot-password" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="(user)" />
          <Stack.Screen name="admin" />
          <Stack.Screen name="doctor" />
          <Stack.Screen name="not-found" options={{ animation: 'fade' }} />
        </Stack>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
