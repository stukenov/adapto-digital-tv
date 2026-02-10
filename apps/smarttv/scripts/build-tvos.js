#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const RN_TV_PATH = path.join(PROJECT_ROOT, 'packages/renderer-rn-tv');

console.log('🚀 Начинаем сборку для Apple tvOS...');

// Проверяем наличие Xcode
try {
  execSync('xcodebuild -version', { stdio: 'ignore' });
} catch (error) {
  console.error('❌ Xcode не найден. Установите Xcode из App Store');
  process.exit(1);
}

// Переходим в директорию RN TV
process.chdir(RN_TV_PATH);

try {
  // Устанавливаем зависимости
  console.log('📦 Устанавливаем зависимости...');
  execSync('yarn install', { stdio: 'inherit' });

  // Устанавливаем pods
  console.log('🍎 Устанавливаем CocoaPods...');
  execSync('cd ios && pod install', { stdio: 'inherit' });

  // Создаем bundle
  console.log('📱 Создаем bundle для tvOS...');
  execSync('yarn bundle:ios', { stdio: 'inherit' });

  // Собираем IPA
  console.log('🔨 Собираем для tvOS...');
  execSync('yarn build:ios', { stdio: 'inherit' });

  console.log('✅ Сборка для Apple tvOS завершена!');
  console.log('📁 Архив: packages/renderer-rn-tv/ios/build/');

} catch (error) {
  console.error('❌ Ошибка при сборке:', error.message);
  process.exit(1);
} 