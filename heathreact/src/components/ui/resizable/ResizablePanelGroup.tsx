import React from 'react';
import { View } from 'react-native';
import { cn } from '@/utils/helper';

export function ResizablePanelGroup({ direction = 'horizontal', children, className }: { direction?: 'horizontal' | 'vertical'; children: React.ReactNode; className?: string }) {
  return (
    <View className={cn("flex-row", direction === 'vertical' && "flex-col", className)}>
      {children}
    </View>
  );
}

export function ResizableHandle({ withHandle, className }: { withHandle?: boolean; className?: string }) {
  return (
    <View className={cn("bg-slate-200 flex-row items-center justify-center", withHandle && "bg-transparent", className)}>
      {withHandle && <View className="w-1 h-6 bg-slate-300 rounded-sm" />}
    </View>
  );
}
