import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { cn } from '@/utils/helper';
import AppModal from '@/components/ui/AppModal';

export function Dialog({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: React.ReactNode }) {
  return (
    <AppModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1 }} onPress={onClose}>
        <View className="flex-1 bg-black/40 justify-center items-center p-4">
          <Pressable onPress={(event) => event.stopPropagation()} className="bg-white rounded-xl w-full max-w-[480px]">{children}</Pressable>
        </View>
      </Pressable>
    </AppModal>
  );
}
export function DialogContent({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <View className={cn("p-6", className)}>{children}</View>;
}
export function DialogHeader({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <View className={cn("mb-4", className)}>{children}</View>;
}
export function DialogTitle({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <Text className={cn("text-lg font-semibold text-slate-900", className)}>{children}</Text>;
}
export function DialogDescription({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <Text className={cn("text-sm text-slate-500 mt-1", className)}>{children}</Text>;
}
export function DialogFooter({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <View className={cn("flex-row justify-end gap-2 mt-6", className)}>{children}</View>;
}
export function DialogClose({ onClose, className }: { onClose: () => void; className?: string }) {
  return (
    <TouchableOpacity onPress={onClose} className={cn("absolute right-4 top-4", className)}>
      <Text className="text-lg text-slate-500">✕</Text>
    </TouchableOpacity>
  );
}
export function DialogTrigger({ children, onPress, className }: { children: React.ReactNode; onPress: () => void; className?: string }) {
  return <TouchableOpacity onPress={onPress} className={className}>{children}</TouchableOpacity>;
}
export function DialogScrollContent({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <ScrollView className={cn("p-6", className)}>{children}</ScrollView>;
}
