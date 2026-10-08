import React from 'react';
import { View, Text } from 'react-native';
import { cn } from '@/utils/helper';

export function NavigationMenu({ children, className }: { children: React.ReactNode; className?: string }) {
  return <View className={className}>{children}</View>;
}
export function NavigationMenuList({ children, className }: { children: React.ReactNode; className?: string }) {
  return <View className={cn("flex-row gap-1", className)}>{children}</View>;
}
export function NavigationMenuItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return <View className={className}>{children}</View>;
}
export function NavigationMenuLink({ children, href, className }: { children: React.ReactNode; href?: string; className?: string }) {
  return <Text className={cn("text-sm font-medium text-slate-700 py-2 px-3", className)}>{children}</Text>;
}
export function NavigationMenuTrigger() { return null; }
export function NavigationMenuContent() { return null; }
export function NavigationMenuIndicator() { return null; }
export function NavigationMenuViewport() { return null; }
