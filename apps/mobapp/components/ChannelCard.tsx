import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { TVChannel } from '@/types/tv';
import React from 'react';
import { Animated, Image, StyleSheet, TouchableOpacity, View } from 'react-native';

interface ChannelCardProps {
  channel: TVChannel;
  onPress: () => void;
}

export function ChannelCard({ channel, onPress }: ChannelCardProps) {
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
        backgroundColor: colors.cardBackground,
        shadowColor: colors.cardShadow,
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
        <ThemedView style={styles.card}>
          <View style={styles.imageContainer}>
            <Image 
              source={{ uri: channel.screenshot }} 
              style={styles.channelImage}
              resizeMode="cover"
            />
            <View style={[styles.liveIndicator, { backgroundColor: colors.accent }]}>
              <ThemedText type="caption2" style={styles.liveText}>
                LIVE
              </ThemedText>
            </View>
          </View>
          
          <View style={styles.content}>
            <ThemedText type="headline" style={styles.channelName} numberOfLines={1}>
              {channel.name}
            </ThemedText>
            
            <ThemedText 
              type="subhead" 
              style={[styles.programName, { color: colors.secondaryLabel }]} 
              numberOfLines={2}
            >
              {channel.currentProgram.name}
            </ThemedText>
            
            <View style={styles.timeContainer}>
              <View style={[styles.timeIndicator, { backgroundColor: colors.success }]} />
              <ThemedText 
                type="caption1" 
                style={[styles.timeText, { color: colors.tertiaryLabel }]}
              >
                {channel.currentProgram.startTime} - {channel.currentProgram.endTime}
              </ThemedText>
            </View>
          </View>
        </ThemedView>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  touchable: {
    borderRadius: 12,
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
    height: 120,
  },
  channelImage: {
    width: '100%',
    height: '100%',
  },
  liveIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  content: {
    padding: 16,
  },
  channelName: {
    marginBottom: 4,
    fontWeight: '600',
  },
  programName: {
    marginBottom: 8,
    lineHeight: 20,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  timeText: {
    fontWeight: '500',
  },
}); 