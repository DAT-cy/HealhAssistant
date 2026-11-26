import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import React, { useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { palette } from '@/theme/tokens';
import { adminService, type AdminUser } from '@/api/services/admin.service';
import { navigationService } from '@/routes';
import { useUserStore } from '@/stores/user';

const metrics = [
  ['totalUsers', 'Người dùng', 'people-outline', palette.primary],
  ['activeUsers', 'Đang hoạt động', 'pulse-outline', palette.success],
  ['totalDoctors', 'Bác sĩ', 'medkit-outline', palette.accent],
  ['totalDocuments', 'Tài liệu', 'documents-outline', palette.warning],
  ['totalRoadmaps', 'Lộ trình AI', 'map-outline', palette.primaryDark],
  ['roadmapsConfirmed', 'Đã xác nhận', 'checkmark-circle-outline', palette.success],
] as const;

export default function AdminDashboard() {
  const insets = useSafeAreaInsets();
  const username = useUserStore((state) => state.username);
  const logout = useUserStore((state) => state.logout);
  const [query, setQuery] = useState('');
  const [enabled, setEnabled] = useState<boolean | undefined>();
  const [notice, setNotice] = useState<string | null>(null);
  const dashboard = useQuery({ queryKey: ['admin', 'dashboard'], queryFn: adminService.dashboard });
  const users = useQuery({ queryKey: ['admin', 'users', query, enabled], queryFn: () => adminService.users(query, enabled) });
  const data = dashboard.data;
  const refresh = () => { void dashboard.refetch(); void users.refetch(); };

  return <SafeAreaView style={styles.screen}>
    <View style={styles.header}>
      <View style={styles.brandIcon}><Ionicons name="grid-outline" size={20} color={palette.primary} /></View>
      <View style={styles.headerCopy}><Text style={styles.brand}>HEALTH ASSISTANT</Text><Text style={styles.identity}>Quản trị viên · {username || 'admin'}</Text></View>
      <Pressable onPress={() => void logout()} accessibilityRole="button" accessibilityLabel="Đăng xuất" style={styles.iconButton}><Ionicons name="log-out-outline" size={20} color={palette.textMuted} /></Pressable>
    </View>
    <View style={styles.nav}><Pressable style={[styles.navItem, styles.navActive]} onPress={() => {}}><Ionicons name="grid" size={16} color={palette.primary} /><Text style={styles.navActiveText}>Tổng quan</Text></Pressable><Pressable style={styles.navItem} onPress={() => navigationService.navigate('AdminDiseases')}><Ionicons name="medkit-outline" size={16} color={palette.textMuted} /><Text style={styles.navText}>Bệnh lý</Text></Pressable><Pressable style={styles.navItem} onPress={() => navigationService.navigate('AdminKnowledge')}><Ionicons name="library-outline" size={16} color={palette.textMuted} /><Text style={styles.navText}>Kho tri thức</Text></Pressable><Pressable style={styles.navItem} onPress={() => navigationService.navigate('AdminExercises')}><Ionicons name="barbell-outline" size={16} color={palette.textMuted} /><Text style={styles.navText}>Bài tập</Text></Pressable><Pressable style={styles.navItem} onPress={() => navigationService.navigate('AdminDesignSystem')}><Ionicons name="color-palette-outline" size={16} color={palette.textMuted} /><Text style={styles.navText}>Design System</Text></Pressable></View>
    <ScrollView refreshControl={<RefreshControl refreshing={dashboard.isRefetching || users.isRefetching} onRefresh={refresh} tintColor={palette.primary} />} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
      <Text style={styles.eyebrow}>KHU VỰC QUẢN TRỊ</Text><Text style={styles.title}>Tổng quan hệ thống</Text><Text style={styles.subtitle}>Theo dõi dữ liệu và hoạt động vận hành từ backend.</Text>
      {dashboard.isPending ? <View style={styles.loading}><ActivityIndicator color={palette.primary} /><Text style={styles.muted}>Đang tải số liệu...</Text></View> : dashboard.isError ? <Text style={styles.error}>Không thể tải dashboard. Hãy thử lại.</Text> : <View style={styles.metricGrid}>{metrics.map(([key, label, icon, color]) => <View key={key} style={styles.metric}><View style={[styles.metricIcon, { backgroundColor: `${color}18` }]}><Ionicons name={icon as never} size={19} color={color} /></View><Text style={styles.metricValue}>{data?.[key] ?? 0}</Text><Text style={styles.metricLabel}>{label}</Text></View>)}</View>}
      <View style={styles.notice}><Ionicons name="information-circle-outline" size={19} color={palette.accent} /><Text style={styles.noticeText}>Bấm “Đặt làm bác sĩ” để cấp quyền bác sĩ cho một tài khoản. Người đó cần đăng xuất rồi đăng nhập lại để vào khu vực bác sĩ.</Text></View>{notice ? <Text style={styles.roleNotice} accessibilityLiveRegion="polite">{notice}</Text> : null}
      <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Người dùng</Text><Text style={styles.count}>{users.data?.length ?? 0} bản ghi</Text></View>
      <View style={styles.search}><Ionicons name="search-outline" size={18} color={palette.textMuted} /><TextInput value={query} onChangeText={setQuery} placeholder="Tìm tên, email, tài khoản" placeholderTextColor={palette.textMuted} style={styles.searchInput} /></View>
      <View style={styles.filterRow}><Filter label="Tất cả" active={enabled === undefined} onPress={() => setEnabled(undefined)} /><Filter label="Đang bật" active={enabled === true} onPress={() => setEnabled(true)} /><Filter label="Đã khóa" active={enabled === false} onPress={() => setEnabled(false)} /></View>
      {users.isPending ? <ActivityIndicator color={palette.primary} /> : users.data?.map((user) => <UserRow key={user.id} user={user} onChanged={(message) => { setNotice(message); void users.refetch(); void dashboard.refetch(); }} />)}
    </ScrollView>
  </SafeAreaView>;
}

const roleLabel = (role: AdminUser['role']) => (role === 'ROLE_ADMIN' ? 'Admin' : role === 'ROLE_DOCTOR' ? 'Bác sĩ' : 'Người dùng');

/** Một dòng người dùng: bật/khoá tài khoản và đổi vai trò Người dùng ⇄ Bác sĩ (có bước xác nhận). */
function UserRow({ user, onChanged }: { user: AdminUser; onChanged: (message: string) => void }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const name = user.displayName || user.username;
  const nextRole: AdminUser['role'] = user.role === 'ROLE_DOCTOR' ? 'ROLE_USER' : 'ROLE_DOCTOR';
  const run = async (action: () => Promise<unknown>, message: string) => {
    setBusy(true); setError(null);
    try { await action(); setConfirming(false); onChanged(message); }
    catch (err) { setError(err instanceof Error && err.message ? err.message : 'Không cập nhật được.'); }
    finally { setBusy(false); }
  };
  return (
    <View style={styles.userCard}>
      <View style={styles.userRowInner}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{name.slice(0, 1).toUpperCase()}</Text></View>
        <View style={styles.userCopy}>
          <Text style={styles.userName}>{name}</Text>
          <Text style={styles.userMeta}>{user.email || user.username} · {roleLabel(user.role)}</Text>
        </View>
        {user.role !== 'ROLE_ADMIN' ? (
          <Pressable disabled={busy} onPress={() => void run(() => adminService.setUserStatus(user.id, !user.enabled), `${user.enabled ? 'Đã khoá' : 'Đã mở'} tài khoản ${name}.`)} style={[styles.statusButton, user.enabled ? styles.enabled : styles.disabled]} accessibilityRole="button" accessibilityLabel={`${user.enabled ? 'Khoá' : 'Mở khoá'} ${name}`}>
            <Text style={user.enabled ? styles.enabledText : styles.disabledText}>{user.enabled ? 'Đang bật' : 'Đã khóa'}</Text>
          </Pressable>
        ) : <Text style={styles.adminLabel}>ADMIN</Text>}
      </View>
      {user.role !== 'ROLE_ADMIN' ? (
        confirming ? (
          <View style={styles.roleConfirm}>
            <Text style={styles.roleConfirmText}>{nextRole === 'ROLE_DOCTOR' ? `Cấp quyền bác sĩ cho ${name}?` : `Chuyển ${name} về người dùng thường? Người này sẽ không vào được khu vực bác sĩ.`}</Text>
            <View style={styles.roleActions}>
              <Pressable disabled={busy} onPress={() => setConfirming(false)} style={styles.roleCancel}><Text style={styles.roleCancelText}>Huỷ</Text></Pressable>
              <Pressable disabled={busy} onPress={() => void run(() => adminService.setUserRole(user.id, nextRole), `${name} giờ là ${roleLabel(nextRole)}.`)} style={styles.roleConfirmButton} accessibilityRole="button" accessibilityLabel={`Xác nhận đổi vai trò ${name}`}>
                {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.roleConfirmButtonText}>Xác nhận</Text>}
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable onPress={() => { setError(null); setConfirming(true); }} style={styles.roleButton} accessibilityRole="button" accessibilityLabel={`${nextRole === 'ROLE_DOCTOR' ? 'Đặt làm bác sĩ' : 'Đặt làm người dùng'} ${name}`}>
            <Ionicons name={nextRole === 'ROLE_DOCTOR' ? 'medkit-outline' : 'person-outline'} size={14} color={palette.primary} />
            <Text style={styles.roleButtonText}>{nextRole === 'ROLE_DOCTOR' ? 'Đặt làm bác sĩ' : 'Đặt làm người dùng'}</Text>
          </Pressable>
        )
      ) : null}
      {error ? <Text style={styles.roleError}>{error}</Text> : null}
    </View>
  );
}

