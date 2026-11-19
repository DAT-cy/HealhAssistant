import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { ApiError } from '@/api/client';
import { profileService, type ProfileResponse } from '@/api/services/profile.service';
import { diseaseService } from '@/api/services/disease.service';
import type { Disease } from '@/api/services/doctor.service';
import AppButton from '@/components/ui/AppButton';
import { Pressable } from '@/components/ui/Pressable';
import Screen from '@/components/ui/Screen';
import { palette, spacing } from '@/theme/tokens';

type Values = { heightCm: string; weightKg: string; diseaseCodes: string; medicalHistory: string; allergies: string; painAreas: string; restrictions: string; healthMetrics: string };
const emptyValues: Values = { heightCm: '', weightKg: '', diseaseCodes: '', medicalHistory: '', allergies: '', painAreas: '', restrictions: '', healthMetrics: '' };

function Field({ label, value, onChangeText, placeholder, multiline = false, keyboardType = 'default' }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; multiline?: boolean; keyboardType?: 'default' | 'decimal-pad' }) {
  return <View><Text style={styles.label}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={palette.textMuted} multiline={multiline} keyboardType={keyboardType} accessibilityLabel={label} style={[styles.input, multiline && styles.multiline]} /></View>;
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{hint ? <Text style={styles.hint}>{hint}</Text> : null}{children}</View>;
}

