import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ApiError } from '@/api/client';
import { coachService } from '@/api/services/coach.service';
import AppModal from '@/components/ui/AppModal';
import { Pressable } from '@/components/ui/Pressable';
import { palette } from '@/theme/tokens';
import { notify } from '@/utils/notify';

interface Props {
  requestId: number | null;
  onClose: () => void;
  onActivated: () => void;
}

/** Người dùng chọn 1 trong các phương án bác sĩ đã duyệt rồi kích hoạt, không phải đi lại wizard. */
export default function ApprovedPlanModal({ requestId, onClose, onActivated }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const previewQuery = useQuery({
    queryKey: ['approved-preview', requestId],
    queryFn: () => coachService.approvedPreview(requestId!),
    enabled: requestId != null,
    gcTime: 0,
    staleTime: 0,
  });
  const activateMutation = useMutation({
    mutationFn: (index: number) => coachService.activate(previewQuery.data!.previewId!, index, previewQuery.data!.options[index]?.title),
    onSuccess: (_, index) => {
      notify.success('Đã kích hoạt lộ trình bác sĩ duyệt', previewQuery.data?.options[index]?.title);
      setSelected(null);
      onActivated();
    },
    onError: (error) => notify.error('Chưa kích hoạt được', error instanceof ApiError ? error.message : 'Vui lòng thử lại.'),
  });
  const options = previewQuery.data?.options ?? [];
  const errorMessage = previewQuery.error instanceof ApiError ? previewQuery.error.message : previewQuery.isError ? 'Không tải được phương án.' : '';

  return (
    <AppModal visible={requestId != null} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>BÁC SĨ ĐÃ DUYỆT · YÊU CẦU #{requestId}</Text>
            <Text style={styles.title}>Chọn phương án để bắt đầu</Text>
          </View>
          <Pressable testID="approved-close" onPress={onClose} accessibilityRole="button" accessibilityLabel="Đóng"><Ionicons name="close" size={24} color={palette.text} /></Pressable>
        </View>
        {previewQuery.isLoading ? <ActivityIndicator style={{ marginTop: 40 }} color={palette.primary} /> : null}
        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
        <ScrollView contentContainerStyle={styles.list}>
          {options.map((option, index) => (
            <Pressable key={`${option.title}-${index}`} testID={`approved-option-${index}`} onPress={() => setSelected(index)} accessibilityRole="radio" accessibilityState={{ checked: selected === index }}
              style={[styles.option, selected === index && styles.optionSelected]}>
              <Text style={styles.optionTitle}>Phương án {index + 1}: {option.title}</Text>
              <Text style={styles.body}>{option.overview}</Text>
              {option.weeklyPlan.map((week, weekIndex) => <Text key={weekIndex} style={styles.muted}>Tuần {weekIndex + 1}: {week}</Text>)}
            </Pressable>
          ))}
        </ScrollView>
        {options.length ? (
          <Pressable testID="approved-activate" onPress={() => selected != null && activateMutation.mutate(selected)} disabled={selected == null || activateMutation.isPending} accessibilityRole="button"
            style={[styles.activate, (selected == null || activateMutation.isPending) && styles.dim]}>
            {activateMutation.isPending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.activateText}>Kích hoạt phương án đã chọn</Text>}
          </Pressable>
        ) : null}
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 18, gap: 12, backgroundColor: palette.bg },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingTop: 8 },
  eyebrow: { color: palette.success, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  title: { marginTop: 4, color: palette.text, fontSize: 18, fontWeight: '800' },
  error: { color: palette.danger, fontSize: 13, lineHeight: 19 },
  list: { gap: 10, paddingBottom: 20 },
  option: { gap: 5, padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: palette.border, backgroundColor: palette.surface },
  optionSelected: { borderColor: palette.primary, backgroundColor: palette.primarySoft },
  optionTitle: { color: palette.text, fontSize: 14, fontWeight: '800' },
  body: { color: palette.text, fontSize: 13, lineHeight: 19 },
  muted: { color: palette.textMuted, fontSize: 12, lineHeight: 17 },
  activate: { alignItems: 'center', justifyContent: 'center', height: 50, borderRadius: 14, backgroundColor: palette.primary },
  activateText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  dim: { opacity: 0.5 },
});
