import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';
import { 
  adaptChannelWithoutSchedule, 
  adaptChannel, 
  adaptProgramList,
  filterActiveChannels, 
  sortChannelsByName,
  getTodayDateString
} from '../api/adapters';
import type { Channel, APIState } from '../types';

interface UseChannelsOptions {
  autoFetch?: boolean;
  activeOnly?: boolean;
  sortByName?: boolean;
}

interface UseChannelsReturn {
  channels: Channel[];
  status: APIState<Channel[]>['status'];
  error: string | null;
  refetch: () => Promise<void>;
  getChannelWithSchedule: (slug: string) => Promise<Channel | null>;
  isLoading: boolean;
  isEmpty: boolean;
}

export function useChannels(options: UseChannelsOptions = {}): UseChannelsReturn {
  const { autoFetch = true, activeOnly = true, sortByName = true } = options;
  
  const [state, setState] = useState<APIState<Channel[]>>({
    data: [],
    status: 'idle',
    error: null,
  });

  const fetchChannels = useCallback(async () => {
    setState(prev => ({ ...prev, status: 'loading', error: null }));

    try {
      // Fetch all channels (paginated)
      let allChannels: Channel[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await apiClient.getChannels({ page });
        
        const adaptedChannels = response.results.map(adaptChannelWithoutSchedule);
        allChannels = [...allChannels, ...adaptedChannels];
        
        hasMore = response.next !== null;
        page++;
      }

      // Apply filters and sorting
      let processedChannels = allChannels;

      if (activeOnly) {
        processedChannels = filterActiveChannels(processedChannels);
      }

      // Всегда сортируем с учетом sortOrder, а затем по имени (sortChannelsByName делает это)
      processedChannels = sortChannelsByName(processedChannels);

      setState({
        data: processedChannels,
        status: 'success',
        error: null,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch channels from API';
      setState({
        data: [],
        status: 'error',
        error: errorMessage,
      });
      
      // Log error for debugging
      // eslint-disable-next-line no-console
      console.error('Adapto Digital TV Channels API Error:', error);
    }
  }, [activeOnly, sortByName]);

  const getChannelWithSchedule = useCallback(async (slug: string): Promise<Channel | null> => {
    try {
      // Fetch channel details and schedule in parallel
      const [channelData, scheduleData] = await Promise.all([
        apiClient.getChannel(slug),
        apiClient.getChannelSchedule(slug, { date: getTodayDateString() })
      ]);

      const schedule = scheduleData.map(adaptProgramList);
      return adaptChannel(channelData, schedule);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch channel with schedule:', error);
      return null;
    }
  }, []);

  const refetch = useCallback(async () => {
    await fetchChannels();
  }, [fetchChannels]);

  useEffect(() => {
    if (autoFetch) {
      fetchChannels();
    }
  }, [autoFetch, fetchChannels]);

  return {
    channels: state.data || [],
    status: state.status,
    error: state.error,
    refetch,
    getChannelWithSchedule,
    isLoading: state.status === 'loading',
    isEmpty: state.status === 'success' && (state.data || []).length === 0,
  };
} 