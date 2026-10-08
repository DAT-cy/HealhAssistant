import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';
import Screen from '@/components/ui/Screen';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import AppButton from '@/components/ui/AppButton';
import { ErrorState, LoadingState } from '@/components/ui/StateViews';
import { palette } from '@/theme/tokens';
import { useRoadmap } from '@/hooks/useRoadmap';
import { navigationService } from '@/routes';

export default function RoadmapPage() {
  const roadmap = useRoadmap();
  const generate = () => { void roadmap.generate('cải thiện sức khỏe và tư thế', 4); };
  const plan = roadmap.data;

  return <Screen title="Lộ trình của bạn" subtitle="Kế hoạch được cá nhân hóa bởi AI" showBack>
    {roadmap.status === 'idle' ? <Card><Text style={{ color: palette.text, fontSize: 18, fontWeight: '800' }}>Bắt đầu lộ trình</Text><Text style={{ color: palette.textMuted, lineHeight: 21, marginTop: 8 }}>Backend sẽ tạo kế hoạch an toàn dựa trên mục tiêu của bạn. Nếu AI chưa khả dụng, hệ thống sẽ trả về kế hoạch dự phòng có nhãn rõ ràng.</Text><View style={{ marginTop: 16 }}><AppButton label="Tạo lộ trình" onPress={generate} /></View></Card> : null}
    {roadmap.status === 'loading' ? <LoadingState label="AI đang tạo lộ trình..." /> : null}
    {roadmap.status === 'error' ? <ErrorState message={roadmap.message} onRetry={generate} /> : null}
    {plan ? <><View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Badge label={plan.source === 'fallback' ? 'Kế hoạch dự phòng' : 'AI đã tạo'} tone={plan.source === 'fallback' ? 'warning' : 'success'} /></View><Card><Text style={{ color: palette.text, fontSize: 20, fontWeight: '800' }}>{plan.title}</Text><Text style={{ color: palette.textMuted, lineHeight: 21, marginTop: 8 }}>{plan.overview}</Text></Card>{plan.weeklyPlan.map((week, index) => <Card key={`${index}-${week}`}><View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}><View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: index === 0 ? palette.primary : palette.surfaceRaised, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: index === 0 ? palette.textInverse : palette.text, fontWeight: '800' }}>{index + 1}</Text></View><Text style={{ flex: 1, color: palette.text, lineHeight: 20 }}>{week}</Text><Ionicons name="chevron-forward" size={18} color={palette.textMuted} /></View></Card>)}<Card><Text style={{ color: palette.text, fontWeight: '700', marginBottom: 8 }}>Lưu ý an toàn</Text>{plan.safetyNotes.map((note) => <Text key={note} style={{ color: palette.textMuted, lineHeight: 20, marginBottom: 5 }}>• {note}</Text>)}</Card><AppButton label="Mở kế hoạch hôm nay" onPress={() => navigationService.navigate('DailyPlan')} /></> : null}
  </Screen>;
}
