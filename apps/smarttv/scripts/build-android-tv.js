#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const RN_TV_PATH = path.join(PROJECT_ROOT, 'packages/renderer-rn-tv');

console.log('🚀 Начинаем сборку для Android TV...');

// Проверяем наличие Android SDK
try {
  execSync('adb version', { stdio: 'ignore' });
} catch (error) {
  console.error('❌ Android SDK не найден. Установите Android Studio и настройте ANDROID_HOME');
  process.exit(1);
}

// Переходим в директорию RN TV
process.chdir(RN_TV_PATH);

try {
  // Устанавливаем зависимости
  console.log('📦 Устанавливаем зависимости...');
  execSync('yarn install', { stdio: 'inherit' });

  // Создаем bundle
  console.log('📱 Создаем bundle для Android TV...');
  execSync('yarn bundle:android', { stdio: 'inherit' });

  // Собираем APK
  console.log('🔨 Собираем APK...');
  execSync('yarn build:android', { stdio: 'inherit' });

  console.log('✅ Сборка для Android TV завершена!');
  console.log('📁 APK файл: packages/renderer-rn-tv/android/app/build/outputs/apk/release/app-release.apk');

} catch (error) {
  console.error('❌ Ошибка при сборке:', error.message);
  process.exit(1);
} 