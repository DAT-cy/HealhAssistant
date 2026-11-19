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
  const username = useUserStore((state) => state.username);
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
    // Gửi heartbeat ngay khi mở app rồi tải lại tổng quan để trạng thái "Đang trực" đúng ngay lập tức.
    void doctorService.heartbeat().then(() => queryClient.invalidateQueries({ queryKey: ['doctor', 'dashboard'] })).catch(() => {});
    const timer = setInterval(() => { void doctorService.heartbeat().catch(() => {}); }, 120000);
    return () => clearInterval(timer);
  }, [queryClient]);

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

  const online = !!dashboard.data?.online;
  const toProcess = (dashboard.data?.pending ?? 0) + (dashboard.data?.inReview ?? 0);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View style={styles.avatar}><Ionicons name="medkit" size={20} color="#FFFFFF" /></View>
        <View style={styles.headerCopy}>
          <Text style={styles.greeting} numberOfLines={1}>Xin chào, BS. {username || 'bác sĩ'}</Text>
          <View style={styles.presence}>
            <View style={[styles.dot, { backgroundColor: online ? palette.success : palette.textMuted }]} />
            <Text style={[styles.presenceText, online && { color: palette.success }]}>{online ? 'Đang trực' : 'Ngoại tuyến'}</Text>
          </View>
        </View>
        <Pressable onPress={() => void logout()} style={styles.logout} accessibilityLabel="Đăng xuất"><Ionicons name="log-out-outline" size={20} color={palette.textMuted} /></Pressable>
      </View>
      <View style={styles.tabsWrap}>
        <View style={styles.tabs}>
          <TabButton label="Tổng quan" icon="grid-outline" active={tab === 'overview'} onPress={() => changeTab('overview')} />
          <TabButton label="Bệnh lý" icon="medical-outline" active={tab === 'diseases'} onPress={() => changeTab('diseases')} />
          <TabButton label="Yêu cầu" icon="clipboard-outline" badge={toProcess} active={tab === 'reviews'} onPress={() => changeTab('reviews')} />
        </View>
      </View>
      <ScrollView
        testID="doctor-scroll"
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => void refreshDoctorData()} tintColor={palette.primary} />}
      >
        {notice ? (
          <View style={styles.notice}>
            <Ionicons name="checkmark-circle" size={18} color={palette.success} />
            <Text style={styles.noticeText} accessibilityLiveRegion="polite">{notice}</Text>
          </View>
        ) : null}
        {tab === 'overview' ? (
          <Overview data={dashboard.data} loading={dashboard.isPending} online={online} toProcess={toProcess} onOpenRequests={() => changeTab('reviews')} />
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

function TabButton({ label, icon, active, badge, onPress }: { label: string; icon: keyof typeof Ionicons.glyphMap; active: boolean; badge?: number; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.tab, active && styles.tabActive]} accessibilityRole="tab" accessibilityState={{ selected: active }}>
      <Ionicons name={icon} size={16} color={active ? palette.primary : palette.textMuted} />
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
      {badge ? <View style={styles.tabBadge}><Text style={styles.tabBadgeText}>{badge > 99 ? '99+' : badge}</Text></View> : null}
    </Pressable>
  );
}

type StatKey = 'pending' | 'inReview' | 'needMoreInfo' | 'completed';
const STAT_CARDS: { key: StatKey; label: string; icon: keyof typeof Ionicons.glyphMap; color: string; soft: string }[] = [
  { key: 'pending', label: 'Đang chờ', icon: 'time-outline', color: palette.warning, soft: palette.warningSoft },
  { key: 'inReview', label: 'Đang kiểm tra', icon: 'search-outline', color: palette.primary, soft: palette.primarySoft },
  { key: 'needMoreInfo', label: 'Cần bổ sung', icon: 'chatbubble-ellipses-outline', color: palette.info, soft: palette.infoSoft },
  { key: 'completed', label: 'Đã xác nhận', icon: 'checkmark-done-outline', color: palette.success, soft: palette.successSoft },
];

