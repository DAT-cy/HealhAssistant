import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { ApiError } from '@/api/client';
import { DailyCheckin as DailyCheckinType, DailyCheckinInput, DailyCheckinSummary, CheckinMood, healthTrackingService } from '@/api/services/health-tracking.service';
import Card from '@/components/ui/Card';
import { ErrorState, LoadingState } from '@/components/ui/StateViews';
import Screen from '@/components/ui/Screen';
import { palette } from '@/theme/tokens';

function localToday() {
  const today = new Date();
  today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  return today.toISOString().slice(0, 10);
}

function daysAgo(days: number) {
  const date = new Date(`${localToday()}T12:00:00`);
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function currentMonthStart() {
  return `${localToday().slice(0, 7)}-01`;
}

const moodOptions: { value: CheckinMood; label: string }[] = [
  { value: 'VERY_GOOD', label: 'Rất tốt' },
  { value: 'GOOD', label: 'Tốt' },
  { value: 'NEUTRAL', label: 'Bình thường' },
  { value: 'LOW', label: 'Hơi thấp' },
  { value: 'VERY_LOW', label: 'Thấp' },
];

export default function DailyCheckinPage() {
  const [date, setDate] = useState(localToday());
  const [weightKg, setWeightKg] = useState('');
  const [energyLevel, setEnergyLevel] = useState<number | null>(null);
  const [sleepHours, setSleepHours] = useState('');
  const [sleepQuality, setSleepQuality] = useState<number | null>(null);
  const [fatigueLevel, setFatigueLevel] = useState<number | null>(null);
  const [mood, setMood] = useState<CheckinMood | null>(null);
  const [activityNotes, setActivityNotes] = useState('');
  const [note, setNote] = useState('');
  const [entries, setEntries] = useState<DailyCheckinType[]>([]);
  const [summary, setSummary] = useState<DailyCheckinSummary | null>(null);
  const [summaryPeriod, setSummaryPeriod] = useState<'week' | 'month'>('week');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [todayEntry, history] = await Promise.all([
        healthTrackingService.getCheckin(date).catch((error: unknown) => {
          if (error instanceof ApiError && error.status === 404) return null;
          throw error;
        }),
        healthTrackingService.checkins(daysAgo(6), localToday()),
      ]);
      const from = summaryPeriod === 'week' ? daysAgo(6) : currentMonthStart();
      setSummary(await healthTrackingService.checkinSummary(from, localToday()));
      setEntries(history);
      setWeightKg(todayEntry?.weightKg?.toString() ?? '');
      setEnergyLevel(todayEntry?.energyLevel ?? null);
      setSleepHours(todayEntry?.sleepHours?.toString() ?? '');
      setSleepQuality(todayEntry?.sleepQuality ?? null);
      setFatigueLevel(todayEntry?.fatigueLevel ?? null);
      setMood(todayEntry?.mood ?? null);
      setActivityNotes(todayEntry?.activityNotes ?? '');
      setNote(todayEntry?.note ?? '');
    } catch (error) {
      setLoadError(error instanceof ApiError ? error.message : 'Không thể tải nhật ký sức khỏe.');
    } finally {
      setLoading(false);
    }
  }, [date, summaryPeriod]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  const save = async () => {
    const weight = weightKg.trim() ? Number(weightKg) : null;
    const sleep = sleepHours.trim() ? Number(sleepHours) : null;
    if (weight !== null && (!Number.isFinite(weight) || weight < 1 || weight > 500)) {
      setMessage('Cân nặng phải nằm trong khoảng 1–500 kg.'); return;
    }
    if (sleep !== null && (!Number.isFinite(sleep) || sleep < 0 || sleep > 24)) {
      setMessage('Thời lượng ngủ phải nằm trong khoảng 0–24 giờ.'); return;
    }
    const input: DailyCheckinInput = {
      weightKg: weight,
      energyLevel,
      sleepHours: sleep,
      sleepQuality,
      fatigueLevel,
      mood,
      activityNotes: activityNotes.trim() || null,
      note: note.trim() || null,
    };
    if (Object.values(input).every((value) => value === null)) {
      setMessage('Hãy nhập ít nhất một thông tin để lưu check-in.'); return;
    }
    setSaving(true);
    setMessage('');
    try {
      const saved = await healthTrackingService.saveCheckin(date, input);
      setEntries((current) => [...current.filter((entry) => entry.checkInDate !== date), saved].sort((a, b) => a.checkInDate.localeCompare(b.checkInDate)));
      const from = summaryPeriod === 'week' ? daysAgo(6) : currentMonthStart();
      setSummary(await healthTrackingService.checkinSummary(from, localToday()));
      setMessage('Đã lưu nhật ký sức khỏe.');
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : 'Không thể lưu check-in.');
    } finally {
      setSaving(false);
    }
  };

  const clearEntry = async (entryDate: string) => {
    try {
      await healthTrackingService.deleteCheckin(entryDate);
      setEntries((current) => current.filter((entry) => entry.checkInDate !== entryDate));
      if (entryDate === date) {
        setWeightKg(''); setEnergyLevel(null); setSleepHours(''); setSleepQuality(null);
        setFatigueLevel(null); setMood(null); setActivityNotes(''); setNote('');
      }
      setMessage('Đã xóa check-in. Lịch sử cân nặng đã lưu độc lập được giữ lại.');
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : 'Không thể xóa check-in.');
    }
  };

  return <Screen title="Nhật ký sức khỏe" subtitle="Ghi nhận những gì bạn muốn theo dõi" showBack activeTab="Progress">
    {loading ? <LoadingState label="Đang tải nhật ký..." /> : null}
    {loadError ? <ErrorState message={loadError} onRetry={() => void load()} /> : null}
    {!loading && !loadError ? <>
      <Card>
        <Text style={{ color: palette.text, fontSize: 16, fontWeight: '800' }}>Check-in theo ngày</Text>
        <Text style={{ color: palette.textMuted, fontSize: 12, lineHeight: 18, marginTop: 5 }}>Mỗi ngày lưu một bản ghi; thông tin nào cũng có thể để trống.</Text>
        <Text style={styles.label}>Ngày ghi nhận</Text>
        <TextInput value={date} onChangeText={setDate} onEndEditing={() => void load()} placeholder="YYYY-MM-DD" accessibilityLabel="Ngày check-in" style={styles.input} />
        <Text style={styles.label}>Cân nặng (kg), nếu có</Text>
        <TextInput value={weightKg} onChangeText={setWeightKg} placeholder="Ví dụ: 65.2" keyboardType="decimal-pad" accessibilityLabel="Cân nặng" style={styles.input} />
        <Rating label="Mức năng lượng" value={energyLevel} onChange={setEnergyLevel} low="Thấp" high="Cao" />
        <Text style={styles.label}>Thời gian ngủ (giờ)</Text>
        <TextInput value={sleepHours} onChangeText={setSleepHours} placeholder="Ví dụ: 7.5" keyboardType="decimal-pad" accessibilityLabel="Thời gian ngủ theo giờ" style={styles.input} />
        <Rating label="Chất lượng giấc ngủ" value={sleepQuality} onChange={setSleepQuality} low="Kém" high="Tốt" />
        <Rating label="Mức độ mệt mỏi" value={fatigueLevel} onChange={setFatigueLevel} low="Ít" high="Nhiều" />
        <Text style={styles.label}>Tâm trạng (không bắt buộc)</Text>
        <View style={styles.optionWrap}>{moodOptions.map((option) => <Choice key={option.value} label={option.label} selected={mood === option.value} onPress={() => setMood(mood === option.value ? null : option.value)} />)}</View>
        <Text style={styles.label}>Hoạt động thể chất</Text>
        <TextInput value={activityNotes} onChangeText={setActivityNotes} maxLength={500} placeholder="Ví dụ: đi bộ 20 phút" placeholderTextColor={palette.textMuted} style={styles.input} />
        <Text style={styles.label}>Ghi chú</Text>
        <TextInput value={note} onChangeText={setNote} maxLength={1000} multiline placeholder="Thông tin bạn muốn lưu lại" placeholderTextColor={palette.textMuted} style={[styles.input, { minHeight: 82, textAlignVertical: 'top' }]} />
        <Pressable onPress={() => void save()} disabled={saving} accessibilityRole="button" accessibilityState={{ disabled: saving }} style={[styles.saveButton, saving && { opacity: 0.6 }]}>
          <Text style={{ color: palette.textInverse, fontWeight: '800' }}>{saving ? 'Đang lưu...' : 'Lưu check-in'}</Text>
        </Pressable>
      </Card>
      {message ? <Text accessibilityLiveRegion="polite" style={{ color: message.startsWith('Đã') ? palette.success : palette.warning }}>{message}</Text> : null}
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <Text style={{ color: palette.text, fontSize: 16, fontWeight: '800' }}>Tổng hợp check-in</Text>
          <View style={{ flexDirection: 'row', gap: 5 }}>
            {([['week', 'Tuần'], ['month', 'Tháng']] as const).map(([value, label]) => <Pressable key={value} onPress={() => setSummaryPeriod(value)} accessibilityRole="tab" accessibilityState={{ selected: summaryPeriod === value }} style={{ minWidth: 55, minHeight: 34, paddingHorizontal: 8, borderRadius: 8, backgroundColor: summaryPeriod === value ? palette.primary : palette.surfaceRaised, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: summaryPeriod === value ? palette.textInverse : palette.textMuted, fontSize: 12, fontWeight: '700' }}>{label}</Text></Pressable>)}
          </View>
        </View>
        {!summary || summary.checkinCount === 0 ? <Text style={{ color: palette.textMuted, marginTop: 12 }}>Chưa có dữ liệu trong khoảng thời gian này.</Text> : <>
          <Text style={{ color: palette.textMuted, fontSize: 12, marginTop: 8 }}>{summary.checkinCount} ngày có ghi nhận · {summary.from} đến {summary.to}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            <SummaryValue label="Năng lượng TB" value={summary.averageEnergyLevel !== null ? `${summary.averageEnergyLevel}/5` : null} />
            <SummaryValue label="Giấc ngủ TB" value={summary.averageSleepHours !== null ? `${summary.averageSleepHours} giờ` : null} />
            <SummaryValue label="Chất lượng ngủ" value={summary.averageSleepQuality !== null ? `${summary.averageSleepQuality}/5` : null} />
            <SummaryValue label="Mệt mỏi TB" value={summary.averageFatigueLevel !== null ? `${summary.averageFatigueLevel}/5` : null} />
            <SummaryValue label="Thay đổi cân nặng" value={summary.weightChangeKg !== null ? `${summary.weightChangeKg > 0 ? '+' : ''}${summary.weightChangeKg} kg` : null} />
          </View>
        </>}
      </Card>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Ionicons name="calendar-outline" color={palette.primary} size={18} /><Text style={{ color: palette.text, fontSize: 16, fontWeight: '800' }}>7 ngày gần đây</Text></View>
        {entries.length === 0 ? <Text style={{ color: palette.textMuted, marginTop: 12 }}>Chưa có check-in trong khoảng thời gian này.</Text> : entries.slice().reverse().map((entry) => <View key={entry.id} style={styles.historyRow}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ color: palette.text, fontWeight: '700' }}>{entry.checkInDate}</Text>
            <Text style={{ color: palette.textMuted, fontSize: 12 }}>
              {[entry.weightKg !== null ? `${entry.weightKg} kg` : null, entry.energyLevel !== null ? `Năng lượng ${entry.energyLevel}/5` : null, entry.sleepHours !== null ? `Ngủ ${entry.sleepHours} giờ` : null].filter(Boolean).join(' · ') || 'Có ghi nhận khác'}
            </Text>
            {entry.note ? <Text style={{ color: palette.textMuted, fontSize: 12 }}>{entry.note}</Text> : null}
          </View>
          <Pressable onPress={() => void clearEntry(entry.checkInDate)} accessibilityRole="button" accessibilityLabel={`Xóa check-in ${entry.checkInDate}`}><Ionicons name="trash-outline" size={18} color={palette.danger} /></Pressable>
        </View>)}
      </Card>
      <Text style={{ color: palette.textMuted, fontSize: 11, lineHeight: 16 }}>Nhật ký chỉ lưu thông tin bạn tự ghi nhận, không dùng để chẩn đoán tình trạng sức khỏe.</Text>
    </> : null}
  </Screen>;
}

