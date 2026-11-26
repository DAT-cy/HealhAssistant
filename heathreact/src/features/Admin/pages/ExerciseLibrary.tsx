import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StatusBar, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { adminDiseaseService } from '@/api/services/admin.service';
import { doctorService } from '@/api/services/doctor.service';
import { exerciseAdminService, type ExerciseItem } from '@/api/services/exercise-admin.service';
import AppModal from '@/components/ui/AppModal';
import { Pressable } from '@/components/ui/Pressable';
import { navigationService } from '@/routes';
import { useUserStore } from '@/stores/user';
import { palette } from '@/theme/tokens';
import {
  DIFFICULTIES, difficultyLabel, emptyExerciseForm, formFromExercise, toExerciseInput, validateExerciseForm,
  type ExerciseFormState,
} from './exerciseForm';

const PRIMARY = palette.primary;
type Filter = 'ACTIVE' | 'INACTIVE' | 'ALL';

/** Thư viện bài tập: Admin và bác sĩ thêm / sửa bài tập, khai báo chống chỉ định theo bệnh. */
export default function ExerciseLibraryPage() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const role = useUserStore((state) => state.role);
  const username = useUserStore((state) => state.username);
  const logout = useUserStore((state) => state.logout);
  const isAdmin = role === 'ROLE_ADMIN';
  const isDoctor = role === 'ROLE_DOCTOR';
  const allowed = isAdmin || isDoctor;

  const exercises = useQuery({ queryKey: ['exercises', 'library'], queryFn: exerciseAdminService.list, enabled: allowed });
  const diseases = useQuery({
    queryKey: ['knowledge', 'disease-options', role],
    queryFn: async () => (isAdmin ? adminDiseaseService.list() : doctorService.diseases()),
    enabled: allowed,
  });
  const diseaseOptions = useMemo(() => (diseases.data ?? []).filter((item) => item.active), [diseases.data]);
  const diseaseName = (code: string) => diseaseOptions.find((item) => item.code === code)?.name ?? code;

  const [filter, setFilter] = useState<Filter>('ACTIVE');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<ExerciseItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<ExerciseFormState>(emptyExerciseForm);
  const [formError, setFormError] = useState<string | null>(null);

  const list = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (exercises.data ?? [])
      .filter((item) => (filter === 'ALL' ? true : filter === 'ACTIVE' ? item.active : !item.active))
      .filter((item) => !term || `${item.name} ${item.muscleGroup} ${item.code}`.toLowerCase().includes(term));
  }, [exercises.data, filter, search]);
  const activeCount = (exercises.data ?? []).filter((item) => item.active).length;
  const withContraindication = (exercises.data ?? []).filter((item) => item.contraindicatedDiseaseCodes?.length).length;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['exercises'] });
  const save = useMutation({
    mutationFn: async () => {
      const input = toExerciseInput(form);
      return editing ? exerciseAdminService.update(editing.id, input) : exerciseAdminService.create(input);
    },
    onSuccess: async () => { setFormOpen(false); await invalidate(); },
    onError: (error) => setFormError(error instanceof Error ? error.message : 'Không lưu được bài tập.'),
  });
  const toggleActive = useMutation({
    mutationFn: async (item: ExerciseItem) => (item.active
      ? exerciseAdminService.deactivate(item.id)
      : exerciseAdminService.update(item.id, { ...toExerciseInput(formFromExercise(item)), active: true })),
    onSuccess: invalidate,
    onError: (error) => Alert.alert('Không cập nhật được', error instanceof Error ? error.message : 'Thử lại sau.'),
  });

  const openCreate = () => { setEditing(null); setForm(emptyExerciseForm); setFormError(null); setFormOpen(true); };
  const openEdit = (item: ExerciseItem) => { setEditing(item); setForm(formFromExercise(item)); setFormError(null); setFormOpen(true); };
  const submit = () => {
    const error = validateExerciseForm(form);
    setFormError(error);
    if (!error) save.mutate();
  };
  const set = <K extends keyof ExerciseFormState>(key: K, value: ExerciseFormState[K]) => setForm((current) => ({ ...current, [key]: value }));
  const toggleDisease = (code: string) => set('diseaseCodes', form.diseaseCodes.includes(code) ? form.diseaseCodes.filter((item) => item !== code) : [...form.diseaseCodes, code]);
  const confirmToggle = (item: ExerciseItem) => Alert.alert(
    item.active ? 'Ngừng dùng bài tập?' : 'Dùng lại bài tập?',
    item.active ? `"${item.name}" sẽ không được gợi ý cho người dùng nữa.` : `"${item.name}" sẽ được gợi ý lại.`,
    [{ text: 'Huỷ', style: 'cancel' }, { text: item.active ? 'Ngừng dùng' : 'Dùng lại', style: item.active ? 'destructive' : 'default', onPress: () => toggleActive.mutate(item) }],
  );

  if (!allowed) {
    return <SafeAreaView style={styles.screen}><View style={styles.denied}>
      <Ionicons name="lock-closed-outline" size={30} color="#64748B" />
      <Text style={styles.title}>Chỉ dành cho quản trị viên và bác sĩ</Text>
    </View></SafeAreaView>;
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.brandIcon}><Ionicons name="barbell" size={20} color={PRIMARY} /></View>
        <View style={styles.flex}>
          <Text style={styles.brand}>HEALTH ASSISTANT</Text>
          <Text style={styles.identity} numberOfLines={1}>{isDoctor ? 'Bác sĩ' : 'Quản trị viên'} · {username || ''}</Text>
        </View>
        <Pressable onPress={() => void logout()} style={styles.iconButton} accessibilityRole="button" accessibilityLabel="Đăng xuất">
          <Ionicons name="log-out-outline" size={20} color="#475569" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={exercises.isRefetching} onRefresh={() => void exercises.refetch()} tintColor={PRIMARY} />}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.heading}>
          <View style={styles.flex}>
            <Text style={styles.eyebrow}>{isDoctor ? 'KHU VỰC BÁC SĨ' : 'KHU VỰC QUẢN TRỊ'}</Text>
            <Text style={styles.title}>Thư viện bài tập</Text>
            <Text style={styles.subtitle}>Tư thế chuẩn, lỗi thường gặp và chống chỉ định theo bệnh</Text>
          </View>
          <Pressable onPress={() => navigationService.navigate(isDoctor ? 'DoctorDashboard' : 'AdminDashboard')} style={styles.secondaryButton} accessibilityRole="button" accessibilityLabel="Mở trang tổng quan">
            <Ionicons name="grid-outline" size={17} color={PRIMARY} />
          </Pressable>
          <Pressable onPress={openCreate} style={styles.addButton} accessibilityRole="button" accessibilityLabel="Thêm bài tập" testID="add-exercise">
            <Ionicons name="add" size={22} color="#FFFFFF" /><Text style={styles.addText}>Thêm</Text>
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          <Stat label="Đang dùng" value={activeCount} color="#15803D" />
          <Stat label="Có chống chỉ định" value={withContraindication} color="#B45309" />
          <Stat label="Tổng" value={exercises.data?.length ?? 0} color="#0F766E" />
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#94A3B8" />
          <TextInput value={search} onChangeText={setSearch} placeholder="Tìm theo tên, nhóm cơ, mã" placeholderTextColor="#94A3B8" style={styles.searchInput} />
        </View>
        <View style={styles.chipRow}>
          {([['ACTIVE', 'Đang dùng'], ['INACTIVE', 'Ngừng dùng'], ['ALL', 'Tất cả']] as const).map(([value, label]) => (
            <Chip key={value} label={label} active={filter === value} onPress={() => setFilter(value)} />
          ))}
        </View>

        {exercises.isLoading ? <ActivityIndicator color={PRIMARY} style={styles.loading} /> : null}
        {exercises.error ? <Text style={styles.error}>{exercises.error instanceof Error ? exercises.error.message : 'Không tải được thư viện bài tập.'}</Text> : null}
        {!exercises.isLoading && !list.length ? (
          <View style={styles.empty}>
            <Ionicons name="barbell-outline" size={28} color="#94A3B8" />
            <Text style={styles.emptyTitle}>Chưa có bài tập phù hợp</Text>
            <Text style={styles.emptyText}>Bấm “Thêm” để tạo bài tập đầu tiên.</Text>
          </View>
        ) : null}
        {list.map((item) => (
          <Pressable key={item.id} onPress={() => openEdit(item)} style={[styles.card, !item.active && styles.cardInactive]} accessibilityRole="button" accessibilityLabel={`Sửa ${item.name}`}>
            <View style={styles.cardTop}>
              <View style={styles.cardIcon}><Ionicons name="body-outline" size={20} color="#0F766E" /></View>
              <View style={styles.flex}>
                <Text style={styles.cardTitle} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.cardMeta} numberOfLines={1}>{item.muscleGroup} · {difficultyLabel(item.difficulty)}{item.equipment ? ` · ${item.equipment}` : ''}</Text>
              </View>
              <Pressable onPress={(event) => { event.stopPropagation(); confirmToggle(item); }} hitSlop={10} style={styles.rowAction} accessibilityLabel={item.active ? 'Ngừng dùng' : 'Dùng lại'}>
                <Ionicons name={item.active ? 'pause-circle-outline' : 'play-circle-outline'} size={20} color="#64748B" />
              </Pressable>
            </View>
            <View style={styles.badgeRow}>
              {item.sets ? <Badge text={`${item.sets} hiệp`} /> : null}
              {item.reps ? <Badge text={`${item.reps} lần`} /> : null}
              {item.restSeconds != null ? <Badge text={`nghỉ ${item.restSeconds}s`} /> : null}
              {!item.active ? <Badge text="Ngừng dùng" tone="muted" /> : null}
            </View>
            {item.contraindicatedDiseaseCodes?.length ? (
              <View style={styles.warnRow}>
                <Ionicons name="warning-outline" size={14} color="#B45309" />
                <Text style={styles.warnText} numberOfLines={2}>Không dùng cho: {item.contraindicatedDiseaseCodes.map(diseaseName).join(', ')}</Text>
              </View>
            ) : null}
          </Pressable>
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <Pressable onPress={() => navigationService.navigate(isDoctor ? 'DoctorKnowledge' : 'AdminKnowledge')} style={styles.footerLink} accessibilityRole="button" accessibilityLabel="Mở kho tri thức">
          <Ionicons name="library-outline" size={17} color="#475569" />
          <Text style={styles.footerLinkText}>Kho tri thức</Text>
        </Pressable>
        <View style={styles.footerActiveIcon}><Ionicons name="barbell" size={19} color={PRIMARY} /></View>
        <Text style={styles.footerActiveText}>Bài tập</Text>
        <View style={styles.flex} />
        <Text style={styles.footerRole}>{isDoctor ? 'BÁC SĨ' : 'ADMIN'}</Text>
      </View>

      <AppModal visible={formOpen} animationType="slide" onRequestClose={() => setFormOpen(false)}>
        {/* Modal là cửa sổ native riêng: cần SafeAreaProvider để nút X không nằm dưới thanh trạng thái. */}
        <SafeAreaProvider>
          <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setFormOpen(false)} hitSlop={10} style={styles.iconButton} accessibilityRole="button" accessibilityLabel="Đóng">
                <Ionicons name="close" size={22} color="#17212B" />
              </Pressable>
              <Text style={styles.modalTitle}>{editing ? 'Sửa bài tập' : 'Thêm bài tập'}</Text>
              <View style={styles.iconButton} />
            </View>
            <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
              <Label text="Tên bài tập *" />
              <Input value={form.name} onChangeText={(value) => set('name', value)} placeholder="Ví dụ: Squat với ghế" testID="exercise-name" />
              {editing ? <Text style={styles.hint}>Mã: {editing.code} (không đổi được)</Text> : <Text style={styles.hint}>Mã tự tạo từ tên nếu để trống ô dưới.</Text>}
              {!editing ? <Input value={form.code} onChangeText={(value) => set('code', value)} placeholder="Mã (tuỳ chọn), ví dụ: CHAIR_SQUAT" autoCapitalize="characters" /> : null}

              <Label text="Nhóm cơ *" />
              <Input value={form.muscleGroup} onChangeText={(value) => set('muscleGroup', value)} placeholder="Ví dụ: Đùi, mông" testID="exercise-muscle" />

              <Label text="Độ khó" />
              <View style={styles.chipRow}>
                {DIFFICULTIES.map((item) => <Chip key={item.value} label={item.label} active={form.difficulty === item.value} onPress={() => set('difficulty', item.value)} />)}
              </View>

              <Label text="Dụng cụ" />
              <Input value={form.equipment} onChangeText={(value) => set('equipment', value)} placeholder="Ví dụ: Ghế, dây kháng lực (để trống nếu không cần)" />

              <View style={styles.row3}>
                <View style={styles.flex}><Label text="Số hiệp" /><Input value={form.sets} onChangeText={(value) => set('sets', value)} keyboardType="number-pad" placeholder="3" /></View>
                <View style={styles.flex}><Label text="Số lần" /><Input value={form.reps} onChangeText={(value) => set('reps', value)} placeholder="10-12" /></View>
                <View style={styles.flex}><Label text="Nghỉ (giây)" /><Input value={form.restSeconds} onChangeText={(value) => set('restSeconds', value)} keyboardType="number-pad" placeholder="60" /></View>
              </View>

              <Label text="Tư thế chuẩn – hướng dẫn từng bước *" />
              <Input value={form.instructions} onChangeText={(value) => set('instructions', value)} multiline placeholder={'1. Đứng rộng bằng vai...\n2. Hạ hông như ngồi xuống ghế...'} testID="exercise-instructions" />

              <Label text="Lỗi thường gặp" />
              <Input value={form.commonMistakes} onChangeText={(value) => set('commonMistakes', value)} multiline placeholder="Ví dụ: Gối đổ vào trong, gót chân nhấc lên" />

              <Label text="Lưu ý an toàn" />
              <Input value={form.safetyNotes} onChangeText={(value) => set('safetyNotes', value)} multiline placeholder="Ví dụ: Dừng nếu đau nhói ở gối" />

              <Label text="Chống chỉ định theo bệnh" />
              <Text style={styles.hint}>Người dùng có bệnh được chọn sẽ không được gợi ý bài này.</Text>
              <View style={styles.chipWrap}>
                {diseases.isLoading ? <ActivityIndicator color={PRIMARY} /> : null}
                {diseaseOptions.map((item) => <Chip key={item.code} label={item.name} active={form.diseaseCodes.includes(item.code)} onPress={() => toggleDisease(item.code)} tone="warn" />)}
                {!diseases.isLoading && !diseaseOptions.length ? <Text style={styles.hint}>Chưa có bệnh trong danh mục.</Text> : null}
              </View>
              <Label text="Chống chỉ định khác (ghi chú)" />
              <Input value={form.contraindications} onChangeText={(value) => set('contraindications', value)} multiline placeholder="Ví dụ: Đau gối cấp, sau phẫu thuật dưới 6 tuần" />

              {editing ? (
                <View style={styles.switchRow}>
                  <View style={styles.flex}><Text style={styles.switchTitle}>Đang dùng</Text><Text style={styles.hint}>Tắt để ngừng gợi ý bài này cho người dùng.</Text></View>
                  <Switch value={form.active} onValueChange={(value) => set('active', value)} />
                </View>
              ) : null}

              {formError ? <Text style={styles.error} testID="exercise-form-error">{formError}</Text> : null}
              <Pressable onPress={submit} disabled={save.isPending} style={[styles.primaryButton, save.isPending && styles.disabled]} accessibilityRole="button" testID="save-exercise">
                {save.isPending ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons name="checkmark" size={18} color="#FFFFFF" />}
                <Text style={styles.primaryText}>{editing ? 'Lưu thay đổi' : 'Thêm bài tập'}</Text>
              </Pressable>
            </ScrollView>
          </SafeAreaView>
        </SafeAreaProvider>
      </AppModal>
    </View>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return <View style={styles.stat}><Text style={[styles.statValue, { color }]}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}
