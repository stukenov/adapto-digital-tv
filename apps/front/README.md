# 📺 Adapto Digital TV Web - Веб-платформа для просмотра цифрового телевидения

Adapto Digital TV Web - это современное веб-приложение для просмотра телеканалов в прямом эфире с расписанием программ и удобным интерфейсом.


## 🚀 Основные возможности

- **🎥 Прямой эфир** - Просмотр телеканалов в реальном времени через HLS потоки
- **📋 Расписание программ** - Детальное расписание всех каналов на несколько дней
- **🎛️ Интерактивный плеер** - Полнофункциональный видеоплеер с управлением звуком и качеством
- **📱 Адаптивный дизайн** - Оптимизирован для всех устройств (десктоп, планшет, мобильный)
- **⚡ Быстрая загрузка** - Использует Next.js 15 с Turbo для мгновенной загрузки
- **🔄 Автообновление** - Реальное время обновления программ и статуса каналов

## 🛠️ Технологический стек

### Frontend
- **[Next.js 15](https://nextjs.org/)** - React фреймворк с App Router
- **[React 19](https://react.dev/)** - Пользовательский интерфейс
- **[TypeScript](https://www.typescriptlang.org/)** - Типизированный JavaScript
- **[Tailwind CSS 4](https://tailwindcss.com/)** - Utility-first CSS фреймворк
- **[HLS.js](https://github.com/video-dev/hls.js/)** - HTTP Live Streaming клиент

### Backend Integration
- **Django REST API** - Интеграция с бэкенд API
- **HLS потоки** - Поддержка HTTP Live Streaming

## 📁 Структура проекта

```
adapto-web/
├── src/
│   ├── app/                    # Next.js App Router страницы
│   │   ├── page.tsx           # Главная страница - список каналов
│   │   ├── channel/[id]/      # Динамическая страница канала
│   │   │   └── page.tsx       # Плеер и детали канала
│   │   ├── schedule/          # Расписание программ
│   │   │   └── page.tsx       # Таблица расписания
│   │   ├── layout.tsx         # Основной layout
│   │   └── globals.css        # Глобальные стили
│   ├── components/            # Переиспользуемые компоненты
│   │   ├── ChannelCard.tsx    # Карточка канала
│   │   ├── HLSPlayer.tsx      # HLS видеоплеер
│   │   └── Navigation.tsx     # Навигационное меню
│   ├── services/              # API сервисы
│   │   └── api.ts            # Клиент для Django REST API
│   ├── types/                 # TypeScript типы
│   │   ├── index.ts          # Основные типы приложения
│   │   └── api.ts            # Типы API ответов
│   └── data/                  # Статические данные
│       └── channels.ts        # Данные каналов (fallback)
├── public/                    # Статические файлы
├── package.json              # Зависимости проекта
└── README.md                 # Документация проекта
```

## 🎯 Основные компоненты

### HLSPlayer
Полнофункциональный видеоплеер с поддержкой:
- HLS потоков для всех современных браузеров
- Нативная поддержка Safari
- Кастомные контролы воспроизведения
- Управление громкостью
- Индикатор прямого эфира
- Обработка ошибок и переподключение

### ChannelCard
Информативная карточка канала с:
- Логотипом канала
- Текущей программой в эфире
- Временем программы
- Анимированным индикатором "в эфире"

### API Integration
Полная интеграция с Django REST API:
- Загрузка списка активных каналов
- Получение расписания программ
- Обработка ошибок API
- Автоматическое переподключение

## 🚀 Быстрый старт

### Предварительные требования
- Node.js 18+ 
- npm, yarn, pnpm или bun

### Установка

1. **Клонируйте репозиторий**
```bash
git clone <repository-url>
cd adapto-web
```

2. **Установите зависимости**
```bash
npm install
# или
yarn install
# или
pnpm install
```

3. **Настройте переменные окружения**
```bash
cp .env.example .env.local
```

Отредактируйте `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api/v1
```

4. **Запустите development сервер**
```bash
npm run dev
# или
yarn dev
# или
pnpm dev
```

5. **Откройте приложение**
Перейдите на [http://localhost:3000](http://localhost:3000)

## 📋 Доступные команды

```bash
npm run dev      # Запуск development сервера с Turbo
npm run build    # Сборка для production
npm run start    # Запуск production сервера
npm run lint     # Проверка кода ESLint
```

## 🌟 Особенности реализации

### Современный React
- Использует React 19 с новейшими хуками
- Client Components для интерактивности
- Оптимизация производительности

### HLS Streaming
- Автоматическое определение поддержки HLS
- Fallback для Safari (нативная поддержка)
- Настройки буферизации для минимальной задержки
- Обработка сетевых ошибок

### Responsive Design
- Mobile-first подход
- Гибкая сетка для всех разрешений экрана
- Оптимизированные изображения с Next.js Image

### Performance
- Автоматическое code splitting
- Lazy loading компонентов
- Оптимизация изображений
- Минимальный bundle size

## 🔧 Конфигурация

### API Configuration
API клиент настраивается в `src/services/api.ts`:
- Базовый URL из переменных окружения
- Автоматические заголовки JSON
- Обработка ошибок
- Логирование запросов (в development)

### HLS Player Configuration
Плеер настроен для минимальной задержки:
```typescript
{
  enableWorker: true,
  lowLatencyMode: true,
  backBufferLength: 90,
  maxBufferLength: 30,
  liveSyncDurationCount: 3,
  liveMaxLatencyDurationCount: 10
}
```

## 🚀 Развертывание

### Vercel (рекомендуется)
```bash
npm run build
vercel --prod
```

### Docker
```bash
docker build -t adapto-web .
docker run -p 3000:3000 adapto-web
```

### Статическая сборка
```bash
npm run build
npm run export  # для статического хостинга
```

## 🛡️ Типизация

Проект полностью типизирован с TypeScript:
- Строгие типы для всех API ответов
- Интерфейсы для пропсов компонентов
- Утилиты для конвертации типов
- Автодополнение в IDE

## 📱 Поддерживаемые браузеры

- **Chrome/Edge** 88+ - Полная поддержка HLS.js
- **Firefox** 78+ - Полная поддержка HLS.js  
- **Safari** 14+ - Нативная поддержка HLS
- **Мобильные браузеры** - iOS Safari, Chrome Mobile

## 🤝 Вклад в проект

1. Создайте fork репозитория
2. Создайте feature branch (`git checkout -b feature/amazing-feature`)
3. Внесите изменения (`git commit -m 'Add amazing feature'`)
4. Push в branch (`git push origin feature/amazing-feature`)
5. Создайте Pull Request

## 📄 Лицензия

Этот проект распространяется под лицензией MIT. См. файл `LICENSE` для подробностей.

## 📞 Поддержка

Если у вас возникли вопросы или проблемы:
- Создайте Issue в GitHub
- Проверьте документацию API
- Убедитесь, что бэкенд API запущен и доступен

---

**Adapto Digital TV Web** - современное решение для просмотра цифрового телевидения в вебе! 🇰🇿
