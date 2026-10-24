import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { navigationService } from '@/routes';
import { palette, spacing } from '@/theme/tokens';
import HomeTabBar from '@/features/Home/components/HomeTabBar';

type MainTab = 'Home' | 'Workout' | 'Progress' | 'Profile';

interface Props {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  scroll?: boolean;
  showBack?: boolean;
  right?: React.ReactNode;
  activeTab?: Exclude<MainTab, 'Home'>;
}

export default function Screen({ title, subtitle, children, scroll = true, showBack = false, right, activeTab }: Props) {
  const insets = useSafeAreaInsets();
  const header = (
    <View style={[styles.header, showBack && styles.headerCompact]}>
      <View style={styles.titleRow}>
        {showBack ? <Text style={styles.back} onPress={() => navigationService.goBack()} accessibilityRole="button" accessibilityLabel="Quay lại">‹</Text> : null}
        <View style={styles.titleWrap}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {right ? <View style={styles.headerAction}>{right}</View> : null}
      </View>
    </View>
  );
  const body = <View style={styles.body}>{children}</View>;
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {header}
      {scroll ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + (activeTab ? 92 : spacing.xl) }}>{body}</ScrollView>
      ) : (
        body
      )}
      {activeTab ? <HomeTabBar bottomInset={insets.bottom} activeTab={activeTab} onSelectTab={(tab) => {
        if (tab === 'Home') navigationService.replace('Home');
        else navigationService.replace(tab);
      }} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.md },
  headerCompact: { paddingTop: spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  titleWrap: { flex: 1, minWidth: 0 },
  headerAction: { width: 46, height: 46, flexShrink: 0, alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
  back: { color: palette.primary, fontSize: 34, lineHeight: 36, marginTop: -4 },
  title: { color: palette.text, fontSize: 24, fontWeight: '800' },
  subtitle: { color: palette.textMuted, fontSize: 14, marginTop: 5 },
  body: { paddingHorizontal: spacing.xl, gap: spacing.md },
});
