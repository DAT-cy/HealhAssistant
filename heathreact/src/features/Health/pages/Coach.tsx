import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import Screen from '@/components/ui/Screen';
import Card from '@/components/ui/Card';
import { chatService, CoachChatResponse } from '@/api/services/chat.service';
import { ApiError } from '@/api/client';
import { palette } from '@/theme/tokens';

export default function CoachPage() {
  const [message, setMessage] = useState(''); const [reply, setReply] = useState<CoachChatResponse | null>(null); const [loading, setLoading] = useState(false); const [error, setError] = useState('');
  const send = async () => { if (!message.trim()) return; setLoading(true); setError(''); try { setReply(await chatService.send(message.trim())); setMessage(''); } catch (err) { setError(err instanceof ApiError ? err.message : 'Không thể gửi câu hỏi.'); } finally { setLoading(false); } };
  return <Screen title="Trợ lý AI" subtitle="Hỏi về kế hoạch và kỹ thuật tập luyện" showBack><Card><View style={{ flexDirection: 'row', gap: 10 }}><View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#A78BFA22', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="sparkles" size={18} color="#A78BFA" /></View><View style={{ flex: 1 }}><Text style={{ color: palette.text, fontWeight: '700' }}>Xin chào! Tôi có thể giúp gì?</Text><Text style={{ color: palette.textMuted, lineHeight: 20, marginTop: 5 }}>Bạn có thể hỏi về bài tập, tư thế hoặc cách duy trì động lực.</Text></View></View></Card>{reply ? <Card><Text style={{ color: reply.safetyEscalation ? palette.warning : palette.text, lineHeight: 21 }}>{reply.message}</Text><Text style={{ color: palette.textMuted, fontSize: 11, marginTop: 8 }}>Nguồn: {reply.source}</Text></Card> : null}{error ? <Text accessibilityLiveRegion="polite" style={{ color: palette.danger }}>{error}</Text> : null}<View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}><TextInput value={message} onChangeText={setMessage} placeholder="Nhập câu hỏi..." placeholderTextColor={palette.textMuted} multiline style={{ flex: 1, maxHeight: 90, color: palette.text, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, borderRadius: 12, padding: 13 }} /><Pressable onPress={() => void send()} disabled={loading} style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: loading ? palette.surfaceRaised : palette.primary, alignItems: 'center', justifyContent: 'center' }} accessibilityRole="button" accessibilityLabel="Gửi câu hỏi"><Ionicons name="send" size={19} color={loading ? palette.textMuted : palette.textInverse} /></Pressable></View></Screen>;
}
