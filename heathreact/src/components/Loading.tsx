import React from 'react';
import { ActivityIndicator, View } from 'react-native';

interface LoadingProps {
  size?: 'small' | 'large';
  color?: string;
}

export default function Loading({ size = 'large', color = '#3b82f6' }: LoadingProps) {
  return (
    <View className="flex-1 justify-center items-center">
      <ActivityIndicator size={size} color={color} />
    </View>
  );
}
