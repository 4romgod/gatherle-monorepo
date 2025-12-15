const {spawnSync} = require('child_process');
const {resolve} = require('path');
const {exit, env, cwd} = require('process');

const schemaUrl = env.NEXT_PUBLIC_GRAPHQL_URL;
if (!schemaUrl) {
  console.warn('Skipping GraphQL codegen because NEXT_PUBLIC_GRAPHQL_URL is not set');
  exit(0);
}

const codegenPath = resolve(cwd(), 'node_modules', '.bin', 'graphql-codegen');
const result = spawnSync(codegenPath, ['--config', 'codegen.ts'], {stdio: 'inherit'});

if (result.error) {
  console.error('Failed to run graphql-codegen', result.error);
  exit(1);
}

if (result.status !== 0) {
  exit(result.status);
}