function Rating({ label, value, onChange, low, high }: { label: string; value: number | null; onChange: (value: number | null) => void; low: string; high: string }) {
  return <View style={{ marginTop: 12 }}>
    <Text style={styles.label}>{label}</Text>
    <View style={{ flexDirection: 'row', gap: 7, alignItems: 'center' }}>
      <Text style={styles.scaleText}>{low}</Text>
      {[1, 2, 3, 4, 5].map((item) => <Pressable key={item} onPress={() => onChange(value === item ? null : item)} accessibilityRole="radio" accessibilityState={{ selected: value === item }} accessibilityLabel={`${label} ${item} trên 5`} style={[styles.rating, value === item && styles.ratingSelected]}><Text style={{ color: value === item ? palette.textInverse : palette.textMuted, fontWeight: '700' }}>{item}</Text></Pressable>)}
      <Text style={styles.scaleText}>{high}</Text>
    </View>
  </View>;
}

function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} style={[styles.choice, selected && styles.choiceSelected]}><Text style={{ color: selected ? palette.primary : palette.textMuted, fontSize: 12, fontWeight: '700' }}>{label}</Text></Pressable>;
}

function SummaryValue({ label, value }: { label: string; value: string | null }) {
  return <View style={{ minWidth: '46%', flexGrow: 1, padding: 10, borderRadius: 9, backgroundColor: palette.surfaceRaised }}>
    <Text style={{ color: palette.textMuted, fontSize: 10 }}>{label}</Text>
    <Text style={{ color: palette.text, fontSize: 14, fontWeight: '800', marginTop: 4 }}>{value ?? 'Chưa đủ dữ liệu'}</Text>
  </View>;
}

const styles = {
  label: { color: palette.textMuted, fontSize: 12, fontWeight: '700' as const, marginTop: 13, marginBottom: 6 },
  input: { minHeight: 44, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 10, color: palette.text, backgroundColor: palette.surfaceRaised, borderWidth: 1, borderColor: palette.border },
  optionWrap: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 7 },
  choice: { minHeight: 36, paddingHorizontal: 10, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: palette.surfaceRaised, borderRadius: 8, borderWidth: 1, borderColor: palette.border },
  choiceSelected: { backgroundColor: palette.primarySoft, borderColor: palette.primary },
  rating: { flex: 1, aspectRatio: 1, maxWidth: 42, maxHeight: 42, borderRadius: 10, backgroundColor: palette.surfaceRaised, alignItems: 'center' as const, justifyContent: 'center' as const },
  ratingSelected: { backgroundColor: palette.primary },
  scaleText: { color: palette.textMuted, fontSize: 9, maxWidth: 34, textAlign: 'center' as const },
  saveButton: { minHeight: 46, marginTop: 18, borderRadius: 10, backgroundColor: palette.primary, alignItems: 'center' as const, justifyContent: 'center' as const },
  historyRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderColor: palette.border },
};
