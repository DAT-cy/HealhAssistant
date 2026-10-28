import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from 'react-native';
import Screen from '@/components/ui/Screen';
import Card from '@/components/ui/Card';
import { ApiError } from '@/api/client';
import { PersonalDocument, PersonalProfileInput, personalAssistantService } from '@/api/services/personal-assistant.service';
import { chatService, CoachChatMessage, CoachChatThread } from '@/api/services/chat.service';
import { coachService, PlanReschedulePreview } from '@/api/services/coach.service';
import { palette } from '@/theme/tokens';

type Tab = 'profile' | 'documents' | 'chat';
const emptyProfile: PersonalProfileInput = {
  fitnessGoal: '', currentCondition: '', fitnessLevel: '', dietPreferences: '', dailyRoutine: '',
  availableTrainingTime: '', availableEquipment: '', healthLimits: '', personalRules: '', additionalGuidance: '',
};
const profileFields: { key: keyof PersonalProfileInput; label: string; placeholder: string; required?: boolean }[] = [
  { key: 'fitnessGoal', label: 'Mục tiêu tập luyện', placeholder: 'Ví dụ: cải thiện sức bền', required: true },
  { key: 'currentCondition', label: 'Thể trạng hiện tại', placeholder: 'Thông tin bạn muốn chia sẻ' },
  { key: 'fitnessLevel', label: 'Trình độ', placeholder: 'Mới bắt đầu, trung bình...' },
  { key: 'dietPreferences', label: 'Sở thích ăn uống', placeholder: 'Món thích, chế độ ăn...' },
  { key: 'dailyRoutine', label: 'Lịch sinh hoạt', placeholder: 'Giờ ngủ, giờ làm...' },
  { key: 'availableTrainingTime', label: 'Thời gian có thể tập', placeholder: 'Các ngày và khung giờ' },
  { key: 'availableEquipment', label: 'Thiết bị tập', placeholder: 'Tạ, thảm, không có...' },
  { key: 'healthLimits', label: 'Giới hạn sức khỏe', placeholder: 'Tùy chọn, chỉ nhập điều cần thiết' },
  { key: 'personalRules', label: 'Nguyên tắc cho trợ lý', placeholder: 'Ví dụ: ưu tiên bài tập tại nhà' },
  { key: 'additionalGuidance', label: 'Hướng dẫn bổ sung', placeholder: 'Thông tin khác bạn muốn trợ lý lưu ý' },
];

