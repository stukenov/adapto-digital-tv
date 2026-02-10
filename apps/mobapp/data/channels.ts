import { TVChannel } from '@/types/tv';

const generateDaySchedule = (channelId: string) => {
  const schedules: { [key: string]: any[] } = {
    '1': [
      { id: '1-1', name: 'Доброе утро', startTime: '06:00', endTime: '09:00', description: 'Утренняя программа' },
      { id: '1-2', name: 'Новости', startTime: '09:00', endTime: '09:15', description: 'Краткие новости' },
      { id: '1-3', name: 'Жить здорово!', startTime: '09:15', endTime: '10:15', description: 'Программа о здоровье' },
      { id: '1-4', name: 'Модный приговор', startTime: '10:15', endTime: '11:15', description: 'Программа о моде' },
      { id: '1-5', name: 'Новости', startTime: '12:00', endTime: '12:15', description: 'Дневные новости' },
      { id: '1-6', name: 'Время покажет', startTime: '12:15', endTime: '14:00', description: 'Аналитическая программа' },
      { id: '1-7', name: 'Давай поженимся!', startTime: '14:00', endTime: '15:00', description: 'Программа знакомств' },
      { id: '1-8', name: 'Мужское / Женское', startTime: '15:00', endTime: '16:00', description: 'Ток-шоу' },
      { id: '1-9', name: 'Новости', startTime: '15:00', endTime: '15:15', description: 'Дневные новости' },
      { id: '1-10', name: 'Время покажет', startTime: '15:15', endTime: '18:00', description: 'Аналитическая программа' },
      { id: '1-11', name: 'Вечерние новости', startTime: '18:00', endTime: '18:40', description: 'Главные новости дня' },
      { id: '1-12', name: 'На самом деле', startTime: '18:40', endTime: '19:40', description: 'Расследования' },
      { id: '1-13', name: 'Пусть говорят', startTime: '19:40', endTime: '21:00', description: 'Ток-шоу' },
      { id: '1-14', name: 'Время', startTime: '21:00', endTime: '21:30', description: 'Главные новости' },
      { id: '1-15', name: 'Фильм', startTime: '21:30', endTime: '23:30', description: 'Художественный фильм' },
      { id: '1-16', name: 'Вечерний Ургант', startTime: '23:30', endTime: '00:05', description: 'Ток-шоу' },
    ],
    '2': [
      { id: '2-1', name: 'Утро России', startTime: '06:00', endTime: '09:00', description: 'Утренняя программа' },
      { id: '2-2', name: 'Вести', startTime: '09:00', endTime: '09:15', description: 'Новости' },
      { id: '2-3', name: 'О самом главном', startTime: '09:15', endTime: '10:15', description: 'Медицинская программа' },
      { id: '2-4', name: 'Вести', startTime: '11:00', endTime: '11:30', description: 'Региональные новости' },
      { id: '2-5', name: 'Судьба человека', startTime: '11:30', endTime: '12:40', description: 'Документальная программа' },
      { id: '2-6', name: 'Вести', startTime: '14:00', endTime: '14:30', description: 'Дневные новости' },
      { id: '2-7', name: 'Кто против?', startTime: '14:30', endTime: '16:00', description: 'Ток-шоу' },
      { id: '2-8', name: 'Вести', startTime: '17:00', endTime: '17:15', description: 'Новости' },
      { id: '2-9', name: 'Андрей Малахов', startTime: '17:15', endTime: '18:40', description: 'Ток-шоу' },
      { id: '2-10', name: 'Вести', startTime: '20:00', endTime: '20:45', description: 'Главные новости' },
      { id: '2-11', name: 'Фильм', startTime: '20:45', endTime: '22:45', description: 'Художественный фильм' },
      { id: '2-12', name: 'Вечер с Соловьёвым', startTime: '22:45', endTime: '01:00', description: 'Ток-шоу' },
    ],
    '3': [
      { id: '3-1', name: 'Утро. Самое лучшее', startTime: '06:00', endTime: '08:00', description: 'Утренняя программа' },
      { id: '3-2', name: 'Сегодня', startTime: '08:00', endTime: '08:25', description: 'Новости' },
      { id: '3-3', name: 'Мальцева', startTime: '08:25', endTime: '09:25', description: 'Ток-шоу' },
      { id: '3-4', name: 'Сегодня', startTime: '10:00', endTime: '10:25', description: 'Новости' },
      { id: '3-5', name: 'Место встречи', startTime: '10:25', endTime: '12:00', description: 'Ток-шоу' },
      { id: '3-6', name: 'Сегодня', startTime: '13:00', endTime: '13:25', description: 'Дневные новости' },
      { id: '3-7', name: 'Чрезвычайное происшествие', startTime: '13:25', endTime: '14:00', description: 'Криминальная хроника' },
      { id: '3-8', name: 'Место встречи', startTime: '14:00', endTime: '16:00', description: 'Ток-шоу' },
      { id: '3-9', name: 'Сегодня', startTime: '16:00', endTime: '16:25', description: 'Новости' },
      { id: '3-10', name: 'За гранью', startTime: '16:25', endTime: '17:30', description: 'Мистическая программа' },
      { id: '3-11', name: 'ДНК', startTime: '17:30', endTime: '18:35', description: 'Генетическая экспертиза' },
      { id: '3-12', name: 'Сегодня', startTime: '19:00', endTime: '19:40', description: 'Главные новости' },
      { id: '3-13', name: 'Фильм', startTime: '19:40', endTime: '21:40', description: 'Детектив' },
      { id: '3-14', name: 'Сегодня', startTime: '23:00', endTime: '23:35', description: 'Итоги дня' },
    ]
  };

  return schedules[channelId] || [];
};

