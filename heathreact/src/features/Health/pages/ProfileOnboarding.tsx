import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import Screen from '@/components/ui/Screen';
import Card from '@/components/ui/Card';
import AppButton from '@/components/ui/AppButton';
import { ApiError } from '@/api/client';
import { profileService } from '@/api/services/profile.service';
import { healthTrackingService, type AvailabilitySlot, type AvailabilitySlotInput } from '@/api/services/health-tracking.service';
import type { ProfileGender } from '@/components/ui/Avatar';
import { useUserStore } from '@/stores/user';
import { palette } from '@/theme/tokens';
import { isProfileComplete } from '@/utils/profileCompletion';

type YesNo = 'yes' | 'no' | null;

const GOALS = [
  ['Giảm cân', 'Giảm cân'],
  ['Duy trì cân nặng', 'Duy trì'],
  ['Tăng cơ', 'Tăng cơ'],
] as const;

const ACTIVITY_LEVELS = [
  ['Ít vận động', 'Ít vận động'],
  ['Mới bắt đầu', 'Mới bắt đầu'],
  ['Trung bình', 'Thỉnh thoảng tập'],
  ['Năng động', 'Tập thường xuyên'],
] as const;
const WEEK_DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const TIME_PERIODS = [
  { id: 'MORNING', label: 'Sáng', startTime: '06:00', endTime: '08:00' },
  { id: 'AFTERNOON', label: 'Chiều', startTime: '12:00', endTime: '14:00' },
  { id: 'EVENING', label: 'Tối', startTime: '18:00', endTime: '20:00' },
] as const;
type TimePeriodId = (typeof TIME_PERIODS)[number]['id'];
type TimeRange = { startTime: string; endTime: string };

const emptyDayPeriods = (): Record<number, TimePeriodId[]> => Object.fromEntries(WEEK_DAYS.map((_, index) => [index + 1, []])) as Record<number, TimePeriodId[]>;
const defaultPeriodTimes = (): Record<TimePeriodId, TimeRange> => Object.fromEntries(TIME_PERIODS.map((period) => [period.id, { startTime: period.startTime, endTime: period.endTime }])) as Record<TimePeriodId, TimeRange>;
const emptyDayTimes = (): Record<number, Partial<Record<TimePeriodId, TimeRange>>> => Object.fromEntries(WEEK_DAYS.map((_, index) => [index + 1, {}])) as Record<number, Partial<Record<TimePeriodId, TimeRange>>>;

