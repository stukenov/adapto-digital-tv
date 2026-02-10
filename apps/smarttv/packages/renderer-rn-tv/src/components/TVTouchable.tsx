import React, { useRef, useState } from 'react';
import {
  TouchableOpacity,
  TouchableOpacityProps,
  Platform,
  StyleSheet,
  Animated,
  TVEventHandler,
} from 'react-native';

interface TVTouchableProps extends TouchableOpacityProps {
  children: React.ReactNode;
  focusedScale?: number;
  focusedOpacity?: number;
  hasTVPreferredFocus?: boolean;
}

export const TVTouchable: React.FC<TVTouchableProps> = ({
  children,
  focusedScale = 1.1,
  focusedOpacity = 0.8,
  hasTVPreferredFocus = false,
  style,
  onPress,
  onFocus,
  onBlur,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  const handleFocus = (event: any) => {
    setIsFocused(true);

    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: focusedScale,
        useNativeDriver: true,
        tension: 150,
        friction: 8,
      }),
      Animated.timing(opacityAnim, {
        toValue: focusedOpacity,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    onFocus?.(event);
  };

  const handleBlur = (event: any) => {
    setIsFocused(false);

    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 150,
        friction: 8,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    onBlur?.(event);
  };

  const animatedStyle = {
    transform: [{ scale: scaleAnim }],
    opacity: opacityAnim,
  };

  return (
    <TouchableOpacity
      {...props}
      style={[styles.container, style]}
      onPress={onPress}
      onFocus={handleFocus}
      onBlur={handleBlur}
      hasTVPreferredFocus={hasTVPreferredFocus}
      activeOpacity={1}
    >
      <Animated.View style={[styles.content, animatedStyle]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
