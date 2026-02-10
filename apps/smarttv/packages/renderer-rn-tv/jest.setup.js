import 'react-native-gesture-handler/jestSetup';

jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

jest.mock('react-native-video', () => 'Video');

jest.mock('react-native-device-info', () => ({
  getDeviceType: () => 'tv',
  isTablet: () => false,
  getSystemName: () => 'Android',
}));

// Mock TV specific APIs
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Platform: {
      ...RN.Platform,
      isTV: true,
    },
    TVEventHandler: jest.fn(() => ({
      enable: jest.fn(),
      disable: jest.fn(),
    })),
    TVFocusGuideView: 'TVFocusGuideView',
  };
});
