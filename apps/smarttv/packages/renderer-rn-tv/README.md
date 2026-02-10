# Adapto Digital TV React Native TV Renderer

Рендерер для Apple tvOS и Android TV, построенный на React Native.

## Поддерживаемые платформы

- **Apple tvOS** - через react-native-tvos
- **Android TV** - через стандартный React Native с TV-оптимизацией
- **Amazon Fire TV** - через Android TV сборку

## Установка

```bash
# Из корневой директории проекта
yarn install

# Переход в директорию RN TV
cd packages/renderer-rn-tv

# Установка зависимостей
yarn install
```

## Разработка

### Android TV

```bash
# Запуск Metro bundler
yarn start

# Запуск на Android TV эмуляторе
yarn android

# Или из корневой директории
yarn dev:android-tv
```

### Apple tvOS

```bash
# Установка CocoaPods (только для iOS/tvOS)
cd ios && pod install && cd ..

# Запуск на tvOS симуляторе
yarn ios

# Или из корневой директории
yarn dev:tvos
```

## Сборка

### Android TV

```bash
# Из корневой директории
yarn build:android-tv

# Результат: packages/renderer-rn-tv/android/app/build/outputs/apk/release/app-release.apk
```

### Apple tvOS

```bash
# Из корневой директории
yarn build:tvos

# Результат: packages/renderer-rn-tv/ios/build/
```

## Архитектура

```
src/
├── components/          # TV-специфичные компоненты
│   ├── TVFocusGuideView.tsx    # Управление фокусом
│   ├── TVTouchable.tsx         # Кликабельные элементы
│   └── TVChannelCard.tsx       # Карточки каналов
├── hooks/              # Хуки для TV
│   ├── usePlayer.ts           # Медиаплеер
│   └── useTVRemote.ts         # Пульт ДУ
├── pages/              # Страницы приложения
│   ├── HomePage.tsx           # Главная страница
│   └── ChannelPage.tsx        # Страница канала
├── data/               # Тестовые данные
└── types/              # TypeScript типы
```

## TV-специфичные особенности

### Навигация с пульта ДУ

- **Фокус**: Автоматическое управление фокусом между элементами
- **Кнопки**: Поддержка всех кнопок пульта (вверх, вниз, влево, вправо, выбор, назад)
- **Анимации**: Плавные переходы и масштабирование при фокусе

### Медиаплеер

- **HLS**: Поддержка HTTP Live Streaming
- **DASH**: Поддержка MPEG-DASH (через react-native-video)
- **Управление**: Воспроизведение, пауза, громкость, перемотка

### Оптимизация для TV

- **Большие элементы**: Увеличенные размеры для просмотра с расстояния
- **Контрастность**: Высокий контраст для лучшей видимости
- **Производительность**: Оптимизация для TV-процессоров

## Тестирование

```bash
# Запуск тестов
yarn test

# Запуск с отслеживанием изменений
yarn test --watch

# Покрытие кода
yarn test --coverage
```

## Требования

### Android TV

- Android SDK 21+
- Android TV API Level 21+
- Gradle 7.0+

### Apple tvOS

- Xcode 12+
- tvOS 13.0+
- CocoaPods 1.10+

## Ограничения

- Размер bundle: ≤ 5 MB
- Использование памяти: ≤ 500 MB
- Частота кадров: ≥ 30 FPS

## Отладка

### Android TV

```bash
# Подключение к устройству
adb connect <TV_IP>:5555

# Просмотр логов
adb logcat | grep ReactNativeJS
```

### Apple tvOS

```bash
# Использование Xcode для отладки
# Simulator -> Device -> Apple TV
```
