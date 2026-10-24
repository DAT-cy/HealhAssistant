import React, { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, FadeOut, LinearTransition, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Card from '@/components/ui/Card';
import { palette } from '@/theme/tokens';

export type RoadmapWizardData = {
  fullName: string; goal: string; bodyFocus: string; roadmapName: string; weeks: number;
  age: string; height: string; weight: string; gender: string; activityLevel: string; experience: string;
  medicalConditions: string; restrictions: string; painAreas: string; medications: string; allergies: string; medicalNotes: string;
  sleep: string; workSchedule: string; stressLevel: string; dailyMovement: string;
  mealRoutine: string; foodPreferences: string; dietaryNeeds: string; waterIntake: string; supplements: string;
  location: string; equipment: string; mobility: string; trainingStyle: string; activities: string; intensity: string; sessionMinutes: string;
  availableDays: number[]; startTime: string; endTime: string; timeSlots: { period: string; startTime: string; endTime: string }[];
};

type Props = { initial: RoadmapWizardData; onSubmit: (data: RoadmapWizardData) => void; onCancel: () => void };

const stepMeta = [
  ['Mục tiêu', 'Bạn muốn đạt điều gì?'], ['Thời gian', 'Bạn muốn đi trong bao lâu?'], ['Kinh nghiệm', 'Mức độ hiện tại của bạn'],
  ['Lịch tập', 'Bạn có thể tập vào lúc nào?'], ['Địa điểm', 'Bạn sẽ tập ở đâu?'], ['Dinh dưỡng', 'Thói quen ăn uống của bạn'],
  ['Sức khỏe', 'Điều gì AI cần lưu ý?'], ['Tổng quan', 'Kiểm tra thông tin trước khi tạo'],
] as const;
const days = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const periods = [
  { id: 'MORNING', label: 'Sáng', icon: 'sunny-outline' as const, startTime: '06:00', endTime: '08:00' },
  { id: 'NOON', label: 'Trưa', icon: 'partly-sunny-outline' as const, startTime: '11:30', endTime: '13:00' },
  { id: 'AFTERNOON', label: 'Chiều', icon: 'cloudy-outline' as const, startTime: '14:00', endTime: '17:00' },
  { id: 'EVENING', label: 'Tối', icon: 'moon-outline' as const, startTime: '18:00', endTime: '20:00' },
] as const;

export default function RoadmapWizard({ initial, onSubmit, onCancel }: Props) {
  const [data, setData] = useState<RoadmapWizardData>(initial);
  const [step, setStep] = useState(0);
  const insets = useSafeAreaInsets();
  const progress = useSharedValue(0);
  const set = <K extends keyof RoadmapWizardData>(key: K, value: RoadmapWizardData[K]) => setData((current) => ({ ...current, [key]: value }));
  const updateProgress = (next: number) => { progress.value = withTiming(next / (stepMeta.length - 1), { duration: 320 }); };
  const next = async () => {
    if (step === 0 && !data.goal.trim()) return;
    if (step === 3 && (!data.availableDays.length || !data.timeSlots.length)) return;
    if (step < stepMeta.length - 1) { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); const nextStep = step + 1; setStep(nextStep); updateProgress(nextStep); }
    else onSubmit(data);
  };
  const back = () => { if (step === 0) onCancel(); else { const nextStep = step - 1; setStep(nextStep); updateProgress(nextStep); } };
  const progressStyle = useAnimatedStyle(() => ({ width: `${Math.max(8, progress.value * 100)}%` }));
  const canContinue = step === 0 ? Boolean(data.goal.trim()) : true;
  const summary = useMemo(() => [
    ['Mục tiêu', data.goal || 'Chưa nhập', 'sparkles-outline', '#E8F7FF', '#168AA0'],
    ['Thời gian', `${data.weeks} tuần`, 'time-outline', '#EFEEFF', palette.primary],
    ['Kinh nghiệm', data.experience || 'Chưa nhập', 'barbell-outline', '#FFF1E5', '#E26D16'],
    ['Lịch tập', data.availableDays.length ? `${data.availableDays.length} ngày · ${data.sessionMinutes} phút` : 'Chưa chọn', 'calendar-outline', '#E9FAF2', '#269E6B'],
    ['Địa điểm', data.location || 'Chưa nhập', 'location-outline', '#E8F2FF', '#2765B5'],
    ['Dinh dưỡng', data.mealRoutine || 'Chưa nhập', 'restaurant-outline', '#FFF0F5', '#E44F79'],
    ['Sức khỏe', data.medicalConditions || data.restrictions || 'Không có lưu ý', 'heart-outline', '#F1EDFF', '#6247BE'],
  ] as const, [data]);

  return <KeyboardAvoidingView style={{ flex: 1, backgroundColor: palette.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={insets.top}>
    <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 12, paddingBottom: 14, backgroundColor: palette.surface, borderBottomWidth: 1, borderColor: palette.border }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable onPress={back} accessibilityRole="button" accessibilityLabel={step === 0 ? 'Đóng' : 'Quay lại'} hitSlop={8}><Ionicons name={step === 0 ? 'close' : 'chevron-back'} size={25} color={palette.primary} /></Pressable>
        <View style={{ flex: 1 }}><Text style={{ color: palette.text, fontSize: 17, fontWeight: '800' }}>{step + 1}. {stepMeta[step][0]}</Text><Text style={{ color: palette.textMuted, fontSize: 11, marginTop: 2 }}>{stepMeta[step][1]}</Text></View>
        <Text style={{ color: palette.textMuted, fontSize: 12, fontWeight: '700' }}>{step + 1}/{stepMeta.length}</Text>
      </View>
      <View style={{ height: 7, marginTop: 14, overflow: 'hidden', borderRadius: 4, backgroundColor: '#E8EAF4' }}><Animated.View style={[{ height: '100%', borderRadius: 4, backgroundColor: palette.primary }, progressStyle]} /></View>
    </View>
    <Animated.ScrollView key={step} entering={FadeInDown.duration(300)} exiting={FadeOut.duration(180)} style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 150 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Text style={{ color: palette.text, fontSize: 22, lineHeight: 28, fontWeight: '800' }}>{stepMeta[step][1]}</Text>
      <Text style={{ color: palette.textMuted, fontSize: 13, lineHeight: 19, marginTop: 6 }}>Thông tin giúp AI xây dựng lộ trình phù hợp và an toàn hơn.</Text>
      {step === 0 ? <StepCard icon="locate-outline" tint="#E8F7FA" accent="#168AA0">
        <Text style={labelStyle}>Bạn muốn đạt mục tiêu gì? *</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>{['Giảm cân', 'Tăng cơ', 'Tăng sức bền', 'Cải thiện thể lực'].map((value) => <View key={value} style={{ width: '48%' }}><Choice label={value} selected={data.goal === value} onPress={() => set('goal', value)} /></View>)}</View>
        <Field label="Hoặc nhập mục tiêu riêng" value={['Giảm cân', 'Tăng cơ', 'Tăng sức bền', 'Cải thiện thể lực'].includes(data.goal) ? '' : data.goal} onChangeText={(v) => set('goal', v)} placeholder="Ví dụ: khỏe hơn để chạy 5 km" />
        <Field label="Vùng cơ thể muốn cải thiện" value={data.bodyFocus} onChangeText={(v) => set('bodyFocus', v)} placeholder="Ví dụ: bụng, đùi, vóc dáng" />
      </StepCard> : null}
      {step === 1 ? <StepCard icon="calendar-outline" tint="#E8F2FF" accent="#2765B5">
        <Text style={labelStyle}>Thời lượng lộ trình</Text><View style={rowStyle}>{[1, 2, 3].map((value) => <Choice key={value} label={`${value} tuần`} selected={data.weeks === value} onPress={() => set('weeks', value)} />)}</View>
      </StepCard> : null}
      {step === 2 ? <StepCard icon="barbell-outline" tint="#FFF1E5" accent="#E26D16">
        <Text style={labelStyle}>Kinh nghiệm tập luyện</Text><View style={rowStyle}>{['Mới bắt đầu', 'Trung bình', 'Nâng cao'].map((value) => <Choice key={value} label={value} selected={data.experience === value} onPress={() => set('experience', value)} />)}</View>
        <Text style={labelStyle}>Mức vận động hiện tại</Text><View style={rowStyle}>{['Ít vận động', 'Thỉnh thoảng', 'Năng động'].map((value) => <Choice key={value} label={value} selected={data.activityLevel === value} onPress={() => set('activityLevel', value)} />)}</View>
        <Text style={labelStyle}>Cường độ mong muốn</Text><View style={rowStyle}>{['Nhẹ', 'Vừa', 'Cao'].map((value) => <Choice key={value} label={value} selected={data.intensity === value} onPress={() => set('intensity', value)} />)}</View>
      </StepCard> : null}
      {step === 3 ? <StepCard icon="time-outline" tint="#E9FAF2" accent="#269E6B">
        <Text style={labelStyle}>Ngày bạn có thể tập</Text><View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>{days.map((day, index) => { const selected = data.availableDays.includes(index + 1); return <Pressable key={day} onPress={() => set('availableDays', selected ? data.availableDays.filter((item) => item !== index + 1) : [...data.availableDays, index + 1])} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} style={{ flex: 1, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: selected ? palette.success : palette.border, backgroundColor: selected ? '#DDF8EB' : palette.surface }}><Text style={{ color: selected ? '#16845B' : palette.textMuted, fontSize: 11, fontWeight: '800' }}>{day}</Text></Pressable>; })}</View>
        <Text style={labelStyle}>Khung giờ bạn rảnh</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>{periods.map((period) => { const selected = data.timeSlots.some((slot) => slot.period === period.id); return <View key={period.id} style={{ width: '48%' }}><Choice label={period.label} icon={period.icon} selected={selected} onPress={() => set('timeSlots', selected ? data.timeSlots.filter((slot) => slot.period !== period.id) : [...data.timeSlots, { period: period.id, startTime: period.startTime, endTime: period.endTime }])} /></View>; })}</View>
        {data.timeSlots.map((slot) => <View key={slot.period} style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}><View style={{ flex: 1 }}><Field label={`${periods.find((period) => period.id === slot.period)?.label ?? slot.period} - bắt đầu`} value={slot.startTime} onChangeText={(value) => set('timeSlots', data.timeSlots.map((item) => item.period === slot.period ? { ...item, startTime: value } : item))} placeholder="18:00" /></View><View style={{ flex: 1 }}><Field label="Kết thúc" value={slot.endTime} onChangeText={(value) => set('timeSlots', data.timeSlots.map((item) => item.period === slot.period ? { ...item, endTime: value } : item))} placeholder="20:00" /></View></View>)}
        <Text style={labelStyle}>Thời lượng mỗi buổi</Text><View style={rowStyle}>{['30', '45', '60', '90'].map((value) => <Choice key={value} label={`${value} phút`} selected={data.sessionMinutes === value} onPress={() => set('sessionMinutes', value)} />)}</View>
        {!data.availableDays.length || !data.timeSlots.length ? <Text style={{ color: palette.danger, fontSize: 11, marginTop: 8 }}>Chọn ngày và ít nhất một khung giờ để tiếp tục.</Text> : null}
      </StepCard> : null}
      {step === 4 ? <StepCard icon="location-outline" tint="#E8F2FF" accent="#2765B5">
        <Text style={labelStyle}>Bạn muốn tập ở đâu?</Text><View style={{ gap: 8, marginTop: 8 }}>{['Phòng gym', 'Tại nhà', 'Ngoài trời'].map((value) => <Choice key={value} label={value} selected={data.location === value} onPress={() => set('location', value)} wide />)}</View><Field label="Dụng cụ sẵn có" value={data.equipment} onChangeText={(v) => set('equipment', v)} placeholder="Ví dụ: tạ đơn, thảm tập" /><Field label="Khả năng di chuyển" value={data.mobility} onChangeText={(v) => set('mobility', v)} placeholder="Ví dụ: đi bộ 30 phút" />
      </StepCard> : null}
      {step === 5 ? <StepCard icon="restaurant-outline" tint="#FFF0F5" accent="#E44F79">
        <Text style={labelStyle}>Thói quen ăn uống</Text><View style={rowStyle}>{['3 bữa chính', '3 bữa + 2 bữa phụ', 'Ít bữa'].map((value) => <Choice key={value} label={value} selected={data.mealRoutine === value} onPress={() => set('mealRoutine', value)} />)}</View><Field label="Sở thích món ăn" value={data.foodPreferences} onChangeText={(v) => set('foodPreferences', v)} placeholder="Ví dụ: thích cá, rau xanh" /><Field label="Dị ứng hoặc chế độ kiêng" value={data.dietaryNeeds} onChangeText={(v) => set('dietaryNeeds', v)} placeholder="Nếu có" /><Field label="Lượng nước mỗi ngày" value={data.waterIntake} onChangeText={(v) => set('waterIntake', v)} placeholder="Ví dụ: 2 lít/ngày" />
      </StepCard> : null}
      {step === 6 ? <StepCard icon="heart-outline" tint="#F1EDFF" accent="#6247BE">
        <Field label="Bệnh lý đang có" value={data.medicalConditions} onChangeText={(v) => set('medicalConditions', v)} placeholder="Ví dụ: tim mạch, dạ dày" /><Field label="Chấn thương hoặc hạn chế" value={data.restrictions} onChangeText={(v) => set('restrictions', v)} placeholder="Ví dụ: đau gối, tránh nhảy" /><Field label="Giấc ngủ và phục hồi" value={data.sleep} onChangeText={(v) => set('sleep', v)} placeholder="Ví dụ: ngủ 6 giờ, hay mệt" /><Field label="Mức độ căng thẳng" value={data.stressLevel} onChangeText={(v) => set('stressLevel', v)} placeholder="Thấp, vừa hoặc cao" /><Field label="Lưu ý sức khỏe khác" value={data.medicalNotes} onChangeText={(v) => set('medicalNotes', v)} placeholder="Bệnh nền, thuốc đang dùng" />
      </StepCard> : null}
      {step === 7 ? <Animated.View entering={FadeInDown.duration(380)} layout={LinearTransition}>
        <Card style={{ marginTop: 18, padding: 12, backgroundColor: '#FFFFFF' }}>{summary.map(([title, value, icon, tint, accent], index) => <Animated.View key={title} entering={FadeInDown.delay(index * 45).duration(260)} style={{ minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, borderBottomWidth: index === summary.length - 1 ? 0 : 1, borderColor: palette.border }}><View style={{ width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: tint }}><Ionicons name={icon} size={18} color={accent} /></View><View style={{ flex: 1 }}><Text style={{ color: palette.textMuted, fontSize: 11 }}>{title}</Text><Text style={{ color: palette.text, fontSize: 13, fontWeight: '800', marginTop: 2 }} numberOfLines={2}>{value}</Text></View><Ionicons name="chevron-forward" size={17} color={accent} /></Animated.View>)}</Card>
        <View style={{ marginTop: 14, padding: 13, borderRadius: 12, backgroundColor: palette.primarySoft }}><Text style={{ color: palette.primaryDark, fontSize: 12, lineHeight: 18 }}>AI sẽ dùng các thông tin này để tạo kế hoạch tập luyện, dinh dưỡng và lời khuyên phục hồi phù hợp.</Text></View>
      </Animated.View> : null}
    </Animated.ScrollView>
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, minHeight: 86, flexDirection: 'row', gap: 10, padding: 16, paddingBottom: Math.max(insets.bottom, 16), backgroundColor: palette.surface, borderTopWidth: 1, borderColor: palette.border, zIndex: 20, elevation: 12 }}>
      <Pressable onPress={back} style={{ flex: 1, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1, borderColor: palette.primary }}><Text style={{ color: palette.primary, fontWeight: '800' }}>{step === 0 ? 'Hủy' : 'Quay lại'}</Text></Pressable>
      <View style={{ flex: 1.25, minHeight: 52, overflow: 'hidden', borderRadius: 14, backgroundColor: '#635BFF', borderWidth: 1, borderColor: '#4438CA' }}>
        <Pressable
          onPress={() => void next()}
          disabled={!canContinue || (step === 3 && (!data.availableDays.length || !data.timeSlots.length))}
          accessibilityRole="button"
          accessibilityLabel={step === stepMeta.length - 1 ? 'Tạo lộ trình' : 'Tiếp theo'}
          style={{ flex: 1, minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 10 }}
        >
          <>
            <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800', textAlign: 'center' }}>{step === stepMeta.length - 1 ? 'Tạo lộ trình' : 'Tiếp theo'}</Text>
            <Ionicons name={step === stepMeta.length - 1 ? 'sparkles' : 'arrow-forward'} size={18} color="#FFFFFF" />
          </>
        </Pressable>
      </View>
    </View>
  </KeyboardAvoidingView>;
}

