import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import Screen from '@/components/ui/Screen';
import Card from '@/components/ui/Card';
import AppButton from '@/components/ui/AppButton';
import { ApiError } from '@/api/client';
import { profileService } from '@/api/services/profile.service';
import { healthTrackingService, type AvailabilitySlot } from '@/api/services/health-tracking.service';
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
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [slotStart, setSlotStart] = useState('18:00');
  const [slotEnd, setSlotEnd] = useState('18:45');
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
      setSelectedDays([...new Set(slots.map((slot) => slot.dayOfWeek))]);
      if (slots[0]) { setSlotStart(slots[0].startTime); setSlotEnd(slots[0].endTime); setActivityType(slots[0].activityType); setLocationType(slots[0].locationType); }
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
    const validTime = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
    if (selectedDays.length === 0 || !validTime(slotStart) || !validTime(slotEnd) || slotEnd <= slotStart) {
      setError('Chọn ít nhất một ngày và khung giờ hợp lệ để xếp lịch tập.');
      return;
    }
    const [startHour, startMinute] = slotStart.split(':').map(Number);
    const [endHour, endMinute] = slotEnd.split(':').map(Number);
    if (endHour * 60 + endMinute - (startHour * 60 + startMinute) < 15) {
      setError('Khung giờ tập cần có ít nhất 15 phút.');
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
      let savedSlots = availability;
      for (const dayOfWeek of selectedDays) {
        if (savedSlots.some((slot) => slot.dayOfWeek === dayOfWeek)) continue;
        const created = await healthTrackingService.createAvailability({
          dayOfWeek,
          startTime: slotStart,
          endTime: slotEnd,
          activityType,
          locationType,
          equipmentNotes: null,
        });
        savedSlots = [...savedSlots, created];
        setAvailability(savedSlots);
      }
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
      <Text style={styles.note}>Chọn những ngày và giờ bạn thường có thể tập. Lịch này giúp hệ thống xếp buổi tập vào thời gian phù hợp.</Text>
      <View style={styles.options}>
        {WEEK_DAYS.map((label, index) => {
          const day = index + 1;
          const selected = selectedDays.includes(day);
          return <Choice key={day} label={label} selected={selected} onPress={() => setSelectedDays((current) => selected ? current.filter((item) => item !== day) : [...current, day].sort())} />;
        })}
      </View>
      <View style={styles.timeRow}>
        <View style={styles.timeField}><Text style={styles.label}>Bắt đầu *</Text><Field value={slotStart} onChangeText={setSlotStart} placeholder="18:00" keyboardType="numbers-and-punctuation" /></View>
        <View style={styles.timeField}><Text style={styles.label}>Kết thúc *</Text><Field value={slotEnd} onChangeText={setSlotEnd} placeholder="18:45" keyboardType="numbers-and-punctuation" /></View>
      </View>
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
  timeRow: { flexDirection: 'row' as const, gap: 10 },
  timeField: { flex: 1 },
  choice: { minHeight: 38, paddingHorizontal: 11, borderRadius: 8, borderWidth: 1, borderColor: palette.border, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: palette.surface },
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
