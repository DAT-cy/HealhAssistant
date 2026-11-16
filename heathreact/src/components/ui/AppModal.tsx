import React from 'react';
import { Modal as NativeModal, Platform } from 'react-native';

type Props = React.ComponentProps<typeof NativeModal>;

/**
 * One native modal boundary for the app. Transparent overlays must cover the
 * status/navigation bars as well as the screen content, otherwise Android can
 * leave a visible or touchable strip above the overlay.
 */
export default function AppModal({ transparent = false, presentationStyle, ...props }: Props) {
  const coversSystemBars = transparent && Platform.OS === 'android';

  return (
    <NativeModal
      {...props}
      transparent={transparent}
      presentationStyle={transparent ? 'overFullScreen' : presentationStyle}
      statusBarTranslucent={coversSystemBars}
      navigationBarTranslucent={coversSystemBars}
    />
  );
}
