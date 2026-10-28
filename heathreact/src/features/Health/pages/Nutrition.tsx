import Card from '@/components/ui/Card';
import Screen from '@/components/ui/Screen';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { palette, radius, spacing } from '@/theme/tokens';
import { nutritionService, MealLogEntry } from '@/api/services/nutrition.service';
import { navigationService } from '@/routes';

export default function NutritionPage() {
  const [entries, setEntries] = useState<MealLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    void nutritionService.listMine(now.toISOString().slice(0, 10))
      .then(setEntries)
      .catch(() => setError('Không thể tải nhật ký bữa ăn.'))
      .finally(() => setLoading(false));
  }, []);

  const mealNames = { BREAKFAST: 'Buổi sáng', LUNCH: 'Buổi chiều', DINNER: 'Buổi tối' };
  return (
    <Screen title="Dinh dưỡng" subtitle="Theo dõi các bữa ăn trong ngày" showBack>
      <View style={styles.summaryHeader}>
        <View style={styles.icon}><Ionicons name="restaurant-outline" size={22} color="#D88732" /></View>
        <View style={{ flex: 1 }}><Text style={styles.heading}>Nhật ký dinh dưỡng</Text><Text style={styles.caption}>Calories và thành phần dinh dưỡng chỉ hiển thị khi có dữ liệu thật.</Text></View>
      </View>
      <Pressable onPress={() => navigationService.navigate('Roadmap')} accessibilityRole="button" style={{ minHeight: 52, paddingHorizontal: 12, marginBottom: 12, borderRadius: 8, borderWidth: 1, borderColor: palette.border, flexDirection: 'row', alignItems: 'center', gap: 9 }}>
        <Ionicons name="calendar-outline" size={18} color={palette.primary} /><Text style={{ flex: 1, color: palette.text, fontSize: 12, fontWeight: '700' }}>Mở lịch ăn và phân tích bữa theo ngày</Text><Ionicons name="chevron-forward" size={17} color={palette.primary} />
      </Pressable>

      {loading ? <Card style={styles.emptyCard}><Text style={styles.emptyText}>Đang tải nhật ký...</Text></Card> : null}
      {error ? <Card style={styles.emptyCard}><Text style={styles.emptyText}>{error}</Text></Card> : null}
      {!loading && !error && entries.length === 0 ? <Card style={styles.emptyCard}>
        <View style={styles.emptyIcon}><Ionicons name="nutrition-outline" size={25} color={palette.primary} /></View>
        <Text style={styles.emptyTitle}>Chưa có dữ liệu bữa ăn</Text>
        <Text style={styles.emptyText}>Sau khi phân tích ảnh và tiếp tục qua một ca ăn, nhận xét sẽ xuất hiện tại đây. Chưa có dữ liệu thành phần để tính calories hoặc macros.</Text>
      </Card> : null}
      {entries.map((entry) => <Card key={entry.id}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
          <Text style={{ color: palette.text, fontWeight: '800' }}>{mealNames[entry.mealType] ?? 'Bữa ăn'}</Text>
          <Text style={{ color: palette.textMuted, fontSize: 11 }}>{new Date(entry.loggedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
        </View>
        <Text style={{ color: palette.textMuted, fontSize: 11, marginTop: 4 }}>{entry.status === 'REVIEWED' ? `Đã xem nhận xét${entry.reviewedAt ? ` · ${new Date(entry.reviewedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}` : 'Đang chờ xem nhận xét'} · {entry.status}</Text>
        {entry.photoUrl ? <Image source={{ uri: entry.photoUrl }} accessibilityLabel={`Ảnh ${entry.dishName ?? 'món ăn'}`} resizeMode="cover" style={{ width: '100%', height: 164, marginTop: 9, borderRadius: 7 }} /> : null}
        {entry.dishName ? <Text style={{ color: palette.text, fontWeight: '700', marginTop: 9 }}>{entry.dishName}</Text> : null}
        {entry.analysis ? <>
          <Text style={{ color: palette.primary, fontWeight: '800', fontSize: 12, marginTop: 9 }}>{entry.analysis.fitStatus === 'FIT' ? 'Phù hợp' : entry.analysis.fitStatus === 'ADJUST' ? 'Cần điều chỉnh' : 'Chưa đủ dữ liệu'}</Text>
          {entry.analysis.identifiedFoods.map((food, index) => <Text key={`${food.name}-${index}`} style={{ color: palette.textMuted, fontSize: 11, lineHeight: 17, marginTop: 4 }}>{food.name} · {food.confidence}{food.portionEstimate ? ` · ${food.portionEstimate}` : ''}</Text>)}
          <Text style={{ color: palette.text, fontSize: 12, lineHeight: 18, marginTop: 7 }}>{entry.analysis.summary}</Text>
          {entry.analysis.nutritionEstimate.available ? <Text style={{ color: palette.primary, fontSize: 10, lineHeight: 15, marginTop: 7 }}>Ước tính {entry.analysis.nutritionEstimate.caloriesMin}–{entry.analysis.nutritionEstimate.caloriesMax} kcal · đạm {entry.analysis.nutritionEstimate.proteinMinG}–{entry.analysis.nutritionEstimate.proteinMaxG} g</Text> : null}
          {entry.analysis.knowledgeSources.length ? <Text style={{ color: palette.textMuted, fontSize: 10, lineHeight: 15, marginTop: 7 }}>Knowledge Base: {entry.analysis.knowledgeSources.map((source) => source.title).join(', ')}</Text> : null}
        </> : null}
        {entry.notes && !entry.analysis ? <Text style={{ color: palette.text, fontSize: 12, lineHeight: 18, marginTop: 9 }}>{entry.notes}</Text> : null}
      </Card>)}
    </Screen>
  );
}

const styles = StyleSheet.create({
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  icon: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: '#FFF4E8' },
  heading: { color: palette.text, fontSize: 17, fontWeight: '800' },
  caption: { color: palette.textMuted, fontSize: 11, lineHeight: 16, marginTop: 3 },
  emptyCard: { minHeight: 190, justifyContent: 'center', alignItems: 'center', gap: 9, padding: spacing.xl },
  emptyIcon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: palette.primarySoft },
  emptyTitle: { color: palette.text, fontSize: 15, fontWeight: '800', textAlign: 'center' },
  emptyText: { color: palette.textMuted, fontSize: 12, lineHeight: 18, textAlign: 'center' },
});
