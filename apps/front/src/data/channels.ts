import { Channel } from '@/types';

export const channels: Channel[] = [
  {
    id: '1',
    name: 'Название 1',
    slug: 'channel-1',
    logo: '/placeholder-channel.svg',
    description: 'Телеканал 1',
    streamUrl: 'https://example.com/hls/live/stream1/index.m3u8',
    currentProgram: {
      id: '1-1',
      title: 'Передача 1',
      description: 'Описание передачи',
      startTime: '21:00',
      endTime: '21:30',
      duration: 30
    },
    nextProgram: {
      id: '1-2',
      title: 'Передача 2',
      description: 'Описание передачи',
      startTime: '21:30',
      endTime: '22:45',
      duration: 75
    },
    schedule: []
  },
  {
    id: '2',
    name: 'Название 2',
    slug: 'channel-2',
    logo: '/placeholder-channel.svg',
    description: 'Телеканал 2',
    streamUrl: 'https://example.com/hls/live/stream2/index.m3u8',
    currentProgram: {
      id: '2-1',
      title: 'Передача 1',
      description: 'Описание передачи',
      startTime: '21:00',
      endTime: '21:45',
      duration: 45
    },
    nextProgram: {
      id: '2-2',
      title: 'Передача 2',
      description: 'Описание передачи',
      startTime: '21:45',
      endTime: '23:00',
      duration: 75
    },
    schedule: []
  },
  {
    id: '3',
    name: 'Название 3',
    slug: 'channel-3',
    logo: '/placeholder-channel.svg',
    description: 'Телеканал 3',
    streamUrl: 'https://example.com/hls/live/stream3/index.m3u8',
    currentProgram: {
      id: '3-1',
      title: 'Передача 1',
      description: 'Описание передачи',
      startTime: '21:00',
      endTime: '21:30',
      duration: 30
    },
    nextProgram: {
      id: '3-2',
      title: 'Передача 2',
      description: 'Описание передачи',
      startTime: '21:30',
      endTime: '22:30',
      duration: 60
    },
    schedule: []
  },
  {
    id: '4',
    name: 'Название 4',
    slug: 'channel-4',
    logo: '/placeholder-channel.svg',
    description: 'Телеканал 4',
    streamUrl: 'https://example.com/hls/live/stream4/index.m3u8',
    currentProgram: {
      id: '4-1',
      title: 'Передача 1',
      description: 'Описание передачи',
      startTime: '21:00',
      endTime: '22:00',
      duration: 60
    },
    nextProgram: {
      id: '4-2',
      title: 'Передача 2',
      description: 'Описание передачи',
      startTime: '22:00',
      endTime: '23:00',
      duration: 60
    },
    schedule: []
  },
  {
    id: '5',
    name: 'Название 5',
    slug: 'channel-5',
    logo: '/placeholder-channel.svg',
    description: 'Телеканал 5',
    streamUrl: 'https://example.com/hls/live/stream5/index.m3u8',
    currentProgram: {
      id: '5-1',
      title: 'Передача 1',
      description: 'Описание передачи',
      startTime: '21:00',
      endTime: '22:00',
      duration: 60
    },
    nextProgram: {
      id: '5-2',
      title: 'Передача 2',
      description: 'Описание передачи',
      startTime: '22:00',
      endTime: '23:00',
      duration: 60
    },
    schedule: []
  },
  {
    id: '6',
    name: 'Название 6',
    slug: 'channel-6',
    logo: '/placeholder-channel.svg',
    description: 'Телеканал 6',
    streamUrl: 'https://example.com/hls/live/stream6/index.m3u8',
    currentProgram: {
      id: '6-1',
      title: 'Передача 1',
      description: 'Описание передачи',
      startTime: '21:00',
      endTime: '22:30',
      duration: 90
    },
    nextProgram: {
      id: '6-2',
      title: 'Передача 2',
      description: 'Описание передачи',
      startTime: '22:30',
      endTime: '23:30',
      duration: 60
    },
    schedule: []
  },
  {
    id: '7',
    name: 'Название 7',
    slug: 'channel-7',
    logo: '/placeholder-channel.svg',
    description: 'Телеканал 7',
    streamUrl: 'https://example.com/hls/live/stream7/index.m3u8',
    currentProgram: {
      id: '7-1',
      title: 'Передача 1',
      description: 'Описание передачи',
      startTime: '21:00',
      endTime: '21:30',
      duration: 30
    },
    nextProgram: {
      id: '7-2',
      title: 'Передача 2',
      description: 'Описание передачи',
      startTime: '21:30',
      endTime: '22:30',
      duration: 60
    },
    schedule: []
  },
  {
    id: '8',
    name: 'Название 8',
    slug: 'channel-8',
    logo: '/placeholder-channel.svg',
    description: 'Телеканал 8',
    streamUrl: 'https://example.com/hls/live/stream8/index.m3u8',
    currentProgram: {
      id: '8-1',
      title: 'Передача 1',
      description: 'Описание передачи',
      startTime: '21:00',
      endTime: '23:00',
      duration: 120
    },
    nextProgram: {
      id: '8-2',
      title: 'Передача 2',
      description: 'Описание передачи',
      startTime: '23:00',
      endTime: '23:30',
      duration: 30
    },
    schedule: []
  },
  {
    id: '9',
    name: 'Название 9',
    slug: 'channel-9',
    logo: '/placeholder-channel.svg',
    description: 'Телеканал 9',
    streamUrl: 'https://example.com/hls/live/stream9/index.m3u8',
    currentProgram: {
      id: '9-1',
      title: 'Передача 1',
      description: 'Описание передачи',
      startTime: '21:00',
      endTime: '21:15',
      duration: 15
    },
    nextProgram: {
      id: '9-2',
      title: 'Передача 2',
      description: 'Описание передачи',
      startTime: '21:15',
      endTime: '23:30',
      duration: 135
    },
    schedule: []
  },
  {
    id: '10',
    name: 'Название 10',
    slug: 'channel-10',
    logo: '/placeholder-channel.svg',
    description: 'Телеканал 10',
    streamUrl: 'https://example.com/hls/live/stream10/index.m3u8',
    currentProgram: {
      id: '10-1',
      title: 'Передача 1',
      description: 'Описание передачи',
      startTime: '21:00',
      endTime: '21:30',
      duration: 30
    },
    nextProgram: {
      id: '10-2',
      title: 'Передача 2',
      description: 'Описание передачи',
      startTime: '21:30',
      endTime: '23:00',
      duration: 90
    },
    schedule: []
  }
];
