jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
jest.mock('react-native-keyboard-controller', () => require('react-native-keyboard-controller/jest'));

jest.mock('expo-secure-store', () => ({
  deleteItemAsync: jest.fn(async () => undefined),
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
}));

jest.mock('expo-image', () => {
  const React = require('react');
  const { Image } = require('react-native');

  const MockExpoImage = React.forwardRef(
    (
      { cachePolicy: _cachePolicy, contentFit: _contentFit, onDisplay, onLoad, transition: _transition, ...props }: any,
      ref: React.ForwardedRef<unknown>,
    ) =>
      React.createElement(Image, {
        ...props,
        ref,
        onLoad: (event: unknown) => {
          onLoad?.(event);
          onDisplay?.(event);
        },
      }),
  );

  MockExpoImage.displayName = 'ExpoImage';

  return {
    __esModule: true,
    Image: MockExpoImage,
  };
});

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    Feather: ({ name }: { name: string }) => React.createElement(Text, null, name),
    MaterialCommunityIcons: ({ name }: { name: string }) => React.createElement(Text, null, name),
  };
});
