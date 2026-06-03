const baseConfig = require('./app.json');

const GOOGLE_CLIENT_ID_SUFFIX = '.apps.googleusercontent.com';
const MANAGED_PLUGINS = ['expo-apple-authentication', 'expo-web-browser'];

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
  const pluginName = Array.isArray(plugin) ? plugin[0] : plugin;

  return pluginName !== '@react-native-google-signin/google-signin' && !MANAGED_PLUGINS.includes(pluginName);
});

const iosGoogleScheme = getGoogleIosUrlScheme(process.env.EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID_IOS);
const plugins = [...basePlugins, ...MANAGED_PLUGINS];

if (iosGoogleScheme) {
  plugins.push([
    '@react-native-google-signin/google-signin',
    {
      iosUrlScheme: iosGoogleScheme,
    },
  ]);
}

module.exports = {
  expo: {
    ...baseConfig.expo,
    plugins,
  },
};
