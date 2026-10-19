import Card from '@/components/ui/Card';
import Screen from '@/components/ui/Screen';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { palette, radius, spacing } from '@/theme/tokens';

export default function NutritionPage() {
  return (
    <Screen title="Dinh dưỡng" subtitle="Theo dõi các bữa ăn trong ngày" showBack>
      <View style={styles.summaryHeader}>
        <View style={styles.icon}><Ionicons name="restaurant-outline" size={22} color="#D88732" /></View>
        <View style={{ flex: 1 }}><Text style={styles.heading}>Nhật ký dinh dưỡng</Text><Text style={styles.caption}>Calories và thành phần dinh dưỡng chỉ hiển thị khi có dữ liệu thật.</Text></View>
      </View>

      <Card style={styles.emptyCard}>
        <View style={styles.emptyIcon}><Ionicons name="nutrition-outline" size={25} color={palette.primary} /></View>
        <Text style={styles.emptyTitle}>Chưa có dữ liệu bữa ăn</Text>
        <Text style={styles.emptyText}>Backend hiện chưa cung cấp API tra cứu thực phẩm hoặc ghi nhận bữa ăn. Calories và macros sẽ không được ước lượng ở đây.</Text>
      </Card>
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
