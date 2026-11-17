import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppAvatar, AppBadge, AppBottomSheet, AppButton, AppCard, AppDivider, AppHeader, AppInput, AppLoading, AppModal } from '@/components/common';
import { colors, spacing, typography } from '@/theme';

export default function DesignSystemScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  return <SafeAreaView style={styles.screen}><AppHeader title="Design System" subtitle="Shared components" /><ScrollView contentContainerStyle={styles.content}>
    <Text style={styles.section}>Buttons</Text><AppCard><View style={styles.row}><AppButton title="Primary" leftIcon={<Ionicons name="add" size={18} color={colors.textInverse} />} /><AppButton title="Outline" variant="outline" /><AppButton title="Danger" variant="danger" /></View><AppButton title="Full width loading" loading fullWidth style={styles.spaced} /></AppCard>
    <Text style={styles.section}>Cards & status</Text><AppCard><View style={styles.row}><AppAvatar name="Admin" /><View style={styles.copy}><Text style={styles.title}>Admin workspace</Text><Text style={styles.caption}>A reusable surface for every role.</Text></View><AppBadge label="Đã duyệt" tone="success" /></View><AppDivider /><Text style={styles.body}>Các component dùng chung giữ cho Admin, Doctor và User nhất quán.</Text></AppCard>
    <Text style={styles.section}>Inputs</Text><AppCard><AppInput label="Tìm kiếm" placeholder="Tên, email hoặc mã" /><AppInput label="Ghi chú" placeholder="Nhập nội dung" error="Trường này cần được kiểm tra" multiline /></AppCard>
    <Text style={styles.section}>Loading</Text><AppCard><AppLoading label="Đang đồng bộ dữ liệu" /></AppCard>
    <Text style={styles.section}>Modal & bottom sheet</Text><AppCard><View style={styles.row}><AppButton title="Mở modal" onPress={() => setModalVisible(true)} /><AppButton title="Mở bottom sheet" variant="outline" onPress={() => setSheetVisible(true)} /></View></AppCard>
    <AppModal visible={modalVisible} onRequestClose={() => setModalVisible(false)}><View style={styles.modalContent}><Text style={styles.title}>Chi tiết thao tác</Text><Text style={styles.body}>Modal dùng chung có thể đóng bằng nút hoặc chạm vùng nền.</Text><AppButton title="Đóng" fullWidth onPress={() => setModalVisible(false)} /></View></AppModal>
    <AppBottomSheet visible={sheetVisible} onRequestClose={() => setSheetVisible(false)}><View style={styles.modalContent}><Text style={styles.title}>Bộ lọc</Text><Text style={styles.body}>Bottom sheet tôn trọng vùng an toàn phía dưới iPhone.</Text><AppButton title="Xong" fullWidth onPress={() => setSheetVisible(false)} /></View></AppBottomSheet>
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: colors.background }, content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl }, section: { ...typography.label, color: colors.textSecondary, marginTop: spacing.sm }, row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }, copy: { flex: 1, minWidth: 100 }, title: { ...typography.label, color: colors.textPrimary }, caption: { ...typography.caption, color: colors.textSecondary, marginTop: 2 }, body: { ...typography.body, color: colors.textSecondary }, spaced: { marginTop: spacing.md }, modalContent: { gap: spacing.md, padding: spacing.xl } });
