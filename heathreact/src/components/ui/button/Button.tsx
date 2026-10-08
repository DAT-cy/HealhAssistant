import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/helper';

const buttonVariants = cva(
  "flex-row items-center justify-center rounded-lg border",
  {
    variants: {
      variant: {
        default: "bg-indigo-500 border-transparent",
        destructive: "bg-red-600 border-transparent",
        outline: "bg-transparent border-slate-300",
        secondary: "bg-slate-100 border-transparent",
        ghost: "bg-transparent border-transparent",
        link: "bg-transparent border-transparent",
      },
      size: {
        default: "py-2.5 px-4",
        sm: "py-1.5 px-3",
        lg: "py-3.5 px-6",
        icon: "p-2",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

const buttonTextVariants = cva(
  "font-semibold text-sm",
  {
    variants: {
      variant: {
        default: "text-white",
        destructive: "text-white",
        outline: "text-slate-700",
        secondary: "text-slate-700",
        ghost: "text-slate-700",
        link: "text-indigo-500",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface ButtonProps 
  extends React.ComponentProps<typeof TouchableOpacity>, 
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  className?: string;
  textClassName?: string;
}

export function Button({
  className,
  variant,
  size,
  loading,
  disabled,
  children,
  textClassName,
  ...props
}: ButtonProps) {
  return (
    <TouchableOpacity
      className={cn(buttonVariants({ variant, size }), (disabled || loading) && "opacity-50", className)}
      disabled={disabled || loading}
      activeOpacity={0.7}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'outline' || variant === 'ghost' || variant === 'secondary' ? '#374151' : '#ffffff'} />
      ) : (
        <Text className={cn(buttonTextVariants({ variant }), textClassName)}>{children}</Text>
      )}
    </TouchableOpacity>
  );
}
