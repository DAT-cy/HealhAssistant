import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { cn } from '@/utils/helper';
import AppModal from '@/components/ui/AppModal';

export function DropdownMenu({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function DropdownMenuTrigger({ children, onPress, className }: { children: React.ReactNode; onPress: () => void; className?: string }) {
  return <TouchableOpacity onPress={onPress} className={className}>{children}</TouchableOpacity>;
}

export function DropdownMenuContent({
  visible,
  onClose,
  children,
  className
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <AppModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1 }} onPress={onClose}>
        <Pressable onPress={(event) => event.stopPropagation()} className={cn("absolute top-24 left-4 bg-white rounded-lg border border-slate-200 py-1.5 px-1 min-w-[180px] shadow-sm elevation-4", className)}>
          {children}
        </Pressable>
      </Pressable>
    </AppModal>
  );
}

export function DropdownMenuItem({ children, onPress, className }: { children: React.ReactNode; onPress?: () => void; className?: string }) {
  return (
    <TouchableOpacity className={cn("py-2 px-3 flex-row items-center", className)} onPress={onPress} activeOpacity={0.7}>
      <Text className="text-sm text-slate-900">{children}</Text>
    </TouchableOpacity>
  );
}

export function DropdownMenuLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <Text className={cn("text-xs font-semibold text-slate-500 py-1 px-3 uppercase", className)}>{children}</Text>;
}
export function DropdownMenuSeparator({ className }: { className?: string }) {
  return <View className={cn("h-[1px] bg-slate-200 my-1", className)} />;
}
export function DropdownMenuGroup({ children, className }: { children: React.ReactNode; className?: string }) {
  return <View className={className}>{children}</View>;
}
export function DropdownMenuCheckboxItem() { return null; }
export function DropdownMenuRadioGroup() { return null; }
export function DropdownMenuRadioItem() { return null; }
export function DropdownMenuShortcut() { return null; }
export function DropdownMenuSub() { return null; }
export function DropdownMenuSubContent() { return null; }
export function DropdownMenuSubTrigger() { return null; }