export function GenerationScene() {
  const rotation = useSharedValue(0);
  const pulse = useSharedValue(0.92);
  useEffect(() => {
    rotation.value = withTiming(360, { duration: 7000 });
    pulse.value = withSpring(1.05, { damping: 14, stiffness: 55 });
  }, [pulse, rotation]);
  const orbStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  const ringStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));
  return <View style={{ alignItems: 'center', paddingVertical: 28 }}>
    <Animated.View style={[{ width: 190, height: 190, alignItems: 'center', justifyContent: 'center' }, ringStyle]}>
      <View style={{ position: 'absolute', width: 184, height: 184, borderRadius: 92, borderWidth: 1, borderColor: '#B9B5FF' }} />
      <View style={{ position: 'absolute', width: 150, height: 150, borderRadius: 75, borderWidth: 1, borderColor: '#DAD8FF', borderStyle: 'dashed' }} />
      <Animated.View style={[{ width: 112, height: 112, alignItems: 'center', justifyContent: 'center', borderRadius: 56, backgroundColor: palette.primary, shadowColor: palette.primary, shadowOpacity: 0.35, shadowRadius: 24, elevation: 10 }, orbStyle]}>
        <Ionicons name="sparkles" size={38} color="#FFFFFF" />
      </Animated.View>
    </Animated.View>
    <Text style={{ color: palette.text, fontSize: 20, fontWeight: '800', textAlign: 'center', marginTop: 16 }}>AI đang tạo lộ trình</Text>
    <Text style={{ color: palette.textMuted, fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 7 }}>Đang phân tích mục tiêu, lịch tập và thông tin sức khỏe của bạn.</Text>
    <View style={{ width: '80%', height: 8, marginTop: 22, overflow: 'hidden', borderRadius: 4, backgroundColor: '#E8EAF4' }}><Animated.View entering={FadeIn.duration(500)} style={{ width: '62%', height: '100%', borderRadius: 4, backgroundColor: palette.primary }} /></View>
  </View>;
}

