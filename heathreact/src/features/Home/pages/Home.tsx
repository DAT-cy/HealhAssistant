import React, { useCallback, useRef } from 'react';
import { router, useFocusEffect } from 'expo-router';
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useQuery } from '@tanstack/react-query';

import { useUserStore } from '@/stores/user';
import { ApiError } from '@/api/client';
import { coachService, type ActiveRoadmap } from '@/api/services/coach.service';
import { profileService } from '@/api/services/profile.service';
import { dailyPlanService, type DailyPlanResponse } from '@/api/services/daily-plan.service';
import { healthTrackingService, type AvailabilitySlot } from '@/api/services/health-tracking.service';
import type { ProfileGender } from '@/components/ui/Avatar';

import HomeHeader from '../components/HomeHeader';
import HomeTabBar from '../components/HomeTabBar';
import { navigationService } from '@/routes';

type HomeRoute = 'Roadmap' | 'Progress' | 'Profile' | 'DailyPlan' | 'Workout' | 'Coach' | 'Nutrition';

const actions: {
  title: string;
  detail: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  background: string;
  route: HomeRoute;
}[] = [
  { title: 'Tạo lộ trình cá nhân', detail: 'Kế hoạch tập luyện và dinh dưỡng riêng cho bạn.', icon: 'locate-outline', color: '#635BFF', background: '#EFEEFF', route: 'Roadmap' },
  { title: 'Theo dõi tiến độ', detail: 'Ghi nhận và xem lại kết quả mỗi ngày.', icon: 'barbell-outline', color: '#268FCB', background: '#E8F7FF', route: 'Progress' },
  { title: 'Thống kê sức khỏe', detail: 'Theo dõi cân nặng và hành trình của bạn.', icon: 'stats-chart-outline', color: '#8C72EA', background: '#F2EEFF', route: 'Profile' },
  { title: 'Dinh dưỡng khoa học', detail: 'Theo dõi bữa ăn và thông tin dinh dưỡng.', icon: 'restaurant-outline', color: '#D88732', background: '#FFF4E8', route: 'Nutrition' },
  { title: 'Tập luyện cá nhân hóa', detail: 'Xem bài tập theo thể trạng và mục tiêu.', icon: 'walk-outline', color: '#E56F91', background: '#FFF0F3', route: 'Workout' },
  { title: 'Kiến thức sức khỏe', detail: 'Hỏi trợ lý về vận động và thói quen khỏe.', icon: 'book-outline', color: '#239FC8', background: '#E8F9FF', route: 'Coach' },
];

