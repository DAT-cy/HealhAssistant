import React from 'react';
import type { NavigationContainerRef } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from './RootNavigator';

// ============================================================
// Navigation ref – dùng để navigate từ file không phải component
// ============================================================
export const navigationRef = React.createRef<NavigationContainerRef<RootStackParamList>>();

// ============================================================
// Type helpers
// ============================================================
export type { RootStackParamList };
export type RootNavigationProp = NativeStackNavigationProp<RootStackParamList>;

// ============================================================
// Navigation helpers – gọi được từ bất kỳ đâu
// ============================================================

/** Chuyển trang (bấm Back quay lại được) */
function navigate<T extends keyof RootStackParamList>(
  name: T,
  params?: RootStackParamList[T],
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigationRef.current?.navigate(name as any, params as any);
}

/** Thay thế trang hiện tại (không back được) */
function replace<T extends keyof RootStackParamList>(
  name: T,
  params?: RootStackParamList[T],
) {
  navigationRef.current?.reset({
    index: 0,
    routes: [{ name, params: params as any }],
  });
}

/** Quay lại trang trước */
function goBack() {
  navigationRef.current?.goBack();
}

export const navigationService = { navigate, replace, goBack };
