import React, { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Pressable } from '@/components/ui/Pressable';
import AppButton from '@/components/ui/AppButton';
import { palette, radius, spacing } from '@/theme/tokens';
import { useRoadmap } from '@/hooks/useRoadmap';
import type { PlannedActivityType, RoadmapSlotRequest, SessionPeriod } from '@/api/services/coach.service';
import { diseaseService } from '@/api/services/disease.service';
import { notify } from '@/utils/notify';
import { profileService } from '@/api/services/profile.service';
import { ApiError } from '@/api/client';
import type { Disease } from '@/api/services/doctor.service';
import { needsConsent, activityPresets, activityTypes, periods, doctorRoutingNotice, previewOutcome, scheduleError, timeMinutes, variants, weekdays, weeklyMinutes } from './roadmapWizard.utils';

type Step = 1 | 2 | 3 | 4 | 5 | 6;
interface Props { visible: boolean; onClose: () => void; onCompleted: () => void; goal: string; initialDiseaseCodes?: string[]; /** Id các yêu cầu bác sĩ người dùng đã có, để nhận ra khi backend dùng lại yêu cầu cũ. */ knownRequestIds?: number[] }

export default function RoadmapWizardModal({ visible, onClose, onCompleted, goal, initialDiseaseCodes = [], knownRequestIds = [] }: Props) {
  const insets = useSafeAreaInsets();
  const roadmap = useRoadmap();
  const [step, setStep] = useState<Step>(1);
  const [title, setTitle] = useState('');
  const [diseaseCodes, setDiseaseCodes] = useState<string[]>([]);
  const [weeks, setWeeks] = useState(1);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [weekdaysSelected, setWeekdaysSelected] = useState<number[]>([]);
  const [weeklySlots, setWeeklySlots] = useState<RoadmapSlotRequest[]>([]);
  const [dayTab, setDayTab] = useState(1);
  const [scheduleValidation, setScheduleValidation] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const [direction, setDirection] = useState(1);
  const [page, setPage] = useState(0);
  const slide = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ translateX: slide.value }] }));

  const reset = () => {
    setStep(1); setTitle(''); setDiseaseCodes(initialDiseaseCodes); setWeeks(1); setStartDate(new Date().toISOString().slice(0, 10)); setWeekdaysSelected([]); setWeeklySlots([]); setDayTab(1);
    setScheduleValidation(''); setSelected(null); setPage(0);
  };
  // Reset the draft after the modal is dismissed so reopening always starts clean.
  // Reopen the wizard with the latest profile disease selection.
  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { if (!visible) reset(); }, [visible]);
  useEffect(() => {
    if (!visible) return;
    // Reanimated shared values are intentionally mutated to drive the transition.
    // eslint-disable-next-line react-hooks/immutability
    slide.value = direction > 0 ? 24 : -24;
    slide.value = withTiming(0, { duration: 280 });
  }, [step, page, visible, direction, slide]);

  const slotsForDay = useMemo(() => weeklySlots.filter((slot) => slot.dayOfWeek === dayTab), [weeklySlots, dayTab]);
  const diseaseQuery = useQuery({ queryKey: ['health', 'diseases'], queryFn: () => diseaseService.list(), enabled: visible });
  const selectedPlan = selected === null ? null : roadmap.options[selected];
  const valid = step === 1 ? Boolean(title.trim()) : step === 2 ? weeks > 0 : step === 3 ? weekdaysSelected.length > 0 : step === 4 ? weekdaysSelected.every((day) => weeklySlots.some((slot) => slot.dayOfWeek === day)) && !scheduleError(weeklySlots) : true;
  const haptic = () => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); };
  const go = (next: Step) => { haptic(); setDirection(next > step ? 1 : -1); setStep(next); };

  const requestClose = () => {
    if (title.trim() || weeklySlots.length) {
      Alert.alert('Bỏ lộ trình đang tạo?', 'Các thông tin bạn đã nhập sẽ bị xóa.', [{ text: 'Tiếp tục tạo', style: 'cancel' }, { text: 'Bỏ lộ trình', style: 'destructive', onPress: () => { reset(); onClose(); } }]);
    } else { reset(); onClose(); }
  };
  const toggleDay = (day: number) => {
    haptic();
    if (weekdaysSelected.includes(day) && weeklySlots.some((slot) => slot.dayOfWeek === day)) {
      Alert.alert('Xóa lịch của ngày này?', 'Các khung giờ đã nhập cho ngày này sẽ bị xóa.', [
        { text: 'Giữ lại', style: 'cancel' },
        { text: 'Xóa ngày', style: 'destructive', onPress: () => {
          setWeekdaysSelected((current) => current.filter((item) => item !== day));
          setWeeklySlots((current) => current.filter((slot) => slot.dayOfWeek !== day));
          if (dayTab === day) setDayTab(weekdaysSelected.find((item) => item !== day) ?? 1);
        } },
      ]);
      return;
    }
    setWeekdaysSelected((current) => current.includes(day) ? current.filter((item) => item !== day) : [...current, day].sort((a, b) => a - b));
    setDayTab(day);
  };
  const addSlot = (dayOfWeek: number, period: SessionPeriod) => {
    const count = weeklySlots.filter((slot) => slot.dayOfWeek === dayOfWeek && slot.sessionPeriod === period).length;
    if (count >= 4) return;
    const firstHour = period === 'MORNING' ? 6 : period === 'AFTERNOON' ? 14 : 19;
    const startHour = firstHour + count;
    if (startHour >= 23) return;
    setWeeklySlots((current) => [...current, { dayOfWeek, sessionPeriod: period, startTime: `${String(startHour).padStart(2, '0')}:00`, endTime: `${String(startHour).padStart(2, '0')}:30`, activityType: 'GYM', activity: 'Tập luyện' }]);
    setScheduleValidation(''); haptic();
  };
  const updateSlot = (index: number, changes: Partial<RoadmapSlotRequest>) => { setWeeklySlots((current) => current.map((slot, slotIndex) => slotIndex === index ? { ...slot, ...changes } : slot)); setScheduleValidation(''); };
  const removeSlot = (index: number) => { setWeeklySlots((current) => current.filter((_, slotIndex) => slotIndex !== index)); setScheduleValidation(''); };
  const copyDayToAll = () => {
    const source = weeklySlots.filter((slot) => slot.dayOfWeek === dayTab);
    if (!source.length) return;
    setWeeklySlots((current) => [...current.filter((slot) => !weekdaysSelected.includes(slot.dayOfWeek)), ...weekdaysSelected.flatMap((day) => source.map((slot) => ({ ...slot, dayOfWeek: day })))]);
    haptic();
  };
  const finish = () => { reset(); onCompleted(); };
  const generate = async () => {
    const error = scheduleError(weeklySlots); setScheduleValidation(error); if (error) { go(4); return; }
    setSelected(null); go(6);
    const preview = await roadmap.generate(goal, weeks, weeklySlots, undefined, undefined, diseaseCodes);
    // Lộ trình được chuyển bác sĩ: đóng wizard, báo cho người dùng, màn Lộ trình sẽ hiện thẻ theo dõi.
    if (preview && previewOutcome(preview.routingDecision) === 'SENT_TO_DOCTOR') {
      const notice = doctorRoutingNotice(preview.reviewRequestId, knownRequestIds, preview.routingReason);
      notify[notice.kind](notice.title, notice.description);
      finish();
      return;
    }
    // Phương án lấy từ yêu cầu bác sĩ đã duyệt → nói rõ để người dùng không tưởng AI tự duyệt.
    if (preview && previewOutcome(preview.routingDecision) === 'OPTIONS' && preview.reviewRequestId != null) {
      notify.success(`Bác sĩ đã duyệt yêu cầu #${preview.reviewRequestId}`, preview.routingReason ?? 'Hãy chọn một phương án bác sĩ đã duyệt để kích hoạt.');
    }
  };
  const [consenting, setConsenting] = useState(false);
  /** Người dùng bấm "Đồng ý sử dụng dữ liệu hồ sơ" ngay tại màn lỗi → lưu đồng ý rồi tạo lại phương án. */
  const giveConsent = async () => {
    setConsenting(true);
    try {
      await profileService.updateConsent(true);
      notify.success('Đã đồng ý sử dụng dữ liệu hồ sơ');
      await generate();
    } catch (error) {
      notify.error('Chưa lưu được đồng ý', error instanceof ApiError ? error.message : 'Vui lòng thử lại.');
    } finally {
      setConsenting(false);
    }
  };
  const activate = async () => {
    if (selectedPlan === null || selected === null) return;
    const ok = await roadmap.activate(selectedPlan, selected, title.trim(), null, startDate);
    if (ok) { notify.success('Tạo lộ trình thành công', title.trim() || undefined); finish(); }
  };

  const stepText: Record<Step, { title: string; detail: string }> = {
    1: { title: 'Lộ trình này tên là gì?', detail: 'Đặt tên để bạn dễ theo dõi mục tiêu.' },
    2: { title: 'Bạn muốn theo trong bao lâu?', detail: `Mục tiêu: ${goal || 'cải thiện sức khỏe'}` },
    3: { title: 'Bạn tập vào những ngày nào?', detail: 'Chọn một hoặc nhiều ngày trong tuần.' },
    4: { title: 'Tập lúc nào trong ngày?', detail: 'Tạo ít nhất một khung giờ cho mỗi ngày đã chọn.' },
    5: { title: 'Kiểm tra lại nhé', detail: 'Mọi thông tin sẽ được gửi để tạo phương án phù hợp.' },
    6: { title: roadmap.status === 'error' ? 'Chưa thể tạo phương án' : 'Chọn phương án phù hợp', detail: roadmap.status === 'error' ? 'Thông tin bạn đã nhập vẫn được giữ lại.' : 'Bạn có thể xem từng phương án trước khi xác nhận.' },
  };
  if (!visible) return null;
  return <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={requestClose}>
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => step > 1 ? go((step - 1) as Step) : requestClose()} accessibilityRole="button" accessibilityLabel={step > 1 ? 'Quay lại' : 'Đóng'} style={styles.navButton}><Ionicons name={step > 1 ? 'chevron-back' : 'close'} size={24} color={palette.text} /></Pressable>
        <ProgressBar step={step} />
        <View style={styles.navButton} />
      </View>
      <View style={styles.contentHeader}><Text style={styles.stepCount}>{step < 6 ? `BƯỚC ${step} / 5` : roadmap.status === 'error' ? 'CHƯA HOÀN TẤT' : 'BƯỚC CUỐI'}</Text><Text style={styles.heading}>{stepText[step].title}</Text><Text style={styles.subheading}>{stepText[step].detail}</Text></View>
      <Animated.View style={[styles.animatedContent, animatedStyle]}>
        {step === 1 ? <TitleStep title={title} setTitle={setTitle} diseaseCodes={diseaseCodes} setDiseaseCodes={setDiseaseCodes} diseases={diseaseQuery.data ?? []} onNext={() => { if (title.trim()) go(2); }} /> : null}
        {step === 2 ? <DurationStep weeks={weeks} setWeeks={setWeeks} startDate={startDate} setStartDate={setStartDate} /> : null}
        {step === 3 ? <DaysStep selected={weekdaysSelected} onToggle={toggleDay} startDate={startDate} /> : null}
        {step === 4 ? <ScheduleStep selectedDays={weekdaysSelected} activeDay={dayTab} setActiveDay={setDayTab} slots={weeklySlots} slotsForDay={slotsForDay} addSlot={addSlot} updateSlot={updateSlot} removeSlot={removeSlot} copyDayToAll={copyDayToAll} error={scheduleValidation} startDate={startDate} onNext={() => { const error = scheduleError(weeklySlots); setScheduleValidation(error); if (!error) go(5); }} /> : null}
        {step === 5 ? <ReviewStep title={title} weeks={weeks} slots={weeklySlots} onEdit={(target) => go(target)} onGenerate={() => void generate()} /> : null}
        {step === 6 ? <PreviewStep roadmap={roadmap} selected={selected} setSelected={setSelected} weeks={weeks} slots={weeklySlots} page={page} setPage={setPage} onRetry={() => void generate()} onConsent={() => void giveConsent()} consenting={consenting} onActivate={activate} onClose={finish} onBack={() => go(5)} /> : null}
      </Animated.View>
      {step < 5 ? <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 10 }]}><Text style={styles.hint}>{step === 4 ? 'Bạn có thể dùng cùng lịch cho các ngày đã chọn.' : 'Bạn có thể chỉnh lại ở bước trước.'}</Text><NextFab disabled={!valid} onPress={() => { if (step === 1) go(2); else if (step === 2) go(3); else if (step === 3) go(4); else if (step === 4) { const error = scheduleError(weeklySlots); setScheduleValidation(error); if (!error) go(5); } }} /></View> : null}
    </KeyboardAvoidingView>
  </Modal>;
}

