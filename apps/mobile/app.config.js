const baseConfig = require('./app.json');

const GOOGLE_CLIENT_ID_SUFFIX = '.apps.googleusercontent.com';

function getGoogleOAuthRedirectScheme(clientId) {
  if (typeof clientId !== 'string') {
    return undefined;
  }

  const trimmedClientId = clientId.trim();
  if (!trimmedClientId.endsWith(GOOGLE_CLIENT_ID_SUFFIX)) {
    return undefined;
  }

  return `com.googleusercontent.apps.${trimmedClientId.slice(0, -GOOGLE_CLIENT_ID_SUFFIX.length)}`;
}

function uniqueSchemes(schemes) {
  return [...new Set(schemes.filter(Boolean))];
}

const androidGoogleScheme = getGoogleOAuthRedirectScheme(process.env.EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID_ANDROID);
const iosGoogleScheme = getGoogleOAuthRedirectScheme(process.env.EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID_IOS);

module.exports = {
  expo: {
    ...baseConfig.expo,
    android: {
      ...baseConfig.expo.android,
      scheme: uniqueSchemes([androidGoogleScheme]),
    },
    ios: {
      ...baseConfig.expo.ios,
      scheme: uniqueSchemes([iosGoogleScheme]),
    },
  },
};
