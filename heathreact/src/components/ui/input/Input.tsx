import React from 'react';
import { TextInput, View, Text, TextInputProps } from 'react-native';
import { cn } from '@/utils/helper';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  className?: string;
  wrapperClassName?: string;
}

export function Input({ label, error, className, wrapperClassName, ...props }: InputProps) {
  return (
    <View className={cn("mb-4", wrapperClassName)}>
      {label && <Text className="text-sm font-medium mb-1 text-slate-700">{label}</Text>}
      <TextInput
        className={cn(
          "border border-slate-300 rounded-md py-2 px-3 text-sm text-slate-900 bg-white",
          error && "border-red-500",
          className
        )}
        placeholderTextColor="#9ca3af"
        {...props}
      />
      {error && <Text className="text-xs text-red-500 mt-1">{error}</Text>}
    </View>
  );
}