function ProgressBar({ step }: { step: Step }) { return <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 5, now: Math.min(step, 5) }} style={styles.progressTrack}><View style={[styles.progressValue, { width: `${Math.min(step, 5) * 20}%` }]} /></View>; }
function NextFab({ disabled, onPress }: { disabled: boolean; onPress: () => void }) { return <Pressable disabled={disabled} onPress={onPress} accessibilityRole="button" accessibilityLabel="Tiếp tục" style={[styles.nextFab, disabled && styles.nextFabDisabled]}><Ionicons name="arrow-forward" size={24} color={disabled ? palette.textMuted : palette.textInverse} /></Pressable>; }
function TitleStep({ title, setTitle, diseaseCodes, setDiseaseCodes, diseases, onNext }: { title: string; setTitle: (value: string) => void; diseaseCodes: string[]; setDiseaseCodes: (value: string[]) => void; diseases: Disease[]; onNext: () => void }) { const suggestions = ['Giảm 5kg trong 3 tháng', 'Tăng cơ toàn thân', 'Chạy được 5km', 'Giãn cơ mỗi ngày']; return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.stepBody}><TextInput value={title} onChangeText={setTitle} autoFocus maxLength={60} returnKeyType="next" onSubmitEditing={onNext} placeholder="Ví dụ: Giảm 5kg trong 3 tháng" placeholderTextColor={palette.textMuted} style={styles.titleInput} /><View style={styles.counterRow}><Text style={styles.inputHint}>Tên lộ trình</Text><Text style={styles.counter}>{title.length}/60</Text></View><View style={styles.chips}>{suggestions.map((item) => <Pressable key={item} onPress={() => setTitle(item)} style={styles.chip}><Text style={styles.chipText}>{item}</Text></Pressable>)}</View><Text style={styles.diseasePrompt}>Bạn có bệnh lý cần lưu ý không?</Text><Text style={styles.diseaseHint}>Chọn đúng bệnh lý để hệ thống đánh giá có cần bác sĩ kiểm tra.</Text><View style={styles.diseaseChoices}>{diseases.map((disease) => { const selected = diseaseCodes.includes(disease.code); return <Pressable key={disease.code} onPress={() => setDiseaseCodes(selected ? diseaseCodes.filter((code) => code !== disease.code) : [...diseaseCodes, disease.code])} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} style={[styles.diseaseChoice, selected && styles.diseaseChoiceSelected]}><Text style={[styles.diseaseChoiceText, selected && styles.selectedPrimary]}>{disease.name}</Text><Text style={[styles.diseaseCode, selected && styles.selectedPrimary]}>{disease.code}</Text></Pressable>; })}</View></ScrollView>; }
function DurationStep({ weeks, setWeeks, startDate, setStartDate }: { weeks: number; setWeeks: (value: number) => void; startDate: string; setStartDate: (value: string) => void }) { const options = [{ value: 1, title: 'Kế hoạch tập trung cho tuần này' }]; const dates = Array.from({ length: 7 }, (_, index) => { const date = new Date(); date.setDate(date.getDate() + index); return date.toISOString().slice(0, 10); }); return <ScrollView contentContainerStyle={styles.stepBody}>{options.map((item) => <OptionCard key={item.value} selected={weeks === item.value} onPress={() => { setWeeks(item.value); hapticLocal(); }} title="1 tuần" detail={item.title} />)}<Text style={styles.diseasePrompt}>Bắt đầu từ ngày nào?</Text><View style={styles.dayGrid}>{dates.map((date) => <Pressable key={date} onPress={() => setStartDate(date)} style={[styles.dayChip, startDate === date && styles.dayChipSelected]}><Text style={[styles.dayChipName, startDate === date && styles.selectedText]}>{new Date(`${date}T00:00:00`).toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric', month: 'numeric' })}</Text>{startDate === date ? <Ionicons name="checkmark-circle" size={18} color={palette.textInverse} /> : null}</Pressable>)}</View></ScrollView>; }
function orderedWeekdays(startDate: string) { const start = new Date(`${startDate}T00:00:00`).getDay(); const mondayIndex = start === 0 ? 6 : start - 1; return Array.from({ length: 7 }, (_, offset) => { const index = (mondayIndex + offset) % 7; return { day: index + 1, label: weekdays[index] }; }); }
function DaysStep({ selected, onToggle, startDate }: { selected: number[]; onToggle: (day: number) => void; startDate: string }) { return <ScrollView contentContainerStyle={styles.stepBody}><View style={styles.dayGrid}>{orderedWeekdays(startDate).map(({ day, label }) => <Pressable key={day} onPress={() => onToggle(day)} accessibilityRole="checkbox" accessibilityState={{ checked: selected.includes(day) }} style={[styles.dayChip, selected.includes(day) && styles.dayChipSelected]}><Text style={[styles.dayChipName, selected.includes(day) && styles.selectedText]}>{label}</Text>{selected.includes(day) ? <Ionicons name="checkmark-circle" size={18} color={palette.textInverse} /> : null}</Pressable>)}</View></ScrollView>; }
function ScheduleStep({ selectedDays, activeDay, setActiveDay, slots, slotsForDay, addSlot, updateSlot, removeSlot, copyDayToAll, error, startDate, onNext }: { selectedDays: number[]; activeDay: number; setActiveDay: (day: number) => void; slots: RoadmapSlotRequest[]; slotsForDay: RoadmapSlotRequest[]; addSlot: (day: number, period: SessionPeriod) => void; updateSlot: (index: number, changes: Partial<RoadmapSlotRequest>) => void; removeSlot: (index: number) => void; copyDayToAll: () => void; error: string; startDate: string; onNext: () => void }) { const labels = orderedWeekdays(startDate); return <ScrollView contentContainerStyle={styles.stepBody}><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>{selectedDays.map((day) => <Pressable key={day} onPress={() => setActiveDay(day)} style={[styles.dayTab, activeDay === day && styles.dayTabSelected]}><Text style={[styles.dayTabText, activeDay === day && styles.selectedText]}>{labels.find((item) => item.day === day)?.label}</Text>{slots.some((slot) => slot.dayOfWeek === day) ? <Ionicons name="checkmark" size={13} color={activeDay === day ? palette.textInverse : palette.primary} /> : null}</Pressable>)}</ScrollView><View style={styles.scheduleSummary}><Text style={styles.summaryStrong}>{weeklyMinutes(slots)} phút/tuần</Text><Text style={styles.summaryMuted}>{slots.length} khung đã tạo</Text></View>{periods.map((period) => <PeriodEditor key={period.key} period={period} day={activeDay} slots={slots} addSlot={addSlot} updateSlot={updateSlot} removeSlot={removeSlot} />)}{error ? <Text style={styles.error}>{error}</Text> : null}<Pressable onPress={copyDayToAll} accessibilityRole="button" style={styles.copyButton}><Ionicons name="copy-outline" size={17} color={palette.primary} /><Text style={styles.copyText}>Dùng lịch này cho tất cả ngày đã chọn</Text></Pressable></ScrollView>; }
function PeriodEditor({ period, day, slots, addSlot, updateSlot, removeSlot }: { period: { key: SessionPeriod; label: string; icon: 'sunny-outline' | 'partly-sunny-outline' | 'moon-outline' }; day: number; slots: RoadmapSlotRequest[]; addSlot: (day: number, period: SessionPeriod) => void; updateSlot: (index: number, changes: Partial<RoadmapSlotRequest>) => void; removeSlot: (index: number) => void }) { const entries = slots.map((slot, index) => ({ slot, index })).filter(({ slot }) => slot.dayOfWeek === day && slot.sessionPeriod === period.key); return <View style={styles.periodBlock}><View style={styles.periodHeader}><View style={styles.row}><Ionicons name={period.icon} size={17} color={palette.primary} /><Text style={styles.periodTitle}>{period.label}</Text></View><Pressable onPress={() => addSlot(day, period.key)} disabled={entries.length >= 4} style={styles.addSlot}><Text style={styles.addSlotText}>+ Thêm khung</Text></Pressable></View>{entries.map(({ slot, index }) => <View key={`${period.key}-${index}`} style={styles.slotCard}><View style={styles.timeRow}><TextInput value={slot.startTime} onChangeText={(value) => updateSlot(index, { startTime: value })} maxLength={5} keyboardType="numbers-and-punctuation" style={styles.timeInput} /><Text style={styles.toText}>-</Text><TextInput value={slot.endTime} onChangeText={(value) => updateSlot(index, { endTime: value })} maxLength={5} keyboardType="numbers-and-punctuation" style={styles.timeInput} /><Pressable onPress={() => removeSlot(index)} accessibilityRole="button" accessibilityLabel="Xóa khung giờ" style={styles.removeSlot}><Ionicons name="trash-outline" size={17} color={palette.danger} /></Pressable></View><View style={styles.activityList}>{activityTypes.map((activity) => <Pressable key={activity.key} onPress={() => updateSlot(index, { activityType: activity.key as PlannedActivityType })} accessibilityRole="radio" accessibilityState={{ selected: slot.activityType === activity.key }} style={[styles.activityChip, slot.activityType === activity.key && styles.activityChipSelected]}><Text style={[styles.activityText, slot.activityType === activity.key && styles.selectedPrimary]}>{activity.label}</Text></Pressable>)}</View><Text style={styles.activityHint}>Chọn nội dung buổi tập</Text><View style={styles.activityPresets}>{activityPresets.map((preset) => <Pressable key={preset} onPress={() => updateSlot(index, { activity: preset })} accessibilityRole="button" style={[styles.activityPreset, slot.activity === preset && styles.activityPresetSelected]}><Text style={[styles.activityPresetText, slot.activity === preset && styles.selectedPrimary]}>{preset}</Text></Pressable>)}</View><TextInput value={slot.activity} onChangeText={(value) => updateSlot(index, { activity: value })} placeholder="Hoặc nhập nội dung khác" placeholderTextColor={palette.textMuted} style={styles.activityInput} /><Text style={styles.durationText}>{Math.max(0, (timeMinutes(slot.endTime) ?? 0) - (timeMinutes(slot.startTime) ?? 0))} phút</Text></View>)}</View>; }
function ReviewStep({ title, weeks, slots, onEdit, onGenerate }: { title: string; weeks: number; slots: RoadmapSlotRequest[]; onEdit: (step: Step) => void; onGenerate: () => void }) { return <ScrollView contentContainerStyle={styles.stepBody}><View style={styles.reviewHero}><Ionicons name="checkmark-done-circle-outline" size={32} color={palette.primary} /><Text style={styles.reviewName}>{title}</Text><Text style={styles.summaryMuted}>{weeks} tuần · {slots.length} khung/tuần · {weeklyMinutes(slots)} phút/tuần</Text></View>{weekdays.map((day, index) => { const daySlots = slots.filter((slot) => slot.dayOfWeek === index + 1); return <View key={day} style={styles.reviewRow}><View style={styles.reviewRowText}><Text style={styles.reviewDay}>{day}</Text><Text style={styles.summaryMuted}>{daySlots.length ? daySlots.map((slot) => `${slot.startTime}-${slot.endTime}`).join(' · ') : 'Ngày nghỉ'}</Text></View></View>; })}<Pressable onPress={() => onEdit(4)} style={styles.editButton}><Ionicons name="create-outline" size={16} color={palette.primary} /><Text style={styles.copyText}>Sửa lịch</Text></Pressable><AppButton label="Tạo 3 phương án AI" onPress={onGenerate} /></ScrollView>; }
function PreviewStep({ roadmap, selected, setSelected, weeks, slots, page, setPage, onRetry, onConsent, consenting, onActivate, onClose, onBack }: { onConsent: () => void; consenting: boolean; onClose: () => void; onBack: () => void; roadmap: ReturnType<typeof useRoadmap>; selected: number | null; setSelected: (value: number) => void; weeks: number; slots: RoadmapSlotRequest[]; page: number; setPage: (value: number) => void; onRetry: () => void; onActivate: () => void }) {
  const [progress, setProgress] = useState(8);
  useEffect(() => {
    if (roadmap.status !== 'loading') {
      // Reset the visual progress before the next generation attempt.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProgress(0);
      return undefined;
    }
    // Start each generation at a visible, determinate baseline.
    setProgress(8);
    const timer = setInterval(() => setProgress((current) => Math.min(current + (current < 55 ? 8 : 3), 92)), 850);
    return () => clearInterval(timer);
  }, [roadmap.status]);
  if (roadmap.status === 'loading') return <GeneratingRoadmapState progress={progress} />;
  if (roadmap.status === 'error') return <View style={styles.emptyState}><Text style={styles.error}>{roadmap.message}</Text>{needsConsent(roadmap.message) ? <AppButton label={consenting ? 'Đang lưu…' : 'Đồng ý sử dụng dữ liệu hồ sơ'} disabled={consenting} onPress={onConsent} /> : null}{roadmap.canRetry ? <AppButton label="Thử lại" onPress={onRetry} /> : null}<AppButton label="Quay lại bước trước" variant="secondary" onPress={onBack} /></View>;
  if (roadmap.routingDecision && roadmap.routingDecision !== 'AUTO_ROADMAP') return <DoctorRoutingState decision={roadmap.routingDecision} message={roadmap.routingMessage} onClose={onClose} />;
  return <View style={styles.previewWrap}>
    <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={styles.previewPager} onMomentumScrollEnd={(event) => setPage(Math.round(event.nativeEvent.contentOffset.x / Math.max(event.nativeEvent.layoutMeasurement.width, 1)))}>
      {roadmap.options.map((plan, index) => <ScrollView key={`${index}-${plan.title}`} style={styles.previewPage} contentContainerStyle={styles.previewPageContent} nestedScrollEnabled>
        <View style={styles.previewTopline}><Text style={styles.variant}>{variants[index] ?? `Phương án ${index + 1}`}</Text><Text style={styles.source}>{plan.source === 'fallback' ? 'Bản dự phòng' : 'Đề xuất AI'}</Text></View>
        <Text style={styles.previewTitle}>{plan.title}</Text>
        <Text style={styles.previewMeta}>{weeks} tuần · {slots.length} khung/tuần</Text>
        <View style={styles.previewSection}><Text style={styles.previewLabel}>Tổng quan</Text><Text style={styles.previewOverview}>{plan.overview}</Text></View>
        <View style={styles.previewSection}><Text style={styles.previewLabel}>Mục tiêu từng tuần</Text>{plan.weeklyPlan.map((week, weekIndex) => <View key={weekIndex} style={styles.weekRow}><Text style={styles.weekBadge}>{weekIndex + 1}</Text><Text style={styles.weekPlan}>{week}</Text></View>)}</View>
        <View style={styles.safetyBox}><Text style={styles.previewLabel}>Lưu ý an toàn</Text>{plan.safetyNotes.map((note, noteIndex) => <Text key={noteIndex} style={styles.safety}>• {note}</Text>)}</View>
        <Pressable onPress={() => setSelected(index)} accessibilityRole="radio" accessibilityState={{ selected: selected === index }} style={[styles.selectPlan, selected === index && styles.selectPlanSelected]}><Text style={[styles.selectPlanText, selected === index && styles.selectedText]}>{selected === index ? 'Đã chọn phương án này' : 'Chọn phương án này'}</Text></Pressable>
      </ScrollView>)}
    </ScrollView>
    <View style={styles.pagerDots}>{roadmap.options.map((_, index) => <View key={index} style={[styles.pagerDot, page === index && styles.pagerDotActive]} />)}</View>
    {selected !== null ? <AppButton label="Xác nhận phương án này" onPress={onActivate} /> : null}
  </View>;
}
function DoctorRoutingState({ decision, message, onClose }: { decision: string; message: string; onClose: () => void }) {
  const urgent = decision === 'URGENT_MEDICAL_ATTENTION';
  const needsInfo = decision === 'NEED_MORE_INFORMATION';
  return <View style={[styles.routingState, urgent && styles.routingUrgent]}>
    <View style={[styles.routingIcon, urgent && styles.routingIconUrgent]}><Ionicons name={urgent ? 'medical-outline' : 'person-outline'} size={31} color={urgent ? palette.danger : palette.primary} /></View>
    <Text style={styles.routingTitle}>{urgent ? 'Cần hỗ trợ y tế ngay' : needsInfo ? 'Cần bổ sung thông tin' : 'Đã chuyển bác sĩ kiểm tra'}</Text>
    <Text style={styles.routingMessage}>{message || 'Hệ thống chưa đủ cơ sở để tạo lộ trình an toàn tự động.'}</Text>
    <Text style={styles.routingHint}>{urgent ? 'Vui lòng liên hệ cơ sở y tế hoặc cấp cứu gần nhất. Không chờ bác sĩ online.' : needsInfo ? 'Hãy cập nhật thêm thông tin sức khỏe rồi thử tạo lại.' : 'Lộ trình sẽ chỉ được áp dụng sau khi bác sĩ hoàn tất đánh giá.'}</Text>
    <View style={{ marginTop: 16, alignSelf: 'stretch' }}><AppButton label="Về màn lộ trình" onPress={onClose} /></View>
  </View>;
}
function GeneratingRoadmapState({ progress }: { progress: number }) {
  const message = progress < 30 ? 'Đang chuẩn bị dữ liệu của bạn...' : progress < 65 ? 'Đang phân tích mục tiêu và lịch tập...' : 'Đang hoàn thiện các phương án phù hợp...';
  return <View style={styles.generatingState} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: progress }} accessibilityLabel="Đang tạo phương án lộ trình">
    <View style={styles.generatingIcon}><Ionicons name="sparkles-outline" size={30} color={palette.primary} /></View>
    <Text style={styles.generatingTitle}>Đang tạo phương án</Text>
    <Text style={styles.generatingMessage}>{message}</Text>
    <View style={styles.generatingTrack}><View style={[styles.generatingValue, { width: `${progress}%` }]} /></View>
    <View style={styles.generatingMeta}><Text style={styles.generatingPercent}>{progress}%</Text><Text style={styles.generatingHint}>Có thể mất một chút thời gian</Text></View>
  </View>;
}
function OptionCard({ selected, onPress, title, detail }: { selected: boolean; onPress: () => void; title: string; detail: string }) { return <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected }} style={[styles.optionCard, selected && styles.optionCardSelected]}><View style={styles.optionCopy}><Text style={styles.optionTitle}>{title}</Text><Text style={styles.optionDetail}>{detail}</Text></View><Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={selected ? palette.primary : palette.border} /></Pressable>; }
function hapticLocal() { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); }

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingTop: 14, paddingHorizontal: spacing.lg }, navButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  progressTrack: { flex: 1, height: 4, overflow: 'hidden', borderRadius: 2, backgroundColor: palette.border }, progressValue: { height: '100%', borderRadius: 2, backgroundColor: palette.primary },
  contentHeader: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.md }, stepCount: { color: palette.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1 }, heading: { marginTop: 8, color: palette.text, fontSize: 30, lineHeight: 36, fontWeight: '800' }, subheading: { marginTop: 8, color: palette.textMuted, fontSize: 14, lineHeight: 20 }, animatedContent: { flex: 1 }, stepBody: { flexGrow: 1, gap: 12, paddingHorizontal: spacing.xl, paddingBottom: 18 }, bottomBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: 16 }, hint: { flex: 1, color: palette.textMuted, fontSize: 11, lineHeight: 16 }, nextFab: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 28, backgroundColor: palette.primary }, nextFabDisabled: { backgroundColor: palette.border },
  titleInput: { minHeight: 64, paddingHorizontal: 16, borderWidth: 1, borderColor: palette.border, borderRadius: radius.md, backgroundColor: palette.surface, color: palette.text, fontSize: 20, fontWeight: '700' }, counterRow: { flexDirection: 'row', justifyContent: 'space-between' }, inputHint: { color: palette.textMuted, fontSize: 12 }, counter: { color: palette.textMuted, fontSize: 12 }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, chip: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: palette.primarySoft }, chipText: { color: palette.primaryDark, fontSize: 12, fontWeight: '700' },
  diseasePrompt: { marginTop: 12, color: palette.text, fontSize: 14, fontWeight: '800' }, diseaseHint: { color: palette.textMuted, fontSize: 11, lineHeight: 16 }, diseaseChoices: { gap: 7 }, diseaseChoice: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: palette.border, borderRadius: radius.sm, backgroundColor: palette.surface }, diseaseChoiceSelected: { borderColor: palette.primary, backgroundColor: palette.primarySoft }, diseaseChoiceText: { flex: 1, color: palette.text, fontSize: 12, fontWeight: '700' }, diseaseCode: { color: palette.textMuted, fontSize: 10, fontWeight: '800' },
  optionCard: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderWidth: 1, borderColor: palette.border, borderRadius: radius.md, backgroundColor: palette.surface }, optionCardSelected: { borderColor: palette.primary, backgroundColor: palette.primarySoft }, optionCopy: { flex: 1 }, optionTitle: { color: palette.text, fontSize: 18, fontWeight: '800' }, optionDetail: { marginTop: 4, color: palette.textMuted, fontSize: 13 },
  dayGrid: { gap: 8 }, dayChip: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: palette.border, borderRadius: radius.md, backgroundColor: palette.surface }, dayChipSelected: { borderColor: palette.primary, backgroundColor: palette.primary }, dayChipName: { flex: 1, color: palette.text, fontSize: 15, fontWeight: '700' }, selectedText: { color: palette.textInverse },
  tabs: { gap: 8, paddingBottom: 4 }, dayTab: { minWidth: 64, minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, paddingHorizontal: 10, borderRadius: radius.pill, backgroundColor: palette.surfaceRaised }, dayTabSelected: { backgroundColor: palette.primary }, dayTabText: { color: palette.textMuted, fontSize: 12, fontWeight: '800' }, scheduleSummary: { padding: 14, borderRadius: radius.md, backgroundColor: palette.primarySoft }, summaryStrong: { color: palette.primaryDark, fontSize: 18, fontWeight: '800' }, summaryMuted: { marginTop: 3, color: palette.textMuted, fontSize: 12, lineHeight: 18 }, periodBlock: { paddingTop: 14, borderTopWidth: 1, borderColor: palette.border }, periodHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, row: { flexDirection: 'row', alignItems: 'center', gap: 8 }, periodTitle: { color: palette.text, fontSize: 15, fontWeight: '800' }, addSlot: { minHeight: 34, justifyContent: 'center', paddingHorizontal: 12, borderRadius: radius.sm, backgroundColor: palette.primarySoft }, addSlotText: { color: palette.primary, fontSize: 12, fontWeight: '800' }, slotCard: { marginTop: 9, padding: 11, borderRadius: radius.sm, backgroundColor: palette.surfaceRaised }, timeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 }, timeInput: { flex: 1, minHeight: 42, borderRadius: 8, backgroundColor: palette.surface, color: palette.text, textAlign: 'center', fontWeight: '700' }, toText: { color: palette.textMuted }, removeSlot: { width: 36, height: 42, alignItems: 'center', justifyContent: 'center' }, activityList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }, activityChip: { paddingVertical: 7, paddingHorizontal: 9, borderWidth: 1, borderColor: palette.border, borderRadius: radius.sm, backgroundColor: palette.surface }, activityChipSelected: { borderColor: palette.primary, backgroundColor: palette.primarySoft }, activityText: { color: palette.textMuted, fontSize: 10, fontWeight: '700' }, selectedPrimary: { color: palette.primary }, activityInput: { minHeight: 40, marginTop: 9, paddingHorizontal: 10, borderRadius: 8, backgroundColor: palette.surface, color: palette.text, fontSize: 12 }, durationText: { marginTop: 5, color: palette.textMuted, fontSize: 10 }, error: { color: palette.danger, fontSize: 12, lineHeight: 18 }, copyButton: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1, borderColor: palette.primary, borderRadius: radius.sm, backgroundColor: palette.primarySoft }, copyText: { color: palette.primary, fontSize: 12, fontWeight: '800' },
  reviewHero: { alignItems: 'center', padding: 18, borderRadius: radius.md, backgroundColor: palette.primarySoft }, reviewName: { marginTop: 7, color: palette.primaryDark, fontSize: 18, fontWeight: '800' }, reviewRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: palette.border }, reviewRowText: { flex: 1 }, reviewDay: { color: palette.text, fontWeight: '800' }, editButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: radius.sm, backgroundColor: palette.primarySoft },
  previewWrap: { flex: 1, paddingBottom: spacing.lg }, previewPager: { gap: 12, paddingHorizontal: spacing.xl, paddingBottom: 16 }, previewPage: { width: 320, maxHeight: 430, borderWidth: 1, borderColor: palette.border, borderRadius: radius.lg, backgroundColor: palette.surface }, previewPageContent: { padding: 18 }, previewTopline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, variant: { color: palette.primary, fontSize: 12, fontWeight: '800' }, previewTitle: { marginTop: 10, color: palette.text, fontSize: 20, lineHeight: 26, fontWeight: '800' }, previewLabel: { color: palette.text, fontSize: 12, fontWeight: '800' }, previewSection: { marginTop: 16 }, previewOverview: { marginTop: 6, color: palette.textMuted, fontSize: 13, lineHeight: 20 }, previewMeta: { marginTop: 8, color: palette.textMuted, fontSize: 12 }, weekRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 9 }, weekBadge: { width: 22, height: 22, paddingTop: 3, borderRadius: 11, backgroundColor: palette.primarySoft, color: palette.primary, fontSize: 11, fontWeight: '800', textAlign: 'center' }, weekPlan: { flex: 1, color: palette.text, fontSize: 12, lineHeight: 18 }, safetyBox: { marginTop: 16, padding: 11, borderRadius: radius.sm, backgroundColor: '#FFF8E8' }, safety: { marginTop: 6, color: '#9A6500', fontSize: 12, lineHeight: 18 }, source: { color: palette.textMuted, fontSize: 11 }, selectPlan: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16, borderRadius: radius.sm, backgroundColor: palette.primarySoft }, selectPlanSelected: { backgroundColor: palette.primary }, selectPlanText: { color: palette.primary, fontWeight: '800' }, pagerDots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: spacing.md }, pagerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: palette.border }, pagerDotActive: { width: 18, backgroundColor: palette.primary }, emptyState: { paddingHorizontal: spacing.xl, gap: 14 }, done: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl, gap: 14 }, doneIcon: { width: 84, height: 84, alignItems: 'center', justifyContent: 'center', borderRadius: 42, backgroundColor: palette.success }, doneTitle: { color: palette.text, fontSize: 28, fontWeight: '800', textAlign: 'center' }, doneDetail: { color: palette.textMuted, fontSize: 15, textAlign: 'center' },
  generatingState: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.xl, gap: 10 }, generatingIcon: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', borderRadius: 32, backgroundColor: palette.primarySoft }, generatingTitle: { marginTop: 8, color: palette.text, fontSize: 21, fontWeight: '800', textAlign: 'center' }, generatingMessage: { color: palette.textMuted, fontSize: 13, lineHeight: 19, textAlign: 'center' }, generatingTrack: { height: 10, marginTop: 14, overflow: 'hidden', borderRadius: 5, backgroundColor: palette.border }, generatingValue: { height: '100%', borderRadius: 5, backgroundColor: palette.primary }, generatingMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }, generatingPercent: { color: palette.primary, fontSize: 12, fontWeight: '800' }, generatingHint: { color: palette.textMuted, fontSize: 11 },
  routingState: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.xl, gap: 11 }, routingUrgent: { backgroundColor: palette.dangerLight }, routingIcon: { width: 66, height: 66, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', borderRadius: 33, backgroundColor: palette.primarySoft }, routingIconUrgent: { backgroundColor: '#FFE0E6' }, routingTitle: { color: palette.text, fontSize: 21, fontWeight: '800', textAlign: 'center' }, routingMessage: { color: palette.text, fontSize: 14, lineHeight: 21, textAlign: 'center' }, routingHint: { color: palette.textMuted, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  activityHint: { marginTop: 11, color: palette.textMuted, fontSize: 11, fontWeight: '700' },
  activityPresets: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 7 },
  activityPreset: { paddingVertical: 7, paddingHorizontal: 9, borderWidth: 1, borderColor: palette.border, borderRadius: radius.sm, backgroundColor: palette.surface },
  activityPresetSelected: { borderColor: palette.primary, backgroundColor: palette.primarySoft },
  activityPresetText: { color: palette.textMuted, fontSize: 10, fontWeight: '700' },
});
