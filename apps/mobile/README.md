# Gatherle Mobile

Expo React Native app for Gatherle.

## Development

From the repository root:

```bash
npm run dev:mobile
```

Or directly from this workspace:

```bash
npm run start
```

These `start*` scripts now target a native Gatherle development build, not Expo Go. Install a dev build first:

- Android: `npm run android`
- iPhone from WSL/Linux: `eas build --platform ios --profile development`

After the dev build is installed, `npm run start`, `npm run start:lan`, and `npm run start:tunnel` will connect that
installed app to Metro with fast refresh.

## APK Build And Install

Generate a local Android release APK from this workspace:

```bash
npm run apk:release
```

That script:

- runs Expo prebuild without reinstalling dependencies
- matches the GitHub CI release path for Android
- builds an `arm64-v8a` Android release APK with Gradle for sideloading on modern 64-bit ARM phones

The generated APK will be at:

```bash
apps/mobile/android/app/build/outputs/apk/release/app-release.apk
```

Or, from inside this workspace:

```bash
android/app/build/outputs/apk/release/app-release.apk
```

Install it with:

```bash
npm run apk:install
```

If more than one Android device/emulator is connected, target one explicitly with `ANDROID_SERIAL`:

```bash
ANDROID_SERIAL=<device-id> npm run apk:install
```

Examples:

```bash
ANDROID_SERIAL=emulator-5554 npm run apk:install
ANDROID_SERIAL=<phone-ip>:<connect-port> npm run apk:install
```

You can find available device IDs with:

```bash
adb devices
```

If Android rejects the install with a version downgrade error, uninstall the existing app first:

```bash
adb -s <device-id> uninstall com.gatherle.mobile
ANDROID_SERIAL=<device-id> npm run apk:install
```

Notes:

- the release APK has the JavaScript bundle embedded, so it does not depend on the Expo dev server
- `android` still builds a development client for local development, but the repo script now prepares the same release
  keystore used by `apk:release` before installing it
- `npm run android` and `npm run apk:release` now share the same signing key when release credentials are configured, so
  Android Google OAuth only needs one active package/SHA registration for the repo-managed build path
- run `npm run android:oauth:doctor` to print the package name and the SHA1 fingerprint used by the repo-managed Android
  build scripts
- once native dependencies or native config change, rebuild the dev client before using the `start*` scripts again

## Environment Variables

The mobile app primarily uses:

```bash
EXPO_PUBLIC_GRAPHQL_URL=
EXPO_PUBLIC_WEBSOCKET_URL=
EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID_WEB=
EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID_IOS=
EXPO_PUBLIC_WEBAPP_URL=
EXPO_PUBLIC_ENABLE_PRIVATE_USERS=
```

For local development, create `apps/mobile/.env`:

```bash
EXPO_PUBLIC_GRAPHQL_URL=http://localhost:9000/v1/graphql
EXPO_PUBLIC_WEBSOCKET_URL=ws://localhost:9000/local
EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID_WEB=<google-web-client-id>
EXPO_PUBLIC_WEBAPP_URL=https://beta.gatherle.com
```

`EXPO_PUBLIC_ENABLE_PRIVATE_USERS` is optional and defaults to disabled. Set it to `true` only when testing the
private-user privacy controls and follow-request review flow.

For Google sign-in:

- Android native builds require `EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID_WEB`
- iOS native builds require both `EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID_WEB` and `EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID_IOS`
- The Android OAuth client still matters in Google Cloud Console, but it is identified by package name + signing SHA and
  is not read from a public Expo env var at runtime
- If Android returns `DEVELOPER_ERROR`, run `npm run android:oauth:doctor` and make sure the registered Android OAuth
  client uses package `com.gatherle.mobile` with the repo signing SHA1 reported for `npm run android` and
  `npm run apk:release`

For Android Firebase / push setup:

- local Android dev build: put `google-services.json` at `apps/mobile/google-services.json`
- EAS Android preview/production builds: upload that same file to EAS as a file env var named `GOOGLE_SERVICES_JSON`
- GitHub CI Android APK builds: store that same file as `ANDROID_GOOGLE_SERVICES_JSON_BASE64`
- if you keep the file elsewhere locally, set `EXPO_ANDROID_GOOGLE_SERVICES_FILE=/absolute/or/relative/path`
- `npm run android`, `npm run apk:release`, and `npm run native:sync*` now prepare that Firebase file before prebuild

This project keeps one Android package name, `com.gatherle.mobile`, across local dev, EAS preview/production, and the
CI-built release APK, so the same `google-services.json` works across all of those build paths.

For iOS push setup:

- iOS uses Expo push tokens in the app and Expo Push Service on the backend path; there is no `GoogleService-Info.plist`
  or Firebase client file for iOS in the current implementation
- configure APNs push credentials for `com.gatherle.mobile` in EAS before testing on a real iPhone
- use EAS development / preview / production builds for iOS; the app already uses the same Expo project ID across those
  environments
