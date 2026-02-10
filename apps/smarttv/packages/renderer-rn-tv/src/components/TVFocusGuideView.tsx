import React from 'react';
import {
  View,
  ViewProps,
  Platform,
  TVFocusGuideView as RNTVFocusGuideView,
} from 'react-native';

interface TVFocusGuideViewProps extends ViewProps {
  children: React.ReactNode;
  autoFocus?: boolean;
  destinations?: Array<React.RefObject<any>>;
}

export const TVFocusGuideView: React.FC<TVFocusGuideViewProps> = ({
  children,
  autoFocus = false,
  destinations,
  ...props
}) => {
  // Используем нативный TVFocusGuideView для tvOS
  if (Platform.OS === 'ios' && Platform.isTV) {
    return (
      <RNTVFocusGuideView
        {...props}
        autoFocus={autoFocus}
        destinations={destinations}
      >
        {children}
      </RNTVFocusGuideView>
    );
  }

  // Для Android TV используем обычный View с дополнительной логикой
  return <View {...props}>{children}</View>;
};
