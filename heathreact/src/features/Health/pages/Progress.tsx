import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '@/components/ui/Screen';
import Card from '@/components/ui/Card';
import { ErrorState, LoadingState } from '@/components/ui/StateViews';
import { progressService, ProgressSummaryResponse } from '@/api/services/progress.service';
import { healthTrackingService, WeightLog } from '@/api/services/health-tracking.service';
import { ApiError } from '@/api/client';
import { palette } from '@/theme/tokens';
import { navigationService } from '@/routes';

function localToday() {
  const today = new Date();
  today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  return today.toISOString().slice(0, 10);
}

export default function ProgressPage() {
  const [data, setData] = useState<ProgressSummaryResponse | null>(null);
  const [weights, setWeights] = useState<WeightLog[]>([]);
  const [measuredOn, setMeasuredOn] = useState(localToday());
  const [weightKg, setWeightKg] = useState('');
  const [note, setNote] = useState('');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const loadWeights = useCallback(async () => {
    try {
      setWeights(await healthTrackingService.weights());
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : 'Không thể tải lịch sử cân nặng.');
    }
  }, []);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      setData(await progressService.summary());
      await loadWeights();
      setStatus('success');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof ApiError ? error.message : 'Không thể tải tiến độ.');
    }
  }, [loadWeights]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  const saveWeight = async () => {
    const value = Number(weightKg);
    if (!Number.isFinite(value) || value <= 0) {
      setMessage('Nhập cân nặng lớn hơn 0 kg.');
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      const saved = await healthTrackingService.saveWeight({ measuredOn, weightKg: value, note: note.trim() || undefined });
      setWeights((current) => [...current.filter((item) => item.measuredOn !== saved.measuredOn), saved].sort((a, b) => a.measuredOn.localeCompare(b.measuredOn)));
      setWeightKg('');
      setNote('');
      setMessage('Đã lưu số đo cân nặng.');
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : 'Không thể lưu cân nặng.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen title="Tiến độ" subtitle="Số liệu từ dữ liệu bạn đã ghi nhận" activeTab="Progress">
      {status === 'loading' ? <LoadingState label="Đang tải tiến độ..." /> : null}
      {status === 'error' ? <ErrorState message={message} onRetry={() => void load()} /> : null}
      {data ? <>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Card style={{ flex: 1 }}><Text style={{ color: palette.textMuted, fontSize: 12 }}>Lần quét tư thế</Text><Text style={{ color: palette.text, fontSize: 28, fontWeight: '800', marginTop: 5 }}>{data.postureScans}</Text></Card>
          <Card style={{ flex: 1 }}><Text style={{ color: palette.textMuted, fontSize: 12 }}>Buổi tập đã lưu</Text><Text style={{ color: palette.text, fontSize: 28, fontWeight: '800', marginTop: 5 }}>{data.workoutSessions}</Text></Card>
        </View>
        <Card><Text style={{ color: palette.textMuted, fontSize: 12 }}>Lộ trình đã tạo</Text><Text style={{ color: palette.text, fontSize: 28, fontWeight: '800', marginTop: 5 }}>{data.roadmapsCreated}</Text><Text style={{ color: palette.warning, fontSize: 12, marginTop: 7 }}>{data.message}</Text></Card>
      </> : null}

      <Pressable onPress={() => navigationService.navigate('DailyCheckin')} accessibilityRole="button" style={{ minHeight: 56, paddingHorizontal: 15, borderRadius: 12, backgroundColor: palette.primarySoft, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Ionicons name="journal-outline" size={20} color={palette.primary} />
        <View style={{ flex: 1 }}><Text style={{ color: palette.text, fontWeight: '800' }}>Nhật ký sức khỏe</Text><Text style={{ color: palette.textMuted, fontSize: 12, marginTop: 3 }}>Check-in, giấc ngủ, năng lượng và hoạt động</Text></View>
        <Ionicons name="chevron-forward" size={18} color={palette.primary} />
      </Pressable>

      <WeightTrend weights={weights} />

      <Card>
        <Text style={{ color: palette.text, fontSize: 16, fontWeight: '700' }}>Ghi cân nặng</Text>
        <Text style={{ color: palette.textMuted, fontSize: 12, marginTop: 5, marginBottom: 14 }}>Một số đo mỗi ngày; lưu lại cùng ngày sẽ cập nhật số đo đó.</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TextInput value={measuredOn} onChangeText={setMeasuredOn} placeholder="YYYY-MM-DD" accessibilityLabel="Ngày đo" style={{ flex: 1, color: palette.text, backgroundColor: palette.surfaceRaised, borderRadius: 8, padding: 12 }} />
          <TextInput value={weightKg} onChangeText={setWeightKg} placeholder="kg" keyboardType="decimal-pad" accessibilityLabel="Cân nặng kg" style={{ width: 96, color: palette.text, backgroundColor: palette.surfaceRaised, borderRadius: 8, padding: 12 }} />
        </View>
        <TextInput value={note} onChangeText={setNote} placeholder="Ghi chú (không bắt buộc)" placeholderTextColor={palette.textMuted} maxLength={500} style={{ color: palette.text, backgroundColor: palette.surfaceRaised, borderRadius: 8, padding: 12, marginTop: 10, marginBottom: 12 }} />
        <Pressable onPress={() => void saveWeight()} disabled={saving} style={{ minHeight: 44, backgroundColor: palette.primary, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: palette.textInverse, fontWeight: '800' }}>{saving ? 'Đang lưu...' : 'Lưu số đo'}</Text></Pressable>
      </Card>

      <Card>
        <Text style={{ color: palette.text, fontSize: 16, fontWeight: '700' }}>Lịch sử cân nặng</Text>
        {weights.length === 0 ? <Text style={{ color: palette.textMuted, marginTop: 12 }}>Chưa có số đo được lưu.</Text> : weights.slice().reverse().slice(0, 30).map((entry) => (
          <View key={entry.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1, borderColor: palette.border }}>
            <View style={{ flex: 1 }}><Text style={{ color: palette.text, fontWeight: '700' }}>{entry.measuredOn} · {entry.weightKg} kg</Text>{entry.note ? <Text style={{ color: palette.textMuted, fontSize: 12, marginTop: 3 }}>{entry.note}</Text> : null}</View>
            <Pressable onPress={() => void healthTrackingService.deleteWeight(entry.id).then(() => setWeights((items) => items.filter((item) => item.id !== entry.id))).catch((error: unknown) => setMessage(error instanceof ApiError ? error.message : 'Không thể xóa số đo.'))} accessibilityRole="button" accessibilityLabel="Xóa số đo"><Ionicons name="trash-outline" size={18} color={palette.danger} /></Pressable>
          </View>
        ))}
      </Card>
      {message ? <Text accessibilityLiveRegion="polite" style={{ color: message.startsWith('Đã') ? palette.primary : palette.warning, marginBottom: 8 }}>{message}</Text> : null}
    </Screen>
  );
}

function WeightTrend({ weights }: { weights: WeightLog[] }) {
  const recent = weights.slice(-7);
  if (recent.length === 0) {
    return <Card><Text style={{ color: palette.text, fontSize: 16, fontWeight: '700' }}>Xu hướng cân nặng</Text><Text style={{ color: palette.textMuted, fontSize: 12, lineHeight: 18, marginTop: 7 }}>Thêm số đo cân nặng để xem biểu đồ tiến triển của bạn.</Text></Card>;
  }

  const values = recent.map((entry) => entry.weightKg);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = Math.max(max - min, 1);
  return <Card>
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 }}>
      <View><Text style={{ color: palette.text, fontSize: 16, fontWeight: '700' }}>Xu hướng cân nặng</Text><Text style={{ color: palette.textMuted, fontSize: 11, marginTop: 4 }}>Từ {recent.length} lần đo đã lưu</Text></View>
      <Text style={{ color: palette.primary, fontSize: 17, fontWeight: '800' }}>{recent[recent.length - 1].weightKg} kg</Text>
    </View>
    {recent.length < 2 ? <Text style={{ color: palette.textMuted, fontSize: 12, marginTop: 16 }}>Cần thêm số đo để so sánh xu hướng.</Text> : <>
      <View style={{ height: 124, marginTop: 16, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }} accessibilityRole="image" accessibilityLabel={`Biểu đồ ${recent.length} lần đo cân nặng, từ ${min} đến ${max} kilôgam`}>
        {recent.map((entry) => {
          const barHeight = 34 + ((entry.weightKg - min) / spread) * 70;
          return <View key={entry.id} style={{ flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
            <Text style={{ color: palette.textMuted, fontSize: 9 }}>{entry.weightKg}</Text>
            <View style={{ width: '100%', maxWidth: 28, height: barHeight, borderRadius: 10, backgroundColor: palette.primary, opacity: 0.55 + ((entry.weightKg - min) / spread) * 0.45 }} />
          </View>;
        })}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 7 }}><Text style={{ color: palette.textMuted, fontSize: 10 }}>{recent[0].measuredOn}</Text><Text style={{ color: palette.textMuted, fontSize: 10 }}>{recent[recent.length - 1].measuredOn}</Text></View>
      <Text style={{ color: palette.textMuted, fontSize: 10, marginTop: 8 }}>Biểu đồ chỉ tổng hợp các số đo do bạn ghi nhận, không phải dự báo.</Text>
    </>}
  </Card>;
}
