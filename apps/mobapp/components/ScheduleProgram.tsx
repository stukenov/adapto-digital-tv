import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import React from 'react';
import { Animated, StyleSheet, TouchableOpacity, View } from 'react-native';

interface ScheduleProgramProps {
  program: {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    description?: string;
  };
  isActive: boolean;
  onPress: () => void;
}

export function ScheduleProgram({ program, isActive, onPress }: ScheduleProgramProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={[
      styles.container,
      {
        backgroundColor: isActive ? colors.tint : colors.tertiarySystemBackground,
        borderColor: isActive ? colors.tint : colors.separator,
        transform: [{ scale: scaleAnim }],
      }
    ]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        style={styles.touchable}
      >
        <View style={styles.timeContainer}>
          <ThemedText 
            type="caption1" 
            style={[
              styles.timeText,
              { color: isActive ? '#FFFFFF' : colors.secondaryLabel }
            ]}
          >
            {program.startTime}
          </ThemedText>
          {isActive && (
            <View style={styles.activeIndicator}>
              <View style={[styles.activeDot, { backgroundColor: '#FFFFFF' }]} />
            </View>
          )}
        </View>
        
        <View style={styles.content}>
          <ThemedText 
            type="footnote" 
            style={[
              styles.programName,
              { color: isActive ? '#FFFFFF' : colors.text }
            ]}
            numberOfLines={2}
          >
            {program.name}
          </ThemedText>
          
          {program.description && (
            <ThemedText 
              type="caption2" 
              style={[
                styles.description,
                { color: isActive ? 'rgba(255,255,255,0.8)' : colors.tertiaryLabel }
              ]}
              numberOfLines={1}
            >
              {program.description}
            </ThemedText>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 140,
    marginRight: 12,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  touchable: {
    flex: 1,
  },
  timeContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  timeText: {
    fontWeight: '600',
  },
  activeIndicator: {
    marginLeft: 4,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  content: {
    paddingHorizontal: 8,
    paddingBottom: 8,
    minHeight: 40,
  },
  programName: {
    fontWeight: '500',
    lineHeight: 16,
    marginBottom: 2,
  },
  description: {
    lineHeight: 12,
  },
}); 