import React, { useState } from 'react';
import { View, Text, TouchableOpacity, LayoutAnimation } from 'react-native';
import { cn } from '@/utils/helper';

interface AccordionItemProps {
  value: string;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export function AccordionItem({
  value,
  title,
  children,
  defaultOpen = false,
  className
}: AccordionItemProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <View className={cn("border-b border-slate-200", className)}>
      <TouchableOpacity
        className="flex-row justify-between items-center py-4 px-1"
        onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setIsOpen(!isOpen);
        }}
        activeOpacity={0.7}
      >
        <Text className="text-[15px] font-medium text-slate-900 flex-1">{title}</Text>
        <Text className="text-xs text-slate-500 ml-2">{isOpen ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {isOpen && <View className="pb-4 px-1">{children}</View>}
    </View>
  );
}

interface AccordionProps {
  type?: 'single' | 'multiple';
  collapsible?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function Accordion({ type = 'single', collapsible = true, children, className }: AccordionProps) {
  return <View className={className}>{children}</View>;
}

export function AccordionContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <Text className={cn("text-sm text-slate-500 leading-[22px]", className)}>{children}</Text>;
}

export function AccordionTrigger({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
