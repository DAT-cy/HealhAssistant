import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Screen from '@/components/ui/Screen';
import Card from '@/components/ui/Card';
import AppButton from '@/components/ui/AppButton';
import Badge from '@/components/ui/Badge';
import SafetyBanner from '@/components/ui/SafetyBanner';
import { ErrorState, LoadingState } from '@/components/ui/StateViews';
import { postureService } from '@/api/services/posture.service';
import type { PostureRequest } from '@/api/services/posture.service';
import { PostureAssessmentResponse } from '@/api/types';
import { ApiError } from '@/api/client';
import { palette } from '@/theme/tokens';

// Fixture chỉ dùng để kiểm tra endpoint khi camera pose pipeline chưa được cài.
// Trong production, thay body này bằng landmark từ MediaPipe; không gửi ảnh/video.
const demoLandmark = { x: 0, y: 0, z: 0, visibility: 0.92 };
const demoRequest: PostureRequest = { leftShoulder: { ...demoLandmark, x: -0.2 }, rightShoulder: { ...demoLandmark, x: 0.2 }, leftHip: { ...demoLandmark, x: -0.18, y: -0.5 }, rightHip: { ...demoLandmark, x: 0.18, y: -0.5 }, leftEar: { ...demoLandmark, x: -0.08, y: 0.45 }, rightEar: { ...demoLandmark, x: 0.08, y: 0.45 }, neck: { ...demoLandmark, y: 0.3 }, view: 'FRONT' };

export default function ScanPage() {
  const [view, setView] = useState<'FRONT' | 'SIDE'>('FRONT');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<PostureAssessmentResponse | null>(null);
  const [message, setMessage] = useState('');

  const assess = async () => {
    setStatus('loading');
    setMessage('');
    try {
      const response = await postureService.assess({ ...demoRequest, view });
      setResult(response);
      setStatus('success');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof ApiError ? error.message : 'Không thể phân tích tư thế.');
    }
  };

  return <Screen title="Quét tư thế" subtitle="Đặt camera ngang tầm mắt và đứng cách xa 2 mét." showBack>
    <View style={{ height: 280, borderRadius: 18, backgroundColor: '#18232C', borderWidth: 1, borderColor: palette.accent, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel="Khung camera quét tư thế"><Ionicons name="scan-outline" size={70} color={palette.accent} /><Text style={{ color: palette.text, marginTop: 15, fontSize: 16, fontWeight: '700' }}>Khung cơ thể của bạn</Text><Text style={{ color: palette.textMuted, fontSize: 12, marginTop: 5 }}>Chỉ gửi landmark, không gửi video</Text></View>
    <View style={{ flexDirection: 'row', gap: 10 }}><Pressable onPress={() => setView('FRONT')} style={{ flex: 1, padding: 13, borderRadius: 10, backgroundColor: view === 'FRONT' ? palette.primary : palette.surfaceRaised, alignItems: 'center' }}><Text style={{ color: view === 'FRONT' ? palette.textInverse : palette.text }}>Chính diện</Text></Pressable><Pressable onPress={() => setView('SIDE')} style={{ flex: 1, padding: 13, borderRadius: 10, backgroundColor: view === 'SIDE' ? palette.primary : palette.surfaceRaised, alignItems: 'center' }}><Text style={{ color: view === 'SIDE' ? palette.textInverse : palette.text }}>Nghiêng bên</Text></Pressable></View>
    {status === 'idle' ? <Card><Text style={{ color: palette.text, fontWeight: '700', marginBottom: 8 }}>Hướng dẫn</Text><Text style={{ color: palette.textMuted, lineHeight: 21 }}>{view === 'FRONT' ? 'Đứng thẳng người, chụp chính diện, toàn bộ cơ thể nằm trong khung hình.' : 'Đứng nghiêng 90 độ so với camera, toàn bộ cơ thể nằm trong khung hình.'}</Text></Card> : null}
    {status === 'loading' ? <LoadingState label="Đang phân tích landmark..." /> : null}
    {status === 'error' ? <ErrorState message={message} onRetry={() => void assess()} /> : null}
    {result ? <Card><View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={{ color: palette.text, fontSize: 17, fontWeight: '800' }}>Kết quả phân tích</Text><Badge label={result.reliable ? 'Đủ tin cậy' : 'Độ tin cậy thấp'} tone={result.reliable ? 'success' : 'warning'} /></View>{result.reliable ? <><Text style={{ color: palette.textMuted, marginTop: 16 }}>Chênh lệch vai: <Text style={{ color: palette.text }}>{result.shoulderImbalanceDegrees.toFixed(1)}°</Text></Text><Text style={{ color: palette.textMuted, marginTop: 7 }}>Nghiêng chậu: <Text style={{ color: palette.text }}>{result.pelvicTiltDegrees.toFixed(1)}°</Text></Text><Text style={{ color: palette.textMuted, marginTop: 7 }}>Đầu đưa trước: <Text style={{ color: palette.text }}>{result.forwardHeadDegrees.toFixed(1)}°</Text></Text></> : <Text style={{ color: palette.warning, lineHeight: 20, marginTop: 13 }}>Chưa hiển thị số đo vì landmark chưa đủ rõ. Hãy chỉnh camera và quét lại.</Text>}<Text style={{ color: palette.text, fontWeight: '700', marginTop: 16, marginBottom: 6 }}>Nhận xét</Text>{result.findings.map((finding) => <Text key={finding} style={{ color: palette.textMuted, lineHeight: 20, marginBottom: 4 }}>• {finding}</Text>)}</Card> : null}
    <AppButton label={result ? 'Quét lại' : 'Phân tích tư thế'} onPress={() => void assess()} loading={status === 'loading'} />
    <SafetyBanner text="Kết quả hỗ trợ tập luyện, không thay thế chẩn đoán hoặc điều trị y khoa." />
  </Screen>;
}
