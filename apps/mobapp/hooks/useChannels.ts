import { adaptoAPI } from '@/services/adapto-api';
import { APIChannel, LoadingState } from '@/types/tv';
import { useEffect, useState } from 'react';

export function useChannels() {
  const [channels, setChannels] = useState<APIChannel[]>([]);
  const [loading, setLoading] = useState<LoadingState>({
    isLoading: true,
    error: undefined
  });

  const fetchChannels = async () => {
    try {
      setLoading({ isLoading: true, error: undefined });
      const data = await adaptoAPI.getChannelsWithCurrentPrograms();
      setChannels(data);
      setLoading({ isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка загрузки каналов';
      setLoading({ isLoading: false, error: errorMessage });
      console.error('Failed to fetch channels:', error);
    }
  };

  const refreshChannels = () => {
    fetchChannels();
  };

  useEffect(() => {
    fetchChannels();
  }, []);

  return {
    channels,
    loading,
    refreshChannels
  };
}

export function useChannel(slug: string) {
  const [channel, setChannel] = useState<APIChannel | null>(null);
  const [loading, setLoading] = useState<LoadingState>({
    isLoading: true,
    error: undefined
  });

  const fetchChannel = async () => {
    if (!slug) return;
    
    try {
      setLoading({ isLoading: true, error: undefined });
      const data = await adaptoAPI.getChannelBySlug(slug);
      setChannel(data);
      setLoading({ isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка загрузки канала';
      setLoading({ isLoading: false, error: errorMessage });
      console.error('Failed to fetch channel:', error);
    }
  };

  useEffect(() => {
    if (slug) {
      fetchChannel();
    }
  }, [slug]);

  return {
    channel,
    loading,
    refreshChannel: fetchChannel
  };
} 