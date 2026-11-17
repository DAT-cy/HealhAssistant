import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ActivityIndicator,
  Modal,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Pressable } from '@/components/ui/Pressable';
import { fitnessTheme } from './HomeTypes';
import { navigationService } from '@/routes';
import Avatar, { type ProfileGender } from '@/components/ui/Avatar';
import { profileService } from '@/api/services/profile.service';

interface Props {
  username: string;
  avatarUrl: string | null;
  gender: ProfileGender | null;
  onLogout: () => void | Promise<void>;
  topInset: number;
}

export default function HomeHeader({ username, avatarUrl, gender, onLogout, topInset }: Props) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showLogoutConfirmModal, setShowLogoutConfirmModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [pressedItem, setPressedItem] = useState<string | null>(null);
  useQuery({ queryKey: ['profile', 'medical-record'], queryFn: profileService.getMine, enabled: showDropdown });

  const pressHandlers = (key: string) => ({
    onPressIn: () => setPressedItem(key),
    onPressOut: () => setPressedItem(null),
  });
  // iOS chỉ cho hiển thị 1 Modal tại một thời điểm: phải đợi dropdown đóng HẲN
  // (hết animation fade) rồi mới mở Modal/Alert tiếp theo, nếu không iOS sẽ bỏ qua.
  const afterDropdownCloseRef = useRef<(() => void) | null>(null);

  const closeDropdownThen = (action: () => void) => {
    afterDropdownCloseRef.current = action;
    setShowDropdown(false);
    setTimeout(handleDropdownDismiss, Platform.OS === 'ios' ? 450 : 180);
  };

  const handleDropdownDismiss = () => {
    const action = afterDropdownCloseRef.current;
    afterDropdownCloseRef.current = null;
    action?.();
  };

  const displayName = username?.split('@')[0]?.split(/[._]/)[0] || 'bạn';

  const triggerHaptic = (type: 'light' | 'medium' | 'success' | 'error' = 'light') => {
    try {
      if (type === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      else if (type === 'medium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      else if (type === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      else if (type === 'error') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch {
      // Haptics fallback
    }
  };

  const handleLogoutConfirm = () => {
    triggerHaptic('medium');
    closeDropdownThen(() => setShowLogoutConfirmModal(true));
  };

  const openPersonalSettings = () => {
    setShowDropdown(false);
    setTimeout(() => router.push('/(user)/personal-settings'), 0);
  };

  const openHealthRecord = () => {
    setShowDropdown(false);
    setTimeout(() => router.push('/(user)/health-record'), 0);
  };

  const handleExecuteLogout = async () => {
    try {
      setIsLoggingOut(true);
      triggerHaptic('success');
      await onLogout();
      setShowLogoutConfirmModal(false);
      navigationService.replace('Login');
    } catch (e) {
      console.warn('Logout error:', e);
    } finally {
      setIsLoggingOut(false);
    }
  };
  return (
    <View style={styles.container}>
      {/* ============================================================ */}
      {/* 1. TOP ROW: AVATAR, GREETING & NOTIFICATION                  */}
      {/* ============================================================ */}
      <View style={styles.topRow}>
        {/* Left: Avatar + Greeting */}
        <View style={styles.userSection}>
          <Pressable
            onPress={() => {
              triggerHaptic('light');
              setShowDropdown(true);
            }}
            style={({ pressed }) => [
              styles.avatarBtn,
              pressed && styles.avatarBtnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Mở menu tài khoản"
          >
            <Avatar gender={gender} imageUrl={avatarUrl} size={46} />
          </Pressable>

          <View style={styles.greetingMeta}>
            <Text style={styles.greetingLight}>Chào bạn,</Text>
            <Text style={styles.greetingName}>
              {displayName} 👋
            </Text>
            <Text style={styles.greetingSubtitle}>
              Cùng bắt đầu hành trình khỏe mạnh và tốt hơn mỗi ngày!
            </Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <Pressable
            onPress={() => {
              triggerHaptic('light');
              setShowNotificationModal(true);
            }}
            style={({ pressed }) => [styles.headerAction, pressed && styles.notificationBtnPressed]}
            accessibilityRole="button"
            accessibilityLabel="Xem thông báo"
          >
            <Ionicons name="notifications-outline" size={21} color="#334155" />
          </Pressable>
        </View>
      </View>
      {/* ============================================================ */}
      {/* DROPDOWN MENU MODAL TỪ AVATAR (XỔ XUỐNG KHI BẤM AVATAR)      */}
      {/* ============================================================ */}
      <Modal
        visible={showDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDropdown(false)}
        onDismiss={handleDropdownDismiss}
      >
<Pressable
  style={styles.modalBackdrop}
  onPress={() => setShowDropdown(false)}
>
  <Pressable style={[styles.dropdownCard, { top: topInset + 60 }]} onPress={(event) => event.stopPropagation()}>
    {/* Header thông tin người dùng */}
    <View style={styles.dropdownUserRow}>
      <Avatar gender={gender} imageUrl={avatarUrl} size={44} />
      <View style={styles.dropdownUserMeta}>
        <Text style={styles.dropdownUserName} numberOfLines={1}>
          {username}
        </Text>
        <Text style={styles.dropdownUserCaption}>Tài khoản Health Assistant</Text>
      </View>
    </View>

    <View style={styles.profileSummary}><Text style={styles.profileSummaryTitle}>Thông tin tài khoản</Text></View>

    <View style={styles.dropdownDivider} />
    <Pressable onPress={openHealthRecord} style={styles.profileAction} accessibilityRole="button"><Ionicons name="medical-outline" size={16} color={fitnessTheme.primary} /><Text style={styles.profileActionText}>Mở hồ sơ sức khỏe</Text><Ionicons name="chevron-forward" size={15} color={fitnessTheme.primary} /></Pressable>
    <Pressable onPress={openPersonalSettings} style={styles.profileAction} accessibilityRole="button"><Ionicons name="options-outline" size={16} color={fitnessTheme.primary} /><Text style={styles.profileActionText}>Cài đặt cá nhân</Text><Ionicons name="chevron-forward" size={15} color={fitnessTheme.primary} /></Pressable>

    <View style={styles.dropdownDivider} />

    {/* Logout button */}
    <Pressable
      onPress={handleLogoutConfirm}
      {...pressHandlers('logout')}
      style={[styles.dropdownLogoutBtn, pressedItem === 'logout' && styles.dropdownLogoutBtnPressed]}
      accessibilityRole="button"
    >
      <Ionicons name="log-out-outline" size={18} color={fitnessTheme.danger} />
      <Text style={styles.dropdownLogoutText}>Đăng xuất tài khoản</Text>
    </Pressable>
  </Pressable>
</Pressable>
      </Modal>

      {/* ============================================================ */}
      {/* NOTIFICATION TIPS MODAL                                      */}
      {/* ============================================================ */}
      <Modal
        visible={showNotificationModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNotificationModal(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowNotificationModal(false)}
        >
          <View style={[styles.notificationCard, { top: topInset + 60 }]}>
            <View style={styles.notificationHeader}>
              <View style={styles.notificationTitleRow}>
                <Ionicons name="notifications" size={18} color={fitnessTheme.primary} />
                <Text style={styles.notificationTitle}>Thông báo & Lời nhắc</Text>
              </View>
              <Pressable
                onPress={() => setShowNotificationModal(false)}
                hitSlop={8}
              >
                <Ionicons name="close" size={18} color="#64748B" />
              </Pressable>
            </View>

            <View style={styles.dropdownDivider} />
            <View style={styles.notificationsEmpty}>
              <View style={styles.notificationsEmptyIcon}><Ionicons name="notifications-off-outline" size={22} color={fitnessTheme.primary} /></View>
              <Text style={styles.tipHeadline}>Chưa có thông báo</Text>
              <Text style={styles.tipBody}>Thông báo sẽ xuất hiện tại đây khi backend hỗ trợ nhắc lịch.</Text>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* ============================================================ */}
      {/* 3. LOGOUT CONFIRMATION MODAL (CROSS-PLATFORM & BẢO ĐẢM XÓA TOKEN) */}
      {/* ============================================================ */}
      <Modal
        visible={showLogoutConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isLoggingOut) setShowLogoutConfirmModal(false);
        }}
      >
        <Pressable
          style={styles.centerModalBackdrop}
          onPress={() => {
            if (!isLoggingOut) setShowLogoutConfirmModal(false);
          }}
        >
          <Pressable
            style={styles.logoutConfirmCard}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.logoutIconCircle}>
              <Ionicons name="log-out" size={28} color={fitnessTheme.danger} />
            </View>

            <Text style={styles.logoutDialogTitle}>Xác nhận đăng xuất</Text>
            <Text style={styles.logoutDialogDesc}>
              Bạn có chắc chắn muốn đăng xuất? Token phiên làm việc hiện tại sẽ bị xóa hoàn toàn khỏi thiết bị để bảo mật.
            </Text>

            <View style={styles.logoutBtnGroup}>
              <View style={styles.logoutBtnSlot}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Ở lại"
                  disabled={isLoggingOut}
                  onPress={() => {
                    triggerHaptic('light');
                    setShowLogoutConfirmModal(false);
                  }}
                  {...pressHandlers('logoutCancel')}
                  style={[
                    styles.logoutCancelBtn,
                    pressedItem === 'logoutCancel' && styles.logoutButtonPressed,
                    isLoggingOut && styles.logoutButtonDisabled,
                  ]}
                >
                  <Text style={styles.logoutCancelText}>Ở lại</Text>
                </Pressable>
              </View>
              <View style={styles.logoutBtnSlot}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Đăng xuất"
                  disabled={isLoggingOut}
                  onPress={() => void handleExecuteLogout()}
                  {...pressHandlers('logoutConfirm')}
                  style={[
                    styles.logoutConfirmBtn,
                    pressedItem === 'logoutConfirm' && styles.logoutButtonPressed,
                    isLoggingOut && styles.logoutButtonDisabled,
                  ]}
                >
                  {isLoggingOut ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="log-out-outline" size={17} color="#FFFFFF" />
                      <Text style={styles.logoutConfirmText}>Đăng xuất</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatarBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  avatarBtnPressed: {
    opacity: 0.8,
  },
  greetingMeta: {
    flex: 1,
  },
  greetingLight: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  greetingName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  greetingSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 17,
    maxWidth: 220,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  notificationBtnPressed: {
    opacity: 0.75,
  },
  /* Modal Backdrop */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },

  /* Dropdown Card */
  dropdownCard: {
    position: 'absolute',
    left: 18,
    width: 290,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 10,
  },
  dropdownUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dropdownUserMeta: {
    flex: 1,
  },
  dropdownUserName: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
  },
  dropdownUserCaption: { color: '#7A8099', fontSize: 11, marginTop: 3 },
  profileSummary: { paddingHorizontal: 6, paddingVertical: 5 }, profileSummaryTitle: { color: '#0F172A', fontSize: 12, fontWeight: '800' }, profileSummaryValue: { color: '#334155', fontSize: 12, marginTop: 4 }, profileSummaryMeta: { color: '#64748B', fontSize: 10.5, marginTop: 3 }, medicalPreviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 6, marginBottom: 3 }, healthSummary: { paddingHorizontal: 6, color: '#64748B', fontSize: 11, lineHeight: 16 }, profileAction: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 8, marginTop: 8, borderRadius: 9, backgroundColor: '#EFEEFF' }, profileActionText: { flex: 1, color: fitnessTheme.primary, fontSize: 11, fontWeight: '800' },
  dropdownDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderRadius: 10,
    gap: 10,
  },
  dropdownItemPressed: {
    backgroundColor: '#F8FAFC',
  },
  dropdownItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownItemMeta: {
    flex: 1,
  },
  dropdownItemTitle: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700',
  },
  dropdownItemSub: {
    color: '#64748B',
    fontSize: 10.5,
    marginTop: 1,
  },
  dropdownLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    paddingVertical: 9,
    borderRadius: 10,
    gap: 6,
    marginTop: 2,
  },
  dropdownLogoutBtnPressed: {
    opacity: 0.8,
  },
  dropdownLogoutText: {
    color: fitnessTheme.danger,
    fontSize: 13,
    fontWeight: '700',
  },

  /* Notification Card */
  notificationCard: {
    position: 'absolute',
    right: 18,
    width: 310,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 10,
  },
  medicalField: { paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E2E8F0' },
  medicalLabel: { color: '#64748B', fontSize: 10.5, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  medicalValue: { color: '#0F172A', fontSize: 13, lineHeight: 19, marginTop: 4 },
  medicalWarning: { color: '#C2410C' },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notificationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  notificationTitle: {
    color: '#0F172A',
    fontSize: 14.5,
    fontWeight: '800',
  },
  notificationsEmpty: { minHeight: 128, alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 12 },
  notificationsEmptyIcon: { width: 42, height: 42, borderRadius: 15, backgroundColor: '#EFEEFF', alignItems: 'center', justifyContent: 'center', marginBottom: 3 },
  tipHeadline: {
    color: '#0F172A',
    fontSize: 12.5,
    fontWeight: '700',
  },
  tipBody: {
    color: '#64748B',
    fontSize: 11,
    lineHeight: 15,
    marginTop: 1,
  },

  /* Logout Confirmation Dialog Styles */
  centerModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  logoutConfirmCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  logoutIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoutDialogTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  logoutDialogDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  logoutBtnGroup: {
    flexDirection: 'row',
    alignItems: 'stretch',
    width: '100%',
    gap: 12,
  },
  logoutBtnSlot: {
    flex: 1,
    minWidth: 0,
  },
  logoutCancelBtn: {
    width: '100%',
    minHeight: 48,
    borderWidth: 1,
    borderColor: fitnessTheme.primary,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutConfirmBtn: {
    width: '100%',
    minHeight: 48,
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1,
    borderColor: fitnessTheme.danger,
    borderRadius: 12,
    backgroundColor: fitnessTheme.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutCancelText: {
    color: fitnessTheme.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  logoutConfirmText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  logoutButtonPressed: {
    opacity: 0.82,
  },
  logoutButtonDisabled: {
    opacity: 0.52,
  },
});
