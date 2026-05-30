const baseConfig = require('./app.json');

const GOOGLE_CLIENT_ID_SUFFIX = '.apps.googleusercontent.com';

function getGoogleIosUrlScheme(clientId) {
  if (typeof clientId !== 'string') {
    return undefined;
  }

  const trimmedClientId = clientId.trim();
  if (!trimmedClientId.endsWith(GOOGLE_CLIENT_ID_SUFFIX)) {
    return undefined;
  }

  return `com.googleusercontent.apps.${trimmedClientId.slice(0, -GOOGLE_CLIENT_ID_SUFFIX.length)}`;
}

const basePlugins = (baseConfig.expo.plugins ?? []).filter((plugin) => {
  return Array.isArray(plugin)
    ? plugin[0] !== '@react-native-google-signin/google-signin'
    : plugin !== '@react-native-google-signin/google-signin';
});

const iosGoogleScheme = getGoogleIosUrlScheme(process.env.EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID_IOS);

module.exports = {
  expo: {
    ...baseConfig.expo,
    plugins: iosGoogleScheme
      ? [
          ...basePlugins,
          [
            '@react-native-google-signin/google-signin',
            {
              iosUrlScheme: iosGoogleScheme,
            },
          ],
        ]
      : basePlugins,
  },
};
