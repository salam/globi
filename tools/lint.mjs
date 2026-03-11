import { readdir, stat } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';

const execFileAsync = promisify(execFile);
const ROOT = process.cwd();
const TARGET_DIRS = ['src', 'tests', 'editor', 'tools'];
const fileList = [];

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(fullPath);
      continue;
    }
    if (entry.isFile() && /\.(mjs|js)$/.test(entry.name)) {
      fileList.push(fullPath);
    }
  }
}

for (const dir of TARGET_DIRS) {
  const absolute = path.join(ROOT, dir);
  try {
    const info = await stat(absolute);
    if (info.isDirectory()) {
      await walk(absolute);
    }
  } catch {
    // Skip missing dirs.
  }
}

if (fileList.length === 0) {
  console.log('No JS files found to lint.');
  process.exit(0);
}

for (const file of fileList) {
  await execFileAsync(process.execPath, ['--check', file]);
}

console.log(`Syntax check passed for ${fileList.length} files.`);
