import React from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

interface LoadingSpinnerProps {
  text?: string;
  size?: 'small' | 'large';
  fullScreen?: boolean;
}

export function LoadingSpinner({ 
  text = 'Загрузка...', 
  size = 'large',
  fullScreen = false 
}: LoadingSpinnerProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const containerStyle = fullScreen ? styles.fullScreenContainer : styles.container;

  return (
    <ThemedView style={[containerStyle, { backgroundColor: colors.systemBackground }]}>
      <ActivityIndicator 
        size={size} 
        color={colors.tint} 
        style={styles.spinner}
      />
      {text && (
        <ThemedText 
          type="body" 
          style={[styles.text, { color: colors.secondaryLabel }]}
        >
          {text}
        </ThemedText>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreenContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    marginBottom: 16,
  },
  text: {
    textAlign: 'center',
  },
}); 