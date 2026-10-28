import React, { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Screen from '@/components/ui/Screen';
import Card from '@/components/ui/Card';
import AppButton from '@/components/ui/AppButton';
import MealScheduleCard from '@/features/Health/components/MealScheduleCard';
import ActivityTrackerModal from '@/features/Health/components/ActivityTrackerModal';
import GymCoachModal from '@/features/Health/components/GymCoachModal';
import ReschedulePlanner from '@/features/Health/components/ReschedulePlanner';
import { ErrorState, LoadingState } from '@/components/ui/StateViews';
import { palette } from '@/theme/tokens';
import { useRoadmap } from '@/hooks/useRoadmap';
import { profileService } from '@/api/services/profile.service';
import { coachService } from '@/api/services/coach.service';
import type { ActivitySession, DailyAiReview, PlannedActivityType, RoadmapDay, RoadmapPlanSlot, RoadmapProgress, RoadmapSlotRequest, SessionPeriod } from '@/api/services/coach.service';
import { navigationService } from '@/routes';
import { ApiError } from '@/api/client';

const variants = ['Vận động nhẹ', 'Linh hoạt và phục hồi', 'Sức mạnh toàn thân'];
const weekdays = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ nhật'];
const periods: { key: SessionPeriod; label: string; icon: 'sunny-outline' | 'partly-sunny-outline' | 'moon-outline' }[] = [
  { key: 'MORNING', label: 'Sáng', icon: 'sunny-outline' }, { key: 'AFTERNOON', label: 'Chiều', icon: 'partly-sunny-outline' }, { key: 'EVENING', label: 'Tối', icon: 'moon-outline' },
];
const activityTypes: { key: PlannedActivityType; label: string }[] = [
  { key: 'RUNNING', label: 'Chạy bộ' }, { key: 'GYM', label: 'Gym' }, { key: 'WALKING', label: 'Đi bộ' },
  { key: 'STRENGTH', label: 'Sức mạnh' }, { key: 'MOBILITY', label: 'Giãn cơ' }, { key: 'OTHER', label: 'Khác' },
];
type WizardStep = 'duration' | 'schedule' | 'review' | 'preview';

function timeMinutes(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours < 24 && minutes < 60 ? hours * 60 + minutes : null;
}

function localDateIso() {
  const today = new Date();
  today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  return today.toISOString().slice(0, 10);
}

function dateAtOffset(startDate: string, offset: number) {
  const date = new Date(`${startDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function differenceInDays(from: string, to: string) {
  return Math.floor((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

const slotStatusLabels: Record<RoadmapPlanSlot['status'], string> = {
  UPCOMING: 'Sắp tới', IN_PROGRESS: 'Đang tập', COMPLETED: 'Hoàn thành', SKIPPED: 'Đã bỏ qua', CANCELLED: 'Đã hủy',
};
const planStatusLabels: Record<RoadmapProgress['status'], string> = {
  UPCOMING: 'Chưa bắt đầu', IN_PROGRESS: 'Đang thực hiện', COMPLETED: 'Hoàn thành', SKIPPED: 'Đã kết thúc với các hoạt động bỏ qua', CANCELLED: 'Đã hủy',
};
const dayStatusLabels: Record<RoadmapDay['status'], string> = {
  REST: 'Ngày nghỉ', UPCOMING: 'Chưa bắt đầu', IN_PROGRESS: 'Đang thực hiện', COMPLETED: 'Hoàn thành', SKIPPED: 'Đã bỏ qua', CANCELLED: 'Đã hủy',
};

function scheduleError(slots: RoadmapSlotRequest[]) {
  if (!slots.length) return 'Chọn ít nhất một khung giờ tập trong tuần.';
  const byDay = new Map<number, RoadmapSlotRequest[]>();
  for (const slot of slots) {
    const start = timeMinutes(slot.startTime);
    const end = timeMinutes(slot.endTime);
    if (start === null || end === null || end <= start) return 'Nhập giờ hợp lệ và giờ kết thúc phải sau giờ bắt đầu.';
    if (end - start < 15 || end - start > 240) return 'Mỗi khung tập cần dài từ 15 đến 240 phút.';
    const periodValid = slot.sessionPeriod === 'MORNING' ? start < 720 && end <= 720
      : slot.sessionPeriod === 'AFTERNOON' ? start >= 720 && start <= 1080 && end > 720 && end <= 1080
        : start >= 1080 && end > 1080;
    if (!periodValid) return 'Giờ tập chưa nằm trong buổi đã chọn.';
    byDay.set(slot.dayOfWeek, [...(byDay.get(slot.dayOfWeek) ?? []), slot]);
  }
  for (const daySlots of byDay.values()) {
    const ordered = daySlots.slice().sort((a, b) => (timeMinutes(a.startTime) ?? 0) - (timeMinutes(b.startTime) ?? 0));
    for (let index = 1; index < ordered.length; index++) {
      if ((timeMinutes(ordered[index].startTime) ?? 0) < (timeMinutes(ordered[index - 1].endTime) ?? 0)) return 'Các khung giờ trong cùng ngày không được trùng nhau.';
    }
  }
  return '';
}

export default function RoadmapPage() {
  const roadmap = useRoadmap();
  const queryClient = useQueryClient();
  const [weeks, setWeeks] = useState(4);
  const [wizardStep, setWizardStep] = useState<WizardStep>('duration');
  const [weeklySlots, setWeeklySlots] = useState<RoadmapSlotRequest[]>([]);
  const [scheduleValidation, setScheduleValidation] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState<number | null>(null);
  const [compareWithPrevious, setCompareWithPrevious] = useState(false);
  const [adjustmentBusy, setAdjustmentBusy] = useState(false);
  const [adjustmentMessage, setAdjustmentMessage] = useState('');
  const [slotBusyId, setSlotBusyId] = useState<number | null>(null);
  const [scheduleMessage, setScheduleMessage] = useState('');
  const [chosenDayIndex, setChosenDayIndex] = useState<number | null>(null);
  const [expandedSlotId, setExpandedSlotId] = useState<number | null>(null);
  const [actualDurationInput, setActualDurationInput] = useState('');
  const [activityNotesInput, setActivityNotesInput] = useState('');
  const [skipReasonInput, setSkipReasonInput] = useState('');
  const [trackingSlot, setTrackingSlot] = useState<RoadmapPlanSlot | null>(null);
  const [gymSlot, setGymSlot] = useState<RoadmapPlanSlot | null>(null);
  const [dailyReviewBusy, setDailyReviewBusy] = useState(false);
  const [dailyReviewMessage, setDailyReviewMessage] = useState('');

  const profileQuery = useQuery({ queryKey: ['profile', 'me'], queryFn: profileService.getMine });
  const activeQuery = useQuery({
    queryKey: ['roadmap', 'active'],
    queryFn: async () => {
      try { return await coachService.active(); }
      catch (error) { if (error instanceof ApiError && error.status === 404) return null; throw error; }
    },
  });
  const roadmapDays = (activeQuery.data?.durationWeeks ?? 0) * 7;
  const todayOffset = activeQuery.data?.startDate ? differenceInDays(activeQuery.data.startDate, localDateIso()) : 0;
  const currentDayIndex = roadmapDays > 0 ? Math.max(0, Math.min(roadmapDays - 1, todayOffset)) : 0;
  const dayIndex = roadmapDays > 0 ? Math.max(0, Math.min(roadmapDays - 1, chosenDayIndex ?? currentDayIndex)) : 0;
  const selectedDate = activeQuery.data?.startDate ? dateAtOffset(activeQuery.data.startDate, dayIndex) : localDateIso();
  const dayQuery = useQuery({
    queryKey: ['roadmap', 'day', activeQuery.data?.id, selectedDate],
    queryFn: () => coachService.scheduleDay(activeQuery.data!.id, selectedDate),
    enabled: Boolean(activeQuery.data?.id && activeQuery.data?.startDate),
  });
  const progressQuery = useQuery({
    queryKey: ['roadmap', 'progress', activeQuery.data?.id],
    queryFn: () => coachService.progress(activeQuery.data!.id),
    enabled: Boolean(activeQuery.data?.id),
  });
  const dailyReviewHistoryQuery = useQuery({
    queryKey: ['daily-ai-reviews'],
    queryFn: () => coachService.dailyReviewHistory(),
  });
  const historyQuery = useQuery({
    queryKey: ['roadmap', 'history'],
    queryFn: coachService.history,
  });
  const adjustmentQuery = useQuery({
    queryKey: ['plan-adjustments', 'me'],
    queryFn: coachService.adjustmentHistory,
  });

  const profileReady = profileQuery.data
    ? Boolean(profileQuery.data.consent && profileQuery.data.heightCm && profileQuery.data.weightKg)
    : profileQuery.isPending ? null : false;
  const profileMissing = profileQuery.isError && profileQuery.error instanceof ApiError && profileQuery.error.status === 404;
  const profileError = profileQuery.isError && !profileMissing
    ? profileQuery.error instanceof ApiError ? profileQuery.error.message : 'Không thể tải hồ sơ.'
    : '';
  const goal = profileQuery.data?.goal ?? '';
  const generate = () => {
    const error = scheduleError(weeklySlots);
    setScheduleValidation(error);
    if (error) { setWizardStep('schedule'); return; }
    setSelected(null);
    setWizardStep('preview');
    void roadmap.generate(goal, weeks, weeklySlots);
  };
  const updateSlot = (index: number, changes: Partial<RoadmapSlotRequest>) => {
    setWeeklySlots((current) => current.map((slot, slotIndex) => slotIndex === index ? { ...slot, ...changes } : slot));
    setScheduleValidation('');
  };
  const removeSlot = (index: number) => {
    setWeeklySlots((current) => current.filter((_, slotIndex) => slotIndex !== index));
    setScheduleValidation('');
  };
  const addSlot = (dayOfWeek: number, sessionPeriod: SessionPeriod) => {
    const count = weeklySlots.filter((slot) => slot.dayOfWeek === dayOfWeek && slot.sessionPeriod === sessionPeriod).length;
    if (count >= 4) return;
    const firstHour = sessionPeriod === 'MORNING' ? 6 : sessionPeriod === 'AFTERNOON' ? 14 : 19;
    const startHour = firstHour + count;
    if (startHour >= 23) return;
    const startTime = `${String(startHour).padStart(2, '0')}:00`;
    const endTime = `${String(startHour).padStart(2, '0')}:30`;
    setWeeklySlots((current) => [...current, { dayOfWeek, sessionPeriod, startTime, endTime, activityType: 'GYM', activity: 'Tập luyện' }]);
    setScheduleValidation('');
  };
  const copyPreviousDay = (dayOfWeek: number) => {
    if (dayOfWeek < 2) return;
    setWeeklySlots((current) => [
      ...current.filter((slot) => slot.dayOfWeek !== dayOfWeek),
      ...current.filter((slot) => slot.dayOfWeek === dayOfWeek - 1).map((slot) => ({ ...slot, dayOfWeek })),
    ]);
    setScheduleValidation('');
  };
  const refreshActivityQueries = async () => {
    const roadmapId = activeQuery.data?.id;
    if (!roadmapId) return;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['roadmap', 'day', roadmapId] }),
      queryClient.invalidateQueries({ queryKey: ['roadmap', 'progress', roadmapId] }),
      queryClient.invalidateQueries({ queryKey: ['roadmap', 'schedule', roadmapId] }),
    ]);
  };
  const runActivityAction = async (slot: RoadmapPlanSlot, action: 'start' | 'complete' | 'skip' | 'cancel') => {
    const roadmapId = activeQuery.data?.id;
    if (!roadmapId) return;
    const actualDurationMinutes = actualDurationInput.trim() ? Number(actualDurationInput) : undefined;
    if (action === 'complete' && actualDurationMinutes !== undefined
      && (!Number.isInteger(actualDurationMinutes) || actualDurationMinutes < 1 || actualDurationMinutes > 1440)) {
      setScheduleMessage('Thời lượng thực tế phải từ 1 đến 1.440 phút.');
      return;
    }
    setSlotBusyId(slot.id);
    setScheduleMessage('');
    try {
      if (action === 'start') await coachService.startSlot(roadmapId, slot.id);
      else if (action === 'complete') await coachService.completeSlot(roadmapId, slot.id, {
        actualDurationMinutes, notes: activityNotesInput.trim() || undefined,
      });
      else if (action === 'skip') await coachService.skipSlot(roadmapId, slot.id, skipReasonInput.trim() || undefined);
      else await coachService.cancelSlot(roadmapId, slot.id);
      if (action === 'complete') {
        try {
          const orderedSlots = await coachService.schedule(roadmapId);
          const completedIndex = orderedSlots.findIndex((item) => item.id === slot.id);
          const nextSlot = orderedSlots.slice(completedIndex + 1).find((item) => item.status === 'UPCOMING');
          if (nextSlot) {
            setChosenDayIndex(nextSlot.dayIndex);
            setExpandedSlotId(nextSlot.id);
          } else {
            setScheduleMessage('Đã hoàn thành khung cuối cùng còn lại trong lộ trình.');
          }
        } catch {
          setScheduleMessage('Đã hoàn thành hoạt động nhưng chưa tải được khung tiếp theo.');
        }
      }
      await refreshActivityQueries();
      if (action === 'complete' || action === 'skip' || action === 'cancel') {
        setActualDurationInput('');
        setActivityNotesInput('');
        setSkipReasonInput('');
      }
    } catch (error) {
      setScheduleMessage(error instanceof ApiError ? error.message : 'Không thể cập nhật hoạt động.');
    } finally {
      setSlotBusyId(null);
    }
  };
  const onTrackedActivitySaved = async (_slot: RoadmapPlanSlot, session: ActivitySession) => {
    const roadmapId = activeQuery.data?.id;
    if (!roadmapId) return;
    try {
      await refreshActivityQueries();
      const allSlots = await coachService.schedule(roadmapId);
      const sameDayNext = allSlots.find((item) => item.dayIndex === dayIndex && item.status === 'UPCOMING');
      const nextSlot = sameDayNext ?? allSlots.find((item) => item.dayIndex > dayIndex && item.status === 'UPCOMING');
      if (nextSlot) {
        setChosenDayIndex(nextSlot.dayIndex);
        setExpandedSlotId(nextSlot.id);
        setScheduleMessage('Đã lưu kết quả và chuyển đến hoạt động kế tiếp.');
      } else {
        setScheduleMessage('Đã lưu kết quả hoạt động vào lộ trình.');
      }
      void coachService.reviewActivity(session.id).then((review) => {
        setScheduleMessage((current) => `${current || 'Đã lưu kết quả hoạt động.'} ${review.summary} ${review.progressionNote}`);
      }).catch(() => {
        setScheduleMessage((current) => `${current || 'Đã lưu kết quả hoạt động.'} Chưa tải được nhận xét AI; dữ liệu vẫn đã lưu.`);
      });
    } catch {
      setScheduleMessage((current) => `${current || 'Đã lưu kết quả hoạt động.'} Không tải được bước điều hướng; dữ liệu vẫn đã lưu.`);
    } finally {
      setTrackingSlot(null);
    }
  };
  const onGymSessionSaved = async () => {
    setGymSlot(null);
    await refreshActivityQueries();
  };
  const continueAfterMeal = async (mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER') => {
    const roadmapId = activeQuery.data?.id;
    if (!roadmapId) return;
    const slots = await coachService.schedule(roadmapId);
    const mealPeriodIndex = mealType === 'BREAKFAST' ? 0 : mealType === 'LUNCH' ? 1 : 2;
    const currentDayNext = slots.find((slot) => slot.dayIndex === dayIndex && slot.status === 'UPCOMING'
      && periods.findIndex((period) => period.key === slot.sessionPeriod) >= mealPeriodIndex);
    const nextSlot = currentDayNext ?? slots.find((slot) => slot.dayIndex > dayIndex && slot.status === 'UPCOMING');
    if (nextSlot) {
      setChosenDayIndex(nextSlot.dayIndex);
      setExpandedSlotId(nextSlot.id);
      setScheduleMessage('Đã chuyển đến hoạt động tiếp theo trong lịch.');
    } else {
      setScheduleMessage('Không còn khung tập sắp tới trong lộ trình này.');
    }
  };
  const weeklyMinutes = weeklySlots.reduce((total, slot) => total + Math.max(0, (timeMinutes(slot.endTime) ?? 0) - (timeMinutes(slot.startTime) ?? 0)), 0);
  const activeDay = dayQuery.data as RoadmapDay | undefined;
  const roadmapProgress = progressQuery.data as RoadmapProgress | undefined;
  const selectedPlan = selected === null ? null : roadmap.options[selected];
  const previousVersion = activeQuery.data?.previousRoadmapId
    ? historyQuery.data?.find((item) => item.id === activeQuery.data?.previousRoadmapId)
    : undefined;
  const pendingAdjustment = adjustmentQuery.data?.find((item) => item.status === 'PROPOSED');
  const dailyReview = (dailyReviewHistoryQuery.data ?? []).find((item) => item.reviewDate === selectedDate) as DailyAiReview | undefined;

  const evaluateSelectedDay = async () => {
    setDailyReviewBusy(true);
    setDailyReviewMessage('');
    try {
      const result = await coachService.evaluateDay(selectedDate);
      setDailyReviewMessage(result.status === 'AWAITING_CONFIRMATION'
        ? 'Đã tạo bản đánh giá và đề xuất. Lịch chưa thay đổi cho đến khi bạn xác nhận.'
        : 'Đã lưu đánh giá trong lịch sử; lộ trình hiện tại được giữ nguyên.');
      await Promise.all([
        dailyReviewHistoryQuery.refetch(),
        queryClient.invalidateQueries({ queryKey: ['roadmap', 'schedule'] }),
      ]);
    } catch (error) {
      setDailyReviewMessage(error instanceof ApiError ? error.message : 'Không thể đánh giá ngày này.');
    } finally { setDailyReviewBusy(false); }
  };

  const decideDailyReview = async (decision: 'accept' | 'reject') => {
    if (!dailyReview || dailyReview.status !== 'AWAITING_CONFIRMATION') return;
    setDailyReviewBusy(true);
    setDailyReviewMessage('');
    try {
      const result = decision === 'accept'
        ? await coachService.acceptDailyReview(dailyReview.id)
        : await coachService.rejectDailyReview(dailyReview.id);
      setDailyReviewMessage(decision === 'accept'
        ? `Đã tạo phiên bản lộ trình ${result.appliedRoadmapId ?? ''} từ đề xuất đã xác nhận.`
        : 'Đã từ chối đề xuất. Lịch hiện tại được giữ nguyên.');
      await Promise.all([
        dailyReviewHistoryQuery.refetch(),
        queryClient.invalidateQueries({ queryKey: ['roadmap'] }),
      ]);
    } catch (error) {
      setDailyReviewMessage(error instanceof ApiError ? error.message : 'Không thể xử lý đề xuất đánh giá ngày.');
    } finally { setDailyReviewBusy(false); }
  };

  const renderPeriod = (dayOfWeek: number, period: { key: SessionPeriod; label: string }) => {
    const indices = weeklySlots.flatMap((slot, index) => slot.dayOfWeek === dayOfWeek && slot.sessionPeriod === period.key ? [index] : []);
    return <View key={period.key} style={{ paddingTop: 12, marginTop: 10, borderTopWidth: 1, borderColor: palette.border }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: palette.text, fontWeight: '800' }}>{period.label} {indices.length === 0 ? '· Nghỉ' : `· ${indices.length} khung`}</Text>
        <Pressable onPress={() => addSlot(dayOfWeek, period.key)} disabled={indices.length >= 4} accessibilityRole="button" style={{ minHeight: 34, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 7, backgroundColor: palette.primarySoft, opacity: indices.length >= 4 ? 0.4 : 1 }}>
          <Text style={{ color: palette.primary, fontSize: 11, fontWeight: '800' }}>+ Thêm giờ</Text>
        </Pressable>
      </View>
      {indices.map((index) => {
        const slot = weeklySlots[index];
        return <View key={`${period.key}-${index}`} style={{ marginTop: 9, padding: 10, borderRadius: 8, backgroundColor: palette.surfaceRaised }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TextInput value={slot.startTime} onChangeText={(startTime) => updateSlot(index, { startTime })} keyboardType="numbers-and-punctuation" maxLength={5} accessibilityLabel={`Giờ bắt đầu ${period.label}`} style={{ flex: 1, minHeight: 40, paddingHorizontal: 9, color: palette.text, backgroundColor: palette.surface, borderRadius: 6, textAlign: 'center' }} />
            <Text style={{ color: palette.textMuted }}>đến</Text>
            <TextInput value={slot.endTime} onChangeText={(endTime) => updateSlot(index, { endTime })} keyboardType="numbers-and-punctuation" maxLength={5} accessibilityLabel={`Giờ kết thúc ${period.label}`} style={{ flex: 1, minHeight: 40, paddingHorizontal: 9, color: palette.text, backgroundColor: palette.surface, borderRadius: 6, textAlign: 'center' }} />
            <Pressable onPress={() => removeSlot(index)} accessibilityRole="button" accessibilityLabel="Xóa khung giờ" style={{ width: 38, height: 40, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: palette.danger, fontSize: 18 }}>×</Text></Pressable>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 9 }}>
            {activityTypes.map((activity) => <Pressable key={activity.key} onPress={() => updateSlot(index, { activityType: activity.key })} accessibilityRole="radio" accessibilityState={{ selected: slot.activityType === activity.key }} style={{ paddingVertical: 6, paddingHorizontal: 8, borderRadius: 6, borderWidth: 1, borderColor: slot.activityType === activity.key ? palette.primary : palette.border, backgroundColor: slot.activityType === activity.key ? palette.primarySoft : palette.surface }}><Text style={{ color: slot.activityType === activity.key ? palette.primary : palette.textMuted, fontSize: 10, fontWeight: '700' }}>{activity.label}</Text></Pressable>)}
          </View>
          <TextInput value={slot.activity} onChangeText={(activity) => updateSlot(index, { activity })} maxLength={100} placeholder="Nội dung, ví dụ: tập chân" placeholderTextColor={palette.textMuted} accessibilityLabel="Nội dung buổi tập" style={{ minHeight: 38, marginTop: 8, paddingHorizontal: 9, color: palette.text, backgroundColor: palette.surface, borderRadius: 6, fontSize: 12 }} />
          <Text style={{ color: palette.textMuted, fontSize: 10, marginTop: 5 }}>{Math.max(0, (timeMinutes(slot.endTime) ?? 0) - (timeMinutes(slot.startTime) ?? 0))} phút dự kiến</Text>
        </View>;
      })}
    </View>;
  };
  const renderDaySession = (period: { key: SessionPeriod; label: string; icon: 'sunny-outline' | 'partly-sunny-outline' | 'moon-outline' }) => {
    const slots = (activeDay?.slots ?? []).filter((slot) => slot.sessionPeriod === period.key);
    return <Card key={period.key}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Ionicons name={period.icon} size={18} color={palette.primary} />
        <Text style={{ color: palette.text, fontWeight: '800', flex: 1 }}>{period.label}</Text>
        <Text style={{ color: palette.textMuted, fontSize: 10 }}>{slots.length ? `${slots.length} hoạt động` : 'Nghỉ'}</Text>
      </View>
      {!slots.length ? <Text style={{ color: palette.textMuted, fontSize: 11, marginTop: 9 }}>Không có khung tập được lên lịch.</Text> : slots.map((slot) => {
        const expanded = expandedSlotId === slot.id;
        const busy = slotBusyId === slot.id;
        return <View key={slot.id} style={{ paddingTop: 11, marginTop: 10, borderTopWidth: 1, borderColor: palette.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 9 }}>
            <View style={{ minWidth: 92 }}><Text style={{ color: palette.text, fontWeight: '800', fontSize: 12 }}>{slot.startTime}–{slot.endTime}</Text><Text style={{ color: palette.textMuted, fontSize: 10, marginTop: 3 }}>{slot.durationMinutes} phút</Text></View>
            <View style={{ flex: 1 }}><Text style={{ color: palette.text, fontSize: 13, fontWeight: '700' }}>{slot.activity}</Text><Text style={{ color: palette.textMuted, fontSize: 10, marginTop: 3 }}>{activityTypes.find((item) => item.key === slot.activityType)?.label ?? slot.activityType} · {slotStatusLabels[slot.status]}</Text></View>
            <Pressable onPress={() => { setExpandedSlotId(expanded ? null : slot.id); setActualDurationInput(slot.actualDurationMinutes?.toString() ?? ''); setActivityNotesInput(slot.notes ?? ''); setSkipReasonInput(slot.skipReason ?? ''); setScheduleMessage(''); }} accessibilityRole="button" accessibilityState={{ expanded }} style={{ minHeight: 34, paddingHorizontal: 8, justifyContent: 'center', borderRadius: 6, borderWidth: 1, borderColor: palette.border }}><Text style={{ color: palette.primary, fontSize: 10, fontWeight: '700' }}>{expanded ? 'Thu gọn' : 'Hướng dẫn'}</Text></Pressable>
          </View>
          {expanded ? <View style={{ marginTop: 10, padding: 10, borderRadius: 8, backgroundColor: palette.surfaceRaised }}>
            <Text style={{ color: palette.text, fontSize: 11, fontWeight: '800' }}>Mục tiêu tuần</Text>
            <Text style={{ color: palette.textMuted, fontSize: 11, lineHeight: 17, marginTop: 4 }}>{activeDay?.weeklyFocus || 'Thực hiện hoạt động theo mục tiêu trong hồ sơ, ở cường độ phù hợp với thể trạng.'}</Text>
            <Text style={{ color: palette.text, fontSize: 11, fontWeight: '800', marginTop: 9 }}>Lưu ý</Text>
            <Text style={{ color: palette.textMuted, fontSize: 11, lineHeight: 17, marginTop: 4 }}>{activeDay?.safetyNotes.join(' ') || 'Dừng lại nếu thấy đau hoặc khó chịu.'}</Text>
            {slot.status === 'COMPLETED' ? <>
              <Text style={{ color: palette.primary, fontSize: 11, fontWeight: '700', marginTop: 9 }}>Đã hoàn thành · {slot.actualDurationMinutes ?? slot.durationMinutes} phút thực tế</Text>
              {slot.notes ? <Text style={{ color: palette.textMuted, fontSize: 11, lineHeight: 17, marginTop: 4 }}>Ghi chú: {slot.notes}</Text> : null}
            </> : null}
            {slot.status === 'SKIPPED' ? <>
              {slot.actualDurationMinutes ? <Text style={{ color: palette.textMuted, fontSize: 11, marginTop: 8 }}>Đã tập {slot.actualDurationMinutes} phút trước khi bỏ qua.</Text> : null}
              {slot.skipReason ? <Text style={{ color: palette.textMuted, fontSize: 11, lineHeight: 17, marginTop: 4 }}>Lý do bỏ qua: {slot.skipReason}</Text> : null}
            </> : null}
            {slot.status === 'CANCELLED' && slot.actualDurationMinutes ? <Text style={{ color: palette.textMuted, fontSize: 11, marginTop: 8 }}>Đã tập {slot.actualDurationMinutes} phút trước khi hủy.</Text> : null}
            {slot.status === 'UPCOMING' || slot.status === 'IN_PROGRESS' ? <>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                <View style={{ flex: 1 }}><Text style={{ color: palette.textMuted, fontSize: 10, marginBottom: 4 }}>Phút thực tế</Text><TextInput value={actualDurationInput} onChangeText={setActualDurationInput} placeholder={`${slot.durationMinutes}`} keyboardType="number-pad" maxLength={4} accessibilityLabel="Thời lượng thực tế phút" style={{ minHeight: 38, paddingHorizontal: 9, color: palette.text, backgroundColor: palette.surface, borderRadius: 6 }} /></View>
                <View style={{ flex: 2 }}><Text style={{ color: palette.textMuted, fontSize: 10, marginBottom: 4 }}>Ghi chú</Text><TextInput value={activityNotesInput} onChangeText={setActivityNotesInput} placeholder="Cảm nhận hoặc kết quả" maxLength={500} accessibilityLabel="Ghi chú hoạt động" style={{ minHeight: 38, paddingHorizontal: 9, color: palette.text, backgroundColor: palette.surface, borderRadius: 6 }} /></View>
              </View>
              <View style={{ flexDirection: 'row', gap: 7, marginTop: 10 }}>
                {['RUNNING', 'WALKING'].includes(slot.activityType) ? <Pressable disabled={busy} onPress={() => setTrackingSlot(slot)} accessibilityRole="button" style={{ flex: 1.25, minHeight: 38, flexDirection: 'row', gap: 5, justifyContent: 'center', alignItems: 'center', borderRadius: 7, backgroundColor: slot.status === 'UPCOMING' || slot.status === 'IN_PROGRESS' ? palette.primary : palette.surfaceRaised, opacity: busy ? 0.5 : 1 }}><Ionicons name={slot.status === 'UPCOMING' || slot.status === 'IN_PROGRESS' ? 'navigate-outline' : 'time-outline'} size={15} color={slot.status === 'UPCOMING' || slot.status === 'IN_PROGRESS' ? palette.textInverse : palette.primary} /><Text style={{ color: slot.status === 'UPCOMING' || slot.status === 'IN_PROGRESS' ? palette.textInverse : palette.primary, fontSize: 10, fontWeight: '800' }}>{slot.status === 'UPCOMING' || slot.status === 'IN_PROGRESS' ? 'Theo dõi' : 'Lịch sử'}</Text></Pressable> : null}
                {slot.status === 'UPCOMING' && ['GYM', 'STRENGTH', 'MOBILITY', 'OTHER'].includes(slot.activityType) ? <Pressable disabled={busy} onPress={() => setGymSlot(slot)} accessibilityRole="button" style={{ flex: 1.25, minHeight: 38, flexDirection: 'row', gap: 5, justifyContent: 'center', alignItems: 'center', borderRadius: 7, backgroundColor: palette.accentSoft, opacity: busy ? 0.5 : 1 }}><Ionicons name="barbell-outline" size={15} color={palette.accent} /><Text style={{ color: palette.text, fontSize: 10, fontWeight: '800' }}>Mở coach</Text></Pressable> : null}
                {slot.status === 'UPCOMING' ? <Pressable disabled={busy} onPress={() => void runActivityAction(slot, 'start')} accessibilityRole="button" style={{ flex: 1, minHeight: 38, justifyContent: 'center', alignItems: 'center', borderRadius: 7, borderWidth: 1, borderColor: palette.primary, opacity: busy ? 0.5 : 1 }}><Text style={{ color: palette.primary, fontSize: 10, fontWeight: '800' }}>Bắt đầu</Text></Pressable> : null}
                <Pressable disabled={busy} onPress={() => void runActivityAction(slot, 'complete')} accessibilityRole="button" style={{ flex: 1, minHeight: 38, justifyContent: 'center', alignItems: 'center', borderRadius: 7, backgroundColor: palette.primary, opacity: busy ? 0.5 : 1 }}><Text style={{ color: palette.textInverse, fontSize: 10, fontWeight: '800' }}>Hoàn thành</Text></Pressable>
                <Pressable disabled={busy} onPress={() => void runActivityAction(slot, 'skip')} accessibilityRole="button" style={{ flex: 1, minHeight: 38, justifyContent: 'center', alignItems: 'center', borderRadius: 7, borderWidth: 1, borderColor: palette.border, opacity: busy ? 0.5 : 1 }}><Text style={{ color: palette.textMuted, fontSize: 10, fontWeight: '700' }}>Bỏ qua</Text></Pressable>
                {slot.status === 'IN_PROGRESS' ? <Pressable disabled={busy} onPress={() => void runActivityAction(slot, 'cancel')} accessibilityRole="button" accessibilityLabel="Hủy hoạt động" style={{ width: 38, minHeight: 38, justifyContent: 'center', alignItems: 'center', opacity: busy ? 0.5 : 1 }}><Ionicons name="close-circle-outline" size={20} color={palette.danger} /></Pressable> : null}
              </View>
              <TextInput value={skipReasonInput} onChangeText={setSkipReasonInput} placeholder="Lý do bỏ qua (không bắt buộc)" placeholderTextColor={palette.textMuted} maxLength={300} accessibilityLabel="Lý do bỏ qua" style={{ minHeight: 36, paddingHorizontal: 9, marginTop: 8, color: palette.text, backgroundColor: palette.surface, borderRadius: 6, fontSize: 11 }} />
            </> : null}
          </View> : null}
        </View>;
      })}
    </Card>;
  };

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

  return <Screen title="Lộ trình của bạn" subtitle="Xem trước và chọn kế hoạch phù hợp" showBack>
    {activeQuery.isPending ? <LoadingState label="Đang tải lộ trình hiện tại..." /> : null}
    {activeQuery.isError ? <ErrorState message="Không thể tải lộ trình hiện tại." onRetry={() => void activeQuery.refetch()} /> : null}
    {activeQuery.data ? <>
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
      {progressQuery.isError ? <ErrorState message="Không thể tải tiến độ lộ trình." onRetry={() => void progressQuery.refetch()} /> : null}
      {roadmapProgress?.totalSlots === 0 ? <Card><Text style={{ color: palette.textMuted, fontSize: 12, lineHeight: 18 }}>Phiên bản lộ trình này chưa lưu lịch theo khung giờ. Lịch ngày sẽ có sau khi tạo lộ trình bằng wizard mới.</Text></Card> : null}
      {roadmapProgress && roadmapProgress.totalSlots > 0 ? <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <View><Text style={{ color: palette.text, fontSize: 15, fontWeight: '800' }}>Tiến độ lộ trình</Text><Text style={{ color: palette.textMuted, fontSize: 10, marginTop: 3 }}>{planStatusLabels[roadmapProgress.status]}</Text></View>
          <Text style={{ color: palette.primary, fontWeight: '800' }}>{roadmapProgress.progressPercent}%</Text>
        </View>
        <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: roadmapProgress.progressPercent }} style={{ height: 8, backgroundColor: palette.surfaceRaised, borderRadius: 4, overflow: 'hidden', marginTop: 10 }}><View style={{ width: `${roadmapProgress.progressPercent}%`, height: '100%', backgroundColor: palette.primary }} /></View>
        <Text style={{ color: palette.textMuted, fontSize: 11, marginTop: 7 }}>{roadmapProgress.upcoming} sắp tới · {roadmapProgress.inProgress} đang tập · {roadmapProgress.completed} hoàn thành · {roadmapProgress.skipped} bỏ qua · {roadmapProgress.cancelled} đã hủy / {roadmapProgress.totalSlots} khung</Text>
      </Card> : null}
      {activeQuery.data.startDate && roadmapDays > 0 && roadmapProgress?.totalSlots !== 0 ? <>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <Pressable disabled={dayIndex <= 0} onPress={() => { setChosenDayIndex(dayIndex - 1); setExpandedSlotId(null); }} accessibilityRole="button" accessibilityLabel="Ngày trước" style={{ width: 42, height: 42, alignItems: 'center', justifyContent: 'center', opacity: dayIndex <= 0 ? 0.35 : 1 }}><Ionicons name="chevron-back" size={21} color={palette.primary} /></Pressable>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ color: palette.text, fontSize: 16, fontWeight: '800' }}>Ngày {dayIndex + 1} / {roadmapDays}</Text>
              <Text style={{ color: palette.textMuted, fontSize: 11, marginTop: 3 }}>{new Date(`${selectedDate}T00:00:00`).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</Text>
            </View>
            <Pressable disabled={dayIndex >= roadmapDays - 1} onPress={() => { setChosenDayIndex(dayIndex + 1); setExpandedSlotId(null); }} accessibilityRole="button" accessibilityLabel="Ngày tiếp theo" style={{ width: 42, height: 42, alignItems: 'center', justifyContent: 'center', opacity: dayIndex >= roadmapDays - 1 ? 0.35 : 1 }}><Ionicons name="chevron-forward" size={21} color={palette.primary} /></Pressable>
          </View>
          {activeDay ? <Text style={{ color: palette.textMuted, fontSize: 11, textAlign: 'center', marginTop: 5 }}>{activeDay.totalSlots === 0 ? 'Ngày nghỉ' : `${activeDay.completedSlots}/${activeDay.totalSlots} khung hoàn thành · ${activeDay.expectedMinutes} phút dự kiến${activeDay.actualMinutes ? ` · ${activeDay.actualMinutes} phút thực tế` : ''}`} · {dayStatusLabels[activeDay.status]}</Text> : null}
          {activeDay && activeDay.totalSlots > 0 ? <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: activeDay.totalSlots, now: activeDay.completedSlots }} style={{ height: 6, backgroundColor: palette.surfaceRaised, borderRadius: 3, overflow: 'hidden', marginTop: 9 }}><View style={{ width: `${Math.round(activeDay.completedSlots * 100 / activeDay.totalSlots)}%`, height: '100%', backgroundColor: palette.primary }} /></View> : null}
        </Card>
        {dayQuery.isPending ? <LoadingState label="Đang tải lịch ngày..." /> : null}
        {dayQuery.isError ? <ErrorState message={dayQuery.error instanceof ApiError ? dayQuery.error.message : 'Không thể tải lịch ngày.'} onRetry={() => void dayQuery.refetch()} /> : null}
        {activeDay ? <>
          {periods.map(renderDaySession)}
          {activeQuery.data.id ? <MealScheduleCard roadmapId={activeQuery.data.id} date={selectedDate} dayIndex={dayIndex} onContinue={continueAfterMeal} /> : null}
          {activeQuery.data.id ? <ReschedulePlanner
            key={`${activeQuery.data.id}-${selectedDate}`}
            roadmapId={activeQuery.data.id}
            targetDate={selectedDate}
            targetSlots={activeDay.slots.filter((slot) => slot.status === 'UPCOMING')}
            goal={profileQuery.data?.goal ?? ''}
            healthLimits={[profileQuery.data?.restrictions ?? '', profileQuery.data?.painAreas ?? ''].filter(Boolean).join('; ')}
          /> : null}
          {scheduleMessage ? <Text accessibilityLiveRegion="polite" style={{ color: scheduleMessage.startsWith('Đã') ? palette.primary : palette.danger, fontSize: 12 }}>{scheduleMessage}</Text> : null}
          {selectedDate <= localDateIso() ? <Card>
            <Text style={{ color: palette.text, fontSize: 15, fontWeight: '800' }}>Đánh giá cuối ngày</Text>
            <Text style={{ color: palette.textMuted, fontSize: 11, lineHeight: 17, marginTop: 5 }}>Tổng hợp slot tập, kết quả ghi nhận, bữa ăn và check-in đã có. Dữ liệu thiếu sẽ được nêu rõ; không suy đoán hoạt động chưa ghi nhận.</Text>
            <View style={{ marginTop: 11 }}><AppButton label={dailyReviewBusy ? 'Đang đánh giá...' : dailyReview ? 'Tải lại đánh giá ngày' : 'Đánh giá ngày này'} variant={dailyReview ? 'secondary' : 'primary'} loading={dailyReviewBusy} disabled={dailyReviewBusy} onPress={() => void evaluateSelectedDay()} /></View>
            {dailyReviewHistoryQuery.isError ? <Text style={{ color: palette.warning, fontSize: 11, marginTop: 8 }}>Không tải được lịch sử đánh giá ngày.</Text> : null}
            {dailyReview ? <View style={{ padding: 11, marginTop: 11, borderRadius: 8, backgroundColor: palette.surfaceRaised }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}><Text style={{ color: palette.text, fontWeight: '800', fontSize: 12 }}>Đánh giá đã lưu</Text><Text style={{ color: palette.textMuted, fontSize: 10 }}>{dailyReview.source === 'GEMINI' ? 'AI' : 'Dự phòng'}</Text></View>
              <Text style={{ color: palette.text, fontSize: 11, lineHeight: 17, marginTop: 7 }}>{dailyReview.summary}</Text>
              {dailyReview.achievedGoals.map((item) => <Text key={`achieved-${item}`} style={{ color: palette.primary, fontSize: 10, lineHeight: 15, marginTop: 5 }}>Đạt: {item}</Text>)}
              {dailyReview.incompleteActivities.map((item) => <Text key={`incomplete-${item}`} style={{ color: palette.textMuted, fontSize: 10, lineHeight: 15, marginTop: 5 }}>Chưa hoàn tất: {item}</Text>)}
              {dailyReview.workloadAssessment.map((item) => <Text key={`workload-${item}`} style={{ color: palette.textMuted, fontSize: 10, lineHeight: 15, marginTop: 5 }}>Khối lượng: {item}</Text>)}
              {dailyReview.missingData.map((item) => <Text key={`missing-${item}`} style={{ color: palette.warning, fontSize: 10, lineHeight: 15, marginTop: 5 }}>Thiếu: {item}</Text>)}
              {dailyReview.reasons.map((item) => <Text key={`reason-${item}`} style={{ color: palette.textMuted, fontSize: 10, lineHeight: 15, marginTop: 5 }}>Lý do: {item}</Text>)}
              {dailyReview.suggestions.map((item) => <Text key={`suggestion-${item}`} style={{ color: palette.text, fontSize: 10, lineHeight: 15, marginTop: 5 }}>Gợi ý: {item}</Text>)}
              <Text style={{ color: palette.text, fontSize: 10, lineHeight: 15, marginTop: 8 }}>{dailyReview.recommendation}</Text>
              {dailyReview.proposedChanges?.scheduleChanges.map((change) => <View key={change.slotId} style={{ padding: 8, marginTop: 7, borderRadius: 6, backgroundColor: palette.surface }}><Text style={{ color: palette.primary, fontWeight: '800', fontSize: 10 }}>{change.action === 'CANCEL' ? 'Đề xuất bỏ slot' : change.action === 'MOVE' ? 'Đề xuất chuyển slot' : 'Đề xuất thay nội dung'} · ngày {change.dayIndex + 1} · {change.sessionPeriod} {change.startTime}–{change.endTime}</Text><Text style={{ color: palette.textMuted, fontSize: 10, marginTop: 3 }}>{change.activity} · {change.reason}</Text></View>)}
              {dailyReview.confirmationRequired ? <>
                <Text style={{ color: palette.warning, fontSize: 10, lineHeight: 15, marginTop: 9 }}>Đây chỉ là preview. Lịch chưa thay đổi cho đến khi bạn xác nhận.</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}><View style={{ flex: 1 }}><AppButton label="Từ chối" variant="secondary" disabled={dailyReviewBusy} onPress={() => void decideDailyReview('reject')} /></View><View style={{ flex: 1 }}><AppButton label="Chấp nhận cập nhật" disabled={dailyReviewBusy} loading={dailyReviewBusy} onPress={() => void decideDailyReview('accept')} /></View></View>
              </> : <Text style={{ color: palette.textMuted, fontSize: 10, marginTop: 8 }}>{dailyReview.status === 'ACCEPTED' ? `Đã áp dụng version ${dailyReview.appliedRoadmapId ?? ''}` : dailyReview.status === 'REJECTED' ? 'Bạn đã từ chối; lịch cũ được giữ nguyên.' : 'Không có thay đổi lịch cần xác nhận.'}</Text>}
            </View> : null}
            {dailyReviewMessage ? <Text accessibilityLiveRegion="polite" style={{ color: dailyReviewMessage.startsWith('Đã') ? palette.primary : palette.warning, fontSize: 11, lineHeight: 16, marginTop: 8 }}>{dailyReviewMessage}</Text> : null}
          </Card> : null}
        </> : null}
      </> : null}
      {compareWithPrevious && previousVersion ? <View style={{ flexDirection: 'row', gap: 8 }}>
        <Card style={{ flex: 1 }}><Text style={{ color: palette.text, fontWeight: '800', fontSize: 12 }}>Hiện tại · v{activeQuery.data.versionNumber ?? '—'}</Text><Text style={{ color: palette.textMuted, fontSize: 11, lineHeight: 17, marginTop: 7 }}>{activeQuery.data.overview}</Text></Card>
        <Card style={{ flex: 1 }}><Text style={{ color: palette.text, fontWeight: '800', fontSize: 12 }}>Trước đó · v{previousVersion.versionNumber ?? '—'}</Text><Text style={{ color: palette.textMuted, fontSize: 11, lineHeight: 17, marginTop: 7 }}>{previousVersion.overview}</Text></Card>
      </View> : null}
      <Pressable onPress={() => void evaluateAdjustment()} disabled={adjustmentBusy} accessibilityRole="button" style={{ minHeight: 44, marginTop: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: palette.primarySoft, opacity: adjustmentBusy ? 0.6 : 1 }}>
        <Text style={{ color: palette.primary, fontSize: 12, fontWeight: '800' }}>{adjustmentBusy ? 'Đang đánh giá...' : 'Đề xuất giảm tải từ check-in 7 ngày'}</Text>
      </Pressable>
      {adjustmentMessage ? <Text accessibilityLiveRegion="polite" style={{ color: adjustmentMessage.startsWith('Đã') ? palette.primary : palette.textMuted, fontSize: 12, lineHeight: 18, marginTop: 8 }}>{adjustmentMessage}</Text> : null}
    </> : null}
    <ActivityTrackerModal visible={Boolean(trackingSlot)} roadmapId={activeQuery.data?.id ?? 0} slot={trackingSlot} onClose={() => setTrackingSlot(null)} onSaved={onTrackedActivitySaved} />
    <GymCoachModal visible={Boolean(gymSlot)} roadmapId={activeQuery.data?.id ?? 0} slot={gymSlot} onClose={() => setGymSlot(null)} onSaved={onGymSessionSaved} />
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
    {historyQuery.isError ? <ErrorState message="Không thể tải lịch sử lộ trình." onRetry={() => void historyQuery.refetch()} /> : null}
    {historyQuery.data && historyQuery.data.filter((item) => item.status !== 'ACTIVE').length > 0 ? <Card>
      <Text style={{ color: palette.text, fontSize: 16, fontWeight: '800' }}>Lịch sử phiên bản</Text>
      {historyQuery.data.filter((item) => item.status !== 'ACTIVE').map((item) => <View key={item.id} style={{ borderBottomWidth: 1, borderColor: palette.border }}>
        <Pressable onPress={() => setExpandedHistoryId((current) => current === item.id ? null : item.id)} accessibilityRole="button" style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1 }}><Text style={{ color: palette.text, fontWeight: '700' }}>Phiên bản {item.versionNumber ?? '—'} · {item.title}</Text><Text style={{ color: palette.textMuted, fontSize: 11, marginTop: 3 }}>{item.status === 'ARCHIVED' ? 'Đã lưu trữ' : item.status} · {item.createdAt.slice(0, 10)}</Text></View>
          <Text style={{ color: palette.primary }}>{expandedHistoryId === item.id ? 'Ẩn' : 'Xem'}</Text>
        </Pressable>
        {expandedHistoryId === item.id ? <Text style={{ color: palette.textMuted, fontSize: 12, lineHeight: 19, paddingBottom: 12 }}>{item.overview}{item.changeReason ? `\nLý do: ${item.changeReason}` : ''}</Text> : null}
      </View>)}
    </Card> : null}
    {profileReady === null ? <LoadingState label="Đang kiểm tra hồ sơ..." /> : null}
    {profileError ? <ErrorState message={profileError} onRetry={() => void profileQuery.refetch()} /> : null}
    {profileReady === false && (profileMissing || profileQuery.data) ? <Card><Text style={{ color: palette.text, fontSize: 17, fontWeight: '800' }}>{profileMissing ? 'Tạo hồ sơ trước' : 'Hoàn thiện hồ sơ trước'}</Text><Text style={{ color: palette.textMuted, lineHeight: 21, marginTop: 8 }}>Nhập mục tiêu, mức vận động, chiều cao, cân nặng và đồng ý lưu dữ liệu để tạo bản xem trước cá nhân hóa.</Text><View style={{ marginTop: 14 }}><AppButton label="Mở hồ sơ" onPress={() => navigationService.navigate('Profile')} /></View></Card> : null}
    {historyQuery.data?.length === 0 && !activeQuery.data ? <Card><Text style={{ color: palette.text, fontWeight: '700' }}>Chưa có lịch sử lộ trình</Text><Text style={{ color: palette.textMuted, fontSize: 12, lineHeight: 18, marginTop: 5 }}>Các phiên bản đã xác nhận sẽ được lưu tại đây.</Text></Card> : null}
    {profileReady && !confirmed && wizardStep === 'duration' && roadmap.status !== 'loading' ? <Card>
      <Text style={{ color: palette.text, fontSize: 18, fontWeight: '800' }}>Tạo lộ trình</Text>
      <Text style={{ color: palette.textMuted, lineHeight: 20, marginTop: 8 }}>Mục tiêu: {goal}. Thể trạng và giới hạn lấy từ hồ sơ đã lưu. Thời lượng là ước tính ban đầu, có thể điều chỉnh theo tiến độ.</Text>
      <Text style={{ color: palette.text, fontWeight: '700', marginTop: 18, marginBottom: 10 }}>Khoảng thời gian</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>{[2, 4, 8].map((value) => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ selected: weeks === value }} onPress={() => setWeeks(value)} style={{ flex: 1, paddingVertical: 11, alignItems: 'center', borderRadius: 8, borderWidth: 1, borderColor: weeks === value ? palette.primary : palette.border, backgroundColor: weeks === value ? palette.primary : 'transparent' }}><Text style={{ color: weeks === value ? palette.textInverse : palette.text, fontWeight: '700' }}>{value} tuần</Text></Pressable>)}</View>
      <View style={{ marginTop: 16 }}><AppButton label="Tiếp tục chọn lịch" onPress={() => setWizardStep('schedule')} /></View>
    </Card> : null}
    {profileReady && !confirmed && wizardStep === 'schedule' && roadmap.status !== 'loading' ? <>
      <Card>
        <Text style={{ color: palette.text, fontSize: 18, fontWeight: '800' }}>Lịch tập lặp theo tuần</Text>
        <Text style={{ color: palette.textMuted, fontSize: 12, lineHeight: 18, marginTop: 7 }}>Chọn ngày và thêm một hoặc nhiều khung trong từng buổi. Ngày/buổi để trống được xem là nghỉ; lịch này lặp trong {weeks} tuần.</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <View style={{ flex: 1, padding: 10, borderRadius: 8, backgroundColor: palette.surfaceRaised }}><Text style={{ color: palette.text, fontSize: 18, fontWeight: '800' }}>{weeklySlots.length}</Text><Text style={{ color: palette.textMuted, fontSize: 10 }}>khung mỗi tuần</Text></View>
          <View style={{ flex: 1, padding: 10, borderRadius: 8, backgroundColor: palette.surfaceRaised }}><Text style={{ color: palette.text, fontSize: 18, fontWeight: '800' }}>{Math.floor(weeklyMinutes / 60)}g {weeklyMinutes % 60}p</Text><Text style={{ color: palette.textMuted, fontSize: 10 }}>mỗi tuần · {weeklySlots.length * weeks} khung toàn kỳ</Text></View>
        </View>
      </Card>
      {weekdays.map((day, index) => <Card key={day}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <View><Text style={{ color: palette.text, fontSize: 15, fontWeight: '800' }}>{day}</Text><Text style={{ color: palette.textMuted, fontSize: 10, marginTop: 3 }}>{weeklySlots.filter((slot) => slot.dayOfWeek === index + 1).length} khung tập</Text></View>
          {index > 0 ? <Pressable onPress={() => copyPreviousDay(index + 1)} accessibilityRole="button" style={{ minHeight: 36, paddingHorizontal: 9, justifyContent: 'center', borderRadius: 7, borderWidth: 1, borderColor: palette.border }}><Text style={{ color: palette.primary, fontSize: 10, fontWeight: '700' }}>Sao chép ngày trước</Text></Pressable> : null}
        </View>
        {periods.map((period) => renderPeriod(index + 1, period))}
      </Card>)}
      {scheduleValidation ? <Text accessibilityLiveRegion="polite" style={{ color: palette.danger, fontSize: 12 }}>{scheduleValidation}</Text> : null}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}><AppButton label="Quay lại" variant="secondary" onPress={() => setWizardStep('duration')} /></View>
        <View style={{ flex: 1 }}><AppButton label="Xem lại lịch" onPress={() => { const error = scheduleError(weeklySlots); setScheduleValidation(error); if (!error) setWizardStep('review'); }} /></View>
      </View>
    </> : null}
    {profileReady && !confirmed && wizardStep === 'review' && roadmap.status !== 'loading' ? <>
      <Card>
        <Text style={{ color: palette.text, fontSize: 18, fontWeight: '800' }}>Xem lại lịch tập</Text>
        <Text style={{ color: palette.textMuted, fontSize: 12, lineHeight: 18, marginTop: 6 }}>{weeks} tuần · {weeklySlots.length} khung/tuần · {weeklySlots.length * weeks} khung toàn kỳ · {Math.floor(weeklyMinutes / 60)} giờ {weeklyMinutes % 60} phút/tuần. AI chỉ viết nội dung trong các khung này; ngày trống là ngày nghỉ.</Text>
        {weekdays.map((day, dayIndex) => {
          const daySlots = weeklySlots.filter((slot) => slot.dayOfWeek === dayIndex + 1);
          return <View key={day} style={{ paddingTop: 10, marginTop: 10, borderTopWidth: 1, borderColor: palette.border }}>
            <Text style={{ color: palette.text, fontWeight: '800' }}>{day}{daySlots.length === 0 ? ' · Nghỉ' : ''}</Text>
            {periods.map((period) => daySlots.filter((slot) => slot.sessionPeriod === period.key).map((slot, slotIndex) => <Text key={`${period.key}-${slotIndex}`} style={{ color: palette.textMuted, fontSize: 11, lineHeight: 17, marginTop: 4 }}>{period.label} · {slot.startTime}–{slot.endTime} · {slot.activity} ({slot.activityType})</Text>))}
          </View>;
        })}
      </Card>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}><AppButton label="Chỉnh lịch" variant="secondary" onPress={() => setWizardStep('schedule')} /></View>
        <View style={{ flex: 1 }}><AppButton label="Tạo 3 phương án AI" onPress={generate} /></View>
      </View>
    </> : null}
    {roadmap.status === 'loading' ? <LoadingState label={roadmap.data ? 'Đang kích hoạt lộ trình...' : 'Đang tạo các phương án xem trước...'} /> : null}
    {roadmap.status === 'error' ? <ErrorState message={roadmap.message} onRetry={generate} /> : null}
    {roadmap.options.length > 0 && !confirmed && wizardStep === 'preview' ? <>
      <Card><Text style={{ color: palette.text, fontWeight: '800' }}>Lịch đã gửi cho AI</Text><Text style={{ color: palette.textMuted, fontSize: 12, marginTop: 5 }}>{weeklySlots.length} khung/tuần · {Math.floor(weeklyMinutes / 60)} giờ {weeklyMinutes % 60} phút/tuần · lặp {weeks} tuần</Text><Pressable onPress={() => { setSelected(null); setWizardStep('schedule'); }} accessibilityRole="button" style={{ paddingTop: 10 }}><Text style={{ color: palette.primary, fontWeight: '700' }}>Chỉnh lịch</Text></Pressable></Card>
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
        if (selectedPlan && selected !== null) void roadmap.activate(selectedPlan, selected).then((ok) => {
          if (ok) {
            setConfirmed(true);
            void queryClient.invalidateQueries({ queryKey: ['roadmap'] });
          }
        });
      }} />
      <View style={{ height: 10 }} /><AppButton label="Tạo phương án khác" variant="secondary" onPress={generate} />
    </> : null}
    {confirmed ? <Card><Text style={{ color: palette.primary, fontSize: 18, fontWeight: '800' }}>Lộ trình đã bắt đầu</Text><Text style={{ color: palette.textMuted, lineHeight: 21, marginTop: 8 }}>{roadmap.data?.title}. Lịch theo ngày đã có trên trang chủ.</Text><View style={{ marginTop: 14 }}><AppButton label="Về trang chủ" onPress={() => navigationService.navigate('Home')} /></View></Card> : null}
  </Screen>;
}
