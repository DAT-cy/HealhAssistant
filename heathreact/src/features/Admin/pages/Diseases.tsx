import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ApiError } from '@/api/client';
import { adminDiseaseService, type DiseaseCreateInput } from '@/api/services/admin.service';
import type { Disease, RiskSeverity } from '@/api/services/doctor.service';
import AppModal from '@/components/ui/AppModal';
import { Pressable } from '@/components/ui/Pressable';
import { navigationService } from '@/routes';
import { useUserStore } from '@/stores/user';
import { palette } from '@/theme/tokens';
import { SEVERITY_COLORS, SEVERITY_LABELS } from '@/utils/doctorReview';

const QUERY_KEY = ['admin', 'diseases'] as const;
const SEVERITIES: RiskSeverity[] = ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'];
type StatusFilter = 'active' | 'review' | 'inactive' | 'all';
const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'active', label: 'Đang dùng' },
  { value: 'review', label: 'Cần bác sĩ' },
  { value: 'inactive', label: 'Ngưng dùng' },
  { value: 'all', label: 'Tất cả' },
];

const normalize = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().trim();

/** Lọc + tìm kiếm phía client (API trả về toàn bộ danh sách). */
export function filterDiseases(items: Disease[], query: string, status: StatusFilter) {
  const q = normalize(query);
  return items
    .filter((item) => status === 'all' || (status === 'inactive' ? !item.active : item.active && (status !== 'review' || item.doctorRequired)))
    .filter((item) => !q || normalize(`${item.name} ${item.code} ${item.specialty ?? ''}`).includes(q))
    .sort((a, b) => Number(b.active) - Number(a.active) || b.priority - a.priority || a.name.localeCompare(b.name, 'vi'));
}

type FormState = { code: string; name: string; specialty: string; description: string; severity: RiskSeverity; doctorRequired: boolean; roadmapConfirmationRequired: boolean; aiAllowed: boolean; priority: string };
const emptyForm: FormState = { code: '', name: '', specialty: '', description: '', severity: 'LOW', doctorRequired: false, roadmapConfirmationRequired: false, aiAllowed: true, priority: '0' };

/** Kiểm tra form thêm bệnh. Trả về map lỗi theo field (rỗng = hợp lệ). */
export function validateDiseaseForm(form: FormState, existing: Disease[]): Record<string, string> {
  const errors: Record<string, string> = {};
  const code = form.code.trim().toUpperCase();
  if (!code) errors.code = 'Nhập mã bệnh.';
  else if (!/^[A-Z0-9_]{2,40}$/.test(code)) errors.code = 'Mã 2–40 ký tự, chỉ gồm chữ không dấu, số, dấu _.';
  else if (existing.some((item) => item.code.toUpperCase() === code)) errors.code = 'Mã bệnh đã tồn tại.';
  if (!form.name.trim()) errors.name = 'Nhập tên bệnh.';
  else if (form.name.trim().length > 160) errors.name = 'Tên tối đa 160 ký tự.';
  if (form.specialty.length > 120) errors.specialty = 'Chuyên khoa tối đa 120 ký tự.';
  const priority = Number(form.priority);
  if (!Number.isInteger(priority) || priority < 0 || priority > 100) errors.priority = 'Ưu tiên là số nguyên 0–100.';
  return errors;
}

function toInput(form: FormState): DiseaseCreateInput {
  return {
    code: form.code.trim().toUpperCase(),
    name: form.name.trim(),
    specialty: form.specialty.trim() || null,
    description: form.description.trim() || null,
    severity: form.severity,
    doctorRequired: form.doctorRequired,
    roadmapConfirmationRequired: form.roadmapConfirmationRequired,
    aiAllowed: form.aiAllowed,
    priority: Number(form.priority),
  };
}

const errorMessage = (error: unknown, fallback: string) => (error instanceof Error && error.message ? error.message : fallback);

