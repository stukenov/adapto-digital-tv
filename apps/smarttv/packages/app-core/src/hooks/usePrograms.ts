import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';
import { adaptProgram, formatDateForAPI } from '../api/adapters';
import type { Program, APIState, ProgramsQuery } from '../types';

interface UseProgramsOptions {
  autoFetch?: boolean;
  channelId?: number;
  date?: Date;
}

interface UseProgramsReturn {
  programs: Program[];
  status: APIState<Program[]>['status'];
  error: string | null;
  refetch: () => Promise<void>;
  getProgram: (id: number) => Promise<Program | null>;
  fetchProgramsForChannel: (channelId: number, date?: Date) => Promise<Program[]>;
  isLoading: boolean;
  isEmpty: boolean;
}

export function usePrograms(options: UseProgramsOptions = {}): UseProgramsReturn {
  const { autoFetch = false, channelId, date } = options;
  
  const [state, setState] = useState<APIState<Program[]>>({
    data: [],
    status: 'idle',
    error: null,
  });

  const fetchPrograms = useCallback(async (query: ProgramsQuery = {}) => {
    setState(prev => ({ ...prev, status: 'loading', error: null }));

    try {
      // Fetch all programs (paginated)
      let allPrograms: Program[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await apiClient.getPrograms({ ...query, page });
        
        const adaptedPrograms = response.results.map(adaptProgram);
        allPrograms = [...allPrograms, ...adaptedPrograms];
        
        hasMore = response.next !== null;
        page++;
      }

      setState({
        data: allPrograms,
        status: 'success',
        error: null,
      });

      return allPrograms;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch programs from API';
      setState({
        data: [],
        status: 'error',
        error: errorMessage,
      });
      
      // Log error for debugging
      // eslint-disable-next-line no-console
      console.error('Adapto Digital TV Programs API Error:', error);
      return [];
    }
  }, []);

  const getProgram = useCallback(async (id: number): Promise<Program | null> => {
    try {
      const programData = await apiClient.getProgram(id);
      return adaptProgram(programData);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch program:', error);
      return null;
    }
  }, []);

  const fetchProgramsForChannel = useCallback(async (
    channelId: number, 
    date?: Date
  ): Promise<Program[]> => {
    const query: ProgramsQuery = {
      channel: channelId,
      date: date ? formatDateForAPI(date) : undefined,
    };

    return await fetchPrograms(query);
  }, [fetchPrograms]);

  const refetch = useCallback(async () => {
    const query: ProgramsQuery = {};
    
    if (channelId) {
      query.channel = channelId;
    }
    
    if (date) {
      query.date = formatDateForAPI(date);
    }

    await fetchPrograms(query);
  }, [fetchPrograms, channelId, date]);

  useEffect(() => {
    if (autoFetch) {
      refetch();
    }
  }, [autoFetch, refetch]);

  return {
    programs: state.data || [],
    status: state.status,
    error: state.error,
    refetch,
    getProgram,
    fetchProgramsForChannel,
    isLoading: state.status === 'loading',
    isEmpty: state.status === 'success' && (state.data || []).length === 0,
  };
} 