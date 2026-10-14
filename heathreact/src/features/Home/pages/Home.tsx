import React, { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
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

import { useUserStore } from '@/stores/user';
import { coachService, ActiveRoadmap } from '@/api/services/coach.service';

import HomeHeader from '../components/HomeHeader';
import HomeTabBar from '../components/HomeTabBar';
import { navigationService } from '@/routes';

export default function HomePage() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTabletOrDesktop = width >= 768;

  const username = useUserStore((s) => s.username);
  const logout = useUserStore((s) => s.logout);

  // States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeRoadmap, setActiveRoadmap] = useState<ActiveRoadmap | null>(null);

  const triggerHaptic = (type: 'light' | 'medium' | 'success' | 'error' = 'light') => {
    try {
      if (type === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      else if (type === 'medium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      else if (type === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      else if (type === 'error') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch {
      // Ignore fallback
    }
  };

  // Nạp dữ liệu đồng bộ với backend nếu có
  const loadData = useCallback(async () => {
    try {
      setErrorMessage(null);

      const plan = await coachService.active();
      setActiveRoadmap(plan);
    } catch (err: unknown) {
      setActiveRoadmap(null);
      if (!(err instanceof Error && 'status' in err && (err as { status?: number }).status === 404)) {
        setErrorMessage('Không thể tải lộ trình. Kéo xuống để thử lại.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void loadData();
  }, [loadData]));

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    triggerHaptic('light');
    void loadData();
  }, [loadData]);

  // Bắt đầu tập luyện
  const handleStartTodayWorkout = () => {
    triggerHaptic('medium');
    navigationService.navigate('DailyPlan');
  };

  // Chọn nhóm cơ
  const weeklyPlan = activeRoadmap ? parseList(activeRoadmap.weeklyPlan) : [];
  const startedAt = activeRoadmap?.startDate ? new Date(`${activeRoadmap.startDate}T00:00:00`) : new Date();
  const today = new Date();
  const elapsedDays = Math.max(0, Math.floor((new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() - startedAt.getTime()) / 86400000));
  const totalDays = (activeRoadmap?.durationWeeks ?? 0) * 7;
  const roadmapComplete = totalDays > 0 && elapsedDays >= totalDays;

  // Điều hướng Bottom Tab
  const handleSelectTab = (tab: 'Home' | 'Workout' | 'Progress' | 'Profile') => {
    if (tab === 'Home') return;
    if (tab === 'Workout') navigationService.navigate('Workout');
    else if (tab === 'Progress') navigationService.navigate('Progress');
    else if (tab === 'Profile') navigationService.navigate('Profile');
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#22C55E"
            colors={['#22C55E']}
          />
        }
        contentContainerStyle={[
          styles.scrollContainer,
          {
            paddingTop: insets.top + 8,
            paddingBottom: insets.bottom + 75,
          },
        ]}
      >
        <View style={[styles.mainWrapper, isTabletOrDesktop && styles.tabletDesktopWrapper]}>
          {/* ============================================================ */}
          {/* 1. HEADER: LỜI CHÀO & AVATAR DROPDOWN MENU                   */}
          {/* ============================================================ */}
          <HomeHeader
            username={username}
            onLogout={async () => {
              await logout();
            }}
            topInset={insets.top}
          />

          {/* Loading or Error states */}
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#22C55E" />
              <Text style={styles.loadingText}>Đang cập nhật dữ liệu...</Text>
            </View>
          )}

          {Boolean(errorMessage) && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color="#EF4444" />
              <Text style={styles.errorText}>{errorMessage}</Text>
              <Pressable onPress={() => void loadData()} style={styles.retryBtn}>
                <Text style={styles.retryBtnText}>Thử lại</Text>
              </Pressable>
            </View>
          )}

          {!loading && !errorMessage && !activeRoadmap ? <View style={styles.emptyState}>
            <View style={styles.emptyIcon}><Ionicons name="calendar-outline" size={28} color="#16A34A" /></View>
            <Text style={styles.emptyTitle}>Chưa có lộ trình đang hoạt động</Text>
            <Text style={styles.emptyCopy}>Hoàn thiện hồ sơ, xem trước các phương án và chọn kế hoạch phù hợp. Lịch tập sẽ xuất hiện tại đây sau khi xác nhận.</Text>
            <Pressable accessibilityRole="button" onPress={() => navigationService.navigate('Roadmap')} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Tạo lộ trình</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={() => navigationService.navigate('Profile')} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Cập nhật hồ sơ</Text></Pressable>
          </View> : null}
          {!loading && activeRoadmap ? <View style={styles.planArea}>
            <View style={styles.planHeading}><View style={{ flex: 1 }}><Text style={styles.kicker}>{roadmapComplete ? 'ĐÃ HOÀN THÀNH' : 'ĐANG THỰC HIỆN'}</Text><Text style={styles.planTitle}>{activeRoadmap.title}</Text><Text style={styles.planSubtitle}>{roadmapComplete ? `${totalDays} / ${totalDays} ngày · ` : `Ngày ${elapsedDays + 1} / ${totalDays} · `}Bắt đầu {startedAt.toLocaleDateString('vi-VN')}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Xem lộ trình" onPress={() => navigationService.navigate('Roadmap')}><Ionicons name="open-outline" size={22} color="#16A34A" /></Pressable></View>
            {roadmapComplete ? <View style={styles.todayRow}><View style={{ flex: 1 }}><Text style={styles.kicker}>LỘ TRÌNH ĐÃ KẾT THÚC</Text><Text style={styles.todayText}>Xem lại tiến độ hoặc tạo lộ trình mới phù hợp với mục tiêu tiếp theo.</Text></View></View> : <Pressable style={styles.todayRow} onPress={handleStartTodayWorkout}><View style={{ flex: 1 }}><Text style={styles.kicker}>HÔM NAY</Text><Text style={styles.todayText}>{weeklyPlan[Math.min(Math.floor(elapsedDays / 7), Math.max(weeklyPlan.length - 1, 0))] ?? 'Ngày phục hồi hoặc vận động nhẹ'}</Text></View><Ionicons name="play-circle" size={30} color="#16A34A" /></Pressable>}
            <Text style={styles.sectionTitle}>Lịch lộ trình</Text>
            {Array.from({ length: totalDays }, (_, index) => {
              const date = new Date(startedAt); date.setDate(startedAt.getDate() + index);
              const isToday = index === elapsedDays;
              const isRestDay = index % 7 > 4;
              return <Pressable key={index} disabled={!isToday || isRestDay || roadmapComplete} onPress={handleStartTodayWorkout} style={[styles.dayRow, isToday && styles.dayRowToday]}><Text style={styles.dayNumber}>{String(index + 1).padStart(2, '0')}</Text><View style={{ flex: 1 }}><Text style={styles.dayLabel}>{date.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'short' })}{isToday ? ' · Hôm nay' : ''}</Text><Text style={styles.dayFocus}>{isRestDay ? 'Nghỉ và phục hồi' : weeklyPlan[Math.min(Math.floor(index / 7), Math.max(weeklyPlan.length - 1, 0))] ?? 'Buổi vận động nhẹ'}</Text></View><Ionicons name={isRestDay ? 'bed-outline' : isToday && !roadmapComplete ? 'play-circle-outline' : 'ellipse-outline'} size={19} color={isToday && !roadmapComplete ? '#16A34A' : '#94A3B8'} /></Pressable>;
            })}
          </View> : null}
        </View>
      </ScrollView>

      {/* ============================================================ */}
      {/* 6. THANH ĐIỀU HƯỚNG CỐ ĐỊNH PHÍA DƯỚI (BOTTOM BAR)           */}
      {/* ============================================================ */}
      <HomeTabBar
        bottomInset={insets.bottom}
        activeTab="Home"
        onSelectTab={handleSelectTab}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContainer: {
    paddingHorizontal: 16,
  },
  mainWrapper: {
    width: '100%',
  },
  tabletDesktopWrapper: {
    maxWidth: 720,
    alignSelf: 'center',
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    color: '#64748B',
    fontSize: 13,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    flex: 1,
    color: '#EF4444',
    fontSize: 12.5,
  },
  retryBtn: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyState: { marginTop: 32, padding: 20, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyTitle: { color: '#0F172A', fontSize: 20, fontWeight: '800', textAlign: 'center' },
  emptyCopy: { color: '#64748B', textAlign: 'center', lineHeight: 21, marginTop: 8, marginBottom: 18 },
  primaryButton: { width: '100%', alignItems: 'center', backgroundColor: '#16A34A', borderRadius: 8, paddingVertical: 13 },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '800' },
  secondaryButton: { marginTop: 10, padding: 10 },
  secondaryButtonText: { color: '#15803D', fontWeight: '700' },
  planArea: { marginTop: 14 },
  planHeading: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  kicker: { color: '#15803D', fontSize: 11, fontWeight: '800' },
  planTitle: { color: '#0F172A', fontSize: 21, fontWeight: '800', marginTop: 3 },
  planSubtitle: { color: '#64748B', marginTop: 5, fontSize: 12 },
  todayRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 10, backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0', marginVertical: 10 },
  todayText: { color: '#0F172A', fontWeight: '700', lineHeight: 20, marginTop: 5 },
  sectionTitle: { color: '#0F172A', fontWeight: '800', fontSize: 17, marginTop: 16, marginBottom: 6 },
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 68, paddingHorizontal: 10, borderBottomWidth: 1, borderColor: '#E2E8F0' },
  dayRowToday: { backgroundColor: '#F0FDF4' },
  dayNumber: { width: 34, textAlign: 'center', color: '#64748B', fontWeight: '800' },
  dayLabel: { color: '#0F172A', fontWeight: '700', textTransform: 'capitalize' },
  dayFocus: { color: '#64748B', fontSize: 12, marginTop: 3, lineHeight: 17 },
});

function parseList(value: string): string[] {
  try { const parsed: unknown = JSON.parse(value); return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []; }
  catch { return []; }
}
