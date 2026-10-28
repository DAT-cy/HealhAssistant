import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { Pedometer } from 'expo-sensors';
import { ApiError } from '@/api/client';
import type { ActivitySession, RoadmapPlanSlot } from '@/api/services/coach.service';
import { coachService } from '@/api/services/coach.service';
import { palette } from '@/theme/tokens';

type TrackerStatus = 'idle' | 'starting' | 'IN_PROGRESS' | 'PAUSED' | 'saving' | 'done';
type GpsSample = { timestampEpochMillis: number; latitude: number; longitude: number; accuracyMeters: number };

interface Props {
  visible: boolean;
  roadmapId: number;
  slot: RoadmapPlanSlot | null;
  onClose: () => void;
  onSaved: (slot: RoadmapPlanSlot, session: ActivitySession) => Promise<void>;
}

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remaining = seconds % 60;
  return [hours, minutes, remaining].map((value) => String(value).padStart(2, '0')).join(':');
}

function measureLiveDistance(points: GpsSample[]) {
  const radius = 6_371_000;
  let distance = 0;
  let usable = 0;
  for (let index = 1; index < points.length; index++) {
    const previous = points[index - 1];
    const current = points[index];
    const elapsedSeconds = (current.timestampEpochMillis - previous.timestampEpochMillis) / 1000;
    if (elapsedSeconds <= 0 || elapsedSeconds > 60 || previous.accuracyMeters > 30 || current.accuracyMeters > 30) continue;
    const radians = Math.PI / 180;
    const lat1 = previous.latitude * radians;
    const lat2 = current.latitude * radians;
    const dLat = (current.latitude - previous.latitude) * radians;
    const dLon = (current.longitude - previous.longitude) * radians;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    const segment = radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    if (segment < 1 || segment / elapsedSeconds > 12) continue;
    distance += segment;
    usable++;
  }
  return usable > 0 ? distance : null;
}

