import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Screen from '@/components/ui/Screen';
import AppButton from '@/components/ui/AppButton';
import SafetyBanner from '@/components/ui/SafetyBanner';
import { palette } from '@/theme/tokens';
import { useWorkoutSession } from '@/hooks/useWorkoutSession';

export default function WorkoutPage() {
  const [started, setStarted] = useState(false);
  const [painReported, setPainReported] = useState(false);
  const session = useWorkoutSession();
  const feedback = session.feedback;

  useEffect(() => () => session.stop(), [session.stop]);

  const toggle = () => {
    if (started) {
      void session.end();
      setStarted(false);
      setPainReported(false);
    } else {
      session.start();
      setStarted(true);
      setPainReported(false);
    }
  };

  // Demo bridge: khi camera/pose pipeline được tích hợp, thay bằng góc + visibility từ landmark.
  const sendSampleFrame = () => { void session.track('squat', feedback?.phase === 'DOWN' ? 160 : 85, 0.92); };

  return <Screen title="Kiểm tra Squat" subtitle="Bài tập thử nghiệm bằng landmark mẫu; camera chưa được kết nối." showBack>
    <View style={{ height: 260, borderRadius: 20, backgroundColor: '#EEF0F8', alignItems: 'center', justifyContent: 'center' }} accessibilityLabel="Khu vực kiểm tra squat thử nghiệm"><Ionicons name="body-outline" size={64} color={palette.primary} /><Text style={{ color: palette.text, marginTop: 15 }}>{started ? 'Đang gửi dữ liệu landmark mẫu...' : 'Chế độ thử nghiệm'}</Text>{started ? <Text style={{ color: palette.textMuted, fontSize: 12, marginTop: 6 }}>Kết quả không phải phân tích camera</Text> : null}</View>
    <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 8 }}><View style={{ alignItems: 'center' }}><Text accessibilityLiveRegion="polite" style={{ color: palette.text, fontSize: 32, fontWeight: '800' }}>{feedback?.repetitionCount ?? 0}</Text><Text style={{ color: palette.textMuted, fontSize: 12 }}>Số lần lặp</Text></View><View style={{ alignItems: 'center' }}><Text style={{ color: palette.text, fontSize: 32, fontWeight: '800' }}>{feedback?.jointAngle ? feedback.jointAngle.toFixed(0) : '--'}</Text><Text style={{ color: palette.textMuted, fontSize: 12 }}>Góc khớp</Text></View><View style={{ alignItems: 'center' }}><Text style={{ color: feedback?.confident === false ? palette.warning : palette.primary, fontSize: 17, fontWeight: '800' }}>{feedback?.phase ?? 'SẴN SÀNG'}</Text><Text style={{ color: palette.textMuted, fontSize: 12 }}>Trạng thái</Text></View></View>
    {feedback?.corrections?.length ? <View style={{ padding: 13, borderRadius: 14, backgroundColor: '#FFF6E5', borderWidth: 1, borderColor: '#FFE2B2' }}><Text style={{ color: palette.warning, fontWeight: '700' }}>Nhắc form</Text><Text style={{ color: palette.text, marginTop: 5 }}>{feedback.corrections[0]}</Text></View> : null}
    {feedback?.confident === false ? <View style={{ padding: 13, borderRadius: 14, backgroundColor: '#FFF6E5' }}><Text style={{ color: palette.warning }}>Độ tin cậy thấp. Hãy chỉnh lại camera trước khi xem kết quả.</Text></View> : null}
    {session.state.status === 'error' ? <Text style={{ color: palette.danger }}>{session.state.message}</Text> : null}
    {started ? <View style={{ padding: 13, borderRadius: 14, backgroundColor: palette.dangerLight, borderWidth: 1, borderColor: '#FFD6DF' }}><Text style={{ color: palette.text, fontWeight: '700' }}>Bạn có đang cảm thấy đau không?</Text><Text style={{ color: palette.textMuted, fontSize: 12, marginTop: 5 }}>Hãy trả lời trước khi tiếp tục bài tập.</Text><View style={{ flexDirection: 'row', gap: 9, marginTop: 10 }}><Pressable onPress={() => setPainReported(false)} style={{ flex: 1, minHeight: 44, borderRadius: 12, backgroundColor: palette.surface, alignItems: 'center', justifyContent: 'center' }} accessibilityRole="button" accessibilityLabel="Không đau"><Text style={{ color: palette.text }}>Không đau</Text></Pressable><Pressable onPress={() => { setPainReported(true); void session.end(); setStarted(false); }} style={{ flex: 1, minHeight: 44, borderRadius: 12, backgroundColor: palette.danger, alignItems: 'center', justifyContent: 'center' }} accessibilityRole="button" accessibilityLabel="Đau, dừng bài ngay"><Text style={{ color: palette.textInverse, fontWeight: '700' }}>Đau — dừng bài</Text></Pressable></View></View> : null}
    {painReported ? <Text accessibilityLiveRegion="polite" style={{ color: palette.warning }}>Đã dừng bài vì bạn báo đau. Hãy nghỉ ngơi và tìm hỗ trợ phù hợp nếu cần.</Text> : null}
    <AppButton label={started ? 'Dừng bài' : 'Bắt đầu'} variant={started ? 'danger' : 'primary'} onPress={toggle} />
    {started ? <Pressable onPress={sendSampleFrame} style={{ alignItems: 'center', padding: 8 }} accessibilityRole="button" accessibilityLabel="Gửi mẫu landmark"><Text style={{ color: palette.accent, fontSize: 12 }}>Kiểm tra kết nối pose engine</Text></Pressable> : null}
    <SafetyBanner text="Nếu cảm thấy đau, hãy giảm tải hoặc dừng bài ngay. Công cụ không thay thế chẩn đoán hoặc điều trị y khoa." />
  </Screen>;
}