function Overview({ data, loading, online, toProcess, onOpenRequests }: { data?: DoctorDashboardData; loading: boolean; online: boolean; toProcess: number; onOpenRequests: () => void }) {
  return (
    <>
      <View>
        <Text style={styles.eyebrow}>CỔNG BÁC SĨ</Text>
        <Text style={styles.title}>Tổng quan chuyên môn</Text>
        <Text style={styles.subtitle}>Chỉ các trường hợp đáp ứng chính sách rủi ro mới được chuyển đến bác sĩ.</Text>
      </View>
      {loading ? <ActivityIndicator color={palette.primary} style={{ marginTop: 24 }} /> : (
        <>
          <Pressable onPress={onOpenRequests} style={styles.hero} accessibilityRole="button" accessibilityLabel="Xem yêu cầu cần xử lý">
            <View style={{ flex: 1 }}>
              <Text style={styles.heroLabel}>Cần xử lý</Text>
              <Text style={styles.heroValue}>{toProcess}</Text>
              <Text style={styles.heroHint}>{toProcess ? 'yêu cầu đang chờ bạn kiểm tra' : 'Hiện chưa có yêu cầu mới'}</Text>
            </View>
            <View style={styles.heroAction}>
              <Text style={styles.heroActionText}>Xem yêu cầu</Text>
              <Ionicons name="arrow-forward" size={16} color={palette.primary} />
            </View>
          </Pressable>

          <View style={styles.grid}>
            {STAT_CARDS.map(({ key, label, icon, color, soft }) => (
              <View key={key} style={styles.card}>
                <View style={[styles.cardIcon, { backgroundColor: soft }]}><Ionicons name={icon} size={18} color={color} /></View>
                <Text style={styles.value}>{data?.[key] ?? 0}</Text>
                <Text style={styles.label}>{label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Danh mục bệnh lý</Text>
            <View style={styles.panelRow}>
              <View style={styles.panelStat}><Text style={styles.panelValue}>{data?.managedDiseases ?? 0}</Text><Text style={styles.label}>Bệnh lý quản lý</Text></View>
              <View style={styles.divider} />
              <View style={styles.panelStat}><Text style={[styles.panelValue, { color: palette.warning }]}>{data?.diseasesRequiringReview ?? 0}</Text><Text style={styles.label}>Bắt buộc bác sĩ</Text></View>
            </View>
          </View>
        </>
      )}
      <View style={[styles.online, online ? styles.onlineOn : null]}>
        <View style={[styles.dot, { backgroundColor: online ? palette.success : palette.textMuted }]} />
        <Text style={[styles.onlineText, online && { color: palette.success }]}>{online ? 'Đang trực · hệ thống ưu tiên giao yêu cầu cho bạn' : 'Ngoại tuyến · mở ứng dụng để nhận yêu cầu ưu tiên'}</Text>
      </View>
    </>
  );
}

function DiseaseList({ data, loading, query, setQuery }: { data: Disease[]; loading: boolean; query: string; setQuery: (value: string) => void }) {
  return (
    <>
      <View>
        <Text style={styles.eyebrow}>CHÍNH SÁCH RỦI RO</Text>
        <Text style={styles.title}>Danh mục bệnh lý</Text>
        <Text style={styles.subtitle}>Bệnh nào cần bác sĩ duyệt, bệnh nào AI được tự lập lộ trình.</Text>
      </View>
      <View style={styles.search}>
        <Ionicons name="search-outline" size={18} color={palette.textMuted} />
        <TextInput value={query} onChangeText={setQuery} placeholder="Tìm mã hoặc tên bệnh" placeholderTextColor={palette.textMuted} style={styles.searchInput} />
      </View>
      {loading ? <ActivityIndicator color={palette.primary} /> : data.length ? data.map((disease) => <DiseaseRow key={disease.id} disease={disease} />) : (
        <EmptyState icon="medical-outline" title="Chưa có bệnh lý" message={query ? 'Không tìm thấy bệnh phù hợp.' : 'Admin chưa thêm bệnh lý nào vào danh mục.'} />
      )}
    </>
  );
}

function DiseaseRow({ disease }: { disease: Disease }) {
  const color = SEVERITY_COLORS[disease.severity];
  return (
    <View style={[styles.item, { borderLeftColor: color }]}>
      <View style={styles.itemHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.itemTitle}>{disease.name}</Text>
          <Text style={styles.itemMeta}>{disease.code} · {disease.specialty || 'Chưa gán chuyên khoa'}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: `${color}18` }]}><Text style={[styles.badgeText, { color }]}>{SEVERITY_LABELS[disease.severity]}</Text></View>
      </View>
      <View style={styles.policyRow}>
        <Ionicons name={disease.doctorRequired ? 'shield-checkmark-outline' : disease.aiAllowed ? 'sparkles-outline' : 'ban-outline'} size={14} color={palette.textMuted} />
        <Text style={styles.policy}>{disease.doctorRequired ? 'Bắt buộc bác sĩ kiểm tra' : disease.aiAllowed ? 'AI được hỗ trợ theo chính sách' : 'Không cho phép AI tự tạo'}</Text>
      </View>
    </View>
  );
}

const STATUS_TONE: Record<string, string> = {
  PENDING_ASSIGNMENT: palette.warning, ASSIGNED: palette.warning, IN_REVIEW: palette.primary, NEED_MORE_INFO: palette.info,
  COMPLETED: palette.success, REJECTED: palette.danger, REVISION_REQUESTED: palette.textMuted,
};

const formatTime = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : `${date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ${date.toLocaleDateString('vi-VN')}`;
};

