import React, { useState } from 'react';
import {
  Pressable as NativePressable,
  type PressableProps,
  type PressableStateCallbackType,
} from 'react-native';

export function Pressable({
  onPressIn,
  onPressOut,
  style,
  ...props
}: PressableProps) {
  const [pressed, setPressed] = useState(false);
  const resolvedStyle = typeof style === 'function'
    ? style({ pressed } as PressableStateCallbackType)
    : style;

  return (
    <NativePressable
      {...props}
      style={resolvedStyle}
      onPressIn={(event) => {
        setPressed(true);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        setPressed(false);
        onPressOut?.(event);
      }}
    />
  );
}
