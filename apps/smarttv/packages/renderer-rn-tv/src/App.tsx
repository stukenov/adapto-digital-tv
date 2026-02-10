import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { HomePage } from './pages/HomePage';
import { ChannelPage } from './pages/ChannelPage';
import { TVFocusGuideView } from './components/TVFocusGuideView';

const Stack = createNativeStackNavigator();

const App: React.FC = () => {
  return (
    <SafeAreaProvider>
      <StatusBar hidden />
      <NavigationContainer>
        <TVFocusGuideView style={styles.container}>
          <Stack.Navigator
            initialRouteName='Home'
            screenOptions={{
              headerShown: false,
              gestureEnabled: false,
              animation: 'fade',
            }}
          >
            <Stack.Screen name='Home' component={HomePage} />
            <Stack.Screen name='Channel' component={ChannelPage} />
          </Stack.Navigator>
        </TVFocusGuideView>
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
});

export default App;
