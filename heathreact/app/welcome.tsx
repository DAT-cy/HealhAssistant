import { navigationService } from '@/routes';
import { useUserStore } from '@/stores/user';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Image, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function WelcomeRoute() {
  const insets = useSafeAreaInsets();
  const token = useUserStore((state) => state.token);
  const role = useUserStore((state) => state.role);
  const initialized = useUserStore((state) => state.initialized);

  React.useEffect(() => {
    if (initialized && token) router.replace(role === 'ROLE_ADMIN' ? '/admin/knowledge' : '/(user)');
  }, [initialized, role, token]);

  if (!initialized || token) return <View style={styles.loading} />;

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F8FC" />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingBottom: Math.max(insets.bottom, 16) + 20 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.brandRow}>
          <View style={styles.brandIdentity}>
            <View style={styles.brandIcon}><Ionicons name="heart" size={22} color="#FFFFFF" /></View>
            <Text style={styles.brand}>Health Assistant</Text>
          </View>
          <Pressable onPress={() => navigationService.navigate('Login')} style={({ pressed }) => [styles.mobileLoginButton, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel="Đăng nhập">
            <Ionicons name="log-in-outline" size={17} color="#635BFF" />
            <Text style={styles.mobileLoginText}>Đăng nhập</Text>
          </Pressable>
        </View>

        <Text style={styles.eyebrow}>SỨC KHỎE TỐT HƠN, MỖI NGÀY</Text>
        <Text style={styles.title}>Bắt đầu hành trình khỏe mạnh của bạn</Text>
        <Text style={styles.subtitle}>Kế hoạch vận động và theo dõi sức khỏe được xây dựng từ thông tin của bạn.</Text>

        <View style={styles.imageFrame}>
          <Image source={require('../src/assets/images/fitness-home.jpg')} resizeMode="cover" style={styles.image} accessibilityLabel="Người tập luyện với tạ trong phòng gym" />
          <View style={styles.imageOverlay}>
            <View style={styles.imageTag}><Ionicons name="sparkles" size={14} color="#635BFF" /><Text style={styles.imageTagText}>Đồng hành cùng bạn</Text></View>
          </View>
        </View>

        <View style={styles.valueList}>
          <ValueItem icon="locate-outline" label="Lộ trình cá nhân hóa" detail="Theo mục tiêu và thể trạng đã khai báo" color="#635BFF" background="#EFEEFF" />
          <ValueItem icon="stats-chart-outline" label="Theo dõi tiến độ" detail="Ghi nhận cân nặng và buổi tập thực tế" color="#268FCB" background="#E8F7FF" />
          <ValueItem icon="shield-checkmark-outline" label="Ưu tiên an toàn" detail="Nhắc dừng khi có đau hoặc khó chịu" color="#22A982" background="#E7FAF3" />
        </View>

        <Pressable onPress={() => navigationService.navigate('Login')} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]} accessibilityRole="button">
          <Text style={styles.primaryText}>Bắt đầu ngay</Text><Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
        </Pressable>
      </ScrollView>
    </View>
  );
}

function ValueItem({ icon, label, detail, color, background }: { icon: keyof typeof Ionicons.glyphMap; label: string; detail: string; color: string; background: string }) {
  return <View style={styles.valueItem}>
    <View style={[styles.valueIcon, { backgroundColor: background }]}><Ionicons name={icon} size={18} color={color} /></View>
    <View style={styles.valueCopy}><Text style={styles.valueTitle}>{label}</Text><Text style={styles.valueDetail}>{detail}</Text></View>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7F8FC' },
  loading: { flex: 1, backgroundColor: '#F7F8FC' },
  content: { paddingHorizontal: 22, gap: 12, maxWidth: 520, width: '100%', alignSelf: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  brandIdentity: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#635BFF' },
  brand: { color: '#20213A', fontSize: 17, fontWeight: '800' },
  mobileLoginButton: { minHeight: 38, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderWidth: 1, borderColor: '#DAD7FF', borderRadius: 9, backgroundColor: '#FFFFFF' },
  mobileLoginText: { color: '#635BFF', fontSize: 12, fontWeight: '800' },
  eyebrow: { color: '#635BFF', fontSize: 10, fontWeight: '800', marginTop: 4 },
  title: { color: '#20213A', fontSize: 29, lineHeight: 36, fontWeight: '800' },
  subtitle: { color: '#7A8099', fontSize: 14, lineHeight: 21 },
  imageFrame: { height: 235, marginTop: 5, overflow: 'hidden', borderRadius: 22, backgroundColor: '#E8EAF4' },
  image: { width: '100%', height: '100%' },
  imageOverlay: { position: 'absolute', left: 12, bottom: 12 },
  imageTag: { minHeight: 32, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.94)' },
  imageTagText: { color: '#4438CA', fontSize: 11, fontWeight: '700' },
  valueList: { gap: 7, marginTop: 2 },
  valueItem: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10 },
  valueIcon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  valueCopy: { flex: 1, gap: 2 },
  valueTitle: { color: '#20213A', fontSize: 12, fontWeight: '700' },
  valueDetail: { color: '#7A8099', fontSize: 11 },
  primaryButton: { minHeight: 52, marginTop: 8, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, borderRadius: 16, backgroundColor: '#635BFF', shadowColor: '#635BFF', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 4 },
  primaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  pressed: { opacity: 0.8 },
});