export default function AdminDiseasesPage() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const username = useUserStore((state) => state.username);
  const logout = useUserStore((state) => state.logout);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('active');
  const [formOpen, setFormOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const list = useQuery({ queryKey: QUERY_KEY, queryFn: adminDiseaseService.list });
  const all = useMemo(() => list.data ?? [], [list.data]);
  const visible = useMemo(() => filterDiseases(all, query, status), [all, query, status]);
  const stats = {
    active: all.filter((item) => item.active).length,
    review: all.filter((item) => item.active && item.doctorRequired).length,
    inactive: all.filter((item) => !item.active).length,
  };

  const deactivate = useMutation({
    mutationFn: (id: number) => adminDiseaseService.deactivate(id),
    onSuccess: (_result, id) => {
      setConfirmId(null);
      setNotice({ type: 'success', text: `Đã ngưng dùng ${all.find((item) => item.id === id)?.name ?? 'bệnh'}.` });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
    onError: (error) => setNotice({ type: 'error', text: errorMessage(error, 'Không ngưng dùng được bệnh.') }),
  });

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.brandIcon}><Ionicons name="medkit-outline" size={20} color={palette.primary} /></View>
        <View style={styles.headerCopy}><Text style={styles.brand}>HEALTH ASSISTANT</Text><Text style={styles.identity}>Quản trị viên · {username || 'admin'}</Text></View>
        <Pressable onPress={() => void logout()} accessibilityRole="button" accessibilityLabel="Đăng xuất" style={styles.iconButton}><Ionicons name="log-out-outline" size={20} color={palette.textMuted} /></Pressable>
      </View>
      <View style={styles.nav}>
        <NavItem label="Tổng quan" icon="grid-outline" onPress={() => navigationService.navigate('AdminDashboard')} />
        <NavItem label="Bệnh lý" icon="medkit" active />
        <NavItem label="Kho tri thức" icon="library-outline" onPress={() => navigationService.navigate('AdminKnowledge')} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={list.isRefetching} onRefresh={() => void list.refetch()} tintColor={palette.primary} />}
      >
        <View style={styles.headingRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>KHU VỰC QUẢN TRỊ</Text>
            <Text style={styles.title}>Danh mục bệnh lý</Text>
            <Text style={styles.subtitle}>Bệnh bật “Cần bác sĩ” sẽ khiến lộ trình của người dùng chờ bác sĩ duyệt.</Text>
          </View>
          <Pressable onPress={() => { setNotice(null); setFormOpen(true); }} style={styles.addButton} accessibilityRole="button" accessibilityLabel="Thêm bệnh">
            <Ionicons name="add" size={20} color="#FFFFFF" /><Text style={styles.addText}>Thêm</Text>
          </Pressable>
        </View>

        <View style={styles.stats}>
          <Stat label="Đang dùng" value={stats.active} color={palette.primary} />
          <Stat label="Cần bác sĩ" value={stats.review} color={palette.warning} />
          <Stat label="Ngưng dùng" value={stats.inactive} color={palette.textMuted} />
        </View>

        {notice ? <Text style={[styles.notice, notice.type === 'error' ? styles.noticeError : styles.noticeSuccess]} accessibilityLiveRegion="polite">{notice.text}</Text> : null}

        <View style={styles.search}>
          <Ionicons name="search-outline" size={18} color={palette.textMuted} />
          <TextInput value={query} onChangeText={setQuery} placeholder="Tìm tên, mã hoặc chuyên khoa" placeholderTextColor={palette.textMuted} style={styles.searchInput} />
        </View>
        <View style={styles.filterRow}>
          {FILTERS.map((filter) => (
            <Pressable key={filter.value} onPress={() => setStatus(filter.value)} style={[styles.filter, status === filter.value && styles.filterActive]} accessibilityRole="button" accessibilityState={{ selected: status === filter.value }}>
              <Text style={[styles.filterText, status === filter.value && styles.filterTextActive]}>{filter.label}</Text>
            </Pressable>
          ))}
        </View>

        {list.isPending ? <ActivityIndicator color={palette.primary} /> : list.isError ? (
          <Text style={[styles.notice, styles.noticeError]}>Không tải được danh mục bệnh. Kéo xuống để thử lại.</Text>
        ) : visible.length === 0 ? (
          <Text style={styles.empty}>{all.length === 0 ? 'Chưa có bệnh nào. Bấm “Thêm” để tạo bệnh đầu tiên.' : 'Không có bệnh phù hợp bộ lọc.'}</Text>
        ) : visible.map((disease) => (
          <DiseaseRow
            key={disease.id}
            disease={disease}
            confirming={confirmId === disease.id}
            busy={deactivate.isPending && deactivate.variables === disease.id}
            onAskDeactivate={() => { setNotice(null); setConfirmId(disease.id); }}
            onCancel={() => setConfirmId(null)}
            onConfirm={() => deactivate.mutate(disease.id)}
          />
        ))}
      </ScrollView>

      <DiseaseFormModal
        visible={formOpen}
        existing={all}
        onClose={() => setFormOpen(false)}
        onCreated={(created) => {
          setFormOpen(false);
          setStatus('active');
          setNotice({ type: 'success', text: `Đã thêm bệnh ${created.name}.` });
          void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
        }}
      />
    </SafeAreaView>
  );
}

