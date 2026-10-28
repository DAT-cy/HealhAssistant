import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import Screen from '@/components/ui/Screen';
import Card from '@/components/ui/Card';
import AppButton from '@/components/ui/AppButton';
import { ErrorState, LoadingState } from '@/components/ui/StateViews';
import { palette } from '@/theme/tokens';
import { profileService } from '@/api/services/profile.service';
import { ApiError } from '@/api/client';
import { healthTrackingService, HealthGoal, HealthGoalType, AvailabilitySlot, AvailabilitySlotInput } from '@/api/services/health-tracking.service';
import Avatar, { ProfileGender } from '@/components/ui/Avatar';
import { useUserStore } from '@/stores/user';
import { isProfileComplete } from '@/utils/profileCompletion';
import { navigationService } from '@/routes';

export default function ProfilePage() {
  const setProfileComplete = useUserStore((state) => state.setProfileComplete);
  const [goal, setGoal] = useState('');
  const [activityLevel, setActivityLevel] = useState('');
  const [age, setAge] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [restrictions, setRestrictions] = useState('');
  const [painAreas, setPainAreas] = useState('');
  const [consent, setConsent] = useState(false);
  const [gender, setGender] = useState<ProfileGender | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [healthGoals, setHealthGoals] = useState<HealthGoal[]>([]);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [goalType, setGoalType] = useState<HealthGoalType>('WEIGHT_LOSS');
  const [targetWeight, setTargetWeight] = useState('');
  const [availabilityScope, setAvailabilityScope] = useState<'ALL' | 'DAY'>('ALL');
  const [selectedDay, setSelectedDay] = useState(1);
  const [slotStart, setSlotStart] = useState('18:00');
  const [slotEnd, setSlotEnd] = useState('19:00');
  const [activityType, setActivityType] = useState<'WORKOUT' | 'WALKING' | 'MOBILITY' | 'OTHER'>('WORKOUT');
  const [locationType, setLocationType] = useState<'HOME' | 'GYM' | 'OUTDOOR' | 'ANYWHERE'>('HOME');
  const [equipmentNotes, setEquipmentNotes] = useState('');
  const [trackingMessage, setTrackingMessage] = useState('');
  const [trackingBusy, setTrackingBusy] = useState(false);

  useEffect(() => {
    void healthTrackingService.goals().then(setHealthGoals).catch(() => {});
    void healthTrackingService.availability().then(setAvailability).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    try {
      const profile = await profileService.getMine();
      setGoal(profile.goal);
      setActivityLevel(profile.activityLevel);
      setAge(profile.age?.toString() ?? '');
      setHeightCm(profile.heightCm?.toString() ?? '');
      setWeightKg(profile.weightKg?.toString() ?? '');
      setRestrictions(profile.restrictions ?? '');
      setPainAreas(profile.painAreas ?? '');
      setConsent(profile.consent);
      setGender(profile.gender ?? null);
      setAvatarUrl(profile.avatarUrl ?? null);
      setStatus('idle');
      setHasProfile(true);
      setLoadError(false);
      setMessage('');
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setGoal('');
        setActivityLevel('');
        setAge('');
        setHeightCm('');
        setWeightKg('');
        setRestrictions('');
        setPainAreas('');
        setConsent(false);
        setGender(null);
        setAvatarUrl(null);
        setStatus('idle');
        setHasProfile(false);
        setLoadError(false);
        setMessage('');
      } else {
        setMessage(error instanceof ApiError ? error.message : 'Không thể tải hồ sơ.');
        setLoadError(true);
      }
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  // The request awaits the API before updating state; this is not a synchronous effect update.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  const retryLoad = () => { setLoadingProfile(true); void load(); };

  const save = async () => {
    if (!goal.trim() || !activityLevel.trim()) { setStatus('error'); setMessage('Vui lòng nhập mục tiêu và mức độ tập luyện.'); return; }
    if (!age.trim() || !heightCm.trim() || !weightKg.trim() || !restrictions.trim() || !painAreas.trim()) { setStatus('error'); setMessage('Hãy nhập đầy đủ tuổi, chiều cao, cân nặng và chọn nội dung cho các mục hạn chế, vùng đau.'); return; }
    if (!consent) { setStatus('error'); setMessage('Bạn cần đồng ý trước khi lưu dữ liệu hồ sơ tập luyện.'); return; }
    const optionalNumbers = [age, heightCm, weightKg].filter(Boolean).map(Number);
    if (optionalNumbers.some((value) => !Number.isFinite(value) || value <= 0)) {
      setStatus('error'); setMessage('Tuổi, chiều cao và cân nặng phải là số lớn hơn 0.'); return;
    }
    setStatus('saving'); setMessage('');
    try {
      const profile = await profileService.save({ goal, activityLevel, gender, age: age ? Number(age) : undefined, heightCm: heightCm ? Number(heightCm) : undefined, weightKg: weightKg ? Number(weightKg) : undefined, restrictions, painAreas, consent });
      setAvatarUrl(profile.avatarUrl ?? null);
      setProfileComplete(isProfileComplete(profile, availability.length > 0));
      setHasProfile(true); setStatus('success'); setMessage('Đã lưu hồ sơ.');
    } catch (error) { setStatus('error'); setMessage(error instanceof ApiError ? error.message : 'Không thể lưu hồ sơ.'); }
  };

  const chooseAvatar = async () => {
    if (!hasProfile) {
      setStatus('error');
      setMessage('Hãy lưu hồ sơ trước khi thêm ảnh đại diện.');
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
        preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      });
      const asset = result.assets?.[0];
      if (result.canceled || !asset) return;

      setUploadingAvatar(true);
      setMessage('');
      const updatedProfile = await profileService.uploadAvatar(asset);
      setAvatarUrl(updatedProfile.avatarUrl ?? null);
      setStatus('success');
      setMessage('Đã tải ảnh đại diện lên Cloudinary.');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof ApiError ? error.message : 'Không thể tải ảnh lên.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const saveHealthGoal = async () => {
    const target = targetWeight ? Number(targetWeight) : undefined;
    if (target !== undefined && (!Number.isFinite(target) || target <= 0)) {
      setTrackingMessage('Cân nặng mục tiêu cần lớn hơn 0.');
      return;
    }
    setTrackingBusy(true);
    setTrackingMessage('');
    try {
      const created = await healthTrackingService.createGoal({
        goalType,
        startWeightKg: weightKg ? Number(weightKg) : undefined,
        targetWeightKg: target,
      });
      setHealthGoals((current) => [created, ...current.map((item) => item.status === 'ACTIVE' ? { ...item, status: 'PAUSED' as const } : item)]);
      setTrackingMessage('Đã lưu mục tiêu thể chất.');
    } catch (error) {
      setTrackingMessage(error instanceof ApiError ? error.message : 'Không thể lưu mục tiêu.');
    } finally {
      setTrackingBusy(false);
    }
  };

  const saveAvailability = async () => {
    setTrackingBusy(true);
    setTrackingMessage('');
    try {
      const input = (dayOfWeek: number): AvailabilitySlotInput => ({
        dayOfWeek,
        startTime: slotStart,
        endTime: slotEnd,
        activityType,
        locationType,
        equipmentNotes: equipmentNotes || null,
      });
      const created = availabilityScope === 'ALL'
        ? await healthTrackingService.createAvailabilityBatch([1, 2, 3, 4, 5, 6, 7].map(input))
        : [await healthTrackingService.createAvailability(input(selectedDay))];
      setAvailability((current) => [...current, ...created].sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime)));
      setProfileComplete(true);
      setTrackingMessage(availabilityScope === 'ALL' ? 'Đã áp dụng khung giờ cho cả tuần.' : 'Đã thêm khung giờ rảnh.');
    } catch (error) {
      setTrackingMessage(error instanceof ApiError ? error.message : 'Không thể thêm khung giờ.');
    } finally {
      setTrackingBusy(false);
    }
  };

  const removeAvailability = async (id: number) => {
    try {
      await healthTrackingService.deleteAvailability(id);
      const remaining = availability.filter((slot) => slot.id !== id);
      setAvailability(remaining);
      if (remaining.length === 0) setProfileComplete(false);
    } catch (error) {
      setTrackingMessage(error instanceof ApiError ? error.message : 'Không thể xóa khung giờ.');
    }
  };

  const days = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  const timePeriods = [
    { id: 'MORNING', label: 'Sáng', start: '06:00', end: '08:00' },
    { id: 'AFTERNOON', label: 'Chiều', start: '12:00', end: '14:00' },
    { id: 'EVENING', label: 'Tối', start: '18:00', end: '20:00' },
  ] as const;
  const input = (value: string, setter: (value: string) => void, placeholder: string, keyboardType: 'default' | 'numeric' = 'default') => <TextInput value={value} onChangeText={setter} placeholder={placeholder} placeholderTextColor={palette.textMuted} keyboardType={keyboardType} style={{ color: palette.text, backgroundColor: palette.surfaceRaised, borderRadius: 10, padding: 14, marginBottom: 14 }} />;
  return <Screen title="Hồ sơ của bạn" subtitle="Dữ liệu này giúp cá nhân hóa kế hoạch tập luyện." activeTab="Profile">
    {loadingProfile ? <LoadingState label="Đang tải hồ sơ..." /> : loadError ? <ErrorState message={message} onRetry={retryLoad} /> : <>
      {hasProfile === false ? <Card style={{ borderColor: palette.warning }}><Text style={{ color: palette.text, fontWeight: '700' }}>Bạn chưa có hồ sơ tập luyện</Text><Text style={{ color: palette.textMuted, lineHeight: 20, marginTop: 6 }}>Hoàn thiện các thông tin được đánh dấu bắt buộc để tiếp tục sử dụng kế hoạch cá nhân hóa.</Text></Card> : null}
      <Card><Text style={{ color: palette.text, fontSize: 16, fontWeight: '700', marginBottom: 12 }}>Thông tin để cá nhân hóa</Text><Text style={{ color: palette.textMuted, fontSize: 12, marginBottom: 6 }}>Mục tiêu tập luyện *</Text>{input(goal, setGoal, 'Ví dụ: cải thiện thể lực')}<Text style={{ color: palette.textMuted, fontSize: 12, marginBottom: 6 }}>Mức độ vận động hiện tại *</Text>{input(activityLevel, setActivityLevel, 'Mới bắt đầu')}<Text style={{ color: palette.textMuted, fontSize: 12, marginBottom: 6 }}>Tuổi *</Text>{input(age, setAge, 'Ví dụ: 25', 'numeric')}<Text style={{ color: palette.textMuted, fontSize: 12, marginBottom: 6 }}>Chiều cao (cm) *</Text>{input(heightCm, setHeightCm, 'Ví dụ: 170', 'numeric')}<Text style={{ color: palette.textMuted, fontSize: 12, marginBottom: 6 }}>Cân nặng (kg) *</Text>{input(weightKg, setWeightKg, 'Ví dụ: 65', 'numeric')}<Text style={{ color: palette.textMuted, fontSize: 12, marginBottom: 6 }}>Hạn chế vận động hoặc dụng cụ * · ghi “Không có” nếu không áp dụng</Text>{input(restrictions, setRestrictions, 'Ví dụ: Không có')}<Text style={{ color: palette.textMuted, fontSize: 12, marginBottom: 6 }}>Vùng đau hoặc khó chịu * · ghi “Không có” nếu không áp dụng</Text>{input(painAreas, setPainAreas, 'Ví dụ: Không có')}</Card>
      <Card>
        <Text style={{ color: palette.text, fontSize: 16, fontWeight: '700' }}>Mục tiêu thể chất</Text>
        <Text style={{ color: palette.textMuted, fontSize: 12, marginTop: 5 }}>Chỉ tiêu theo dõi, không phải đánh giá y khoa.</Text>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 14 }}>
          {([['WEIGHT_LOSS', 'Giảm cân'], ['WEIGHT_MAINTENANCE', 'Duy trì'], ['MUSCLE_GAIN', 'Tăng cơ']] as const).map(([value, label]) => <Pressable key={value} onPress={() => setGoalType(value)} accessibilityRole="radio" accessibilityState={{ selected: goalType === value }} style={{ flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: goalType === value ? palette.primary : palette.border, borderRadius: 8, backgroundColor: goalType === value ? `${palette.primary}20` : 'transparent', paddingHorizontal: 4 }}><Text style={{ color: goalType === value ? palette.primary : palette.textMuted, fontSize: 11, fontWeight: '700', textAlign: 'center' }}>{label}</Text></Pressable>)}
        </View>
        <Text style={{ color: palette.textMuted, fontSize: 12, marginTop: 14, marginBottom: 6 }}>Cân nặng mục tiêu (kg)</Text>
        {input(targetWeight, setTargetWeight, 'Không bắt buộc', 'numeric')}
        <Pressable onPress={() => void saveHealthGoal()} disabled={trackingBusy} style={{ minHeight: 44, backgroundColor: palette.primary, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: palette.textInverse, fontWeight: '800' }}>{trackingBusy ? 'Đang lưu...' : 'Lưu mục tiêu'}</Text></Pressable>
        {healthGoals.slice(0, 3).map((item) => <Text key={item.id} style={{ color: item.status === 'ACTIVE' ? palette.primary : palette.textMuted, marginTop: 10, fontSize: 12 }}>{item.goalType} · {item.targetWeightKg ?? 'Chưa đặt cân nặng'} kg · {item.status}</Text>)}
      </Card>
      <Card>
        <Text style={{ color: palette.text, fontSize: 16, fontWeight: '700' }}>Lịch rảnh hằng tuần</Text>
        <Text style={{ color: palette.textMuted, fontSize: 12, marginTop: 5 }}>Chọn từng ngày hoặc áp dụng cùng một khung giờ cho cả tuần.</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
          {([['ALL', 'Áp dụng tất cả'], ['DAY', 'Theo từng ngày']] as const).map(([value, label]) => <Pressable key={value} onPress={() => setAvailabilityScope(value)} accessibilityRole="radio" accessibilityState={{ selected: availabilityScope === value }} style={{ flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: availabilityScope === value ? palette.primary : palette.border, borderRadius: 8, backgroundColor: availabilityScope === value ? `${palette.primary}20` : 'transparent' }}><Text style={{ color: availabilityScope === value ? palette.primary : palette.textMuted, fontWeight: '700', fontSize: 12 }}>{label}</Text></Pressable>)}
        </View>
        {availabilityScope === 'DAY' ? <View style={{ flexDirection: 'row', gap: 5, marginTop: 14 }}>
          {days.map((day, index) => <Pressable key={day} onPress={() => setSelectedDay(index + 1)} accessibilityRole="radio" accessibilityState={{ selected: selectedDay === index + 1 }} style={{ flex: 1, aspectRatio: 1, maxHeight: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 7, backgroundColor: selectedDay === index + 1 ? palette.primary : palette.surfaceRaised }}><Text style={{ color: selectedDay === index + 1 ? palette.textInverse : palette.textMuted, fontWeight: '700', fontSize: 11 }}>{day}</Text></Pressable>)}
        </View>
        : null}
        <Text style={{ color: palette.textMuted, fontSize: 12, marginTop: 14, marginBottom: 7 }}>Khung giờ nhanh</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          {timePeriods.map((period) => <Pressable key={period.id} onPress={() => { setSlotStart(period.start); setSlotEnd(period.end); }} accessibilityRole="button" accessibilityLabel={`Chọn buổi ${period.label.toLowerCase()}`} style={{ flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: slotStart === period.start && slotEnd === period.end ? palette.primary : palette.border, borderRadius: 7, backgroundColor: slotStart === period.start && slotEnd === period.end ? `${palette.primary}20` : 'transparent' }}><Text style={{ color: slotStart === period.start && slotEnd === period.end ? palette.primary : palette.textMuted, fontSize: 11, fontWeight: '700' }}>{period.label}</Text></Pressable>)}
        </View>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
          <View style={{ flex: 1 }}><Text style={{ color: palette.textMuted, fontSize: 12, marginBottom: 6 }}>Bắt đầu</Text>{input(slotStart, setSlotStart, '18:00')}</View><View style={{ flex: 1 }}><Text style={{ color: palette.textMuted, fontSize: 12, marginBottom: 6 }}>Kết thúc</Text>{input(slotEnd, setSlotEnd, '19:00')}</View>
        </View>
        <Text style={{ color: palette.textMuted, fontSize: 12, marginBottom: 7 }}>Hoạt động</Text>
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
          {([['WORKOUT', 'Tập luyện'], ['WALKING', 'Đi bộ'], ['MOBILITY', 'Giãn cơ'], ['OTHER', 'Khác']] as const).map(([value, label]) => <Pressable key={value} onPress={() => setActivityType(value)} accessibilityRole="radio" accessibilityState={{ selected: activityType === value }} style={{ flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: activityType === value ? palette.primary : palette.border, borderRadius: 7, paddingHorizontal: 3 }}><Text style={{ color: activityType === value ? palette.primary : palette.textMuted, fontSize: 10, fontWeight: '700', textAlign: 'center' }}>{label}</Text></Pressable>)}
        </View>
        <Text style={{ color: palette.textMuted, fontSize: 12, marginBottom: 7 }}>Địa điểm</Text>
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
          {([['HOME', 'Tại nhà'], ['GYM', 'Phòng gym'], ['OUTDOOR', 'Ngoài trời'], ['ANYWHERE', 'Bất kỳ']] as const).map(([value, label]) => <Pressable key={value} onPress={() => setLocationType(value)} accessibilityRole="radio" accessibilityState={{ selected: locationType === value }} style={{ flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: locationType === value ? palette.primary : palette.border, borderRadius: 7, paddingHorizontal: 3 }}><Text style={{ color: locationType === value ? palette.primary : palette.textMuted, fontSize: 10, fontWeight: '700', textAlign: 'center' }}>{label}</Text></Pressable>)}
        </View>
        <Text style={{ color: palette.textMuted, fontSize: 12, marginBottom: 6 }}>Dụng cụ (không bắt buộc)</Text>{input(equipmentNotes, setEquipmentNotes, 'Ví dụ: thảm, dây kháng lực')}
        <Pressable onPress={() => void saveAvailability()} disabled={trackingBusy} style={{ minHeight: 44, backgroundColor: palette.surfaceRaised, borderWidth: 1, borderColor: palette.border, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: palette.text, fontWeight: '800' }}>{trackingBusy ? 'Đang lưu...' : availabilityScope === 'ALL' ? 'Áp dụng cho cả tuần' : 'Thêm khung giờ'}</Text></Pressable>
        {availability.map((slot) => <View key={slot.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: palette.border }}><Text style={{ color: palette.text, flex: 1, fontSize: 12 }}>T{slot.dayOfWeek === 7 ? 'CN' : slot.dayOfWeek + 1} · {slot.startTime}–{slot.endTime} · {slot.activityType}</Text><Pressable onPress={() => void removeAvailability(slot.id)} accessibilityRole="button" accessibilityLabel="Xóa khung giờ"><Ionicons name="trash-outline" size={18} color={palette.danger} /></Pressable></View>)}
      </Card>
      {trackingMessage ? <Text accessibilityLiveRegion="polite" style={{ color: trackingMessage.startsWith('Đã') ? palette.primary : palette.warning, marginBottom: 8 }}>{trackingMessage}</Text> : null}
      <Card>
        <Text style={{ color: palette.text, fontSize: 16, fontWeight: '700', marginBottom: 12 }}>Ảnh đại diện</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Avatar gender={gender} imageUrl={avatarUrl} size={72} />
          <View style={{ flex: 1, gap: 10 }}>
            <Text style={{ color: palette.textMuted, fontSize: 12, lineHeight: 18 }}>Ảnh này chỉ dùng làm ảnh đại diện, không gửi cho AI và không dùng để suy đoán thể trạng. Phác đồ hiện dựa trên thông tin hồ sơ bạn nhập.</Text>
            <AppButton label={avatarUrl ? 'Đổi ảnh đại diện' : 'Chọn ảnh đại diện'} variant="secondary" disabled={!hasProfile} loading={uploadingAvatar} onPress={() => void chooseAvatar()} />
          </View>
        </View>
        <Text style={{ color: palette.textMuted, fontSize: 12, marginTop: 16, marginBottom: 8 }}>Avatar mặc định theo giới tính</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {([['MALE', 'Nam'], ['FEMALE', 'Nữ']] as const).map(([value, label]) => <Pressable key={value} onPress={() => setGender(value)} accessibilityRole="radio" accessibilityState={{ selected: gender === value }} style={{ flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: gender === value ? palette.primary : palette.border, borderRadius: 8, backgroundColor: gender === value ? `${palette.primary}20` : 'transparent' }}><Text style={{ color: gender === value ? palette.primary : palette.textMuted, fontWeight: '700' }}>{label}</Text></Pressable>)}
        </View>
      </Card>
      <Pressable onPress={() => setConsent((value) => !value)} accessibilityRole="checkbox" accessibilityState={{ checked: consent }} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 14 }}><View style={{ width: 22, height: 22, borderWidth: 1, borderColor: consent ? palette.primary : palette.border, borderRadius: 5, backgroundColor: consent ? palette.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>{consent ? <Text style={{ color: palette.textInverse, fontWeight: '800' }}>✓</Text> : null}</View><Text style={{ flex: 1, color: palette.textMuted, lineHeight: 20 }}>Tôi đồng ý lưu thông tin hồ sơ để hỗ trợ kế hoạch tập luyện. Đây không phải dịch vụ chẩn đoán y khoa.</Text></Pressable>
      {message ? <Text accessibilityLiveRegion="polite" style={{ color: status === 'error' ? palette.danger : palette.primary, marginBottom: 8 }}>{message}</Text> : null}
      <AppButton label="Gói dịch vụ và Premium" variant="secondary" onPress={() => navigationService.navigate('Subscription')} />
      <AppButton label="Lưu hồ sơ" loading={status === 'saving'} disabled={loadingProfile} onPress={() => void save()} />
    </>}
  </Screen>;
}
