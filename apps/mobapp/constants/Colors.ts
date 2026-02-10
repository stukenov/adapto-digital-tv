/**
 * iOS-стилизованная цветовая схема в соответствии с Human Interface Guidelines
 * Использует системные цвета iOS для обеспечения нативного вида
 */

const tintColorLight = '#007AFF'; // iOS Blue
const tintColorDark = '#0A84FF'; // iOS Blue (Dark)

export const Colors = {
  light: {
    text: '#000000',
    background: '#FFFFFF',
    tint: tintColorLight,
    icon: '#8E8E93',
    tabIconDefault: '#8E8E93',
    tabIconSelected: tintColorLight,
    // iOS системные цвета
    systemBackground: '#FFFFFF',
    secondarySystemBackground: '#F2F2F7',
    tertiarySystemBackground: '#FFFFFF',
    systemGroupedBackground: '#F2F2F7',
    secondarySystemGroupedBackground: '#FFFFFF',
    tertiarySystemGroupedBackground: '#F2F2F7',
    separator: '#C6C6C8',
    opaqueSeparator: '#C6C6C8',
    link: '#007AFF',
    placeholderText: '#3C3C43',
    secondaryLabel: '#3C3C43',
    tertiaryLabel: '#3C3C43',
    quaternaryLabel: '#3C3C43',
    systemFill: '#787880',
    secondarySystemFill: '#787880',
    tertiarySystemFill: '#767680',
    quaternarySystemFill: '#747480',
    // Дополнительные цвета для карточек
    cardBackground: '#FFFFFF',
    cardShadow: '#000000',
    accent: '#FF3B30', // iOS Red для акцентов
    success: '#34C759', // iOS Green
    warning: '#FF9500', // iOS Orange
  },
  dark: {
    text: '#FFFFFF',
    background: '#000000',
    tint: tintColorDark,
    icon: '#8E8E93',
    tabIconDefault: '#8E8E93',
    tabIconSelected: tintColorDark,
    // iOS системные цвета (темная тема)
    systemBackground: '#000000',
    secondarySystemBackground: '#1C1C1E',
    tertiarySystemBackground: '#2C2C2E',
    systemGroupedBackground: '#000000',
    secondarySystemGroupedBackground: '#1C1C1E',
    tertiarySystemGroupedBackground: '#2C2C2E',
    separator: '#38383A',
    opaqueSeparator: '#38383A',
    link: '#0A84FF',
    placeholderText: '#EBEBF5',
    secondaryLabel: '#EBEBF5',
    tertiaryLabel: '#EBEBF5',
    quaternaryLabel: '#EBEBF5',
    systemFill: '#787880',
    secondarySystemFill: '#787880',
    tertiarySystemFill: '#767680',
    quaternarySystemFill: '#747480',
    // Дополнительные цвета для карточек
    cardBackground: '#1C1C1E',
    cardShadow: '#000000',
    accent: '#FF453A', // iOS Red для акцентов (темная тема)
    success: '#30D158', // iOS Green (темная тема)
    warning: '#FF9F0A', // iOS Orange (темная тема)
  },
};
