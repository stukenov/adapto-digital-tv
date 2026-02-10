import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

interface DateSelectorProps {
  selectedDate: string;
  onDateSelect: (date: string) => void;
}

const dateOptions = [
  { key: 'today', label: 'Сегодня' },
  { key: 'tomorrow', label: 'Завтра' },
  { key: 'day_after', label: 'Послезавтра' },
];

export function DateSelector({ selectedDate, onDateSelect }: DateSelectorProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={styles.container}>
      <ThemedText type="headline" style={[styles.title, { color: colors.text }]}>
        Выберите дату
      </ThemedText>
      
      <ScrollView 
        horizontal 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsHorizontalScrollIndicator={false}
      >
        {dateOptions.map((option) => (
          <TouchableOpacity
            key={option.key}
            style={[
              styles.dateButton,
              {
                backgroundColor: selectedDate === option.key ? colors.tint : colors.tertiarySystemBackground,
                borderColor: selectedDate === option.key ? colors.tint : colors.separator,
              }
            ]}
            onPress={() => onDateSelect(option.key)}
            activeOpacity={0.7}
          >
            <ThemedText
              type="callout"
              style={[
                styles.dateText,
                { 
                  color: selectedDate === option.key ? '#FFFFFF' : colors.text,
                  fontWeight: selectedDate === option.key ? '600' : '400'
                }
              ]}
            >
              {option.label}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
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
  dateButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  dateText: {
    textAlign: 'center',
  },
}); 