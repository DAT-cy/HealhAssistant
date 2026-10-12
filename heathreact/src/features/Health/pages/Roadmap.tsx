import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Screen from '@/components/ui/Screen';
import Card from '@/components/ui/Card';
import AppButton from '@/components/ui/AppButton';
import { ErrorState, LoadingState } from '@/components/ui/StateViews';
import { palette } from '@/theme/tokens';
import { useRoadmap } from '@/hooks/useRoadmap';
import { profileService } from '@/api/services/profile.service';
import { navigationService } from '@/routes';

const variants = ['Vận động nhẹ', 'Linh hoạt và phục hồi', 'Sức mạnh toàn thân'];

export default function RoadmapPage() {
  const roadmap = useRoadmap();
  const [goal, setGoal] = useState('');
  const [profileReady, setProfileReady] = useState<boolean | null>(null);
  const [weeks, setWeeks] = useState(4);
  const [selected, setSelected] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    profileService.getMine().then((profile) => {
      setGoal(profile.goal);
      setProfileReady(Boolean(profile.consent && profile.heightCm && profile.weightKg));
    }).catch(() => setProfileReady(false));
  }, []);

  const generate = () => { setSelected(null); void roadmap.generate(goal, weeks); };
  const selectedPlan = selected === null ? null : roadmap.options[selected];

  return <Screen title="Lộ trình của bạn" subtitle="Xem trước và chọn kế hoạch phù hợp" showBack>
    {profileReady === null ? <LoadingState label="Đang kiểm tra hồ sơ..." /> : null}
    {profileReady === false ? <Card><Text style={{ color: palette.text, fontSize: 17, fontWeight: '800' }}>Hoàn thiện hồ sơ trước</Text><Text style={{ color: palette.textMuted, lineHeight: 21, marginTop: 8 }}>Nhập mục tiêu, mức vận động, chiều cao, cân nặng và đồng ý lưu dữ liệu để tạo bản xem trước cá nhân hóa.</Text><View style={{ marginTop: 14 }}><AppButton label="Mở hồ sơ" onPress={() => navigationService.navigate('Profile')} /></View></Card> : null}
    {profileReady && !confirmed && roadmap.options.length === 0 && roadmap.status !== 'loading' ? <Card>
      <Text style={{ color: palette.text, fontSize: 18, fontWeight: '800' }}>Tạo bản xem trước</Text>
      <Text style={{ color: palette.textMuted, lineHeight: 21, marginTop: 8 }}>Mục tiêu từ hồ sơ: {goal}. AI sẽ đề xuất ba hướng để bạn so sánh. Chưa có kế hoạch nào được kích hoạt.</Text>
      <Text style={{ color: palette.text, fontWeight: '700', marginTop: 18, marginBottom: 10 }}>Thời lượng</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>{[2, 4, 8].map((value) => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ selected: weeks === value }} onPress={() => setWeeks(value)} style={{ flex: 1, paddingVertical: 11, alignItems: 'center', borderRadius: 8, borderWidth: 1, borderColor: weeks === value ? palette.primary : palette.border, backgroundColor: weeks === value ? palette.primary : 'transparent' }}><Text style={{ color: weeks === value ? palette.textInverse : palette.text, fontWeight: '700' }}>{value} tuần</Text></Pressable>)}</View>
      <View style={{ marginTop: 16 }}><AppButton label="Tạo 3 phương án" onPress={generate} /></View>
    </Card> : null}
    {roadmap.status === 'loading' ? <LoadingState label={roadmap.data ? 'Đang kích hoạt lộ trình...' : 'Đang tạo các phương án xem trước...'} /> : null}
    {roadmap.status === 'error' ? <ErrorState message={roadmap.message} onRetry={generate} /> : null}
    {roadmap.options.length > 0 && !confirmed ? <>
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
        if (selectedPlan) void roadmap.activate(selectedPlan, weeks).then((ok) => { if (ok) setConfirmed(true); });
      }} />
      <View style={{ height: 10 }} /><AppButton label="Tạo phương án khác" variant="secondary" onPress={generate} />
    </> : null}
    {confirmed ? <Card><Text style={{ color: palette.primary, fontSize: 18, fontWeight: '800' }}>Lộ trình đã bắt đầu</Text><Text style={{ color: palette.textMuted, lineHeight: 21, marginTop: 8 }}>{roadmap.data?.title}. Lịch theo ngày đã có trên trang chủ.</Text><View style={{ marginTop: 14 }}><AppButton label="Về trang chủ" onPress={() => navigationService.navigate('Home')} /></View></Card> : null}
  </Screen>;
}
