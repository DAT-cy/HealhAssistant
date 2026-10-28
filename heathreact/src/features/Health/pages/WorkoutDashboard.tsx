import { dailyPlanService, type DailyPlanResponse } from '@/api/services/daily-plan.service';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import AppButton from '@/components/ui/AppButton';
import { ErrorState, LoadingState } from '@/components/ui/StateViews';
import { navigationService } from '@/routes';
import { palette, radius, spacing } from '@/theme/tokens';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Screen from '@/components/ui/Screen';

function sourceLabel(source: string) {
  if (source === 'gemini') return 'AI đề xuất';
  if (source === 'safety-rule') return 'Ưu tiên an toàn';
  if (source === 'saved-template') return 'Kế hoạch đã lưu';
  return 'Kế hoạch dự phòng';
}

export default function WorkoutDashboardPage() {
  const planQuery = useQuery<DailyPlanResponse>({
    queryKey: ['daily-plan', 'today'],
    queryFn: dailyPlanService.today,
  });
  const plan = planQuery.data;

  return (
    <Screen title="Tập luyện" subtitle="Hoạt động được đề xuất từ kế hoạch hôm nay" activeTab="Workout">
      {planQuery.isLoading ? <LoadingState label="Đang tải kế hoạch tập luyện..." /> : null}
      {planQuery.isError ? <ErrorState message={planQuery.error instanceof Error ? planQuery.error.message : 'Không thể tải kế hoạch hôm nay.'} onRetry={() => void planQuery.refetch()} /> : null}
      {plan ? <>
        <View style={styles.summaryTop}>
          <View style={styles.summaryIcon}><Ionicons name="fitness" size={22} color={palette.primary} /></View>
          <View style={styles.summaryHeading}>
            <Text style={styles.date}>{new Date(`${plan.date}T00:00:00`).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
            <Text style={styles.title}>{plan.title}</Text>
          </View>
          <Badge label={sourceLabel(plan.source)} tone={plan.source === 'gemini' ? 'success' : plan.source === 'safety-rule' ? 'warning' : 'info'} />
        </View>

        <Card style={styles.durationCard}>
          <Ionicons name="time-outline" size={19} color={palette.accent} />
          <View style={{ flex: 1 }}><Text style={styles.durationLabel}>Thời lượng đề xuất</Text><Text style={styles.durationValue}>{plan.duration}</Text></View>
          <Ionicons name="calendar-outline" size={20} color={palette.primary} />
        </Card>

        <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>Hoạt động hôm nay</Text><Text style={styles.count}>{plan.activities.length}</Text></View>
        {plan.activities.length === 0 ? <Card><Text style={styles.emptyText}>Kế hoạch hôm nay chưa có hoạt động tập luyện.</Text></Card> : plan.activities.map((activity, index) => (
          <Card key={`${index}-${activity}`} style={styles.activityCard}>
            <View style={styles.activityNumber}><Text style={styles.activityNumberText}>{String(index + 1).padStart(2, '0')}</Text></View>
            <Text style={styles.activityText}>{activity}</Text>
            <Ionicons name="ellipse-outline" size={18} color={palette.textMuted} />
          </Card>
        ))}

        {plan.safetyNotes.length ? <Card style={styles.safetyCard}>
          <View style={styles.safetyHeading}><Ionicons name="shield-checkmark-outline" size={19} color={palette.warning} /><Text style={styles.safetyTitle}>Lưu ý an toàn</Text></View>
          {plan.safetyNotes.map((note) => <Text key={note} style={styles.safetyText}>{note}</Text>)}
        </Card> : null}

        <Pressable onPress={() => navigationService.navigate('Roadmap')} style={({ pressed }) => [styles.sessionLink, pressed && styles.pressed]} accessibilityRole="button">
          <View style={styles.sessionIcon}><Ionicons name="barbell-outline" size={20} color={palette.primary} /></View>
          <View style={styles.sessionCopy}><Text style={styles.sessionTitle}>Coach gym theo lịch</Text><Text style={styles.sessionDetail}>Hướng dẫn catalog và camera chụp ảnh kiểm tra tư thế.</Text></View>
          <Ionicons name="chevron-forward" size={18} color={palette.textMuted} />
        </Pressable>
        <AppButton label="Xem kế hoạch hôm nay" variant="secondary" onPress={() => navigationService.navigate('DailyPlan')} />
      </> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  summaryTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  summaryIcon: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: palette.primarySoft },
  summaryHeading: { flex: 1, gap: 2 },
  date: { color: palette.textMuted, fontSize: 11, textTransform: 'capitalize' },
  title: { color: palette.text, fontSize: 17, fontWeight: '800' },
  durationCard: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13 },
  durationLabel: { color: palette.textMuted, fontSize: 11 },
  durationValue: { color: palette.text, fontSize: 14, fontWeight: '700', marginTop: 2 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: spacing.sm },
  sectionTitle: { color: palette.text, fontSize: 16, fontWeight: '800' },
  count: { color: palette.primary, fontSize: 12, fontWeight: '800' },
  activityCard: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 12 },
  activityNumber: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: palette.accentSoft },
  activityNumberText: { color: '#268FCB', fontSize: 11, fontWeight: '800' },
  activityText: { flex: 1, color: palette.text, fontSize: 13, lineHeight: 19 },
  safetyCard: { backgroundColor: '#FFF9EC', borderColor: '#FFE9BF' },
  safetyHeading: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 6 },
  safetyTitle: { color: '#9A641E', fontSize: 13, fontWeight: '800' },
  safetyText: { color: '#806844', fontSize: 12, lineHeight: 18, marginTop: 4 },
  sessionLink: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderWidth: 1, borderColor: palette.border, borderRadius: radius.lg, backgroundColor: palette.surface },
  sessionIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: palette.primarySoft },
  sessionCopy: { flex: 1, gap: 3 },
  sessionTitle: { color: palette.text, fontSize: 12, fontWeight: '800' },
  sessionDetail: { color: palette.textMuted, fontSize: 10, lineHeight: 14 },
  emptyText: { color: palette.textMuted, fontSize: 13, lineHeight: 19 },
  pressed: { opacity: 0.8 },
});