function ReviewList({ data, loading, error, statusFilter, onFilter, onOpen }: {
  data: DoctorReviewRequest[]; loading: boolean; error: boolean; statusFilter: string; onFilter: (value: string) => void; onOpen: (id: number) => void;
}) {
  return (
    <>
      <View>
        <Text style={styles.eyebrow}>HÀNG CHỜ KIỂM DUYỆT</Text>
        <Text style={styles.title}>Yêu cầu kiểm tra</Text>
        <Text style={styles.subtitle}>Bấm vào một yêu cầu để xem hồ sơ, lộ trình AI đề xuất và ra quyết định.</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {STATUS_FILTERS.map((filter) => (
          <Pressable key={filter.value || 'all'} onPress={() => onFilter(filter.value)} style={[styles.filter, statusFilter === filter.value && styles.filterActive]} accessibilityRole="button" accessibilityState={{ selected: statusFilter === filter.value }}>
            <Text style={[styles.filterText, statusFilter === filter.value && styles.filterTextActive]}>{filter.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {loading ? <ActivityIndicator color={palette.primary} /> : error ? (
        <Text style={styles.errorText}>Không tải được danh sách yêu cầu.</Text>
      ) : data.length ? data.map((request) => {
        const tone = STATUS_TONE[request.status] ?? palette.textMuted;
        const codes = (request.diseaseCodes || '').split(',').map((code) => code.trim()).filter(Boolean);
        return (
          <Pressable key={request.id} onPress={() => onOpen(request.id)} style={[styles.item, { borderLeftColor: tone }]} accessibilityRole="button" accessibilityLabel={`Mở yêu cầu ${request.id}`}>
            <View style={styles.itemHeader}>
              <Text style={[styles.itemTitle, { flex: 1 }]}>Yêu cầu #{request.id}</Text>
              {request.priority === 'HIGH' ? <View style={[styles.badge, { backgroundColor: palette.dangerLight }]}><Text style={[styles.badgeText, { color: palette.danger }]}>Ưu tiên</Text></View> : null}
              <View style={[styles.statusPill, { backgroundColor: `${tone}18` }]}>
                <Text style={[styles.status, { color: tone }, canDecide(request) && styles.statusOpen]}>{doctorStatusLabel(request.status)}</Text>
              </View>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="person-circle-outline" size={14} color={palette.textMuted} />
              <Text style={styles.itemMetaInline}>Người dùng #{request.userId}</Text>
              <Ionicons name="time-outline" size={13} color={palette.textMuted} style={{ marginLeft: 8 }} />
              <Text style={styles.itemMetaInline}>{formatTime(request.createdAt)}</Text>
            </View>
            {codes.length ? (
              <View style={styles.chips}>
                {codes.map((code) => <View key={code} style={styles.chip}><Text style={styles.chipText}>{code.toUpperCase().startsWith('CUSTOM:') ? `${code.slice(7)} · ngoài danh mục` : code}</Text></View>)}
              </View>
            ) : null}
            <Text style={styles.reason} numberOfLines={2}>{request.reason}</Text>
            <View style={styles.openRow}>
              {request.previousRequestId ? <Text style={styles.revision}>Bản điều chỉnh của #{request.previousRequestId}</Text> : <View />}
              <View style={styles.openLink}><Text style={styles.openText}>Xem chi tiết</Text><Ionicons name="chevron-forward" size={14} color={palette.primary} /></View>
            </View>
          </Pressable>
        );
      }) : <EmptyState icon="file-tray-outline" title="Không có yêu cầu nào" message="Yêu cầu mới sẽ tự hiện ở đây. Kéo xuống để tải lại." />}
    </>
  );
}

function EmptyState({ icon, title, message }: { icon: keyof typeof Ionicons.glyphMap; title: string; message: string }) {
  return (
    <View style={styles.emptyBox}>
      <View style={styles.emptyIcon}><Ionicons name={icon} size={26} color={palette.primary} /></View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.empty}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 12, backgroundColor: palette.surface },
  avatar: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.primary },
  headerCopy: { flex: 1, gap: 4 },
  greeting: { color: palette.text, fontSize: 16, fontWeight: '800' },
  presence: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  presenceText: { color: palette.textMuted, fontSize: 12, fontWeight: '600' },
  logout: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.bg },
  tabsWrap: { paddingHorizontal: 18, paddingBottom: 12, backgroundColor: palette.surface, borderBottomWidth: 1, borderColor: palette.border },
  tabs: { flexDirection: 'row', padding: 4, borderRadius: 14, backgroundColor: palette.bg },
  tab: { flex: 1, minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 11 },
  tabActive: { backgroundColor: palette.surface, shadowColor: '#0F172A', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  tabText: { color: palette.textMuted, fontSize: 12, fontWeight: '700' },
  tabTextActive: { color: palette.primary },
  tabBadge: { minWidth: 18, height: 18, paddingHorizontal: 5, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.danger },
  tabBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  content: { padding: 18, gap: 16 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, backgroundColor: palette.successSoft },
  noticeText: { flex: 1, color: palette.success, fontSize: 13, fontWeight: '600' },
  eyebrow: { color: palette.primary, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  title: { marginTop: 4, color: palette.text, fontSize: 24, fontWeight: '800' },
  subtitle: { marginTop: 6, color: palette.textMuted, fontSize: 13, lineHeight: 19 },
  hero: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, padding: 18, borderRadius: 18, backgroundColor: palette.primary },
  heroLabel: { color: '#DBEAFE', fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  heroValue: { marginTop: 4, color: '#FFFFFF', fontSize: 40, fontWeight: '900' },
  heroHint: { color: '#DBEAFE', fontSize: 12 },
  heroAction: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, backgroundColor: '#FFFFFF' },
  heroActionText: { color: palette.primary, fontSize: 12, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  card: { width: '48.3%', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface },
  cardIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  value: { marginTop: 12, color: palette.text, fontSize: 26, fontWeight: '900' },
  label: { marginTop: 2, color: palette.textMuted, fontSize: 12 },
  panel: { gap: 12, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface },
  panelTitle: { color: palette.text, fontSize: 14, fontWeight: '800' },
  panelRow: { flexDirection: 'row', alignItems: 'center' },
  panelStat: { flex: 1 },
  panelValue: { color: palette.text, fontSize: 22, fontWeight: '900' },
  divider: { width: 1, alignSelf: 'stretch', marginHorizontal: 12, backgroundColor: palette.border },
  online: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface },
  onlineOn: { borderColor: palette.successSoft, backgroundColor: palette.successSoft },
  dot: { width: 8, height: 8, borderRadius: 4 },
  onlineText: { flex: 1, color: palette.textMuted, fontSize: 12, fontWeight: '600' },
  search: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface },
  searchInput: { flex: 1, color: palette.text, fontSize: 14 },
  item: { gap: 10, padding: 14, borderRadius: 14, borderWidth: 1, borderLeftWidth: 4, borderColor: palette.border, backgroundColor: palette.surface },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemTitle: { color: palette.text, fontSize: 15, fontWeight: '800' },
  itemMeta: { marginTop: 4, color: palette.textMuted, fontSize: 12 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  itemMetaInline: { color: palette.textMuted, fontSize: 12 },
  badge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '800' },
  policyRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  policy: { color: palette.textMuted, fontSize: 12 },
  filters: { gap: 8, paddingRight: 12 },
  filter: { paddingHorizontal: 14, height: 34, borderRadius: 17, justifyContent: 'center', borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface },
  filterActive: { backgroundColor: palette.primary, borderColor: palette.primary },
  filterText: { color: palette.textMuted, fontSize: 12, fontWeight: '700' },
  filterTextActive: { color: '#FFFFFF' },
  statusPill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  status: { fontSize: 11, fontWeight: '800' },
  statusOpen: {},
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 7, backgroundColor: palette.bg },
  chipText: { color: palette.text, fontSize: 11, fontWeight: '700' },
  reason: { color: palette.text, fontSize: 13, lineHeight: 19 },
  openRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  revision: { color: palette.info, fontSize: 11, fontWeight: '700' },
  openLink: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  openText: { color: palette.primary, fontSize: 12, fontWeight: '800' },
  errorText: { padding: 12, borderRadius: 10, backgroundColor: palette.dangerLight, color: palette.danger, fontSize: 12 },
  emptyBox: { alignItems: 'center', gap: 8, paddingVertical: 36, paddingHorizontal: 20, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: palette.border, backgroundColor: palette.surface },
  emptyIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.primarySoft },
  emptyTitle: { color: palette.text, fontSize: 15, fontWeight: '800' },
  empty: { color: palette.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 19 },
});
