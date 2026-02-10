import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { adaptoAPI } from '@/services/adapto-api';
import React, { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

export function APIStatus() {
  const [status, setStatus] = useState<'checking' | 'connected' | 'disconnected' | 'fallback'>('checking');
  const [channelCount, setChannelCount] = useState<number>(0);
  const [error, setError] = useState<string>('');
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const checkAPIStatus = async () => {
    setStatus('checking');
    setError('');
    
    try {
      const channels = await adaptoAPI.getChannelsWithCurrentPrograms();
      setChannelCount(channels.length);
      
      if (channels.length > 0) {
        // Check if first channel has mock data characteristics
        const firstChannel = channels[0];
        if (firstChannel.name === 'Adapto Serial' && firstChannel.id === 1) {
          setStatus('fallback');
        } else {
          setStatus('connected');
        }
      } else {
        setStatus('disconnected');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setStatus('disconnected');
    }
  };

  useEffect(() => {
    checkAPIStatus();
  }, []);

  const getStatusInfo = () => {
    switch (status) {
      case 'checking':
        return { text: 'Проверка API...', emoji: '🔍', color: colors.secondaryLabel };
      case 'connected':
        return { text: `API подключен (${channelCount} каналов)`, emoji: '✅', color: colors.success };
      case 'fallback':
        return { text: `Демо-данные (${channelCount} каналов)`, emoji: '🎭', color: colors.warning };
      case 'disconnected':
        return { text: 'API недоступен', emoji: '❌', color: colors.destructive };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.secondarySystemBackground }]}>
      <TouchableOpacity 
        style={styles.statusRow}
        onPress={checkAPIStatus}
        activeOpacity={0.7}
      >
        <View style={styles.statusContent}>
          <ThemedText style={styles.emoji}>{statusInfo.emoji}</ThemedText>
          <ThemedText 
            type="caption1" 
            style={[styles.statusText, { color: statusInfo.color }]}
          >
            {statusInfo.text}
          </ThemedText>
        </View>
        
        <ThemedText 
          type="caption2" 
          style={[styles.refreshText, { color: colors.tertiaryLabel }]}
        >
          Нажмите для обновления
        </ThemedText>
      </TouchableOpacity>
      
      {error && (
        <ThemedText 
          type="caption2" 
          style={[styles.errorText, { color: colors.destructive }]}
          numberOfLines={2}
        >
          {error}
        </ThemedText>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 12,
    borderRadius: 8,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  emoji: {
    fontSize: 16,
    marginRight: 8,
  },
  statusText: {
    fontWeight: '600',
    flex: 1,
  },
  refreshText: {
    fontWeight: '500',
  },
  errorText: {
    marginTop: 4,
    lineHeight: 16,
  },
}); 