import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import { cn } from '@/utils/helper';

type ToastVariant = 'default' | 'destructive';

interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
}

interface ToastContextValue {
  toast: (props: Omit<Toast, 'id'>) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((props: Omit<Toast, 'id'>) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { ...props, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </ToastContext.Provider>
  );
}

export function ToastViewport({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  return (
    <View className="absolute bottom-12 left-4 right-4 z-50">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </View>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => onDismiss());
    }, 2700);
    return () => clearTimeout(timer);
  }, []);

  const isDestructive = toast.variant === 'destructive';

  return (
    <Animated.View style={{ opacity: fadeAnim }} className={cn("bg-slate-800 rounded-lg p-4 mb-2 shadow-md shadow-black/15 elevation-5", isDestructive && "bg-red-600")}>
      {toast.title && <Text className="text-white font-semibold text-sm mb-1">{toast.title}</Text>}
      {toast.description && <Text className="text-slate-300 text-[13px]">{toast.description}</Text>}
    </Animated.View>
  );
}

export function Toaster() {
  return null; // ToastViewport handles rendering
}

export function Toast({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <View className={className}>{children}</View>;
}
export function ToastAction() { return null; }
export function ToastClose() { return null; }
export function ToastDescription() { return null; }
export function ToastTitle() { return null; }
