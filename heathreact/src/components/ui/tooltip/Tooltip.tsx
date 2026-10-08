import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { cn } from '@/utils/helper';

export function Tooltip({ children }: { children: React.ReactNode }) {
  return <View>{children}</View>;
}

export function TooltipTrigger({ children, onPress, className }: { children: React.ReactNode; onPress: () => void; className?: string }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} className={className}>
      {children}
    </TouchableOpacity>
  );
}

export function TooltipContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <View className={cn("bg-slate-800 rounded-md py-2 px-3 mt-1", className)}>
      <Text className="text-white text-[13px]">{children}</Text>
    </View>
  );
}

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <View>{children}</View>;
}
