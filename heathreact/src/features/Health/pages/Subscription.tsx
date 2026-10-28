import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, Text, View } from 'react-native';
import Card from '@/components/ui/Card';
import Screen from '@/components/ui/Screen';
import { billingService, BillingPlan, BillingStatus } from '@/api/services/billing.service';
import { ApiError } from '@/api/client';
import { palette } from '@/theme/tokens';

const featureNames: Record<string, string> = {
  AI_PLAN_RESCHEDULE: 'AI đề xuất điều chỉnh lịch',
  AI_PERSONAL_ASSISTANT: 'Trợ lý AI cá nhân và tài liệu riêng',
  AI_GYM_CAMERA: 'Phân tích ảnh trong hướng dẫn gym nâng cao',
};
const money = (minor: number, currency: string) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency }).format(minor / (['JPY', 'KRW', 'VND'].includes(currency) ? 1 : 100));

export default function SubscriptionPage() {
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const refresh = useCallback(async () => {
    const [nextPlans, nextStatus] = await Promise.all([billingService.plans(), billingService.status()]);
    setPlans(nextPlans); setStatus(nextStatus);
  }, []);
  // This fetch synchronizes the screen with the authenticated billing API.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void refresh().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Không tải được trạng thái gói.')); }, [refresh]);
  useEffect(() => {
    const listener = AppState.addEventListener('change', state => {
      if (state === 'active') void refresh().catch(() => undefined);
    });
    return () => listener.remove();
  }, [refresh]);

  const run = async (operation: () => Promise<void>) => {
    setBusy(true); setError(''); setNotice('');
    try { await operation(); }
    catch (cause) { setError(cause instanceof ApiError ? cause.message : cause instanceof Error ? cause.message : 'Thanh toán chưa hoàn tất.'); }
    finally { setBusy(false); }
  };
  const checkout = (plan: BillingPlan, provider: 'STRIPE' | 'PAYPAL') => run(async () => {
    const session = await billingService.checkout(plan.code, provider);
    setNotice('Đã mở trang thanh toán. Quyền Premium chỉ cập nhật khi backend xác nhận thanh toán.');
    await WebBrowser.openBrowserAsync(session.approvalUrl);
    await refresh();
  });
  const refreshPayment = () => run(async () => {
    await refresh();
    setNotice('Đã đồng bộ trạng thái từ máy chủ.');
  });
  const capturePaypal = (transactionRef: string) => run(async () => {
    const transaction = await billingService.capturePaypal(transactionRef);
    await refresh();
    setNotice(transaction.status === 'PAID' ? 'PayPal đã xác nhận thanh toán.' : 'PayPal chưa xác nhận giao dịch; trạng thái gói chưa đổi.');
  });

  const actionButton = (label: string, icon: keyof typeof Ionicons.glyphMap, action: () => void, secondary = false) => (
    <Pressable onPress={action} disabled={busy} accessibilityRole="button" style={{ minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 12, borderRadius: 7, backgroundColor: secondary ? palette.surfaceRaised : palette.primary, opacity: busy ? 0.55 : 1 }}>
      <Ionicons name={icon} size={17} color={secondary ? palette.text : palette.textInverse} /><Text style={{ color: secondary ? palette.text : palette.textInverse, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );

  return <Screen title="Gói dịch vụ" subtitle="Quản lý quyền truy cập Premium" showBack>
    {busy ? <ActivityIndicator color={palette.primary} /> : null}
    {error ? <Text accessibilityLiveRegion="polite" style={{ color: palette.danger }}>{error}</Text> : null}
    {notice ? <Text accessibilityLiveRegion="polite" style={{ color: palette.success }}>{notice}</Text> : null}
    <Card style={{ gap: 7 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Ionicons name={status?.premiumActive ? 'checkmark-circle' : 'person-circle-outline'} size={22} color={status?.premiumActive ? palette.success : palette.textMuted} /><Text style={{ color: palette.text, fontSize: 17, fontWeight: '800' }}>{status?.tier ?? '...'} · {status?.status ?? 'Đang kiểm tra'}</Text></View>
      {status?.endsAt ? <Text style={{ color: palette.textMuted }}>Có hiệu lực đến {new Date(status.endsAt).toLocaleString('vi-VN')}</Text> : null}
      {actionButton('Cập nhật trạng thái', 'refresh', () => void refreshPayment(), true)}
    </Card>
    <Text style={{ color: palette.text, fontSize: 17, fontWeight: '800' }}>Các gói</Text>
    {plans.map(plan => <Card key={plan.code} style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}><View style={{ flex: 1 }}><Text style={{ color: palette.text, fontSize: 16, fontWeight: '800' }}>{plan.name}</Text><Text style={{ color: palette.textMuted, marginTop: 4 }}>{plan.durationDays === 0 ? 'Cơ bản' : `${plan.durationDays} ngày · không tự gia hạn`}</Text></View><Text style={{ color: palette.primary, fontWeight: '800' }}>{plan.priceMinor === 0 ? 'Miễn phí' : money(plan.priceMinor, plan.currency)}</Text></View>
      {plan.features.map(code => <View key={code} style={{ flexDirection: 'row', gap: 7, alignItems: 'center' }}><Ionicons name="checkmark" size={16} color={palette.success} /><Text style={{ color: palette.textMuted, flex: 1 }}>{featureNames[code] || code}</Text></View>)}
      {plan.priceMinor > 0 && !status?.premiumActive ? <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>{actionButton('Stripe Checkout', 'card-outline', () => void checkout(plan, 'STRIPE'))}{actionButton('PayPal', 'wallet-outline', () => void checkout(plan, 'PAYPAL'), true)}</View> : null}
    </Card>)}
    <Card style={{ gap: 6, backgroundColor: palette.accentSoft }}><Text style={{ color: palette.text, fontWeight: '700' }}>Thanh toán sandbox</Text><Text style={{ color: palette.textMuted, lineHeight: 19 }}>Checkout mở trong browser hệ thống. Quay lại ứng dụng và cập nhật trạng thái; URL return không tự cấp Premium. Gói 30 ngày không tự gia hạn.</Text></Card>
    {status?.transactions.length ? <><Text style={{ color: palette.text, fontSize: 17, fontWeight: '800' }}>Giao dịch gần đây</Text>{status.transactions.map(transaction => <Card key={transaction.transactionRef} style={{ gap: 7 }}><View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}><Text style={{ color: palette.text, fontWeight: '700' }}>{transaction.provider} · {transaction.planCode}</Text><Text style={{ color: transaction.status === 'PAID' ? palette.success : palette.textMuted, fontWeight: '700' }}>{transaction.status}</Text></View><Text style={{ color: palette.textMuted }}>{money(transaction.amountMinor, transaction.currency)} · {new Date(transaction.createdAt).toLocaleString('vi-VN')}</Text>{transaction.status === 'PENDING' ? <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>{transaction.provider === 'PAYPAL' ? actionButton('Đã chấp thuận PayPal · capture', 'checkmark-circle-outline', () => void capturePaypal(transaction.transactionRef)) : null}{actionButton('Kiểm tra lại', 'refresh', () => void refreshPayment(), true)}</View> : null}</Card>)}</> : null}
    {status?.subscriptions.length ? <><Text style={{ color: palette.text, fontSize: 17, fontWeight: '800' }}>Lịch sử gói</Text>{status.subscriptions.map(subscription => <Card key={subscription.id} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}><View><Text style={{ color: palette.text, fontWeight: '700' }}>{subscription.planCode} · {subscription.provider}</Text><Text style={{ color: palette.textMuted, marginTop: 4 }}>{new Date(subscription.startsAt).toLocaleDateString('vi-VN')} – {new Date(subscription.endsAt).toLocaleDateString('vi-VN')}</Text></View><Text style={{ color: subscription.status === 'ACTIVE' ? palette.success : palette.textMuted, fontWeight: '700' }}>{subscription.status}</Text></Card>)}</> : null}
  </Screen>;
}
