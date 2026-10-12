import React, { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import Screen from '@/components/ui/Screen';
import Card from '@/components/ui/Card';
import AppButton from '@/components/ui/AppButton';
import { ErrorState, LoadingState } from '@/components/ui/StateViews';
import { palette } from '@/theme/tokens';
import { profileService } from '@/api/services/profile.service';
import { ApiError } from '@/api/client';

export default function ProfilePage() {
  const [goal, setGoal] = useState('');
  const [activityLevel, setActivityLevel] = useState('');
  const [age, setAge] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [restrictions, setRestrictions] = useState('');
  const [painAreas, setPainAreas] = useState('');
  const [consent, setConsent] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

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
    if (!consent) { setStatus('error'); setMessage('Bạn cần đồng ý trước khi lưu dữ liệu hồ sơ tập luyện.'); return; }
    const optionalNumbers = [age, heightCm, weightKg].filter(Boolean).map(Number);
    if (optionalNumbers.some((value) => !Number.isFinite(value) || value <= 0)) {
      setStatus('error'); setMessage('Tuổi, chiều cao và cân nặng phải là số lớn hơn 0.'); return;
    }
    setStatus('saving'); setMessage('');
    try {
      const profile = await profileService.save({ goal, activityLevel, age: age ? Number(age) : undefined, heightCm: heightCm ? Number(heightCm) : undefined, weightKg: weightKg ? Number(weightKg) : undefined, restrictions, painAreas, consent });
      setAvatarUrl(profile.avatarUrl ?? null);
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
  const input = (value: string, setter: (value: string) => void, placeholder: string, keyboardType: 'default' | 'numeric' = 'default') => <TextInput value={value} onChangeText={setter} placeholder={placeholder} placeholderTextColor={palette.textMuted} keyboardType={keyboardType} style={{ color: palette.text, backgroundColor: palette.surfaceRaised, borderRadius: 10, padding: 14, marginBottom: 14 }} />;
  return <Screen title="Hồ sơ của bạn" subtitle="Dữ liệu này giúp cá nhân hóa kế hoạch tập luyện." showBack>
    {loadingProfile ? <LoadingState label="Đang tải hồ sơ..." /> : loadError ? <ErrorState message={message} onRetry={retryLoad} /> : <>
      {hasProfile === false ? <Card style={{ borderColor: palette.warning }}><Text style={{ color: palette.text, fontWeight: '700' }}>Bạn chưa có hồ sơ tập luyện</Text><Text style={{ color: palette.textMuted, lineHeight: 20, marginTop: 6 }}>Nhập mục tiêu và mức độ hiện tại, sau đó lưu để tạo hồ sơ cho tài khoản này. Tuổi, chiều cao và cân nặng là tùy chọn.</Text></Card> : null}
      <Card><Text style={{ color: palette.text, fontSize: 16, fontWeight: '700', marginBottom: 12 }}>Thông tin để cá nhân hóa</Text><Text style={{ color: palette.textMuted, fontSize: 12, marginBottom: 6 }}>Mục tiêu tập luyện</Text>{input(goal, setGoal, 'Ví dụ: cải thiện tư thế')}<Text style={{ color: palette.textMuted, fontSize: 12, marginBottom: 6 }}>Mức độ vận động hiện tại</Text>{input(activityLevel, setActivityLevel, 'Mới bắt đầu')}<Text style={{ color: palette.textMuted, fontSize: 12, marginBottom: 6 }}>Tuổi (không bắt buộc)</Text>{input(age, setAge, 'Ví dụ: 25', 'numeric')}<Text style={{ color: palette.textMuted, fontSize: 12, marginBottom: 6 }}>Chiều cao cm</Text>{input(heightCm, setHeightCm, 'Ví dụ: 170', 'numeric')}<Text style={{ color: palette.textMuted, fontSize: 12, marginBottom: 6 }}>Cân nặng kg</Text>{input(weightKg, setWeightKg, 'Ví dụ: 65', 'numeric')}<Text style={{ color: palette.textMuted, fontSize: 12, marginBottom: 6 }}>Hạn chế vận động hoặc dụng cụ</Text>{input(restrictions, setRestrictions, 'Ví dụ: không có dụng cụ')}<Text style={{ color: palette.textMuted, fontSize: 12, marginBottom: 6 }}>Vùng đau/khó chịu (nếu có)</Text>{input(painAreas, setPainAreas, 'Mô tả ngắn; nếu đau nhiều hãy hỏi chuyên gia')}</Card>
      <Card>
        <Text style={{ color: palette.text, fontSize: 16, fontWeight: '700', marginBottom: 12 }}>Ảnh đại diện</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          {avatarUrl
            ? <Image source={{ uri: avatarUrl }} accessibilityLabel="Ảnh đại diện" style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: palette.surfaceRaised }} />
            : <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: palette.surfaceRaised, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="person-outline" size={30} color={palette.textMuted} /></View>}
          <View style={{ flex: 1, gap: 10 }}>
            <Text style={{ color: palette.textMuted, fontSize: 12, lineHeight: 18 }}>Ảnh đại diện chỉ để hiển thị, không dùng để suy đoán sức khỏe. AI lập kế hoạch dựa trên thông tin hồ sơ và số đo bạn nhập.</Text>
            <AppButton label={avatarUrl ? 'Đổi ảnh đại diện' : 'Chọn ảnh đại diện'} variant="secondary" disabled={!hasProfile} loading={uploadingAvatar} onPress={() => void chooseAvatar()} />
          </View>
        </View>
      </Card>
      <Pressable onPress={() => setConsent((value) => !value)} accessibilityRole="checkbox" accessibilityState={{ checked: consent }} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 14 }}><View style={{ width: 22, height: 22, borderWidth: 1, borderColor: consent ? palette.primary : palette.border, borderRadius: 5, backgroundColor: consent ? palette.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>{consent ? <Text style={{ color: palette.textInverse, fontWeight: '800' }}>✓</Text> : null}</View><Text style={{ flex: 1, color: palette.textMuted, lineHeight: 20 }}>Tôi đồng ý lưu thông tin hồ sơ để hỗ trợ kế hoạch tập luyện. Đây không phải dịch vụ chẩn đoán y khoa.</Text></Pressable>
      {message ? <Text accessibilityLiveRegion="polite" style={{ color: status === 'error' ? palette.danger : palette.primary, marginBottom: 8 }}>{message}</Text> : null}
      <AppButton label="Lưu hồ sơ" loading={status === 'saving'} disabled={loadingProfile} onPress={() => void save()} />
    </>}
  </Screen>;
}