export default function HomePage() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const username = useUserStore((state) => state.username);
  const logout = useUserStore((state) => state.logout);
  const focusedBefore = useRef(false);

  const { data: profile, isError: profileFailed, isRefetching: profileRefetching, refetch: refetchProfile } = useQuery({
    queryKey: ['profile', 'me'],
    queryFn: profileService.getMine,
  });
  const { data: activeRoadmap, isError: roadmapFailed, isRefetching: roadmapRefetching, refetch: refetchRoadmap } = useQuery<ActiveRoadmap | null>({
    queryKey: ['roadmap', 'active'],
    queryFn: async () => {
      try {
        return await coachService.active();
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },
  });
  const { data: availability, isRefetching: availabilityRefetching, refetch: refetchAvailability } = useQuery({
    queryKey: ['availability', 'me'],
    queryFn: healthTrackingService.availability,
  });
  const { data: todayPlan, isRefetching: planRefetching, refetch: refetchTodayPlan } = useQuery<DailyPlanResponse>({
    queryKey: ['daily-plan', 'today'],
    queryFn: dailyPlanService.today,
  });
  const avatarUrl = profile?.avatarUrl ?? null;
  const gender: ProfileGender | null = profile?.gender ?? null;
  const refreshing = profileRefetching || roadmapRefetching || availabilityRefetching || planRefetching;
  const errorMessage = profileFailed
    ? 'Không thể tải hồ sơ của bạn.'
    : roadmapFailed ? 'Không thể tải lộ trình.' : null;

  const loadData = useCallback(async () => {
    await Promise.all([refetchProfile(), refetchRoadmap(), refetchAvailability(), refetchTodayPlan()]);
  }, [refetchAvailability, refetchProfile, refetchRoadmap, refetchTodayPlan]);

  useFocusEffect(useCallback(() => {
    if (!focusedBefore.current) {
      focusedBefore.current = true;
      return;
    }
    void loadData();
  }, [loadData]));

  const onRefresh = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    void Promise.all([refetchProfile(), refetchRoadmap(), refetchAvailability(), refetchTodayPlan()]);
  }, [refetchAvailability, refetchProfile, refetchRoadmap, refetchTodayPlan]);

  const navigate = (route: HomeRoute) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    navigationService.navigate(route);
  };

  const cardWidth = isWide ? '31.8%' : width < 360 ? '48.5%' : '31.4%';

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F8FC" translucent />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#635BFF" colors={['#635BFF']} />}
        contentContainerStyle={[styles.scrollContainer, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 92 }]}
      >
        <View style={[styles.mainWrapper, isWide && styles.wideWrapper]}>
          <HomeHeader
            username={username}
            avatarUrl={avatarUrl}
            gender={gender}
            onLogout={logout}
            topInset={insets.top}
          />

          <WeeklyCalendarPreview
            availability={availability ?? []}
            plan={todayPlan}
            onOpen={() => navigate('DailyPlan')}
            onOpenDate={(date) => router.push({ pathname: '/(user)/daily-plan', params: { date } })}
          />

          <View style={styles.hero}>
            <View style={styles.heroCopy}>
              <View style={styles.brandBadge}>
                <Ionicons name="heart" size={15} color="#635BFF" />
                <Text style={styles.brandBadgeText}>Health Assistant</Text>
              </View>
              <Text style={styles.heroTitle}>Khỏe hơn hôm nay, tốt hơn ngày mai!</Text>
              <Text style={styles.heroDescription}>AI đồng hành cùng bạn xây dựng lộ trình tập luyện và dinh dưỡng cá nhân, phù hợp với thể trạng và mục tiêu.</Text>
              <Pressable onPress={() => navigate('Roadmap')} style={({ pressed }) => [styles.heroButton, pressed && styles.pressed]} accessibilityRole="button">
                <Text style={styles.heroButtonText}>Tạo lộ trình ngay</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </Pressable>
            </View>
            <View style={styles.heroArt}>
              <Image source={require('../../../assets/images/fitness-home.jpg')} resizeMode="cover" accessibilityLabel="Người tập luyện với tạ trong phòng gym" style={styles.heroImage} />
            </View>
          </View>

          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>Bạn có thể làm gì?</Text>
          </View>
          <View style={styles.actionGrid}>
            {actions.map((action) => (
              <Pressable
                key={action.title}
                onPress={() => navigate(action.route)}
                accessibilityRole="button"
                style={({ pressed }) => [styles.actionCard, { width: cardWidth }, pressed && styles.pressed]}
              >
                <View style={[styles.actionIcon, { backgroundColor: action.background }]}>
                  <Ionicons name={action.icon} size={22} color={action.color} />
                </View>
                <Text style={styles.actionTitle}>{action.title}</Text>
                <Text style={styles.actionDetail}>{action.detail}</Text>
                <Ionicons name="arrow-forward" size={16} color="#64748B" style={styles.actionArrow} />
              </Pressable>
            ))}
          </View>

          {activeRoadmap ? (
            <ActiveRoadmapSection roadmap={activeRoadmap} onOpenRoadmap={() => navigate('Roadmap')} onOpenDailyPlan={() => navigate('DailyPlan')} />
          ) : (
            <Pressable onPress={() => navigate('Roadmap')} style={({ pressed }) => [styles.roadmapBanner, pressed && styles.pressed]} accessibilityRole="button">
              <View style={styles.bannerIcon}><Ionicons name="sparkles" size={22} color="#635BFF" /></View>
              <View style={styles.bannerCopy}>
                <Text style={styles.bannerTitle}>Hiện tại bạn chưa có lộ trình nào</Text>
                <Text style={styles.bannerDetail}>Hãy tạo lộ trình để bắt đầu hành trình khỏe mạnh của mình.</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#64748B" />
            </Pressable>
          )}

          {errorMessage ? <Text accessibilityLiveRegion="polite" style={styles.errorText}>{errorMessage}</Text> : null}

          <View style={styles.quoteBanner}>
            <View style={styles.quoteMark}><Ionicons name="chatbox-ellipses" size={19} color="#635BFF" /></View>
            <View style={styles.quoteCopy}>
              <Text style={styles.quoteText}>“Sức khỏe không phải là đích đến, mà là một hành trình.”</Text>
              <Text style={styles.quoteCaption}>Hãy bắt đầu ngay hôm nay!</Text>
            </View>
            <Ionicons name="heart-outline" size={30} color="#36B9F6" />
          </View>
        </View>
      </ScrollView>

      <HomeTabBar bottomInset={insets.bottom} activeTab="Home" onSelectTab={(tab) => {
        if (tab === 'Workout') navigate('Workout');
        else if (tab === 'Progress') navigate('Progress');
        else if (tab === 'Profile') navigate('Profile');
      }} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7F8FC' },
  scrollContainer: { paddingHorizontal: 16 },
  mainWrapper: { width: '100%' },
  wideWrapper: { maxWidth: 720, alignSelf: 'center' },
  hero: { flexDirection: 'row', alignItems: 'center', minHeight: 238, backgroundColor: '#F0F0FF', borderRadius: 20, borderWidth: 1, borderColor: '#E5E3FF', padding: 18, overflow: 'hidden' },
  heroCopy: { flex: 1.1, alignItems: 'flex-start', paddingRight: 4 },
  brandBadge: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: '#E4E1FF', borderRadius: 18, marginBottom: 12 },
  brandBadgeText: { color: '#4438CA', fontSize: 12, fontWeight: '700' },
  heroTitle: { color: '#20213A', fontSize: 21, lineHeight: 27, fontWeight: '800' },
  heroDescription: { color: '#656B87', fontSize: 12, lineHeight: 18, marginTop: 8 },
  heroButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, minHeight: 44, paddingHorizontal: 16, backgroundColor: '#635BFF', borderRadius: 24, marginTop: 14 },
  heroButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  heroArt: { flex: 0.9, height: 190, justifyContent: 'center', alignItems: 'center', marginRight: -8, borderRadius: 16, overflow: 'hidden' },
  heroImage: { width: '100%', height: '100%' },
  sectionHeading: { marginTop: 22, marginBottom: 11 },
  sectionTitle: { color: '#20213A', fontSize: 18, fontWeight: '800' },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  actionCard: { minHeight: 157, padding: 11, borderWidth: 1, borderColor: '#E8EAF4', borderRadius: 16, backgroundColor: '#FFFFFF' },
  actionIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  actionTitle: { color: '#20213A', fontSize: 12, lineHeight: 16, fontWeight: '800' },
  actionDetail: { color: '#7A8099', fontSize: 10, lineHeight: 14, marginTop: 5, paddingBottom: 16 },
  actionArrow: { position: 'absolute', right: 11, bottom: 9 },
  roadmapBanner: { minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: 11, padding: 13, marginTop: 18, backgroundColor: '#EFEEFF', borderRadius: 16 },
  bannerIcon: { width: 46, height: 46, borderRadius: 16, backgroundColor: '#E4E1FF', alignItems: 'center', justifyContent: 'center' },
  bannerCopy: { flex: 1 },
  bannerTitle: { color: '#4438CA', fontSize: 13, fontWeight: '800' },
  bannerDetail: { color: '#7A8099', fontSize: 11, lineHeight: 15, marginTop: 4 },
  quoteBanner: { minHeight: 78, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13, marginTop: 14, backgroundColor: '#EAF8FF', borderRadius: 16 },
  quoteMark: { width: 32, height: 32, borderRadius: 12, backgroundColor: '#D7F3FF', alignItems: 'center', justifyContent: 'center' },
  quoteCopy: { flex: 1 },
  quoteText: { color: '#315C7A', fontSize: 12, fontWeight: '700', lineHeight: 17 },
  quoteCaption: { color: '#7A8099', fontSize: 11, marginTop: 3 },
  errorText: { color: '#D95070', fontSize: 12, marginTop: 10 },
  pressed: { opacity: 0.82 },
  roadmapSection: { marginTop: 18, padding: 14, backgroundColor: '#F2F1FF', borderRadius: 20, borderWidth: 1, borderColor: '#E6E4FF' },
  roadmapSectionHeading: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 11 },
  weekSummary: { marginTop: 14, padding: 13, backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E8EAF4' },
  weekSummaryTop: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  weekSummaryTitle: { color: '#4438CA', fontSize: 14, fontWeight: '800' },
  weekDate: { color: '#7A8099', fontSize: 11 },
  weekFocusLabel: { marginTop: 10, color: '#7A8099', fontSize: 11, fontWeight: '600' },
  weekFocus: { marginTop: 4, color: '#363955', fontSize: 13, lineHeight: 19, fontWeight: '600' },
  weekList: { marginTop: 8 },
  weekRow: { minHeight: 55, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E8EAF4' },
  weekRowCurrent: { backgroundColor: '#EAE8FF', borderRadius: 10, paddingHorizontal: 7 },
  weekNumber: { width: 27, height: 27, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#E8EAF4' },
  weekNumberCurrent: { backgroundColor: '#635BFF' },
  weekNumberText: { color: '#656B87', fontSize: 11, fontWeight: '700' },
  weekNumberTextCurrent: { color: '#FFFFFF' },
  weekRowCopy: { flex: 1, gap: 2 },
  weekRowTitle: { color: '#363955', fontSize: 11, fontWeight: '700' },
  weekRowFocus: { color: '#7A8099', fontSize: 11, lineHeight: 16 },
  currentWeekTag: { color: '#4438CA', fontSize: 10, fontWeight: '800' },
  scheduleWarning: { marginTop: 12, color: '#D88732', fontSize: 12 },
  calendarNote: { marginTop: 10, color: '#7A8099', fontSize: 10, lineHeight: 15 },
  dailyPlanButton: { minHeight: 42, marginTop: 12, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, backgroundColor: '#635BFF' },
  dailyPlanButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  calendarPreview: { marginTop: 16, padding: 14, borderWidth: 1, borderColor: '#DDECF5', borderRadius: 14, backgroundColor: '#FFFFFF' },
  calendarPreviewHeading: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 10 },
  calendarPreviewTitle: { color: '#20213A', fontSize: 14, fontWeight: '800' },
  calendarPreviewDate: { color: '#7A8099', fontSize: 10, marginTop: 3 },
  calendarDays: { flexDirection: 'row', justifyContent: 'space-between', gap: 4, marginTop: 12 },
  calendarDay: { flex: 1, minWidth: 0, minHeight: 72, alignItems: 'center', justifyContent: 'center', gap: 3, borderWidth: 1, borderColor: '#E8EAF4', borderRadius: 8, backgroundColor: '#FFFFFF' },
  calendarDayToday: { borderColor: '#635BFF', backgroundColor: '#EFEEFF' },
  calendarDayLabel: { color: '#7A8099', fontSize: 9, fontWeight: '700' },
  calendarDayNumber: { color: '#20213A', fontSize: 14, fontWeight: '800' },
  calendarDayTime: { color: '#268FCB', fontSize: 8, fontWeight: '700' },
  calendarDayTextToday: { color: '#4438CA' },
  todaySchedule: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, padding: 11, borderRadius: 10, backgroundColor: '#F5F7FC' },
  todayScheduleCopy: { flex: 1, gap: 3 },
  todayScheduleLabel: { color: '#635BFF', fontSize: 9, fontWeight: '800' },
  todayScheduleTitle: { color: '#20213A', fontSize: 12, fontWeight: '800' },
  todayScheduleDetail: { color: '#7A8099', fontSize: 10, lineHeight: 14 },
  todayTime: { alignItems: 'center', gap: 3 },
  todayTimeText: { color: '#315C7A', fontSize: 10, fontWeight: '800' },
  calendarOpenButton: { minHeight: 38, marginTop: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 8, backgroundColor: '#268FCB' },
  calendarOpenText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
});