function StepCard({ children, icon, tint, accent }: { children: React.ReactNode; icon: keyof typeof Ionicons.glyphMap; tint: string; accent: string }) {
  return <Card style={{ marginTop: 18, backgroundColor: tint, borderColor: `${accent}40` }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}><View style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#FFFFFF' }}><Ionicons name={icon} size={23} color={accent} /></View><View style={{ flex: 1 }}><Text style={{ color: palette.text, fontSize: 15, fontWeight: '800' }}>{stepTitle(icon)}</Text><Text style={{ color: palette.textMuted, fontSize: 11, marginTop: 2 }}>Chọn phương án phù hợp nhất với bạn</Text></View></View>{children}</Card>;
}
function stepTitle(icon: keyof typeof Ionicons.glyphMap) {
  const titles: Partial<Record<keyof typeof Ionicons.glyphMap, string>> = {
    'locate-outline': 'Mục tiêu của bạn', 'calendar-outline': 'Thời gian lộ trình', 'barbell-outline': 'Kinh nghiệm tập luyện',
    'time-outline': 'Lịch tập hằng tuần', 'location-outline': 'Không gian tập luyện', 'restaurant-outline': 'Thói quen dinh dưỡng', 'heart-outline': 'Sức khỏe và phục hồi',
  };
  return titles[icon] ?? 'Thông tin của bạn';
}
function Field({ label, value, onChangeText, placeholder }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string }) {
  return <View style={{ marginTop: 14 }}><Text style={labelStyle}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={palette.textMuted} style={{ minHeight: 46, paddingHorizontal: 12, color: palette.text, borderWidth: 1, borderColor: palette.border, borderRadius: 10, backgroundColor: palette.surface }} /></View>;
}
function Choice({ label, selected, onPress, wide = false, icon: customIcon }: { label: string; selected: boolean; onPress: () => void; wide?: boolean; icon?: keyof typeof Ionicons.glyphMap }) {
  const icon = customIcon ?? choiceIcon(label);
  return <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected }} style={{ flex: wide ? undefined : 1, width: wide ? '100%' : undefined, minHeight: 78, flexDirection: wide ? 'row' : 'column', alignItems: 'center', justifyContent: wide ? 'flex-start' : 'center', gap: 9, paddingHorizontal: wide ? 14 : 4, borderRadius: 13, borderWidth: selected ? 1.5 : 1, borderColor: selected ? palette.primary : palette.border, backgroundColor: selected ? palette.primarySoft : palette.surface }}>
    <View style={{ width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: selected ? '#DCD9FF' : '#F0F2FA' }}><Ionicons name={icon} size={19} color={selected ? palette.primary : palette.textMuted} /></View>
    <Text style={{ color: selected ? palette.primaryDark : palette.textMuted, fontSize: 11, fontWeight: '800', textAlign: 'center' }}>{label}</Text>
    {selected ? <View style={{ position: 'absolute', top: 6, right: 6, width: 18, height: 18, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: palette.primary }}><Ionicons name="checkmark" size={12} color="#FFFFFF" /></View> : null}
  </Pressable>;
}
function choiceIcon(label: string): keyof typeof Ionicons.glyphMap {
  if (label === 'Giảm cân') return 'trending-down-outline';
  if (label === 'Tăng cơ') return 'barbell-outline';
  if (label === 'Tăng sức bền') return 'flash-outline';
  if (label === 'Cải thiện thể lực') return 'fitness-outline';
  if (label.includes('tuần')) return 'calendar-outline';
  if (label === 'Mới bắt đầu') return 'sparkles-outline';
  if (label === 'Trung bình' || label === 'Thỉnh thoảng') return 'pulse-outline';
  if (label === 'Nâng cao' || label === 'Năng động') return 'flame-outline';
  if (label === 'Phòng gym') return 'barbell-outline';
  if (label === 'Tại nhà') return 'home-outline';
  if (label === 'Ngoài trời') return 'sunny-outline';
  if (label.includes('bữa')) return 'restaurant-outline';
  if (label.includes('Ít bữa')) return 'nutrition-outline';
  if (label === 'Nhẹ') return 'leaf-outline';
  if (label === 'Vừa') return 'pulse-outline';
  if (label === 'Cao') return 'flame-outline';
  if (label.includes('30')) return 'timer-outline';
  if (label.includes('45')) return 'time-outline';
  if (label.includes('60')) return 'stopwatch-outline';
  if (label.includes('90')) return 'hourglass-outline';
  return 'options-outline';
}
const labelStyle = { color: palette.text, fontSize: 13, fontWeight: '700' as const, marginTop: 14 };
const rowStyle = { flexDirection: 'row' as const, gap: 8, marginTop: 8 };