function Filter({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) { return <Pressable onPress={onPress} style={[styles.filter, active && styles.filterActive]}><Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text></Pressable>; }

const styles = StyleSheet.create({
  userCard: { gap: 8, padding: 12, borderRadius: 11, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface },
  userRowInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  roleButton: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: palette.primarySoft },
  roleButtonText: { color: palette.primary, fontSize: 11, fontWeight: '800' },
  roleConfirm: { gap: 8, padding: 10, borderRadius: 9, backgroundColor: palette.warningSoft },
  roleConfirmText: { color: palette.text, fontSize: 12, lineHeight: 17 },
  roleActions: { flexDirection: 'row', gap: 8 },
  roleCancel: { flex: 1, minHeight: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface },
  roleCancelText: { color: palette.text, fontSize: 12, fontWeight: '700' },
  roleConfirmButton: { flex: 1, minHeight: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: palette.primary },
  roleConfirmButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  roleError: { color: palette.danger, fontSize: 11 },
  roleNotice: { padding: 11, borderRadius: 10, backgroundColor: palette.successSoft, color: palette.success, fontSize: 12, fontWeight: '600' },
  screen: { flex: 1, backgroundColor: palette.bg }, header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingVertical: 14, backgroundColor: palette.surface, borderBottomWidth: 1, borderColor: palette.border }, brandIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.primarySoft }, headerCopy: { flex: 1 }, brand: { color: palette.primary, fontSize: 11, fontWeight: '900', letterSpacing: 1 }, identity: { color: palette.textMuted, fontSize: 11, marginTop: 3 }, iconButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' }, nav: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 12, backgroundColor: palette.surface }, navItem: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, borderRadius: 9 }, navActive: { backgroundColor: palette.primarySoft }, navText: { color: palette.textMuted, fontSize: 12, fontWeight: '700' }, navActiveText: { color: palette.primary, fontSize: 12, fontWeight: '800' }, content: { padding: 18, gap: 12 }, eyebrow: { color: palette.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1 }, title: { color: palette.text, fontSize: 27, fontWeight: '800' }, subtitle: { color: palette.textMuted, fontSize: 13, lineHeight: 19 }, loading: { alignItems: 'center', gap: 8, paddingVertical: 32 }, muted: { color: palette.textMuted, fontSize: 12 }, error: { padding: 14, color: palette.danger, backgroundColor: palette.dangerLight, borderRadius: 10 }, metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, metric: { width: '31.8%', minHeight: 112, padding: 11, borderRadius: 12, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border }, metricIcon: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 9 }, metricValue: { marginTop: 8, color: palette.text, fontSize: 22, fontWeight: '900' }, metricLabel: { marginTop: 2, color: palette.textMuted, fontSize: 10, lineHeight: 14 }, notice: { flexDirection: 'row', gap: 8, padding: 12, borderRadius: 10, backgroundColor: palette.accentSoft }, noticeText: { flex: 1, color: palette.textMuted, fontSize: 11, lineHeight: 16 }, sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }, sectionTitle: { color: palette.text, fontSize: 18, fontWeight: '800' }, count: { color: palette.textMuted, fontSize: 11 }, search: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: palette.border, borderRadius: 9, backgroundColor: palette.surface }, searchInput: { flex: 1, color: palette.text, fontSize: 13 }, filterRow: { flexDirection: 'row', gap: 7 }, filter: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999, backgroundColor: palette.surfaceRaised }, filterActive: { backgroundColor: palette.primarySoft }, filterText: { color: palette.textMuted, fontSize: 11, fontWeight: '700' }, filterTextActive: { color: palette.primary }, userRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 11, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface }, avatar: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: palette.primarySoft }, avatarText: { color: palette.primary, fontWeight: '900' }, userCopy: { flex: 1 }, userName: { color: palette.text, fontSize: 13, fontWeight: '800' }, userMeta: { marginTop: 3, color: palette.textMuted, fontSize: 10 }, statusButton: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 8 }, enabled: { backgroundColor: '#E7F8F1' }, disabled: { backgroundColor: palette.dangerLight }, enabledText: { color: '#138A64', fontSize: 10, fontWeight: '800' }, disabledText: { color: palette.danger, fontSize: 10, fontWeight: '800' }, adminLabel: { color: palette.primary, fontSize: 10, fontWeight: '900' },
});
