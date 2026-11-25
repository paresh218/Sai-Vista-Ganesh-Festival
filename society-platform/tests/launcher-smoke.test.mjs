import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fork, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import net from 'node:net';
import { assertPortsFree, waitUntil } from '../scripts/launcher-core.mjs';

test('real launcher starts from another directory, reuses a repeat launch and cleans up on stop', { timeout: 90000 }, async () => {
  const probe = net.createServer();
  await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  const args = ['--demo', '--no-open', `--port=${port}`];
  const child = fork(fileURLToPath(new URL('./fixtures/launcher-process.mjs', import.meta.url)), args, { cwd: tmpdir(), silent: true, windowsHide: true });
  let output = '';
  child.stdout.on('data', data => { output = (output + data).slice(-12000); });
  child.stderr.on('data', data => { output = (output + data).slice(-12000); });
  const closed = once(child, 'exit');
  try {
    await waitUntil(async () => {
      if (child.exitCode !== null) throw new Error(output);
      return output.includes(`Ready: http://127.0.0.1:${port}/`);
    }, { timeoutMs: 60000, intervalMs: 100 });
    const response = await fetch(`http://127.0.0.1:${port}/`);
    assert.ok(response.ok);
    assert.match(await response.text(), /society-platform-local/);
    const lock = fileURLToPath(new URL('../.local/launcher.lock', import.meta.url));
    const firstLock = await readFile(lock, 'utf8');
    const before = (await stat(lock)).mtimeMs;
    const repeated = await promisify(execFile)(process.execPath, [fileURLToPath(new URL('../scripts/run-local.mjs', import.meta.url)), ...args], { cwd: tmpdir(), windowsHide: true });
    assert.match(repeated.stdout, /already running/);
    assert.equal(await readFile(lock, 'utf8'), firstLock);
    assert.equal((await stat(lock)).mtimeMs, before);
  } finally {
    if (child.exitCode === null) child.send('stop');
    const [code] = await closed;
    assert.equal(code, 0, output);
  }
  await assertPortsFree([port]);
});
