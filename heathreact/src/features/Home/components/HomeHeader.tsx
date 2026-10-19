import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { fitnessTheme } from './HomeTypes';
import { navigationService } from '@/routes';
import Avatar, { type ProfileGender } from '@/components/ui/Avatar';

interface Props {
  username: string;
  avatarUrl: string | null;
  gender: ProfileGender | null;
  onLogout: () => void;
  topInset: number;
}

export default function HomeHeader({ username, avatarUrl, gender, onLogout, topInset }: Props) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showLogoutConfirmModal, setShowLogoutConfirmModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const displayName = username?.split('@')[0]?.split(/[._]/)[0] || 'bạn';

  const triggerHaptic = (type: 'light' | 'medium' | 'success' | 'error' = 'light') => {
    try {
      if (Platform.OS !== 'web') {
        if (type === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        else if (type === 'medium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        else if (type === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        else if (type === 'error') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch {
      // Haptics fallback
    }
  };

  const handleLogoutConfirm = () => {
    triggerHaptic('medium');
    setShowDropdown(false);
    setShowLogoutConfirmModal(true);
  };

  const handleExecuteLogout = async () => {
    try {
      setIsLoggingOut(true);
      triggerHaptic('success');
      await onLogout();
    } catch (e) {
      console.warn('Logout error:', e);
    } finally {
      setIsLoggingOut(false);
      setShowLogoutConfirmModal(false);
      navigationService.replace('Login');
    }
  };

  const handleShowProjectInfo = () => {
    triggerHaptic('light');
    setShowDropdown(false);
    Alert.alert(
      '🎓 Đồ Án Tốt Nghiệp: Health Assistant',
      '• Ứng dụng hỗ trợ theo dõi tư thế & cá nhân hóa kế hoạch luyện tập với trợ lý AI.\n\n• Công nghệ: React Native (Expo SDK 57), Spring Boot REST API, AI Landmark Pose Assessment, JWT Security.\n\n• Phiên bản: v1.0.0 (Bản bảo vệ)',
      [{ text: 'Đã hiểu', style: 'default' }]
    );
  };

  const handleNavigate = (route: 'Profile' | 'Roadmap' | 'Progress') => {
    triggerHaptic('light');
    setShowDropdown(false);
    navigationService.navigate(route);
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
          <Pressable
            onPress={() => handleNavigate('Profile')}
            style={({ pressed }) => [styles.headerAction, pressed && styles.notificationBtnPressed]}
            accessibilityRole="button"
            accessibilityLabel="Mở cài đặt hồ sơ"
          >
            <Ionicons name="settings-outline" size={21} color="#334155" />
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
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowDropdown(false)}
        >
          <View
            style={[
              styles.dropdownCard,
              { top: topInset + 60 },
            ]}
          >
            {/* Header thông tin người dùng */}
            <View style={styles.dropdownUserRow}>
              <Avatar gender={gender} imageUrl={avatarUrl} size={44} />
              <View style={styles.dropdownUserMeta}>
                <Text style={styles.dropdownUserName} numberOfLines={1}>
                  {username || 'Tuấn'}
                </Text>
                <Text style={styles.dropdownUserCaption}>Tài khoản Health Assistant</Text>
              </View>
            </View>

            <View style={styles.dropdownDivider} />

            {/* Menu Items */}
            <Pressable
              onPress={() => handleNavigate('Profile')}
              style={({ pressed }) => [
                styles.dropdownItem,
                pressed && styles.dropdownItemPressed,
              ]}
              accessibilityRole="button"
            >
              <View style={[styles.dropdownItemIcon, { backgroundColor: '#EFEEFF' }]}>
                <Ionicons name="person-outline" size={17} color={fitnessTheme.primary} />
              </View>
              <View style={styles.dropdownItemMeta}>
                <Text style={styles.dropdownItemTitle}>Hồ sơ cá nhân</Text>
                <Text style={styles.dropdownItemSub}>Mục tiêu, thể trạng, chiều cao</Text>
              </View>
              <Ionicons name="chevron-forward" size={15} color="#94A3B8" />
            </Pressable>

            <Pressable
              onPress={() => handleNavigate('Roadmap')}
              style={({ pressed }) => [
                styles.dropdownItem,
                pressed && styles.dropdownItemPressed,
              ]}
              accessibilityRole="button"
            >
              <View style={[styles.dropdownItemIcon, { backgroundColor: '#F0F9FF' }]}>
                <Ionicons name="map-outline" size={17} color={fitnessTheme.accent} />
              </View>
              <View style={styles.dropdownItemMeta}>
                <Text style={styles.dropdownItemTitle}>Lộ trình tập luyện</Text>
                <Text style={styles.dropdownItemSub}>Kế hoạch 12 tuần cá nhân hóa</Text>
              </View>
              <Ionicons name="chevron-forward" size={15} color="#94A3B8" />
            </Pressable>

            <Pressable
              onPress={() => handleNavigate('Progress')}
              style={({ pressed }) => [
                styles.dropdownItem,
                pressed && styles.dropdownItemPressed,
              ]}
              accessibilityRole="button"
            >
              <View style={[styles.dropdownItemIcon, { backgroundColor: '#E8F7FF' }]}>
                <Ionicons name="analytics-outline" size={17} color="#268FCB" />
              </View>
              <View style={styles.dropdownItemMeta}>
                <Text style={styles.dropdownItemTitle}>Tiến độ & Nhật ký</Text>
                <Text style={styles.dropdownItemSub}>Lịch sử buổi tập & calo</Text>
              </View>
              <Ionicons name="chevron-forward" size={15} color="#94A3B8" />
            </Pressable>


            <Pressable
              onPress={handleShowProjectInfo}
              style={({ pressed }) => [
                styles.dropdownItem,
                pressed && styles.dropdownItemPressed,
              ]}
              accessibilityRole="button"
            >
              <View style={[styles.dropdownItemIcon, { backgroundColor: '#FFFBEB' }]}>
                <Ionicons name="information-circle-outline" size={17} color={fitnessTheme.warning} />
              </View>
              <View style={styles.dropdownItemMeta}>
                <Text style={styles.dropdownItemTitle}>Thông tin Đồ án</Text>
                <Text style={styles.dropdownItemSub}>Kiến trúc kỹ thuật & Đề tài</Text>
              </View>
              <Ionicons name="chevron-forward" size={15} color="#94A3B8" />
            </Pressable>

            <View style={styles.dropdownDivider} />

            {/* Logout button */}
            <Pressable
              onPress={handleLogoutConfirm}
              style={({ pressed }) => [
                styles.dropdownLogoutBtn,
                pressed && styles.dropdownLogoutBtnPressed,
              ]}
              accessibilityRole="button"
            >
              <Ionicons name="log-out-outline" size={18} color={fitnessTheme.danger} />
              <Text style={styles.dropdownLogoutText}>Đăng xuất tài khoản</Text>
            </Pressable>
          </View>
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
            onPress={(e) => e.stopPropagation()}
          >
            {/* Icon */}
            <View style={styles.logoutIconCircle}>
              <Ionicons name="log-out" size={28} color={fitnessTheme.danger} />
            </View>

            {/* Title & Desc */}
            <Text style={styles.logoutDialogTitle}>Xác nhận đăng xuất</Text>
            <Text style={styles.logoutDialogDesc}>
              Bạn có chắc chắn muốn đăng xuất? Token phiên làm việc hiện tại sẽ bị xóa hoàn toàn khỏi thiết bị để bảo mật.
            </Text>

            {/* Buttons */}
            <View style={styles.logoutBtnGroup}>
              <Pressable
                onPress={() => {
                  triggerHaptic('light');
                  setShowLogoutConfirmModal(false);
                }}
                disabled={isLoggingOut}
                style={({ pressed }) => [
                  styles.logoutCancelBtn,
                  pressed && styles.btnPressed,
                ]}
              >
                <Text style={styles.logoutCancelBtnText}>Ở lại</Text>
              </Pressable>

              <Pressable
                onPress={handleExecuteLogout}
                disabled={isLoggingOut}
                style={({ pressed }) => [
                  styles.logoutConfirmBtn,
                  pressed && styles.btnPressed,
                ]}
              >
                <Ionicons name="log-out-outline" size={17} color="#FFFFFF" />
                <Text style={styles.logoutConfirmBtnText}>
                  {isLoggingOut ? 'Đang xóa...' : 'Đăng xuất'}
                </Text>
              </Pressable>
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
    width: '100%',
    gap: 12,
  },
  logoutCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutCancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  logoutConfirmBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: fitnessTheme.danger,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: fitnessTheme.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  logoutConfirmBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  btnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
});
