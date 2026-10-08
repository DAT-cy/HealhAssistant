import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { navigationService } from '@/routes';
import { useUserStore } from '@/stores/user';

const C = { bg: '#0B0F14', surface: '#131A22', raised: '#1B242E', border: '#2A3542', text: '#F2F5F8', muted: '#9AA7B4', green: '#22C55E', blue: '#38BDF8', orange: '#F59E0B' };

function Stat({ icon, value, label, color }: { icon: keyof typeof Ionicons.glyphMap; value: string; label: string; color: string }) {
  return <View style={styles.stat}><View style={[styles.statIcon, { backgroundColor: `${color}20` }]}><Ionicons name={icon} size={18} color={color} /></View><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

function Action({ icon, title, detail, color, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; detail: string; color: string; onPress: () => void }) {
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.action, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel={title}><View style={[styles.actionIcon, { backgroundColor: `${color}20` }]}><Ionicons name={icon} size={23} color={color} /></View><View style={styles.actionCopy}><Text style={styles.actionTitle}>{title}</Text><Text style={styles.actionDetail}>{detail}</Text></View><Ionicons name="chevron-forward" size={20} color={C.muted} /></Pressable>;
}

export default function HomePage() {
  const insets = useSafeAreaInsets();
  const username = useUserStore((s) => s.username);
  const logout = useUserStore((s) => s.logout);
  const firstName = username?.split(' ')[0] || 'bạn';

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 88 }}>
        <View style={styles.header}><View><Text style={styles.eyebrow}>HEALTH ASSISTANT</Text><Text style={styles.greeting}>Chào {firstName} 👋</Text><Text style={styles.subheading}>Sẵn sàng cho một ngày khỏe mạnh?</Text></View><Pressable onPress={() => void logout()} style={styles.avatar} accessibilityRole="button" accessibilityLabel="Đăng xuất"><Text style={styles.avatarText}>{firstName.charAt(0).toUpperCase()}</Text></Pressable></View>
        <View style={styles.streak}><View style={styles.streakRow}><View style={styles.fire}><Ionicons name="flame" size={22} color={C.orange} /></View><View><Text style={styles.mutedSmall}>Chuỗi tập luyện</Text><Text style={styles.streakValue}>3 ngày liên tiếp</Text></View></View><View style={styles.track}><View style={styles.fill} /></View><Text style={styles.mutedSmall}>2 / 4 mục tiêu hôm nay</Text></View>
        <Text style={styles.sectionTitle}>Tổng quan tuần này</Text><View style={styles.statsRow}><Stat icon="fitness" value="4" label="Buổi tập" color={C.green} /><Stat icon="time" value="86" label="Phút tập" color={C.blue} /><Stat icon="trending-up" value="82%" label="Tiến độ" color={C.orange} /></View>
        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Lối tắt</Text><Pressable onPress={() => navigationService.navigate('Roadmap')}><Text style={styles.link}>Xem kế hoạch</Text></Pressable></View>
        <Action icon="person-outline" title="Hồ sơ của bạn" detail="Cập nhật mục tiêu và thể trạng" color="#A78BFA" onPress={() => navigationService.navigate('Profile')} />
        <Action icon="scan-outline" title="Quét tư thế" detail="Kiểm tra tư thế trong 60 giây" color={C.blue} onPress={() => navigationService.navigate('Scan')} />
        <Action icon="barbell-outline" title="Bài tập hôm nay" detail="Tập trung vào sức mạnh và độ linh hoạt" color={C.green} onPress={() => navigationService.navigate('DailyPlan')} />
        <Action icon="chatbubble-ellipses-outline" title="Hỏi huấn luyện viên AI" detail="Nhận lời khuyên phù hợp với bạn" color="#A78BFA" onPress={() => navigationService.navigate('Coach')} />
        <View style={styles.safety}><Ionicons name="shield-checkmark-outline" size={18} color={C.green} /><Text style={styles.safetyText}>Công cụ hỗ trợ tập luyện, không thay thế chẩn đoán hoặc điều trị y khoa.</Text></View>
      </ScrollView>
      <View style={[styles.tabs, { paddingBottom: Math.max(insets.bottom, 10) }]}>{[['home', 'Trang chủ', true, 'Home'], ['calendar-outline', 'Kế hoạch', false, 'Roadmap'], ['analytics-outline', 'Tiến độ', false, 'Progress'], ['sparkles-outline', 'Trợ lý', false, 'Coach']].map(([icon, label, active, route]) => <Pressable key={label as string} style={styles.tab} onPress={() => !active && navigationService.navigate(route as 'Roadmap' | 'Progress' | 'Coach')} accessibilityRole="button" accessibilityLabel={label as string}><Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={21} color={active ? C.green : C.muted} /><Text style={[styles.tabText, active && styles.tabActive]}>{label}</Text></Pressable>)}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg }, header: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, eyebrow: { color: C.green, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 8 }, greeting: { color: C.text, fontSize: 26, fontWeight: '800' }, subheading: { color: C.muted, fontSize: 14, marginTop: 5 }, avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' }, avatarText: { color: C.bg, fontSize: 18, fontWeight: '800' }, streak: { marginHorizontal: 20, padding: 18, borderRadius: 16, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border }, streakRow: { flexDirection: 'row', alignItems: 'center', gap: 12 }, fire: { width: 42, height: 42, borderRadius: 13, backgroundColor: '#F59E0B20', alignItems: 'center', justifyContent: 'center' }, mutedSmall: { color: C.muted, fontSize: 12 }, streakValue: { color: C.text, fontSize: 16, fontWeight: '700', marginTop: 3 }, track: { height: 7, backgroundColor: C.raised, borderRadius: 4, marginTop: 18, marginBottom: 8 }, fill: { height: 7, width: '50%', backgroundColor: C.green, borderRadius: 4 }, sectionTitle: { color: C.text, fontSize: 18, fontWeight: '700', marginLeft: 20, marginTop: 28, marginBottom: 13 }, statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20 }, stat: { flex: 1, padding: 13, backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.border }, statIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }, statValue: { color: C.text, fontSize: 21, fontWeight: '800' }, statLabel: { color: C.muted, fontSize: 11, marginTop: 3 }, sectionHeader: { marginTop: 3, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: 20 }, link: { color: C.green, fontSize: 13, fontWeight: '700' }, action: { marginHorizontal: 20, marginBottom: 10, padding: 14, borderRadius: 14, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, flexDirection: 'row', alignItems: 'center', gap: 13 }, actionIcon: { width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, actionCopy: { flex: 1 }, actionTitle: { color: C.text, fontSize: 15, fontWeight: '700' }, actionDetail: { color: C.muted, fontSize: 12, marginTop: 4 }, pressed: { opacity: 0.7 }, safety: { margin: 8, marginHorizontal: 20, padding: 14, borderRadius: 12, backgroundColor: '#22C55E12', flexDirection: 'row', gap: 9 }, safetyText: { flex: 1, color: '#A7DDB8', fontSize: 11, lineHeight: 17 }, tabs: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#10161D', borderTopWidth: 1, borderTopColor: C.border, flexDirection: 'row', justifyContent: 'space-around', paddingTop: 11 }, tab: { alignItems: 'center', gap: 4, minWidth: 60 }, tabText: { color: C.muted, fontSize: 11 }, tabActive: { color: C.green, fontWeight: '700' },
});
