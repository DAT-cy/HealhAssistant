import React, { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import Screen from '@/components/ui/Screen';
import Card from '@/components/ui/Card';
import AppButton from '@/components/ui/AppButton';
import { palette } from '@/theme/tokens';
import { profileService } from '@/api/services/profile.service';
import { ApiError } from '@/api/client';

export default function ProfilePage() {
  const [goal, setGoal] = useState('cải thiện sức khỏe và tư thế');
  const [activityLevel, setActivityLevel] = useState('Mới bắt đầu');
  const [age, setAge] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const save = async () => {
    if (!goal.trim() || !activityLevel.trim()) { setStatus('error'); setMessage('Vui lòng nhập mục tiêu và mức độ tập luyện.'); return; }
    setStatus('loading'); setMessage('');
    try {
      await profileService.save({ goal, activityLevel, age: age ? Number(age) : undefined, heightCm: heightCm ? Number(heightCm) : undefined, weightKg: weightKg ? Number(weightKg) : undefined, consent: true });
      setStatus('success'); setMessage('Đã lưu hồ sơ.');
    } catch (error) { setStatus('error'); setMessage(error instanceof ApiError ? error.message : 'Không thể lưu hồ sơ.'); }
  };
  const input = (value: string, setter: (value: string) => void, placeholder: string, keyboardType: 'default' | 'numeric' = 'default') => <TextInput value={value} onChangeText={setter} placeholder={placeholder} placeholderTextColor={palette.textMuted} keyboardType={keyboardType} style={{ color: palette.text, backgroundColor: palette.surfaceRaised, borderRadius: 10, padding: 14, marginBottom: 14 }} />;
  return <Screen title="Hồ sơ của bạn" subtitle="Dữ liệu này giúp AI tạo kế hoạch phù hợp." showBack><Card><Text style={{ color: palette.text, fontSize: 16, fontWeight: '700', marginBottom: 12 }}>Thông tin cơ bản</Text><Text style={{ color: palette.textMuted, fontSize: 12, marginBottom: 6 }}>Mục tiêu tập luyện</Text>{input(goal, setGoal, 'Ví dụ: cải thiện tư thế')}<Text style={{ color: palette.textMuted, fontSize: 12, marginBottom: 6 }}>Mức độ hiện tại</Text>{input(activityLevel, setActivityLevel, 'Mới bắt đầu')}<Text style={{ color: palette.textMuted, fontSize: 12, marginBottom: 6 }}>Tuổi (không bắt buộc)</Text>{input(age, setAge, 'Ví dụ: 25', 'numeric')}<Text style={{ color: palette.textMuted, fontSize: 12, marginBottom: 6 }}>Chiều cao cm</Text>{input(heightCm, setHeightCm, 'Ví dụ: 170', 'numeric')}<Text style={{ color: palette.textMuted, fontSize: 12, marginBottom: 6 }}>Cân nặng kg</Text>{input(weightKg, setWeightKg, 'Ví dụ: 65', 'numeric')}</Card>{message ? <Text accessibilityLiveRegion="polite" style={{ color: status === 'error' ? palette.danger : palette.primary }}>{message}</Text> : null}<AppButton label="Lưu hồ sơ" loading={status === 'loading'} onPress={() => void save()} /></Screen>;
}
