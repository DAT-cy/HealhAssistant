import 'nativewind';
import type { CSSProperties } from 'react';

declare module 'react' {
  interface DOMAttributes<T> {
    className?: string;
    style?: CSSProperties;
  }
}

declare global {
  namespace JSX {
    interface IntrinsicAttributes {
      className?: string;
      style?: CSSProperties;
    }
  }
}
