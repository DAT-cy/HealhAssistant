import React, { useState, createContext, useContext } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { cn } from '@/utils/helper';

export function Tabs({ defaultValue, children, className }: { defaultValue?: string; children: React.ReactNode; className?: string }) {
  const [activeTab, setActiveTab] = useState(defaultValue ?? '');
  return (
    <View className={className}>
      <TabsContext.Provider value={{ activeTab, setActiveTab }}>
        {children}
      </TabsContext.Provider>
    </View>
  );
}

const TabsContext = createContext<{ activeTab: string; setActiveTab: (v: string) => void }>({
  activeTab: '',
  setActiveTab: () => {},
});

export function TabsList({ children, className }: { children: React.ReactNode; className?: string }) {
  return <View className={cn("flex-row border-b border-slate-200 gap-0", className)}>{children}</View>;
}

export function TabsTrigger({
  value,
  children,
  className,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { activeTab, setActiveTab } = useContext(TabsContext);
  const isActive = activeTab === value;
  return (
    <TouchableOpacity
      className={cn("py-2.5 px-4 border-b-2 border-transparent", isActive && "border-slate-900", className)}
      onPress={() => setActiveTab(value)}
      activeOpacity={0.7}
    >
      <Text className={cn("text-sm text-slate-500 font-medium", isActive && "text-slate-900")}>{children}</Text>
    </TouchableOpacity>
  );
}

export function TabsContent({
  value,
  children,
  className,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { activeTab } = useContext(TabsContext);
  if (activeTab !== value) return null;
  return <View className={cn("pt-4", className)}>{children}</View>;
}
