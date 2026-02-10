import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

interface TimeSliderProps {
  selectedTime: string;
  onTimeSelect: (time: string) => void;
}

const timeOptions = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00', '23:00',
];

export function TimeSlider({ selectedTime, onTimeSelect }: TimeSliderProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={styles.container}>
      <ThemedText type="headline" style={[styles.title, { color: colors.text }]}>
        Выберите время
      </ThemedText>
      
      <ScrollView 
        horizontal 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsHorizontalScrollIndicator={false}
      >
        {timeOptions.map((time) => (
          <TouchableOpacity
            key={time}
            style={[
              styles.timeButton,
              {
                backgroundColor: selectedTime === time ? colors.tint : colors.tertiarySystemBackground,
                borderColor: selectedTime === time ? colors.tint : colors.separator,
              }
            ]}
            onPress={() => onTimeSelect(time)}
            activeOpacity={0.7}
          >
            <ThemedText
              type="callout"
              style={[
                styles.timeText,
                { 
                  color: selectedTime === time ? '#FFFFFF' : colors.text,
                  fontWeight: selectedTime === time ? '600' : '400'
                }
              ]}
            >
              {time}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  title: {
    marginBottom: 12,
    fontWeight: '600',
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingRight: 16,
  },
  timeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  timeText: {
    textAlign: 'center',
    fontVariant: ['tabular-nums'], // Для выравнивания цифр
  },
}); 