function Chip({ label, active, onPress, tone }: { label: string; active: boolean; onPress: () => void; tone?: 'warn' }) {
  const activeStyle = tone === 'warn' ? styles.chipWarn : styles.chipActive;
  const activeText = tone === 'warn' ? styles.chipWarnText : styles.chipActiveText;
  return <Pressable onPress={onPress} style={[styles.chip, active && activeStyle]} accessibilityRole="button" accessibilityState={{ selected: active }}><Text style={[styles.chipText, active && activeText]}>{label}</Text></Pressable>;
}
function Badge({ text, tone }: { text: string; tone?: 'muted' }) {
  return <Text style={[styles.badge, tone === 'muted' && styles.badgeMuted]}>{text}</Text>;
}
function Label({ text }: { text: string }) {
  return <Text style={styles.label}>{text}</Text>;
}
function Input(props: React.ComponentProps<typeof TextInput>) {
  return <TextInput {...props} placeholderTextColor="#94A3B8" style={[styles.input, props.multiline && styles.multiline]} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7F8FC' },
  flex: { flex: 1, minWidth: 0 },
  denied: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 },
  header: { minHeight: 68, paddingHorizontal: 16, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: '#FFFFFF', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#DCE4E0' },
  brandIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EFEEFF' },
  brand: { color: '#20213A', fontSize: 11, fontWeight: '800' },
  identity: { marginTop: 3, color: '#7A8099', fontSize: 11 },
  iconButton: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEF0F8' },
  content: { paddingHorizontal: 16, paddingBottom: 28, gap: 12 },
  heading: { marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  eyebrow: { color: PRIMARY, fontSize: 10, fontWeight: '800', marginBottom: 5 },
  title: { fontSize: 19, fontWeight: '700', color: '#20213A' },
  subtitle: { marginTop: 2, fontSize: 12, color: '#7A8099' },
  secondaryButton: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EFEEFF' },
  addButton: { height: 38, paddingHorizontal: 12, borderRadius: 10, backgroundColor: PRIMARY, flexDirection: 'row', alignItems: 'center', gap: 5 },
  addText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E8EAF4' },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { marginTop: 2, fontSize: 11, color: '#7A8099', textAlign: 'center' },
  searchBox: { height: 46, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E8EAF4' },
  searchInput: { flex: 1, color: '#20213A', fontSize: 14 },
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chipWrap: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0' },
  chipActive: { backgroundColor: '#EFEEFF', borderColor: PRIMARY },
  chipWarn: { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' },
  chipText: { color: '#475569', fontSize: 12, fontWeight: '600' },
  chipActiveText: { color: PRIMARY },
  chipWarnText: { color: '#B45309' },
  loading: { marginVertical: 24 },
  error: { color: '#B91C1C', fontSize: 13, lineHeight: 19 },
  empty: { alignItems: 'center', paddingVertical: 36, gap: 8, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E8EAF4' },
  emptyTitle: { color: '#363955', fontWeight: '700', fontSize: 14 },
  emptyText: { color: '#7A8099', fontSize: 12, textAlign: 'center', paddingHorizontal: 18 },
  card: { padding: 14, gap: 10, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E8EAF4' },
  cardInactive: { opacity: 0.6 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E6F6F3' },
  cardTitle: { color: '#20213A', fontSize: 15, fontWeight: '700' },
  cardMeta: { marginTop: 2, color: '#7A8099', fontSize: 12 },
  rowAction: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  badgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, overflow: 'hidden', backgroundColor: '#F1F5F9', color: '#334155', fontSize: 11, fontWeight: '600' },
  badgeMuted: { backgroundColor: '#E2E8F0', color: '#64748B' },
  warnRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: '#FFFBEB' },
  warnText: { flex: 1, color: '#92400E', fontSize: 12 },
  footer: { minHeight: 54, paddingTop: 8, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFFFFF', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#DCE4E0' },
  footerLink: { flexDirection: 'row', alignItems: 'center', gap: 5, marginRight: 8, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#F1F5F9' },
  footerLinkText: { color: '#475569', fontSize: 12, fontWeight: '700' },
  footerActiveIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EFEEFF' },
  footerActiveText: { color: PRIMARY, fontSize: 13, fontWeight: '800' },
  footerRole: { color: '#64748B', fontSize: 10, fontWeight: '800' },
  modalHeader: { height: 56, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#DCE4E0' },
  modalTitle: { color: '#17212B', fontSize: 16, fontWeight: '700' },
  modalContent: { padding: 16, paddingBottom: 40, gap: 8 },
  label: { marginTop: 10, color: '#334155', fontSize: 12, fontWeight: '700' },
  hint: { color: '#7A8099', fontSize: 11, lineHeight: 16 },
  input: { minHeight: 44, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF', color: '#20213A', fontSize: 14 },
  multiline: { minHeight: 92, textAlignVertical: 'top' },
  row3: { flexDirection: 'row', gap: 10 },
  switchRow: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E8EAF4' },
  switchTitle: { color: '#20213A', fontSize: 14, fontWeight: '700' },
  primaryButton: { marginTop: 18, minHeight: 48, borderRadius: 12, backgroundColor: PRIMARY, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  disabled: { opacity: 0.6 },
});
