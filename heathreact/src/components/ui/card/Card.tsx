import React from 'react';
import { View, Text, ViewProps, TextProps } from 'react-native';
import { cn } from '@/utils/helper';

export function Card({ className, ...props }: ViewProps & { className?: string }) {
  return <View className={cn("rounded-lg bg-white shadow-sm border border-slate-200", className)} {...props} />;
}
export function CardHeader({ className, ...props }: ViewProps & { className?: string }) {
  return <View className={cn("p-4 border-b border-slate-100", className)} {...props} />;
}
export function CardTitle({ className, ...props }: TextProps & { className?: string }) {
  return <Text className={cn("text-lg font-semibold text-slate-900", className)} {...props} />;
}
export function CardDescription({ className, ...props }: TextProps & { className?: string }) {
  return <Text className={cn("text-sm text-slate-500 mt-1", className)} {...props} />;
}
export function CardContent({ className, ...props }: ViewProps & { className?: string }) {
  return <View className={cn("p-4", className)} {...props} />;
}
export function CardFooter({ className, ...props }: ViewProps & { className?: string }) {
  return <View className={cn("p-4 border-t border-slate-100 flex-row", className)} {...props} />;
}
