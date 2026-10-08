import LoginPage from '@/features/Auth/pages/Login';
import HomePage from '@/features/Home/pages/Home';
import NotFoundPage from '@/features/InappropriatePath/pages/NotFound';
import ProfilePage from '@/features/Health/pages/Profile';
import ScanPage from '@/features/Health/pages/Scan';
import RoadmapPage from '@/features/Health/pages/Roadmap';
import DailyPlanPage from '@/features/Health/pages/DailyPlan';
import WorkoutPage from '@/features/Health/pages/Workout';
import ProgressPage from '@/features/Health/pages/Progress';
import CoachPage from '@/features/Health/pages/Coach';
import { useUserStore } from '@/stores/user';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { View } from 'react-native';

// ============================================================
// Type definitions
// ============================================================
export type RootStackParamList = {
  Index: undefined;
  Login: undefined;
  Home: undefined;
  NotFound: undefined;
  Profile: undefined;
  Scan: undefined;
  Roadmap: undefined;
  DailyPlan: undefined;
  Workout: undefined;
  Progress: undefined;
  Coach: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// ============================================================
// Root screen – tự động chuyển hướng theo auth state
// ============================================================
function IndexScreen() {
  const token = useUserStore((s) => s.token);
  const initialized = useUserStore((s) => s.initialized);
  const init = useUserStore((s) => s.init);

  React.useEffect(() => {
    init().catch(() => {});
  }, [init]);

  if (!initialized) return <View style={{ flex: 1, backgroundColor: '#0B0F14' }} />;
  return token ? <HomePage /> : <LoginPage />;
}

// ============================================================
// Root navigator
// ============================================================
export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Index"
        screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
      >
        <Stack.Screen name="Index" component={IndexScreen} options={{ animation: 'fade' }} />
        <Stack.Screen name="Login" component={LoginPage} options={{ animation: 'fade' }} />
        <Stack.Screen name="Home" component={HomePage} />
        <Stack.Screen name="NotFound" component={NotFoundPage} options={{ animation: 'fade' }} />
        <Stack.Screen name="Profile" component={ProfilePage} />
        <Stack.Screen name="Scan" component={ScanPage} />
        <Stack.Screen name="Roadmap" component={RoadmapPage} />
        <Stack.Screen name="DailyPlan" component={DailyPlanPage} />
        <Stack.Screen name="Workout" component={WorkoutPage} />
        <Stack.Screen name="Progress" component={ProgressPage} />
        <Stack.Screen name="Coach" component={CoachPage} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
