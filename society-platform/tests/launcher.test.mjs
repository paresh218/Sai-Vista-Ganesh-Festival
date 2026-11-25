import { test } from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { mkdtemp, readFile, rmdir, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assertPortsFree, claimLauncher, parseMode, startSolution, waitUntil } from '../scripts/launcher-core.mjs';

test('default launcher starts full local mode; demo, no-open and unsupported native options are explicit', () => {
  assert.deepEqual(parseMode([]), { mode: 'emulator', open: true, help: false, port: 5173 });
  assert.deepEqual(parseMode(['--demo', '--no-open']), { mode: 'demo', open: false, help: false, port: 5173 });
  assert.equal(parseMode(['--help']).help, true);
  assert.throws(() => parseMode(['--ios']), /macOS and Xcode/);
  assert.throws(() => parseMode(['--android']), /not implemented/);
  assert.throws(() => parseMode(['--project=production']), /Unknown option/);
  assert.equal(parseMode(['--port=5180']).port, 5180);
  for (const value of ['0', '65536', '9099', '8085']) assert.throws(() => parseMode([`--port=${value}`]), /web port/);
  assert.throws(() => parseMode(['--port=5180', '--port=5181']), /web port/);
});

function fakeServices(failingStep) {
  const calls = [];
  const services = Object.fromEntries(['prerequisites', 'ports', 'dependencies', 'startEmulators', 'emulatorsReady', 'seed', 'startWeb', 'webReady', 'ready', 'untilStopped'].map(step => [step, async () => {
    calls.push(step);
    if (step === failingStep) throw new Error(`Failure at ${step}`);
    return step;
  }]));
  services.stop = async service => { calls.push(`stop:${service}`); };
  return { services, calls };
}

test('full startup waits for readiness before seeding/web startup and cleans up owned services in reverse order', async () => {
  const { services, calls } = fakeServices();
  await startSolution({ mode: 'emulator' }, services);
  assert.deepEqual(calls, ['prerequisites', 'ports', 'dependencies', 'startEmulators', 'emulatorsReady', 'seed', 'startWeb', 'webReady', 'ready', 'untilStopped', 'stop:startWeb', 'stop:startEmulators']);
});

test('demo mode never starts, seeds or stops a backend', async () => {
  const { services, calls } = fakeServices();
  await startSolution({ mode: 'demo' }, services);
  assert.deepEqual(calls, ['prerequisites', 'ports', 'dependencies', 'startWeb', 'webReady', 'ready', 'untilStopped', 'stop:startWeb']);
});

for (const step of ['prerequisites', 'ports', 'dependencies', 'startEmulators', 'emulatorsReady', 'seed', 'startWeb', 'webReady', 'ready', 'untilStopped']) {
  test(`startup failure at ${step} stops only services already started`, async () => {
    const { services, calls } = fakeServices(step);
    await assert.rejects(startSolution({ mode: 'emulator' }, services), new RegExp(`Failure at ${step}`));
    const completed = calls.slice(0, calls.indexOf(step));
    const expected = ['startWeb', 'startEmulators'].filter(name => completed.includes(name)).map(name => `stop:${name}`);
    assert.deepEqual(calls.filter(name => name.startsWith('stop:')), expected);
    assert.equal(calls.filter(name => name === 'seed').length <= 1, true);
  });
}

test('occupied ports produce a conflict without closing the existing service', async () => {
  const server = net.createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  try {
    await assert.rejects(assertPortsFree([port]), /already in use/);
    assert.equal(server.listening, true);
  } finally { await new Promise(resolve => server.close(resolve)); }
  await assertPortsFree([port]);
});

test('readiness retries, times out, and responds to cancellation', async () => {
  let attempts = 0;
  await waitUntil(async () => ++attempts === 2, { intervalMs: 1, timeoutMs: 500 });
  assert.equal(attempts, 2);
  await assert.rejects(waitUntil(async () => false, { timeoutMs: 10, intervalMs: 1 }), /did not become ready/);
  const cancellation = new AbortController();
  cancellation.abort();
  await assert.rejects(waitUntil(async () => false, { signal: cancellation.signal }), /cancelled/);
});

test('repeat launch reuses only its own healthy session and leaves the lock unchanged', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'society-launcher-'));
  const lock = join(directory, 'launcher.lock');
  const info = { pid: 123, root: 'C:/a path with spaces/platform', mode: 'emulator', port: 5180 };
  const checks = { isAlive: () => true, isReady: async () => true };
  try {
    assert.equal(await claimLauncher(lock, info, checks), true);
    assert.equal(await claimLauncher(lock, { ...info, pid: 456 }, checks), false);
    assert.deepEqual(JSON.parse(await readFile(lock, 'utf8')), info);
    await assert.rejects(claimLauncher(lock, { ...info, mode: 'demo' }, checks), /Another launcher/);
    await assert.rejects(claimLauncher(lock, { ...info, root: 'other-project' }, checks), /Another launcher/);
    await assert.rejects(claimLauncher(lock, info, { ...checks, isReady: async () => false }), /Another launcher/);
  } finally { await unlink(lock).catch(() => {}); await rmdir(directory); }
});

test('a dead launcher lock can be replaced; an incomplete live lock fails closed', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'society-launcher-'));
  const lock = join(directory, 'launcher.lock');
  const info = { pid: 456, root: 'local', mode: 'emulator', port: 5173 };
  try {
    await writeFile(lock, JSON.stringify({ ...info, pid: 123 }));
    assert.equal(await claimLauncher(lock, info, { isAlive: () => false, isReady: async () => false }), true);
    assert.deepEqual(JSON.parse(await readFile(lock, 'utf8')), info);
    await writeFile(lock, '');
    await assert.rejects(claimLauncher(lock, info, { isAlive: () => true, isReady: async () => true }), /lock is unreadable/);
  } finally { await unlink(lock).catch(() => {}); await rmdir(directory); }
});
