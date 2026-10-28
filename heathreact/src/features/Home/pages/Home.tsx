import React, { useCallback, useRef, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import {
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useQuery } from '@tanstack/react-query';

import { useUserStore } from '@/stores/user';
import { ApiError } from '@/api/client';
import { coachService, type ActiveRoadmap, type RoadmapRecord } from '@/api/services/coach.service';
import { dailyPlanService, type DailyPlanResponse } from '@/api/services/daily-plan.service';
import { healthTrackingService, type AvailabilitySlot } from '@/api/services/health-tracking.service';

import HomeHeader from '../components/HomeHeader';
import HomeTabBar from '../components/HomeTabBar';
import { navigationService } from '@/routes';

type HomeRoute = 'Roadmap' | 'Progress' | 'DailyPlan' | 'Workout' | 'Coach' | 'Nutrition';

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
  { title: 'Dinh dưỡng khoa học', detail: 'Theo dõi bữa ăn và thông tin dinh dưỡng.', icon: 'restaurant-outline', color: '#D88732', background: '#FFF4E8', route: 'Nutrition' },
  { title: 'Tập luyện cá nhân hóa', detail: 'Xem bài tập theo thể trạng và mục tiêu.', icon: 'walk-outline', color: '#E56F91', background: '#FFF0F3', route: 'Workout' },
  { title: 'Kiến thức sức khỏe', detail: 'Hỏi trợ lý về vận động và thói quen khỏe.', icon: 'book-outline', color: '#239FC8', background: '#E8F9FF', route: 'Coach' },
];

