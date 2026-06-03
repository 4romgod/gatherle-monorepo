import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadDotenv } from 'dotenv';

const appRoot = process.cwd();
const appConfigPath = resolve(appRoot, 'app.json');
const credentialsJsonPath = resolve(appRoot, 'credentials.json');
const gradlePropertiesPath = resolve(appRoot, 'android/gradle.properties');
const debugKeystorePath = resolve(appRoot, 'android/app/debug.keystore');

for (const envFile of ['.env', '.env.local']) {
  const path = resolve(appRoot, envFile);
  if (existsSync(path)) {
    loadDotenv({ path, override: envFile === '.env.local' });
  }
}

const DEBUG_KEYSTORE_ALIAS = 'androiddebugkey';
const DEBUG_KEYSTORE_PASSWORD = 'android';

function readJsonFile(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function readTrimmedEnv(name) {
  return process.env[name]?.trim() ?? '';
}

function getApplicationId() {
  const appConfig = readJsonFile(appConfigPath);
  return appConfig?.expo?.android?.package ?? 'com.gatherle.mobile';
}

function extractProperty(contents, key) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = contents.match(new RegExp(`^${escapedKey}=(.*)$`, 'm'));
  return match?.[1]?.trim() ?? '';
}

function getReleaseSigningConfig() {
  const envConfig = {
    keystorePath: readTrimmedEnv('ANDROID_RELEASE_KEYSTORE_PATH'),
    keystorePassword: readTrimmedEnv('ANDROID_RELEASE_KEYSTORE_PASSWORD'),
    keyAlias: readTrimmedEnv('ANDROID_RELEASE_KEY_ALIAS'),
    keyPassword: readTrimmedEnv('ANDROID_RELEASE_KEY_PASSWORD'),
  };

  if (Object.values(envConfig).every((value) => value.length > 0)) {
    return {
      ...envConfig,
      keystorePath: resolve(appRoot, envConfig.keystorePath),
      source: 'environment variables',
    };
  }

  if (existsSync(credentialsJsonPath)) {
    const credentials = readJsonFile(credentialsJsonPath);
    const keystore = credentials?.android?.keystore;
    if (keystore?.keystorePath && keystore?.keystorePassword && keystore?.keyAlias && keystore?.keyPassword) {
      return {
        keystorePath: resolve(appRoot, keystore.keystorePath),
        keystorePassword: keystore.keystorePassword,
        keyAlias: keystore.keyAlias,
        keyPassword: keystore.keyPassword,
        source: 'credentials.json',
      };
    }
  }

  if (existsSync(gradlePropertiesPath)) {
    const gradleProperties = readFileSync(gradlePropertiesPath, 'utf8');
    const keystorePath = extractProperty(gradleProperties, 'android.release.storeFile');
    const keystorePassword = extractProperty(gradleProperties, 'android.release.storePassword');
    const keyAlias = extractProperty(gradleProperties, 'android.release.keyAlias');
    const keyPassword = extractProperty(gradleProperties, 'android.release.keyPassword');

    if (keystorePath && keystorePassword && keyAlias && keyPassword) {
      return {
        keystorePath: resolve(appRoot, keystorePath),
        keystorePassword,
        keyAlias,
        keyPassword,
        source: 'android/gradle.properties',
      };
    }
  }

  return null;
}

function getSha1Fingerprint({ alias, keystorePath, keyPassword, storePassword }) {
  if (!existsSync(keystorePath)) {
    throw new Error(`Keystore not found at ${keystorePath}`);
  }

  let output = '';

  try {
    output = execFileSync(
      'keytool',
      ['-list', '-v', '-alias', alias, '-keystore', keystorePath, '-storepass', storePassword, '-keypass', keyPassword],
      { encoding: 'utf8' },
    );
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'status' in error &&
      error.status === 0 &&
      'stdout' in error &&
      typeof error.stdout === 'string'
    ) {
      output = error.stdout;
    } else {
      throw error;
    }
  }

  const match = output.match(/SHA1:\s*([A-F0-9:]+)/);
  if (!match) {
    throw new Error(`Unable to read SHA1 fingerprint from ${keystorePath}`);
  }
  return match[1];
}

function printLine(label, value) {
  console.log(`${label}: ${value}`);
}

function main() {
  const applicationId = getApplicationId();
  const debugKeystoreExists = existsSync(debugKeystorePath);
  const debugSha1 = debugKeystoreExists
    ? getSha1Fingerprint({
        alias: DEBUG_KEYSTORE_ALIAS,
        keystorePath: debugKeystorePath,
        keyPassword: DEBUG_KEYSTORE_PASSWORD,
        storePassword: DEBUG_KEYSTORE_PASSWORD,
      })
    : null;

  const releaseSigningConfig = getReleaseSigningConfig();
  const releaseSha1 = releaseSigningConfig
    ? getSha1Fingerprint({
        alias: releaseSigningConfig.keyAlias,
        keystorePath: releaseSigningConfig.keystorePath,
        keyPassword: releaseSigningConfig.keyPassword,
        storePassword: releaseSigningConfig.keystorePassword,
      })
    : null;

  console.log('Android Google OAuth doctor');
  console.log('');
  printLine('Application ID', applicationId);
  printLine('Web client ID env', readTrimmedEnv('EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID_WEB') ? 'set' : 'missing');
  console.log('');

  if (releaseSha1 && releaseSigningConfig) {
    console.log('Shared repo signing identity');
    printLine('Used by', '`npm run android`, `npm run apk:release`, and CI release APK builds');
    printLine('SHA1', releaseSha1);
    printLine('Source', releaseSigningConfig.source);
    console.log('');
    console.log('Fallback Expo debug identity');
    printLine('Used by', 'direct `expo run:android` only if you bypass the repo `npm run android` script');
    printLine('SHA1', debugSha1 ?? 'unavailable');
    if (!debugSha1) {
      printLine('Next step', 'Run `expo prebuild --no-install` once to generate `android/app/debug.keystore`.');
    }
  } else {
    console.log('Debug signing identity');
    printLine('Used by', '`npm run android` without release signing configured');
    printLine('SHA1', debugSha1 ?? 'unavailable');
    if (!debugSha1) {
      printLine('Next step', 'Run `expo prebuild --no-install` once to generate `android/app/debug.keystore`.');
    }
    console.log('');
    console.log('Release signing identity');
    printLine('Used by', '`npm run apk:release` / CI release APKs');
    printLine('SHA1', 'unavailable');
    printLine('Source', 'release keystore not configured locally');
  }

  console.log('');
  console.log('Google Cloud Console checklist');
  console.log(`1. Create or update an Android OAuth client for package ${applicationId}.`);
  if (releaseSha1) {
    console.log('2. Register the shared repo signing SHA1 shown above for both local dev builds and release APKs.');
    console.log(
      '3. Remove stale Android OAuth clients that still point at old debug-only fingerprints if they cause confusion.',
    );
  } else {
    console.log('2. Register the debug SHA1 if you install Android dev builds locally.');
    console.log('3. Register the release SHA1 if you test the release APK or CI-built APK.');
  }
  console.log('4. Keep EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID_WEB set for the mobile app runtime.');
  console.log(
    '5. Keep GOOGLE_OAUTH_CLIENT_ID_ANDROID set in the API environment so the backend accepts Android id tokens.',
  );
  console.log('');
  console.log(
    '`DEVELOPER_ERROR` on Android almost always means the package name or signing SHA1 does not match the Android OAuth client in Google Cloud Console.',
  );
}

main();
