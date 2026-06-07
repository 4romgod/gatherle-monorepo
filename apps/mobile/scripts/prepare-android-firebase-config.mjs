import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultGoogleServicesPath = path.join(projectRoot, 'google-services.json');

function validateJsonString(rawValue, sourceLabel) {
  try {
    JSON.parse(rawValue);
    return rawValue;
  } catch {
    throw new Error(`Android Firebase config from ${sourceLabel} is not valid JSON.`);
  }
}

function decodeJsonFromEnv(rawValue, sourceLabel) {
  const trimmed = rawValue?.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith('{')) {
    return validateJsonString(trimmed, sourceLabel);
  }

  try {
    const decoded = Buffer.from(trimmed, 'base64').toString('utf8').trim();
    if (!decoded) {
      throw new Error(`Android Firebase config from ${sourceLabel} decoded to an empty value.`);
    }

    return validateJsonString(decoded, `${sourceLabel} (base64-decoded)`);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }

    throw new Error(`Android Firebase config from ${sourceLabel} is not valid JSON or base64-encoded JSON.`);
  }
}

function resolveConfiguredFirebaseJson() {
  const explicitPath = process.env.EXPO_ANDROID_GOOGLE_SERVICES_FILE?.trim();
  if (explicitPath) {
    const absolutePath = path.isAbsolute(explicitPath) ? explicitPath : path.resolve(projectRoot, explicitPath);
    if (!existsSync(absolutePath)) {
      throw new Error(`Android Firebase config file was not found at ${absolutePath}`);
    }

    return { mode: 'path', path: absolutePath };
  }

  if (existsSync(defaultGoogleServicesPath)) {
    return { mode: 'path', path: defaultGoogleServicesPath };
  }

  const inlineJson =
    decodeJsonFromEnv(process.env.ANDROID_GOOGLE_SERVICES_JSON, 'ANDROID_GOOGLE_SERVICES_JSON') ??
    decodeJsonFromEnv(process.env.ANDROID_GOOGLE_SERVICES_JSON_BASE64, 'ANDROID_GOOGLE_SERVICES_JSON_BASE64');

  if (!inlineJson) {
    return null;
  }

  return { mode: 'inline', json: inlineJson };
}

function main() {
  const config = resolveConfiguredFirebaseJson();

  if (!config) {
    console.log(
      '[android firebase] No google-services.json found locally and no Android Firebase env vars were provided.',
    );
    return;
  }

  if (config.mode === 'path') {
    if (path.resolve(config.path) === defaultGoogleServicesPath) {
      console.log('[android firebase] Using local apps/mobile/google-services.json');
      return;
    }

    const sourceJson = readFileSync(config.path, 'utf8');
    mkdirSync(path.dirname(defaultGoogleServicesPath), { recursive: true });
    writeFileSync(defaultGoogleServicesPath, sourceJson, 'utf8');
    console.log(`[android firebase] Copied google-services.json from ${config.path}`);
    return;
  }

  mkdirSync(path.dirname(defaultGoogleServicesPath), { recursive: true });
  writeFileSync(defaultGoogleServicesPath, `${config.json.trim()}\n`, 'utf8');
  console.log('[android firebase] Wrote google-services.json from environment input');
}

main();
