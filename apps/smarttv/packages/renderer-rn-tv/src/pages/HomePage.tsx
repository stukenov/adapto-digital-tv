import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { TVChannelCard } from '../components/TVChannelCard';
import { useChannels, Channel } from 'adapto-app-core';

const { width: screenWidth } = Dimensions.get('window');
const numColumns = 5;

export const HomePage: React.FC = () => {
  const navigation = useNavigation();
  
  const { channels, status, error, refetch, isLoading, isEmpty } = useChannels({
    autoFetch: true,
    activeOnly: true,
    sortByName: true,
  });

  const handleChannelPress = (channel: Channel) => {
    navigation.navigate('Channel' as never, { channel } as never);
  };

  const renderChannel = ({ item, index }: { item: Channel; index: number }) => (
    <TVChannelCard
      channel={item}
      onPress={() => handleChannelPress(item)}
      hasTVPreferredFocus={index === 0}
    />
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>
        {status === 'error' ? 'Ошибка подключения к API' : 'Нет доступных каналов'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {status === 'error' 
          ? error || 'Не удалось загрузить данные с сервера. Проверьте подключение к интернету.'
          : 'API не вернул активных телеканалов.'
        }
      </Text>
    </View>
  );

  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.loadingText}>Подключаемся к Adapto Digital TV API...</Text>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        {renderLoading()}
      </SafeAreaView>
    );
  }

  if (status === 'error' || isEmpty) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>ADAPTO</Text>
          <Text style={styles.subtitle}>
            Smart TV приложение с Adapto Digital TV API
          </Text>
        </View>
        {renderEmpty()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>ADAPTO</Text>
        <Text style={styles.subtitle}>
          Прямые трансляции через API ({channels.length} каналов)
        </Text>
      </View>

      <FlatList
        data={channels}
        renderItem={renderChannel}
        keyExtractor={item => item.id}
        numColumns={numColumns}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={renderEmpty}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    paddingHorizontal: 48,
    paddingVertical: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 56,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    maxWidth: 600,
    fontWeight: '500',
  },
  grid: {
    paddingHorizontal: 32,
    paddingBottom: 32,
  },
  separator: {
    height: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 18,
    marginTop: 16,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 48,
    paddingVertical: 100,
  },
  emptyTitle: {
    color: '#FF3B30',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  emptySubtitle: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 400,
  },
});
