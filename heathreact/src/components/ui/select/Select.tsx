import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { cn } from '@/utils/helper';

export function Select({ value, onValueChange, children }: { value?: string; onValueChange?: (v: string) => void; children: React.ReactNode }) {
  return <>{children}</>;
}

export function SelectTrigger({ children, onPress, className }: { children: React.ReactNode; onPress: () => void; className?: string }) {
  return (
    <TouchableOpacity className={cn("flex-row items-center justify-between border border-slate-300 rounded-md py-2 px-3 bg-white", className)} onPress={onPress} activeOpacity={0.7}>
      <Text className="text-sm text-slate-900">{children}</Text>
      <Text className="text-[10px] text-slate-500 ml-2">▼</Text>
    </TouchableOpacity>
  );
}

export function SelectValue({ placeholder, value, className }: { placeholder?: string; value?: string; className?: string }) {
  return <Text className={cn("text-sm text-slate-900", className)}>{value || placeholder}</Text>;
}

export function SelectContent({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: React.ReactNode }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="flex-1 bg-black/40 justify-end">
          <TouchableWithoutFeedback>
            <View className="bg-white rounded-t-2xl pb-8 max-h-[60%]">{children}</View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

export function SelectItem({ value, children, onPress, className }: { value: string; children: React.ReactNode; onPress: () => void; className?: string }) {
  return (
    <TouchableOpacity className={cn("py-3 px-4", className)} onPress={onPress} activeOpacity={0.7}>
      <Text className="text-sm text-slate-900">{children}</Text>
    </TouchableOpacity>
  );
}

export function SelectLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <Text className={cn("text-xs font-semibold text-slate-500 py-2 px-4", className)}>{children}</Text>;
}
export function SelectGroup({ children, className }: { children: React.ReactNode; className?: string }) {
  return <View className={className}>{children}</View>;
}
export function SelectSeparator({ className }: { className?: string }) {
  return <View className={cn("h-[1px] bg-slate-200", className)} />;
}
export function SelectItemText({ children }: { children: React.ReactNode }) {
  return <Text>{children}</Text>;
}
export function SelectScrollDownButton() { return null; }
export function SelectScrollUpButton() { return null; }
