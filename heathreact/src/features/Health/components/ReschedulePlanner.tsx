import { useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import AppButton from '@/components/ui/AppButton';
import Card from '@/components/ui/Card';
import { ApiError, apiClient } from '@/api/client';
import { apiVersion } from '@/config/api.config';
import { coachService, type PlanReschedulePreview, type PlanRescheduleRequest, type RescheduleScope, type RoadmapPlanSlot } from '@/api/services/coach.service';
import { palette } from '@/theme/tokens';

const scopeOptions: { value: RescheduleScope; label: string }[] = [
  { value: 'SINGLE_SLOT', label: 'Một khung giờ' },
  { value: 'DAY', label: 'Cả ngày' },
  { value: 'REMAINING_DAYS', label: 'Ngày còn lại' },
  { value: 'NEW_VERSION', label: 'Version mới' },
];
const activityOptions = ['RUNNING', 'WALKING', 'GYM', 'STRENGTH', 'MOBILITY', 'OTHER'];
const weekdays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
interface AccessResponse { featureCode: string; enabled: boolean }

export default function ReschedulePlanner({ roadmapId, targetDate, targetSlots, goal, healthLimits }: {
  roadmapId: number; targetDate: string; targetSlots: RoadmapPlanSlot[]; goal: string; healthLimits: string;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<RescheduleScope>('SINGLE_SLOT');
  const [targetSlotId, setTargetSlotId] = useState<number | null>(null);
  const [requestedDate, setRequestedDate] = useState(targetDate);
  const [requestText, setRequestText] = useState('');
  const [availableDays, setAvailableDays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [activityTypes, setActivityTypes] = useState<string[]>([]);
  const [duration, setDuration] = useState('');
  const [unavailable, setUnavailable] = useState('');
  const [equipment, setEquipment] = useState('');
  const [limits, setLimits] = useState(healthLimits);
  const [reason, setReason] = useState('');
  const [preview, setPreview] = useState<PlanReschedulePreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const accessQuery = useQuery({
    queryKey: ['feature-access', 'AI_PLAN_RESCHEDULE'],
    queryFn: () => apiClient.request<AccessResponse>(`${apiVersion}/features/access?featureCode=AI_PLAN_RESCHEDULE`),
    enabled: open,
  });
  const historyQuery = useQuery({ queryKey: ['reschedule-history'], queryFn: coachService.rescheduleHistory, enabled: open });
  const premium = accessQuery.data?.enabled === true;

  const createPreview = async () => {
    if (!reason.trim()) { setMessage('Nhập lý do muốn thay đổi lịch.'); return; }
    if (scope === 'SINGLE_SLOT' && targetSlotId === null) { setMessage('Chọn slot muốn thay đổi trước.'); return; }
    const minutes = duration.trim() ? Number(duration) : undefined;
    if (minutes !== undefined && (!Number.isInteger(minutes) || minutes < 15 || minutes > 240)) { setMessage('Thời lượng phải từ 15 đến 240 phút.'); return; }
    setBusy(true);
    setMessage('');
    try {
      const body: PlanRescheduleRequest = {
        roadmapId, scope, targetDate: requestedDate, targetSlotId: scope === 'SINGLE_SLOT' ? targetSlotId ?? undefined : undefined,
        goal, naturalLanguageRequest: requestText.trim() || undefined,
        availableWeekdays: availableDays.length ? availableDays : undefined,
        preferredStartTime: startTime.trim() || undefined, preferredEndTime: endTime.trim() || undefined,
        desiredActivityTypes: activityTypes.length ? activityTypes.join(', ') : undefined,
        durationMinutes: minutes, unavailableActivities: unavailable.trim() || undefined,
        equipmentOrLocation: equipment.trim() || undefined, healthLimits: limits.trim() || undefined,
        reason: reason.trim(),
      };
      setPreview(await coachService.planReschedulePreview(body));
      await historyQuery.refetch();
    } catch (error) { setMessage(error instanceof ApiError ? error.message : 'Không thể tạo bản xem trước lịch.'); }
    finally { setBusy(false); }
  };

  const decide = async (accept: boolean) => {
    if (!preview || preview.status !== 'PENDING') return;
    setBusy(true);
    setMessage('');
    try {
      const result = accept ? await coachService.confirmReschedule(preview.previewId) : await coachService.rejectReschedule(preview.previewId);
      setPreview(result);
      setMessage(accept ? `Đã áp dụng thay đổi trong version ${result.appliedRoadmapId ?? ''}.` : 'Đề xuất bị từ chối; lịch hiện tại được giữ nguyên.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['roadmap'] }),
        queryClient.invalidateQueries({ queryKey: ['daily-ai-reviews'] }),
        historyQuery.refetch(),
      ]);
    } catch (error) { setMessage(error instanceof ApiError ? error.message : 'Không thể xử lý bản xem trước.'); }
    finally { setBusy(false); }
  };

  const toggleActivity = (type: string) => setActivityTypes((current) => current.includes(type) ? current.filter((item) => item !== type) : [...current, type]);

  return <Card>
    <Pressable onPress={() => setOpen((value) => !value)} accessibilityRole="button" accessibilityState={{ expanded: open }} style={{ flexDirection: 'row', alignItems: 'center', gap: 9, minHeight: 38 }}>
      <View style={{ flex: 1 }}><Text style={{ color: palette.text, fontSize: 15, fontWeight: '800' }}>Đổi lịch bằng AI</Text><Text style={{ color: palette.textMuted, fontSize: 10, marginTop: 3 }}>Tạo preview; lịch chỉ đổi sau khi bạn xác nhận</Text></View>
      <Text style={{ color: premium ? palette.primary : palette.textMuted, fontSize: 10, fontWeight: '800' }}>{accessQuery.isLoading ? '...' : premium ? 'PREMIUM' : 'FREE'}</Text>
      <Text style={{ color: palette.primary, fontSize: 16 }}>{open ? '−' : '+'}</Text>
    </Pressable>
    {open ? <View style={{ marginTop: 12 }}>
      {accessQuery.isError ? <Text style={{ color: palette.warning, fontSize: 11 }}>Không kiểm tra được quyền gói. Backend vẫn sẽ xác minh trước khi tạo preview.</Text> : null}
      <Text style={labelStyle}>Phạm vi</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {scopeOptions.map((option) => {
          const locked = option.value === 'NEW_VERSION' && !premium;
          return <Pressable key={option.value} onPress={() => { if (!locked) { setScope(option.value); setMessage(''); } }} accessibilityRole="radio" accessibilityState={{ selected: scope === option.value, disabled: locked }} style={{ paddingVertical: 7, paddingHorizontal: 9, borderRadius: 6, borderWidth: 1, borderColor: scope === option.value ? palette.primary : palette.border, opacity: locked ? 0.45 : 1 }}><Text style={{ color: scope === option.value ? palette.primary : palette.textMuted, fontSize: 10, fontWeight: '700' }}>{option.label}{locked ? ' · Premium' : ''}</Text></Pressable>;
        })}
      </View>
      {scope === 'SINGLE_SLOT' ? <View style={{ marginTop: 9 }}>
        <Text style={labelStyle}>Slot cần thay đổi</Text>
        {targetSlots.length ? targetSlots.map((slot) => <Pressable key={slot.id} onPress={() => setTargetSlotId(slot.id)} accessibilityRole="radio" accessibilityState={{ selected: targetSlotId === slot.id }} style={{ padding: 9, marginTop: 5, borderRadius: 6, borderWidth: 1, borderColor: targetSlotId === slot.id ? palette.primary : palette.border, backgroundColor: targetSlotId === slot.id ? palette.primarySoft : 'transparent' }}><Text style={{ color: targetSlotId === slot.id ? palette.primary : palette.text, fontSize: 10, fontWeight: '700' }}>{slot.sessionPeriod} · {slot.startTime}–{slot.endTime} · {slot.activity}</Text></Pressable>) : <Text style={{ color: palette.warning, fontSize: 10 }}>Ngày này không có slot sắp tới để thay đổi.</Text>}
      </View> : null}
      {!premium ? <Text style={{ color: palette.textMuted, fontSize: 10, lineHeight: 15, marginTop: 7 }}>Gói miễn phí: xem trước 7 ngày, tối đa một slot trong preview và một preview/ngày. Backend kiểm tra giới hạn này.</Text> : <Text style={{ color: palette.primary, fontSize: 10, lineHeight: 15, marginTop: 7 }}>Premium: có thể điều chỉnh các ngày còn lại trong phạm vi roadmap.</Text>}
      <Text style={labelStyle}>Yêu cầu bằng ngôn ngữ tự nhiên</Text>
      <TextInput value={requestText} onChangeText={setRequestText} multiline maxLength={1200} placeholder="Ví dụ: Hôm nay tôi không đi gym được, đổi sang chạy bộ 18:00–18:45." placeholderTextColor={palette.textMuted} style={[inputStyle, { minHeight: 70, textAlignVertical: 'top' }]} />
      <Text style={labelStyle}>Ngày bắt đầu thay đổi</Text>
      <TextInput value={requestedDate} onChangeText={setRequestedDate} placeholder="YYYY-MM-DD" accessibilityLabel="Ngày bắt đầu thay đổi" style={inputStyle} />
      <Text style={labelStyle}>Ngày có thể tập</Text>
      <View style={{ flexDirection: 'row', gap: 5 }}>{weekdays.map((day, index) => <Pressable key={day} onPress={() => setAvailableDays((current) => current.includes(index + 1) ? current.filter((item) => item !== index + 1) : [...current, index + 1])} accessibilityRole="checkbox" accessibilityState={{ checked: availableDays.includes(index + 1) }} style={{ flex: 1, minHeight: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 6, borderWidth: 1, borderColor: availableDays.includes(index + 1) ? palette.primary : palette.border, backgroundColor: availableDays.includes(index + 1) ? palette.primarySoft : 'transparent' }}><Text style={{ color: availableDays.includes(index + 1) ? palette.primary : palette.textMuted, fontSize: 9, fontWeight: '700' }}>{day}</Text></Pressable>)}</View>
      <Text style={labelStyle}>Khung giờ mong muốn</Text>
      <View style={{ flexDirection: 'row', gap: 7 }}><TextInput value={startTime} onChangeText={setStartTime} placeholder="18:00" maxLength={5} accessibilityLabel="Giờ bắt đầu mong muốn" style={[inputStyle, { flex: 1 }]} /><Text style={{ color: palette.textMuted, alignSelf: 'center' }}>đến</Text><TextInput value={endTime} onChangeText={setEndTime} placeholder="19:00" maxLength={5} accessibilityLabel="Giờ kết thúc mong muốn" style={[inputStyle, { flex: 1 }]} /><TextInput value={duration} onChangeText={setDuration} placeholder="phút" keyboardType="number-pad" maxLength={3} accessibilityLabel="Thời lượng phút" style={[inputStyle, { width: 68 }]} /></View>
      <Text style={labelStyle}>Hoạt động mong muốn</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{activityOptions.map((item) => <Pressable key={item} onPress={() => toggleActivity(item)} accessibilityRole="checkbox" accessibilityState={{ checked: activityTypes.includes(item) }} style={{ paddingVertical: 6, paddingHorizontal: 8, borderWidth: 1, borderColor: activityTypes.includes(item) ? palette.primary : palette.border, borderRadius: 6 }}><Text style={{ color: activityTypes.includes(item) ? palette.primary : palette.textMuted, fontSize: 9, fontWeight: '700' }}>{item}</Text></Pressable>)}</View>
      <TextInput value={equipment} onChangeText={setEquipment} placeholder="Thiết bị hoặc địa điểm" placeholderTextColor={palette.textMuted} maxLength={300} style={[inputStyle, { marginTop: 8 }]} />
      <TextInput value={unavailable} onChangeText={setUnavailable} placeholder="Hoạt động không thể thực hiện" placeholderTextColor={palette.textMuted} maxLength={300} style={[inputStyle, { marginTop: 7 }]} />
      <TextInput value={limits} onChangeText={setLimits} placeholder="Giới hạn sức khỏe" placeholderTextColor={palette.textMuted} maxLength={500} style={[inputStyle, { marginTop: 7 }]} />
      <TextInput value={reason} onChangeText={setReason} placeholder="Lý do thay đổi (bắt buộc)" placeholderTextColor={palette.textMuted} maxLength={300} style={[inputStyle, { marginTop: 7 }]} />
      <View style={{ marginTop: 11 }}><AppButton label="Tạo bản xem trước AI" onPress={() => void createPreview()} loading={busy} disabled={busy} /></View>
      {preview ? <View style={{ padding: 11, marginTop: 11, borderRadius: 8, backgroundColor: palette.surfaceRaised }}>
        <Text style={{ color: palette.text, fontSize: 12, fontWeight: '800' }}>{preview.summary}</Text>
        {preview.differences.map((item) => <Text key={item} style={{ color: palette.textMuted, fontSize: 10, lineHeight: 16, marginTop: 5 }}>• {item}</Text>)}
        {preview.changes.map((change) => <Text key={change.slotId} style={{ color: palette.primary, fontSize: 10, lineHeight: 15, marginTop: 6 }}>{change.action} · ngày {change.dayIndex + 1} · {change.sessionPeriod} {change.startTime}–{change.endTime} · {change.activity}</Text>)}
        {preview.safetyNotes.map((item) => <Text key={item} style={{ color: palette.warning, fontSize: 10, lineHeight: 15, marginTop: 5 }}>{item}</Text>)}
        {preview.status === 'PENDING' ? <View style={{ flexDirection: 'row', gap: 7, marginTop: 10 }}><View style={{ flex: 1 }}><AppButton label="Từ chối" variant="secondary" disabled={busy} onPress={() => void decide(false)} /></View><View style={{ flex: 1 }}><AppButton label="Xác nhận áp dụng" disabled={busy} loading={busy} onPress={() => void decide(true)} /></View></View> : <Text style={{ color: palette.primary, fontSize: 10, marginTop: 8 }}>{preview.status}{preview.appliedRoadmapId ? ` · roadmap ${preview.appliedRoadmapId}` : ''}</Text>}
      </View> : null}
      {historyQuery.data?.length ? <View style={{ marginTop: 12 }}><Text style={{ color: palette.text, fontSize: 11, fontWeight: '800' }}>Lịch sử preview</Text>{historyQuery.data.slice(0, 5).map((item) => <Text key={item.previewId} style={{ color: palette.textMuted, fontSize: 10, marginTop: 4 }}>{item.targetDate} · {item.scope} · {item.status}</Text>)}</View> : null}
      {message ? <Text accessibilityLiveRegion="polite" style={{ color: palette.warning, fontSize: 11, lineHeight: 16, marginTop: 9 }}>{message}</Text> : null}
    </View> : null}
  </Card>;
}

const labelStyle = { color: palette.textMuted, fontSize: 10, fontWeight: '700' as const, marginTop: 10, marginBottom: 5 };
const inputStyle = { minHeight: 39, paddingHorizontal: 9, color: palette.text, backgroundColor: palette.surfaceRaised, borderRadius: 6, fontSize: 11 } as const;
