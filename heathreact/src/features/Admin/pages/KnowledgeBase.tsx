import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  StatusBar,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { palette } from '@/theme/tokens';
import { navigationService } from '@/routes';
import { useUserStore } from '@/stores/user';
import {
  knowledgeAdminService,
  type KnowledgeAudit,
  type KnowledgeCategory,
  type KnowledgeDocument,
} from '@/api/services/knowledge-admin.service';

const PRIMARY = palette.primary;
const EMPTY_CATEGORIES: KnowledgeCategory[] = [];
const STATUSES = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'REVIEW', label: 'Chờ duyệt' },
  { value: 'APPROVED', label: 'Đã duyệt' },
  { value: 'REJECTED', label: 'Từ chối' },
];
const TYPES = [
  { value: 'GUIDELINE', label: 'Hướng dẫn' },
  { value: 'RESEARCH', label: 'Nghiên cứu' },
  { value: 'INTERNAL', label: 'Nội bộ' },
  { value: 'PROCEDURE', label: 'Quy trình' },
  { value: 'FAQ', label: 'FAQ' },
];

const uploadSchema = z.object({
  title: z.string().trim().min(1, 'Nhập tiêu đề tài liệu.').max(255, 'Tiêu đề tối đa 255 ký tự.'),
  description: z.string().max(2000, 'Mô tả tối đa 2000 ký tự.'),
  sourceOrganization: z.string().max(255, 'Tên nguồn tối đa 255 ký tự.'),
  sourceUrl: z.string().max(1000, 'URL/DOI tối đa 1000 ký tự.'),
  licenseName: z.string().trim().min(1, 'Ghi rõ giấy phép hoặc quyền sử dụng.').max(255, 'Giấy phép tối đa 255 ký tự.'),
  documentType: z.enum(['GUIDELINE', 'RESEARCH', 'INTERNAL', 'PROCEDURE', 'FAQ']),
});
type UploadForm = z.infer<typeof uploadSchema>;

const emptyForm: UploadForm = {
  title: '', description: '', sourceOrganization: '', sourceUrl: '', licenseName: '', documentType: 'GUIDELINE',
};

