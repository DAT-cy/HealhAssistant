import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { doctorService, type Disease, type DoctorDashboard as DoctorDashboardData, type DoctorReviewRequest } from '@/api/services/doctor.service';
import { Pressable } from '@/components/ui/Pressable';
import { useUserStore } from '@/stores/user';
import { palette } from '@/theme/tokens';
import { canDecide, doctorStatusLabel, SEVERITY_COLORS, SEVERITY_LABELS, type ReviewAction } from '@/utils/doctorReview';
import ReviewDecisionModal from '../components/ReviewDecisionModal';
import ReviewDetail from '../components/ReviewDetail';

type Tab = 'overview' | 'diseases' | 'reviews';

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'Tất cả' },
  { value: 'ASSIGNED', label: 'Đã giao' },
  { value: 'IN_REVIEW', label: 'Đang kiểm tra' },
  { value: 'NEED_MORE_INFO', label: 'Chờ bổ sung' },
  { value: 'COMPLETED', label: 'Đã duyệt' },
  { value: 'REJECTED', label: 'Đã từ chối' },
];

/** Chu kỳ tự tải lại danh sách yêu cầu / tổng quan của bác sĩ. */
export const AUTO_REFRESH_MS = 20_000;

const errorMessage = (error: unknown, fallback: string) => (error instanceof Error && error.message ? error.message : fallback);

export default function DoctorDashboard() {
  const insets = useSafeAreaInsets();
  const logout = useUserStore((state) => state.logout);
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('overview');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [pendingAction, setPendingAction] = useState<ReviewAction | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Bác sĩ không biết lúc nào có yêu cầu mới -> tự tải lại định kỳ (và kéo xuống để tải ngay).
  const dashboard = useQuery({ queryKey: ['doctor', 'dashboard'], queryFn: doctorService.dashboard, refetchInterval: AUTO_REFRESH_MS });
  const diseases = useQuery({ queryKey: ['doctor', 'diseases', query], queryFn: () => doctorService.diseases(query), enabled: tab === 'diseases' });
  const reviews = useQuery({ queryKey: ['doctor', 'reviews', statusFilter], queryFn: () => doctorService.reviews(statusFilter), enabled: tab === 'reviews', refetchInterval: AUTO_REFRESH_MS, refetchOnMount: 'always' });
  const selected = reviews.data?.find((request) => request.id === selectedId) ?? null;

  useEffect(() => {
    void doctorService.heartbeat().catch(() => {});
    const timer = setInterval(() => { void doctorService.heartbeat().catch(() => {}); }, 120000);
    return () => clearInterval(timer);
  }, []);

  const refreshDoctorData = () => queryClient.invalidateQueries({ queryKey: ['doctor'] });

  const start = useMutation({
    mutationFn: (id: number) => doctorService.start(id),
    onSuccess: () => { setNotice(null); void refreshDoctorData(); },
    onError: (error) => setNotice(errorMessage(error, 'Không thể bắt đầu kiểm tra.')),
  });

  const decide = useMutation({
    mutationFn: ({ id, action, note }: { id: number; action: ReviewAction; note: string }) => doctorService.decide(id, action, note),
    onSuccess: (_result, variables) => {
      setPendingAction(null);
      setActionError(null);
      setSelectedId(null);
      setNotice(`Đã gửi quyết định cho yêu cầu #${variables.id}.`);
      void refreshDoctorData();
    },
    onError: (error) => setActionError(errorMessage(error, 'Không thể cập nhật yêu cầu.')),
  });

  const openDecision = (action: ReviewAction) => { setActionError(null); setPendingAction(action); };
  const closeDecision = () => { if (!decide.isPending) { setPendingAction(null); setActionError(null); } };

  const changeTab = (next: Tab) => { setTab(next); setSelectedId(null); setNotice(null); };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.logo}><Ionicons name="medical-outline" size={21} color={palette.primary} /></View>
        <View style={styles.headerCopy}><Text style={styles.brand}>HEALTH ASSISTANT</Text><Text style={styles.identity}>Doctor Portal</Text></View>
        <Pressable onPress={() => void logout()} style={styles.logout} accessibilityLabel="Đăng xuất"><Ionicons name="log-out-outline" size={20} color={palette.textMuted} /></Pressable>
      </View>
      <View style={styles.tabs}>
        <TabButton label="Tổng quan" icon="grid-outline" active={tab === 'overview'} onPress={() => changeTab('overview')} />
        <TabButton label="Bệnh lý" icon="list-outline" active={tab === 'diseases'} onPress={() => changeTab('diseases')} />
        <TabButton label="Yêu cầu" icon="clipboard-outline" active={tab === 'reviews'} onPress={() => changeTab('reviews')} />
      </View>
      <ScrollView
        testID="doctor-scroll"
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 22 }]}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => void refreshDoctorData()} tintColor={palette.primary} />}
      >
        {notice ? <Text style={styles.notice} accessibilityLiveRegion="polite">{notice}</Text> : null}
        {tab === 'overview' ? (
          <Overview data={dashboard.data} loading={dashboard.isPending} />
        ) : tab === 'diseases' ? (
          <DiseaseList data={diseases.data ?? []} loading={diseases.isPending} query={query} setQuery={setQuery} />
        ) : selected ? (
          <ReviewDetail
            request={selected}
            starting={start.isPending}
            onBack={() => setSelectedId(null)}
            onStart={() => start.mutate(selected.id)}
            onDecide={openDecision}
          />
        ) : (
          <ReviewList
            data={reviews.data ?? []}
            loading={reviews.isPending}
            error={reviews.isError}
            statusFilter={statusFilter}
            onFilter={setStatusFilter}
            onOpen={(id) => { setNotice(null); setSelectedId(id); }}
          />
        )}
      </ScrollView>
      <ReviewDecisionModal
        action={pendingAction}
        requestId={selected?.id ?? null}
        submitting={decide.isPending}
        error={actionError}
        onCancel={closeDecision}
        onSubmit={(note) => { if (selected && pendingAction) decide.mutate({ id: selected.id, action: pendingAction, note }); }}
      />
    </SafeAreaView>
  );
}