- remote push notifications must be tested on a physical iPhone, not the iOS Simulator
- after installing the build, enable `Push notifications` in Gatherle Settings, background the app, then trigger a
  supported notification type such as `FOLLOW_REQUEST` or `ORG_INVITE`

For Apple sign-in:

- iOS uses the native `expo-apple-authentication` module, so rebuild the iOS dev client or release build after pulling
  this change before testing Apple sign-in
- Android uses Apple’s browser-based web flow and returns to the app through `gatherle://auth/apple`
- Set `EXPO_PUBLIC_WEBAPP_URL` to a real HTTPS Gatherle host that is registered in the Apple Services ID return URLs,
  for example `https://beta.gatherle.com`
- The webapp callback bridge route is `/auth/mobile/apple/callback`, so the matching Apple return URL looks like
  `https://beta.gatherle.com/auth/mobile/apple/callback`
- There is no mobile Apple client ID env var; Android reuses the fixed Apple Services ID `com.gatherle.web`, while
  native iOS uses the app bundle ID `com.gatherle.mobile`

Important: on a physical phone, `localhost` normally means the phone itself, not your laptop. The exception is the
Android `adb reverse` flow documented below.

## Physical Phone + Local API

### Recommended For Android: Wireless `adb reverse`

If you are testing on a real Android phone and your API is running locally on your laptop, this is the cleanest setup.
It lets the phone use `localhost` while actually reaching the laptop's API and websocket server.

1. Start the local API from the repo root:

```bash
npm run dev:api
```

2. Pair your phone with `adb` wirelessly if it is not already paired.

On the phone, enable wireless debugging in Developer Options, then use the pairing details shown on the phone:

```bash
adb pair <phone-ip>:<pair-port>
```

You will be prompted for the pairing code displayed on the phone.

3. Connect the phone to the wireless `adb` session:

```bash
adb connect <phone-ip>:<connect-port>
```

4. Make sure the phone is visible to `adb`:

```bash
adb devices
```

Example output:

```bash
List of devices attached
<phone-ip>:<connect-port> device
```

5. Reverse the GraphQL and websocket ports to that device:

```bash
adb -s <phone-ip>:<connect-port> reverse tcp:9000 tcp:9000
```

6. Start Expo from this workspace:

```bash
npm run start
```

7. Open the app on the phone.

With that setup, these local values work correctly on the device:

```bash
EXPO_PUBLIC_GRAPHQL_URL=http://localhost:9000/v1/graphql
EXPO_PUBLIC_WEBSOCKET_URL=ws://localhost:9000/local
```

Why this works:

- without port reversal, `localhost` on the phone points to the phone
- with `adb reverse`, `localhost:9000` on the phone is forwarded back to your laptop

This is Android-only. iPhone does not support `adb reverse`.

### Alternative: Use Your Laptop's LAN IP

If you do not want to rely on `adb reverse`, or you are testing on iPhone, use your laptop's local network IP instead.

1. Find your laptop IP:

```bash
hostname -I
```

2. Set the mobile env vars to your laptop IP:

```bash
EXPO_PUBLIC_GRAPHQL_URL=http://<laptop-ip>:9000/v1/graphql
EXPO_PUBLIC_WEBSOCKET_URL=ws://<laptop-ip>:9000/local
```

3. Start Expo:

```bash
npm run start:lan
```

Requirements for the LAN-IP approach:

- phone and laptop must be on the same Wi-Fi network
- the API must listen on `0.0.0.0`, not only `127.0.0.1`
- local firewall rules must allow the API and websocket ports

## Expo Web Note

When you run the Expo web preview, local or LAN GraphQL URLs such as `http://192.168.x.x:9000/v1/graphql` will usually
fail on browser CORS unless the API explicitly allows that origin. Native iOS and Android builds can still use those
local URLs.

## Troubleshooting

### The phone can open the Expo app, but API requests fail

Check that one of these is true:

- you are using Android and `adb reverse` is active
- or you are using a LAN IP that the phone can reach

Useful checks:

```bash
adb devices
adb -s <phone-ip>:<connect-port> reverse --list
```

### `adb reverse` command fails

Make sure the device selector comes before `reverse`:

```bash
adb -s <phone-ip>:<connect-port> reverse tcp:9000 tcp:9000
```

Not:

```bash
adb reverse tcp:9000 tcp:9000 -s 192.168.0.5:39243
```

### More than one device/emulator is connected

Target the phone explicitly in `adb` commands:

```bash
adb devices
adb -s <phone-ip>:<connect-port> reverse tcp:9000 tcp:9000
adb -s <phone-ip>:<connect-port> reverse --list
```

### The websocket works on beta but not locally

Make sure the local websocket server is actually running on the port used by `EXPO_PUBLIC_WEBSOCKET_URL`.

## GraphQL Codegen

The mobile app mirrors the webapp's codegen strategy:

- use `packages/commons/schema.graphql` when it exists
- fall back to `EXPO_PUBLIC_GRAPHQL_URL` when the schema file is not present

Generate the schema and mobile types with:

```bash
npm run emit-schema -w @gatherle/api
npm run codegen -w @gatherle/mobile
```