function NavItem({ label, icon, active, onPress }: { label: string; icon: keyof typeof Ionicons.glyphMap; active?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={active} style={[styles.navItem, active && styles.navActive]} accessibilityRole="tab" accessibilityState={{ selected: !!active }}>
      <Ionicons name={icon} size={16} color={active ? palette.primary : palette.textMuted} />
      <Text style={active ? styles.navActiveText : styles.navText}>{label}</Text>
    </Pressable>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return <View style={styles.stat}><Text style={[styles.statValue, { color }]}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

function DiseaseRow({ disease, confirming, busy, onAskDeactivate, onCancel, onConfirm }: {
  disease: Disease; confirming: boolean; busy: boolean; onAskDeactivate: () => void; onCancel: () => void; onConfirm: () => void;
}) {
  const color = SEVERITY_COLORS[disease.severity] ?? palette.textMuted;
  return (
    <View style={[styles.row, !disease.active && styles.rowInactive]}>
      <View style={styles.rowHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>{disease.name}</Text>
          <Text style={styles.rowMeta}>{disease.code} · {disease.specialty || 'Chưa gán chuyên khoa'} · ưu tiên {disease.priority}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: `${color}18` }]}><Text style={[styles.badgeText, { color }]}>{SEVERITY_LABELS[disease.severity] ?? disease.severity}</Text></View>
      </View>
      <View style={styles.tags}>
        {!disease.active ? <Tag text="Ngưng dùng" color={palette.textMuted} /> : null}
        {disease.doctorRequired ? <Tag text="Cần bác sĩ duyệt" color="#B45309" /> : <Tag text="Tự động" color={palette.success} />}
        {disease.roadmapConfirmationRequired ? <Tag text="Xác nhận lộ trình" color={palette.primary} /> : null}
        {!disease.aiAllowed ? <Tag text="AI không tự tạo" color={palette.danger} /> : null}
      </View>
      {disease.description ? <Text style={styles.description} numberOfLines={2}>{disease.description}</Text> : null}
      {disease.active ? (
        confirming ? (
          <View style={styles.confirmBox}>
            <Text style={styles.confirmText}>Ngưng dùng “{disease.name}”? Người dùng sẽ không chọn được bệnh này nữa.</Text>
            <View style={styles.confirmActions}>
              <Pressable onPress={onCancel} disabled={busy} style={styles.secondaryButton}><Text style={styles.secondaryText}>Huỷ</Text></Pressable>
              <Pressable onPress={onConfirm} disabled={busy} style={styles.dangerButton} accessibilityLabel={`Xác nhận ngưng dùng ${disease.name}`}>
                {busy ? <ActivityIndicator color={palette.danger} /> : <Text style={styles.dangerText}>Ngưng dùng</Text>}
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable onPress={onAskDeactivate} style={styles.archiveButton} accessibilityRole="button" accessibilityLabel={`Ngưng dùng ${disease.name}`}>
            <Ionicons name="archive-outline" size={15} color={palette.textMuted} /><Text style={styles.archiveText}>Ngưng dùng</Text>
          </Pressable>
        )
      ) : null}
    </View>
  );
}

function Tag({ text, color }: { text: string; color: string }) {
  return <View style={[styles.tag, { borderColor: `${color}55` }]}><Text style={[styles.tagText, { color }]}>{text}</Text></View>;
}

function DiseaseFormModal({ visible, existing, onClose, onCreated }: { visible: boolean; existing: Disease[]; onClose: () => void; onCreated: (disease: Disease) => void }) {
  return (
    <AppModal visible={visible} animationType="slide" onRequestClose={onClose}>
      {/* Modal là cửa sổ native riêng: cần SafeAreaProvider để tránh header (nút X) nằm dưới thanh trạng thái. */}
      <SafeAreaProvider>
        {visible ? <DiseaseForm existing={existing} onClose={onClose} onCreated={onCreated} /> : null}
      </SafeAreaProvider>
    </AppModal>
  );
}