function TabButton({ label, icon, active, onPress }: { label: string; icon: keyof typeof Ionicons.glyphMap; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.tab, active && styles.tabActive]} accessibilityRole="tab" accessibilityState={{ selected: active }}>
      <Ionicons name={icon} size={16} color={active ? palette.primary : palette.textMuted} />
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

function Overview({ data, loading }: { data?: DoctorDashboardData; loading: boolean }) {
  const cards = [
    ['managedDiseases', 'Bệnh lý quản lý', 'list-outline'],
    ['diseasesRequiringReview', 'Cần bác sĩ', 'alert-circle-outline'],
    ['pending', 'Đang chờ', 'time-outline'],
    ['inReview', 'Đang kiểm tra', 'search-outline'],
    ['needMoreInfo', 'Cần bổ sung', 'help-circle-outline'],
    ['completed', 'Đã xác nhận', 'checkmark-circle-outline'],
  ] as const;
  return (
    <>
      <Text style={styles.eyebrow}>DOCTOR PORTAL</Text>
      <Text style={styles.title}>Tổng quan chuyên môn</Text>
      <Text style={styles.subtitle}>Chỉ các trường hợp đáp ứng chính sách rủi ro mới được chuyển đến bác sĩ.</Text>
      {loading ? <ActivityIndicator color={palette.primary} /> : (
        <View style={styles.grid}>
          {cards.map(([key, label, icon]) => (
            <View key={key} style={styles.card}>
              <Ionicons name={icon} size={20} color={palette.primary} />
              <Text style={styles.value}>{data?.[key] ?? 0}</Text>
              <Text style={styles.label}>{label}</Text>
            </View>
          ))}
        </View>
      )}
      <View style={styles.online}>
        <View style={[styles.dot, { backgroundColor: data?.online ? palette.success : palette.textMuted }]} />
        <Text style={styles.onlineText}>{data?.online ? 'Đang online · heartbeat đang hoạt động' : 'Chưa online · mở phiên bác sĩ để nhận yêu cầu'}</Text>
      </View>
    </>
  );
}

function DiseaseList({ data, loading, query, setQuery }: { data: Disease[]; loading: boolean; query: string; setQuery: (value: string) => void }) {
  return (
    <>
      <Text style={styles.title}>Disease Risk Management</Text>
      <Text style={styles.subtitle}>Cấu hình chính sách chuyển bác sĩ theo từng bệnh lý.</Text>
      <View style={styles.search}>
        <Ionicons name="search-outline" size={18} color={palette.textMuted} />
        <TextInput value={query} onChangeText={setQuery} placeholder="Tìm mã hoặc tên bệnh" placeholderTextColor={palette.textMuted} style={styles.searchInput} />
      </View>
      {loading ? <ActivityIndicator color={palette.primary} /> : data.length ? data.map((disease) => <DiseaseRow key={disease.id} disease={disease} />) : <Text style={styles.empty}>Chưa có bệnh lý được quản lý.</Text>}
    </>
  );
}

function DiseaseRow({ disease }: { disease: Disease }) {
  const color = SEVERITY_COLORS[disease.severity];
  return (
    <View style={styles.item}>
      <View style={styles.itemHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.itemTitle}>{disease.name}</Text>
          <Text style={styles.itemMeta}>{disease.code} · {disease.specialty || 'Chưa gán chuyên khoa'}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: `${color}18` }]}><Text style={[styles.badgeText, { color }]}>{SEVERITY_LABELS[disease.severity]}</Text></View>
      </View>
      <Text style={styles.policy}>{disease.doctorRequired ? 'Bắt buộc bác sĩ kiểm tra' : disease.aiAllowed ? 'AI được hỗ trợ theo chính sách' : 'Không cho phép AI tự tạo'}</Text>
    </View>
  );
}

