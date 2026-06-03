#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { SignJWT, importPKCS8 } from 'jose';

const MAX_EXPIRY_SECONDS = 15777000;
const DEFAULT_EXPIRY_SECONDS = 60 * 60 * 24 * 180;
const APPLE_OAUTH_CLIENT_ID_WEB = 'com.gatherle.web';

const usage = `Generate an Apple OAuth client secret JWT for NextAuth.

Usage:
  npm run apple:oauth:client-secret -- \\
    --key-file /path/to/AuthKey_ABC123DEFG.p8 \\
    --team-id TEAMID1234 \\
    --key-id ABC123DEFG

Options:
  --key-file <path>            Path to the downloaded Sign in with Apple .p8 private key.
  --team-id <value>            Apple Developer Team ID.
  --key-id <value>             Apple Sign in with Apple key ID (kid).
  --expires-in-seconds <secs>  Optional TTL. Must be <= 15777000. Defaults to 15552000 (180 days).
  --env                        Print APPLE_OAUTH_CLIENT_SECRET_WEB=<token> instead of the token only.
  --help                       Show this message.

Environment fallbacks:
  APPLE_OAUTH_PRIVATE_KEY_PATH
  APPLE_DEVELOPER_TEAM_ID
  APPLE_OAUTH_KEY_ID
  APPLE_OAUTH_CLIENT_SECRET_TTL_SECONDS
`;

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

const parseArgs = (argv) => {
  const args = {
    env: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case '--key-file':
        args.keyFile = argv[index + 1];
        index += 1;
        break;
      case '--team-id':
        args.teamId = argv[index + 1];
        index += 1;
        break;
      case '--key-id':
        args.keyId = argv[index + 1];
        index += 1;
        break;
      case '--expires-in-seconds':
        args.expiresInSeconds = argv[index + 1];
        index += 1;
        break;
      case '--env':
        args.env = true;
        break;
      case '--help':
      case '-h':
        args.help = true;
        break;
      default:
        fail(`Unknown argument: ${arg}\n\n${usage}`);
    }
  }

  return args;
};

const requireValue = (value, label) => {
  if (typeof value !== 'string' || !value.trim()) {
    fail(`Missing required value: ${label}\n\n${usage}`);
  }
  return value.trim();
};

const parseExpirySeconds = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    fail('Invalid Apple OAuth client secret TTL. Provide a positive integer number of seconds.');
  }
  if (parsed > MAX_EXPIRY_SECONDS) {
    fail(`Apple client secret expiry must be <= ${MAX_EXPIRY_SECONDS} seconds (about 6 months).`);
  }
  return parsed;
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(`${usage}\n`);
    return;
  }

  const keyFile = requireValue(args.keyFile ?? process.env.APPLE_OAUTH_PRIVATE_KEY_PATH, '--key-file');
  const teamId = requireValue(args.teamId ?? process.env.APPLE_DEVELOPER_TEAM_ID, '--team-id');
  const keyId = requireValue(args.keyId ?? process.env.APPLE_OAUTH_KEY_ID, '--key-id');
  const expiresInSeconds = parseExpirySeconds(
    args.expiresInSeconds ?? process.env.APPLE_OAUTH_CLIENT_SECRET_TTL_SECONDS ?? `${DEFAULT_EXPIRY_SECONDS}`,
  );

  let privateKeyPem;
  try {
    privateKeyPem = await readFile(resolve(keyFile), 'utf8');
  } catch (error) {
    fail(`Failed to read key file at ${keyFile}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + expiresInSeconds;

  try {
    const privateKey = await importPKCS8(privateKeyPem, 'ES256');
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'ES256', kid: keyId })
      .setIssuer(teamId)
      .setSubject(APPLE_OAUTH_CLIENT_ID_WEB)
      .setAudience('https://appleid.apple.com')
      .setIssuedAt(issuedAt)
      .setExpirationTime(expiresAt)
      .sign(privateKey);

    process.stdout.write(args.env ? `APPLE_OAUTH_CLIENT_SECRET_WEB=${token}\n` : `${token}\n`);
  } catch (error) {
    fail(`Failed to generate Apple OAuth client secret: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

await main();