export default function HealthRecordPage() {
  const queryClient = useQueryClient();
  const profile = useQuery({ queryKey: ['profile', 'health-record'], queryFn: profileService.getMine });
  const [values, setValues] = useState<Values>(emptyValues);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [consent, setConsent] = useState(false);
  const [messageKind, setMessageKind] = useState<'success' | 'error'>('success');
  const [diseasePickerOpen, setDiseasePickerOpen] = useState(false);
  const [diseaseSearch, setDiseaseSearch] = useState('');
  const diseaseQuery = useQuery({ queryKey: ['health', 'diseases'], queryFn: () => diseaseService.list() });

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const data = profile.data;
    if (!data) return;
    setValues({
      heightCm: data.heightCm?.toString() || '', weightKg: data.weightKg?.toString() || '',
      diseaseCodes: data.diseaseCodes || '', medicalHistory: data.medicalHistory || '', allergies: data.allergies || '',
      painAreas: data.painAreas || '', restrictions: data.restrictions || '', healthMetrics: data.healthMetrics || '',
    });
    setConsent(!!data.consent);
  }, [profile.data]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const update = (key: keyof Values, value: string) => setValues((current) => ({ ...current, [key]: value }));
  const heightNumber = Number(values.heightCm.replace(',', '.'));
  const weightNumber = Number(values.weightKg.replace(',', '.'));
  const bmi = heightNumber > 0 && weightNumber > 0 ? weightNumber / ((heightNumber / 100) ** 2) : null;
  const completion = Object.values(values).filter((value) => value.trim().length > 0).length;
  const completionPercent = Math.round((completion / Object.keys(values).length) * 100);
  const bmiLabel = bmi === null ? 'Chưa đủ dữ liệu' : bmi < 18.5 ? 'Thiếu cân' : bmi < 25 ? 'Mức khỏe mạnh' : bmi < 30 ? 'Thừa cân' : 'Cần theo dõi';
  const selectedDiseases = values.diseaseCodes.split(',').map((item) => item.trim()).filter(Boolean);
  const toggleDisease = (code: string) => update('diseaseCodes', selectedDiseases.includes(code) ? selectedDiseases.filter((item) => item !== code).join(', ') : [...selectedDiseases, code].join(', '));
  const filteredDiseases = (diseaseQuery.data || []).filter((disease) => `${disease.name} ${disease.code}`.toLowerCase().includes(diseaseSearch.trim().toLowerCase()));
  const addCustomDisease = () => { const value = diseaseSearch.trim(); if (!value) return; toggleDisease(`CUSTOM:${value}`); setDiseaseSearch(''); };
  const save = async () => {
    const height = values.heightCm.trim() ? Number(values.heightCm.replace(',', '.')) : undefined;
    const weight = values.weightKg.trim() ? Number(values.weightKg.replace(',', '.')) : undefined;
    if (height !== undefined && (!Number.isFinite(height) || height <= 0)) { setMessageKind('error'); setMessage('Chiều cao phải là số lớn hơn 0.'); return; }
    if (weight !== undefined && (!Number.isFinite(weight) || weight <= 0)) { setMessageKind('error'); setMessage('Cân nặng phải là số lớn hơn 0.'); return; }
    setSaving(true); setMessage('');
    try {
      const current = profile.data;
      const saved = await profileService.save({
        goal: current?.goal, activityLevel: current?.activityLevel, gender: current?.gender, age: current?.age,
        heightCm: height, weightKg: weight, restrictions: values.restrictions.trim() || undefined, painAreas: values.painAreas.trim() || undefined,
        consent, diseaseCodes: values.diseaseCodes.trim(), medicalHistory: values.medicalHistory.trim(),
        allergies: values.allergies.trim(), healthMetrics: values.healthMetrics.trim(),
      });
      queryClient.setQueryData(['profile', 'health-record'], saved);
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
      setMessageKind('success'); setMessage('Đã lưu hồ sơ sức khỏe.');
    } catch (error) {
      setMessageKind('error'); setMessage(error instanceof ApiError ? error.message : 'Không thể lưu hồ sơ sức khỏe.');
    } finally { setSaving(false); }
  };

  const data: ProfileResponse | undefined = profile.data;
  return <Screen title="Hồ sơ sức khỏe" subtitle="Nhập và cập nhật trực tiếp các thông tin sức khỏe của bạn." showBack scroll={false}>
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView style={styles.flex} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
      <View style={styles.notice}><Ionicons name="shield-checkmark-outline" size={19} color={palette.primary} /><Text style={styles.noticeText}>Các trường có thể để trống. Đây là dữ liệu bạn tự khai báo, không phải chẩn đoán y khoa.</Text></View>
      <View style={styles.overview}>
        <View style={styles.overviewHeader}><View><Text style={styles.overline}>TỔNG QUAN HỒ SƠ</Text><Text style={styles.overviewTitle}>{completionPercent}% hoàn thiện</Text></View><View style={styles.progressCircle}><Text style={styles.progressText}>{completionPercent}%</Text></View></View>
        <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.max(completionPercent, 3)}%` }]} /></View>
        <View style={styles.metricsRow}>
          <View style={styles.metric}><Ionicons name="resize-outline" size={18} color={palette.primary} /><Text style={styles.metricValue}>{values.heightCm || '--'}<Text style={styles.metricUnit}> cm</Text></Text><Text style={styles.metricLabel}>Chiều cao</Text></View>
          <View style={styles.metricDivider} />
          <View style={styles.metric}><Ionicons name="scale-outline" size={18} color={palette.accent} /><Text style={styles.metricValue}>{values.weightKg || '--'}<Text style={styles.metricUnit}> kg</Text></Text><Text style={styles.metricLabel}>Cân nặng</Text></View>
          <View style={styles.metricDivider} />
          <View style={styles.metric}><Ionicons name="pulse-outline" size={18} color={palette.success} /><Text style={styles.metricValue}>{bmi ? bmi.toFixed(1) : '--'}</Text><Text style={styles.metricLabel}>{bmiLabel}</Text></View>
        </View>
      </View>
      {profile.isPending ? <View style={styles.status}><ActivityIndicator size="small" color={palette.primary} /><Text style={styles.statusText}>Đang tải dữ liệu đã lưu...</Text></View> : data ? <View style={styles.status}><Ionicons name="checkmark-circle-outline" size={17} color={palette.success} /><Text style={styles.statusText}>Đã có hồ sơ. Bạn đang chỉnh sửa dữ liệu hiện tại.</Text></View> : <View style={styles.status}><Ionicons name="create-outline" size={17} color={palette.primary} /><Text style={styles.statusText}>Chưa có dữ liệu. Nhập thông tin bên dưới để tạo hồ sơ.</Text></View>}
      <Section title="Chỉ số cơ thể" hint="Cập nhật định kỳ để trợ lý đưa ra gợi ý phù hợp hơn."><View style={styles.inlineFields}><View style={styles.inlineField}><Field label="Chiều cao (cm)" value={values.heightCm} onChangeText={(value) => update('heightCm', value)} placeholder="170" keyboardType="decimal-pad" /></View><View style={styles.inlineField}><Field label="Cân nặng (kg)" value={values.weightKg} onChangeText={(value) => update('weightKg', value)} placeholder="65" keyboardType="decimal-pad" /></View></View></Section>
      <View style={styles.consentRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.consentTitle}>Đồng ý sử dụng dữ liệu hồ sơ</Text>
          <Text style={styles.consentHint}>Cho phép AI và bác sĩ dùng hồ sơ này để lập và duyệt lộ trình. Bắt buộc khi tạo lộ trình.</Text>
        </View>
        <Switch testID="consent-switch" value={consent} onValueChange={setConsent} trackColor={{ true: palette.primary, false: palette.border }} accessibilityLabel="Đồng ý sử dụng dữ liệu hồ sơ" />
      </View>
      <Section title="Bệnh lý" hint="Chọn các bệnh đã được chẩn đoán hoặc đang theo dõi. Bạn có thể thêm bệnh chưa có trong danh mục.">
        {selectedDiseases.length ? <View style={styles.chosenChips}>{selectedDiseases.map((code) => <View key={code} style={styles.chosenChip}><Text style={styles.chosenChipText}>{diseaseQuery.data?.find((item) => item.code === code)?.name || code.replace('CUSTOM:', '')}</Text><Pressable onPress={() => toggleDisease(code)} accessibilityLabel="Xóa bệnh lý"><Ionicons name="close-circle" size={17} color={palette.primary} /></Pressable></View>)}</View> : null}
        <View style={styles.diseasePicker}><Ionicons name="search-outline" size={18} color={palette.textMuted} /><TextInput value={diseaseSearch} onFocus={() => setDiseasePickerOpen(true)} onChangeText={(value) => { setDiseaseSearch(value); setDiseasePickerOpen(true); }} placeholder="Chọn hoặc tìm bệnh lý" placeholderTextColor={palette.textMuted} style={styles.diseaseSearchInput} /><Pressable onPress={() => setDiseasePickerOpen((open) => !open)} accessibilityLabel="Mở danh sách bệnh lý"><Ionicons name={diseasePickerOpen ? 'chevron-up' : 'chevron-down'} size={19} color={palette.textMuted} /></Pressable></View>
        {diseasePickerOpen ? <View style={styles.diseaseList}>{filteredDiseases.map((disease: Disease) => { const selected = selectedDiseases.includes(disease.code); return <Pressable key={disease.code} onPress={() => toggleDisease(disease.code)} style={[styles.diseaseOption, selected && styles.diseaseOptionSelected]} accessibilityRole="checkbox" accessibilityState={{ checked: selected }}><View style={styles.diseaseOptionCopy}><Text style={styles.diseaseName}>{disease.name}</Text><Text style={styles.diseaseMeta}>{disease.code}{disease.doctorRequired ? ' · cần bác sĩ theo dõi' : ''}</Text></View>{selected ? <Ionicons name="checkmark-circle" size={21} color={palette.primary} /> : <Ionicons name="ellipse-outline" size={21} color={palette.border} />}</Pressable>; })}{diseaseSearch.trim() && filteredDiseases.length === 0 ? <Pressable onPress={addCustomDisease} style={styles.addCustomOption}><Ionicons name="add-circle-outline" size={20} color={palette.primary} /><Text style={styles.addCustomText}>Thêm “{diseaseSearch.trim()}”</Text></Pressable> : null}</View> : null}
      </Section>
      <Section title="Tiền sử bệnh"><Field label="Tiền sử bệnh" value={values.medicalHistory} onChangeText={(value) => update('medicalHistory', value)} placeholder="Bệnh đã từng mắc, điều trị hoặc theo dõi" multiline /></Section>
      <Section title="Dị ứng"><Field label="Dị ứng thuốc hoặc thực phẩm" value={values.allergies} onChangeText={(value) => update('allergies', value)} placeholder="Ví dụ: Dị ứng penicillin, hải sản..." multiline /></Section>
      <Section title="Chấn thương"><Field label="Chấn thương hoặc vùng đau" value={values.painAreas} onChangeText={(value) => update('painAreas', value)} placeholder="Mô tả vị trí, thời điểm và tình trạng hiện tại" multiline /></Section>
      <Section title="Hạn chế sức khỏe"><Field label="Hạn chế vận động hoặc hoạt động cần tránh" value={values.restrictions} onChangeText={(value) => update('restrictions', value)} placeholder="Ví dụ: Không chạy do đau đầu gối..." multiline /></Section>
      <Section title="Các chỉ số sức khỏe có sẵn" hint="Chỉ nhập số đo bạn thực sự có, kèm đơn vị và thời điểm nếu biết."><Field label="Chỉ số sức khỏe" value={values.healthMetrics} onChangeText={(value) => update('healthMetrics', value)} placeholder="Ví dụ: Huyết áp 120/80 mmHg, nhịp tim 72 bpm, đo ngày..." multiline /></Section>
      {profile.isError && !(profile.error instanceof ApiError && profile.error.status === 404) ? <Text style={styles.error}>Không tải được dữ liệu cũ; bạn vẫn có thể nhập và lưu hồ sơ mới.</Text> : null}
      {message ? <Text accessibilityLiveRegion="polite" style={messageKind === 'success' ? styles.success : styles.error}>{message}</Text> : null}
      <AppButton label="Lưu hồ sơ sức khỏe" onPress={() => void save()} loading={saving} disabled={saving} />
    </ScrollView></KeyboardAvoidingView>
  </Screen>;
}

const styles = StyleSheet.create({
  consentRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface },
  consentTitle: { color: palette.text, fontSize: 14, fontWeight: '800' },
  consentHint: { marginTop: 3, color: palette.textMuted, fontSize: 12, lineHeight: 17 },
  flex: { flex: 1 }, body: { paddingBottom: spacing.xl, gap: 12 },
  notice: { flexDirection: 'row', gap: 8, padding: 12, borderRadius: 12, backgroundColor: palette.primarySoft }, noticeText: { flex: 1, color: palette.textMuted, fontSize: 11, lineHeight: 16 },
  overview: { padding: 16, borderRadius: 16, backgroundColor: palette.text }, overviewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, overline: { color: '#B8B9D5', fontSize: 10, fontWeight: '800', letterSpacing: 1 }, overviewTitle: { marginTop: 5, color: palette.textInverse, fontSize: 20, fontWeight: '800' }, progressCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: palette.accent }, progressText: { color: palette.textInverse, fontSize: 12, fontWeight: '800' }, progressTrack: { height: 6, marginTop: 14, overflow: 'hidden', borderRadius: 3, backgroundColor: '#3B3D61' }, progressFill: { height: '100%', borderRadius: 3, backgroundColor: palette.accent }, metricsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 18 }, metric: { flex: 1, gap: 3 }, metricDivider: { width: 1, height: 38, backgroundColor: '#45476C' }, metricValue: { color: palette.textInverse, fontSize: 17, fontWeight: '800' }, metricUnit: { color: '#B8B9D5', fontSize: 10, fontWeight: '600' }, metricLabel: { color: '#B8B9D5', fontSize: 10 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 2 }, statusText: { color: palette.textMuted, fontSize: 11 }, section: { gap: 10, padding: 15, borderRadius: 14, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border }, sectionTitle: { color: palette.text, fontSize: 16, fontWeight: '800' }, hint: { color: palette.textMuted, fontSize: 11, lineHeight: 16 }, inlineFields: { flexDirection: 'row', gap: 10 }, inlineField: { flex: 1 }, label: { marginBottom: 5, color: palette.textMuted, fontSize: 11, fontWeight: '700' }, input: { minHeight: 44, paddingHorizontal: 11, borderRadius: 9, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surfaceRaised, color: palette.text, fontSize: 13 }, multiline: { minHeight: 82, paddingTop: 11, textAlignVertical: 'top' }, error: { color: palette.danger, fontSize: 12, lineHeight: 18 }, success: { color: palette.success, fontSize: 12, fontWeight: '700' },
  searchBox: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 11, borderRadius: 9, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surfaceRaised }, searchInput: { flex: 1, color: palette.text, fontSize: 13 }, selectedChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, selectedChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 7, paddingHorizontal: 9, borderRadius: 999, backgroundColor: palette.primarySoft }, selectedChipText: { color: palette.primary, fontSize: 11, fontWeight: '700' }, emptySelection: { color: palette.textMuted, fontSize: 12 }, diseaseList: { gap: 7 }, diseaseOption: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 11, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface }, diseaseOptionSelected: { borderColor: palette.primary, backgroundColor: palette.primarySoft }, diseaseOptionCopy: { flex: 1 }, diseaseName: { color: palette.text, fontSize: 13, fontWeight: '700' }, diseaseMeta: { marginTop: 2, color: palette.textMuted, fontSize: 10 }, customRow: { flexDirection: 'row', gap: 8 }, customInput: { flex: 1, minHeight: 44, paddingHorizontal: 11, borderRadius: 9, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surfaceRaised, color: palette.text, fontSize: 12 }, addDiseaseButton: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: palette.primary },
  diseasePicker: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 11, borderRadius: 10, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surfaceRaised }, chosenChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, chosenChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 7, paddingLeft: 10, paddingRight: 7, borderRadius: 999, backgroundColor: palette.primarySoft }, chosenChipText: { color: palette.primary, fontSize: 11, fontWeight: '700' }, diseaseSearchInput: { flex: 1, minHeight: 42, color: palette.text, fontSize: 13 }, addCustomOption: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 11, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: palette.primary, backgroundColor: palette.primarySoft }, addCustomText: { color: palette.primary, fontSize: 12, fontWeight: '700' },
});
