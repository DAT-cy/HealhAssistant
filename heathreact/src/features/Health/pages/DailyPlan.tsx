import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Screen from '@/components/ui/Screen';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { ErrorState, LoadingState } from '@/components/ui/StateViews';
import { dailyPlanService, DailyPlanResponse } from '@/api/services/daily-plan.service';
import { ApiError } from '@/api/client';
import { palette } from '@/theme/tokens';

export default function DailyPlanPage() {
  const [data, setData] = useState<DailyPlanResponse | null>(null);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const load = async () => { setStatus('loading'); try { setData(await dailyPlanService.today()); setStatus('success'); } catch (error) { setStatus('error'); setMessage(error instanceof ApiError ? error.message : 'Không thể tải kế hoạch hôm nay.'); } };
  useEffect(() => { void load(); }, []);
  return <Screen title="Kế hoạch hôm nay" subtitle={data?.date ?? 'Đang tải...'} showBack>{status === 'loading' ? <LoadingState label="Đang tải kế hoạch..." /> : null}{status === 'error' ? <ErrorState message={message} onRetry={() => void load()} /> : null}{data ? <><Badge label={data.source.startsWith('fallback') ? 'Kế hoạch dự phòng' : 'Theo hồ sơ'} tone={data.source.startsWith('fallback') ? 'warning' : 'info'} /><Card><Text style={{ color: palette.text, fontSize: 20, fontWeight: '800' }}>{data.title}</Text><Text style={{ color: palette.textMuted, marginTop: 6 }}>{data.duration}</Text></Card>{data.activities.map((activity) => <Card key={activity}><View style={{ flexDirection: 'row', gap: 13, alignItems: 'center' }}><Ionicons name="fitness-outline" size={23} color={palette.primary} /><Text style={{ flex: 1, color: palette.text }}>{activity}</Text></View></Card>)}<Card><Text style={{ color: palette.text, fontWeight: '700' }}>Lưu ý an toàn</Text>{data.safetyNotes.map((note) => <Text key={note} style={{ color: palette.textMuted, marginTop: 7 }}>• {note}</Text>)}</Card></> : null}</Screen>;
}
