import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const repoRoot = process.cwd();
const rootsToScan = ['apps', 'infrastructure'];
const extraFilesToScan = ['tsconfig.base.json'];
const allowedPrefixes = ['@gatherle/commons/client', '@gatherle/commons/server'];
const scanExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json']);
const ignoredDirNames = new Set(['node_modules', 'dist', 'coverage', '.next', '.expo', 'cdk.out', 'build']);
const ignoredFileNames = new Set(['package.json', 'package-lock.json']);
const ignoredFileNamePatterns = [/^eslint\.config\./u, /^\.eslintrc/u];

async function walk(dirPath) {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (ignoredDirNames.has(entry.name)) {
      continue;
    }

    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(entryPath)));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (ignoredFileNames.has(entry.name)) {
      continue;
    }

    if (ignoredFileNamePatterns.some((pattern) => pattern.test(entry.name))) {
      continue;
    }

    if (!scanExtensions.has(path.extname(entry.name))) {
      continue;
    }

    files.push(entryPath);
  }

  return files;
}

function findViolations(relativePath, contents) {
  const violations = [];
  const lines = contents.split(/\r?\n/u);

  lines.forEach((line, index) => {
    if (!line.includes('@gatherle/commons')) {
      return;
    }

    const matches = line.match(/@gatherle\/commons(?:\/[A-Za-z0-9._/-]+)?/gu) ?? [];
    const disallowedMatches = matches.filter(
      (match) =>
        !allowedPrefixes.some((allowedPrefix) => match === allowedPrefix || match.startsWith(`${allowedPrefix}/`)),
    );

    if (disallowedMatches.length === 0) {
      return;
    }

    violations.push({
      file: relativePath,
      line: index + 1,
      matches: Array.from(new Set(disallowedMatches)).join(', '),
    });
  });

  return violations;
}

async function main() {
  const scanFiles = [...extraFilesToScan.map((file) => path.join(repoRoot, file))];

  for (const root of rootsToScan) {
    const absoluteRoot = path.join(repoRoot, root);
    const rootStats = await stat(absoluteRoot);
    if (!rootStats.isDirectory()) {
      continue;
    }

    scanFiles.push(...(await walk(absoluteRoot)));
  }

  const violations = [];

  for (const absolutePath of scanFiles) {
    const contents = await readFile(absolutePath, 'utf8');
    const relativePath = path.relative(repoRoot, absolutePath);
    violations.push(...findViolations(relativePath, contents));
  }

  if (violations.length === 0) {
    return;
  }

  console.error('Legacy @gatherle/commons imports or path aliases are not allowed outside packages/commons.');
  for (const violation of violations) {
    console.error(`${violation.file}:${violation.line} -> ${violation.matches}`);
  }
  process.exitCode = 1;
}

await main();
