import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import AppModal from '@/components/ui/AppModal';
import { Pressable } from '@/components/ui/Pressable';
import { palette } from '@/theme/tokens';
import { REVIEW_ACTIONS, type ReviewAction } from '@/utils/doctorReview';

interface Props {
  /** Thao tác đang chọn; null = đóng modal. */
  action: ReviewAction | null;
  requestId: number | null;
  submitting: boolean;
  error: string | null;
  onCancel: () => void;
  onSubmit: (note: string) => void;
}

/**
 * Modal nhập nhận xét chuyên môn. Thay cho Alert.prompt (chỉ có trên iOS),
 * chạy được trên cả Android và iOS.
 */
export default function ReviewDecisionModal({ action, requestId, submitting, error, onCancel, onSubmit }: Props) {
  return (
    <AppModal visible={action !== null} transparent animationType="fade" onRequestClose={onCancel}>
      {action ? (
        <DecisionForm key={`${requestId}-${action}`} action={action} requestId={requestId} submitting={submitting} error={error} onCancel={onCancel} onSubmit={onSubmit} />
      ) : null}
    </AppModal>
  );
}

function DecisionForm({ action, requestId, submitting, error, onCancel, onSubmit }: Omit<Props, 'action'> & { action: ReviewAction }) {
  const [note, setNote] = useState('');
  const [touched, setTouched] = useState(false);
  const config = REVIEW_ACTIONS[action];
  const missingNote = config.noteRequired && note.trim().length === 0;

  const submit = () => {
    setTouched(true);
    if (missingNote || submitting) return;
    onSubmit(note.trim());
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
      <View style={styles.sheet}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <View style={styles.titleRow}>
            <Ionicons name={config.icon as never} size={22} color={config.color} />
            <Text style={styles.title}>{config.label}</Text>
          </View>
          <Text style={styles.subtitle}>Yêu cầu #{requestId} · {config.description}</Text>

          <Text style={styles.label}>
            Nhận xét chuyên môn {config.noteRequired ? <Text style={styles.required}>(bắt buộc)</Text> : <Text style={styles.optional}>(không bắt buộc)</Text>}
          </Text>
          <TextInput
            testID="review-note-input"
            value={note}
            onChangeText={setNote}
            multiline
            maxLength={2000}
            placeholder={config.noteRequired ? 'Ví dụ: Giảm cường độ chạy, thay bằng đi bộ nhanh 20 phút…' : 'Ghi chú thêm cho người dùng (nếu có)'}
            placeholderTextColor={palette.textMuted}
            style={[styles.input, touched && missingNote && styles.inputError]}
          />
          {touched && missingNote ? <Text style={styles.errorText}>Vui lòng nhập nhận xét cho thao tác này.</Text> : null}
          {error ? <Text style={styles.errorBox}>{error}</Text> : null}

          <View style={styles.actions}>
            <Pressable onPress={onCancel} disabled={submitting} style={styles.cancel} accessibilityRole="button">
              <Text style={styles.cancelText}>Huỷ</Text>
            </Pressable>
            <Pressable
              onPress={submit}
              disabled={submitting}
              style={[styles.confirm, { backgroundColor: config.color }, submitting && styles.dim]}
              accessibilityRole="button"
              accessibilityLabel={`Xác nhận ${config.label}`}
            >
              {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.confirmText}>Xác nhận</Text>}
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: palette.overlayScrim },
  sheet: { maxHeight: '85%', borderTopLeftRadius: 20, borderTopRightRadius: 20, backgroundColor: palette.surface },
  content: { padding: 20, paddingBottom: 32, gap: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: palette.text, fontSize: 18, fontWeight: '800' },
  subtitle: { color: palette.textMuted, fontSize: 12, lineHeight: 18 },
  label: { marginTop: 6, color: palette.text, fontSize: 13, fontWeight: '700' },
  required: { color: palette.danger, fontWeight: '600' },
  optional: { color: palette.textMuted, fontWeight: '400' },
  input: { minHeight: 110, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.bg, color: palette.text, fontSize: 14, textAlignVertical: 'top' },
  inputError: { borderColor: palette.danger },
  errorText: { color: palette.danger, fontSize: 12 },
  errorBox: { padding: 10, borderRadius: 8, backgroundColor: palette.dangerLight, color: palette.danger, fontSize: 12 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancel: { flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: palette.border },
  cancelText: { color: palette.text, fontWeight: '700' },
  confirm: { flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  confirmText: { color: '#FFFFFF', fontWeight: '800' },
  dim: { opacity: 0.6 },
});
