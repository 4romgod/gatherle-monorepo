# Gatherle Mobile

Expo React Native app for Gatherle.

## Development

From the repository root:

```bash
npm run dev:mobile
```

Set the GraphQL endpoint with `EXPO_PUBLIC_GRAPHQL_URL`.

For local development, create `apps/mobile/.env.local`:

```bash
EXPO_PUBLIC_GRAPHQL_URL=http://192.168.1.10:9000/v1/graphql
```

For iOS/Android devices, `localhost` points at the device, not your laptop. Use your machine's LAN IP when testing
against a local API server from Expo Go.

```bash
EXPO_PUBLIC_GRAPHQL_URL=http://192.168.1.10:9000/v1/graphql npm run dev:mobile
```

When you run the Expo web preview, local/LAN GraphQL URLs such as `http://192.168.x.x:9000/v1/graphql` will usually fail
on browser CORS unless the API explicitly allows that origin. The mobile app now falls back to the public beta GraphQL
endpoint on `react-native-web` in that case, while native iOS/Android builds can still use the local API URL.

## GraphQL Codegen

The mobile app mirrors the webapp's codegen strategy:

- Use `packages/commons/schema.graphql` when it exists.
- Fall back to `EXPO_PUBLIC_GRAPHQL_URL` when the schema file is not present.

Generate the schema and mobile types with:

```bash
npm run emit-schema -w @gatherle/api
npm run codegen -w @gatherle/mobile
```
