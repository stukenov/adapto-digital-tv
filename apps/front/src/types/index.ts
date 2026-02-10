import { ApiChannel, ApiProgram, ApiProgramList } from './api';

export interface Program {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  duration: number; // в минутах
}

export interface Channel {
  id: string;
  name: string;
  logo: string;
  description: string;
  streamUrl: string;
  slug: string;
  sortOrder?: number;
  currentProgram?: Program;
  nextProgram?: Program;
  schedule: Program[];
}

export interface ScheduleDay {
  date: string;
  programs: Program[];
}

export interface ChannelSchedule {
  channelId: string;
  channelName: string;
  channelLogo: string;
  days: ScheduleDay[];
}

// Utility functions to convert API types to UI types
export function convertApiChannelToChannel(apiChannel: ApiChannel): Omit<Channel, 'currentProgram' | 'nextProgram'> {
  const apiBase = (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_API_URL : undefined) || 'https://dash.example.com/api/v1';
  const apiOrigin = (() => {
    try { return new URL(apiBase).origin; } catch { return 'https://dash.example.com'; }
  })();

  const rawLogo = apiChannel.logo || '';
  const logo = rawLogo
    ? (rawLogo.startsWith('http') ? rawLogo : `${apiOrigin}${rawLogo.startsWith('/') ? '' : '/'}${rawLogo}`)
    : '/placeholder-channel.svg';

  return {
    id: apiChannel.id.toString(),
    name: apiChannel.name,
    logo,
    description: apiChannel.description,
    streamUrl: apiChannel.stream_url,
    slug: apiChannel.slug,
    sortOrder: typeof apiChannel.sort_order === 'number' ? apiChannel.sort_order : 0,
    schedule: []
  };
}

export function convertApiProgramToProgram(apiProgram: ApiProgram | ApiProgramList): Program {
  const startTime = new Date(apiProgram.start_time);
  const endTime = new Date(apiProgram.end_time);
  const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60)); // в минутах

  return {
    id: apiProgram.id.toString(),
    title: apiProgram.name,
    description: 'description' in apiProgram ? apiProgram.description || '' : '',
    startTime: startTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
    endTime: endTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
    duration
  };
}

export function formatDateForApi(date: Date): string {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD format
}

export function getCurrentProgram(programs: Program[]): Program | undefined {
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes(); // текущее время в минутах

  return programs.find(program => {
    const [startHour, startMinute] = program.startTime.split(':').map(Number);
    const [endHour, endMinute] = program.endTime.split(':').map(Number);
    
    const startTime = startHour * 60 + startMinute;
    let endTime = endHour * 60 + endMinute;
    
    // Обработка перехода через полночь
    if (endTime < startTime) {
      endTime += 24 * 60;
    }
    
    return currentTime >= startTime && currentTime < endTime;
  });
}

export function getNextProgram(programs: Program[], currentProgram?: Program): Program | undefined {
  if (!currentProgram) return programs[0];
  
  const currentIndex = programs.findIndex(p => p.id === currentProgram.id);
  return currentIndex >= 0 && currentIndex < programs.length - 1 
    ? programs[currentIndex + 1] 
    : programs[0]; // или первая программа следующего дня
} 