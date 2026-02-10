import { APIStatus } from '@/components/APIStatus';
import { ChannelCard } from '@/components/ChannelCard';
import { ErrorMessage } from '@/components/ErrorMessage';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useChannels } from '@/hooks/useChannels';
import { useColorScheme } from '@/hooks/useColorScheme';
import { adaptoAPI } from '@/services/adapto-api';
import { useRouter } from 'expo-router';
import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const { channels, loading, refreshChannels } = useChannels();

  const handleChannelPress = (channelId: number, channelSlug: string) => {
    // Use slug for API routing, but keep ID for backward compatibility
    router.push(`/channel/${channelSlug}`);
  };

  // Convert API channels to legacy format for ChannelCard compatibility
  const convertedChannels = channels.map((apiChannel) => 
    adaptoAPI.convertToLegacyChannel(apiChannel)
  );

  if (loading.isLoading && channels.length === 0) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: colors.systemGroupedBackground }]}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <ThemedText type="largeTitle" style={styles.title}>
            Каналы
          </ThemedText>
        </View>
        <LoadingSpinner text="Загрузка каналов..." />
      </ThemedView>
    );
  }

  if (loading.error && channels.length === 0) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: colors.systemGroupedBackground }]}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <ThemedText type="largeTitle" style={styles.title}>
            Каналы
          </ThemedText>
        </View>
        <ErrorMessage 
          message={loading.error} 
          onRetry={refreshChannels}
          fullScreen 
        />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.systemGroupedBackground }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <ThemedText type="largeTitle" style={styles.title}>
          Каналы
        </ThemedText>
      </View>
      
      <APIStatus />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 80 } // Отступ для tab bar (60px базовая высота + 20px дополнительно)
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading.isLoading}
            onRefresh={refreshChannels}
            tintColor={colors.tint}
          />
        }
      >
        {convertedChannels.map((channel) => (
          <ChannelCard
            key={channel.id}
            channel={channel}
            onPress={() => {
              const originalChannel = channels.find(c => c.id.toString() === channel.id);
              if (originalChannel) {
                handleChannelPress(originalChannel.id, originalChannel.slug);
              }
            }}
          />
        ))}
        
        {channels.length === 0 && !loading.isLoading && (
          <View style={styles.emptyState}>
            <ThemedText type="body" style={{ color: colors.secondaryLabel, textAlign: 'center' }}>
              Каналы не найдены
            </ThemedText>
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  title: {
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
  },
  emptyState: {
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
});