export default function HomePage() {
  const insets = useSafeAreaInsets();
  const username = useUserStore((state) => state.username);
  const logout = useUserStore((state) => state.logout);
  const focusedBefore = useRef(false);
  const [showRoadmapSetup, setShowRoadmapSetup] = useState(false);
  const [setupGoal, setSetupGoal] = useState('');
  const [setupActivityLevel, setSetupActivityLevel] = useState('Mới bắt đầu');
  const [setupAge, setSetupAge] = useState('');
  const [setupHeight, setSetupHeight] = useState('');
  const [setupWeight, setSetupWeight] = useState('');
  const [setupRestrictions, setSetupRestrictions] = useState('Không có');
  const [setupPainAreas, setSetupPainAreas] = useState('Không có');
  const [setupGender, setSetupGender] = useState('Không muốn nêu');
  const [setupExperience, setSetupExperience] = useState('Mới bắt đầu');
  const [setupEquipment, setSetupEquipment] = useState('Không có dụng cụ');
  const [setupLocation, setSetupLocation] = useState('Tại nhà');
  const [setupSessionMinutes, setSetupSessionMinutes] = useState('45');
  const [setupIntensity, setSetupIntensity] = useState('Nhẹ đến vừa');
  const [setupActivities, setSetupActivities] = useState('');
  const [setupSleep, setSetupSleep] = useState('');
  const [setupMedicalNotes, setSetupMedicalNotes] = useState('Không có');
  const [setupWeeks, setSetupWeeks] = useState(4);
  const [setupDays, setSetupDays] = useState<number[]>([]);
  const [setupStartTime, setSetupStartTime] = useState('18:00');
  const [setupEndTime, setSetupEndTime] = useState('19:00');

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
  const { data: roadmapHistory, isRefetching: historyRefetching, refetch: refetchRoadmapHistory } = useQuery<RoadmapRecord[]>({
    queryKey: ['roadmap', 'history'],
    queryFn: coachService.history,
  });
  const { data: availability, isRefetching: availabilityRefetching, refetch: refetchAvailability } = useQuery({
    queryKey: ['availability', 'me'],
    queryFn: healthTrackingService.availability,
  });
  const { data: todayPlan, isRefetching: planRefetching, refetch: refetchTodayPlan } = useQuery<DailyPlanResponse>({
    queryKey: ['daily-plan', 'today'],
    queryFn: dailyPlanService.today,
    enabled: Boolean(activeRoadmap),
  });
  const refreshing = roadmapRefetching || historyRefetching || availabilityRefetching || planRefetching;
  const errorMessage = roadmapFailed ? 'Không thể tải lộ trình.' : null;

  const loadData = useCallback(async () => {
    const results: Promise<unknown>[] = [refetchRoadmap(), refetchRoadmapHistory(), refetchAvailability()];
    if (activeRoadmap) results.push(refetchTodayPlan());
    await Promise.all(results);
  }, [activeRoadmap, refetchAvailability, refetchRoadmap, refetchRoadmapHistory, refetchTodayPlan]);

  useFocusEffect(useCallback(() => {
    if (!focusedBefore.current) {
      focusedBefore.current = true;
      return;
    }
    void loadData();
  }, [loadData]));

  const onRefresh = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const results: Promise<unknown>[] = [refetchRoadmap(), refetchRoadmapHistory(), refetchAvailability()];
    if (activeRoadmap) results.push(refetchTodayPlan());
    void Promise.all(results);
  }, [activeRoadmap, refetchAvailability, refetchRoadmap, refetchRoadmapHistory, refetchTodayPlan]);

  const navigate = (route: HomeRoute) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    navigationService.navigate(route);
  };

  const continueRoadmapCreation = () => {
    if (!setupGoal.trim() || setupDays.length === 0) return;
    const dayLabels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    const context = [
      `Mức vận động: ${setupActivityLevel || 'chưa cung cấp'}`,
      `Giới tính: ${setupGender || 'chưa cung cấp'}`,
      `Tuổi: ${setupAge || 'chưa cung cấp'}; chiều cao: ${setupHeight || 'chưa cung cấp'} cm; cân nặng: ${setupWeight || 'chưa cung cấp'} kg`,
      `Kinh nghiệm tập: ${setupExperience || 'chưa cung cấp'}`,
      `Nơi tập: ${setupLocation || 'chưa cung cấp'}; thiết bị: ${setupEquipment || 'chưa cung cấp'}`,
      `Thời lượng mỗi buổi: ${setupSessionMinutes || 'chưa cung cấp'} phút; cường độ mong muốn: ${setupIntensity || 'chưa cung cấp'}`,
      `Lịch rảnh: ${setupDays.sort((a, b) => a - b).map((day) => dayLabels[day - 1]).join(', ')}, ${setupStartTime}-${setupEndTime}`,
      `Hoạt động yêu thích/không thích: ${setupActivities || 'chưa cung cấp'}`,
      `Giấc ngủ/phục hồi: ${setupSleep || 'chưa cung cấp'}`,
      `Hạn chế vận động: ${setupRestrictions || 'không có'}`,
      `Vùng đau: ${setupPainAreas || 'không có'}`,
      `Lưu ý sức khỏe khác: ${setupMedicalNotes || 'không có'}`,
    ].join('\n');
    setShowRoadmapSetup(false);
    router.push({ pathname: '/(user)/roadmap', params: { create: '1', goal: setupGoal.trim(), weeks: String(setupWeeks), days: setupDays.join(','), start: setupStartTime, end: setupEndTime, context } });
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#635BFF" colors={['#635BFF']} />}
        contentContainerStyle={[styles.scrollContainer, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 92 }]}
      >
        <View style={styles.mainWrapper}>
          <HomeHeader
            username={username}
            avatarUrl={null}
            gender={null}
            onLogout={logout}
            topInset={insets.top}
          />

          {activeRoadmap ? <WeeklyCalendarPreview
            availability={availability ?? []}
            plan={todayPlan}
            onOpen={() => navigate('DailyPlan')}
            onOpenDate={(date) => router.push({ pathname: '/(user)/daily-plan', params: { date } })}
          /> : null}

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
                style={({ pressed }) => [styles.actionCard, pressed && styles.pressed]}
              >
                <View style={[styles.actionIcon, { backgroundColor: action.background }]}>
                  <Ionicons name={action.icon} size={22} color={action.color} />
                </View>
                <View style={styles.actionCopy}>
                  <Text style={styles.actionTitle} numberOfLines={1}>{action.title}</Text>
                  <Text style={styles.actionDetail} numberOfLines={2}>{action.detail}</Text>
                </View>
              </Pressable>
            ))}
          </View>

          {roadmapHistory?.length ? <View style={styles.recentSection}>
            <View style={styles.recentHeading}><Text style={styles.sectionTitle}>Lộ trình gần đây</Text><Pressable onPress={() => navigate('Roadmap')} accessibilityRole="button"><Text style={styles.recentAll}>Xem tất cả</Text></Pressable></View>
            {roadmapHistory.slice(0, 3).map((roadmap) => <Pressable key={roadmap.id} onPress={() => navigate('Roadmap')} style={({ pressed }) => [styles.recentRoadmap, pressed && styles.pressed]} accessibilityRole="button">
              <View style={[styles.recentRoadmapIcon, roadmap.status === 'ACTIVE' && styles.recentRoadmapIconActive]}><Ionicons name={roadmap.status === 'ACTIVE' ? 'sparkles' : 'archive-outline'} size={18} color={roadmap.status === 'ACTIVE' ? '#FFFFFF' : '#635BFF'} /></View>
              <View style={{ flex: 1, minWidth: 0 }}><Text style={styles.recentRoadmapTitle} numberOfLines={1}>{roadmap.title}</Text><Text style={styles.recentRoadmapMeta}>{roadmap.status === 'ACTIVE' ? 'Đang theo dõi' : 'Đã lưu'} · {roadmap.durationWeeks ?? 0} tuần</Text></View>
              <Ionicons name="chevron-forward" size={19} color="#7A8099" />
            </Pressable>)}
          </View> : null}

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
      }} />

      <Modal visible={showRoadmapSetup} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowRoadmapSetup(false)}>
        <View style={{ flex: 1, backgroundColor: '#F7F8FC' }}>
          <View style={{ minHeight: 62, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, borderBottomWidth: 1, borderColor: '#E8EAF4', backgroundColor: '#FFFFFF' }}>
            <View><Text style={{ color: '#20213A', fontSize: 18, fontWeight: '800' }}>Thiết lập lộ trình</Text><Text style={{ color: '#7A8099', fontSize: 11, marginTop: 2 }}>Thông tin dùng để tạo phương án phù hợp</Text></View>
            <Pressable onPress={() => setShowRoadmapSetup(false)} accessibilityRole="button" accessibilityLabel="Đóng"><Ionicons name="close" size={24} color="#20213A" /></Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
            <SetupField label="Mục tiêu" value={setupGoal} onChangeText={setSetupGoal} placeholder="Ví dụ: giảm cân, tăng sức bền" />
            <SetupField label="Mức vận động hiện tại" value={setupActivityLevel} onChangeText={setSetupActivityLevel} placeholder="Ví dụ: Mới bắt đầu" />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}><SetupField label="Tuổi" value={setupAge} onChangeText={setSetupAge} placeholder="25" keyboardType="number-pad" /></View>
              <View style={{ flex: 1 }}><SetupField label="Chiều cao (cm)" value={setupHeight} onChangeText={setSetupHeight} placeholder="170" keyboardType="decimal-pad" /></View>
            </View>
            <SetupField label="Cân nặng (kg)" value={setupWeight} onChangeText={setSetupWeight} placeholder="60" keyboardType="decimal-pad" />
            <SetupField label="Hạn chế vận động" value={setupRestrictions} onChangeText={setSetupRestrictions} placeholder="Không có" />
            <SetupField label="Vùng đau cần lưu ý" value={setupPainAreas} onChangeText={setSetupPainAreas} placeholder="Không có" />
            <SetupField label="Giới tính (tùy chọn)" value={setupGender} onChangeText={setSetupGender} placeholder="Không muốn nêu" />
            <SetupField label="Kinh nghiệm tập luyện" value={setupExperience} onChangeText={setSetupExperience} placeholder="Ví dụ: mới bắt đầu, đã tập 1 năm" />
            <SetupField label="Nơi tập" value={setupLocation} onChangeText={setSetupLocation} placeholder="Ví dụ: tại nhà, phòng gym" />
            <SetupField label="Dụng cụ sẵn có" value={setupEquipment} onChangeText={setSetupEquipment} placeholder="Ví dụ: tạ đơn 5kg, thảm tập" />
            <View style={{ gap: 8 }}>
              <Text style={{ color: '#20213A', fontSize: 13, fontWeight: '700' }}>Ngày bạn rảnh để tập</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((label, index) => {
                  const day = index + 1;
                  const selected = setupDays.includes(day);
                  return <Pressable key={day} onPress={() => setSetupDays((days) => selected ? days.filter((item) => item !== day) : [...days, day])} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} style={{ flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: selected ? '#635BFF' : '#DDE1EE', backgroundColor: selected ? '#EFEEFF' : '#FFFFFF' }}><Text style={{ color: selected ? '#4438CA' : '#4A5069', fontSize: 11, fontWeight: '700' }}>{label}</Text></Pressable>;
                })}
              </View>
              {setupDays.length === 0 ? <Text style={{ color: '#D95070', fontSize: 11 }}>Chọn ít nhất một ngày rảnh.</Text> : null}
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}><SetupField label="Bắt đầu" value={setupStartTime} onChangeText={setSetupStartTime} placeholder="18:00" /></View>
              <View style={{ flex: 1 }}><SetupField label="Kết thúc" value={setupEndTime} onChangeText={setSetupEndTime} placeholder="19:00" /></View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}><SetupField label="Phút mỗi buổi" value={setupSessionMinutes} onChangeText={setSetupSessionMinutes} placeholder="45" keyboardType="number-pad" /></View>
              <View style={{ flex: 1 }}><SetupField label="Cường độ mong muốn" value={setupIntensity} onChangeText={setSetupIntensity} placeholder="Nhẹ đến vừa" /></View>
            </View>
            <SetupField label="Bài tập bạn thích hoặc không muốn tập" value={setupActivities} onChangeText={setSetupActivities} placeholder="Ví dụ: thích đi bộ, không muốn nhảy" />
            <SetupField label="Giấc ngủ và khả năng phục hồi" value={setupSleep} onChangeText={setSetupSleep} placeholder="Ví dụ: ngủ 6 giờ, thường mệt buổi tối" />
            <SetupField label="Lưu ý sức khỏe khác" value={setupMedicalNotes} onChangeText={setSetupMedicalNotes} placeholder="Ví dụ: huyết áp, bệnh nền, thuốc đang dùng" />
            <Text style={{ color: '#20213A', fontSize: 13, fontWeight: '700', marginTop: 4 }}>Thời lượng lộ trình</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>{[2, 4, 8].map((value) => <Pressable key={value} onPress={() => setSetupWeeks(value)} accessibilityRole="radio" accessibilityState={{ selected: setupWeeks === value }} style={{ flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: setupWeeks === value ? '#635BFF' : '#DDE1EE', backgroundColor: setupWeeks === value ? '#EFEEFF' : '#FFFFFF' }}><Text style={{ color: setupWeeks === value ? '#4438CA' : '#4A5069', fontWeight: '700' }}>{value} tuần</Text></Pressable>)}</View>
            <Pressable onPress={continueRoadmapCreation} disabled={!setupGoal.trim() || setupDays.length === 0} accessibilityRole="button" style={{ minHeight: 50, marginTop: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#635BFF', opacity: setupGoal.trim() && setupDays.length > 0 ? 1 : 0.45 }}><Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>Tạo lộ trình cá nhân</Text></Pressable>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function SetupField({ label, value, onChangeText, placeholder, keyboardType = 'default' }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; keyboardType?: 'default' | 'number-pad' | 'decimal-pad' }) {
  return <View style={{ gap: 6 }}><Text style={{ color: '#20213A', fontSize: 13, fontWeight: '700' }}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#9AA1B8" keyboardType={keyboardType} style={{ minHeight: 46, paddingHorizontal: 12, borderWidth: 1, borderColor: '#DDE1EE', borderRadius: 8, backgroundColor: '#FFFFFF', color: '#20213A' }} /></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7F8FC' },
  scrollContainer: { paddingHorizontal: 16 },
  mainWrapper: { width: '100%' },
  hero: { backgroundColor: '#F0F0FF', borderRadius: 20, borderWidth: 1, borderColor: '#E5E3FF', padding: 16, overflow: 'hidden' },
  heroCopy: { alignItems: 'flex-start' },
  brandBadge: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: '#E4E1FF', borderRadius: 18, marginBottom: 12 },
  brandBadgeText: { color: '#4438CA', fontSize: 12, fontWeight: '700' },
  heroTitle: { color: '#20213A', fontSize: 21, lineHeight: 27, fontWeight: '800' },
  heroDescription: { color: '#656B87', fontSize: 12, lineHeight: 18, marginTop: 8 },
  heroButton: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, minHeight: 48, paddingHorizontal: 16, backgroundColor: '#635BFF', borderRadius: 14, marginTop: 16 },
  heroButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  heroArt: { width: '100%', height: 156, marginTop: 16, borderRadius: 14, overflow: 'hidden' },
  heroImage: { width: '100%', height: '100%' },
  sectionHeading: { marginTop: 22, marginBottom: 11 },
  sectionTitle: { color: '#20213A', fontSize: 18, fontWeight: '800' },
  actionGrid: { gap: 10 },
  actionCard: { width: '100%', minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderWidth: 1, borderColor: '#E8EAF4', borderRadius: 14, backgroundColor: '#FFFFFF' },
  actionIcon: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  actionCopy: { flex: 1, minWidth: 0 },
  actionTitle: { color: '#20213A', fontSize: 14, lineHeight: 19, fontWeight: '800' },
  actionDetail: { color: '#7A8099', fontSize: 12, lineHeight: 17, marginTop: 3 },
  recentSection: { marginTop: 22 },
  recentHeading: { minHeight: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  recentAll: { color: '#268FCB', fontSize: 12, fontWeight: '800' },
  recentRoadmap: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, marginTop: 8, borderWidth: 1, borderColor: '#E8EAF4', borderRadius: 13, backgroundColor: '#FFFFFF' },
  recentRoadmapIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EFEEFF' },
  recentRoadmapIconActive: { backgroundColor: '#635BFF' },
  recentRoadmapTitle: { color: '#20213A', fontSize: 13, fontWeight: '800' },
  recentRoadmapMeta: { color: '#7A8099', fontSize: 11, marginTop: 3 },
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
