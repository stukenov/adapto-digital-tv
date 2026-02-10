import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        tabBarInactiveTintColor: Colors[colorScheme ?? 'light'].tabIconDefault,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            position: 'absolute',
            backgroundColor: 'transparent',
            borderTopWidth: 0,
            elevation: 0,
            shadowOpacity: 0,
            height: 83,
            paddingBottom: 34, // Safe area для iPhone X+
          },
          android: {
            backgroundColor: Colors[colorScheme ?? 'light'].background,
            borderTopWidth: 0.5,
            borderTopColor: Colors[colorScheme ?? 'light'].separator,
            elevation: 8,
            shadowOpacity: 0.1,
            height: 60 + insets.bottom, // Добавляем высоту системных кнопок
            paddingBottom: insets.bottom, // Отступ для системных кнопок
          },
          default: {
            backgroundColor: Colors[colorScheme ?? 'light'].background,
            borderTopWidth: 0.5,
            borderTopColor: Colors[colorScheme ?? 'light'].separator,
            height: 60,
          },
        }),
        tabBarItemStyle: {
          paddingTop: 6,
          paddingBottom: 2,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
          marginTop: 2,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Каналы',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol 
              size={focused ? 30 : 28} 
              name="tv" 
              color={color}
              style={{ marginBottom: -2 }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Расписание',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol 
              size={focused ? 30 : 28} 
              name="calendar" 
              color={color}
              style={{ marginBottom: -2 }}
            />
          ),
        }}
      />
    </Tabs>
  );
}
