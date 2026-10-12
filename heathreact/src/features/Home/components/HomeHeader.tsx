import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Alert,
  Image,
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

interface Props {
  username: string;
  onLogout: () => void;
  topInset: number;
}

export default function HomeHeader({ username, onLogout, topInset }: Props) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showLogoutConfirmModal, setShowLogoutConfirmModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const displayName = username?.split(' ')[0] || 'Tuấn';

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
            <Image
              source={{
                uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
              }}
              style={styles.avatarImage}
            />
          </Pressable>

          <View style={styles.greetingMeta}>
            <Text style={styles.greetingLight}>Good morning,</Text>
            <Text style={styles.greetingName}>
              {displayName} 👋
            </Text>
            <Text style={styles.greetingSubtitle}>
              Sẵn sàng chinh phục mục tiêu hôm nay?
            </Text>
          </View>
        </View>

        {/* Right: Notification Bell */}
        <Pressable
          onPress={() => {
            triggerHaptic('light');
            setShowNotificationModal(true);
          }}
          style={({ pressed }) => [
            styles.notificationBtn,
            pressed && styles.notificationBtnPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Xem thông báo"
        >
          <Ionicons name="notifications-outline" size={22} color="#0F172A" />
          <View style={styles.redDot} />
        </Pressable>
      </View>

      {/* ============================================================ */}
      {/* 2. SUB ROW: DATE & TARGET GOAL BADGE                         */}
      {/* ============================================================ */}
      <View style={styles.subRow}>
        {/* Left: Date */}
        <View style={styles.dateCol}>
          <Ionicons name="calendar-outline" size={15} color="#64748B" />
          <Text style={styles.dateText}>Thứ 5, 24 tháng 4, 2025</Text>
        </View>

        {/* Right: Target Goal Badge */}
        <View style={styles.goalPill}>
          <Ionicons name="disc-outline" size={14} color="#16A34A" />
          <Text style={styles.goalPillText}>Tăng cơ</Text>
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
              <Image
                source={{
                  uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
                }}
                style={styles.dropdownAvatarImg}
              />
              <View style={styles.dropdownUserMeta}>
                <Text style={styles.dropdownUserName} numberOfLines={1}>
                  {username || 'Tuấn'}
                </Text>
                <View style={styles.onlineBadge}>
                  <View style={styles.onlineDot} />
                  <Text style={styles.onlineText}>Đang hoạt động</Text>
                </View>
                <View style={styles.memberTag}>
                  <Text style={styles.memberTagText}>Hội viên AI Fitness</Text>
                </View>
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
              <View style={[styles.dropdownItemIcon, { backgroundColor: '#ECFDF5' }]}>
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
              <View style={[styles.dropdownItemIcon, { backgroundColor: '#F5F3FF' }]}>
                <Ionicons name="analytics-outline" size={17} color="#8B5CF6" />
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

            <View style={styles.tipItem}>
              <View style={[styles.tipIconBox, { backgroundColor: '#ECFDF5' }]}>
                <Ionicons name="water-outline" size={16} color={fitnessTheme.primary} />
              </View>
              <View style={styles.tipTextGroup}>
                <Text style={styles.tipHeadline}>Uống đủ nước trước tập</Text>
                <Text style={styles.tipBody}>
                  Uống 300–500ml nước trước buổi tập 20 phút để duy trì tuần hoàn máu tốt.
                </Text>
              </View>
            </View>

            <View style={styles.tipItem}>
              <View style={[styles.tipIconBox, { backgroundColor: '#F0F9FF' }]}>
                <Ionicons name="scan-outline" size={16} color={fitnessTheme.accent} />
              </View>
              <View style={styles.tipTextGroup}>
                <Text style={styles.tipHeadline}>Quét tư thế khớp gối</Text>
                <Text style={styles.tipBody}>
                  Bài Squat hôm nay hỗ trợ AI Landmark Scan kiểm tra góc gối 90° an toàn.
                </Text>
              </View>
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
              <Ionicons name="log-out" size={28} color="#EF4444" />
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
    marginBottom: 14,
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
  avatarImage: {
    width: '100%',
    height: '100%',
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
    color: '#94A3B8',
    marginTop: 2,
  },
  notificationBtn: {
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
  redDot: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#EF4444',
  },

  /* Sub Row */
  subRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  goalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 5,
  },
  goalPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16A34A',
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
  dropdownAvatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  dropdownUserMeta: {
    flex: 1,
  },
  dropdownUserName: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
  },
  onlineText: {
    color: '#16A34A',
    fontSize: 11,
    fontWeight: '600',
  },
  memberTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 3,
  },
  memberTagText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '600',
  },
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
    color: '#EF4444',
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
  tipItem: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  tipIconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  tipTextGroup: {
    flex: 1,
  },
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
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#EF4444',
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
