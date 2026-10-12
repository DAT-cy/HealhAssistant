import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';

interface Props {
  bottomInset: number;
  activeTab: 'Home' | 'Workout' | 'Progress' | 'Profile';
  onSelectTab: (tab: 'Home' | 'Workout' | 'Progress' | 'Profile') => void;
}

export default function HomeTabBar({ bottomInset, activeTab, onSelectTab }: Props) {
  const triggerHaptic = () => {
    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch {
      // Haptics fallback
    }
  };

  const tabs: Array<{
    key: 'Home' | 'Workout' | 'Progress' | 'Profile';
    label: string;
    iconActive: keyof typeof Ionicons.glyphMap;
    iconInactive: keyof typeof Ionicons.glyphMap;
  }> = [
    { key: 'Home', label: 'Home', iconActive: 'home', iconInactive: 'home-outline' },
    { key: 'Workout', label: 'Workout', iconActive: 'barbell', iconInactive: 'barbell-outline' },
    { key: 'Progress', label: 'Progress', iconActive: 'stats-chart', iconInactive: 'stats-chart-outline' },
    { key: 'Profile', label: 'Profile', iconActive: 'person', iconInactive: 'person-outline' },
  ];

  return (
    <View style={[styles.tabBar, { paddingBottom: Math.max(bottomInset, 10) }]}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <Pressable
            key={tab.key}
            onPress={() => {
              triggerHaptic();
              onSelectTab(tab.key);
            }}
            style={styles.tabItem}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={tab.label}
          >
            <Ionicons
              name={isActive ? tab.iconActive : tab.iconInactive}
              size={23}
              color={isActive ? '#22C55E' : '#64748B'}
            />
            <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 8,
  },
  tabItem: {
    alignItems: 'center',
    gap: 3,
    minWidth: 64,
    paddingVertical: 2,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#22C55E',
    fontWeight: '800',
  },
});