function ReviewList({ data, loading, error, statusFilter, onFilter, onOpen }: {
  data: DoctorReviewRequest[]; loading: boolean; error: boolean; statusFilter: string; onFilter: (value: string) => void; onOpen: (id: number) => void;
}) {
  return (
    <>
      <Text style={styles.title}>Yêu cầu kiểm tra</Text>
      <Text style={styles.subtitle}>Bấm vào một yêu cầu để xem hồ sơ, lộ trình AI đề xuất và ra quyết định.</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {STATUS_FILTERS.map((filter) => (
          <Pressable key={filter.value || 'all'} onPress={() => onFilter(filter.value)} style={[styles.filter, statusFilter === filter.value && styles.filterActive]} accessibilityRole="button" accessibilityState={{ selected: statusFilter === filter.value }}>
            <Text style={[styles.filterText, statusFilter === filter.value && styles.filterTextActive]}>{filter.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {loading ? <ActivityIndicator color={palette.primary} /> : error ? (
        <Text style={styles.errorText}>Không tải được danh sách yêu cầu.</Text>
      ) : data.length ? data.map((request) => (
        <Pressable key={request.id} onPress={() => onOpen(request.id)} style={styles.item} accessibilityRole="button" accessibilityLabel={`Mở yêu cầu ${request.id}`}>
          <View style={styles.itemHeader}>
            <Text style={[styles.itemTitle, { flex: 1 }]}>Yêu cầu #{request.id}</Text>
            <Text style={[styles.status, canDecide(request) && styles.statusOpen]}>{doctorStatusLabel(request.status)}</Text>
            <Ionicons name="chevron-forward" size={16} color={palette.textMuted} />
          </View>
          <Text style={styles.itemMeta}>Người dùng #{request.userId} · {request.priority} · {request.diseaseCodes || 'Không có mã bệnh'}</Text>
          <Text style={styles.reason} numberOfLines={2}>{request.reason}</Text>
        </Pressable>
      )) : <Text style={styles.empty}>Không có yêu cầu nào.</Text>}
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingVertical: 14, backgroundColor: palette.surface, borderBottomWidth: 1, borderColor: palette.border },
  logo: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.primarySoft },
  headerCopy: { flex: 1 },
  brand: { color: palette.primary, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  identity: { color: palette.textMuted, fontSize: 11, marginTop: 3 },
  logout: { padding: 8 },
  tabs: { flexDirection: 'row', gap: 7, padding: 12, backgroundColor: palette.surface },
  tab: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, borderRadius: 9 },
  tabActive: { backgroundColor: palette.primarySoft },
  tabText: { color: palette.textMuted, fontSize: 11, fontWeight: '700' },
  tabTextActive: { color: palette.primary },
  content: { padding: 18, gap: 12 },
  notice: { padding: 11, borderRadius: 10, backgroundColor: palette.successSoft, color: palette.success, fontSize: 12, fontWeight: '600' },
  eyebrow: { color: palette.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  title: { color: palette.text, fontSize: 25, fontWeight: '800' },
  subtitle: { color: palette.textMuted, fontSize: 13, lineHeight: 19 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: { width: '31.8%', minHeight: 105, padding: 11, borderRadius: 12, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface },
  value: { marginTop: 9, color: palette.text, fontSize: 22, fontWeight: '900' },
  label: { marginTop: 2, color: palette.textMuted, fontSize: 10 },
  online: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, backgroundColor: palette.surface },
  dot: { width: 9, height: 9, borderRadius: 5 },
  onlineText: { color: palette.textMuted, fontSize: 11 },
  search: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderRadius: 9, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface },
  searchInput: { flex: 1, color: palette.text, fontSize: 13 },
  item: { padding: 13, borderRadius: 11, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemTitle: { color: palette.text, fontSize: 14, fontWeight: '800' },
  itemMeta: { marginTop: 6, color: palette.textMuted, fontSize: 10 },
  badge: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: '900' },
  policy: { marginTop: 10, color: palette.textMuted, fontSize: 11 },
  filters: { gap: 7, paddingRight: 12 },
  filter: { paddingHorizontal: 11, height: 32, borderRadius: 16, justifyContent: 'center', borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface },
  filterActive: { backgroundColor: palette.primarySoft, borderColor: palette.primary },
  filterText: { color: palette.textMuted, fontSize: 11, fontWeight: '700' },
  filterTextActive: { color: palette.primary },
  status: { color: palette.textMuted, fontSize: 10, fontWeight: '800' },
  statusOpen: { color: palette.primary },
  reason: { marginTop: 8, color: palette.text, fontSize: 12, lineHeight: 18 },
  errorText: { padding: 12, borderRadius: 8, backgroundColor: palette.dangerLight, color: palette.danger, fontSize: 12 },
  empty: { color: palette.textMuted, textAlign: 'center', paddingVertical: 26 },
});
