import React from 'react';
import { View, Text, Image, StyleSheet, Dimensions } from 'react-native';
import { TVTouchable } from './TVTouchable';
import { Channel } from 'adapto-app-core';

interface TVChannelCardProps {
  channel: Channel;
  onPress: () => void;
  hasTVPreferredFocus?: boolean;
}

const { width: screenWidth } = Dimensions.get('window');
const cardWidth = screenWidth * 0.18;
const cardHeight = cardWidth * 0.85;

export const TVChannelCard: React.FC<TVChannelCardProps> = ({
  channel,
  onPress,
  hasTVPreferredFocus = false,
}) => {
  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isLive = () => {
    const now = new Date();
    const startTime = new Date(channel.currentProgram.startTime);
    const endTime = new Date(channel.currentProgram.endTime);
    return now >= startTime && now <= endTime;
  };

  const getChannelInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <TVTouchable
      style={styles.container}
      onPress={onPress}
      hasTVPreferredFocus={hasTVPreferredFocus}
      focusedScale={1.08}
      focusedOpacity={0.95}
    >
      <View style={styles.card}>
        <View style={styles.logoContainer}>
          {channel.logo ? (
            <Image
              source={{ uri: channel.logo }}
              style={styles.logo}
              resizeMode='cover'
            />
          ) : (
            <View style={[styles.logo, styles.logoPlaceholder]}>
              <Text style={styles.logoText}>{getChannelInitials(channel.name)}</Text>
            </View>
          )}
          {isLive() && (
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          )}
        </View>
        
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>
            {channel.name}
          </Text>
          <Text style={styles.currentProgram} numberOfLines={2}>
            {channel.currentProgram.title}
          </Text>
          <Text style={styles.programTime} numberOfLines={1}>
            {formatTime(channel.currentProgram.startTime)} - {formatTime(channel.currentProgram.endTime)}
          </Text>
        </View>
      </View>
    </TVTouchable>
  );
};

const styles = StyleSheet.create({
  container: {
    width: cardWidth,
    height: cardHeight,
    margin: 8,
  },
  card: {
    flex: 1,
    backgroundColor: 'rgba(58, 58, 60, 0.6)',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  logoContainer: {
    position: 'relative',
    width: '100%',
    height: '55%',
  },
  logo: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2a2a2a',
  },
  logoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(58, 58, 60, 0.8)',
  },
  logoText: {
    fontSize: 18,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  liveIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF3B30',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  liveDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ffffff',
    marginRight: 4,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  content: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  currentProgram: {
    fontSize: 13,
    fontWeight: '500',
    color: '#ffffff',
    marginBottom: 4,
    lineHeight: 16,
  },
  programTime: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
  },
});
