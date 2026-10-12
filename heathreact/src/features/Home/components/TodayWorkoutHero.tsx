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
import { fitnessTheme, TodayWorkout } from './HomeTypes';

interface Props {
  workout: TodayWorkout;
  onStartWorkout: () => void;
}

export default function TodayWorkoutHero({ workout, onStartWorkout }: Props) {
  const triggerHaptic = () => {
    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch {
      // Haptics fallback
    }
  };

  const handlePress = () => {
    triggerHaptic();
    onStartWorkout();
  };

  return (
    <View style={styles.cardContainer}>
      {/* Background Workout Image on the right */}
      <Image
        source={{ uri: workout.imageUrl }}
        style={styles.bgImage}
        resizeMode="cover"
      />

      {/* Dark overlay scrim to make left text 100% readable */}
      <View style={styles.darkGradientScrim} />

      {/* Content Col */}
      <View style={styles.contentCol}>
        {/* Badge: TODAY'S WORKOUT */}
        <View style={styles.badgePill}>
          <Text style={styles.badgeText}>TODAY'S WORKOUT</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>{workout.title}</Text>

        {/* Short Description */}
        <Text style={styles.description} numberOfLines={2}>
          {workout.description}
        </Text>

        {/* Metadata: 6 bài tập • 35 phút • Trung bình */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="barbell-outline" size={15} color="#E2E8F0" />
            <Text style={styles.metaText}>{workout.exercisesCount} bài tập</Text>
          </View>

          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={15} color="#E2E8F0" />
            <Text style={styles.metaText}>{workout.durationMinutes} phút</Text>
          </View>

          <View style={styles.metaItem}>
            <Ionicons name="cellular-outline" size={14} color="#E2E8F0" />
            <Text style={styles.metaText}>{workout.difficulty}</Text>
          </View>
        </View>

        {/* Big Neon Green Button: Bắt đầu tập luyện > */}
        <Pressable
          onPress={handlePress}
          style={({ pressed }) => [
            styles.ctaButton,
            pressed && styles.ctaButtonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Bắt đầu tập luyện"
        >
          <Text style={styles.ctaButtonText}>Bắt đầu tập luyện</Text>
          <Ionicons name="chevron-forward" size={16} color="#0B0F14" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#111827',
    borderRadius: 22,
    padding: 20,
    marginBottom: 24,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 8,
    minHeight: 230,
    justifyContent: 'center',
  },
  bgImage: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: '68%',
    height: '100%',
    opacity: 0.88,
  },
  darkGradientScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
  },
  contentCol: {
    width: '82%',
    zIndex: 2,
  },
  badgePill: {
    alignSelf: 'flex-start',
    backgroundColor: '#22C55E',
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 14,
    marginBottom: 10,
  },
  badgeText: {
    color: '#090E17',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  description: {
    fontSize: 12.5,
    color: '#CBD5E1',
    lineHeight: 18,
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 18,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    color: '#F1F5F9',
    fontSize: 12,
    fontWeight: '600',
  },
  ctaButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#22C55E',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 6,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaButtonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  ctaButtonText: {
    color: '#0B0F14',
    fontSize: 13.5,
    fontWeight: '800',
  },
});
