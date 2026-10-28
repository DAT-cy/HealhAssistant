import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import { useQuery } from '@tanstack/react-query';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import AppButton from '@/components/ui/AppButton';
import { ApiError } from '@/api/client';
import type { RoadmapPlanSlot } from '@/api/services/coach.service';
import { gymWorkoutService, type ExerciseGuide, type GymPoseFeedback, type GymWorkoutSession } from '@/api/services/gym-workout.service';
import { palette } from '@/theme/tokens';

interface Props {
  visible: boolean;
  roadmapId: number;
  slot: RoadmapPlanSlot | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}

export default function GymCoachModal({ visible, roadmapId, slot, onClose, onSaved }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [facing, setFacing] = useState<CameraType>('back');
  const [session, setSession] = useState<GymWorkoutSession | null>(null);
  const [selectedCode, setSelectedCode] = useState('');
  const [feedback, setFeedback] = useState<GymPoseFeedback | null>(null);
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [repetitions, setRepetitions] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [reportedPain, setReportedPain] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const exerciseQuery = useQuery({ queryKey: ['gym', 'exercises'], queryFn: gymWorkoutService.exercises, enabled: visible });
  const premiumQuery = useQuery({ queryKey: ['feature-access', 'AI_GYM_CAMERA'], queryFn: gymWorkoutService.premiumAccess, enabled: visible });
  const historyQuery = useQuery({ queryKey: ['gym', 'history', slot?.id], queryFn: () => gymWorkoutService.history(slot!.id), enabled: visible && Boolean(slot?.id) });
  const exercises = (exerciseQuery.data ?? []) as ExerciseGuide[];
  const premium = premiumQuery.data?.enabled === true;
  const selectedExercise = exercises.find((exercise) => exercise.code === selectedCode) ?? null;

  const beginWorkout = async () => {
    if (!slot || !selectedExercise || busy) return;
    setBusy(true);
    setMessage('');
    try {
      const opened = await gymWorkoutService.start(roadmapId, slot.id, selectedExercise.code);
      setSession(opened);
      setFeedback(null);
      setReportedPain(false);
    } catch (error) { setMessage(error instanceof ApiError ? error.message : 'Không thể bắt đầu buổi tập.'); }
    finally { setBusy(false); }
  };

  const enableCamera = async () => {
    if (premiumQuery.isError) { setMessage('Không kiểm tra được quyền Premium. Hãy thử lại.'); return; }
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) { setMessage('Quyền camera bị từ chối. Bạn vẫn có thể tập theo hướng dẫn và nhập kết quả.'); return; }
    }
    setCameraActive(true);
    setMessage('');
  };

  const takePhoto = async () => {
    if (!camera.current || !session || !premium || busy || reportedPain) return;
    setBusy(true);
    setMessage('');
    try {
      const photo = await camera.current.takePictureAsync({ quality: 0.55, base64: false, exif: false, shutterSound: true });
      if (!photo?.uri) throw new Error('Camera không trả về ảnh.');
      setCapturedUri(photo.uri);
      const result = await gymWorkoutService.analyzePhoto(session.id, { uri: photo.uri, mimeType: 'image/jpeg', fileName: 'pose-check.jpg' }, facing);
      setFeedback(result);
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        setMessage('Phân tích AI camera là tính năng Premium và quyền này chưa được cấp cho tài khoản.');
      } else setMessage(error instanceof ApiError ? error.message : error instanceof Error ? error.message : 'Không thể phân tích ảnh.');
    } finally { setBusy(false); }
  };

  const finishWorkout = async () => {
    if (!session || busy) return;
    const reps = repetitions.trim() ? Number(repetitions) : undefined;
    if (reps !== undefined && (!Number.isInteger(reps) || reps < 0 || reps > 1000)) { setMessage('Số lần lặp phải là số nguyên từ 0 đến 1.000.'); return; }
    setBusy(true);
    setMessage('');
    try {
      await gymWorkoutService.finish(session.id, { repetitions: reps, userRating: rating ?? undefined, notes: notes.trim() || undefined, reportedPain });
      await onSaved();
      setSession(null);
      setCameraActive(false);
      if (reportedPain) setMessage('Đã dừng và lưu buổi tập vì bạn báo đau.');
      else onClose();
    } catch (error) { setMessage(error instanceof ApiError ? error.message : 'Không thể lưu buổi tập.'); }
    finally { setBusy(false); }
  };

  const close = () => {
    setCameraActive(false);
    setCapturedUri(null);
    setFeedback(null);
    setSession(null);
    setMessage('');
    onClose();
  };

  if (!slot) return null;
  return <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
    <ScrollView style={{ flex: 1, backgroundColor: palette.surface }} contentContainerStyle={{ padding: 18, paddingTop: 32, paddingBottom: 34 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
        <View style={{ flex: 1 }}><Text style={{ color: palette.text, fontSize: 18, fontWeight: '800' }}>Coach gym</Text><Text style={{ color: palette.textMuted, fontSize: 11, marginTop: 3 }}>{slot.activity} · {slot.startTime}–{slot.endTime}</Text></View>
        <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Đóng coach gym" style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="close" size={22} color={palette.textMuted} /></Pressable>
      </View>
      {!session ? <>
        <Text style={{ color: palette.text, fontSize: 13, fontWeight: '800', marginTop: 18 }}>Bài tập trong buổi</Text>
        {exerciseQuery.isPending ? <ActivityIndicator color={palette.primary} style={{ marginTop: 18 }} /> : null}
        {exerciseQuery.isError ? <Text style={{ color: palette.warning, marginTop: 10 }}>Không tải được danh sách bài tập.</Text> : null}
        {exercises.map((exercise) => <Pressable key={exercise.code} onPress={() => setSelectedCode(exercise.code)} accessibilityRole="radio" accessibilityState={{ selected: selectedCode === exercise.code }} style={{ padding: 12, marginTop: 8, borderRadius: 8, borderWidth: 1, borderColor: selectedCode === exercise.code ? palette.primary : palette.border, backgroundColor: selectedCode === exercise.code ? palette.primarySoft : palette.surface }}>
          <Text style={{ color: palette.text, fontWeight: '800', fontSize: 12 }}>{exercise.name}</Text>
          <Text style={{ color: palette.textMuted, fontSize: 10, marginTop: 3 }}>{exercise.muscleGroup} · {exercise.difficulty}{exercise.equipment ? ` · ${exercise.equipment}` : ''}</Text>
        </Pressable>)}
        {selectedExercise ? <View style={{ padding: 12, marginTop: 11, borderRadius: 8, backgroundColor: palette.surfaceRaised }}>
          <Text style={{ color: palette.text, fontWeight: '800', fontSize: 11 }}>Cách thực hiện</Text><Text style={{ color: palette.textMuted, fontSize: 11, lineHeight: 18, marginTop: 5 }}>{selectedExercise.instructions}</Text>
          {selectedExercise.safetyNotes ? <Text style={{ color: palette.warning, fontSize: 10, lineHeight: 16, marginTop: 7 }}>An toàn: {selectedExercise.safetyNotes}</Text> : null}
        </View> : null}
        <View style={{ marginTop: 14 }}><AppButton label="Bắt đầu buổi tập" onPress={() => void beginWorkout()} disabled={!selectedExercise || busy} loading={busy} /></View>
      </> : <>
        <View style={{ padding: 11, marginTop: 14, borderRadius: 8, backgroundColor: '#EAF5FF' }}>
          <Text style={{ color: palette.text, fontSize: 11, fontWeight: '800' }}>Chế độ ảnh tĩnh, không phải pose realtime</Text>
          <Text style={{ color: palette.textMuted, fontSize: 10, lineHeight: 16, marginTop: 4 }}>Camera chỉ xem trước trực tiếp. AI phân tích ảnh khi bạn chụp; không đo góc khớp, không đếm lần lặp và không lưu ảnh.</Text>
        </View>
        {selectedExercise ? <View style={{ padding: 12, marginTop: 10, borderRadius: 8, backgroundColor: palette.surfaceRaised }}><Text style={{ color: palette.text, fontSize: 11, fontWeight: '800' }}>Hướng dẫn · {selectedExercise.name}</Text><Text style={{ color: palette.textMuted, fontSize: 10, lineHeight: 16, marginTop: 5 }}>{selectedExercise.instructions}</Text><Text style={{ color: palette.warning, fontSize: 10, lineHeight: 15, marginTop: 5 }}>{selectedExercise.safetyNotes}</Text></View> : null}
        {cameraActive ? <View style={{ height: 300, marginTop: 12, overflow: 'hidden', borderRadius: 8, backgroundColor: '#101820' }}>
          <CameraView ref={camera} style={{ flex: 1 }} facing={facing} mode="picture" mute onMountError={(event) => setMessage(`Không mở được camera: ${event.message}`)} />
          <View style={{ position: 'absolute', top: 9, left: 9, right: 9, flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.62)' }}><Text style={{ color: '#FFF', fontSize: 10 }}>Đặt toàn thân vào khung · đủ sáng</Text></View>
            <Pressable onPress={() => setFacing((value) => value === 'back' ? 'front' : 'back')} accessibilityRole="button" accessibilityLabel="Đổi camera trước hoặc sau" style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.62)' }}><Ionicons name="camera-reverse-outline" size={19} color="#FFF" /></Pressable>
          </View>
        </View> : <Pressable onPress={() => void enableCamera()} accessibilityRole="button" style={{ height: 150, marginTop: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: palette.surfaceRaised }}><Ionicons name="camera-outline" size={32} color={palette.primary} /><Text style={{ color: palette.text, fontSize: 11, fontWeight: '700', marginTop: 7 }}>{permission?.granted ? 'Mở camera trước/sau' : 'Cấp quyền và mở camera'}</Text><Text style={{ color: palette.textMuted, fontSize: 10, marginTop: 3 }}>Chỉ xin quyền khi bạn mở camera</Text></Pressable>}
        {cameraActive ? <View style={{ flexDirection: 'row', gap: 8, marginTop: 9 }}>
          <Pressable disabled={!premium || busy || reportedPain} onPress={() => void takePhoto()} accessibilityRole="button" style={{ flex: 1, minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 7, backgroundColor: premium ? palette.primary : palette.surfaceRaised, opacity: busy || reportedPain ? 0.5 : 1 }}><Ionicons name="scan-outline" size={16} color={premium ? palette.textInverse : palette.textMuted} /><Text style={{ color: premium ? palette.textInverse : palette.textMuted, fontSize: 10, fontWeight: '800' }}>Chụp ảnh kiểm tra</Text></Pressable>
          <Pressable onPress={() => setCameraActive(false)} accessibilityRole="button" style={{ minHeight: 42, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: palette.border, borderRadius: 7 }}><Text style={{ color: palette.textMuted, fontSize: 10, fontWeight: '700' }}>Đóng camera</Text></Pressable>
        </View> : null}
        {premiumQuery.isPending ? <Text style={{ color: palette.textMuted, fontSize: 10, marginTop: 9 }}>Đang kiểm tra quyền Premium...</Text> : !premium ? <View style={{ padding: 10, marginTop: 9, borderRadius: 7, backgroundColor: '#FFF4E8' }}><Text style={{ color: palette.warning, fontSize: 10, fontWeight: '800' }}>Phân tích ảnh AI nâng cao là tính năng Premium</Text><Text style={{ color: palette.textMuted, fontSize: 10, lineHeight: 15, marginTop: 4 }}>Bạn vẫn có thể dùng camera preview, xem hướng dẫn và ghi nhận buổi tập. Quyền được xác minh ở backend.</Text></View> : <Text style={{ color: palette.primary, fontSize: 10, marginTop: 8 }}>Premium · tối đa 10 ảnh/buổi, cách nhau ít nhất 5 giây ({10 - (feedback?.analysesRemaining ?? 10)} đã dùng)</Text>}
        {capturedUri ? <Image source={{ uri: capturedUri }} accessibilityLabel="Ảnh tư thế vừa chụp" resizeMode="cover" style={{ width: 110, height: 110, marginTop: 10, borderRadius: 7 }} /> : null}
        {busy ? <ActivityIndicator color={palette.primary} style={{ marginTop: 12 }} /> : null}
        {feedback ? <View style={{ padding: 12, marginTop: 10, borderRadius: 8, backgroundColor: feedback.safetyConcern ? '#FFF0F0' : palette.surfaceRaised }}>
          <Text style={{ color: feedback.safetyConcern ? palette.danger : palette.primary, fontSize: 11, fontWeight: '800' }}>{feedback.confidence === 'LOW' ? 'Chưa đủ góc nhìn' : feedback.safetyConcern ? 'Ưu tiên dừng và kiểm tra an toàn' : `Nhận xét ảnh · độ tin cậy ${feedback.confidence}`}</Text>
          <Text style={{ color: palette.text, fontSize: 11, lineHeight: 17, marginTop: 6 }}>{feedback.feedback}</Text>
          {feedback.corrections.map((correction) => <Text key={correction} style={{ color: palette.textMuted, fontSize: 10, lineHeight: 15, marginTop: 5 }}>• {correction}</Text>)}
          <Text style={{ color: palette.textMuted, fontSize: 10, lineHeight: 15, marginTop: 7 }}>{feedback.nextStep}</Text>
          <Text style={{ color: palette.warning, fontSize: 10, marginTop: 6 }}>Số lần lặp không được đo từ ảnh tĩnh.</Text>
        </View> : null}
        <View style={{ padding: 11, marginTop: 12, borderRadius: 8, backgroundColor: palette.surfaceRaised }}>
          <Text style={{ color: palette.text, fontSize: 11, fontWeight: '800' }}>Ghi nhận kết quả</Text>
          <TextInput value={repetitions} onChangeText={setRepetitions} placeholder="Số lần lặp bạn tự ghi (không bắt buộc)" keyboardType="number-pad" style={inputStyle} />
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>{[1, 2, 3, 4, 5].map((value) => <Pressable key={value} onPress={() => setRating(value)} accessibilityRole="radio" accessibilityState={{ selected: rating === value }} style={{ flex: 1, minHeight: 34, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: rating === value ? palette.primary : palette.border, borderRadius: 6 }}><Text style={{ color: rating === value ? palette.primary : palette.textMuted, fontSize: 11, fontWeight: '800' }}>{value}</Text></Pressable>)}</View>
          <TextInput value={notes} onChangeText={setNotes} placeholder="Ghi chú" maxLength={500} style={[inputStyle, { marginTop: 8 }]} />
          <Pressable onPress={() => setReportedPain((value) => !value)} accessibilityRole="checkbox" accessibilityState={{ checked: reportedPain }} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 }}><Ionicons name={reportedPain ? 'checkbox' : 'square-outline'} size={19} color={reportedPain ? palette.danger : palette.textMuted} /><Text style={{ color: reportedPain ? palette.danger : palette.text, fontSize: 10 }}>Tôi cảm thấy đau, dừng và không đánh dấu hoàn thành</Text></Pressable>
          <AppButton label={reportedPain ? 'Dừng buổi tập' : 'Kết thúc và lưu buổi tập'} variant={reportedPain ? 'danger' : 'primary'} disabled={busy} loading={busy} onPress={() => void finishWorkout()} />
        </View>
      </>}
      {historyQuery.data?.length ? <View style={{ marginTop: 18 }}>
        <Text style={{ color: palette.text, fontSize: 12, fontWeight: '800' }}>Lịch sử khung tập</Text>
        {historyQuery.data.slice(0, 3).map((entry) => <View key={entry.id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderColor: palette.border }}><Text style={{ color: palette.text, fontSize: 10, fontWeight: '700' }}>{entry.exerciseCode} · {entry.status} · {entry.startedAt ? new Date(entry.startedAt).toLocaleDateString() : '—'}</Text><Text style={{ color: palette.textMuted, fontSize: 10, marginTop: 3 }}>{entry.durationSeconds === null ? '—' : `${Math.round(entry.durationSeconds / 60)} phút`} · {entry.repetitionSource === 'USER_ENTRY' ? `${entry.repetitions} lần do bạn ghi` : 'Số lần chưa được đo'}</Text></View>)}
      </View> : null}
      {message ? <Text accessibilityLiveRegion="polite" style={{ color: palette.warning, fontSize: 11, lineHeight: 16, marginTop: 10 }}>{message}</Text> : null}
    </ScrollView>
  </Modal>;
}

const inputStyle = { minHeight: 40, paddingHorizontal: 9, marginTop: 8, color: palette.text, backgroundColor: palette.surface, borderRadius: 6, fontSize: 11 } as const;