export default function ActivityTrackerModal({ visible, roadmapId, slot, onClose, onSaved }: Props) {
  const [status, setStatus] = useState<TrackerStatus>('idle');
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [steps, setSteps] = useState<number | null>(null);
  const [gpsSampleCount, setGpsSampleCount] = useState(0);
  const [liveDistanceMeters, setLiveDistanceMeters] = useState<number | null>(null);
  const [pedometerAvailable, setPedometerAvailable] = useState<boolean | null>(null);
  const [gpsAvailable, setGpsAvailable] = useState(false);
  const [manualDistance, setManualDistance] = useState('');
  const [manualSteps, setManualSteps] = useState('');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const queryClient = useQueryClient();
  const gpsSubscription = useRef<Location.LocationSubscription | null>(null);
  const stepSubscription = useRef<{ remove: () => void } | null>(null);
  const samples = useRef<GpsSample[]>([]);
  const liveSteps = useRef<number | null>(null);
  const statusRef = useRef<TrackerStatus>('idle');
  const historyQuery = useQuery({
    queryKey: ['activity-sessions', roadmapId, slot?.id],
    queryFn: () => coachService.activityHistory(roadmapId, slot!.id),
    enabled: visible && Boolean(roadmapId && slot?.id),
  });

  useEffect(() => { statusRef.current = status; }, [status]);

  const stopDeviceSubscriptions = useCallback(() => {
    gpsSubscription.current?.remove();
    stepSubscription.current?.remove();
    gpsSubscription.current = null;
    stepSubscription.current = null;
  }, []);

  useEffect(() => () => stopDeviceSubscriptions(), [stopDeviceSubscriptions]);

  useEffect(() => {
    if (!visible || status !== 'IN_PROGRESS') return;
    const timer = setInterval(() => {
      if (startedAt !== null) setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    }, 1000);
    return () => clearInterval(timer);
  }, [visible, status, startedAt]);

  useEffect(() => {
    if (!visible || status !== 'IN_PROGRESS') return;
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') {
        stopDeviceSubscriptions();
        if (statusRef.current === 'IN_PROGRESS') {
          void (async () => {
            if (sessionId !== null) await coachService.pauseActivity(sessionId).catch(() => {});
            setStatus('PAUSED');
            setMessage('Theo dõi chỉ chạy khi ứng dụng đang mở. Hoạt động đã tạm dừng khi ứng dụng rời foreground.');
          })();
        }
      }
    });
    return () => subscription.remove();
  }, [visible, status, sessionId, stopDeviceSubscriptions]);

  const startDeviceSubscriptions = async () => {
    if (!slot || !['RUNNING', 'WALKING'].includes(slot.activityType)) return;
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setGpsAvailable(false);
        setMessage('Quyền vị trí bị từ chối. Bạn vẫn có thể dùng đồng hồ và nhập quãng đường thủ công.');
      } else {
        setGpsAvailable(true);
        gpsSubscription.current = await Location.watchPositionAsync({
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 5,
          mayShowUserSettingsDialog: true,
        }, (location) => {
          if (samples.current.length >= 5000) return;
          samples.current.push({
            timestampEpochMillis: location.timestamp,
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracyMeters: location.coords.accuracy ?? 999,
          });
          setGpsSampleCount(samples.current.length);
          setLiveDistanceMeters(measureLiveDistance(samples.current));
        });
      }
    } catch {
      setGpsAvailable(false);
      setMessage('Không thể lấy GPS. Bạn vẫn có thể nhập quãng đường sau khi kết thúc.');
    }

    try {
      const available = await Pedometer.isAvailableAsync();
      const permission = available ? await Pedometer.requestPermissionsAsync() : null;
      const granted = Boolean(available && permission?.granted);
      setPedometerAvailable(granted);
      if (granted) {
        stepSubscription.current = Pedometer.watchStepCount((result) => {
          if (!Number.isFinite(result.steps) || result.steps < 0) return;
          liveSteps.current = result.steps;
          setSteps(result.steps);
        });
      } else if (message === '') {
        setMessage(available ? 'Quyền bước chân bị từ chối. Số bước sẽ không được đo tự động.' : 'Thiết bị không cung cấp bộ đếm bước. Bạn có thể nhập số bước thủ công.');
      }
    } catch {
      setPedometerAvailable(false);
      setMessage('Không thể đọc bộ đếm bước trên thiết bị này; không có số bước tự động.');
    }
  };

  const begin = async () => {
    if (!slot || busy) return;
    setBusy(true);
    setMessage('');
    setStatus('starting');
    try {
      let session = await coachService.startActivity(roadmapId, slot.id);
      if (session.status === 'PAUSED') session = await coachService.resumeActivity(session.id);
      setSessionId(session.id);
      const startTime = Date.parse(session.startedAt);
      setStartedAt(startTime);
      setElapsedSeconds(0);
      setSteps(null);
      setGpsSampleCount(0);
      setLiveDistanceMeters(null);
      liveSteps.current = null;
      samples.current = [];
      setManualDistance('');
      setManualSteps('');
      setNotes('');
      await startDeviceSubscriptions();
      setStartedAt(startTime);
      setStatus('IN_PROGRESS');
    } catch (error) {
      setStatus('idle');
      setMessage(error instanceof ApiError ? error.message : 'Không thể bắt đầu hoạt động.');
    } finally {
      setBusy(false);
    }
  };

  const pause = async () => {
    if (sessionId === null || busy) return;
    setBusy(true);
    try {
      await coachService.pauseActivity(sessionId);
      stopDeviceSubscriptions();
      setStatus('PAUSED');
    } catch (error) { setMessage(error instanceof ApiError ? error.message : 'Không thể tạm dừng.'); }
    finally { setBusy(false); }
  };

  const resume = async () => {
    if (sessionId === null || busy) return;
    setBusy(true);
    try {
      const session = await coachService.resumeActivity(sessionId);
      setStartedAt(Date.now() - elapsedSeconds * 1000);
      setStatus('IN_PROGRESS');
      await startDeviceSubscriptions();
      if (!session.startedAt) setMessage('Không thể xác nhận thời điểm bắt đầu từ máy chủ.');
    } catch (error) { setMessage(error instanceof ApiError ? error.message : 'Không thể tiếp tục.'); }
    finally { setBusy(false); }
  };

  const finish = async () => {
    if (sessionId === null || !slot || busy) return;
    const parsedDistance = manualDistance.trim() ? Number(manualDistance.replace(',', '.')) : undefined;
    const parsedSteps = manualSteps.trim() ? Number(manualSteps) : undefined;
    if (parsedDistance !== undefined && (!Number.isFinite(parsedDistance) || parsedDistance < 0 || parsedDistance > 500000)) {
      setMessage('Quãng đường thủ công phải từ 0 đến 500.000 mét.');
      return;
    }
    if (parsedSteps !== undefined && (!Number.isInteger(parsedSteps) || parsedSteps < 0 || parsedSteps > 200000)) {
      setMessage('Số bước thủ công không hợp lệ.');
      return;
    }
    setBusy(true);
    setStatus('saving');
    setMessage('');
    stopDeviceSubscriptions();
    try {
      const completed = await coachService.finishActivity(sessionId, {
        manualDistanceMeters: parsedDistance,
        sensorSteps: liveSteps.current ?? undefined,
        manualSteps: liveSteps.current === null ? parsedSteps : undefined,
        gpsSamples: samples.current,
        notes: notes.trim() || undefined,
      });
      await onSaved(slot, completed);
      await queryClient.invalidateQueries({ queryKey: ['activity-sessions', roadmapId, slot.id] });
      setStatus('done');
      setSessionId(null);
    } catch (error) {
      setStatus('PAUSED');
      setMessage(error instanceof ApiError ? error.message : 'Không thể lưu kết quả hoạt động. Bạn có thể thử lưu lại.');
    } finally { setBusy(false); }
  };

  const cancel = async () => {
    if (sessionId !== null && !['done', 'idle'].includes(status) && !busy) {
      setBusy(true);
      try { await coachService.cancelActivity(sessionId); }
      catch (error) { setMessage(error instanceof ApiError ? error.message : 'Không thể hủy phiên theo dõi.'); setBusy(false); return; }
      finally { stopDeviceSubscriptions(); }
      setBusy(false);
    }
    setStatus('idle');
    setSessionId(null);
    setElapsedSeconds(0);
    setStartedAt(null);
    setSteps(null);
    setGpsSampleCount(0);
    setLiveDistanceMeters(null);
    samples.current = [];
    liveSteps.current = null;
    setMessage('');
    onClose();
  };

  const closeCompleted = () => {
    setStatus('idle');
    setSessionId(null);
    setElapsedSeconds(0);
    setStartedAt(null);
    setSteps(null);
    setGpsSampleCount(0);
    setLiveDistanceMeters(null);
    samples.current = [];
    liveSteps.current = null;
    setMessage('');
    onClose();
  };

  if (!slot) return null;
  const isTracked = ['RUNNING', 'WALKING'].includes(slot.activityType);
  const isHistorical = ['COMPLETED', 'SKIPPED', 'CANCELLED'].includes(slot.status);
  const pace = liveDistanceMeters !== null && elapsedSeconds > 0 ? elapsedSeconds / (liveDistanceMeters / 1000) : null;

  return <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => void cancel()}>
    <View style={{ flex: 1, padding: 20, paddingTop: 34, backgroundColor: palette.surface }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1 }}><Text style={{ color: palette.text, fontSize: 19, fontWeight: '800' }}>{slot.activity}</Text><Text style={{ color: palette.textMuted, fontSize: 12, marginTop: 4 }}>{slot.activityType === 'RUNNING' ? 'Chạy bộ' : 'Đi bộ'} · theo dõi khi ứng dụng mở</Text></View>
        <Pressable onPress={() => void cancel()} disabled={busy} accessibilityRole="button" accessibilityLabel="Đóng theo dõi" style={{ width: 42, height: 42, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="close" size={22} color={palette.textMuted} /></Pressable>
      </View>
      <Text style={{ color: palette.textMuted, fontSize: 11, lineHeight: 17, marginTop: 12 }}>Vị trí chỉ dùng trong phiên này để ước tính quãng đường; app không theo dõi khi chạy nền. Bộ đếm bước chỉ được lưu nếu thiết bị trả dữ liệu thật.</Text>
      {!isHistorical ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 18 }}>
        <Metric label="Thời gian" value={formatDuration(elapsedSeconds)} />
        <Metric label="Quãng đường" value={liveDistanceMeters === null ? '—' : liveDistanceMeters >= 1000 ? `${(liveDistanceMeters / 1000).toFixed(2)} km` : `${Math.round(liveDistanceMeters)} m`} />
        <Metric label="Số bước" value={steps === null ? 'Chưa có' : String(steps)} />
        <Metric label="Pace GPS" value={pace === null ? '—' : `${Math.floor(pace / 60)}:${String(Math.round(pace % 60)).padStart(2, '0')} /km`} />
      </View> : <Text style={{ color: palette.textMuted, fontSize: 12, marginTop: 16 }}>Lịch sử các phiên theo dõi đã lưu cho khung giờ này.</Text>}
      {!isHistorical ? <Text style={{ color: palette.textMuted, fontSize: 11, marginTop: 12 }}>GPS: {gpsAvailable ? `${gpsSampleCount} điểm · foreground` : 'không khả dụng'} · Bước: {pedometerAvailable ? 'sensor' : 'không khả dụng'}</Text> : null}
      {!isTracked ? <Text style={{ color: palette.warning, marginTop: 10 }}>Tracking chỉ dành cho chạy bộ và đi bộ.</Text> : null}
      {status === 'idle' && !isHistorical ? <View style={{ marginTop: 22 }}><ActionButton label={slot.status === 'IN_PROGRESS' ? 'Tiếp tục theo dõi' : 'Bắt đầu hoạt động'} icon="play" disabled={!isTracked || busy} onPress={() => void begin()} /></View> : null}
      {status === 'starting' ? <ActivityIndicator color={palette.primary} style={{ marginTop: 24 }} /> : null}
      {status === 'IN_PROGRESS' ? <View style={{ flexDirection: 'row', gap: 9, marginTop: 20 }}>
        <ActionButton label="Tạm dừng" icon="pause" disabled={busy} onPress={() => void pause()} /><ActionButton label="Kết thúc" icon="stop" disabled={busy} onPress={() => void finish()} />
      </View> : null}
      {status === 'PAUSED' ? <View style={{ flexDirection: 'row', gap: 9, marginTop: 20 }}>
        <ActionButton label="Tiếp tục" icon="play" disabled={busy} onPress={() => void resume()} /><ActionButton label="Lưu kết quả" icon="checkmark" disabled={busy} onPress={() => void finish()} />
      </View> : null}
      {status === 'saving' ? <ActivityIndicator color={palette.primary} style={{ marginTop: 24 }} /> : null}
      {status === 'done' ? <View style={{ marginTop: 22 }}><Text style={{ color: palette.primary, fontWeight: '800', textAlign: 'center' }}>Đã lưu kết quả hoạt động.</Text><View style={{ marginTop: 12 }}><ActionButton label="Đóng" icon="checkmark" onPress={closeCompleted} /></View></View> : null}
      {isTracked && status !== 'idle' && status !== 'done' ? <View style={{ gap: 8, marginTop: 20 }}>
        <TextInput value={manualDistance} onChangeText={setManualDistance} placeholder={gpsAvailable ? 'Quãng đường thủ công dự phòng (m)' : 'Quãng đường thủ công (m)'} keyboardType="decimal-pad" accessibilityLabel="Quãng đường nhập tay mét" style={inputStyle} />
        <TextInput value={manualSteps} onChangeText={setManualSteps} placeholder={pedometerAvailable ? 'Số bước thủ công nếu sensor không trả dữ liệu' : 'Số bước thủ công (sensor không khả dụng)'} keyboardType="number-pad" accessibilityLabel="Số bước nhập tay" style={inputStyle} />
        <TextInput value={notes} onChangeText={setNotes} placeholder="Ghi chú (không bắt buộc)" maxLength={500} accessibilityLabel="Ghi chú hoạt động" style={inputStyle} />
      </View> : null}
      {historyQuery.data?.length ? <View style={{ flex: 1, marginTop: 20 }}>
        <Text style={{ color: palette.text, fontSize: 13, fontWeight: '800' }}>Lịch sử hoạt động này</Text>
        {historyQuery.data.slice(0, 4).map((entry) => <View key={entry.id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderColor: palette.border }}>
          <Text style={{ color: palette.text, fontSize: 11, fontWeight: '700' }}>{new Date(entry.startedAt).toLocaleString()} · {entry.status === 'COMPLETED' ? 'Hoàn thành' : entry.status === 'CANCELLED' ? 'Đã hủy' : entry.status}</Text>
          <Text style={{ color: palette.textMuted, fontSize: 10, marginTop: 3 }}>{entry.durationSeconds !== null ? formatDuration(entry.durationSeconds) : '—'} · {entry.distanceMeters !== null ? `${(entry.distanceMeters / 1000).toFixed(2)} km (${entry.distanceSource})` : 'Chưa có quãng đường'} · {entry.steps !== null ? `${entry.steps} bước (${entry.stepsSource})` : 'Chưa có dữ liệu bước'}</Text>
        </View>)}
      </View> : null}
      {message ? <Text accessibilityLiveRegion="polite" style={{ color: palette.warning, fontSize: 12, lineHeight: 18, marginTop: 12 }}>{message}</Text> : null}
      {status !== 'done' && status !== 'idle' && status !== 'starting' ? <Text style={{ color: palette.textMuted, fontSize: 10, lineHeight: 15, marginTop: 12 }}>Nếu chuyển sang app khác, GPS và timer tạm dừng. Khi quay lại, tiếp tục phiên để đo chính xác.</Text> : null}
    </View>
  </Modal>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <View style={{ width: '48%', minHeight: 82, padding: 12, borderRadius: 8, backgroundColor: palette.surfaceRaised, justifyContent: 'center' }}><Text style={{ color: palette.textMuted, fontSize: 10 }}>{label}</Text><Text style={{ color: palette.text, fontSize: 20, fontWeight: '800', marginTop: 6 }}>{value}</Text></View>;
}

function ActionButton({ label, icon, disabled, onPress }: { label: string; icon: 'play' | 'pause' | 'stop' | 'checkmark'; disabled?: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" style={{ flex: 1, minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 8, backgroundColor: disabled ? palette.border : palette.primary }}><Ionicons name={icon} size={17} color={palette.textInverse} /><Text style={{ color: palette.textInverse, fontWeight: '800', fontSize: 12 }}>{label}</Text></Pressable>;
}

const inputStyle = { minHeight: 42, paddingHorizontal: 11, color: palette.text, backgroundColor: palette.surfaceRaised, borderRadius: 7, fontSize: 12 } as const;
