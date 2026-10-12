import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Screen from '@/components/ui/Screen';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import AppButton from '@/components/ui/AppButton';
import { ErrorState, LoadingState } from '@/components/ui/StateViews';
import { dailyPlanService, DailyPlanResponse } from '@/api/services/daily-plan.service';
import { ApiError } from '@/api/client';
import { palette } from '@/theme/tokens';

export default function DailyPlanPage() {
  const [data, setData] = useState<DailyPlanResponse | null>(null);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    try {
      setData(await dailyPlanService.today());
      setStatus('success');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof ApiError ? error.message : 'Không thể tải kế hoạch hôm nay.');
    }
  }, []);

  const retry = () => {
    setStatus('loading');
    setMessage('');
    void load();
  };

  const generate = async () => {
    setGenerating(true);
    setMessage('');
    try {
      setData(await dailyPlanService.generateToday());
      setStatus('success');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof ApiError ? error.message : 'Không thể tạo kế hoạch.');
    } finally {
      setGenerating(false);
    }
  };

  // The request awaits the API before updating state; this is not a synchronous effect update.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  const source = data?.source ?? '';
  const isNoProfile = source === 'fallback-no-profile';
  const isSavedTemplate = source === 'saved-template';
  const isAiGenerated = source === 'gemini';
  const isSafetyPlan = source === 'safety-rule';
  const isFallback = source.startsWith('fallback');

  return (
    <Screen title="Kế hoạch hôm nay" subtitle={data?.date ?? 'Đang tải...'} showBack>
      {status === 'loading' ? <LoadingState label="Đang tải kế hoạch..." /> : null}
      {status === 'error' ? <ErrorState message={message} onRetry={retry} /> : null}
      {data ? <>
        <Badge
          label={isAiGenerated ? 'AI đã tạo' : isSafetyPlan ? 'Ưu tiên nghỉ ngơi' : isNoProfile ? 'Kế hoạch mẫu' : isSavedTemplate ? 'Kế hoạch đã lưu' : 'Kế hoạch dự phòng'}
          tone={isAiGenerated ? 'success' : isSafetyPlan || isFallback ? 'warning' : 'info'}
        />
        <Card>
          <Text style={{ color: palette.text, fontSize: 20, fontWeight: '800' }}>{data.title}</Text>
          <Text style={{ color: palette.textMuted, marginTop: 6 }}>{data.duration}</Text>
          <Text style={{ color: palette.textMuted, fontSize: 12, lineHeight: 18, marginTop: 10 }}>
            {isSafetyPlan
              ? 'Hồ sơ ghi nhận vùng cần lưu ý; kế hoạch vận động bị tạm dừng theo quy tắc an toàn.'
              : isNoProfile
              ? 'Chưa có hồ sơ tập luyện; đây là kế hoạch mẫu chung.'
              : isAiGenerated
                ? 'Kế hoạch được tạo từ mục tiêu và các hạn chế bạn đã khai báo.'
                : isSavedTemplate
                  ? 'Kế hoạch mẫu được lưu để giữ ổn định trong ngày.'
                  : 'AI chưa tạo được kế hoạch hợp lệ; đang dùng mẫu an toàn.'}
          </Text>
        </Card>
        {data.activities.map((activity) => <Card key={activity}>
          <View style={{ flexDirection: 'row', gap: 13, alignItems: 'center' }}>
            <Ionicons name="fitness-outline" size={23} color={palette.primary} />
            <Text style={{ flex: 1, color: palette.text }}>{activity}</Text>
          </View>
        </Card>)}
        <Card>
          <Text style={{ color: palette.text, fontWeight: '700' }}>Lưu ý an toàn</Text>
          {data.safetyNotes.map((note) => <Text key={note} style={{ color: palette.textMuted, marginTop: 7 }}>• {note}</Text>)}
        </Card>
        {!isAiGenerated && !isNoProfile && !isSafetyPlan ? <AppButton label="Tạo kế hoạch bằng AI" onPress={() => void generate()} loading={generating} /> : null}
      </> : null}
    </Screen>
  );
}
