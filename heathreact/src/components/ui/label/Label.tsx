import React from 'react';
import { Text, TextProps } from 'react-native';
import { cn } from '@/utils/helper';

interface LabelProps extends TextProps {
  className?: string;
}

export function Label({ children, className, ...props }: LabelProps) {
  return (
    <Text className={cn("text-sm font-medium text-slate-700 mb-1", className)} {...props}>
      {children}
    </Text>
  );
}
