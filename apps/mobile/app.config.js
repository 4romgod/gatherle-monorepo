const baseConfig = require('./app.json');
const fs = require('node:fs');
const path = require('node:path');

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

function resolveAndroidGoogleServicesFile() {
  const configuredFilePath =
    process.env.EXPO_ANDROID_GOOGLE_SERVICES_FILE?.trim() || process.env.GOOGLE_SERVICES_JSON?.trim();

  if (configuredFilePath) {
    return configuredFilePath;
  }

  const localFile = path.resolve(__dirname, 'google-services.json');
  if (fs.existsSync(localFile)) {
    return './google-services.json';
  }

  return undefined;
}

const iosGoogleScheme = getGoogleIosUrlScheme(process.env.EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID_IOS);
const plugins = [...basePlugins, ...MANAGED_PLUGINS];
const androidGoogleServicesFile = resolveAndroidGoogleServicesFile();

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
    android: {
      ...(baseConfig.expo.android ?? {}),
      ...(androidGoogleServicesFile ? { googleServicesFile: androidGoogleServicesFile } : {}),
    },
    plugins,
  },
};
