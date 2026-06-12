import path from 'node:path';
import process from 'node:process';
import { inspect } from 'node:util';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const expoCliPackagePath = (() => {
  try {
    return require.resolve('@expo/cli/package.json', { paths: [projectRoot] });
  } catch {
    const expoPackagePath = require.resolve('expo/package.json', { paths: [projectRoot] });
    return require.resolve('@expo/cli/package.json', { paths: [path.dirname(expoPackagePath)] });
  }
})();
const expoCliRoot = path.join(path.dirname(expoCliPackagePath), 'build/src');

const adb = require(path.join(expoCliRoot, 'start/platforms/android/adb.js'));
const emulator = require(path.join(expoCliRoot, 'start/platforms/android/emulator.js'));
const { AndroidDeviceManager } = require(path.join(expoCliRoot, 'start/platforms/android/AndroidDeviceManager.js'));
const { promptForDeviceAsync } = require(path.join(expoCliRoot, 'start/platforms/android/promptAndroidDevice.js'));
const { AbortCommandError, CommandError } = require(path.join(expoCliRoot, 'utils/errors.js'));
const { runAndroidAsync } = require(path.join(expoCliRoot, 'run/android/runAndroidAsync.js'));

const AVD_NAME_PROP = 'ro.boot.qemu.avd_name';
const MODEL_PROP = 'ro.product.model';

function parseArgs(argv) {
  let device = true;
  const extraArgs = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--help' || arg === '-h') {
      return { help: true, device: true, extraArgs: [] };
    }

    if (arg === '--device' || arg === '-d') {
      const nextArg = argv[index + 1];
      if (!nextArg || nextArg.startsWith('-')) {
        device = true;
      } else {
        device = nextArg;
        index += 1;
      }
      continue;
    }

    if (device === true && !arg.startsWith('-')) {
      device = arg;
      continue;
    }

    extraArgs.push(arg);
  }

  return { help: false, device, extraArgs };
}

function printHelp() {
  console.log(`Usage: npm run android -w @gatherle/mobile -- [device]

Examples:
  npm run android -w @gatherle/mobile
  npm run android -w @gatherle/mobile -- emulator-5554
  npm run android -w @gatherle/mobile -- Medium_Phone_API_36.1
  npm run android -w @gatherle/mobile -- --device emulator-5554`);
}

function formatThrownError(error) {
  if (error instanceof Error) {
    return error.stack || error.message || error.name;
  }

  return inspect(error, { depth: 5 });
}

async function getDevicePropertyAsync(device, prop) {
  if (!device.pid) {
    return null;
  }

  try {
    const properties = await adb.getPropertyDataForDeviceAsync({ pid: device.pid }, prop);
    const value = properties[prop]?.trim();
    return value || null;
  } catch {
    return null;
  }
}

async function enrichDeviceAsync(device) {
  const avdName = device.type === 'emulator' ? await getDevicePropertyAsync(device, AVD_NAME_PROP) : null;
  const modelName = await getDevicePropertyAsync(device, MODEL_PROP);

  const aliases = Array.from(
    new Set([device.pid, device.name, avdName, modelName].filter((value) => Boolean(value?.trim()))),
  );

  const preferredName =
    device.type === 'emulator'
      ? avdName || device.name || device.pid || 'Android Emulator'
      : device.name || modelName || device.pid || 'Android Device';

  return {
    ...device,
    name: preferredName,
    aliases,
  };
}

async function getPatchedDevicesAsync() {
  const bootedDevices = await adb.getAttachedDevicesAsync();
  const enrichedBootedDevices = await Promise.all(bootedDevices.map((device) => enrichDeviceAsync(device)));
  const connectedNames = new Set(enrichedBootedDevices.map((device) => device.name));
  const availableAvds = await emulator.listAvdsAsync();

  const offlineEmulators = availableAvds
    .filter(({ name }) => !connectedNames.has(name))
    .map((device) => ({
      ...device,
      aliases: [device.name],
    }));

  return [...enrichedBootedDevices, ...offlineEmulators];
}

async function ensureDeviceManagerAsync(initialDevice) {
  const manager = new AndroidDeviceManager(initialDevice);
  const devices = await getPatchedDevicesAsync();
  const connectedDevice = devices.find((device) => {
    if (!device.pid || !initialDevice.pid) {
      return false;
    }

    return device.pid === initialDevice.pid;
  });

  if (connectedDevice) {
    manager.device = connectedDevice;

    if (connectedDevice.isAuthorized === false) {
      throw new AbortCommandError();
    }

    return manager;
  }

  if (initialDevice.type === 'emulator') {
    manager.device = await emulator.startDeviceAsync(initialDevice);

    if (manager.device.isAuthorized === false) {
      throw new AbortCommandError();
    }

    return manager;
  }

  if (!(await manager.attemptToStartAsync())) {
    throw new AbortCommandError();
  }

  return manager;
}

function matchesAlias(device, target) {
  const normalizedTarget = target.trim().toLowerCase();

  return device.aliases.some((alias) => alias.trim().toLowerCase() === normalizedTarget);
}

function formatDeviceList(devices) {
  return devices
    .map((device) => {
      const aliases = device.aliases.filter((alias) => alias !== device.name);
      const aliasSuffix = aliases.length ? ` [aliases: ${aliases.join(', ')}]` : '';
      return `- ${device.name} (${device.type})${aliasSuffix}`;
    })
    .join('\n');
}

async function resolveDeviceFromAliasAsync(target) {
  const devices = await getPatchedDevicesAsync();
  const matches = devices.filter((device) => matchesAlias(device, target));

  if (matches.length === 1) {
    return matches[0];
  }

  if (matches.length > 1) {
    throw new CommandError(
      'ANDROID_DEVICE_AMBIGUOUS',
      `Device identifier "${target}" matched multiple Android devices.\n${formatDeviceList(matches)}`,
    );
  }

  throw new CommandError(
    'ANDROID_DEVICE_NOT_FOUND',
    `Could not find Android device "${target}". Available devices:\n${formatDeviceList(devices)}`,
  );
}

async function main() {
  const { help, device, extraArgs } = parseArgs(process.argv.slice(2));

  if (help) {
    printHelp();
    return;
  }

  if (extraArgs.length > 0) {
    throw new CommandError(
      'INVALID_ARGS',
      `Unsupported arguments: ${extraArgs.join(' ')}\nUse an optional device name/serial only.`,
    );
  }

  AndroidDeviceManager.resolveAsync = async ({ device: initialDevice, shouldPrompt } = {}) => {
    if (initialDevice) {
      return ensureDeviceManagerAsync(initialDevice);
    }

    const devices = await getPatchedDevicesAsync();
    const selectedDevice = shouldPrompt ? await promptForDeviceAsync(devices) : devices[0];

    return AndroidDeviceManager.resolveAsync({
      device: selectedDevice,
      shouldPrompt: false,
    });
  };

  AndroidDeviceManager.resolveFromNameAsync = async (name) => {
    const resolvedDevice = await resolveDeviceFromAliasAsync(name);
    return AndroidDeviceManager.resolveAsync({
      device: resolvedDevice,
      shouldPrompt: false,
    });
  };

  await runAndroidAsync(projectRoot, {
    install: false,
    device,
  });
}

main().catch((error) => {
  console.error(formatThrownError(error));
  process.exit(1);
});