export default function KnowledgeBasePage() {
  const insets = useSafeAreaInsets();
  const role = useUserStore((state) => state.role);
  const username = useUserStore((state) => state.username);
  const logout = useUserStore((state) => state.logout);
  const { data: categoryData, error: categoryError, refetch: refetchCategories } = useQuery({
    queryKey: ['admin', 'knowledge', 'categories'],
    queryFn: knowledgeAdminService.categories,
    enabled: role === 'ROLE_ADMIN',
  });
  const { data: stats, error: statsError, refetch: refetchStats } = useQuery({
    queryKey: ['admin', 'knowledge', 'stats'],
    queryFn: knowledgeAdminService.stats,
    enabled: role === 'ROLE_ADMIN',
  });
  const [selected, setSelected] = useState<KnowledgeDocument | null>(null);
  const [audit, setAudit] = useState<KnowledgeAudit[]>([]);
  const [status, setStatus] = useState('ALL');
  const [query, setQuery] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [categoryCode, setCategoryCode] = useState('');
  const { data: documentData, error: documentError, isLoading: documentsLoading, refetch: refetchDocuments } = useQuery({
    queryKey: ['admin', 'knowledge', 'documents', status, query],
    queryFn: () => knowledgeAdminService.list(status, query),
    enabled: role === 'ROLE_ADMIN',
  });
  const categories = categoryData ?? EMPTY_CATEGORIES;
  const documents = documentData ?? [];
  const queryError = categoryError ?? statsError ?? documentError;
  const activeCategoryCode = categoryCode || categories[0]?.code || '';
  const [file, setFile] = useState<NonNullable<Awaited<ReturnType<typeof DocumentPicker.getDocumentAsync>>['assets']>[number] | null>(null);
  const { control, handleSubmit, reset, setValue, getValues, formState: { errors } } = useForm<UploadForm>({
    resolver: zodResolver(uploadSchema),
    defaultValues: emptyForm,
  });
  const documentType = useWatch({ control, name: 'documentType' });
  const [reviewNote, setReviewNote] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const focusedOnce = useRef(false);

  const load = useCallback(async () => {
    if (role !== 'ROLE_ADMIN') return;
    setRefreshing(true);
    await Promise.all([refetchCategories(), refetchStats(), refetchDocuments()]);
    setRefreshing(false);
  }, [role, refetchCategories, refetchStats, refetchDocuments]);

  useFocusEffect(useCallback(() => {
    if (focusedOnce.current) void load();
    focusedOnce.current = true;
  }, [load]));

  const openDetails = async (document: KnowledgeDocument) => {
    setBusy(true);
    setSelected(document);
    try {
      const [detail, events] = await Promise.all([
        knowledgeAdminService.get(document.id), knowledgeAdminService.audit(document.id),
      ]);
      setSelected(detail);
      setAudit(events);
      setReviewNote(detail.reviewNote || '');
    } catch (e) {
      Alert.alert('Không tải được tài liệu', e instanceof Error ? e.message : 'Thử lại sau.');
      setSelected(null);
    } finally {
      setBusy(false);
    }
  };

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/markdown'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (asset.size && asset.size > 5 * 1024 * 1024) {
        Alert.alert('Tệp quá lớn', 'Dung lượng tối đa là 5 MB.');
        return;
      }
      setFile(asset);
      if (!getValues('title').trim()) setValue('title', asset.name.replace(/\.[^.]+$/, ''));
    }
  };

  const submitUpload = async (form: UploadForm) => {
    if (!file || !activeCategoryCode || !rightsConfirmed) {
      Alert.alert('Thiếu xác nhận', !file ? 'Chọn tệp trước khi tải lên.' : !activeCategoryCode ? 'Chọn danh mục tài liệu.' : 'Xác nhận quyền sử dụng tài liệu trước khi tải lên.');
      return;
    }
    setBusy(true);
    try {
      await knowledgeAdminService.upload({ file, ...form, title: form.title.trim(), categoryCode: activeCategoryCode });
      setUploadOpen(false);
      setFile(null);
      setRightsConfirmed(false);
      reset(emptyForm);
      await load();
    } catch (e) {
      Alert.alert('Tải lên thất bại', e instanceof Error ? e.message : 'Không thể nhập tài liệu.');
    } finally {
      setBusy(false);
    }
  };

  const uploadDocument = handleSubmit(submitUpload);

  const review = async (action: 'APPROVE' | 'REJECT') => {
    if (!selected) return;
    if (action === 'REJECT' && !reviewNote.trim()) {
      Alert.alert('Cần lý do', 'Nhập lý do từ chối trong ô ghi chú.');
      return;
    }
    setBusy(true);
    try {
      const updated = await knowledgeAdminService.review(selected.id, action, reviewNote);
      setSelected(updated);
      setAudit(await knowledgeAdminService.audit(updated.id));
      await load();
    } catch (e) {
      Alert.alert('Không cập nhật được', e instanceof Error ? e.message : 'Thử lại sau.');
    } finally {
      setBusy(false);
    }
  };

  const archive = (document: KnowledgeDocument) => Alert.alert(
    'Lưu trữ tài liệu?', `Tài liệu “${document.title}” sẽ ẩn khỏi danh sách quản lý. File gốc vẫn được giữ.`,
    [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Lưu trữ', style: 'destructive', onPress: async () => {
        setBusy(true);
        try { await knowledgeAdminService.archive(document.id); setSelected(null); await load(); }
        catch (e) { Alert.alert('Không lưu trữ được', e instanceof Error ? e.message : 'Thử lại sau.'); }
        finally { setBusy(false); }
      } },
    ],
  );

  if (role !== 'ROLE_ADMIN') {
    return <SafeAreaView style={styles.screen}><View style={styles.denied}>
      <Ionicons name="lock-closed-outline" size={30} color="#64748B" />
      <Text style={styles.title}>Chỉ dành cho quản trị viên</Text>
      <Pressable onPress={() => navigationService.goBack()}><Text style={styles.link}>Quay lại</Text></Pressable>
    </View></SafeAreaView>;
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent />
      <View style={[styles.adminHeader, { paddingTop: insets.top + 8 }]}>
        <View style={styles.adminBrandIcon}><Ionicons name="library" size={20} color={PRIMARY} /></View>
        <View style={styles.adminHeaderCopy}>
          <Text style={styles.adminBrand}>HEALTH ASSISTANT</Text>
          <Text style={styles.adminIdentity} numberOfLines={1}>Quản trị viên · {username || 'admin'}</Text>
        </View>
        <Pressable onPress={() => void logout()} style={styles.logoutButton} accessibilityRole="button" accessibilityLabel="Đăng xuất">
          <Ionicons name="log-out-outline" size={20} color="#475569" />
        </Pressable>
      </View>
      <ScrollView
        style={styles.adminScroll}
        contentContainerStyle={[styles.content, { paddingBottom: 28 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={PRIMARY} />}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.pageHeading}>
          <View style={styles.headingCopy}>
            <Text style={styles.eyebrow}>KHU VỰC QUẢN TRỊ</Text>
            <Text style={styles.title}>Dữ liệu kiến thức</Text>
            <Text style={styles.subtitle}>Quản lý tài liệu nhập, nguồn và kiểm duyệt</Text>
          </View>
        <Pressable onPress={() => { setFile(null); setRightsConfirmed(false); reset(emptyForm); setUploadOpen(true); }} style={styles.addButton} accessibilityLabel="Nhập tài liệu">
            <Ionicons name="add" size={22} color="#FFFFFF" /><Text style={styles.addText}>Nhập</Text>
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          <Stat label="Tổng" value={stats?.total ?? 0} color="#0F766E" />
          <Stat label="Chờ duyệt" value={stats?.awaitingReview ?? 0} color="#B45309" />
          <Stat label="Đã duyệt" value={stats?.approved ?? 0} color="#22A982" />
          <Stat label="Từ chối" value={stats?.rejected ?? 0} color="#B91C1C" />
        </View>

        <View style={styles.notice}>
          <Ionicons name="information-circle-outline" size={19} color="#0369A1" />
          <Text style={styles.noticeText}>Duyệt tài liệu chỉ lưu trạng thái kiểm duyệt; RAG/vector search chưa được kết nối với AI.</Text>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color="#64748B" />
          <TextInput value={searchDraft} onChangeText={setSearchDraft} placeholder="Tìm theo tên, file hoặc nguồn" placeholderTextColor="#94A3B8" style={styles.searchInput} returnKeyType="search" onSubmitEditing={() => setQuery(searchDraft)} />
          {searchDraft.length > 0 && <Pressable onPress={() => { setSearchDraft(''); setQuery(''); }}><Ionicons name="close-circle" size={18} color="#94A3B8" /></Pressable>}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {STATUSES.map((item) => <FilterChip key={item.value} label={item.label} active={status === item.value} onPress={() => setStatus(item.value)} />)}
        </ScrollView>

        <Text style={styles.sectionTitle}>Tài liệu ({documents.length})</Text>
        {queryError ? <Text style={styles.error}>{queryError instanceof Error ? queryError.message : 'Không thể tải danh sách tài liệu.'}</Text> : null}
        {documentsLoading ? <View style={styles.loadingList}><ActivityIndicator color={PRIMARY} /><Text style={styles.emptyText}>Đang tải danh sách tài liệu...</Text></View> : documents.length === 0 ? <View style={styles.empty}>
          <Ionicons name="documents-outline" size={28} color="#94A3B8" />
          <Text style={styles.emptyTitle}>Chưa có tài liệu phù hợp</Text>
          <Text style={styles.emptyText}>Nhập PDF, DOCX, TXT hoặc Markdown để bắt đầu.</Text>
        </View> : documents.map((document) => <DocumentRow key={document.id} item={document} onPress={() => void openDetails(document)} onArchive={() => archive(document)} />)}
      </ScrollView>

      <View style={[styles.adminFooter, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <View style={styles.footerActiveIcon}><Ionicons name="library" size={19} color={PRIMARY} /></View>
        <Text style={styles.footerActiveText}>Kho tri thức</Text>
        <View style={styles.footerDivider} />
        <Text style={styles.footerRole}>ADMIN</Text>
      </View>

      <Modal visible={uploadOpen} animationType="slide" onRequestClose={() => setUploadOpen(false)}>
        <SafeAreaView style={styles.modalScreen}>
          <ModalHeader title="Nhập tài liệu" onClose={() => setUploadOpen(false)} />
          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.fieldLabel}>Tệp nguồn</Text>
            <Pressable style={styles.filePicker} onPress={() => void pickFile()}>
              <Ionicons name="cloud-upload-outline" size={22} color={PRIMARY} />
              <View style={{ flex: 1 }}><Text style={styles.fileName}>{file?.name || 'Chọn PDF, DOCX, TXT hoặc MD'}</Text><Text style={styles.fileMeta}>{file ? `${formatBytes(file.size || 0)} · tối đa 5 MB` : 'Tệp lưu riêng trong backend'}</Text></View>
              <Ionicons name="folder-open-outline" size={20} color="#64748B" />
            </Pressable>

            <Text style={styles.fieldLabel}>Tiêu đề *</Text>
            <Controller control={control} name="title" render={({ field: { onChange, onBlur, value } }) => <Field value={value} onChangeText={onChange} onBlur={onBlur} placeholder="Ví dụ: Hướng dẫn dinh dưỡng cơ bản" />} />
            {errors.title ? <Text style={styles.fieldError}>{errors.title.message}</Text> : null}
            <Text style={styles.fieldLabel}>Danh mục *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipList}>
              {categories.map((category) => <FilterChip key={category.code} label={category.name} active={activeCategoryCode === category.code} onPress={() => setCategoryCode(category.code)} />)}
            </ScrollView>
            <Text style={styles.fieldLabel}>Loại tài liệu</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipList}>
              {TYPES.map((type) => <FilterChip key={type.value} label={type.label} active={documentType === type.value} onPress={() => setValue('documentType', type.value as UploadForm['documentType'], { shouldDirty: true })} />)}
            </ScrollView>
            <Text style={styles.fieldLabel}>Mô tả</Text>
            <Controller control={control} name="description" render={({ field: { onChange, onBlur, value } }) => <Field value={value} onChangeText={onChange} onBlur={onBlur} placeholder="Tóm tắt nội dung và phạm vi áp dụng" multiline />} />
            {errors.description ? <Text style={styles.fieldError}>{errors.description.message}</Text> : null}
            <Text style={styles.fieldLabel}>Tổ chức / tác giả nguồn</Text>
            <Controller control={control} name="sourceOrganization" render={({ field: { onChange, onBlur, value } }) => <Field value={value} onChangeText={onChange} onBlur={onBlur} placeholder="Tên tổ chức hoặc tác giả" />} />
            {errors.sourceOrganization ? <Text style={styles.fieldError}>{errors.sourceOrganization.message}</Text> : null}
            <Text style={styles.fieldLabel}>URL / DOI nguồn</Text>
            <Controller control={control} name="sourceUrl" render={({ field: { onChange, onBlur, value } }) => <Field value={value} onChangeText={onChange} onBlur={onBlur} placeholder="https://..." autoCapitalize="none" />} />
            {errors.sourceUrl ? <Text style={styles.fieldError}>{errors.sourceUrl.message}</Text> : null}
            <Text style={styles.fieldLabel}>Giấy phép / quyền sử dụng *</Text>
            <Controller control={control} name="licenseName" render={({ field: { onChange, onBlur, value } }) => <Field value={value} onChangeText={onChange} onBlur={onBlur} placeholder="Ví dụ: CC BY 4.0 / tài liệu được phép sử dụng" />} />
            {errors.licenseName ? <Text style={styles.fieldError}>{errors.licenseName.message}</Text> : null}
            <Pressable
              onPress={() => setRightsConfirmed((value) => !value)}
              style={styles.rightsConsent}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: rightsConfirmed }}
            >
              <View style={[styles.consentBox, rightsConfirmed && styles.consentBoxChecked]}>
                {rightsConfirmed ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
              </View>
              <Text style={styles.rightsText}>Tôi có quyền sử dụng tài liệu và xác nhận tài liệu không chứa hồ sơ sức khỏe định danh.</Text>
            </Pressable>
            <Pressable disabled={busy || !rightsConfirmed} onPress={() => void uploadDocument()} style={[styles.primaryButton, (busy || !rightsConfirmed) && styles.disabled]}>
              {busy ? <ActivityIndicator color="#FFF" /> : <><Ionicons name="cloud-upload-outline" size={18} color="#FFF" /><Text style={styles.primaryButtonText}>Tải lên và trích xuất</Text></>}
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={Boolean(selected)} animationType="slide" onRequestClose={() => setSelected(null)}>
        <SafeAreaView style={styles.modalScreen}>
          {selected && <>
            <ModalHeader title="Chi tiết tài liệu" onClose={() => setSelected(null)} />
            {busy ? <ActivityIndicator style={{ marginTop: 30 }} color={PRIMARY} /> : <ScrollView contentContainerStyle={styles.modalContent}>
              <View style={styles.detailHeading}><StatusBadge status={selected.status} /><Text style={styles.detailTitle}>{selected.title}</Text><Text style={styles.fileMeta}>{selected.originalFilename} · {formatBytes(selected.fileSizeBytes)}</Text></View>
              <View style={styles.detailFacts}>
                <Fact label="Danh mục" value={selected.categoryName} /><Fact label="Loại" value={typeLabel(selected.documentType)} /><Fact label="Đoạn trích" value={`${selected.chunkCount}`} /><Fact label="MIME phát hiện" value={selected.detectedMime} />
              </View>
              {selected.description ? <Text style={styles.detailDescription}>{selected.description}</Text> : null}
              {selected.sourceOrganization ? <Fact label="Nguồn" value={selected.sourceOrganization} /> : null}
              {selected.sourceUrl ? <Fact label="URL / DOI" value={selected.sourceUrl} /> : null}
              {selected.licenseName ? <Fact label="Giấy phép" value={selected.licenseName} /> : <Text style={styles.warningText}>Chưa ghi thông tin giấy phép.</Text>}
              <View style={styles.hashBox}><Text style={styles.hashLabel}>SHA-256</Text><Text selectable style={styles.hashText}>{selected.fileSha256}</Text></View>
              <Text style={styles.sectionTitle}>Nội dung trích xuất</Text>
              <Text selectable style={styles.previewText}>{selected.extractedText || 'Không có văn bản.'}</Text>
              <Text style={styles.sectionTitle}>Lịch sử</Text>
              {audit.map((event) => <View key={event.id} style={styles.auditRow}><View style={styles.auditDot} /><View style={{ flex: 1 }}><Text style={styles.auditAction}>{event.action}</Text><Text style={styles.auditMeta}>Admin #{event.actorId} · {new Date(event.createdAt).toLocaleString('vi-VN')}</Text>{event.details ? <Text style={styles.auditMeta}>{event.details}</Text> : null}</View></View>)}
              {selected.status === 'REVIEW' && <>
                <Text style={styles.fieldLabel}>Ghi chú duyệt / lý do từ chối</Text>
                <Field value={reviewNote} placeholder="Bắt buộc nếu từ chối" onChangeText={setReviewNote} multiline />
                <View style={styles.reviewActions}>
                  <Pressable disabled={busy} onPress={() => void review('REJECT')} style={styles.rejectButton}><Ionicons name="close-circle-outline" size={18} color="#B91C1C" /><Text style={styles.rejectText}>Từ chối</Text></Pressable>
                  <Pressable disabled={busy} onPress={() => void review('APPROVE')} style={styles.approveButton}><Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" /><Text style={styles.primaryButtonText}>Duyệt nội dung</Text></Pressable>
                </View>
              </>}
              <Pressable onPress={() => archive(selected)} style={styles.archiveButton}><Ionicons name="archive-outline" size={17} color="#475569" /><Text style={styles.archiveText}>Lưu trữ tài liệu</Text></Pressable>
            </ScrollView>}
          </>}
        </SafeAreaView>
      </Modal>
    </View>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return <View style={styles.stat}><Text style={[styles.statValue, { color }]}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}
function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.filterChip, active && styles.filterChipActive]}><Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text></Pressable>;
}
function DocumentRow({ item, onPress, onArchive }: { item: KnowledgeDocument; onPress: () => void; onArchive: () => void }) {
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.documentRow, pressed && styles.pressed]}>
    <View style={styles.documentIcon}><Ionicons name="document-text-outline" size={20} color="#0F766E" /></View>
    <View style={styles.documentInfo}>
      <Text style={styles.documentTitle} numberOfLines={2}>{item.title}</Text>
      <Text style={styles.documentMeta} numberOfLines={1}>{item.categoryName} · {item.originalFilename}</Text>
      <View style={styles.documentBottom}><StatusBadge status={item.status} /><Text style={styles.documentMeta}>{item.chunkCount} đoạn · {formatBytes(item.fileSizeBytes)}</Text></View>
    </View>
    <Pressable onPress={(event) => { event.stopPropagation(); onArchive(); }} hitSlop={10} style={styles.rowAction} accessibilityLabel="Lưu trữ tài liệu">
      <Ionicons name="ellipsis-vertical" size={18} color="#64748B" />
    </Pressable>
  </Pressable>;
}
function StatusBadge({ status }: { status: string }) {
  const config = status === 'APPROVED' ? { label: 'Đã duyệt', color: '#15803D', bg: '#DCFCE7' } : status === 'REJECTED' ? { label: 'Từ chối', color: '#B91C1C', bg: '#FEE2E2' } : { label: 'Chờ duyệt', color: '#B45309', bg: '#FEF3C7' };
  return <View style={[styles.statusBadge, { backgroundColor: config.bg }]}><Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text></View>;
}
function Field(props: React.ComponentProps<typeof TextInput>) {
  return <TextInput {...props} placeholderTextColor="#94A3B8" style={[styles.input, props.multiline && styles.multiline]} />;
}
function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return <View style={styles.modalHeader}><Pressable onPress={onClose} style={styles.iconButton}><Ionicons name="close" size={22} color="#17212B" /></Pressable><Text style={styles.modalTitle}>{title}</Text><View style={styles.iconButton} /></View>;
}
function Fact({ label, value }: { label: string; value: string }) {
  return <View style={styles.fact}><Text style={styles.factLabel}>{label}</Text><Text selectable style={styles.factValue}>{value}</Text></View>;
}
function formatBytes(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function typeLabel(value: string) { return TYPES.find((type) => type.value === value)?.label || value; }

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7F8FC' },
  modalScreen: { flex: 1, backgroundColor: '#F7F8FC' },
  adminHeader: { minHeight: 68, paddingHorizontal: 16, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: '#FFFFFF', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#DCE4E0' },
  adminBrandIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EFEEFF' },
  adminHeaderCopy: { flex: 1 },
  adminBrand: { color: '#20213A', fontSize: 11, fontWeight: '800' },
  adminIdentity: { marginTop: 3, color: '#7A8099', fontSize: 11 },
  logoutButton: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEF0F8' },
  adminScroll: { flex: 1 },
  adminFooter: { minHeight: 54, paddingTop: 8, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  footerActiveIcon: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  footerActiveText: { color: PRIMARY, fontSize: 12, fontWeight: '700' },
  footerDivider: { flex: 1 },
  footerRole: { color: '#64748B', fontSize: 10, fontWeight: '800' },
  pageHeading: { minHeight: 76, marginTop: 16, marginBottom: 4, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headingCopy: { flex: 1 },
  eyebrow: { color: PRIMARY, fontSize: 10, fontWeight: '800', marginBottom: 5 },
  title: { fontSize: 19, fontWeight: '700', color: '#20213A' },
  subtitle: { marginTop: 2, fontSize: 12, color: '#7A8099' },
  iconButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  addButton: { height: 38, paddingHorizontal: 12, borderRadius: 10, backgroundColor: PRIMARY, flexDirection: 'row', alignItems: 'center', gap: 5 },
  addText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  content: { paddingHorizontal: 16, paddingBottom: 38, gap: 14 },
  statsRow: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, minWidth: 0, paddingVertical: 12, paddingHorizontal: 7, backgroundColor: '#FFFFFF', borderColor: '#E8EAF4', borderWidth: 1, borderRadius: 14, alignItems: 'center' },
  statValue: { fontSize: 21, fontWeight: '700' }, statLabel: { marginTop: 4, color: '#7A8099', fontSize: 10, textAlign: 'center' },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, padding: 12, borderRadius: 14, backgroundColor: '#EAF8FF', borderColor: '#CDEFFF', borderWidth: 1 },
  noticeText: { flex: 1, color: '#315C7A', fontSize: 12, lineHeight: 18 },
  searchBox: { height: 46, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E8EAF4' },
  searchInput: { flex: 1, color: '#20213A', fontSize: 14 },
  filters: { gap: 8, paddingRight: 12 },
  filterChip: { paddingHorizontal: 12, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E8EAF4' },
  filterChipActive: { backgroundColor: '#EFEEFF', borderColor: '#D8D4FF' },
  filterText: { fontSize: 12, color: '#656B87', fontWeight: '600' }, filterTextActive: { color: '#4438CA' },
  sectionTitle: { marginTop: 4, color: '#20213A', fontSize: 16, fontWeight: '700' },
  error: { padding: 12, color: '#B91C1C', backgroundColor: '#FEE2E2', borderRadius: 8 },
  fieldError: { marginTop: -5, color: '#B91C1C', fontSize: 11 },
  loadingList: { minHeight: 120, alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8E5' },
  empty: { alignItems: 'center', paddingVertical: 36, gap: 8, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E8EAF4' },
  emptyTitle: { color: '#363955', fontWeight: '700', fontSize: 14 }, emptyText: { color: '#7A8099', fontSize: 12, textAlign: 'center', paddingHorizontal: 18 },
  documentRow: { padding: 12, minHeight: 92, flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E8EAF4', borderRadius: 14 },
  pressed: { opacity: 0.82 },
  documentIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EFEEFF' },
  documentInfo: { flex: 1, gap: 5 }, documentTitle: { color: '#20213A', fontSize: 14, lineHeight: 19, fontWeight: '700' },
  documentMeta: { color: '#7A8099', fontSize: 11 }, documentBottom: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  rowAction: { width: 30, height: 34, alignItems: 'center', justifyContent: 'center' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }, statusText: { fontSize: 10, fontWeight: '700' },
  modalHeader: { minHeight: 56, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#DCE4E0' },
  modalTitle: { color: '#17212B', fontSize: 16, fontWeight: '700' }, modalContent: { padding: 16, paddingBottom: 40, gap: 10 },
  fieldLabel: { marginTop: 7, color: '#334155', fontSize: 12, fontWeight: '700' },
  filePicker: { minHeight: 64, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderStyle: 'dashed', borderColor: '#9CB9A8' },
  fileName: { color: '#17212B', fontSize: 13, fontWeight: '600' }, fileMeta: { color: '#64748B', fontSize: 11, marginTop: 3 },
  input: { minHeight: 44, paddingHorizontal: 12, paddingVertical: 10, color: '#17212B', fontSize: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE4E0', borderRadius: 8 },
  multiline: { minHeight: 84, textAlignVertical: 'top' }, chipList: { gap: 8, paddingRight: 12 },
  rightsText: { marginTop: 4, color: '#64748B', fontSize: 11, lineHeight: 16 },
  rightsConsent: { minHeight: 44, marginTop: 8, flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  consentBox: { width: 20, height: 20, marginTop: 1, borderWidth: 1, borderColor: '#94A3B8', borderRadius: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  consentBoxChecked: { borderColor: PRIMARY, backgroundColor: PRIMARY },
  primaryButton: { minHeight: 46, marginTop: 8, borderRadius: 12, backgroundColor: PRIMARY, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' }, disabled: { opacity: 0.65 },
  detailHeading: { gap: 8 }, detailTitle: { color: '#17212B', fontSize: 21, lineHeight: 27, fontWeight: '700' },
  detailFacts: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, fact: { minWidth: '45%', flexGrow: 1, gap: 3, paddingVertical: 6 }, factLabel: { color: '#64748B', fontSize: 11 }, factValue: { color: '#334155', fontSize: 13, fontWeight: '600' },
  detailDescription: { color: '#475569', fontSize: 13, lineHeight: 19 }, warningText: { color: '#B45309', fontSize: 12 },
  hashBox: { padding: 10, backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8E5' }, hashLabel: { color: '#64748B', fontSize: 10 }, hashText: { marginTop: 5, color: '#334155', fontSize: 11 },
  previewText: { maxHeight: 300, padding: 12, overflow: 'hidden', backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8E5', color: '#334155', fontSize: 12, lineHeight: 18 },
  auditRow: { flexDirection: 'row', gap: 10, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#E8EAF4' }, auditDot: { width: 8, height: 8, marginTop: 5, borderRadius: 4, backgroundColor: PRIMARY }, auditAction: { color: '#363955', fontSize: 12, fontWeight: '700' }, auditMeta: { marginTop: 3, color: '#7A8099', fontSize: 11, lineHeight: 16 },
  reviewActions: { flexDirection: 'row', gap: 10, marginTop: 4 }, rejectButton: { minHeight: 44, flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 8, backgroundColor: '#FEE2E2' }, rejectText: { color: '#B91C1C', fontWeight: '700', fontSize: 13 }, approveButton: { minHeight: 44, flex: 1.4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 8, backgroundColor: palette.success },
  archiveButton: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8 }, archiveText: { color: '#475569', fontSize: 13, fontWeight: '600' },
  denied: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 }, link: { color: PRIMARY, fontWeight: '700' },
});
