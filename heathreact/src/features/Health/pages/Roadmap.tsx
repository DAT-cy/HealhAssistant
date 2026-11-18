import React, { useCallback, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Text, TextInput, View } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Screen from '@/components/ui/Screen';
import Card from '@/components/ui/Card';
import AppButton from '@/components/ui/AppButton';
import MealScheduleCard from '@/features/Health/components/MealScheduleCard';
import ActivityTrackerModal from '@/features/Health/components/ActivityTrackerModal';
import GymCoachModal from '@/features/Health/components/GymCoachModal';
import ReschedulePlanner from '@/features/Health/components/ReschedulePlanner';
import RoadmapWizardModal from '@/features/Health/components/RoadmapWizardModal';
import { ErrorState, LoadingState } from '@/components/ui/StateViews';
import { palette } from '@/theme/tokens';
import { profileService } from '@/api/services/profile.service';
import { coachService } from '@/api/services/coach.service';
import type { ActivitySession, DailyAiReview, RoadmapDay, RoadmapPlanSlot, RoadmapProgress, SessionPeriod } from '@/api/services/coach.service';
import { navigationService } from '@/routes';
import { ApiError } from '@/api/client';
import { activityTypes, periods } from '@/features/Health/components/roadmapWizard.utils';
import { doctorRequestService } from '@/api/services/doctor-request.service';
import DoctorRequestStatusCard from '@/features/Health/components/DoctorRequestStatusCard';
import { useFocusEffect } from 'expo-router';
import { isOpenReview, pendingRequestBlock } from '@/utils/doctorReview';
import { notify } from '@/utils/notify';

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

