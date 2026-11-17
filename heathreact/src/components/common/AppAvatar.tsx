import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme';
export function AppAvatar({ name, size = 44 }: { name: string; size?: number }) { return <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}><Text style={[styles.text, { fontSize: Math.max(14, size * 0.36) }]}>{name.trim().slice(0, 1).toUpperCase() || '?'}</Text></View>; }
const styles = StyleSheet.create({ avatar: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft }, text: { color: colors.primary, fontWeight: '800' } });
