import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  fullScreen?: boolean;
}

export function ErrorMessage({ 
  message, 
  onRetry,
  fullScreen = false 
}: ErrorMessageProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const containerStyle = fullScreen ? styles.fullScreenContainer : styles.container;

  return (
    <ThemedView style={[containerStyle, { backgroundColor: colors.systemBackground }]}>
      <View style={[styles.errorContainer, { backgroundColor: colors.secondarySystemBackground }]}>
        <ThemedText 
          type="headline" 
          style={[styles.errorTitle, { color: colors.destructive }]}
        >
          Ошибка
        </ThemedText>
        
        <ThemedText 
          type="body" 
          style={[styles.errorMessage, { color: colors.secondaryLabel }]}
        >
          {message}
        </ThemedText>
        
        {onRetry && (
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: colors.tint }]}
            onPress={onRetry}
            activeOpacity={0.8}
          >
            <ThemedText 
              type="headline" 
              style={styles.retryButtonText}
            >
              Повторить
            </ThemedText>
          </TouchableOpacity>
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  fullScreenContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  errorContainer: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  errorTitle: {
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
}); 