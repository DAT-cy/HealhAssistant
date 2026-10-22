import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Screen from '@/components/ui/Screen';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import AppButton from '@/components/ui/AppButton';
import { ErrorState, LoadingState } from '@/components/ui/StateViews';
import { dailyPlanService } from '@/api/services/daily-plan.service';
import { healthTrackingService } from '@/api/services/health-tracking.service';
import { ApiError } from '@/api/client';
import { palette } from '@/theme/tokens';

const DAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export default function DailyPlanPage() {
  const today = dateKey(new Date());
  const { date: routeDate } = useLocalSearchParams<{ date?: string }>();
  const initialDate = typeof routeDate === 'string' && isDateKey(routeDate) ? routeDate : today;
  return <DailyPlanCalendar key={initialDate} initialDate={initialDate} />;
}

function DailyPlanCalendar({ initialDate }: { initialDate: string }) {
  const today = dateKey(new Date());
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [weekStart, setWeekStart] = useState(() => mondayOf(initialDate));
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');
  const queryClient = useQueryClient();
  const planQuery = useQuery({
    queryKey: ['daily-plan', selectedDate],
    queryFn: () => dailyPlanService.forDate(selectedDate),
  });
  const availabilityQuery = useQuery({
    queryKey: ['availability', 'me'],
    queryFn: healthTrackingService.availability,
  });
  const plan = planQuery.data;
  const selected = fromDateKey(selectedDate);
  const selectedSlots = (availabilityQuery.data ?? []).filter((slot) => slot.dayOfWeek === (selected.getDay() || 7));
  const sourceLabel = plan?.source === 'gemini' ? 'AI đề xuất'
    : plan?.source === 'safety-rule' ? 'Ưu tiên an toàn'
      : plan?.source === 'rest-day' ? 'Ngày nghỉ'
        : plan?.source === 'fallback-no-profile' ? 'Kế hoạch mẫu'
          : 'Kế hoạch dự phòng';

  const changeWeek = (amount: number) => {
    const nextWeek = addDateDays(weekStart, amount * 7);
    setWeekStart(nextWeek);
    setSelectedDate(dateKey(nextWeek));
  };

  const regenerate = async () => {
    setGenerating(true);
    setGenerateError('');
    try {
      const updated = await dailyPlanService.generateDate(selectedDate);
      queryClient.setQueryData(['daily-plan', selectedDate], updated);
    } catch (error) {
      setGenerateError(error instanceof ApiError ? error.message : 'Không thể tạo kế hoạch cho ngày này.');
    } finally {
      setGenerating(false);
    }
  };

  return <Screen title="Lịch tập luyện" subtitle="Chọn ngày để xem buổi tập và giờ đã xếp" showBack>
    <View style={styles.weekHeading}>
      <Pressable onPress={() => changeWeek(-1)} accessibilityRole="button" accessibilityLabel="Tuần trước" style={styles.weekArrow}><Ionicons name="chevron-back" size={19} color={palette.text} /></Pressable>
      <Text style={styles.weekTitle}>{formatShortDate(weekStart)} - {formatShortDate(addDateDays(weekStart, 6))}</Text>
      <Pressable onPress={() => changeWeek(1)} accessibilityRole="button" accessibilityLabel="Tuần sau" style={styles.weekArrow}><Ionicons name="chevron-forward" size={19} color={palette.text} /></Pressable>
    </View>

    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.calendarStrip}>
      {Array.from({ length: 7 }, (_, index) => {
        const date = addDateDays(weekStart, index);
        const key = dateKey(date);
        const day = date.getDay() || 7;
        const slot = (availabilityQuery.data ?? []).filter((item) => item.dayOfWeek === day).sort((a, b) => a.startTime.localeCompare(b.startTime))[0];
        const active = key === selectedDate;
        const isToday = key === today;
        return <Pressable key={key} onPress={() => setSelectedDate(key)} accessibilityRole="button" accessibilityState={{ selected: active }} style={[styles.dateTile, active && styles.dateTileActive]}>
          <Text style={[styles.dateDay, active && styles.dateTextActive]}>{DAY_LABELS[index]}</Text>
          <Text style={[styles.dateNumber, active && styles.dateTextActive]}>{date.getDate()}</Text>
          <Text style={[styles.dateTime, active && styles.dateTextActive]}>{slot?.startTime ?? (isToday ? 'Hôm nay' : 'Nghỉ')}</Text>
        </Pressable>;
      })}
    </ScrollView>

    <View style={styles.selectedHeading}>
      <View style={{ flex: 1 }}>
        <Text style={styles.selectedKicker}>{selectedDate === today ? 'HÔM NAY' : 'NGÀY ĐÃ CHỌN'}</Text>
        <Text style={styles.selectedTitle}>{selected.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
      </View>
      {plan ? <Badge label={sourceLabel} tone={plan.source === 'gemini' ? 'success' : plan.source === 'safety-rule' ? 'warning' : 'info'} /> : null}
    </View>

    {planQuery.isLoading ? <LoadingState label="Đang xếp lịch cho ngày này..." /> : null}
    {planQuery.isError ? <ErrorState message={planQuery.error instanceof Error ? planQuery.error.message : 'Không thể tải lịch ngày này.'} onRetry={() => void planQuery.refetch()} /> : null}

    {selectedSlots.length > 0 ? <Card style={styles.slotsCard}>
      <Text style={styles.slotsTitle}>Khung giờ trong ngày</Text>
      {selectedSlots.map((slot, index) => <View key={slot.id} style={[styles.slotRow, index > 0 && styles.slotRowDivider]}>
        <View style={styles.slotTime}><Ionicons name="time-outline" size={15} color={palette.primary} /><Text style={styles.slotTimeText}>{formatTime(slot.startTime)} - {formatTime(slot.endTime)}</Text></View>
        <Text style={styles.slotMeta}>{activityLabel(slot.activityType)} · {locationLabel(slot.locationType)}</Text>
      </View>)}
    </Card> : null}

    {plan ? <>
      {plan.scheduledStart && plan.scheduledEnd ? <Card style={styles.timeCard}>
        <View style={styles.timeIcon}><Ionicons name="time-outline" size={21} color={palette.primary} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.timeLabel}>GIỜ TẬP</Text>
          <Text style={styles.timeValue}>{plan.scheduledStart} - {plan.scheduledEnd}</Text>
          <Text style={styles.timeMeta}>{activityLabel(plan.activityType)} · {locationLabel(plan.locationType)}</Text>
        </View>
        <Text style={styles.duration}>{plan.duration}</Text>
      </Card> : <Card style={styles.restCard}>
        <Ionicons name="bed-outline" size={20} color="#A66A21" />
        <Text style={styles.restText}>{plan.source === 'safety-rule' ? 'Tạm dừng vận động theo lưu ý an toàn.' : 'Ngày này chưa có khung giờ tập. Đây là ngày nghỉ trong lịch của bạn.'}</Text>
      </Card>}

      <View style={styles.sectionTitleRow}><Text style={styles.sectionTitle}>{plan.title}</Text><Text style={styles.count}>{plan.activities.length} hoạt động</Text></View>
      {plan.activities.map((activity, index) => <Card key={`${plan.date}-${index}`} style={styles.activityCard}>
        <View style={styles.activityNumber}><Text style={styles.activityNumberText}>{String(index + 1).padStart(2, '0')}</Text></View>
        <Text style={styles.activityText}>{activity}</Text>
      </Card>)}

      {plan.safetyNotes.length ? <Card style={styles.safetyCard}>
        <View style={styles.safetyHeading}><Ionicons name="shield-checkmark-outline" size={18} color="#A66A21" /><Text style={styles.safetyTitle}>Lưu ý</Text></View>
        {plan.safetyNotes.map((note, index) => <Text key={index} style={styles.safetyText}>{note}</Text>)}
      </Card> : null}

      {plan.source !== 'gemini' && plan.source !== 'safety-rule' && plan.source !== 'rest-day' ? <AppButton label="Tạo lại kế hoạch ngày này" variant="secondary" onPress={() => void regenerate()} loading={generating} /> : null}
      {generateError ? <Text style={styles.error}>{generateError}</Text> : null}
    </> : null}
    {availabilityQuery.isError ? <Text style={styles.error}>Không tải được các khung giờ rảnh.</Text> : null}
    {selectedSlots.length > 1 ? <Text style={styles.moreSlots}>Bạn còn {selectedSlots.length - 1} khung giờ khác trong ngày này.</Text> : null}
  </Screen>;
}