export default function ProfileOnboardingPage() {
  const setProfileComplete = useUserStore((state) => state.setProfileComplete);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [goal, setGoal] = useState('');
  const [activityLevel, setActivityLevel] = useState('');
  const [age, setAge] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [gender, setGender] = useState<ProfileGender | null>(null);
  const [restrictionChoice, setRestrictionChoice] = useState<YesNo>(null);
  const [restrictions, setRestrictions] = useState('');
  const [painChoice, setPainChoice] = useState<YesNo>(null);
  const [painAreas, setPainAreas] = useState('');
  const [consent, setConsent] = useState(false);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [scheduleMode, setScheduleMode] = useState<'WEEK' | 'DAY'>('WEEK');
  const [selectedDay, setSelectedDay] = useState(1);
  const [weekPeriods, setWeekPeriods] = useState<TimePeriodId[]>(['EVENING']);
  const [weekTimes, setWeekTimes] = useState<Record<TimePeriodId, TimeRange>>(defaultPeriodTimes);
  const [dayPeriods, setDayPeriods] = useState<Record<number, TimePeriodId[]>>(emptyDayPeriods);
  const [dayTimes, setDayTimes] = useState<Record<number, Partial<Record<TimePeriodId, TimeRange>>>>(emptyDayTimes);
  const [activityType, setActivityType] = useState<AvailabilitySlot['activityType']>('WORKOUT');
  const [locationType, setLocationType] = useState<AvailabilitySlot['locationType']>('HOME');

  useEffect(() => {
    let active = true;
    Promise.all([
      profileService.getMine().catch((reason) => {
        if (reason instanceof ApiError && reason.status === 404) return null;
        throw reason;
      }),
      healthTrackingService.availability(),
    ]).then(([profile, slots]) => {
      if (!active) return;
      setAvailability(slots);
      const savedDayPeriods = emptyDayPeriods();
      const savedDayTimes = emptyDayTimes();
      slots.forEach((slot) => {
        const period = TIME_PERIODS.find((item) => slot.startTime >= item.startTime && slot.startTime < item.endTime);
        if (period) {
          savedDayPeriods[slot.dayOfWeek].push(period.id);
          savedDayTimes[slot.dayOfWeek][period.id] = { startTime: slot.startTime, endTime: slot.endTime };
        }
      });
      setDayPeriods(savedDayPeriods);
      setDayTimes(savedDayTimes);
      if (slots.length > 0) setScheduleMode('DAY');
      if (slots[0]) { setActivityType(slots[0].activityType); setLocationType(slots[0].locationType); }
      if (!profile) return;
      setGoal(profile.goal || '');
      setActivityLevel(profile.activityLevel || '');
      setAge(profile.age?.toString() || '');
      setHeightCm(profile.heightCm?.toString() || '');
      setWeightKg(profile.weightKg?.toString() || '');
      setGender(profile.gender || null);
      setConsent(profile.consent);
      const savedRestrictions = profile.restrictions?.trim() || '';
      setRestrictionChoice(savedRestrictions ? (savedRestrictions.toLowerCase() === 'không có' ? 'no' : 'yes') : null);
      setRestrictions(savedRestrictions.toLowerCase() === 'không có' ? '' : savedRestrictions);
      const savedPainAreas = profile.painAreas?.trim() || '';
      setPainChoice(savedPainAreas ? (savedPainAreas.toLowerCase() === 'không có' ? 'no' : 'yes') : null);
      setPainAreas(savedPainAreas.toLowerCase() === 'không có' ? '' : savedPainAreas);
    }).catch((reason) => {
      if (active && !(reason instanceof ApiError && reason.status === 404)) {
        setError(reason instanceof Error ? reason.message : 'Không thể tải hồ sơ.');
      }
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const save = async () => {
    const numericAge = Number(age);
    const numericHeight = Number(heightCm.replace(',', '.'));
    const numericWeight = Number(weightKg.replace(',', '.'));
    if (!goal || !activityLevel || !age.trim() || !heightCm.trim() || !weightKg.trim()) {
      setError('Hãy hoàn tất mục tiêu, mức vận động, tuổi, chiều cao và cân nặng.');
      return;
    }
    if (!Number.isInteger(numericAge) || numericAge < 5 || numericAge > 120 || !Number.isFinite(numericHeight) || numericHeight <= 0 || !Number.isFinite(numericWeight) || numericWeight <= 0) {
      setError('Kiểm tra lại tuổi, chiều cao và cân nặng.');
      return;
    }
    if (restrictionChoice === null || painChoice === null) {
      setError('Hãy cho biết có hạn chế vận động hoặc vùng đau cần lưu ý hay không.');
      return;
    }
    if ((restrictionChoice === 'yes' && !restrictions.trim()) || (painChoice === 'yes' && !painAreas.trim())) {
      setError('Hãy mô tả ngắn các mục đã chọn “Có”, hoặc đổi lựa chọn thành “Không có”.');
      return;
    }
    if (!consent) {
      setError('Bạn cần đồng ý sử dụng dữ liệu hồ sơ để tạo kế hoạch tập luyện.');
      return;
    }
    const scheduledPeriods = scheduleMode === 'WEEK'
      ? WEEK_DAYS.flatMap((_, index) => weekPeriods.map((periodId) => ({ dayOfWeek: index + 1, periodId, ...weekTimes[periodId] })))
      : Object.entries(dayPeriods).flatMap(([day, periods]) => periods.map((periodId) => ({ dayOfWeek: Number(day), periodId, ...(dayTimes[Number(day)][periodId] ?? defaultPeriodTimes()[periodId]) })));
    if (scheduledPeriods.length === 0 && availability.length === 0) {
      setError('Chọn ít nhất một khung Sáng, Chiều hoặc Tối để xếp lịch tập.');
      return;
    }
    const validTime = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
    const invalidPeriod = scheduledPeriods.find(({ startTime, endTime }) => {
      if (!validTime(startTime) || !validTime(endTime)) return true;
      const [startHour, startMinute] = startTime.split(':').map(Number);
      const [endHour, endMinute] = endTime.split(':').map(Number);
      return endHour * 60 + endMinute - (startHour * 60 + startMinute) < 15;
    });
    if (invalidPeriod) {
      setError('Mỗi ca cần có giờ theo dạng HH:MM và kéo dài ít nhất 15 phút.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const profile = await profileService.save({
        goal,
        activityLevel,
        gender,
        age: numericAge,
        heightCm: numericHeight,
        weightKg: numericWeight,
        restrictions: restrictionChoice === 'no' ? 'Không có' : restrictions.trim(),
        painAreas: painChoice === 'no' ? 'Không có' : painAreas.trim(),
        consent: true,
      });
      const requestedSlots: AvailabilitySlotInput[] = scheduledPeriods.map(({ dayOfWeek, startTime, endTime }) =>
        ({ dayOfWeek, startTime, endTime, activityType, locationType, equipmentNotes: null }));
      const slotsToCreate = requestedSlots.filter((request) => !availability.some((slot) =>
        slot.dayOfWeek === request.dayOfWeek && request.startTime < slot.endTime && request.endTime > slot.startTime));
      const created = slotsToCreate.length > 0 ? await healthTrackingService.createAvailabilityBatch(slotsToCreate) : [];
      const savedSlots = [...availability, ...created];
      setAvailability(savedSlots);
      const complete = isProfileComplete(profile, savedSlots.length > 0);
      setProfileComplete(complete);
      if (complete) router.replace('/(user)');
      else setError('Chưa lưu đủ thông tin. Hãy kiểm tra lại các mục bắt buộc.');
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Không thể lưu hồ sơ. Hãy thử lại.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Screen title="Hoàn thiện hồ sơ"><ActivityIndicator color={palette.primary} /></Screen>;

  const activePeriods = scheduleMode === 'WEEK' ? weekPeriods : dayPeriods[selectedDay];
  const updateActivePeriodTime = (periodId: TimePeriodId, field: keyof TimeRange, value: string) => {
    if (scheduleMode === 'WEEK') {
      setWeekTimes((current) => ({ ...current, [periodId]: { ...current[periodId], [field]: value } }));
      return;
    }
    setDayTimes((current) => ({
      ...current,
      [selectedDay]: {
        ...current[selectedDay],
        [periodId]: { ...(current[selectedDay][periodId] ?? defaultPeriodTimes()[periodId]), [field]: value },
      },
    }));
  };

  return <Screen title="Hoàn thiện hồ sơ" subtitle="Thông tin này giúp cá nhân hóa kế hoạch vận động">
    <Card>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
        <Ionicons name="person-circle-outline" size={23} color={palette.primary} />
        <Text style={{ flex: 1, color: palette.text, fontSize: 14, lineHeight: 21 }}>
          Nhập đầy đủ thông tin để hệ thống hiểu thể trạng và đưa ra khuyến nghị phù hợp hơn. Đây không phải chẩn đoán y khoa.
        </Text>
      </View>
    </Card>

    <Card>
      <Text style={styles.sectionTitle}>Lịch sinh hoạt hằng tuần</Text>
      <Text style={styles.note}>Chọn khung giờ bạn thường có thể tập. Bạn có thể áp dụng giống nhau cả tuần hoặc tùy chỉnh từng ngày.</Text>
      <View style={styles.options}>
        <Choice label="Cả tuần" selected={scheduleMode === 'WEEK'} onPress={() => setScheduleMode('WEEK')} />
        <Choice label="Theo từng ngày" selected={scheduleMode === 'DAY'} onPress={() => setScheduleMode('DAY')} />
      </View>
      {scheduleMode === 'DAY' ? <>
        <Text style={styles.label}>Chọn ngày</Text>
        <View style={styles.dayOptions}>
          {WEEK_DAYS.map((label, index) => {
            const day = index + 1;
            const count = dayPeriods[day].length;
            return <Pressable key={day} onPress={() => setSelectedDay(day)} accessibilityRole="radio" accessibilityState={{ selected: selectedDay === day }} style={[styles.dayChoice, selectedDay === day && styles.choiceSelected]}>
              <Text style={[styles.choiceText, selectedDay === day && styles.choiceTextSelected]}>{label}</Text>
              {count > 0 ? <Text style={[styles.dayCount, selectedDay === day && styles.choiceTextSelected]}>{count}</Text> : null}
            </Pressable>;
          })}
        </View>
      </> : null}
      <Text style={styles.label}>{scheduleMode === 'WEEK' ? 'Khung giờ áp dụng cho T2 - CN' : `Khung giờ cho ${WEEK_DAYS[selectedDay - 1]}`}</Text>
      <View style={styles.periodOptions}>
        {TIME_PERIODS.map((period) => {
          const selected = activePeriods.includes(period.id);
          const toggle = () => {
            const update = (periods: TimePeriodId[]) => selected ? periods.filter((id) => id !== period.id) : [...periods, period.id];
            if (scheduleMode === 'WEEK') setWeekPeriods(update);
            else setDayPeriods((current) => ({ ...current, [selectedDay]: update(current[selectedDay]) }));
          };
          return <Pressable key={period.id} onPress={toggle} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} style={[styles.periodChoice, selected && styles.choiceSelected]}>
            <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{period.label}</Text>
          </Pressable>;
        })}
      </View>
      {activePeriods.map((periodId) => {
        const period = TIME_PERIODS.find((item) => item.id === periodId)!;
        const range = scheduleMode === 'WEEK' ? weekTimes[periodId] : dayTimes[selectedDay][periodId] ?? defaultPeriodTimes()[periodId];
        return <View key={periodId} style={styles.periodTimeRow}>
          <Text style={styles.periodName}>{period.label}</Text>
          <View style={styles.timeInput}><Text style={styles.timeLabel}>Bắt đầu</Text><Field value={range.startTime} onChangeText={(value) => updateActivePeriodTime(periodId, 'startTime', value)} placeholder="06:00" keyboardType="numbers-and-punctuation" /></View>
          <View style={styles.timeInput}><Text style={styles.timeLabel}>Kết thúc</Text><Field value={range.endTime} onChangeText={(value) => updateActivePeriodTime(periodId, 'endTime', value)} placeholder="08:00" keyboardType="numbers-and-punctuation" /></View>
        </View>;
      })}
      <Text style={styles.label}>Hoạt động</Text>
      <View style={styles.options}>{([['WORKOUT', 'Tập luyện'], ['WALKING', 'Đi bộ'], ['MOBILITY', 'Giãn cơ']] as const).map(([value, label]) => <Choice key={value} label={label} selected={activityType === value} onPress={() => setActivityType(value)} />)}</View>
      <Text style={styles.label}>Địa điểm</Text>
      <View style={styles.options}>{([['HOME', 'Tại nhà'], ['GYM', 'Phòng tập'], ['OUTDOOR', 'Ngoài trời'], ['ANYWHERE', 'Bất kỳ']] as const).map(([value, label]) => <Choice key={value} label={label} selected={locationType === value} onPress={() => setLocationType(value)} />)}</View>
    </Card>

    <Card>
      <Text style={styles.sectionTitle}>Thông tin cơ bản</Text>
      <Text style={styles.label}>Mục tiêu *</Text>
      <View style={styles.options}>
        {GOALS.map(([value, label]) => <Choice key={value} label={label} selected={goal === value} onPress={() => setGoal(value)} />)}
      </View>
      <Text style={styles.label}>Mức vận động hiện tại *</Text>
      <View style={styles.options}>
        {ACTIVITY_LEVELS.map(([value, label]) => <Choice key={value} label={label} selected={activityLevel === value} onPress={() => setActivityLevel(value)} />)}
      </View>
      <Text style={styles.label}>Tuổi *</Text>
      <Field value={age} onChangeText={setAge} placeholder="Ví dụ: 28" keyboardType="number-pad" />
      <Text style={styles.label}>Chiều cao (cm) *</Text>
      <Field value={heightCm} onChangeText={setHeightCm} placeholder="Ví dụ: 165" keyboardType="decimal-pad" />
      <Text style={styles.label}>Cân nặng (kg) *</Text>
      <Field value={weightKg} onChangeText={setWeightKg} placeholder="Ví dụ: 60" keyboardType="decimal-pad" />
      <Text style={styles.label}>Giới tính hiển thị · tùy chọn</Text>
      <View style={styles.options}>
        <Choice label="Nam" selected={gender === 'MALE'} onPress={() => setGender('MALE')} />
        <Choice label="Nữ" selected={gender === 'FEMALE'} onPress={() => setGender('FEMALE')} />
        <Choice label="Bỏ qua" selected={gender === null} onPress={() => setGender(null)} />
      </View>
    </Card>

    <Card>
      <Text style={styles.sectionTitle}>Thông tin cần lưu ý</Text>
      <Text style={styles.label}>Bạn có hạn chế vận động hoặc hạn chế dụng cụ không? *</Text>
      <View style={styles.options}>
        <Choice label="Có" selected={restrictionChoice === 'yes'} onPress={() => setRestrictionChoice('yes')} />
        <Choice label="Không có" selected={restrictionChoice === 'no'} onPress={() => setRestrictionChoice('no')} />
      </View>
      {restrictionChoice === 'yes' ? <Field value={restrictions} onChangeText={setRestrictions} placeholder="Mô tả ngắn hạn chế hoặc dụng cụ sẵn có" multiline /> : null}
      <Text style={styles.label}>Có vùng đau hoặc khó chịu cần lưu ý khi vận động không? *</Text>
      <View style={styles.options}>
        <Choice label="Có" selected={painChoice === 'yes'} onPress={() => setPainChoice('yes')} />
        <Choice label="Không có" selected={painChoice === 'no'} onPress={() => setPainChoice('no')} />
      </View>
      {painChoice === 'yes' ? <Field value={painAreas} onChangeText={setPainAreas} placeholder="Mô tả vùng và tình huống gây khó chịu" multiline /> : null}
      <Text style={styles.note}>Nếu đang đau nhiều hoặc có triệu chứng bất thường, hãy dừng vận động và tìm hỗ trợ chuyên môn.</Text>
    </Card>

    <Pressable onPress={() => setConsent((value) => !value)} accessibilityRole="checkbox" accessibilityState={{ checked: consent }} style={styles.consentRow}>
      <View style={[styles.checkbox, consent && styles.checkboxChecked]}>{consent ? <Ionicons name="checkmark" size={16} color={palette.textInverse} /> : null}</View>
      <Text style={styles.consentText}>Tôi đồng ý lưu và sử dụng thông tin hồ sơ để cá nhân hóa kế hoạch tập luyện. Tôi có thể cập nhật hồ sơ sau này.</Text>
    </Pressable>
    {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
    <AppButton label="Lưu hồ sơ và tiếp tục" loading={saving} disabled={saving} onPress={() => void save()} />
  </Screen>;
}

function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected }} style={[styles.choice, selected && styles.choiceSelected]}>
    <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{label}</Text>
  </Pressable>;
}

function Field(props: React.ComponentProps<typeof TextInput>) {
  return <TextInput {...props} placeholderTextColor={palette.textMuted} style={[styles.input, props.multiline && styles.multiline]} />;
}

const styles = {
  sectionTitle: { color: palette.text, fontSize: 16, fontWeight: '700' as const, marginBottom: 3 },
  label: { color: palette.textMuted, fontSize: 12, lineHeight: 18, marginTop: 12, marginBottom: 6 },
  options: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 7 },
  dayOptions: { flexDirection: 'row' as const, gap: 6 },
  periodOptions: { flexDirection: 'row' as const, gap: 8 },
  choice: { minHeight: 38, paddingHorizontal: 11, borderRadius: 8, borderWidth: 1, borderColor: palette.border, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: palette.surface },
  dayChoice: { flex: 1, minHeight: 42, borderRadius: 8, borderWidth: 1, borderColor: palette.border, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: palette.surface },
  dayCount: { color: palette.textMuted, fontSize: 10, fontWeight: '700' as const, marginTop: 1 },
  periodChoice: { flex: 1, minHeight: 48, paddingHorizontal: 6, borderRadius: 8, borderWidth: 1, borderColor: palette.border, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: palette.surface },
  periodTimeRow: { flexDirection: 'row' as const, alignItems: 'flex-end' as const, gap: 8, marginTop: 10 },
  periodName: { width: 48, color: palette.text, fontSize: 12, fontWeight: '700' as const, paddingBottom: 12 },
  timeInput: { flex: 1 },
  timeLabel: { color: palette.textMuted, fontSize: 11, marginBottom: 4 },
  choiceSelected: { borderColor: palette.primary, backgroundColor: palette.primarySoft },
  choiceText: { color: palette.textMuted, fontSize: 12, fontWeight: '600' as const },
  choiceTextSelected: { color: palette.primary, fontWeight: '700' as const },
  input: { minHeight: 44, paddingHorizontal: 12, paddingVertical: 10, color: palette.text, fontSize: 14, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, borderRadius: 8 },
  multiline: { minHeight: 78, textAlignVertical: 'top' as const },
  note: { color: palette.textMuted, fontSize: 12, lineHeight: 18, marginTop: 12 },
  consentRow: { flexDirection: 'row' as const, gap: 10, alignItems: 'flex-start' as const, paddingVertical: 8 },
  checkbox: { width: 22, height: 22, borderWidth: 1, borderColor: palette.border, borderRadius: 5, alignItems: 'center' as const, justifyContent: 'center' as const },
  checkboxChecked: { borderColor: palette.primary, backgroundColor: palette.primary },
  consentText: { flex: 1, color: palette.textMuted, fontSize: 12, lineHeight: 19 },
  error: { color: palette.danger, fontSize: 13, lineHeight: 19 },
};
