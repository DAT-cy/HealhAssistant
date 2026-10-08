import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import Screen from '@/components/ui/Screen';
import Card from '@/components/ui/Card';
import { ErrorState, LoadingState } from '@/components/ui/StateViews';
import { progressService, ProgressSummaryResponse } from '@/api/services/progress.service';
import { ApiError } from '@/api/client';
import { palette } from '@/theme/tokens';

export default function ProgressPage() {
  const [data, setData] = useState<ProgressSummaryResponse | null>(null); const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading'); const [message, setMessage] = useState('');
  const load = async () => { setStatus('loading'); try { setData(await progressService.summary()); setStatus('success'); } catch (error) { setStatus('error'); setMessage(error instanceof ApiError ? error.message : 'Không thể tải tiến độ.'); } };
  useEffect(() => { void load(); }, []);
  return <Screen title="Tiến độ" subtitle="Số liệu từ dữ liệu đã lưu" showBack>{status === 'loading' ? <LoadingState label="Đang tải tiến độ..." /> : null}{status === 'error' ? <ErrorState message={message} onRetry={() => void load()} /> : null}{data ? <><Card><Text style={{ color: palette.textMuted }}>Lần quét tư thế</Text><Text style={{ color: palette.text, fontSize: 32, fontWeight: '800', marginTop: 5 }}>{data.postureScans}</Text></Card><Card><Text style={{ color: palette.textMuted }}>Lộ trình đã tạo</Text><Text style={{ color: palette.text, fontSize: 32, fontWeight: '800', marginTop: 5 }}>{data.roadmapsCreated}</Text></Card><Card><Text style={{ color: palette.textMuted }}>Buổi tập đã lưu</Text><Text style={{ color: palette.text, fontSize: 32, fontWeight: '800', marginTop: 5 }}>{data.workoutSessions}</Text><Text style={{ color: palette.warning, fontSize: 12, marginTop: 7 }}>{data.message}</Text></Card></> : null}</Screen>;
}