export default function CoachPage() {
  const [tab, setTab] = useState<Tab>('chat');
  const [profile, setProfile] = useState<PersonalProfileInput>(emptyProfile);
  const [documents, setDocuments] = useState<PersonalDocument[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [threadId, setThreadId] = useState<string>();
  const [messages, setMessages] = useState<CoachChatMessage[]>([]);
  const [threads, setThreads] = useState<CoachChatThread[]>([]);
  const [proposal, setProposal] = useState<PlanReschedulePreview | null>(null);
  const [beforeSlots, setBeforeSlots] = useState<Record<number, { activity: string; startTime: string; endTime: string; sessionPeriod: string }>>({});
  const [message, setMessage] = useState('');
  const [docTitle, setDocTitle] = useState('');
  const [docContent, setDocContent] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);

  const refreshDocuments = useCallback(async () => setDocuments(await personalAssistantService.listDocuments()), []);
  const refreshThreads = useCallback(async () => setThreads(await chatService.threads()), []);
  useEffect(() => {
    let active = true;
    Promise.all([personalAssistantService.getProfile(), personalAssistantService.listDocuments()]).then(([savedProfile, savedDocs]) => {
      if (!active) return;
      setProfile({ ...emptyProfile, ...Object.fromEntries(Object.entries(savedProfile).filter(([key]) => key in emptyProfile)) } as PersonalProfileInput);
      setDocuments(savedDocs);
    }).catch((e: unknown) => { if (active) setError(e instanceof Error ? e.message : 'Không tải được dữ liệu trợ lý.'); });
    return () => { active = false; };
  }, []);
  useEffect(() => { void chatService.threads().then(setThreads).catch(() => undefined); }, []);

  const run = async (task: () => Promise<void>, success?: string) => {
    setBusy(true); setError(''); setNotice('');
    try { await task(); if (success) setNotice(success); }
    catch (e) { setError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Không thể hoàn thành thao tác.'); }
    finally { setBusy(false); }
  };
  const saveProfile = () => run(async () => {
    const result = await personalAssistantService.saveProfile(profile);
    setProfile({ ...emptyProfile, ...Object.fromEntries(Object.entries(result).filter(([key]) => key in emptyProfile)) } as PersonalProfileInput);
  }, 'Đã lưu hồ sơ trợ lý.');
  const uploadPdf = () => run(async () => {
    const selected = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true, multiple: false });
    if (selected.canceled) return;
    const file = selected.assets[0];
    const title = docTitle.trim() || file.name.replace(/\.pdf$/i, '');
    const result = await personalAssistantService.uploadPdf({ uri: file.uri, name: file.name, mimeType: file.mimeType }, title);
    setDocTitle(''); await refreshDocuments();
    if (result.status === 'FAILED') setError(result.processingError || 'Không thể xử lý PDF.');
  });
  const saveText = () => run(async () => {
    if (!docTitle.trim()) throw new Error('Nhập tiêu đề tài liệu.');
    const editingDocument = documents.find(item => item.id === editingId);
    if (editingDocument?.sourceType === 'PDF') await personalAssistantService.updateMetadata(editingId!, docTitle.trim(), editingDocument.description || '');
    else if (!docContent.trim()) throw new Error('Nhập nội dung tài liệu.');
    else if (editingId) await personalAssistantService.updateText(editingId, docTitle.trim(), docContent.trim());
    else await personalAssistantService.createText(docTitle.trim(), docContent.trim());
    setEditingId(null); setDocTitle(''); setDocContent(''); await refreshDocuments();
  }, 'Đã lưu nội dung tài liệu.');
  const editText = (item: PersonalDocument) => run(async () => {
    if (item.sourceType === 'PDF') {
      const title = item.title;
      setEditingId(item.id); setDocTitle(title);
      await personalAssistantService.updateMetadata(item.id, title, item.description || '');
      setNotice('Có thể sửa tiêu đề và mô tả PDF. Nội dung PDF không chỉnh sửa được.');
      return;
    }
    const text = await personalAssistantService.getText(item.id);
    setEditingId(item.id); setDocTitle(item.title); setDocContent(text); setTab('documents');
  });
  const removeDocument = (item: PersonalDocument) => Alert.alert('Xóa tài liệu?', `Xóa “${item.title}” khỏi trợ lý cá nhân?`, [
    { text: 'Hủy', style: 'cancel' },
    { text: 'Xóa', style: 'destructive', onPress: () => void run(async () => { await personalAssistantService.removeDocument(item.id); await refreshDocuments(); }, 'Đã xóa tài liệu.') },
  ]);
  const retryDocument = (id: number) => run(async () => { await personalAssistantService.retry(id); await refreshDocuments(); });
  const send = () => run(async () => {
    if (!message.trim()) return;
    const question = message.trim(); setMessage('');
    const response = await chatService.send(question, threadId);
    setThreadId(response.threadId); setProposal(response.scheduleProposal);
    if (response.scheduleProposal) {
      const current = await coachService.schedule(response.scheduleProposal.roadmapId);
      setBeforeSlots(Object.fromEntries(current.map(slot => [slot.id, { activity: slot.activity, startTime: slot.startTime, endTime: slot.endTime, sessionPeriod: slot.sessionPeriod }])));
    }
    setMessages(await chatService.history(response.threadId));
    await refreshThreads();
  });
  const fillSuggestion = (question: string) => { setMessage(question); };
  const openThread = (thread: CoachChatThread) => run(async () => {
    setThreadId(thread.threadId); setMessages(await chatService.history(thread.threadId)); setProposal(null);
  });
  const newThread = () => { setThreadId(undefined); setMessages([]); setProposal(null); setError(''); setNotice(''); };
  const deleteCurrentThread = () => {
    if (!threadId) return;
    Alert.alert('Xóa hội thoại?', 'Lịch sử hội thoại này sẽ bị xóa khỏi tài khoản.', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: () => void run(async () => {
        await chatService.deleteThread(threadId); setThreadId(undefined); setMessages([]); setProposal(null); await refreshThreads();
      }, 'Đã xóa hội thoại.') },
    ]);
  };
  const confirmSchedule = () => run(async () => {
    if (!proposal) return;
    const result = await chatService.confirmProposal(proposal.previewId);
    setProposal(result);
    setNotice(result.status === 'ACCEPTED' ? 'Đã áp dụng lịch mới.' : 'Backend chưa xác nhận áp dụng lịch.');
  });
  const rejectSchedule = () => run(async () => {
    if (!proposal) return;
    const result = await chatService.rejectProposal(proposal.previewId);
    setProposal(result); setNotice('Đã từ chối đề xuất; lịch không thay đổi.');
  });

  const input = (label: string, value: string, onChangeText: (text: string) => void, placeholder: string, multiline = false) => (
    <View key={label} style={{ gap: 6 }}><Text style={{ color: palette.text, fontSize: 13, fontWeight: '700' }}>{label}</Text>
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={palette.textMuted} multiline={multiline}
        style={{ color: palette.text, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, borderRadius: 8, padding: 11, minHeight: multiline ? 76 : 44, textAlignVertical: multiline ? 'top' : 'center' }} />
    </View>
  );
  const button = (label: string, action: () => void, icon: keyof typeof Ionicons.glyphMap, secondary = false) => (
    <Pressable onPress={action} disabled={busy} accessibilityRole="button" style={{ flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center', minHeight: 42, paddingHorizontal: 12, backgroundColor: secondary ? palette.surfaceRaised : palette.primary, borderRadius: 8, opacity: busy ? 0.6 : 1 }}>
      <Ionicons name={icon} size={17} color={secondary ? palette.text : palette.textInverse} /><Text style={{ color: secondary ? palette.text : palette.textInverse, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
  const statusColor = (status: PersonalDocument['status']) => status === 'COMPLETED' ? palette.success : status === 'FAILED' ? palette.danger : palette.warning;

  return <Screen title="AI Coach" subtitle="Chat, hồ sơ và tài liệu cá nhân" showBack>
    <View style={{ flexDirection: 'row', backgroundColor: palette.surfaceRaised, padding: 4, borderRadius: 8, gap: 3 }}>
      {([['chat', 'Chat'], ['documents', 'Tài liệu'], ['profile', 'Hồ sơ']] as const).map(([key, label]) => <Pressable key={key} onPress={() => setTab(key)} style={{ flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 6, backgroundColor: tab === key ? palette.surface : 'transparent' }}><Text style={{ color: tab === key ? palette.text : palette.textMuted, fontWeight: '700' }}>{label}</Text></Pressable>)}
    </View>
    {busy ? <ActivityIndicator color={palette.primary} /> : null}
    {error ? <Text accessibilityLiveRegion="polite" style={{ color: palette.danger }}>{error}</Text> : null}
    {notice ? <Text accessibilityLiveRegion="polite" style={{ color: palette.success }}>{notice}</Text> : null}
    {tab === 'profile' ? <>
      <Card><Text style={{ color: palette.text, fontWeight: '800', fontSize: 16 }}>Hồ sơ cá nhân</Text><Text style={{ color: palette.textMuted, lineHeight: 20, marginTop: 5 }}>Chỉ nhập thông tin cần thiết. Các giới hạn và nguyên tắc cá nhân không thể ghi đè hướng dẫn an toàn.</Text></Card>
      <Card style={{ gap: 12 }}>{profileFields.map(field => input(field.label + (field.required ? ' *' : ''), profile[field.key] || '', value => setProfile(current => ({ ...current, [field.key]: value })), field.placeholder, true))}{button('Lưu hồ sơ', () => void saveProfile(), 'save')}</Card>
    </> : null}
    {tab === 'documents' ? <>
      <Card style={{ gap: 12 }}><Text style={{ color: palette.text, fontWeight: '800', fontSize: 16 }}>Thêm tài liệu</Text>
        {input('Tiêu đề', docTitle, setDocTitle, 'Tên tài liệu')}
        {documents.find(item => item.id === editingId)?.sourceType !== 'PDF' ? input('Nội dung dạng text', docContent, setDocContent, 'Nhập hướng dẫn, mục tiêu hoặc nội dung cần tham chiếu', true) : <Text style={{ color: palette.textMuted }}>PDF chỉ hỗ trợ cập nhật tiêu đề; để thay nội dung hãy xóa và tải lại file.</Text>}
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>{button(editingId ? 'Lưu thay đổi' : 'Lưu text', () => void saveText(), 'save')}{button('Chọn PDF', () => void uploadPdf(), 'document-attach', true)}{editingId ? button('Hủy sửa', () => { setEditingId(null); setDocTitle(''); setDocContent(''); }, 'close', true) : null}</View>
        <Text style={{ color: palette.textMuted, fontSize: 12 }}>PDF tối đa 5 MB. File được lưu trong vùng runtime riêng của tài khoản; PDF scan chưa hỗ trợ OCR.</Text>
      </Card>
      <Text style={{ color: palette.text, fontWeight: '800', fontSize: 16 }}>Tài liệu của bạn ({documents.length})</Text>
      {documents.length === 0 ? <Text style={{ color: palette.textMuted }}>Chưa có tài liệu.</Text> : documents.map(item => <Card key={item.id} style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}><View style={{ flex: 1 }}><Text style={{ color: palette.text, fontWeight: '700' }}>{item.title}</Text><Text style={{ color: palette.textMuted, fontSize: 12, marginTop: 4 }}>{item.sourceType} · {item.chunkCount} đoạn</Text></View><Text style={{ color: statusColor(item.status), fontSize: 12, fontWeight: '800' }}>{item.status}</Text></View>
        {item.processingError ? <Text style={{ color: palette.danger, fontSize: 12 }}>{item.processingError}</Text> : null}
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>{button(item.sourceType === 'TEXT' ? 'Sửa nội dung' : 'Sửa tiêu đề', () => void editText(item), 'create-outline', true)}{item.status === 'FAILED' ? button('Thử lại', () => void retryDocument(item.id), 'refresh', true) : null}{button('Xóa', () => removeDocument(item), 'trash-outline', true)}</View>
      </Card>)}
    </> : null}
    {tab === 'chat' ? <>
      <Card><View style={{ flexDirection: 'row', gap: 10 }}><Ionicons name="sparkles" size={20} color={palette.primary} /><View style={{ flex: 1 }}><Text style={{ color: palette.text, fontWeight: '700' }}>Tư vấn có ngữ cảnh riêng</Text><Text style={{ color: palette.textMuted, lineHeight: 19, marginTop: 4 }}>Trợ lý tìm trong hồ sơ và tài liệu của bạn trước, sau đó mới tham khảo Knowledge Base chung.</Text></View></View></Card>
      <View style={{ flexDirection: 'row', gap: 8 }}>{button('Hội thoại mới', newThread, 'add')}{threadId ? button('Xóa hội thoại', deleteCurrentThread, 'trash-outline', true) : null}</View>
      {threads.length ? <Card style={{ gap: 8 }}><Text style={{ color: palette.text, fontWeight: '700' }}>Hội thoại gần đây</Text>{threads.slice(0, 5).map(thread => <Pressable key={thread.threadId} onPress={() => void openThread(thread)} style={{ paddingVertical: 6 }}><Text numberOfLines={1} style={{ color: threadId === thread.threadId ? palette.primary : palette.text }}>{thread.lastMessage}</Text></Pressable>)}</Card> : null}
      {messages.length === 0 ? <Card style={{ gap: 9 }}><Text style={{ color: palette.text, fontWeight: '700' }}>Gợi ý câu hỏi</Text>{['Hôm nay tôi nên tập gì?', 'Tôi bỏ lỡ buổi sáng, lịch chiều có cần đổi không?', 'Món ăn này có phù hợp mục tiêu không?', 'Tôi nên nghỉ hay tiếp tục tập?', 'Đổi gym thành chạy bộ giúp tôi'].map(question => <Pressable key={question} onPress={() => fillSuggestion(question)} style={{ paddingVertical: 7 }}><Text style={{ color: palette.primary }}>{question}</Text></Pressable>)}</Card> : null}
      {messages.map(item => <Card key={item.id} style={{ backgroundColor: item.role === 'USER' ? palette.accentSoft : palette.surface }}><Text style={{ color: palette.text, fontSize: 12, fontWeight: '800', marginBottom: 5 }}>{item.role === 'USER' ? 'Bạn' : 'Trợ lý'}</Text><Text style={{ color: palette.text, lineHeight: 21 }}>{item.message}</Text>{item.sources?.length ? <View style={{ marginTop: 10, gap: 6 }}><Text style={{ color: palette.textMuted, fontWeight: '700', fontSize: 12 }}>Nguồn đã truy xuất</Text>{item.sources.map((source, idx) => <Text key={`${source.documentId}-${source.chunkIndex}-${idx}`} style={{ color: palette.primary, fontSize: 12 }}>{source.sourceType === 'PERSONAL_DOCUMENT' ? 'Tài liệu cá nhân' : 'Knowledge Base'}: {source.title} · đoạn {source.chunkIndex + 1}</Text>)}</View> : null}</Card>)}
      {proposal ? <Card style={{ gap: 8, borderColor: proposal.status === 'PENDING' ? palette.warning : palette.border }}><Text style={{ color: palette.text, fontWeight: '800' }}>Đề xuất lịch · {proposal.status}</Text><Text style={{ color: palette.text }}>{proposal.summary}</Text>{proposal.changes.map((change, i) => { const before = beforeSlots[change.slotId]; return <View key={`${change.slotId}-${i}`} style={{ paddingVertical: 7, borderTopWidth: 1, borderColor: palette.border }}><Text style={{ color: palette.textMuted, fontSize: 12 }}>Trước: {before ? `${before.activity} · ${before.sessionPeriod} ${before.startTime}-${before.endTime}` : `Hoạt động #${change.slotId}`}</Text><Text style={{ color: palette.text, fontWeight: '700', marginTop: 4 }}>Sau: {change.action === 'CANCEL' ? 'Hủy hoạt động' : `${change.activity} · ${change.sessionPeriod} ${change.startTime}-${change.endTime}`}</Text><Text style={{ color: palette.textMuted, fontSize: 12, marginTop: 3 }}>{change.reason}</Text></View>; })}{proposal.safetyNotes.map((note, i) => <Text key={`note-${i}`} style={{ color: palette.warning, fontSize: 12 }}>{note}</Text>)}{proposal.status === 'PENDING' ? <View style={{ flexDirection: 'row', gap: 8 }}>{button('Áp dụng lịch', () => void confirmSchedule(), 'checkmark')}{button('Từ chối', () => void rejectSchedule(), 'close', true)}</View> : null}</Card> : null}
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}><TextInput value={message} onChangeText={setMessage} placeholder="Hỏi về mục tiêu, lịch tập hoặc dinh dưỡng..." placeholderTextColor={palette.textMuted} multiline style={{ flex: 1, maxHeight: 110, color: palette.text, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, borderRadius: 8, padding: 12 }} /><Pressable onPress={() => void send()} disabled={busy || !message.trim()} accessibilityRole="button" accessibilityLabel="Gửi câu hỏi" style={{ width: 46, height: 46, borderRadius: 8, backgroundColor: palette.primary, alignItems: 'center', justifyContent: 'center', opacity: busy || !message.trim() ? 0.5 : 1 }}><Ionicons name="send" size={19} color={palette.textInverse} /></Pressable></View>
    </> : null}
  </Screen>;
}
