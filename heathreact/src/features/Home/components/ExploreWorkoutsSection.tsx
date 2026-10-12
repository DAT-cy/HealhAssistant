import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { MuscleCategory } from './HomeTypes';

interface Props {
  categories: MuscleCategory[];
  onSelectCategory: (category: MuscleCategory) => void;
  onSeeAll: () => void;
}

export default function ExploreWorkoutsSection({ categories, onSelectCategory, onSeeAll }: Props) {
  const triggerHaptic = () => {
    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch {
      // Haptics fallback
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Khám phá bài tập</Text>

        <Pressable onPress={onSeeAll} hitSlop={8} style={styles.seeAllBtn}>
          <Text style={styles.seeAllText}>Xem tất cả</Text>
          <Ionicons name="chevron-forward" size={13} color="#64748B" />
        </Pressable>
      </View>

      {/* Horizontal Image Cards Scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollList}
      >
        {categories.map((cat) => (
          <Pressable
            key={cat.id}
            onPress={() => {
              triggerHaptic();
              onSelectCategory(cat);
            }}
            style={({ pressed }) => [
              styles.card,
              pressed && styles.cardPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Nhóm cơ ${cat.name}`}
          >
            {/* Background Muscle Image */}
            <Image
              source={{ uri: cat.imageUrl }}
              style={styles.cardImage}
              resizeMode="cover"
            />

            {/* Bottom Scrim Overlay */}
            <View style={styles.scrimOverlay} />

            {/* Text at Bottom */}
            <View style={styles.textContainer}>
              <Text style={styles.catName} numberOfLines={1}>
                {cat.name}
              </Text>
              <Text style={styles.catCount} numberOfLines={1}>
                {cat.exerciseCountText}
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748B',
  },
  scrollList: {
    paddingRight: 10,
    gap: 10,
  },
  card: {
    width: 104,
    height: 128,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  scrimOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  textContainer: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 8,
  },
  catName: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  catCount: {
    fontSize: 10.5,
    color: '#E2E8F0',
    fontWeight: '500',
  },
});
