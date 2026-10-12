import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { RecommendedExercise } from './HomeTypes';

interface Props {
  exercises: RecommendedExercise[];
  onSelectExercise: (exercise: RecommendedExercise) => void;
  onSeeAll: () => void;
}

export default function RecommendedWorkoutsSection({ exercises, onSelectExercise, onSeeAll }: Props) {
  const triggerHaptic = () => {
    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch {
      // Haptics fallback
    }
  };

  const getBadgeStyle = (tag: 'Dễ' | 'Trung bình' | 'Khó') => {
    switch (tag) {
      case 'Dễ':
        return {
          bg: '#DCFCE7',
          color: '#16A34A',
        };
      case 'Trung bình':
        return {
          bg: '#FEF3C7',
          color: '#D97706',
        };
      case 'Khó':
        return {
          bg: '#FEE2E2',
          color: '#DC2626',
        };
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Bài tập đề xuất</Text>

        <Pressable onPress={onSeeAll} hitSlop={8} style={styles.seeAllBtn}>
          <Text style={styles.seeAllText}>Xem tất cả</Text>
          <Ionicons name="chevron-forward" size={13} color="#64748B" />
        </Pressable>
      </View>

      {/* Cards List */}
      <View style={styles.list}>
        {exercises.map((item) => {
          const badgeStyle = getBadgeStyle(item.difficultyTag);
          return (
            <Pressable
              key={item.id}
              onPress={() => {
                triggerHaptic();
                onSelectExercise(item);
              }}
              style={({ pressed }) => [
                styles.card,
                pressed && styles.cardPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Bài tập ${item.name}`}
            >
              {/* Left: Thumbnail Image */}
              <Image
                source={{ uri: item.imageUrl }}
                style={styles.thumbnail}
                resizeMode="cover"
              />

              {/* Middle: Info */}
              <View style={styles.infoCol}>
                <Text style={styles.title} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.muscle} numberOfLines={1}>
                  {item.targetMuscle}
                </Text>
                <View style={styles.metaRow}>
                  <View style={styles.metaPair}>
                    <Ionicons name="calendar-outline" size={12} color="#64748B" />
                    <Text style={styles.metaText}>{item.sets}</Text>
                  </View>
                  <View style={styles.metaPair}>
                    <Ionicons
                      name={item.repsOrDuration.includes('giây') ? 'time-outline' : 'barbell-outline'}
                      size={12}
                      color="#64748B"
                    />
                    <Text style={styles.metaText}>{item.repsOrDuration}</Text>
                  </View>
                </View>
              </View>

              {/* Right: Badge + Chevron */}
              <View style={styles.rightCol}>
                <View style={[styles.tagBadge, { backgroundColor: badgeStyle.bg }]}>
                  <Text style={[styles.tagBadgeText, { color: badgeStyle.color }]}>
                    {item.difficultyTag}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
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
  list: {
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
    gap: 12,
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  thumbnail: {
    width: 68,
    height: 52,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
  },
  infoCol: {
    flex: 1,
  },
  title: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  muscle: {
    fontSize: 11.5,
    color: '#64748B',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  metaPair: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  rightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  tagBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