function DiseaseForm({ existing, onClose, onCreated }: { existing: Disease[]; onClose: () => void; onCreated: (disease: Disease) => void }) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (errors[key as string]) setErrors((current) => { const next = { ...current }; delete next[key as string]; return next; });
  };

  const create = useMutation({
    mutationFn: (input: DiseaseCreateInput) => adminDiseaseService.create(input),
    onSuccess: onCreated,
    onError: (error) => {
      if (error instanceof ApiError && Object.keys(error.validationErrors).length) setErrors(error.validationErrors);
      setServerError(errorMessage(error, 'Không thêm được bệnh.'));
    },
  });

  const submit = () => {
    const found = validateDiseaseForm(form, existing);
    setErrors(found);
    setServerError(null);
    if (Object.keys(found).length === 0) create.mutate(toInput(form));
  };

  return (
    <SafeAreaView style={styles.modalScreen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.modalHeader}>
          <Pressable onPress={onClose} hitSlop={10} style={styles.iconButton} accessibilityRole="button" accessibilityLabel="Đóng"><Ionicons name="close" size={22} color={palette.text} /></Pressable>
          <Text style={styles.modalTitle}>Thêm bệnh</Text>
          <View style={styles.iconButton} />
        </View>
        <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
          <Field label="Tên bệnh *" error={errors.name}>
            <TextInput testID="disease-name" value={form.name} onChangeText={(v) => set('name', v)} placeholder="Ví dụ: Tăng huyết áp" placeholderTextColor={palette.textMuted} style={styles.input} />
          </Field>
          <Field label="Mã bệnh *" hint="Chữ in hoa không dấu, ví dụ HYPERTENSION" error={errors.code}>
            <TextInput testID="disease-code" value={form.code} onChangeText={(v) => set('code', v.toUpperCase())} autoCapitalize="characters" autoCorrect={false} placeholder="HYPERTENSION" placeholderTextColor={palette.textMuted} style={styles.input} />
          </Field>
          <Field label="Chuyên khoa" error={errors.specialty}>
            <TextInput testID="disease-specialty" value={form.specialty} onChangeText={(v) => set('specialty', v)} placeholder="Ví dụ: Tim mạch" placeholderTextColor={palette.textMuted} style={styles.input} />
          </Field>
          <Field label="Mô tả / lưu ý (nên làm, cần tránh)">
            <TextInput testID="disease-description" value={form.description} onChangeText={(v) => set('description', v)} multiline maxLength={5000} placeholder="Nên: đi bộ nhanh 30 phút/ngày… Tránh: nín thở khi nâng tạ…" placeholderTextColor={palette.textMuted} style={[styles.input, styles.multiline]} />
          </Field>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Mức độ rủi ro</Text>
            <View style={styles.filterRow}>
              {SEVERITIES.map((severity) => (
                <Pressable key={severity} onPress={() => set('severity', severity)} style={[styles.filter, form.severity === severity && styles.filterActive]} accessibilityRole="button" accessibilityState={{ selected: form.severity === severity }}>
                  <Text style={[styles.filterText, form.severity === severity && styles.filterTextActive]}>{SEVERITY_LABELS[severity]}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.switchGroup}>
            <Text style={styles.fieldLabel}>Quy định duyệt</Text>
            <SwitchRow testID="switch-doctor-required" title="Cần bác sĩ duyệt" description="Lộ trình của người dùng có bệnh này phải chờ bác sĩ duyệt." value={form.doctorRequired} onChange={(v) => set('doctorRequired', v)} />
            <SwitchRow testID="switch-roadmap-confirmation" title="Bác sĩ xác nhận lộ trình" description="Bác sĩ phải xác nhận lộ trình trước khi người dùng bắt đầu." value={form.roadmapConfirmationRequired} onChange={(v) => set('roadmapConfirmationRequired', v)} />
            <SwitchRow testID="switch-ai-allowed" title="Cho phép AI tự tạo lộ trình" description="Tắt nếu bệnh này không được để AI tự lập kế hoạch." value={form.aiAllowed} onChange={(v) => set('aiAllowed', v)} />
          </View>

          <Field label="Mức ưu tiên (0–100)" error={errors.priority}>
            <TextInput testID="disease-priority" value={form.priority} onChangeText={(v) => set('priority', v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" maxLength={3} style={styles.input} />
          </Field>

          {serverError ? <Text style={[styles.notice, styles.noticeError]}>{serverError}</Text> : null}
          <Pressable onPress={submit} disabled={create.isPending} style={[styles.primaryButton, create.isPending && styles.dim]} accessibilityRole="button" accessibilityLabel="Lưu bệnh">
            {create.isPending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>Lưu bệnh</Text>}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <View style={styles.labelBlock}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      {children}
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

function SwitchRow({ testID, title, description, value, onChange }: { testID: string; title: string; description: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <View style={styles.switchRow}>
      <View style={{ flex: 1 }}><Text style={styles.switchTitle}>{title}</Text><Text style={styles.switchDescription}>{description}</Text></View>
      <Switch testID={testID} value={value} onValueChange={onChange} trackColor={{ true: palette.primary, false: palette.border }} thumbColor="#FFFFFF" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingVertical: 14, backgroundColor: palette.surface, borderBottomWidth: 1, borderColor: palette.border },
  brandIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.primarySoft },
  headerCopy: { flex: 1 },
  brand: { color: palette.primary, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  identity: { color: palette.textMuted, fontSize: 11, marginTop: 3 },
  iconButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  nav: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 12, backgroundColor: palette.surface },
  navItem: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, borderRadius: 9 },
  navActive: { backgroundColor: palette.primarySoft },
  navText: { color: palette.textMuted, fontSize: 12, fontWeight: '700' },
  navActiveText: { color: palette.primary, fontSize: 12, fontWeight: '800' },
  content: { padding: 18, gap: 12 },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  eyebrow: { color: palette.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  title: { color: palette.text, fontSize: 24, fontWeight: '800' },
  subtitle: { color: palette.textMuted, fontSize: 12, lineHeight: 18 },
  addButton: { height: 40, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 10, backgroundColor: palette.primary },
  addText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface },
  statValue: { fontSize: 22, fontWeight: '900' },
  statLabel: { marginTop: 3, color: palette.textMuted, fontSize: 10 },
  notice: { padding: 11, borderRadius: 10, fontSize: 12, fontWeight: '600' },
  noticeSuccess: { backgroundColor: palette.successSoft, color: palette.success },
  noticeError: { backgroundColor: palette.dangerLight, color: palette.danger },
  search: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: palette.border, borderRadius: 9, backgroundColor: palette.surface },
  searchInput: { flex: 1, color: palette.text, fontSize: 13 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  filter: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999, backgroundColor: palette.surfaceRaised },
  filterActive: { backgroundColor: palette.primarySoft },
  filterText: { color: palette.textMuted, fontSize: 11, fontWeight: '700' },
  filterTextActive: { color: palette.primary },
  empty: { color: palette.textMuted, textAlign: 'center', paddingVertical: 26 },
  row: { gap: 8, padding: 13, borderRadius: 12, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface },
  rowInactive: { opacity: 0.6 },
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowTitle: { color: palette.text, fontSize: 14, fontWeight: '800' },
  rowMeta: { marginTop: 3, color: palette.textMuted, fontSize: 10 },
  badge: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: '900' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  tagText: { fontSize: 10, fontWeight: '700' },
  description: { color: palette.textMuted, fontSize: 11, lineHeight: 16 },
  archiveButton: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6 },
  archiveText: { color: palette.textMuted, fontSize: 12, fontWeight: '600' },
  confirmBox: { gap: 8, padding: 10, borderRadius: 10, backgroundColor: palette.dangerLight },
  confirmText: { color: palette.danger, fontSize: 12, lineHeight: 17 },
  confirmActions: { flexDirection: 'row', gap: 8 },
  secondaryButton: { flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface },
  secondaryText: { color: palette.text, fontWeight: '700', fontSize: 12 },
  dangerButton: { flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#FECACA' },
  dangerText: { color: palette.danger, fontWeight: '800', fontSize: 12 },
  modalScreen: { flex: 1, backgroundColor: palette.bg },
  modalHeader: { minHeight: 56, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: palette.surface, borderBottomWidth: 1, borderColor: palette.border },
  modalTitle: { color: palette.text, fontSize: 16, fontWeight: '800' },
  modalContent: { padding: 20, gap: 22, paddingBottom: 48 },
  field: { gap: 8 },
  labelBlock: { gap: 3 },
  fieldLabel: { color: palette.text, fontSize: 13, fontWeight: '700' },
  hint: { color: palette.textMuted, fontSize: 11, lineHeight: 15 },
  fieldError: { marginTop: 2, color: palette.danger, fontSize: 11 },
  switchGroup: { gap: 10 },
  input: { minHeight: 44, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 9, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface, color: palette.text, fontSize: 14 },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface },
  switchTitle: { color: palette.text, fontSize: 13, fontWeight: '700' },
  switchDescription: { marginTop: 2, color: palette.textMuted, fontSize: 11, lineHeight: 15 },
  primaryButton: { minHeight: 48, marginTop: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: palette.primary },
  primaryText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  dim: { opacity: 0.6 },
});
