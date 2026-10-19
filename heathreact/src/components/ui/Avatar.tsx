import React from 'react';
import { Image, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type ProfileGender = 'MALE' | 'FEMALE';

interface Props {
  gender: ProfileGender | null;
  imageUrl?: string | null;
  size: number;
}

const appearance = {
  MALE: { icon: 'man' as const, background: '#E8F7FF', color: '#268FCB', label: 'Ảnh đại diện nam mặc định' },
  FEMALE: { icon: 'woman' as const, background: '#F2EEFF', color: '#8C72EA', label: 'Ảnh đại diện nữ mặc định' },
  NEUTRAL: { icon: 'person-outline' as const, background: '#EEF0F8', color: '#747B97', label: 'Ảnh đại diện mặc định' },
};

export default function Avatar({ gender, imageUrl, size }: Props) {
  if (imageUrl) {
    return <Image source={{ uri: imageUrl }} accessibilityLabel="Ảnh đại diện" style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#EEF0F8' }} />;
  }

  const style = gender ? appearance[gender] : appearance.NEUTRAL;
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={style.label}
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: style.background, alignItems: 'center', justifyContent: 'center' }}
    >
      <Ionicons name={style.icon} size={size * 0.52} color={style.color} />
    </View>
  );
}
