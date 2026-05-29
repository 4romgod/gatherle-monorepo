import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const appRoot = process.cwd();
const androidGradlePath = resolve(appRoot, 'android/gradle.properties');
const androidBuildGradlePath = resolve(appRoot, 'android/app/build.gradle');
const credentialsJsonPath = resolve(appRoot, 'credentials.json');

const readTrimmedEnv = (name) => process.env[name]?.trim() ?? '';

const ensureFileExists = (path, description) => {
  if (!existsSync(path)) {
    throw new Error(`Missing ${description} at ${path}`);
  }
};

const resolveReleaseSigningConfig = () => {
  const envConfig = {
    keystorePath: readTrimmedEnv('ANDROID_RELEASE_KEYSTORE_PATH'),
    keystorePassword: readTrimmedEnv('ANDROID_RELEASE_KEYSTORE_PASSWORD'),
    keyAlias: readTrimmedEnv('ANDROID_RELEASE_KEY_ALIAS'),
    keyPassword: readTrimmedEnv('ANDROID_RELEASE_KEY_PASSWORD'),
  };

  if (Object.values(envConfig).every((value) => value.length > 0)) {
    const absoluteKeystorePath = resolve(appRoot, envConfig.keystorePath);
    ensureFileExists(absoluteKeystorePath, 'Android release keystore');
    return {
      keystorePath: absoluteKeystorePath,
      keystorePassword: envConfig.keystorePassword,
      keyAlias: envConfig.keyAlias,
      keyPassword: envConfig.keyPassword,
    };
  }

  ensureFileExists(credentialsJsonPath, 'credentials.json');
  const credentials = JSON.parse(readFileSync(credentialsJsonPath, 'utf8'));
  const keystoreConfig = credentials?.android?.keystore;

  if (
    !keystoreConfig?.keystorePath ||
    !keystoreConfig?.keystorePassword ||
    !keystoreConfig?.keyAlias ||
    !keystoreConfig?.keyPassword
  ) {
    throw new Error('credentials.json does not contain a complete android.keystore configuration');
  }

  const absoluteKeystorePath = resolve(appRoot, keystoreConfig.keystorePath);
  ensureFileExists(absoluteKeystorePath, 'Android release keystore');

  return {
    keystorePath: absoluteKeystorePath,
    keystorePassword: keystoreConfig.keystorePassword,
    keyAlias: keystoreConfig.keyAlias,
    keyPassword: keystoreConfig.keyPassword,
  };
};

const upsertGradleProperty = (contents, key, value) => {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^${escapedKey}=.*$`, 'm');
  const nextLine = `${key}=${value}`;

  if (pattern.test(contents)) {
    return contents.replace(pattern, nextLine);
  }

  return `${contents.trimEnd()}\n${nextLine}\n`;
};

const injectedSigningVariablesBlock = `def releaseSigningReady =
        project.findProperty('android.release.storeFile') &&
        project.findProperty('android.release.storePassword') &&
        project.findProperty('android.release.keyAlias') &&
        project.findProperty('android.release.keyPassword')
`;

const patchAndroidBuildGradle = () => {
  ensureFileExists(androidBuildGradlePath, 'android/app/build.gradle');
  let buildGradle = readFileSync(androidBuildGradlePath, 'utf8');

  buildGradle = buildGradle.replace(
    /\ndef releaseStoreFile = findProperty\('android\.release\.storeFile'\)\ndef releaseStorePassword = findProperty\('android\.release\.storePassword'\)\ndef releaseKeyAlias = findProperty\('android\.release\.keyAlias'\)\ndef releaseKeyPassword = findProperty\('android\.release\.keyPassword'\)\ndef releaseSigningReady = releaseStoreFile && releaseStorePassword && releaseKeyAlias && releaseKeyPassword\n/g,
    '\n',
  );

  buildGradle = buildGradle.replace(
    /\ndef releaseSigningReady =\n\s*project\.findProperty\('android\.release\.storeFile'\) &&\n\s*project\.findProperty\('android\.release\.storePassword'\) &&\n\s*project\.findProperty\('android\.release\.keyAlias'\) &&\n\s*project\.findProperty\('android\.release\.keyPassword'\)\n/g,
    '\n',
  );

  const signingAnchorPattern = /^(def jscFlavor = .+\n)/m;
  if (!signingAnchorPattern.test(buildGradle)) {
    throw new Error('Unable to locate Android build.gradle signing anchor');
  }

  buildGradle = buildGradle.replace(signingAnchorPattern, `$1${injectedSigningVariablesBlock}\n`);

  const existingSigningBlockPattern = /    signingConfigs \{\n[\s\S]*?    \}\n    buildTypes \{/;
  if (!existingSigningBlockPattern.test(buildGradle)) {
    throw new Error('Unable to locate Android signingConfigs block');
  }

  const updatedSigningBlock = `    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        if (releaseSigningReady) {
            release {
                storeFile file(project.findProperty('android.release.storeFile'))
                storePassword project.findProperty('android.release.storePassword')
                keyAlias project.findProperty('android.release.keyAlias')
                keyPassword project.findProperty('android.release.keyPassword')
            }
        }
    }
    buildTypes {`;

  buildGradle = buildGradle.replace(existingSigningBlockPattern, updatedSigningBlock);

  buildGradle = buildGradle.replace(
    /(        debug \{\n)(\s*signingConfig releaseSigningReady \? signingConfigs\.release : signingConfigs\.debug\n)(        \})/g,
    '$1$3',
  );

  buildGradle = buildGradle.replace(
    /(        release \{\n[\s\S]*?)(            signingConfig signingConfigs\.debug)/,
    '$1            signingConfig releaseSigningReady ? signingConfigs.release : signingConfigs.debug',
  );

  writeFileSync(androidBuildGradlePath, buildGradle);
};

const releaseSigning = resolveReleaseSigningConfig();

patchAndroidBuildGradle();

ensureFileExists(androidGradlePath, 'android/gradle.properties');
let gradleProperties = readFileSync(androidGradlePath, 'utf8');

gradleProperties = upsertGradleProperty(gradleProperties, 'android.release.storeFile', releaseSigning.keystorePath);
gradleProperties = upsertGradleProperty(
  gradleProperties,
  'android.release.storePassword',
  releaseSigning.keystorePassword,
);
gradleProperties = upsertGradleProperty(gradleProperties, 'android.release.keyAlias', releaseSigning.keyAlias);
gradleProperties = upsertGradleProperty(gradleProperties, 'android.release.keyPassword', releaseSigning.keyPassword);

writeFileSync(androidGradlePath, gradleProperties);

console.log(`[android signing] Prepared release signing using ${releaseSigning.keystorePath}`);
