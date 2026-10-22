import { useUserStore } from '@/stores/user';
import { Stack, router, usePathname } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { profileService } from '@/api/services/profile.service';
import { healthTrackingService } from '@/api/services/health-tracking.service';
import { ApiError } from '@/api/client';
import { isProfileComplete } from '@/utils/profileCompletion';
import { palette } from '@/theme/tokens';

export default function UserLayout() {
  const token = useUserStore((state) => state.token);
  const role = useUserStore((state) => state.role);
  const initialized = useUserStore((state) => state.initialized);
  const profileComplete = useUserStore((state) => state.profileComplete);
  const setProfileComplete = useUserStore((state) => state.setProfileComplete);
  const pathname = usePathname();
  const [profileCheckError, setProfileCheckError] = React.useState(false);
  const [retryCount, setRetryCount] = React.useState(0);

  React.useEffect(() => {
    if (!initialized) return;
    if (!token) router.replace('/login');
    else if (role === 'ROLE_ADMIN') router.replace('/admin/knowledge');
  }, [initialized, role, token]);

  React.useEffect(() => {
    if (!initialized || !token || role !== 'ROLE_USER') return;
    let active = true;
    Promise.all([profileService.getMine(), healthTrackingService.availability()]).then(([profile, slots]) => {
      if (active) setProfileComplete(isProfileComplete(profile, slots.length > 0));
    }).catch((error) => {
      if (!active) return;
      if (error instanceof ApiError && error.status === 404) setProfileComplete(false);
      else setProfileCheckError(true);
    });
    return () => { active = false; };
  }, [initialized, retryCount, role, setProfileComplete, token]);

  const isOnboarding = pathname.endsWith('/onboarding');
  React.useEffect(() => {
    if (!initialized || !token || role !== 'ROLE_USER' || profileComplete === null || profileCheckError) return;
    if (!profileComplete && !isOnboarding) router.replace('/(user)/onboarding');
    else if (profileComplete && isOnboarding) router.replace('/(user)');
  }, [initialized, isOnboarding, profileCheckError, profileComplete, role, token]);

  if (!initialized || !token || role !== 'ROLE_USER' || profileComplete === null) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.bg }}><ActivityIndicator color={palette.primary} /></View>;
  }

  if (profileCheckError) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12, backgroundColor: palette.bg }}>
      <Text style={{ color: palette.text, fontSize: 17, fontWeight: '700' }}>Chưa kiểm tra được hồ sơ</Text>
      <Text style={{ color: palette.textMuted, textAlign: 'center' }}>Kiểm tra kết nối rồi thử tải hồ sơ lại.</Text>
      <Pressable onPress={() => { setProfileCheckError(false); setRetryCount((count) => count + 1); }} style={{ minHeight: 44, paddingHorizontal: 18, justifyContent: 'center', borderRadius: 8, backgroundColor: palette.primary }}>
        <Text style={{ color: palette.textInverse, fontWeight: '700' }}>Thử lại</Text>
      </Pressable>
    </View>;
  }

  if ((!profileComplete && !isOnboarding) || (profileComplete && isOnboarding)) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.bg }}><ActivityIndicator color={palette.primary} /></View>;
  }

  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />;
}
