import React, { createContext, useContext } from 'react';
import { View, Text } from 'react-native';
import { cn } from '@/utils/helper';

interface FormFieldContextValue {
  name: string;
  error?: string;
}

export const FormFieldContext = createContext<FormFieldContextValue>({ name: '' });

export function FormControl({ children, className }: { children: React.ReactNode; className?: string }) {
  const { error } = useContext(FormFieldContext);
  return (
    <View className={className}>
      {children}
      {error && <Text className="text-xs text-red-500 mt-1">{error}</Text>}
    </View>
  );
}

export function FormDescription({ children, className }: { children: React.ReactNode; className?: string }) {
  return <Text className={cn("text-xs text-slate-500 mb-1", className)}>{children}</Text>;
}

export function FormField({ name, children, error, className }: { name: string; children: React.ReactNode; error?: string; className?: string }) {
  return (
    <FormFieldContext.Provider value={{ name, error }}>
      <View className={cn("mb-4", className)}>{children}</View>
    </FormFieldContext.Provider>
  );
}

export function FormItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return <View className={className}>{children}</View>;
}

export function FormLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <Text className={cn("text-sm font-medium text-slate-700 mb-1", className)}>{children}</Text>;
}

export function FormMessage({ name, className }: { name?: string; className?: string }) {
  const { error } = useContext(FormFieldContext);
  if (!error) return null;
  return <Text className={cn("text-xs text-red-500 mt-1", className)}>{error}</Text>;
}

export { useFormField } from './useFormField';
