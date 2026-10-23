import React, { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Screen from '@/components/ui/Screen';
import Card from '@/components/ui/Card';
import AppButton from '@/components/ui/AppButton';
import { ErrorState, LoadingState } from '@/components/ui/StateViews';
import { palette } from '@/theme/tokens';
import { useRoadmap } from '@/hooks/useRoadmap';
import { profileService } from '@/api/services/profile.service';
import { coachService } from '@/api/services/coach.service';
import { navigationService } from '@/routes';
import { ApiError } from '@/api/client';

const variants = ['Vận động nhẹ', 'Linh hoạt và phục hồi', 'Sức mạnh toàn thân'];

export default function RoadmapPage() {
  const roadmap = useRoadmap();
  const queryClient = useQueryClient();
  const [weeks, setWeeks] = useState(4);
  const [roadmapName, setRoadmapName] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState<number | null>(null);
  const [compareWithPrevious, setCompareWithPrevious] = useState(false);
  const [adjustmentBusy, setAdjustmentBusy] = useState(false);
  const [adjustmentMessage, setAdjustmentMessage] = useState('');

  const profileQuery = useQuery({ queryKey: ['profile', 'me'], queryFn: profileService.getMine });
  const activeQuery = useQuery({
    queryKey: ['roadmap', 'active'],
    queryFn: async () => {
      try { return await coachService.active(); }
      catch (error) { if (error instanceof ApiError && error.status === 404) return null; throw error; }
    },
  });
  const historyQuery = useQuery({
    queryKey: ['roadmap', 'history'],
    queryFn: coachService.history,
  });
  const adjustmentQuery = useQuery({
    queryKey: ['plan-adjustments', 'me'],
    queryFn: coachService.adjustmentHistory,
  });

  const profileReady = profileQuery.data
    ? Boolean(profileQuery.data.consent && profileQuery.data.heightCm && profileQuery.data.weightKg)
    : profileQuery.isPending ? null : false;
  const profileMissing = profileQuery.isError && profileQuery.error instanceof ApiError && profileQuery.error.status === 404;
  const profileError = profileQuery.isError && !profileMissing
    ? profileQuery.error instanceof ApiError ? profileQuery.error.message : 'Không thể tải hồ sơ.'
    : '';
  const goal = profileQuery.data?.goal ?? '';
  const generate = () => { setSelected(null); void roadmap.generate(goal, weeks); };
  const selectedPlan = selected === null ? null : roadmap.options[selected];
  const previousVersion = activeQuery.data?.previousRoadmapId
    ? historyQuery.data?.find((item) => item.id === activeQuery.data?.previousRoadmapId)
    : undefined;
  const pendingAdjustment = adjustmentQuery.data?.find((item) => item.status === 'PROPOSED');

  const evaluateAdjustment = async () => {
    setAdjustmentBusy(true);
    setAdjustmentMessage('');
    try {
      const result = await coachService.evaluateAdjustment();
      setAdjustmentMessage(result.message);
      await adjustmentQuery.refetch();
    } catch (error) {
      setAdjustmentMessage(error instanceof ApiError ? error.message : 'Không thể đánh giá check-in.');
    } finally {
      setAdjustmentBusy(false);
    }
  };

  const decideAdjustment = async (decision: 'accept' | 'reject') => {
    if (!pendingAdjustment) return;
    setAdjustmentBusy(true);
    setAdjustmentMessage('');
    try {
      if (decision === 'accept') {
        await coachService.acceptAdjustment(pendingAdjustment.id);
        setAdjustmentMessage('Đã áp dụng phiên bản điều chỉnh mới.');
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['roadmap'] }),
          queryClient.invalidateQueries({ queryKey: ['plan-adjustments'] }),
        ]);
      } else {
        await coachService.rejectAdjustment(pendingAdjustment.id);
        setAdjustmentMessage('Đã từ chối đề xuất. Lộ trình hiện tại không thay đổi.');
        await adjustmentQuery.refetch();
      }
    } catch (error) {
      setAdjustmentMessage(error instanceof ApiError ? error.message : 'Không thể xử lý đề xuất.');
    } finally {
      setAdjustmentBusy(false);
    }
  };

  return <Screen title="Lộ trình của bạn" subtitle="Xem trước và chọn kế hoạch phù hợp" showBack>
    {activeQuery.isPending ? <LoadingState label="Đang tải lộ trình hiện tại..." /> : null}
    {activeQuery.isError ? <ErrorState message="Không thể tải lộ trình hiện tại." onRetry={() => void activeQuery.refetch()} /> : null}
    {activeQuery.data ? <>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <Text style={{ color: palette.primary, fontSize: 12, fontWeight: '800' }}>ĐANG HOẠT ĐỘNG · PHIÊN BẢN {activeQuery.data.versionNumber ?? '—'}</Text>
          <Text style={{ color: palette.textMuted, fontSize: 11 }}>{activeQuery.data.durationWeeks ?? 0} tuần</Text>
        </View>
        <Text style={{ color: palette.text, fontSize: 18, fontWeight: '800', marginTop: 8 }}>{activeQuery.data.title}</Text>
        <Text style={{ color: palette.textMuted, lineHeight: 20, marginTop: 6 }}>{activeQuery.data.overview}</Text>
        <Text style={{ color: palette.textMuted, fontSize: 11, marginTop: 8 }}>Bắt đầu {activeQuery.data.startDate ?? 'chưa xác định'} · {activeQuery.data.source === 'gemini' ? 'Đề xuất AI' : 'Kế hoạch dự phòng'}</Text>
        {activeQuery.data.changeReason ? <Text style={{ color: palette.textMuted, fontSize: 11, marginTop: 4 }}>Lý do phiên bản: {activeQuery.data.changeReason === 'INITIAL_PLAN' ? 'Kế hoạch ban đầu' : 'Bạn xác nhận phương án mới'}</Text> : null}
        {previousVersion ? <Pressable onPress={() => setCompareWithPrevious((value) => !value)} accessibilityRole="button" style={{ minHeight: 42, marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 9, borderWidth: 1, borderColor: palette.border }}>
          <Text style={{ color: palette.primary, fontWeight: '700', fontSize: 12 }}>{compareWithPrevious ? 'Ẩn so sánh phiên bản' : `So sánh với phiên bản ${previousVersion.versionNumber ?? 'trước'}`}</Text>
        </Pressable> : null}
      </Card>
      {compareWithPrevious && previousVersion ? <View style={{ flexDirection: 'row', gap: 8 }}>
        <Card style={{ flex: 1 }}><Text style={{ color: palette.text, fontWeight: '800', fontSize: 12 }}>Hiện tại · v{activeQuery.data.versionNumber ?? '—'}</Text><Text style={{ color: palette.textMuted, fontSize: 11, lineHeight: 17, marginTop: 7 }}>{activeQuery.data.overview}</Text></Card>
        <Card style={{ flex: 1 }}><Text style={{ color: palette.text, fontWeight: '800', fontSize: 12 }}>Trước đó · v{previousVersion.versionNumber ?? '—'}</Text><Text style={{ color: palette.textMuted, fontSize: 11, lineHeight: 17, marginTop: 7 }}>{previousVersion.overview}</Text></Card>
      </View> : null}
      <Pressable onPress={() => void evaluateAdjustment()} disabled={adjustmentBusy} accessibilityRole="button" style={{ minHeight: 44, marginTop: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: palette.primarySoft, opacity: adjustmentBusy ? 0.6 : 1 }}>
        <Text style={{ color: palette.primary, fontSize: 12, fontWeight: '800' }}>{adjustmentBusy ? 'Đang đánh giá...' : 'Đánh giá check-in để đề xuất giảm tải'}</Text>
      </Pressable>
      {adjustmentMessage ? <Text accessibilityLiveRegion="polite" style={{ color: adjustmentMessage.startsWith('Đã') ? palette.primary : palette.textMuted, fontSize: 12, lineHeight: 18, marginTop: 8 }}>{adjustmentMessage}</Text> : null}
    </> : null}
    {adjustmentQuery.isError ? <ErrorState message="Không thể tải lịch sử đề xuất điều chỉnh." onRetry={() => void adjustmentQuery.refetch()} /> : null}
    {pendingAdjustment ? <Card>
      <Text style={{ color: palette.warning, fontSize: 11, fontWeight: '800' }}>ĐỀ XUẤT CHỜ XÁC NHẬN</Text>
      <Text style={{ color: palette.text, fontSize: 15, fontWeight: '800', marginTop: 7 }}>Giảm tải tuần {pendingAdjustment.proposedChanges.weekIndex + 1}</Text>
      <Text style={{ color: palette.textMuted, fontSize: 12, lineHeight: 18, marginTop: 5 }}>{pendingAdjustment.reason}</Text>
      <Text style={{ color: palette.textMuted, fontSize: 11, marginTop: 7 }}>Check-in liên quan: {pendingAdjustment.proposedChanges.checkinDates.join(', ')}</Text>
      <View style={{ marginTop: 12, padding: 10, borderRadius: 9, backgroundColor: palette.surfaceRaised }}>
        <Text style={{ color: palette.textMuted, fontSize: 10, fontWeight: '700' }}>TRỌNG TÂM HIỆN TẠI</Text>
        <Text style={{ color: palette.text, fontSize: 12, lineHeight: 18, marginTop: 4 }}>{pendingAdjustment.proposedChanges.currentWeeklyPlan[pendingAdjustment.proposedChanges.weekIndex]}</Text>
        <Text style={{ color: palette.primary, fontSize: 10, fontWeight: '700', marginTop: 10 }}>ĐỀ XUẤT</Text>
        <Text style={{ color: palette.text, fontSize: 12, lineHeight: 18, marginTop: 4 }}>{pendingAdjustment.proposedChanges.proposedWeeklyPlan[pendingAdjustment.proposedChanges.weekIndex]}</Text>
      </View>
      <Text style={{ color: palette.textMuted, fontSize: 10, lineHeight: 15, marginTop: 9 }}>Đề xuất dựa trên check-in tự khai báo; không phải chẩn đoán. Chỉ áp dụng khi bạn chấp nhận.</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        <AppButton label="Từ chối" variant="secondary" disabled={adjustmentBusy} onPress={() => void decideAdjustment('reject')} />
        <View style={{ flex: 1 }}><AppButton label="Chấp nhận điều chỉnh" disabled={adjustmentBusy} loading={adjustmentBusy} onPress={() => void decideAdjustment('accept')} /></View>
      </View>
    </Card> : null}
    {historyQuery.isError ? <ErrorState message="Không thể tải lịch sử lộ trình." onRetry={() => void historyQuery.refetch()} /> : null}
    {historyQuery.data && historyQuery.data.filter((item) => item.status !== 'ACTIVE').length > 0 ? <Card>
      <Text style={{ color: palette.text, fontSize: 16, fontWeight: '800' }}>Lịch sử phiên bản</Text>
      {historyQuery.data.filter((item) => item.status !== 'ACTIVE').map((item) => <View key={item.id} style={{ borderBottomWidth: 1, borderColor: palette.border }}>
        <Pressable onPress={() => setExpandedHistoryId((current) => current === item.id ? null : item.id)} accessibilityRole="button" style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1 }}><Text style={{ color: palette.text, fontWeight: '700' }}>Phiên bản {item.versionNumber ?? '—'} · {item.title}</Text><Text style={{ color: palette.textMuted, fontSize: 11, marginTop: 3 }}>{item.status === 'ARCHIVED' ? 'Đã lưu trữ' : item.status} · {item.createdAt.slice(0, 10)}</Text></View>
          <Text style={{ color: palette.primary }}>{expandedHistoryId === item.id ? 'Ẩn' : 'Xem'}</Text>
        </Pressable>
        {expandedHistoryId === item.id ? <Text style={{ color: palette.textMuted, fontSize: 12, lineHeight: 19, paddingBottom: 12 }}>{item.overview}{item.changeReason ? `\nLý do: ${item.changeReason}` : ''}</Text> : null}
      </View>)}
    </Card> : null}
    {profileReady === null ? <LoadingState label="Đang kiểm tra hồ sơ..." /> : null}
    {profileError ? <ErrorState message={profileError} onRetry={() => void profileQuery.refetch()} /> : null}
    {profileReady === false && (profileMissing || profileQuery.data) ? <Card><Text style={{ color: palette.text, fontSize: 17, fontWeight: '800' }}>{profileMissing ? 'Tạo hồ sơ trước' : 'Hoàn thiện hồ sơ trước'}</Text><Text style={{ color: palette.textMuted, lineHeight: 21, marginTop: 8 }}>Nhập mục tiêu, mức vận động, chiều cao, cân nặng và đồng ý lưu dữ liệu để tạo bản xem trước cá nhân hóa.</Text><View style={{ marginTop: 14 }}><AppButton label="Mở hồ sơ" onPress={() => navigationService.navigate('Profile')} /></View></Card> : null}
    {historyQuery.data?.length === 0 && !activeQuery.data ? <Card><Text style={{ color: palette.text, fontWeight: '700' }}>Chưa có lịch sử lộ trình</Text><Text style={{ color: palette.textMuted, fontSize: 12, lineHeight: 18, marginTop: 5 }}>Các phiên bản đã xác nhận sẽ được lưu tại đây.</Text></Card> : null}
    {profileReady && !confirmed && roadmap.options.length === 0 && roadmap.status !== 'loading' ? <Card>
      <Text style={{ color: palette.text, fontSize: 18, fontWeight: '800' }}>Tạo bản xem trước</Text>
      <Text style={{ color: palette.textMuted, lineHeight: 21, marginTop: 8 }}>Mục tiêu từ hồ sơ: {goal}. AI sẽ đề xuất ba hướng để bạn so sánh. Chưa có kế hoạch nào được kích hoạt.</Text>
      <Text style={{ color: palette.text, fontWeight: '700', marginTop: 18, marginBottom: 8 }}>Tên lộ trình</Text>
      <TextInput value={roadmapName} onChangeText={setRoadmapName} placeholder="Ví dụ: Khỏe hơn trong 4 tuần" placeholderTextColor={palette.textMuted} maxLength={120} style={{ minHeight: 46, paddingHorizontal: 12, color: palette.text, fontSize: 14, borderWidth: 1, borderColor: palette.border, borderRadius: 10, backgroundColor: palette.surface }} />
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
        if (selectedPlan && selected !== null) void roadmap.activate(selectedPlan, selected, roadmapName).then((ok) => {
          if (ok) {
            setConfirmed(true);
            void queryClient.invalidateQueries({ queryKey: ['roadmap'] });
          }
        });
      }} />
      <View style={{ height: 10 }} /><AppButton label="Tạo phương án khác" variant="secondary" onPress={generate} />
    </> : null}
    {confirmed ? <Card><Text style={{ color: palette.primary, fontSize: 18, fontWeight: '800' }}>Lộ trình đã bắt đầu</Text><Text style={{ color: palette.textMuted, lineHeight: 21, marginTop: 8 }}>{roadmap.data?.title}. Lịch theo ngày đã có trên trang chủ.</Text><View style={{ marginTop: 14 }}><AppButton label="Về trang chủ" onPress={() => navigationService.navigate('Home')} /></View></Card> : null}
  </Screen>;
}
