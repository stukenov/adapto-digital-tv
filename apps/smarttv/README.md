# Adapto Digital TV Smart TV App

Универсальное Smart TV приложение для просмотра телеканалов, построенное на React 18 с поддержкой множества платформ.

## 🚀 Поддерживаемые платформы

- **Samsung Tizen** - `.wgt` пакеты
- **LG webOS** - `.ipk` пакеты  
- **Web PWA** - прогрессивное веб-приложение
- **Android TV** - `.apk` пакеты ✅
- **Apple tvOS** - `.ipa` пакеты ✅
- **Amazon Fire TV** - через Android TV сборку ✅
- **Roku** - `.zip` пакеты (планируется)

## 📱 Функциональность

- **Главная страница** - список из 10 телеканалов с логотипами и текущими программами
- **Страница канала** - медиаплеер с HLS поддержкой, расписание передач, список других каналов
- **Навигация пультом** - полная поддержка стрелок и кнопки Enter
- **Адаптивный дизайн** - оптимизировано для TV экранов

## 🏗️ Архитектура

Проект построен как monorepo с использованием Yarn Workspaces:

```
packages/
├── app-core/        # Бизнес-логика, UI-компоненты, медиаплеер
├── renderer-web/    # Web рендерер для Tizen, webOS, PWA
├── renderer-rn-tv/  # React Native TV рендерер для Android TV, tvOS ✅
├── renderer-roku/   # Roku рендерер (планируется)
└── shared-config/   # Общие конфигурации
```

## 🛠️ Технологии

- **React 18** + **TypeScript** - основной стек
- **Styled Components** - стилизация
- **React Router** - навигация
- **HLS.js** - потоковое видео
- **Vite** - сборка и разработка
- **Yarn Workspaces** - управление monorepo

## 🚀 Быстрый старт

### Установка зависимостей

```bash
yarn install
```

### Запуск в режиме разработки

```bash
yarn dev
```

Приложение будет доступно по адресу `http://localhost:3000`

### Сборка для продакшена

```bash
# Web PWA
yarn build:pwa

# Samsung Tizen
yarn build:tizen

# LG webOS  
yarn build:webos

# Android TV
yarn build:android-tv

# Apple tvOS
yarn build:tvos

# Все платформы
yarn build:all
```

## 📋 Доступные команды

```bash
# Разработка
yarn dev              # Запуск dev сервера (web)
yarn dev:android-tv   # Запуск на Android TV эмуляторе
yarn dev:tvos         # Запуск на tvOS симуляторе

# Сборка
yarn build:pwa        # PWA сборка
yarn build:tizen      # Tizen .wgt пакет
yarn build:webos      # webOS .ipk пакет
yarn build:android-tv # Android TV .apk пакет
yarn build:tvos       # Apple tvOS сборка
yarn build:all        # Сборка для всех платформ

# Тестирование
yarn test             # Запуск тестов
yarn lint             # Проверка кода
```

## 🎮 Управление

### Навигация пультом

- **↑/↓** - перемещение по списку каналов
- **Enter** - выбор канала
- **←/→** - навигация между кнопками на странице канала  
- **Escape** - возврат на главную страницу

### Поддержка мыши/тача

Все элементы также поддерживают клики мышью и тач-события.

## 🔧 Конфигурация

### Настройка каналов

Список каналов настраивается в файле `packages/app-core/src/data/mockChannels.ts`:

```typescript
export const mockChannels: Channel[] = [
  {
    id: '1',
    name: 'Первый канал',
    logo: 'https://example.com/logo.png',
    streamUrl: 'https://stream.example.com/hls/channel.m3u8',
    currentProgram: {
      title: 'Новости',
      description: 'Главные новости дня',
      startTime: '2024-01-15T21:00:00Z',
      endTime: '2024-01-15T21:30:00Z'
    },
    schedule: [...]
  }
]
```

### Медиаплеер

Плеер поддерживает:
- **HLS** потоки (`.m3u8`)
- **DASH** потоки (планируется)
- Автоматическое качество
- Низкая задержка

## 📦 Структура проекта

```
adapto-tv/
├── packages/
│   ├── app-core/
│   │   ├── src/
│   │   │   ├── components/     # UI компоненты
│   │   │   ├── hooks/         # React хуки
│   │   │   ├── pages/         # Страницы приложения
│   │   │   ├── types/         # TypeScript типы
│   │   │   └── data/          # Моковые данные
│   │   └── package.json
│   ├── renderer-web/
│   │   ├── src/
│   │   │   └── main.tsx       # Точка входа
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── package.json
│   └── shared-config/
│       └── tsconfig.json
├── scripts/                   # Скрипты сборки
├── package.json              # Корневой package.json
└── README.md
```

## 🎯 Производительность

- **Bundle size**: ≤ 5 MB
- **Runtime RAM**: ≤ 500 MB  
- **Target FPS**: ≥ 30
- **Lazy loading** тяжелых модулей

## 🔒 Безопасность

- CSP заголовки для PWA
- Валидация входных данных
- Безопасная работа с потоками

## 📄 Лицензия

MIT License

## 🤝 Вклад в проект

1. Fork проекта
2. Создайте feature branch (`git checkout -b feature/amazing-feature`)
3. Commit изменения (`git commit -m 'Add amazing feature'`)
4. Push в branch (`git push origin feature/amazing-feature`)
5. Откройте Pull Request

## 📞 Поддержка

По вопросам разработки обращайтесь к команде разработки. 