import { createNavigationContainerRef } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from './RootNavigator';

// ============================================================
// Navigation ref – dùng để navigate từ file không phải component
// ============================================================
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

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
  if (navigationRef.isReady()) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    navigationRef.navigate(name as any, params as any);
  } else {
    setTimeout(() => {
      if (navigationRef.isReady()) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        navigationRef.navigate(name as any, params as any);
      }
    }, 50);
  }
}

/** Thay thế toàn bộ stack và chuyển trang (không back được) */
function replace<T extends keyof RootStackParamList>(
  name: T,
  params?: RootStackParamList[T],
) {
  const resetAction = () => {
    try {
      if (navigationRef.isReady()) {
        navigationRef.reset({
          index: 0,
          routes: [{ name: name as any, params: params as any }],
        });
      }
    } catch (e) {
      console.warn('[navigationService.replace] error:', e);
    }
  };

  if (navigationRef.isReady()) {
    resetAction();
  } else {
    setTimeout(resetAction, 50);
  }
}

/** Quay lại trang trước */
function goBack() {
  if (navigationRef.isReady() && navigationRef.canGoBack()) {
    navigationRef.goBack();
  }
}

export const navigationService = { navigate, replace, goBack };
