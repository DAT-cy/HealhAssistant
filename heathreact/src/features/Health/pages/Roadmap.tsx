import React, { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Screen from '@/components/ui/Screen';
import Card from '@/components/ui/Card';
import AppButton from '@/components/ui/AppButton';
import { ErrorState, LoadingState } from '@/components/ui/StateViews';
import { palette } from '@/theme/tokens';
import { useRoadmap } from '@/hooks/useRoadmap';
import { coachService } from '@/api/services/coach.service';
import { healthTrackingService, type AvailabilitySlot } from '@/api/services/health-tracking.service';
import { dailyPlanService } from '@/api/services/daily-plan.service';
import { navigationService } from '@/routes';
import { ApiError } from '@/api/client';
import RoadmapWizard, { GenerationScene, type RoadmapWizardData } from '@/features/Health/components/RoadmapWizard';
import { profileService, type ProfileResponse } from '@/api/services/profile.service';
import { useUserStore } from '@/stores/user';

const variants = ['Vận động nhẹ', 'Linh hoạt và phục hồi', 'Sức mạnh toàn thân'];

export default function RoadmapPage() {
  const roadmap = useRoadmap();
  const queryClient = useQueryClient();
  const username = useUserStore((state) => state.username);
  const profileQuery = useQuery<ProfileResponse | null>({
    queryKey: ['profile', 'me'],
    queryFn: async () => {
      try { return await profileService.getMine(); }
      catch (error) { if (error instanceof ApiError && error.status === 404) return null; throw error; }
    },
  });
  const [weeks, setWeeks] = useState(2);
  const [fullName, setFullName] = useState('');
  const [roadmapName, setRoadmapName] = useState('');
  const [draftId, setDraftId] = useState<number | null>(null);
  const [showNameModal, setShowNameModal] = useState(false);
  const [draftNameInput, setDraftNameInput] = useState('');
  const [editingDraftId, setEditingDraftId] = useState<number | null>(null);
  const [draftSaving, setDraftSaving] = useState(false);
  const [draftModalError, setDraftModalError] = useState('');
  const showScheduleDetails = false;
  const [roadmapGoal, setRoadmapGoal] = useState('');
  const [bodyFocus, setBodyFocus] = useState('');
  const [creating, setCreating] = useState(false);
  const [activityLevel, setActivityLevel] = useState('');
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [gender, setGender] = useState('');
  const [experience, setExperience] = useState('');
  const [location, setLocation] = useState('');
  const [equipment, setEquipment] = useState('');
  const [restrictions, setRestrictions] = useState('');
  const [painAreas, setPainAreas] = useState('');
  const [availableDays, setAvailableDays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('19:00');
  const [scheduleSlots, setScheduleSlots] = useState<{ period: string; startTime: string; endTime: string }[]>([]);
  const [sessionMinutes, setSessionMinutes] = useState('45');
  const [intensity, setIntensity] = useState('');
  const [activities, setActivities] = useState('');
  const [sleep, setSleep] = useState('');
  const [medicalNotes, setMedicalNotes] = useState('');
  const [medicalConditions, setMedicalConditions] = useState('');
  const [medications, setMedications] = useState('');
  const [allergies, setAllergies] = useState('');
  const [workSchedule, setWorkSchedule] = useState('');
  const [stressLevel, setStressLevel] = useState('');
  const [dailyMovement, setDailyMovement] = useState('');
  const [mealRoutine, setMealRoutine] = useState('');
  const [foodPreferences, setFoodPreferences] = useState('');
  const [dietaryNeeds, setDietaryNeeds] = useState('');
  const [waterIntake, setWaterIntake] = useState('');
  const [supplements, setSupplements] = useState('');
  const [mobility, setMobility] = useState('');
  const [trainingStyle, setTrainingStyle] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [compareWithPrevious, setCompareWithPrevious] = useState(false);
  const [adjustmentBusy, setAdjustmentBusy] = useState(false);
  const [adjustmentMessage, setAdjustmentMessage] = useState('');

  const isCreating = creating;

  useEffect(() => {
    const profile = profileQuery.data;
    if (!profile) return;
    // Profile values are copied once into the editable form model after the settings request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFullName(username);
    setAge(profile.age?.toString() ?? '');
    setHeight(profile.heightCm?.toString() ?? '');
    setWeight(profile.weightKg?.toString() ?? '');
    setGender(profile.gender ?? '');
    setActivityLevel(profile.activityLevel ?? '');
    setRestrictions(profile.restrictions ?? '');
    setPainAreas(profile.painAreas ?? '');
  }, [profileQuery.data, username]);

  const activeQuery = useQuery({
    queryKey: ['roadmap', 'active'],
    queryFn: async () => {
      try { return await coachService.active(); }
      catch (error) { if (error instanceof ApiError && error.status === 404) return null; throw error; }
    },
  });
  const historyQuery = useQuery({
    queryKey: ['roadmap', 'history'],
    queryFn: coachService.history,
  });
  const adjustmentQuery = useQuery({
    queryKey: ['plan-adjustments', 'me'],
    queryFn: coachService.adjustmentHistory,
  });
  const availabilityQuery = useQuery({
    queryKey: ['availability', 'me'],
    queryFn: healthTrackingService.availability,
    enabled: Boolean(activeQuery.data),
  });

  const generate = () => {
    if (!roadmapGoal.trim()) return;
    setSelected(null);
    const dayLabels = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
    const context = [
      `THÔNG TIN CƠ BẢN: Họ tên: ${fullName || 'chưa cung cấp'}; tuổi: ${age || 'chưa cung cấp'}; giới tính: ${gender || 'chưa cung cấp'}; chiều cao: ${height || 'chưa cung cấp'} cm; cân nặng: ${weight || 'chưa cung cấp'} kg; vùng cơ thể/mục tiêu ưu tiên: ${bodyFocus || 'chưa cung cấp'}.`,
      `SỨC KHỎE: Bệnh lý: ${medicalConditions || 'không có'}; chấn thương/hạn chế: ${restrictions || 'không có'}; vùng đau: ${painAreas || 'không có'}; thuốc: ${medications || 'không có'}; dị ứng: ${allergies || 'không có'}; lưu ý khác: ${medicalNotes || 'không có'}.`,
      `THÓI QUEN: Giấc ngủ/phục hồi: ${sleep || 'chưa cung cấp'}; công việc/học tập: ${workSchedule || 'chưa cung cấp'}; mức căng thẳng: ${stressLevel || 'chưa cung cấp'}; vận động hằng ngày: ${dailyMovement || 'chưa cung cấp'}; mức vận động hiện tại: ${activityLevel || 'chưa cung cấp'}.`,
      `DINH DƯỠNG: Thói quen ăn uống: ${mealRoutine || 'chưa cung cấp'}; sở thích/không thích: ${foodPreferences || 'chưa cung cấp'}; chế độ ăn/kiêng: ${dietaryNeeds || 'không có'}; lượng nước: ${waterIntake || 'chưa cung cấp'}; thực phẩm bổ sung: ${supplements || 'không có'}.`,
      `MỤC TIÊU: ${roadmapGoal.trim()}; vùng cần cải thiện: ${bodyFocus || 'chưa cung cấp'}; thời lượng mong muốn: ${weeks} tuần.`,
      `KHẢ NĂNG TẬP: Kinh nghiệm: ${experience || 'chưa cung cấp'}; nơi tập: ${location || 'chưa cung cấp'}; dụng cụ: ${equipment || 'không có'}; khả năng di chuyển: ${mobility || 'chưa cung cấp'}; phong cách tập: ${trainingStyle || 'chưa cung cấp'}; bài tập thích/không thích: ${activities || 'chưa cung cấp'}; cường độ: ${intensity || 'chưa cung cấp'}.`,
      `LỊCH TẬP: ${availableDays.length ? [...availableDays].sort((a, b) => a - b).map((day) => dayLabels[day - 1]).join(', ') : 'chưa chọn'}, ${startTime}-${endTime}; ${sessionMinutes || '45'} phút mỗi buổi.`,
    ].join('\n');
    void roadmap.generate(roadmapGoal.trim(), weeks, context, restrictions || undefined);
  };
  const selectedPlan = selected === null ? null : roadmap.options[selected];
  const previousVersion = activeQuery.data?.previousRoadmapId
    ? historyQuery.data?.find((item) => item.id === activeQuery.data?.previousRoadmapId)
    : undefined;
  const pendingAdjustment = adjustmentQuery.data?.find((item) => item.status === 'PROPOSED');
  const scheduledDays = availableDays;

  const evaluateAdjustment = async () => {
    setAdjustmentBusy(true);
    setAdjustmentMessage('');
    try {
      const result = await coachService.evaluateAdjustment();
      setAdjustmentMessage(result.message);
      await adjustmentQuery.refetch();
    } catch (error) {
      setAdjustmentMessage(error instanceof ApiError ? error.message : 'Không thể đánh giá check-in.');
    } finally {
      setAdjustmentBusy(false);
    }
  };

  const decideAdjustment = async (decision: 'accept' | 'reject') => {
    if (!pendingAdjustment) return;
    setAdjustmentBusy(true);
    setAdjustmentMessage('');
    try {
      if (decision === 'accept') {
        await coachService.acceptAdjustment(pendingAdjustment.id);
        setAdjustmentMessage('Đã áp dụng phiên bản điều chỉnh mới.');
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['roadmap'] }),
          queryClient.invalidateQueries({ queryKey: ['plan-adjustments'] }),
        ]);
      } else {
        await coachService.rejectAdjustment(pendingAdjustment.id);
        setAdjustmentMessage('Đã từ chối đề xuất. Lộ trình hiện tại không thay đổi.');
        await adjustmentQuery.refetch();
      }
    } catch (error) {
      setAdjustmentMessage(error instanceof ApiError ? error.message : 'Không thể xử lý đề xuất.');
    } finally {
      setAdjustmentBusy(false);
    }
  };

  const saveRoadmapName = async (name: string) => {
    try {
      const draft = await coachService.createDraft(name);
      setDraftId(draft.id);
      return draft.id;
    } catch (error) {
      setAdjustmentMessage(error instanceof ApiError ? error.message : 'Không thể lưu tên lộ trình.');
      return null;
    }
  };

  const openNameModal = () => {
    setDraftNameInput('');
    setEditingDraftId(null);
    setDraftModalError('');
    setShowNameModal(true);
  };

  const openEditDraftModal = (id: number, title: string) => {
    setEditingDraftId(id);
    setDraftNameInput(title);
    setDraftModalError('');
    setShowNameModal(true);
  };

  const createNamedDraft = async () => {
    const name = draftNameInput.trim();
    if (!name) return;
    setDraftSaving(true);
    setDraftModalError('');
    try {
      if (editingDraftId !== null) {
        await coachService.renameDraft(editingDraftId, name);
      } else {
        const created = await saveRoadmapName(name);
        if (!created) throw new Error('Không thể lưu tên lộ trình.');
      }
      setRoadmapName(name);
      setShowNameModal(false);
      await historyQuery.refetch();
    } catch (error) {
      setDraftModalError(error instanceof ApiError ? error.message : 'Không thể lưu tên lộ trình.');
    } finally {
      setDraftSaving(false);
    }
  };

  const deleteDraft = (id: number) => {
    Alert.alert('Xóa bản nháp?', 'Bản nháp này sẽ bị xóa khỏi danh sách lộ trình.', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: () => { void coachService.deleteDraft(id).then(async () => { if (draftId === id) { setDraftId(null); setRoadmapName(''); } await historyQuery.refetch(); }).catch((error) => setAdjustmentMessage(error instanceof ApiError ? error.message : 'Không thể xóa bản nháp.')); } },
    ]);
  };

  const submitWizard = (data: RoadmapWizardData) => {
    setFullName(data.fullName); setRoadmapName(data.roadmapName); setRoadmapGoal(data.goal); setBodyFocus(data.bodyFocus); setWeeks(data.weeks);
    setAge(data.age); setHeight(data.height); setWeight(data.weight); setGender(data.gender); setActivityLevel(data.activityLevel); setExperience(data.experience);
    setMedicalConditions(data.medicalConditions); setRestrictions(data.restrictions); setPainAreas(data.painAreas); setMedications(data.medications); setAllergies(data.allergies); setMedicalNotes(data.medicalNotes);
    setSleep(data.sleep); setWorkSchedule(data.workSchedule); setStressLevel(data.stressLevel); setDailyMovement(data.dailyMovement);
    setMealRoutine(data.mealRoutine); setFoodPreferences(data.foodPreferences); setDietaryNeeds(data.dietaryNeeds); setWaterIntake(data.waterIntake); setSupplements(data.supplements);
    setLocation(data.location); setEquipment(data.equipment); setMobility(data.mobility); setTrainingStyle(data.trainingStyle); setActivities(data.activities); setIntensity(data.intensity); setSessionMinutes(data.sessionMinutes);
    setAvailableDays(data.availableDays); setStartTime(data.timeSlots[0]?.startTime ?? data.startTime); setEndTime(data.timeSlots[0]?.endTime ?? data.endTime); setScheduleSlots(data.timeSlots); setCreating(false); setSelected(null);
    const dayLabels = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
    const context = [
      `THÔNG TIN CƠ BẢN: Họ tên: ${data.fullName || 'chưa cung cấp'}; tuổi: ${data.age || 'chưa cung cấp'}; giới tính: ${data.gender || 'chưa cung cấp'}; chiều cao: ${data.height || 'chưa cung cấp'} cm; cân nặng: ${data.weight || 'chưa cung cấp'} kg; vùng mục tiêu: ${data.bodyFocus || 'chưa cung cấp'}.`,
      `SỨC KHỎE: Bệnh lý: ${data.medicalConditions || 'không có'}; hạn chế: ${data.restrictions || 'không có'}; vùng đau: ${data.painAreas || 'không có'}; thuốc: ${data.medications || 'không có'}; dị ứng: ${data.allergies || 'không có'}; lưu ý: ${data.medicalNotes || 'không có'}.`,
      `THÓI QUEN: Ngủ/phục hồi: ${data.sleep || 'chưa cung cấp'}; công việc: ${data.workSchedule || 'chưa cung cấp'}; stress: ${data.stressLevel || 'chưa cung cấp'}; vận động hằng ngày: ${data.dailyMovement || 'chưa cung cấp'}.`,
      `DINH DƯỠNG: ${data.mealRoutine || 'chưa cung cấp'}; sở thích: ${data.foodPreferences || 'chưa cung cấp'}; kiêng/dị ứng: ${data.dietaryNeeds || 'không có'}; nước: ${data.waterIntake || 'chưa cung cấp'}; bổ sung: ${data.supplements || 'không có'}.`,
      `KHẢ NĂNG: Kinh nghiệm: ${data.experience || 'chưa cung cấp'}; nơi tập: ${data.location || 'chưa cung cấp'}; dụng cụ: ${data.equipment || 'không có'}; di chuyển: ${data.mobility || 'chưa cung cấp'}; phong cách: ${data.trainingStyle || 'chưa cung cấp'}; bài thích/không thích: ${data.activities || 'chưa cung cấp'}; cường độ: ${data.intensity || 'chưa cung cấp'}.`,
      `LỊCH: ${data.availableDays.map((day) => dayLabels[day - 1]).join(', ')}; ${data.startTime}-${data.endTime}; ${data.sessionMinutes || '45'} phút mỗi buổi.`,
    ].join('\n');
    void roadmap.generate(data.goal.trim(), data.weeks, context, data.restrictions || undefined);
  };

  const wizardInitial: RoadmapWizardData = {
    fullName, goal: roadmapGoal, bodyFocus, roadmapName, weeks, age, height, weight, gender, activityLevel, experience,
    medicalConditions, restrictions, painAreas, medications, allergies, medicalNotes, sleep, workSchedule, stressLevel, dailyMovement,
    mealRoutine, foodPreferences, dietaryNeeds, waterIntake, supplements, location, equipment, mobility, trainingStyle, activities,
    intensity, sessionMinutes, availableDays, startTime, endTime, timeSlots: scheduleSlots,
  };

  if (isCreating) return <RoadmapWizard key="roadmap-wizard" initial={wizardInitial} onSubmit={submitWizard} onCancel={() => setCreating(false)} />;

  return <Screen
    title="Lộ trình của bạn"
    subtitle="Xem trước và chọn kế hoạch phù hợp"
    showBack
    right={<Pressable onPress={openNameModal} accessibilityRole="button" accessibilityLabel="Thêm lộ trình mới" hitSlop={10} style={{ width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 23, borderWidth: 2, borderColor: '#FFFFFF', backgroundColor: '#2563EB', boxShadow: '0px 4px 10px rgba(37, 99, 235, 0.32)' }}>
      <Text style={{ color: '#FFFFFF', fontSize: 30, fontWeight: '700', lineHeight: 32 }}>+</Text>
    </Pressable>}
  >
    {!isCreating && !confirmed && roadmap.options.length === 0 ? <View style={{ paddingBottom: 4 }}>
      <Text style={{ color: palette.text, fontSize: 17, fontWeight: '800' }}>Danh sách lộ trình</Text>
      <Text style={{ color: palette.textMuted, fontSize: 12, marginTop: 3 }}>Tạo mới hoặc xem lại các kế hoạch đã lưu</Text>
    </View> : null}
    {activeQuery.isPending ? <LoadingState label="Đang tải lộ trình hiện tại..." /> : null}
    {activeQuery.isError ? <ErrorState message="Không thể tải lộ trình hiện tại." onRetry={() => void activeQuery.refetch()} /> : null}
    {activeQuery.data && !showScheduleDetails ? <Card style={{ borderColor: '#B9B5FF', backgroundColor: '#F5F4FF' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#E3E1FF' }}><Ionicons name="sparkles-outline" size={22} color={palette.primary} /></View>
        <View style={{ flex: 1 }}><Text style={{ color: palette.primaryDark, fontSize: 15, fontWeight: '800' }}>{activeQuery.data.title}</Text><Text style={{ color: palette.textMuted, fontSize: 11, marginTop: 3 }}>Đang hoạt động · {activeQuery.data.durationWeeks ?? 0} tuần</Text></View>
        <Ionicons name="checkmark-circle" size={21} color={palette.success} />
      </View>
      <Pressable onPress={() => router.push('/(user)/daily-plan')} accessibilityRole="button" style={{ minHeight: 44, marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 11, backgroundColor: palette.primary }}><Ionicons name="calendar-outline" size={18} color="#FFFFFF" /><Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>Xem chi tiết lịch</Text><Ionicons name="arrow-forward" size={16} color="#FFFFFF" /></Pressable>
    </Card> : null}
    {activeQuery.data && showScheduleDetails ? <>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <Text style={{ color: palette.primary, fontSize: 12, fontWeight: '800' }}>ĐANG HOẠT ĐỘNG · PHIÊN BẢN {activeQuery.data.versionNumber ?? '—'}</Text>
          <Text style={{ color: palette.textMuted, fontSize: 11 }}>{activeQuery.data.durationWeeks ?? 0} tuần</Text>
        </View>
        <Text style={{ color: palette.text, fontSize: 18, fontWeight: '800', marginTop: 8 }}>{activeQuery.data.title}</Text>
        <Text style={{ color: palette.textMuted, lineHeight: 20, marginTop: 6 }}>{activeQuery.data.overview}</Text>
        <Text style={{ color: palette.textMuted, fontSize: 11, marginTop: 8 }}>Bắt đầu {activeQuery.data.startDate ?? 'chưa xác định'} · {activeQuery.data.source === 'gemini' ? 'Đề xuất AI' : 'Kế hoạch dự phòng'}</Text>
        {activeQuery.data.changeReason ? <Text style={{ color: palette.textMuted, fontSize: 11, marginTop: 4 }}>Lý do phiên bản: {activeQuery.data.changeReason === 'INITIAL_PLAN' ? 'Kế hoạch ban đầu' : 'Bạn xác nhận phương án mới'}</Text> : null}
        {previousVersion ? <Pressable onPress={() => setCompareWithPrevious((value) => !value)} accessibilityRole="button" style={{ minHeight: 42, marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 9, borderWidth: 1, borderColor: palette.border }}>
          <Text style={{ color: palette.primary, fontWeight: '700', fontSize: 12 }}>{compareWithPrevious ? 'Ẩn so sánh phiên bản' : `So sánh với phiên bản ${previousVersion.versionNumber ?? 'trước'}`}</Text>
        </Pressable> : null}
      </Card>
      <Pressable onPress={() => router.push('/(user)/daily-plan')} accessibilityRole="button" style={{ minHeight: 48, marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, backgroundColor: palette.primary }}>
        <Ionicons name="calendar-outline" size={19} color="#FFFFFF" /><Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>Xem chi tiết lịch theo ngày</Text><Ionicons name="arrow-forward" size={17} color="#FFFFFF" />
      </Pressable>
      {compareWithPrevious && previousVersion ? <View style={{ flexDirection: 'row', gap: 8 }}>
        <Card style={{ flex: 1 }}><Text style={{ color: palette.text, fontWeight: '800', fontSize: 12 }}>Hiện tại · v{activeQuery.data.versionNumber ?? '—'}</Text><Text style={{ color: palette.textMuted, fontSize: 11, lineHeight: 17, marginTop: 7 }}>{activeQuery.data.overview}</Text></Card>
        <Card style={{ flex: 1 }}><Text style={{ color: palette.text, fontWeight: '800', fontSize: 12 }}>Trước đó · v{previousVersion.versionNumber ?? '—'}</Text><Text style={{ color: palette.textMuted, fontSize: 11, lineHeight: 17, marginTop: 7 }}>{previousVersion.overview}</Text></Card>
      </View> : null}
      <Pressable onPress={() => void evaluateAdjustment()} disabled={adjustmentBusy} accessibilityRole="button" style={{ minHeight: 44, marginTop: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: palette.primarySoft, opacity: adjustmentBusy ? 0.6 : 1 }}>
        <Text style={{ color: palette.primary, fontSize: 12, fontWeight: '800' }}>{adjustmentBusy ? 'Đang đánh giá...' : 'Đánh giá check-in để đề xuất giảm tải'}</Text>
      </Pressable>
      {adjustmentMessage ? <Text accessibilityLiveRegion="polite" style={{ color: adjustmentMessage.startsWith('Đã') ? palette.primary : palette.textMuted, fontSize: 12, lineHeight: 18, marginTop: 8 }}>{adjustmentMessage}</Text> : null}
      {showScheduleDetails ? <RoadmapCalendar roadmapStart={activeQuery.data.startDate} availability={availabilityQuery.data ?? []} /> : null}
    </> : null}
    {adjustmentQuery.isError ? <ErrorState message="Không thể tải lịch sử đề xuất điều chỉnh." onRetry={() => void adjustmentQuery.refetch()} /> : null}
    {pendingAdjustment ? <Card>
      <Text style={{ color: palette.warning, fontSize: 11, fontWeight: '800' }}>ĐỀ XUẤT CHỜ XÁC NHẬN</Text>
      <Text style={{ color: palette.text, fontSize: 15, fontWeight: '800', marginTop: 7 }}>Giảm tải tuần {pendingAdjustment.proposedChanges.weekIndex + 1}</Text>
      <Text style={{ color: palette.textMuted, fontSize: 12, lineHeight: 18, marginTop: 5 }}>{pendingAdjustment.reason}</Text>
      <Text style={{ color: palette.textMuted, fontSize: 11, marginTop: 7 }}>Check-in liên quan: {pendingAdjustment.proposedChanges.checkinDates.join(', ')}</Text>
      <View style={{ marginTop: 12, padding: 10, borderRadius: 9, backgroundColor: palette.surfaceRaised }}>
        <Text style={{ color: palette.textMuted, fontSize: 10, fontWeight: '700' }}>TRỌNG TÂM HIỆN TẠI</Text>
        <Text style={{ color: palette.text, fontSize: 12, lineHeight: 18, marginTop: 4 }}>{pendingAdjustment.proposedChanges.currentWeeklyPlan[pendingAdjustment.proposedChanges.weekIndex]}</Text>
        <Text style={{ color: palette.primary, fontSize: 10, fontWeight: '700', marginTop: 10 }}>ĐỀ XUẤT</Text>
        <Text style={{ color: palette.text, fontSize: 12, lineHeight: 18, marginTop: 4 }}>{pendingAdjustment.proposedChanges.proposedWeeklyPlan[pendingAdjustment.proposedChanges.weekIndex]}</Text>
      </View>
      <Text style={{ color: palette.textMuted, fontSize: 10, lineHeight: 15, marginTop: 9 }}>Đề xuất dựa trên check-in tự khai báo; không phải chẩn đoán. Chỉ áp dụng khi bạn chấp nhận.</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        <AppButton label="Từ chối" variant="secondary" disabled={adjustmentBusy} onPress={() => void decideAdjustment('reject')} />
        <View style={{ flex: 1 }}><AppButton label="Chấp nhận điều chỉnh" disabled={adjustmentBusy} loading={adjustmentBusy} onPress={() => void decideAdjustment('accept')} /></View>
      </View>
    </Card> : null}
    {historyQuery.isError ? <ErrorState message="Không thể tải danh sách lộ trình." onRetry={() => void historyQuery.refetch()} /> : null}
    {historyQuery.data?.filter((item) => item.status === 'DRAFT').map((item) => <Pressable key={`draft-${item.id}`} onPress={() => { setDraftId(item.id); setRoadmapName(item.title); setCreating(true); }} accessibilityRole="button">
      <Card style={{ borderColor: '#B9B5FF', backgroundColor: '#F5F4FF' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#E3E1FF' }}><Ionicons name="document-text-outline" size={21} color={palette.primary} /></View>
          <View style={{ flex: 1 }}><Text style={{ color: palette.primaryDark, fontSize: 14, fontWeight: '800' }}>{item.title}</Text><Text style={{ color: palette.textMuted, fontSize: 11, marginTop: 3 }}>Bản nháp · Tiếp tục thiết lập để tạo lịch</Text></View>
          <Pressable onPress={() => openEditDraftModal(item.id, item.title)} accessibilityRole="button" accessibilityLabel={`Sửa tên ${item.title}`} hitSlop={8}><Ionicons name="pencil-outline" size={19} color={palette.primary} /></Pressable>
          <Pressable onPress={() => deleteDraft(item.id)} accessibilityRole="button" accessibilityLabel={`Xóa ${item.title}`} hitSlop={8}><Ionicons name="trash-outline" size={19} color={palette.danger} /></Pressable>
          <Ionicons name="chevron-forward" size={20} color={palette.primary} />
        </View>
      </Card>
    </Pressable>)}
    {false && isCreating && !confirmed && roadmap.options.length === 0 && roadmap.status !== 'loading' ? <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <Text style={{ flex: 1, color: palette.text, fontSize: 18, fontWeight: '800' }}>Tạo bản xem trước</Text>
        <Pressable onPress={() => setCreating(false)} accessibilityRole="button" accessibilityLabel="Quay lại danh sách lộ trình" hitSlop={8} style={({ pressed }) => [{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: palette.surfaceRaised }, pressed && { opacity: 0.72 }]}>
          <Ionicons name="close" size={20} color={palette.textMuted} />
        </Pressable>
      </View>
      <Text style={{ color: palette.textMuted, lineHeight: 21, marginTop: 8 }}>Càng chi tiết, AI càng hiểu rõ tình trạng và tạo bài tập phù hợp hơn.</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, padding: 10, borderRadius: 10, backgroundColor: palette.primarySoft }}>
        <Ionicons name="lock-closed-outline" size={16} color={palette.primary} />
        <Text style={{ flex: 1, color: palette.primaryDark, fontSize: 12, lineHeight: 17 }}>Thông tin cơ bản được lấy từ Hồ sơ/Cài đặt. Muốn cập nhật, hãy sửa tại mục Hồ sơ.</Text>
        <Pressable onPress={() => navigationService.navigate('Profile')} accessibilityRole="button" accessibilityLabel="Mở Hồ sơ và Cài đặt" hitSlop={6}><Ionicons name="open-outline" size={18} color={palette.primary} /></Pressable>
      </View>
      <FormSection number="1" title="Thông tin cơ bản" icon="person-outline" tint="#E8F2FF" accent="#2765B5">
        <RoadmapField label="Họ tên" value={fullName} onChangeText={setFullName} placeholder="Chưa cập nhật trong Hồ sơ" editable={false} />
        <RoadmapField label="Mục tiêu chính" value={roadmapGoal} onChangeText={setRoadmapGoal} placeholder="Ví dụ: giảm cân, tăng sức bền" required />
        <RoadmapField label="Vùng cơ thể hoặc mục tiêu muốn cải thiện" value={bodyFocus} onChangeText={setBodyFocus} placeholder="Ví dụ: bụng, đùi, cải thiện vóc dáng" />
        <RoadmapField label="Tên lộ trình" value={roadmapName} onChangeText={setRoadmapName} placeholder="Ví dụ: Khỏe hơn trong 4 tuần" />
        <View style={{ flexDirection: 'row', gap: 10 }}><View style={{ flex: 1 }}><RoadmapField label="Năm sinh (từ Hồ sơ)" value={age ? String(new Date().getFullYear() - Number(age)) : ''} onChangeText={() => {}} placeholder="Chưa cập nhật" keyboardType="number-pad" editable={false} /></View><View style={{ flex: 1 }}><RoadmapField label="Giới tính" value={gender} onChangeText={setGender} placeholder="Chưa cập nhật" editable={false} /></View></View>
        <View style={{ flexDirection: 'row', gap: 10 }}><View style={{ flex: 1 }}><RoadmapField label="Chiều cao (cm)" value={height} onChangeText={setHeight} placeholder="Chưa cập nhật" keyboardType="decimal-pad" editable={false} /></View><View style={{ flex: 1 }}><RoadmapField label="Cân nặng (kg)" value={weight} onChangeText={setWeight} placeholder="Chưa cập nhật" keyboardType="decimal-pad" editable={false} /></View></View>
      </FormSection>
      <FormSection number="2" title="Tình trạng sức khỏe hiện tại" icon="heart-outline" tint="#E9FAF2" accent="#269E6B">
        <RoadmapField label="Bệnh lý đang có" value={medicalConditions} onChangeText={setMedicalConditions} placeholder="Ví dụ: tim mạch, tiểu đường, dạ dày" />
        <RoadmapField label="Chấn thương hoặc vấn đề thể chất" value={restrictions} onChangeText={setRestrictions} placeholder="Cập nhật trong Hồ sơ" editable={false} />
        <RoadmapField label="Vùng đau cần lưu ý" value={painAreas} onChangeText={setPainAreas} placeholder="Cập nhật trong Hồ sơ" editable={false} />
        <RoadmapField label="Thuốc đang sử dụng" value={medications} onChangeText={setMedications} placeholder="Nếu có" />
        <RoadmapField label="Dị ứng thực phẩm" value={allergies} onChangeText={setAllergies} placeholder="Nếu có" />
        <RoadmapField label="Lưu ý sức khỏe khác" value={medicalNotes} onChangeText={setMedicalNotes} placeholder="Bệnh nền hoặc lưu ý khác" />
      </FormSection>
      <FormSection number="3" title="Thói quen sinh hoạt" icon="moon-outline" tint="#F1EDFF" accent="#6247BE">
        <RoadmapField label="Giấc ngủ (thời gian và chất lượng)" value={sleep} onChangeText={setSleep} placeholder="Ví dụ: ngủ 6 giờ, thường mệt buổi tối" />
        <RoadmapField label="Thời gian làm việc hoặc học tập" value={workSchedule} onChangeText={setWorkSchedule} placeholder="Ví dụ: ngồi 8 giờ/ngày" />
        <RoadmapField label="Mức độ căng thẳng" value={stressLevel} onChangeText={setStressLevel} placeholder="Thấp, vừa hoặc cao" />
        <RoadmapField label="Mức độ vận động hằng ngày" value={dailyMovement} onChangeText={setDailyMovement} placeholder="Ví dụ: đi bộ, đứng, ngồi nhiều" />
        <RoadmapField label="Mức vận động hiện tại" value={activityLevel} onChangeText={setActivityLevel} placeholder="Cập nhật trong Hồ sơ" editable={false} />
      </FormSection>
      <FormSection number="4" title="Chế độ dinh dưỡng hiện tại" icon="restaurant-outline" tint="#FFF1E5" accent="#E26D16">
        <RoadmapField label="Thói quen ăn uống" value={mealRoutine} onChangeText={setMealRoutine} placeholder="Ví dụ: 3 bữa/ngày, ăn vặt" />
        <RoadmapField label="Sở thích hoặc không thích món ăn" value={foodPreferences} onChangeText={setFoodPreferences} placeholder="Món bạn thích hoặc muốn tránh" />
        <RoadmapField label="Dị ứng hoặc kiêng thực phẩm" value={dietaryNeeds} onChangeText={setDietaryNeeds} placeholder="Nếu có" />
        <RoadmapField label="Lượng nước mỗi ngày" value={waterIntake} onChangeText={setWaterIntake} placeholder="Ví dụ: 2 lít/ngày" />
        <RoadmapField label="Thực phẩm bổ sung" value={supplements} onChangeText={setSupplements} placeholder="Ví dụ: protein, vitamin" />
      </FormSection>
      <FormSection number="5" title="Mục tiêu cụ thể" icon="locate-outline" tint="#E8F7FA" accent="#168AA0">
        <RoadmapField label="Kinh nghiệm tập luyện" value={experience} onChangeText={setExperience} placeholder="Ví dụ: mới bắt đầu, đã tập 1 năm" />
        <RoadmapField label="Thời gian muốn đạt mục tiêu" value={`${weeks} tuần`} onChangeText={() => {}} placeholder="Chọn bên dưới" />
      </FormSection>
      <FormSection number="6" title="Khả năng và sở thích" icon="star-outline" tint="#FFF0F5" accent="#E44F79">
        <RoadmapField label="Nơi tập" value={location} onChangeText={setLocation} placeholder="Ví dụ: tại nhà, phòng gym, công viên" />
        <RoadmapField label="Dụng cụ sẵn có" value={equipment} onChangeText={setEquipment} placeholder="Ví dụ: tạ đơn, thảm tập" />
        <RoadmapField label="Khả năng di chuyển" value={mobility} onChangeText={setMobility} placeholder="Ví dụ: đi bộ 30 phút, hạn chế leo cầu thang" />
        <RoadmapField label="Phong cách tập" value={trainingStyle} onChangeText={setTrainingStyle} placeholder="Tự tập, có PT, theo nhóm" />
        <RoadmapField label="Bài tập thích hoặc không muốn tập" value={activities} onChangeText={setActivities} placeholder="Ví dụ: thích đi bộ, không muốn nhảy" />
      </FormSection>
      <Card style={{ backgroundColor: '#EFFAFF', borderColor: '#C9EDF3' }}>
        <Text style={{ color: palette.text, fontSize: 16, fontWeight: '800' }}>Lịch tập trong tuần</Text>
        <Text style={{ color: palette.textMuted, lineHeight: 19, marginTop: 5 }}>Chọn ngày, khung giờ và thời lượng bạn có thể duy trì.</Text>
      <View style={{ marginTop: 14 }}>
        <Text style={{ color: palette.text, fontWeight: '700', marginBottom: 8 }}>Ngày bạn rảnh để tập</Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((label, index) => {
            const day = index + 1;
            const selectedDay = availableDays.includes(day);
            return <Pressable key={day} onPress={() => setAvailableDays((days) => selectedDay ? days.filter((item) => item !== day) : [...days, day])} accessibilityRole="checkbox" accessibilityState={{ checked: selectedDay }} style={{ flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: selectedDay ? palette.primary : palette.border, backgroundColor: selectedDay ? palette.primarySoft : palette.surface }}><Text style={{ color: selectedDay ? palette.primaryDark : palette.textMuted, fontSize: 11, fontWeight: '800' }}>{label}</Text></Pressable>;
          })}
        </View>
        {!availableDays.length ? <Text style={{ color: palette.danger, fontSize: 11, marginTop: 6 }}>Chọn ít nhất một ngày để AI sắp lịch tập.</Text> : null}
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}><RoadmapField label="Giờ bắt đầu" value={startTime} onChangeText={setStartTime} placeholder="18:00" /></View>
        <View style={{ flex: 1 }}><RoadmapField label="Giờ kết thúc" value={endTime} onChangeText={setEndTime} placeholder="19:00" /></View>
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}><RoadmapField label="Phút mỗi buổi" value={sessionMinutes} onChangeText={setSessionMinutes} placeholder="45" keyboardType="number-pad" /></View>
        <View style={{ flex: 1 }}><RoadmapField label="Cường độ" value={intensity} onChangeText={setIntensity} placeholder="Nhẹ đến vừa" /></View>
      </View>
      <Text style={{ color: palette.text, fontWeight: '700', marginTop: 18, marginBottom: 10 }}>Thời lượng</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>{[1, 2, 3].map((value) => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ selected: weeks === value }} onPress={() => setWeeks(value)} style={{ flex: 1, paddingVertical: 11, alignItems: 'center', borderRadius: 8, borderWidth: 1, borderColor: weeks === value ? palette.primary : palette.border, backgroundColor: weeks === value ? palette.primary : 'transparent' }}><Text style={{ color: weeks === value ? palette.textInverse : palette.text, fontWeight: '700' }}>{value} tuần</Text></Pressable>)}</View>
      <View style={{ marginTop: 16 }}><AppButton label="Để AI tạo lộ trình" disabled={!roadmapGoal.trim() || availableDays.length === 0} onPress={generate} /></View>
      </Card>
    </Card> : null}
    {roadmap.status === 'loading' ? (roadmap.data ? <LoadingState label="Đang kích hoạt lộ trình..." /> : <GenerationScene />) : null}
    {roadmap.status === 'error' ? <ErrorState message={roadmap.message} onRetry={generate} /> : null}
    {roadmap.options.length > 0 && !confirmed ? <>
      <Text style={{ color: palette.text, fontSize: 17, fontWeight: '800', marginBottom: 4 }}>Chọn một phương án</Text>
      {roadmap.options.map((plan, index) => <Pressable key={`${index}-${plan.title}`} onPress={() => setSelected(index)} accessibilityRole="radio" accessibilityState={{ selected: selected === index }}>
        <Card style={{ borderColor: selected === index ? palette.primary : palette.border }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}><Text style={{ flex: 1, color: palette.text, fontSize: 17, fontWeight: '800' }}>{variants[index] ?? `Phương án ${index + 1}`}</Text><Text style={{ color: palette.primary, fontWeight: '800' }}>{selected === index ? 'Đã chọn' : 'Chọn'}</Text></View>
          <Text style={{ color: palette.text, fontWeight: '700', marginTop: 10 }}>{plan.title}</Text><Text style={{ color: palette.textMuted, lineHeight: 20, marginTop: 6 }}>{plan.overview}</Text>
          {plan.weeklyPlan.map((week, i) => <Text key={i} style={{ color: palette.textMuted, lineHeight: 20, marginTop: 7 }}>Tuần {i + 1}: {week}</Text>)}
          <Text style={{ color: palette.warning, lineHeight: 19, marginTop: 10 }}>Lưu ý: {plan.safetyNotes.join(' ')}</Text>
          <Text style={{ color: palette.textMuted, fontSize: 12, marginTop: 8 }}>{plan.source === 'fallback' ? 'Bản dự phòng' : 'Đề xuất AI'} · {weeks} tuần</Text>
        </Card>
      </Pressable>)}
      <AppButton label="Xác nhận và bắt đầu" disabled={!selectedPlan} onPress={() => {
        if (selectedPlan && selected !== null) void roadmap.activate(selectedPlan, selected, roadmapName, draftId).then(async (ok) => {
          if (ok) {
            if (scheduledDays.length > 0 && (scheduleSlots.length > 0 || (startTime && endTime))) {
              const slots = scheduleSlots.length > 0 ? scheduleSlots : [{ period: 'CUSTOM', startTime, endTime }];
              await healthTrackingService.createAvailabilityBatch(scheduledDays.flatMap((dayOfWeek) => slots.map((slot) => ({ dayOfWeek, startTime: slot.startTime, endTime: slot.endTime, activityType: 'WORKOUT', locationType: 'ANYWHERE', equipmentNotes: equipment || null }))));
            }
            setConfirmed(true);
            void queryClient.invalidateQueries({ queryKey: ['roadmap'] });
            void queryClient.invalidateQueries({ queryKey: ['availability'] });
          }
        });
      }} />
      <View style={{ height: 10 }} /><AppButton label="Tạo phương án khác" variant="secondary" onPress={generate} />
    </> : null}
    {confirmed ? <Card><Text style={{ color: palette.primary, fontSize: 18, fontWeight: '800' }}>Lộ trình đã bắt đầu</Text><Text style={{ color: palette.textMuted, lineHeight: 21, marginTop: 8 }}>{roadmap.data?.title}. Lịch theo ngày đã có trên trang chủ.</Text><View style={{ marginTop: 14 }}><AppButton label="Về trang chủ" onPress={() => navigationService.navigate('Home')} /></View></Card> : null}
    <Modal visible={showNameModal} transparent animationType="fade" onRequestClose={() => setShowNameModal(false)}>
      <View style={{ flex: 1, justifyContent: 'center', padding: 20, backgroundColor: 'rgba(32,33,58,0.42)' }}>
        <View style={{ padding: 20, borderRadius: 20, backgroundColor: palette.surface }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><View style={{ width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: palette.primarySoft }}><Ionicons name="bookmark-outline" size={21} color={palette.primary} /></View><View style={{ flex: 1 }}><Text style={{ color: palette.text, fontSize: 18, fontWeight: '800' }}>{editingDraftId === null ? 'Đặt tên lộ trình' : 'Sửa tên lộ trình'}</Text><Text style={{ color: palette.textMuted, fontSize: 11, marginTop: 3 }}>Tên này sẽ được lưu vào danh sách của bạn</Text></View><Pressable onPress={() => setShowNameModal(false)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Đóng"><Ionicons name="close" size={22} color={palette.textMuted} /></Pressable></View>
          <TextInput autoFocus value={draftNameInput} onChangeText={setDraftNameInput} placeholder="Ví dụ: Khỏe hơn trong 3 tuần" placeholderTextColor={palette.textMuted} maxLength={160} style={{ minHeight: 50, marginTop: 18, paddingHorizontal: 14, color: palette.text, fontSize: 15, borderWidth: 1, borderColor: draftNameInput.trim() ? palette.primary : palette.border, borderRadius: 12, backgroundColor: palette.bg }} />
          {draftModalError ? <Text style={{ color: palette.danger, fontSize: 12, lineHeight: 18, marginTop: 10 }}>{draftModalError}</Text> : null}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}><Pressable onPress={() => setShowNameModal(false)} disabled={draftSaving} style={{ flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: palette.border, opacity: draftSaving ? 0.5 : 1 }}><Text style={{ color: palette.textMuted, fontWeight: '800' }}>Hủy</Text></Pressable><Pressable onPress={() => void createNamedDraft()} disabled={!draftNameInput.trim() || draftSaving} style={{ flex: 1.2, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: draftNameInput.trim() && !draftSaving ? palette.primary : '#C9C7F7' }}><Text style={{ color: '#FFFFFF', fontWeight: '800' }}>{draftSaving ? 'Đang lưu...' : editingDraftId === null ? 'Lưu lộ trình' : 'Lưu tên mới'}</Text></Pressable></View>
        </View>
      </View>
    </Modal>
  </Screen>;
}

