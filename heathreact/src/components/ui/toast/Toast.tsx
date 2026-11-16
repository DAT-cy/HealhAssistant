import React, { createContext, useContext, useState, useCallback } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';

type ToastVariant = 'default' | 'destructive';

interface ToastRecord {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
}

interface ToastContextValue {
  toast: (props: Omit<ToastRecord, 'id'>) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);
  const toast = useCallback((props: Omit<ToastRecord, 'id'>) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { ...props, id }]);
    setTimeout(() => dismiss(id), 3000);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function ToastViewport({ toasts, onDismiss }: { toasts: ToastRecord[]; onDismiss: (id: string) => void }) {
  return (
    <View pointerEvents="box-none" style={styles.viewport}>
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </View>
  );
}

function ToastItem({ toast, onDismiss }: { toast: ToastRecord; onDismiss: (id: string) => void }) {
  const fadeAnim = React.useMemo(() => new Animated.Value(0), []);

  React.useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => onDismiss(toast.id));
    }, 2700);
    return () => clearTimeout(timer);
  }, [fadeAnim, onDismiss, toast.id]);

  const isDestructive = toast.variant === 'destructive';

  return (
    <Animated.View style={[styles.toast, { opacity: fadeAnim }, isDestructive && styles.destructive]}>
      {toast.title && <Text className="text-white font-semibold text-sm mb-1">{toast.title}</Text>}
      {toast.description && <Text className="text-slate-300 text-[13px]">{toast.description}</Text>}
    </Animated.View>
  );
}

export function Toaster() {
  return null; // ToastViewport handles rendering
}

const styles = StyleSheet.create({
  viewport: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 96,
    zIndex: 1000,
    elevation: 1000,
  },
  toast: {
    marginBottom: 8,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  destructive: { backgroundColor: '#DC2626' },
});

export function Toast({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <View className={className}>{children}</View>;
}
export function ToastAction() { return null; }
export function ToastClose() { return null; }
export function ToastDescription() { return null; }
export function ToastTitle() { return null; }
