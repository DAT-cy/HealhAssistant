import { router, type Href } from 'expo-router';

export type AppRoute =
  | 'Index'
  | 'Welcome'
  | 'Login'
  | 'Home'
  | 'NotFound'
  | 'HealthRecord'
  | 'PersonalSettings'
  | 'Subscription'
  | 'Scan'
  | 'Roadmap'
  | 'DailyPlan'
  | 'DailyCheckin'
  | 'Workout'
  | 'WorkoutSession'
  | 'Progress'
  | 'Nutrition'
  | 'Coach'
  | 'AdminKnowledge'
  | 'AdminDashboard'
  | 'AdminDesignSystem'
  | 'DoctorDashboard';

const routePaths: Record<AppRoute, Href> = {
  Index: '/',
  Welcome: '/welcome',
  Login: '/login',
  Home: '/(user)',
  NotFound: '/not-found',
  HealthRecord: '/(user)/health-record',
  PersonalSettings: '/(user)/personal-settings',
  Subscription: '/(user)/subscription',
  Scan: '/(user)/scan',
  Roadmap: '/(user)/roadmap',
  DailyPlan: '/(user)/daily-plan',
  DailyCheckin: '/(user)/daily-check-in',
  Workout: '/(user)/workout',
  WorkoutSession: '/(user)/workout-session',
  Progress: '/(user)/progress',
  Nutrition: '/(user)/nutrition',
  Coach: '/(user)/coach',
  AdminKnowledge: '/admin/knowledge',
  AdminDashboard: '/admin',
  AdminDesignSystem: '/admin/design-system',
  DoctorDashboard: '/doctor',
};

function navigate(name: AppRoute) {
  router.push(routePaths[name]);
}

function replace(name: AppRoute) {
  router.replace(routePaths[name]);
}

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export const navigationService = { navigate, replace, goBack };
