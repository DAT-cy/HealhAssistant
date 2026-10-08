import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { navigationService } from '@/routes';

export default function NotFoundPage() {
  const insets = useSafeAreaInsets();

  return (
    <View 
      className="flex-1 bg-slate-100"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <View className="flex-1 justify-center p-8">
        <View className="bg-white rounded-2xl p-8 items-center shadow-md shadow-black/5 elevation-3">
          <Text className="text-[72px] font-black text-purple-400 mb-4">404</Text>
          <Text className="text-2xl font-semibold text-slate-900 mb-4 text-center">
            Oops! Page not found
          </Text>
          <Text className="text-base text-slate-500 text-center leading-6 mb-8">
            Oops! The page you are looking for does not exist. It might have been moved or deleted.
          </Text>
          <View className="flex-row gap-3">
            <TouchableOpacity
              className="py-3 px-6 rounded-lg bg-indigo-500"
              onPress={() => navigationService.replace('Home')}
              activeOpacity={0.8}
            >
              <Text className="text-white font-bold text-sm">HOME</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="py-3 px-6 rounded-lg bg-red-500"
              onPress={() => {}}
              activeOpacity={0.8}
            >
              <Text className="text-white font-bold text-sm">Contact Us</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}
