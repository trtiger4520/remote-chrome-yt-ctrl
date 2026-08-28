import { spawn } from 'node:child_process';

const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const copy = spawn(process.execPath, ['scripts/copy-extension.mjs'], { stdio: 'inherit' });
await new Promise((resolve, reject) => {
  copy.once('error', reject);
  copy.once('exit', (code) => (code === 0 ? resolve() : reject(new Error(`Initial copy exited with code ${code}`))));
});

const watchers = ['build:background', 'build:content'].map((script) => {
  if (process.platform === 'win32') {
    return spawn(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', `${pnpm} run ${script} --watch`], {
      stdio: 'inherit',
      windowsHide: true,
    });
  }
  return spawn(pnpm, ['run', script, '--watch'], { stdio: 'inherit' });
});
let stopping = false;

function stop(code) {
  if (stopping) return;
  stopping = true;
  for (const watcher of watchers) watcher.kill();
  process.exitCode = code;
}

for (const watcher of watchers) {
  watcher.once('error', () => stop(1));
  watcher.once('exit', (code) => stop(code ?? 1));
}
process.once('SIGINT', () => stop(0));
process.once('SIGTERM', () => stop(0));
