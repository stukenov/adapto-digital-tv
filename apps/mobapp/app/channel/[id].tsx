import { ErrorMessage } from '@/components/ErrorMessage';
import { HLSVideoPlayer } from '@/components/HLSVideoPlayer.web';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { VideoPlayer } from '@/components/VideoPlayer';
import { Colors } from '@/constants/Colors';
import { useChannel } from '@/hooks/useChannels';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useChannelSchedule } from '@/hooks/useSchedule';
import { adaptoAPI } from '@/services/adapto-api';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ChannelScreen() {
  const { id: slug } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const [videoError, setVideoError] = useState<string | null>(null);
  
  const { channel, loading: channelLoading, refreshChannel } = useChannel(slug || '');
  const { schedule, loading: scheduleLoading } = useChannelSchedule(
    slug || '', 
    adaptoAPI.getTodayDate()
  );

  // Find current and next programs from schedule
  const { currentProgram, nextProgram } = useMemo(() => {
    if (!schedule.length) return { currentProgram: null, nextProgram: null };

    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
    
    let current = null;
    let next = null;

    for (let i = 0; i < schedule.length; i++) {
      const program = schedule[i];
      const startTime = new Date(program.start_time).toTimeString().slice(0, 5);
      const endTime = new Date(program.end_time).toTimeString().slice(0, 5);
      
      if (startTime <= currentTime && currentTime < endTime) {
        current = program;
        next = schedule[i + 1] || null;
        break;
      } else if (startTime > currentTime) {
        next = program;
        break;
      }
    }

    return { currentProgram: current, nextProgram: next };
  }, [schedule]);

  const loading = channelLoading.isLoading || scheduleLoading.isLoading;
  const error = channelLoading.error || scheduleLoading.error;

  const handleVideoError = (error: string) => {
    setVideoError(error);
    console.error('Video error:', error);
  };

  const formatTime = (dateTimeString: string) => {
    try {
      const date = new Date(dateTimeString);
      return date.toLocaleTimeString('ru-RU', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    } catch {
      return '00:00';
    }
  };

  if (loading) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: colors.systemBackground }]}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ThemedText type="body" style={[styles.backText, { color: colors.tint }]}>
              ← Назад
            </ThemedText>
          </TouchableOpacity>
        </View>
        <LoadingSpinner text="Загрузка канала..." fullScreen />
      </ThemedView>
    );
  }

  if (error || !channel) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: colors.systemBackground }]}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ThemedText type="body" style={[styles.backText, { color: colors.tint }]}>
              ← Назад
            </ThemedText>
          </TouchableOpacity>
        </View>
        
        <ErrorMessage 
          message={error || 'Канал не найден'}
          onRetry={refreshChannel}
          fullScreen
        />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.systemBackground }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ThemedText type="body" style={[styles.backText, { color: colors.tint }]}>
            ← Назад
          </ThemedText>
      </TouchableOpacity>
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 20 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Название канала */}
        <View style={[styles.channelHeader, { 
          backgroundColor: colors.systemBackground,
          borderBottomColor: colors.separator 
        }]}>
          <ThemedText type="title1" style={[styles.channelHeaderName, { color: colors.text }]}>
            {channel.name}
          </ThemedText>
        </View>

        {/* Видеоплеер */}
        <View style={styles.videoSection}>
          {Platform.OS === 'web' && channel.stream_url.includes('.m3u8') ? (
            <HLSVideoPlayer
              streamUrl={channel.stream_url}
              channelName={channel.name}
              onError={handleVideoError}
            />
          ) : (
            <VideoPlayer
              streamUrl={channel.stream_url}
              channelName={channel.name}
              onError={handleVideoError}
            />
          )}
          
          {videoError && (
            <View style={[styles.videoErrorContainer, { backgroundColor: colors.accent }]}>
              <ThemedText type="caption1" style={styles.videoErrorText}>
                Ошибка воспроизведения
              </ThemedText>
            </View>
          )}
        </View>

        {/* Текущая программа */}
        {currentProgram ? (
          <View style={[styles.programSection, { backgroundColor: colors.cardBackground }]}>
            <ThemedText type="title3" style={[styles.sectionTitle, { color: colors.text }]}>
              Сейчас в эфире
            </ThemedText>
            
            <View style={styles.programInfo}>
              <ThemedText type="headline" style={styles.programName}>
                {currentProgram.name}
              </ThemedText>
              <ThemedText type="subhead" style={[styles.programTime, { color: colors.secondaryLabel }]}>
                {formatTime(currentProgram.start_time)} - {formatTime(currentProgram.end_time)}
              </ThemedText>
            </View>
          </View>
        ) : (
          <View style={[styles.programSection, { backgroundColor: colors.cardBackground }]}>
            <ThemedText type="title3" style={[styles.sectionTitle, { color: colors.text }]}>
              Сейчас в эфире
            </ThemedText>
            
            <View style={styles.programInfo}>
              <ThemedText type="headline" style={styles.programName}>
                Программа передач
              </ThemedText>
              <ThemedText type="subhead" style={[styles.programTime, { color: colors.secondaryLabel }]}>
                Смотрите расписание программ
              </ThemedText>
            </View>
          </View>
        )}
        
        {/* Следующая программа */}
        {nextProgram ? (
          <View style={[styles.programSection, { backgroundColor: colors.cardBackground }]}>
            <ThemedText type="title3" style={[styles.sectionTitle, { color: colors.text }]}>
              Далее
            </ThemedText>
            
            <View style={styles.programInfo}>
              <ThemedText type="headline" style={styles.programName}>
                {nextProgram.name}
              </ThemedText>
              <ThemedText type="subhead" style={[styles.programTime, { color: colors.secondaryLabel }]}>
                {formatTime(nextProgram.start_time)} - {formatTime(nextProgram.end_time)}
              </ThemedText>
            </View>
          </View>
        ) : (
          <View style={[styles.programSection, { backgroundColor: colors.cardBackground }]}>
            <ThemedText type="title3" style={[styles.sectionTitle, { color: colors.text }]}>
              Далее
            </ThemedText>
            
            <View style={styles.programInfo}>
              <ThemedText type="headline" style={styles.programName}>
                Следующая программа
              </ThemedText>
              <ThemedText type="subhead" style={[styles.programTime, { color: colors.secondaryLabel }]}>
                Следите за обновлениями
              </ThemedText>
            </View>
          </View>
        )}

        {/* Информация о канале */}
        <View style={[styles.channelInfo, { backgroundColor: colors.secondarySystemBackground }]}>
          <View style={styles.channelDetails}>
            <ThemedText type="body" style={[styles.channelDescription, { color: colors.secondaryLabel }]}>
              {channel.description || `Прямой эфир телеканала ${channel.name}`}
            </ThemedText>
          </View>
        </View>
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
  backButton: {
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: 17,
    fontWeight: '400',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
  },
  videoSection: {
    marginBottom: 16,
  },
  videoErrorContainer: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  videoErrorText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  channelHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  channelHeaderName: {
    fontWeight: '700',
  },
  channelInfo: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  channelDetails: {
    padding: 16,
  },
  channelDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  programSection: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 12,
  },
  programInfo: {
    gap: 4,
  },
  programName: {
    fontWeight: '600',
  },
  programTime: {
    fontWeight: '500',
  },
  programDescription: {
    marginTop: 4,
    lineHeight: 22,
  },
}); 