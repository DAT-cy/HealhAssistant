import { Ionicons } from '@expo/vector-icons';

export interface TodayWorkout {
  id: string;
  badge: string;
  title: string;
  description: string;
  exercisesCount: number;
  durationMinutes: number;
  difficulty: string;
  imageUrl: string;
}

export interface WeeklyProgressData {
  completedWorkouts: number;
  targetWorkouts: number;
  activeTimeMinutes: number;
  currentStreakDays: number;
  completionRatePercent: number;
  currentWeekText: string;
}

export interface MuscleCategory {
  id: string;
  name: string;
  exerciseCountText: string;
  imageUrl: string;
}

export interface RecommendedExercise {
  id: string;
  name: string;
  targetMuscle: string;
  sets: string;
  repsOrDuration: string;
  difficultyTag: 'Dễ' | 'Trung bình' | 'Khó';
  imageUrl: string;
}

export const fitnessTheme = {
  bg: '#F8FAFC',
  card: '#FFFFFF',
  cardDark: '#111827',
  primary: '#22C55E', // Green neon
  primaryDark: '#16A34A',
  primaryLight: '#DCFCE7',
  accent: '#38BDF8',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  text: '#0F172A',
  textMuted: '#64748B',
  textLight: '#94A3B8',
  border: '#F1F5F9',
  borderDark: '#1E293B',
};

export const defaultTodayWorkout: TodayWorkout = {
  id: 'workout-today',
  badge: "TODAY'S WORKOUT",
  title: 'Chest & Triceps',
  description: 'Tập trung vào ngực và tay sau, giúp phát triển sức mạnh và độ săn chắc.',
  exercisesCount: 6,
  durationMinutes: 35,
  difficulty: 'Trung bình',
  imageUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&auto=format&fit=crop&q=80',
};

export const defaultWeeklyProgress: WeeklyProgressData = {
  completedWorkouts: 3,
  targetWorkouts: 5,
  activeTimeMinutes: 120,
  currentStreakDays: 4,
  completionRatePercent: 60,
  currentWeekText: 'Tuần 2/4',
};

export const defaultMuscleCategories: MuscleCategory[] = [
  {
    id: 'cat-1',
    name: 'Ngực & Tay',
    exerciseCountText: '12 bài tập',
    imageUrl: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400&auto=format&fit=crop&q=80',
  },
  {
    id: 'cat-2',
    name: 'Lưng & Vai',
    exerciseCountText: '14 bài tập',
    imageUrl: 'https://images.unsplash.com/photo-1605296867304-46d5465a13f1?w=400&auto=format&fit=crop&q=80',
  },
  {
    id: 'cat-3',
    name: 'Chân & Mông',
    exerciseCountText: '12 bài tập',
    imageUrl: 'https://images.unsplash.com/photo-1434682881908-b43d0467b798?w=400&auto=format&fit=crop&q=80',
  },
  {
    id: 'cat-4',
    name: 'Bụng & Core',
    exerciseCountText: '10 bài tập',
    imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&auto=format&fit=crop&q=80',
  },
  {
    id: 'cat-5',
    name: 'Cardio',
    exerciseCountText: '8 bài tập',
    imageUrl: 'https://images.unsplash.com/photo-1538805060514-97d9cc17730c?w=400&auto=format&fit=crop&q=80',
  },
];

export const defaultRecommendedExercises: RecommendedExercise[] = [
  {
    id: 'rec-1',
    name: 'Push-up',
    targetMuscle: 'Ngực • Tay sau',
    sets: '3 hiệp',
    repsOrDuration: '10-15 reps',
    difficultyTag: 'Dễ',
    imageUrl: 'https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=400&auto=format&fit=crop&q=80',
  },
  {
    id: 'rec-2',
    name: 'Dumbbell Squat',
    targetMuscle: 'Chân • Mông',
    sets: '3 hiệp',
    repsOrDuration: '12 reps',
    difficultyTag: 'Trung bình',
    imageUrl: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400&auto=format&fit=crop&q=80',
  },
  {
    id: 'rec-3',
    name: 'Plank',
    targetMuscle: 'Core',
    sets: '3 hiệp',
    repsOrDuration: '30-60 giây',
    difficultyTag: 'Khó',
    imageUrl: 'https://images.unsplash.com/photo-1566241142559-40e1dab266c6?w=400&auto=format&fit=crop&q=80',
  },
];