export const mockChannels: TVChannel[] = [
  {
    id: '1',
    name: 'Adapto Serial',
    logo: 'https://via.placeholder.com/100x60/FF0000/FFFFFF?text=1',
    screenshot: 'https://via.placeholder.com/320x180/FF0000/FFFFFF?text=Первый',
    streamUrl: 'https://example.com/hls/live/stream1/index.m3u8',
    currentProgram: {
      id: '1-1',
      name: 'Новости',
      startTime: '19:00',
      endTime: '19:30',
      description: 'Главные новости дня'
    },
    nextProgram: {
      id: '1-2',
      name: 'Время',
      startTime: '19:30',
      endTime: '20:00',
      description: 'Информационная программа'
    },
    schedule: generateDaySchedule('1')
  },
  {
    id: '2',
    name: 'Adapto Azil & Show',
    logo: 'https://via.placeholder.com/100x60/0000FF/FFFFFF?text=Р1',
    screenshot: 'https://via.placeholder.com/320x180/0000FF/FFFFFF?text=Россия',
    streamUrl: 'https://example.com/hls/live/stream2/index.m3u8',
    currentProgram: {
      id: '2-1',
      name: 'Вести',
      startTime: '19:00',
      endTime: '19:45',
      description: 'Новости России'
    },
    nextProgram: {
      id: '2-2',
      name: 'Фильм',
      startTime: '19:45',
      endTime: '21:30',
      description: 'Художественный фильм'
    },
    schedule: generateDaySchedule('2')
  },
  {
    id: '3',
    name: 'Adapto Music',
    logo: 'https://via.placeholder.com/100x60/00FF00/FFFFFF?text=НТВ',
    screenshot: 'https://via.placeholder.com/320x180/00FF00/FFFFFF?text=НТВ',
    streamUrl: 'https://example.com/hls/live/stream3/index.m3u8',
    currentProgram: {
      id: '3-1',
      name: 'Сегодня',
      startTime: '19:00',
      endTime: '19:30',
      description: 'Новости дня'
    },
    nextProgram: {
      id: '3-2',
      name: 'Место встречи',
      startTime: '19:30',
      endTime: '20:30',
      description: 'Ток-шоу'
    },
    schedule: generateDaySchedule('3')
  },
  {
    id: '4',
    name: 'Adapto Mult',
    logo: 'https://via.placeholder.com/100x60/FF00FF/FFFFFF?text=ТНТ',
    screenshot: 'https://via.placeholder.com/320x180/FF00FF/FFFFFF?text=ТНТ',
    streamUrl: 'https://example.com/hls/live/stream4/index.m3u8',
    currentProgram: {
      id: '4-1',
      name: 'Комеди Клаб',
      startTime: '19:00',
      endTime: '20:00',
      description: 'Юмористическое шоу'
    },
    nextProgram: {
      id: '4-2',
      name: 'Импровизация',
      startTime: '20:00',
      endTime: '21:00',
      description: 'Комедийное шоу'
    },
    schedule: generateDaySchedule('1')
  },
  {
    id: '5',
    name: 'Adapto Derekti Film',
    logo: 'https://via.placeholder.com/100x60/FFFF00/000000?text=СТС',
    screenshot: 'https://via.placeholder.com/320x180/FFFF00/000000?text=СТС',
    streamUrl: 'https://example.com/hls/live/stream5/index.m3u8',
    currentProgram: {
      id: '5-1',
      name: 'Уральские пельмени',
      startTime: '19:00',
      endTime: '19:30',
      description: 'Юмористическое шоу'
    },
    nextProgram: {
      id: '5-2',
      name: 'Фильм',
      startTime: '19:30',
      endTime: '21:30',
      description: 'Комедия'
    },
    schedule: generateDaySchedule('2')
  },
  {
    id: '6',
    name: 'Adapto Ulttyq Oner',
    logo: 'https://via.placeholder.com/100x60/800080/FFFFFF?text=РЕН',
    screenshot: 'https://via.placeholder.com/320x180/800080/FFFFFF?text=РенТВ',
    streamUrl: 'https://example.com/hls/live/stream6/index.m3u8',
    currentProgram: {
      id: '6-1',
      name: 'Военная тайна',
      startTime: '19:00',
      endTime: '20:30',
      description: 'Документальная программа'
    },
    nextProgram: {
      id: '6-2',
      name: 'Самые шокирующие гипотезы',
      startTime: '20:30',
      endTime: '21:30',
      description: 'Документальная программа'
    },
    schedule: generateDaySchedule('3')
  },
  {
    id: '7',
    name: 'Adapto Retro',
    logo: 'https://via.placeholder.com/100x60/008000/FFFFFF?text=Матч',
    screenshot: 'https://via.placeholder.com/320x180/008000/FFFFFF?text=Матч',
    streamUrl: 'https://example.com/hls/live/stream7/index.m3u8',
    currentProgram: {
      id: '7-1',
      name: 'Футбол',
      startTime: '19:00',
      endTime: '21:00',
      description: 'Прямая трансляция'
    },
    nextProgram: {
      id: '7-2',
      name: 'Новости спорта',
      startTime: '21:00',
      endTime: '21:30',
      description: 'Спортивные новости'
    },
    schedule: generateDaySchedule('1')
  },
  {
    id: '8',
    name: 'Adapto Aitys',
    logo: 'https://via.placeholder.com/100x60/FFA500/FFFFFF?text=Дом',
    screenshot: 'https://via.placeholder.com/320x180/FFA500/FFFFFF?text=Дом',
    streamUrl: 'https://example.com/hls/live/stream8/index.m3u8',
    currentProgram: {
      id: '8-1',
      name: 'Сериал',
      startTime: '19:00',
      endTime: '20:00',
      description: 'Мелодрама'
    },
    nextProgram: {
      id: '8-2',
      name: 'Фильм',
      startTime: '20:00',
      endTime: '22:00',
      description: 'Семейная драма'
    },
    schedule: generateDaySchedule('2')
  },
  {
    id: '9',
    name: 'Adapto Sport',
    logo: 'https://via.placeholder.com/100x60/FF1493/FFFFFF?text=МузТВ',
    screenshot: 'https://via.placeholder.com/320x180/FF1493/FFFFFF?text=МузТВ',
    streamUrl: 'https://example.com/hls/live/stream9/index.m3u8',
    currentProgram: {
      id: '9-1',
      name: 'Топ 30',
      startTime: '19:00',
      endTime: '20:00',
      description: 'Музыкальный чарт'
    },
    nextProgram: {
      id: '9-2',
      name: 'Русский чарт',
      startTime: '20:00',
      endTime: '21:00',
      description: 'Популярная музыка'
    },
    schedule: generateDaySchedule('3')
  },
  {
    id: '10',
    name: 'Adapto Teatr',
    logo: 'https://via.placeholder.com/100x60/4682B4/FFFFFF?text=DISC',
    screenshot: 'https://via.placeholder.com/320x180/4682B4/FFFFFF?text=Discovery',
    streamUrl: 'https://example.com/hls/live/stream10/index.m3u8',
    currentProgram: {
      id: '10-1',
      name: 'Как это устроено',
      startTime: '19:00',
      endTime: '19:30',
      description: 'Познавательная программа'
    },
    nextProgram: {
      id: '10-2',
      name: 'Разрушители легенд',
      startTime: '19:30',
      endTime: '20:30',
      description: 'Научно-популярная программа'
    },
    schedule: generateDaySchedule('1')
  }
]; 