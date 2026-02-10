import type { APIChannel, APIProgram, APIProgramList } from '../types/api';
import type { Channel, Program } from '../types';

/**
 * Converts API Program to domain Program
 */
export function adaptProgram(apiProgram: APIProgram): Program {
  return {
    id: apiProgram.id.toString(),
    title: apiProgram.name,
    description: apiProgram.description || '',
    startTime: apiProgram.start_time,
    endTime: apiProgram.end_time,
    duration: apiProgram.duration,
    channelId: apiProgram.channel.toString(),
    channelName: apiProgram.channel_name,
  };
}

/**
 * Converts API ProgramList to domain Program
 */
export function adaptProgramList(apiProgram: APIProgramList): Program {
  return {
    id: apiProgram.id.toString(),
    title: apiProgram.name,
    description: '',
    startTime: apiProgram.start_time,
    endTime: apiProgram.end_time,
    channelName: apiProgram.channel_name,
  };
}

/**
 * Gets current program from schedule
 */
function getCurrentProgram(schedule: Program[]): Program {
  const now = new Date();
  
  const currentProgram = schedule.find(program => {
    const startTime = new Date(program.startTime);
    const endTime = new Date(program.endTime);
    return now >= startTime && now <= endTime;
  });

  return currentProgram || schedule[0] || {
    id: 'default',
    title: 'Программа недоступна',
    description: 'Информация о текущей программе временно недоступна',
    startTime: now.toISOString(),
    endTime: new Date(now.getTime() + 60 * 60 * 1000).toISOString(), // +1 hour
  };
}

/**
 * Converts API Channel to domain Channel with schedule
 */
export function adaptChannel(
  apiChannel: APIChannel, 
  schedule: Program[] = []
): Channel {
  const currentProgram = getCurrentProgram(schedule);
  
  return {
    id: apiChannel.id.toString(),
    name: apiChannel.name,
    slug: apiChannel.slug,
    logo: apiChannel.logo,
    description: apiChannel.description,
    streamUrl: apiChannel.stream_url,
    currentProgram,
    schedule,
    isActive: apiChannel.is_active,
    createdAt: apiChannel.created_at,
    updatedAt: apiChannel.updated_at,
    // сортировать будем снаружи, но поле может пригодиться
    // @ts-expect-error keep optional sortOrder on Channel shape if extended
    sortOrder: typeof (apiChannel as any).sort_order === 'number' ? (apiChannel as any).sort_order : 0,
  };
}

/**
 * Converts API Channel without schedule (for list views)
 */
export function adaptChannelWithoutSchedule(apiChannel: APIChannel): Channel {
  // Create a default current program
  const now = new Date();
  const defaultProgram: Program = {
    id: `${apiChannel.id}-current`,
    title: 'Текущая программа',
    description: apiChannel.description || 'Описание недоступно',
    startTime: now.toISOString(),
    endTime: new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
    channelId: apiChannel.id.toString(),
    channelName: apiChannel.name,
  };

  return {
    id: apiChannel.id.toString(),
    name: apiChannel.name,
    slug: apiChannel.slug,
    logo: apiChannel.logo,
    description: apiChannel.description,
    streamUrl: apiChannel.stream_url,
    currentProgram: defaultProgram,
    schedule: [defaultProgram],
    isActive: apiChannel.is_active,
    createdAt: apiChannel.created_at,
    updatedAt: apiChannel.updated_at,
    // @ts-expect-error keep optional sortOrder on Channel shape if extended
    sortOrder: typeof (apiChannel as any).sort_order === 'number' ? (apiChannel as any).sort_order : 0,
  };
}

/**
 * Filters active channels
 */
export function filterActiveChannels(channels: Channel[]): Channel[] {
  return channels.filter(channel => channel.isActive !== false);
}

/**
 * Sorts channels by name
 */
export function sortChannelsByName(channels: Channel[]): Channel[] {
  return [...channels]
    .sort((a, b) => {
      const ao = typeof (a as any).sortOrder === 'number' ? (a as any).sortOrder : 0;
      const bo = typeof (b as any).sortOrder === 'number' ? (b as any).sortOrder : 0;
      if (ao !== bo) return bo - ao; // сначала по sortOrder desc
      return a.name.localeCompare(b.name, 'ru');
    });
}

/**
 * Finds channel by slug
 */
export function findChannelBySlug(channels: Channel[], slug: string): Channel | undefined {
  return channels.find(channel => channel.slug === slug);
}

/**
 * Gets today's date in YYYY-MM-DD format
 */
export function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Formats date for API queries
 */
export function formatDateForAPI(date: Date): string {
  return date.toISOString().split('T')[0];
} 