function RoadmapCalendar({ roadmapStart, availability }: { roadmapStart: string; availability: AvailabilitySlot[] }) {
  const start = parseDateKey(roadmapStart) ?? new Date();
  const monday = mondayOf(start);
  const cells = Array.from({ length: 7 }, (_, index) => addDays(monday, index));
  const labels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  return <Card style={{ marginTop: 14, backgroundColor: '#F0FAFF', borderColor: '#CDECF5' }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={{ width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#DDF6FF' }}><Ionicons name="calendar-outline" size={21} color="#168AA0" /></View>
      <View style={{ flex: 1 }}><Text style={{ color: palette.text, fontSize: 16, fontWeight: '800' }}>Lịch trình theo ngày</Text><Text style={{ color: palette.textMuted, fontSize: 11, marginTop: 3 }}>Chọn một ngày để xem bài tập cụ thể</Text></View>
      <Ionicons name="sparkles-outline" size={20} color="#168AA0" />
    </View>
    <View style={{ flexDirection: 'row', gap: 6, marginTop: 14 }}>
      {cells.map((date, index) => {
        const dayOfWeek = index + 1;
        const slot = availability.find((item) => item.dayOfWeek === dayOfWeek);
        const dateKeyValue = formatDateKey(date);
        return <Pressable key={dateKeyValue} onPress={() => { void dailyPlanService.forDate(dateKeyValue).catch(() => {}); router.push({ pathname: '/(user)/daily-plan', params: { date: dateKeyValue } }); }} accessibilityRole="button" accessibilityLabel={`Mở kế hoạch ${labels[index]}`} style={{ flex: 1, minHeight: 78, alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 10, borderWidth: 1, borderColor: slot ? '#66D4AE' : palette.border, backgroundColor: slot ? '#E3F9EE' : palette.surface }}>
          <Text style={{ color: palette.textMuted, fontSize: 10, fontWeight: '800' }}>{labels[index]}</Text><Text style={{ color: palette.text, fontSize: 17, fontWeight: '800' }}>{date.getDate()}</Text><Ionicons name={slot ? 'checkmark-circle' : 'moon-outline'} size={14} color={slot ? '#16845B' : palette.textMuted} /><Text style={{ color: slot ? '#16845B' : palette.textMuted, fontSize: 8, fontWeight: '700' }}>{slot ? slot.startTime : 'Nghỉ'}</Text>
        </Pressable>;
      })}
    </View>
    <Pressable onPress={() => router.push('/(user)/daily-plan')} accessibilityRole="button" style={{ minHeight: 44, marginTop: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#168AA0' }}><Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>Mở lịch tập đầy đủ</Text></Pressable>
  </Card>;
}

function parseDateKey(value: string | null | undefined) {
  if (!value) return null;
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  if (![year, month, day].every(Number.isFinite)) return null;
  return new Date(year, month - 1, day);
}
function formatDateKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}
function mondayOf(value: Date) {
  const date = new Date(value);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return date;
}
function addDays(value: Date, days: number) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}

function FormSection({ number, title, icon, tint, accent, children }: { number: string; title: string; icon: keyof typeof Ionicons.glyphMap; tint: string; accent: string; children: React.ReactNode }) {
  return <View style={{ marginTop: 16, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: `${accent}35`, backgroundColor: tint }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
      <View style={{ width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: accent }}><Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800' }}>{number}</Text></View>
      <Ionicons name={icon} size={21} color={accent} />
      <Text style={{ flex: 1, color: palette.text, fontSize: 15, fontWeight: '800' }}>{title}</Text>
    </View>
    {children}
  </View>;
}

function RoadmapField({ label, value, onChangeText, placeholder, keyboardType = 'default', required = false, editable = true }: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'number-pad' | 'decimal-pad';
  required?: boolean;
  editable?: boolean;
}) {
  return <View style={{ marginTop: 14 }}>
    <Text style={{ color: palette.text, fontSize: 13, fontWeight: '700', marginBottom: 7 }}>{label}{required ? <Text style={{ color: palette.danger }}> *</Text> : null}</Text>
    <TextInput value={value} onChangeText={onChangeText} editable={editable} placeholder={placeholder} placeholderTextColor={palette.textMuted} keyboardType={keyboardType} maxLength={300} style={{ minHeight: 46, paddingHorizontal: 12, color: editable ? palette.text : palette.textMuted, fontSize: 14, borderWidth: 1, borderColor: editable ? palette.border : '#D7DEEA', borderRadius: 8, backgroundColor: editable ? palette.surface : '#EEF2F7' }} />
  </View>;
}