function ActiveRoadmapSection({
  roadmap,
  onOpenRoadmap,
  onOpenDailyPlan,
}: {
  roadmap: ActiveRoadmap;
  onOpenRoadmap: () => void;
  onOpenDailyPlan: () => void;
}) {
  const weeks = parseWeeklyPlan(roadmap.weeklyPlan);
  const durationWeeks = Math.max(roadmap.durationWeeks || weeks.length, 1);
  const start = parseLocalDate(roadmap.startDate);
  const today = new Date();
  const dayOffset = start ? Math.floor((dateOrdinal(today) - dateOrdinal(start)) / 86_400_000) : 0;
  const currentWeek = Math.max(0, Math.min(Math.floor(dayOffset / 7), durationWeeks - 1));
  const ended = dayOffset >= durationWeeks * 7;
  const weekStart = start ? addDays(start, currentWeek * 7) : null;
  const weekEnd = weekStart ? addDays(weekStart, 6) : null;

  return (
    <View style={styles.roadmapSection}>
      <View style={styles.roadmapSectionHeading}>
        <View style={styles.bannerIcon}><Ionicons name="sparkles" size={22} color="#635BFF" /></View>
        <View style={styles.bannerCopy}>
          <Text style={styles.bannerTitle}>Lộ trình đang hoạt động</Text>
          <Text style={styles.bannerDetail} numberOfLines={2}>{roadmap.title}</Text>
        </View>
        <Pressable onPress={onOpenRoadmap} hitSlop={8} accessibilityRole="button" accessibilityLabel="Mở chi tiết lộ trình">
          <Ionicons name="chevron-forward" size={20} color="#64748B" />
        </Pressable>
      </View>

      <View style={styles.weekSummary}>
        <View style={styles.weekSummaryTop}>
          <Text style={styles.weekSummaryTitle}>{ended ? 'Đã hết thời lượng lộ trình' : `Tuần ${currentWeek + 1} / ${durationWeeks}`}</Text>
          {weekStart && weekEnd ? <Text style={styles.weekDate}>{formatDate(weekStart)} - {formatDate(weekEnd)}</Text> : null}
        </View>
        <Text style={styles.weekFocusLabel}>{ended ? 'Bạn có thể xem lại lộ trình hoặc tạo phương án mới.' : 'Trọng tâm tuần này'}</Text>
        {!ended && weeks[currentWeek] ? <Text style={styles.weekFocus}>{weeks[currentWeek]}</Text> : null}
      </View>

      <Pressable onPress={onOpenDailyPlan} style={({ pressed }) => [styles.dailyPlanButton, pressed && styles.pressed]} accessibilityRole="button">
        <Ionicons name="calendar-outline" size={17} color="#FFFFFF" />
        <Text style={styles.dailyPlanButtonText}>Mở lịch tập theo ngày</Text>
        <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

function WeeklyCalendarPreview({ availability, plan, onOpen, onOpenDate }: { availability: AvailabilitySlot[]; plan?: DailyPlanResponse; onOpen: () => void; onOpenDate: (date: string) => void }) {
  const today = new Date();
  const monday = addDays(today, -((today.getDay() + 6) % 7));
  const dayLabels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  const todayDay = today.getDay() || 7;
  const todaySlot = availability.filter((slot) => slot.dayOfWeek === todayDay).sort((a, b) => a.startTime.localeCompare(b.startTime))[0];
  return <View style={styles.calendarPreview}>
    <View style={styles.calendarPreviewHeading}>
      <View style={styles.bannerIcon}><Ionicons name="calendar" size={21} color="#268FCB" /></View>
      <View style={styles.bannerCopy}><Text style={styles.calendarPreviewTitle}>Lịch tuần này</Text><Text style={styles.calendarPreviewDate}>{formatDate(monday)} - {formatDate(addDays(monday, 6))}</Text></View>
      <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel="Mở lịch tuần"><Ionicons name="chevron-forward" size={20} color="#64748B" /></Pressable>
    </View>
    <View style={styles.calendarDays}>
      {Array.from({ length: 7 }, (_, index) => {
        const date = addDays(monday, index);
        const dayOfWeek = date.getDay() || 7;
        const slot = availability.filter((item) => item.dayOfWeek === dayOfWeek).sort((a, b) => a.startTime.localeCompare(b.startTime))[0];
        const isToday = date.toDateString() === today.toDateString();
        return <Pressable key={dayOfWeek} onPress={() => onOpenDate(dateKey(date))} style={[styles.calendarDay, isToday && styles.calendarDayToday]} accessibilityRole="button" accessibilityLabel={`${dayLabels[index]} ${date.getDate()}${slot ? `, ${slot.startTime}` : ''}`}>
          <Text style={[styles.calendarDayLabel, isToday && styles.calendarDayTextToday]}>{dayLabels[index]}</Text>
          <Text style={[styles.calendarDayNumber, isToday && styles.calendarDayTextToday]}>{date.getDate()}</Text>
          <Text style={[styles.calendarDayTime, isToday && styles.calendarDayTextToday]}>{slot ? shortTime(slot.startTime) : '·'}</Text>
        </Pressable>;
      })}
    </View>
    <View style={styles.todaySchedule}>
      <View style={styles.todayScheduleCopy}>
        <Text style={styles.todayScheduleLabel}>HÔM NAY</Text>
        <Text style={styles.todayScheduleTitle}>{plan?.title ?? 'Đang tải lịch hôm nay...'}</Text>
        <Text style={styles.todayScheduleDetail} numberOfLines={2}>{plan?.activities[0] ?? (todaySlot ? 'Buổi tập đang được chuẩn bị.' : 'Chưa đặt khung giờ cho hôm nay.')}</Text>
      </View>
      <View style={styles.todayTime}><Ionicons name="time-outline" size={15} color="#315C7A" /><Text style={styles.todayTimeText}>{plan?.source === 'safety-rule' || plan?.source === 'rest-day' ? 'Nghỉ' : plan?.scheduledStart && plan.scheduledEnd ? `${plan.scheduledStart} - ${plan.scheduledEnd}` : todaySlot ? `${shortTime(todaySlot.startTime)} - ${shortTime(todaySlot.endTime)}` : 'Nghỉ'}</Text></View>
    </View>
    <Pressable onPress={onOpen} style={styles.calendarOpenButton} accessibilityRole="button"><Text style={styles.calendarOpenText}>Xem lịch chi tiết</Text><Ionicons name="arrow-forward" size={16} color="#FFFFFF" /></Pressable>
  </View>;
}

function parseWeeklyPlan(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : [];
  } catch {
    return [];
  }
}

function parseLocalDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value || '');
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function dateOrdinal(date: Date) {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function formatDate(date: Date) {
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function shortTime(value: string) {
  return value.slice(0, 5);
}
