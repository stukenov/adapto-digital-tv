import { View, type ViewProps } from 'react-native';

import { useThemeColor } from '@/hooks/useThemeColor';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'primary' | 'secondary' | 'tertiary' | 'card' | 'grouped';
};

export function ThemedView({ 
  style, 
  lightColor, 
  darkColor, 
  type = 'default',
  ...otherProps 
}: ThemedViewProps) {
  // Получаем все возможные цвета заранее
  const defaultBg = useThemeColor({ light: lightColor, dark: darkColor }, 'background');
  const systemBg = useThemeColor({ light: lightColor, dark: darkColor }, 'systemBackground');
  const secondaryBg = useThemeColor({ light: lightColor, dark: darkColor }, 'secondarySystemBackground');
  const tertiaryBg = useThemeColor({ light: lightColor, dark: darkColor }, 'tertiarySystemBackground');
  const cardBg = useThemeColor({ light: lightColor, dark: darkColor }, 'cardBackground');
  const groupedBg = useThemeColor({ light: lightColor, dark: darkColor }, 'systemGroupedBackground');
  
  // Выбираем нужный цвет без условных вызовов хуков
  let backgroundColor: string;
  switch (type) {
    case 'primary':
      backgroundColor = systemBg;
      break;
    case 'secondary':
      backgroundColor = secondaryBg;
      break;
    case 'tertiary':
      backgroundColor = tertiaryBg;
      break;
    case 'card':
      backgroundColor = cardBg;
      break;
    case 'grouped':
      backgroundColor = groupedBg;
      break;
    default:
      backgroundColor = defaultBg;
  }

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}