export default function RoadmapPage() {
  const queryClient = useQueryClient();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardSession, setWizardSession] = useState(0);
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
  const [draftTitle, setDraftTitle] = useState('');
  const [draftEditId, setDraftEditId] = useState<number | null>(null);
  const [draftMessage, setDraftMessage] = useState('');
  const [draftBusy, setDraftBusy] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState<{ id: number; title: string } | null>(null);

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
  const doctorRequestsQuery = useQuery({
    queryKey: ['doctor-requests', 'mine'],
    queryFn: doctorRequestService.mine,
    // Đang chờ bác sĩ thì tự kiểm tra lại mỗi 30 giây để người dùng thấy kết quả mà không cần thoát ra vào lại.
    refetchInterval: (query) => (query.state.data?.some((request) => isOpenReview(request.status)) ? 30_000 : false),
  });
  const refetchDoctorRequests = doctorRequestsQuery.refetch;
  useFocusEffect(useCallback(() => { void refetchDoctorRequests(); }, [refetchDoctorRequests]));

  const profileMissing = profileQuery.isError && profileQuery.error instanceof ApiError && profileQuery.error.status === 404;
  const profileError = profileQuery.isError && !profileMissing
    ? profileQuery.error instanceof ApiError ? profileQuery.error.message : 'Không thể tải hồ sơ.'
    : '';
  const goal = profileQuery.data?.goal ?? '';
  const openWizard = () => {
    const blocked = pendingRequestBlock(doctorRequestsQuery.data);
    if (blocked) { notify.warning(blocked.title, blocked.description); return; }
    setWizardSession((current) => current + 1);
    setWizardOpen(true);
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
  const activeDay = dayQuery.data as RoadmapDay | undefined;
  const roadmapProgress = progressQuery.data as RoadmapProgress | undefined;
  const roadmapList = (historyQuery.data ?? []).filter((item) => item.status !== 'DRAFT' && item.source === 'gemini');
  const previousVersion = activeQuery.data?.previousRoadmapId
    ? historyQuery.data?.find((item) => item.id === activeQuery.data?.previousRoadmapId)
    : undefined;
  const pendingAdjustment = adjustmentQuery.data?.find((item) => item.status === 'PROPOSED');
  const dailyReview = (dailyReviewHistoryQuery.data ?? []).find((item) => item.reviewDate === selectedDate) as DailyAiReview | undefined;

  const createDraft = async () => {
    if (!draftTitle.trim()) { setDraftMessage('Nhập tên bản nháp lộ trình.'); return; }
    setDraftBusy(true); setDraftMessage('');
    try {
      const saved = await coachService.createDraft(draftTitle.trim());
      setSelectedDraft({ id: saved.id, title: saved.title }); setDraftTitle('');
      setDraftMessage('Đã tạo bản nháp. Lịch chỉ được kích hoạt sau khi xác nhận phương án.');
      await historyQuery.refetch();
    } catch (error) { setDraftMessage(error instanceof ApiError ? error.message : 'Không thể tạo bản nháp.'); }
    finally { setDraftBusy(false); }
  };

  const renameDraft = async (id: number) => {
    if (!draftTitle.trim()) { setDraftMessage('Nhập tên bản nháp lộ trình.'); return; }
    setDraftBusy(true); setDraftMessage('');
    try {
      const saved = await coachService.renameDraft(id, draftTitle.trim());
      if (selectedDraft?.id === id) setSelectedDraft({ id, title: saved.title });
      setDraftTitle(''); setDraftEditId(null); setDraftMessage('Đã đổi tên bản nháp.');
      await historyQuery.refetch();
    } catch (error) { setDraftMessage(error instanceof ApiError ? error.message : 'Không thể đổi tên bản nháp.'); }
    finally { setDraftBusy(false); }
  };

  const deleteDraft = async (id: number) => {
    setDraftBusy(true); setDraftMessage('');
    try {
      await coachService.deleteDraft(id);
      if (selectedDraft?.id === id) setSelectedDraft(null);
      setDraftMessage('Đã xóa bản nháp.');
      await historyQuery.refetch();
    } catch (error) { setDraftMessage(error instanceof ApiError ? error.message : 'Không thể xóa bản nháp.'); }
    finally { setDraftBusy(false); }
  };

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

  return <Screen title="Lộ trình của bạn" showBack>
    {activeQuery.isPending ? <LoadingState label="Đang tải lộ trình hiện tại..." /> : null}
    {activeQuery.isError ? <ErrorState message="Không thể tải lộ trình hiện tại." onRetry={() => void activeQuery.refetch()} /> : null}
<Card>
  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
    <View style={{ flex: 1 }}><Text style={{ color: palette.text, fontSize: 20, fontWeight: '800' }}>Lộ trình của bạn</Text><Text style={{ color: palette.textMuted, fontSize: 12, lineHeight: 18, marginTop: 4 }}>Theo dõi và quản lý các kế hoạch sức khỏe cá nhân.</Text></View>
    <Pressable
      onPress={openWizard}
      accessibilityRole="button"
      accessibilityLabel="Tạo lộ trình mới"
      hitSlop={8}
      style={{ width: 56, height: 56, flexShrink: 0, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.primary }}
    >
      <Ionicons name="add" size={30} color={palette.textInverse} />
    </Pressable>
  </View>
</Card>
    <RoadmapWizardModal
      key={wizardSession}
      visible={wizardOpen}
      onClose={() => setWizardOpen(false)}
      onCompleted={() => {
        setWizardOpen(false);
        void queryClient.invalidateQueries({ queryKey: ['roadmap'] });
        void queryClient.invalidateQueries({ queryKey: ['doctor-requests'] });
      }}
      goal={goal}
      knownRequestIds={(doctorRequestsQuery.data ?? []).map((request) => request.id)}
      initialDiseaseCodes={(profileQuery.data?.diseaseCodes ?? '').split(',').map((item) => item.split(':')[0]).filter(Boolean)}
    />
    {/* Luôn hiện trạng thái yêu cầu bác sĩ, kể cả khi người dùng chưa có lộ trình đang hoạt động. */}
    <DoctorRequestStatusCard requests={doctorRequestsQuery.data} />
    {profileError ? <ErrorState message={profileError} onRetry={() => void profileQuery.refetch()} /> : null}
    {false && historyQuery.data?.length === 0 && !activeQuery.data ? <Card><Text style={{ color: palette.text, fontWeight: '700' }}>Chưa có lịch sử lộ trình</Text><Text style={{ color: palette.textMuted, fontSize: 12, lineHeight: 18, marginTop: 5 }}>Các phiên bản đã xác nhận sẽ được lưu tại đây.</Text></Card> : null}
    {historyQuery.isPending ? <LoadingState label="Đang tải danh sách lộ trình..." /> : null}
    {roadmapList.map((item) => (
      <Pressable key={item.id} onPress={() => navigationService.navigate('Roadmap')} accessibilityRole="button" style={({ pressed }) => [{ padding: 14, borderRadius: 10, borderWidth: 1, borderColor: item.status === 'ACTIVE' ? palette.primary : palette.border, backgroundColor: palette.surface }, pressed && { opacity: 0.78 }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}><Text style={{ flex: 1, color: palette.text, fontSize: 15, fontWeight: '800' }}>{item.title}</Text><Text style={{ color: item.status === 'ACTIVE' ? palette.primary : palette.textMuted, fontSize: 11, fontWeight: '700' }}>{item.status === 'ACTIVE' ? 'Đang thực hiện' : item.status === 'COMPLETED' ? 'Hoàn thành' : 'Tạm dừng'}</Text></View>
      <Text style={{ color: palette.textMuted, fontSize: 12, lineHeight: 18, marginTop: 6 }}>{item.overview}</Text>
      <Text style={{ color: palette.textMuted, fontSize: 11, marginTop: 8 }}>{item.durationWeeks ?? 0} tuần · Tạo ngày {item.createdAt.slice(0, 10)}</Text>
    </Pressable>))}
    {activeQuery.data?.source === 'gemini' ? <>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <Text style={{ color: palette.primary, fontSize: 12, fontWeight: '800' }}>ĐANG HOẠT ĐỘNG · PHIÊN BẢN {activeQuery.data.versionNumber ?? '—'}</Text>
          <Text style={{ color: palette.textMuted, fontSize: 11 }}>{activeQuery.data.durationWeeks ?? 0} tuần</Text>
        </View>
        <Text style={{ color: palette.text, fontSize: 18, fontWeight: '800', marginTop: 8 }}>{activeQuery.data.title}</Text>
        <Text style={{ color: palette.textMuted, lineHeight: 20, marginTop: 6 }}>{activeQuery.data.overview}</Text>
        {activeQuery.data.fullText ? <View style={{ marginTop: 12, padding: 12, borderRadius: 9, backgroundColor: palette.surfaceRaised }}><Text style={{ color: palette.primary, fontSize: 11, fontWeight: '800' }}>TOÀN BỘ PHÂN TÍCH</Text><Text selectable style={{ color: palette.text, fontSize: 12, lineHeight: 19, marginTop: 7 }}>{activeQuery.data.fullText}</Text></View> : null}
        <Text style={{ color: palette.textMuted, fontSize: 11, marginTop: 8 }}>Bắt đầu {activeQuery.data.startDate ?? 'chưa xác định'} · {activeQuery.data.source === 'gemini' ? 'Đề xuất AI' : 'Dữ liệu đã lưu'}</Text>
        {activeQuery.data.changeReason ? <Text style={{ color: palette.textMuted, fontSize: 11, marginTop: 4 }}>Lý do phiên bản: {activeQuery.data.changeReason === 'INITIAL_PLAN' ? 'Kế hoạch ban đầu' : 'Bạn xác nhận phương án mới'}</Text> : null}
        {false && previousVersion ? <Pressable onPress={() => setCompareWithPrevious((value) => !value)} accessibilityRole="button" style={{ minHeight: 42, marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 9, borderWidth: 1, borderColor: palette.border }}>
          <Text style={{ color: palette.primary, fontWeight: '700', fontSize: 12 }}>{compareWithPrevious ? 'Ẩn so sánh phiên bản' : `So sánh với phiên bản ${previousVersion?.versionNumber ?? 'trước'}`}</Text>
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
            <Pressable disabled={dayIndex >= roadmapDays - 1} onPress={() => { setChosenDayIndex(dayIndex + 1); setExpandedSlotId(null); }} accessibilityRole="button" accessibilityLabel="Ngày tiếp theo" style={{ width: 42, height: 42, alignItems: 'center', justifyContent: 'center', opacity: dayIndex >= roadmapDays - 1 ? 0.35 : 1 }}><Text style={{ color: palette.primary, fontWeight: '700' }}>Sau</Text></Pressable>
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
      {false && compareWithPrevious && previousVersion ? <View style={{ flexDirection: 'row', gap: 8 }}>
        <Card style={{ flex: 1 }}><Text style={{ color: palette.text, fontWeight: '800', fontSize: 12 }}>Hiện tại · v{activeQuery.data?.versionNumber ?? '—'}</Text><Text style={{ color: palette.textMuted, fontSize: 11, lineHeight: 17, marginTop: 7 }}>{activeQuery.data?.overview}</Text></Card>
        <Card style={{ flex: 1 }}><Text style={{ color: palette.text, fontWeight: '800', fontSize: 12 }}>Trước đó · v{previousVersion?.versionNumber ?? '—'}</Text><Text style={{ color: palette.textMuted, fontSize: 11, lineHeight: 17, marginTop: 7 }}>{previousVersion?.overview}</Text></Card>
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
    {false ? <Card style={{ gap: 9 }}>
      <Text style={{ color: palette.text, fontSize: 16, fontWeight: '800' }}>Bản nháp lộ trình</Text>
      <Text style={{ color: palette.textMuted, fontSize: 12, lineHeight: 18 }}>Lưu tên lộ trình trước. Lịch chỉ được áp dụng sau khi bạn chọn phương án và xác nhận.</Text>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <TextInput value={draftTitle} onChangeText={setDraftTitle} placeholder="Tên bản nháp" placeholderTextColor={palette.textMuted} style={{ flex: 1, minHeight: 42, paddingHorizontal: 10, borderRadius: 7, borderWidth: 1, borderColor: palette.border, color: palette.text, backgroundColor: palette.surface }} />
        <AppButton label={draftEditId ? 'Đổi tên' : 'Tạo nháp'} loading={draftBusy} disabled={draftBusy} onPress={() => void (draftEditId ? renameDraft(draftEditId) : createDraft())} />
      </View>
      {selectedDraft ? <Text style={{ color: palette.primary, fontSize: 12 }}>Đang dùng bản nháp: {selectedDraft?.title}</Text> : null}
      {historyQuery.data?.filter((item) => item.status === 'DRAFT').map((item) => <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5, borderTopWidth: 1, borderColor: palette.border }}>
        <Pressable onPress={() => setSelectedDraft({ id: item.id, title: item.title })} accessibilityRole="radio" accessibilityState={{ selected: selectedDraft?.id === item.id }} style={{ flex: 1, minHeight: 36, justifyContent: 'center' }}><Text numberOfLines={1} style={{ color: selectedDraft?.id === item.id ? palette.primary : palette.text, fontWeight: '700' }}>{item.title}</Text></Pressable>
        <Pressable onPress={() => { setDraftEditId(item.id); setDraftTitle(item.title); }} accessibilityRole="button" accessibilityLabel="Đổi tên bản nháp" style={{ padding: 7 }}><Ionicons name="create-outline" size={18} color={palette.textMuted} /></Pressable>
        <Pressable onPress={() => void deleteDraft(item.id)} disabled={draftBusy} accessibilityRole="button" accessibilityLabel="Xóa bản nháp" style={{ padding: 7 }}><Ionicons name="trash-outline" size={18} color={palette.danger} /></Pressable>
      </View>)}
      {draftMessage ? <Text accessibilityLiveRegion="polite" style={{ color: draftMessage.startsWith('Đã') ? palette.primary : palette.danger, fontSize: 12 }}>{draftMessage}</Text> : null}
    </Card> : null}
    {historyQuery.isError ? <ErrorState message="Không thể tải danh sách lộ trình." onRetry={() => void historyQuery.refetch()} /> : null}
    {false && (historyQuery.data ?? []).filter((item) => item.status !== 'ACTIVE').length > 0 ? <Card>
      <Text style={{ color: palette.text, fontSize: 16, fontWeight: '800' }}>Lịch sử phiên bản</Text>
      {(historyQuery.data ?? []).filter((item) => item.status !== 'ACTIVE').map((item) => <View key={item.id} style={{ borderBottomWidth: 1, borderColor: palette.border }}>
        <Pressable onPress={() => setExpandedHistoryId((current) => current === item.id ? null : item.id)} accessibilityRole="button" style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1 }}><Text style={{ color: palette.text, fontWeight: '700' }}>Phiên bản {item.versionNumber ?? '—'} · {item.title}</Text><Text style={{ color: palette.textMuted, fontSize: 11, marginTop: 3 }}>{item.status === 'ARCHIVED' ? 'Đã lưu trữ' : item.status} · {item.createdAt.slice(0, 10)}</Text></View>
          <Text style={{ color: palette.primary }}>{expandedHistoryId === item.id ? 'Ẩn' : 'Xem'}</Text>
        </Pressable>
        {expandedHistoryId === item.id ? <Text style={{ color: palette.textMuted, fontSize: 12, lineHeight: 19, paddingBottom: 12 }}>{item.overview}{item.changeReason ? `\nLý do: ${item.changeReason}` : ''}</Text> : null}
      </View>)}
    </Card> : null}
  </Screen>;
}
