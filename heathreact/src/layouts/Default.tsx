import React from 'react';
import { View } from 'react-native';

export default function DefaultLayout({ children }: { children?: React.ReactNode }) {
  return (
    <View className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="bg-white border-b border-slate-200 pt-12 pb-2 px-4">
        <View className="items-center">
          {/* Header content goes here */}
        </View>
      </View>
      {/* Main content */}
      <View className="flex-1">
        {children}
      </View>
      {/* Footer */}
      <View className="bg-white border-t border-slate-200 pb-6 pt-2">
        <View className="items-center">
          {/* Footer content goes here */}
        </View>
      </View>
    </View>
  );
}