function formatTime(value: string) {
  return value.slice(0, 5);
}

function activityLabel(type: string | null) {
  return ({ WORKOUT: 'Tập luyện', WALKING: 'Đi bộ', MOBILITY: 'Giãn cơ', OTHER: 'Hoạt động khác' } as Record<string, string>)[type ?? ''] ?? 'Vận động';
}

function locationLabel(type: string | null) {
  return ({ HOME: 'Tại nhà', GYM: 'Phòng tập', OUTDOOR: 'Ngoài trời', ANYWHERE: 'Bất kỳ đâu' } as Record<string, string>)[type ?? ''] ?? 'Địa điểm linh hoạt';
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function isDateKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(fromDateKey(value).getTime());
}

function fromDateKey(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function mondayOf(value: string) {
  const date = fromDateKey(value);
  return addDateDays(date, -((date.getDay() + 6) % 7));
}

function addDateDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function formatShortDate(date: Date) {
  return date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' });
}

const styles = {
  weekHeading: { minHeight: 42, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const },
  weekArrow: { width: 36, height: 36, alignItems: 'center' as const, justifyContent: 'center' as const, borderWidth: 1, borderColor: palette.border, borderRadius: 8, backgroundColor: palette.surface },
  weekTitle: { color: palette.text, fontSize: 13, fontWeight: '700' as const },
  calendarStrip: { gap: 7, paddingVertical: 4 },
  dateTile: { width: 57, minHeight: 74, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 4, borderWidth: 1, borderColor: palette.border, borderRadius: 9, backgroundColor: palette.surface },
  dateTileActive: { borderColor: palette.primary, backgroundColor: palette.primary },
  dateDay: { color: palette.textMuted, fontSize: 10, fontWeight: '700' as const },
  dateNumber: { color: palette.text, fontSize: 17, fontWeight: '800' as const },
  dateTime: { color: palette.primary, fontSize: 8, fontWeight: '700' as const },
  dateTextActive: { color: palette.textInverse },
  selectedHeading: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10, marginTop: 5, marginBottom: 3 },
  selectedKicker: { color: palette.primary, fontSize: 9, fontWeight: '800' as const },
  selectedTitle: { color: palette.text, fontSize: 18, fontWeight: '800' as const, textTransform: 'capitalize' as const, marginTop: 2 },
  timeCard: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 11, backgroundColor: '#F3F2FF' },
  slotsCard: { gap: 8 },
  slotsTitle: { color: palette.text, fontSize: 12, fontWeight: '800' as const },
  slotRow: { minHeight: 36, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, gap: 8 },
  slotRowDivider: { borderTopWidth: 1, borderTopColor: palette.border, paddingTop: 7 },
  slotTime: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6 },
  slotTimeText: { color: palette.text, fontSize: 12, fontWeight: '700' as const },
  slotMeta: { color: palette.textMuted, fontSize: 10, textAlign: 'right' as const },
  timeIcon: { width: 40, height: 40, alignItems: 'center' as const, justifyContent: 'center' as const, borderRadius: 12, backgroundColor: '#E7E5FF' },
  timeLabel: { color: palette.primary, fontSize: 9, fontWeight: '800' as const },
  timeValue: { color: palette.text, fontSize: 16, fontWeight: '800' as const, marginTop: 3 },
  timeMeta: { color: palette.textMuted, fontSize: 10, marginTop: 3 },
  duration: { color: palette.textMuted, fontSize: 10, fontWeight: '700' as const },
  restCard: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10, backgroundColor: '#FFF7E8', borderColor: '#F5DEB8' },
  restText: { flex: 1, color: '#815A27', fontSize: 12, lineHeight: 18 },
  sectionTitleRow: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, gap: 8, marginTop: 6 },
  sectionTitle: { flex: 1, color: palette.text, fontSize: 15, fontWeight: '800' as const },
  count: { color: palette.primary, fontSize: 11, fontWeight: '800' as const },
  activityCard: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 11, paddingVertical: 12 },
  activityNumber: { width: 31, height: 31, alignItems: 'center' as const, justifyContent: 'center' as const, borderRadius: 10, backgroundColor: palette.accentSoft },
  activityNumberText: { color: '#268FCB', fontSize: 10, fontWeight: '800' as const },
  activityText: { flex: 1, color: palette.text, fontSize: 13, lineHeight: 19 },
  safetyCard: { backgroundColor: '#FFF9EC', borderColor: '#FFE9BF' },
  safetyHeading: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 7, marginBottom: 5 },
  safetyTitle: { color: '#9A641E', fontSize: 12, fontWeight: '800' as const },
  safetyText: { color: '#806844', fontSize: 11, lineHeight: 17, marginTop: 4 },
  error: { color: palette.danger, fontSize: 12, lineHeight: 18 },
  moreSlots: { color: palette.textMuted, fontSize: 11, marginBottom: 6 },
};
