import { DateSelector } from '@/components/DateSelector';
import { ErrorMessage } from '@/components/ErrorMessage';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ScheduleProgram } from '@/components/ScheduleProgram';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { TimeSlider } from '@/components/TimeSlider';
import { Colors } from '@/constants/Colors';
import { useChannels } from '@/hooks/useChannels';
import { useColorScheme } from '@/hooks/useColorScheme';
import { usePrograms } from '@/hooks/useSchedule';
import { adaptoAPI } from '@/services/adapto-api';
import React, { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ScheduleScreen() {
  const [selectedDate, setSelectedDate] = useState('today');
  const [selectedTime, setSelectedTime] = useState('19:00');
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();

  const { channels, loading: channelsLoading, refreshChannels } = useChannels();
  
  // Convert selectedDate to API format
  const apiDate = useMemo(() => {
    if (selectedDate === 'today') {
      return adaptoAPI.getTodayDate();
    } else if (selectedDate === 'tomorrow') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return adaptoAPI.formatDateForAPI(tomorrow);
    } else if (selectedDate === 'yesterday') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      return adaptoAPI.formatDateForAPI(yesterday);
    }
    return adaptoAPI.getTodayDate();
  }, [selectedDate]);

  const { programs, loading: programsLoading, refreshPrograms } = usePrograms({
    date: apiDate
  });

  // Group programs by channel
  const programsByChannel = useMemo(() => {
    const grouped: { [channelId: number]: any[] } = {};
    
    programs.forEach(program => {
      if (!grouped[program.channel]) {
        grouped[program.channel] = [];
      }
      grouped[program.channel].push(program);
    });

    // Sort programs by start time within each channel
    Object.keys(grouped).forEach(channelId => {
      grouped[parseInt(channelId)].sort((a, b) => 
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );
    });

    return grouped;
  }, [programs]);

  const getCurrentProgram = (channelPrograms: any[]) => {
    if (!channelPrograms?.length) return null;

    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
    
    return channelPrograms.find(program => {
      const startTime = new Date(program.start_time).toTimeString().slice(0, 5);
      const endTime = new Date(program.end_time).toTimeString().slice(0, 5);
      return startTime <= currentTime && currentTime < endTime;
    }) || channelPrograms[0];
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

  const loading = channelsLoading.isLoading || programsLoading.isLoading;
  const error = channelsLoading.error || programsLoading.error;

  const refreshAll = () => {
    refreshChannels();
    refreshPrograms();
  };

  if (loading && channels.length === 0) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: colors.systemGroupedBackground }]}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <ThemedText type="largeTitle" style={styles.title}>
            Расписание
          </ThemedText>
        </View>
        <LoadingSpinner text="Загрузка расписания..." fullScreen />
      </ThemedView>
    );
  }

  if (error && channels.length === 0) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: colors.systemGroupedBackground }]}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <ThemedText type="largeTitle" style={styles.title}>
            Расписание
          </ThemedText>
        </View>
        <ErrorMessage 
          message={error} 
          onRetry={refreshAll}
          fullScreen 
        />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.systemGroupedBackground }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <ThemedText type="largeTitle" style={styles.title}>
          Расписание
        </ThemedText>
      </View>
      
      <View style={[styles.controls, { backgroundColor: colors.secondarySystemGroupedBackground }]}>
        <DateSelector
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
        />
        
        <TimeSlider
          selectedTime={selectedTime}
          onTimeSelect={setSelectedTime}
        />
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 80 } // Отступ для tab bar (60px базовая высота + 20px дополнительно)
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refreshAll}
            tintColor={colors.tint}
          />
        }
      >
        {channels.map((channel) => {
          const channelPrograms = programsByChannel[channel.id] || [];
          const currentProgram = getCurrentProgram(channelPrograms);
          
          return (
            <View key={channel.id} style={[styles.channelContainer, { backgroundColor: colors.cardBackground }]}>
              <View style={styles.channelHeader}>
                <ThemedText type="headline" style={styles.channelName}>
                  {channel.name}
                </ThemedText>
              </View>
              
              {channelPrograms.length > 0 ? (
                <ScrollView 
                  horizontal 
                  style={styles.programsScroll}
                  contentContainerStyle={styles.programsContent}
                  showsHorizontalScrollIndicator={false}
                >
                  {channelPrograms.map((program) => {
                    // Convert API program to legacy format for ScheduleProgram component
                    const legacyProgram = {
                      id: program.id.toString(),
                      name: program.name,
                      startTime: formatTime(program.start_time),
                      endTime: formatTime(program.end_time),
                      description: program.description
                    };

                    return (
                      <ScheduleProgram
                        key={program.id}
                        program={legacyProgram}
                        isActive={currentProgram?.id === program.id}
                        onPress={() => {}}
                      />
                    );
                  })}
                </ScrollView>
              ) : (
                <View style={styles.noProgramsContainer}>
                  <ThemedText type="body" style={[styles.noProgramsText, { color: colors.secondaryLabel }]}>
                    Программы не найдены
                  </ThemedText>
                </View>
              )}
            </View>
          );
        })}
        
        {channels.length === 0 && !loading && (
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
  controls: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
  },
  channelContainer: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  channelHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  channelName: {
    fontWeight: '600',
  },
  programsScroll: {
    paddingBottom: 16,
  },
  programsContent: {
    paddingHorizontal: 16,
  },
  noProgramsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    alignItems: 'center',
  },
  noProgramsText: {
    textAlign: 'center',
  },
  emptyState: {
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
});
