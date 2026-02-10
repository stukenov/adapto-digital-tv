import { adaptoAPI } from '@/services/adapto-api';
import { APIProgram, APIProgramList, LoadingState } from '@/types/tv';
import { useEffect, useState } from 'react';

export function useChannelSchedule(slug: string, date?: string) {
  const [schedule, setSchedule] = useState<APIProgramList[]>([]);
  const [loading, setLoading] = useState<LoadingState>({
    isLoading: true,
    error: undefined
  });

  const fetchSchedule = async () => {
    if (!slug) return;
    
    try {
      setLoading({ isLoading: true, error: undefined });
      const data = await adaptoAPI.getChannelSchedule(slug, date);
      setSchedule(data);
      setLoading({ isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка загрузки расписания';
      setLoading({ isLoading: false, error: errorMessage });
      console.error('Failed to fetch schedule:', error);
    }
  };

  useEffect(() => {
    if (slug) {
      fetchSchedule();
    }
  }, [slug, date]);

  return {
    schedule,
    loading,
    refreshSchedule: fetchSchedule
  };
}

export function usePrograms(options: {
  channel?: number;
  date?: string;
  page?: number;
} = {}) {
  const [programs, setPrograms] = useState<APIProgram[]>([]);
  const [loading, setLoading] = useState<LoadingState>({
    isLoading: true,
    error: undefined
  });

  const fetchPrograms = async () => {
    try {
      setLoading({ isLoading: true, error: undefined });
      const data = await adaptoAPI.getPrograms(options);
      setPrograms(data);
      setLoading({ isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка загрузки программ';
      setLoading({ isLoading: false, error: errorMessage });
      console.error('Failed to fetch programs:', error);
    }
  };

  useEffect(() => {
    fetchPrograms();
  }, [options.channel, options.date, options.page]);

  return {
    programs,
    loading,
    refreshPrograms: fetchPrograms
  };
}

export function useProgram(id: number) {
  const [program, setProgram] = useState<APIProgram | null>(null);
  const [loading, setLoading] = useState<LoadingState>({
    isLoading: true,
    error: undefined
  });

  const fetchProgram = async () => {
    if (!id) return;
    
    try {
      setLoading({ isLoading: true, error: undefined });
      const data = await adaptoAPI.getProgramById(id);
      setProgram(data);
      setLoading({ isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка загрузки программы';
      setLoading({ isLoading: false, error: errorMessage });
      console.error('Failed to fetch program:', error);
    }
  };

  useEffect(() => {
    if (id) {
      fetchProgram();
    }
  }, [id]);

  return {
    program,
    loading,
    refreshProgram: fetchProgram
  };
} 