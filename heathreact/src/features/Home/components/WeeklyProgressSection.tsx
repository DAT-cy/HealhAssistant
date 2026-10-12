import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { fitnessTheme, WeeklyProgressData } from './HomeTypes';

interface Props {
  progress: WeeklyProgressData;
  onViewDetails: () => void;
}

export default function WeeklyProgressSection({ progress, onViewDetails }: Props) {
  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Tiến độ tuần</Text>

        <Pressable onPress={onViewDetails} hitSlop={8} style={styles.seeDetailBtn}>
          <Text style={styles.seeDetailText}>Xem chi tiết</Text>
          <Ionicons name="chevron-forward" size={13} color="#64748B" />
        </Pressable>
      </View>

      {/* 4 Cards Row */}
      <View style={styles.cardsRow}>
        {/* Card 1: Circle ring 3/5 - Buổi tập */}
        <View style={styles.cardItem}>
          <View style={styles.circleRing}>
            <Text style={styles.circleText}>
              {progress.completedWorkouts}/{progress.targetWorkouts}
            </Text>
          </View>
          <Text style={styles.cardLabel}>Buổi tập</Text>
        </View>

        {/* Card 2: Clock - 120 phút - Thời gian tập */}
        <View style={styles.cardItem}>
          <View style={styles.iconCircle}>
            <Ionicons name="time-outline" size={18} color="#16A34A" />
          </View>
          <Text style={styles.cardValue}>{progress.activeTimeMinutes} phút</Text>
          <Text style={styles.cardLabel}>Thời gian tập</Text>
        </View>

        {/* Card 3: Flame - 4 ngày - Chuỗi ngày tập */}
        <View style={styles.cardItem}>
          <View style={styles.iconCircle}>
            <Ionicons name="flame" size={18} color="#F59E0B" />
          </View>
          <Text style={styles.cardValue}>{progress.currentStreakDays} ngày</Text>
          <Text style={styles.cardLabel}>Chuỗi ngày tập</Text>
        </View>

        {/* Card 4: Target - 60% - Hoàn thành mục tiêu */}
        <View style={styles.cardItem}>
          <View style={styles.iconCircle}>
            <Ionicons name="disc-outline" size={18} color="#EF4444" />
          </View>
          <Text style={styles.cardValue}>{progress.completionRatePercent}%</Text>
          <Text style={styles.cardLabel}>Hoàn thành mục tiêu</Text>
        </View>
      </View>

      {/* Progress Bar + Week 2/4 text */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBarTrack}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${progress.completionRatePercent}%` },
            ]}
          />
        </View>
        <Text style={styles.weekLabel}>{progress.currentWeekText}</Text>
      </View>
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
  seeDetailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeDetailText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748B',
  },

  /* 4 Cards Grid */
  cardsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  cardItem: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
    minHeight: 104,
  },
  circleRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3.5,
    borderColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  circleText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  cardValue: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  cardLabel: {
    fontSize: 10,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 3,
    lineHeight: 13,
  },

  /* Progress Bar */
  progressContainer: {
    marginTop: 4,
  },
  progressBarTrack: {
    height: 7,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#22C55E',
    borderRadius: 4,
  },
  weekLabel: {
    alignSelf: 'flex-end',
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
});
