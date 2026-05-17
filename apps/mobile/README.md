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

## Environment Variables

The mobile app primarily uses:

```bash
EXPO_PUBLIC_GRAPHQL_URL=
EXPO_PUBLIC_WEBSOCKET_URL=
```

For local development, create `apps/mobile/.env`:

```bash
EXPO_PUBLIC_GRAPHQL_URL=http://localhost:9000/v1/graphql
EXPO_PUBLIC_WEBSOCKET_URL=ws://localhost:9000/local
```

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
- with `adb reverse`, `localhost:9000` on the phone are forwarded back to your laptop

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
adb -s <phone-ip>:<connect-port> reverse tcp:3001 tcp:3001
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
