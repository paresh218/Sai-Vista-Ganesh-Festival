import net from 'node:net';
import { open, readFile, unlink } from 'node:fs/promises';

export async function claimLauncher(lockPath, info, { isAlive, isReady }) {
  let handle;
  try { handle = await open(lockPath, 'wx'); }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    let previous;
    try { previous = JSON.parse(await readFile(lockPath, 'utf8')); }
    catch { throw new Error('Another launcher is starting or its lock is unreadable. Check the original terminal before retrying.'); }
    if (!Number.isInteger(previous.pid)) throw new Error('Launcher lock has no valid process identity. Check the original terminal before retrying.');
    if (isAlive(previous.pid)) {
      if (previous.root === info.root && previous.mode === info.mode && previous.port === info.port && await isReady()) return false;
      throw new Error('Another launcher is starting or running. Use its existing terminal; no duplicate services were started.');
    }
    await unlink(lockPath);
    handle = await open(lockPath, 'wx');
  }
  try { await handle.writeFile(JSON.stringify(info)); }
  finally { await handle.close(); }
  return true;
}

export function parseMode(args) {
  const allowed = new Set(['--demo', '--no-open', '--help', '--android', '--ios']);
  if (args.some(arg => !allowed.has(arg) && !/^--port=\d+$/.test(arg))) throw new Error('Unknown option. Use run-local.cmd --help.');
  if (args.includes('--android')) throw new Error('Android project is not implemented yet (S10). Use the shared web preview for now.');
  if (args.includes('--ios')) throw new Error('iOS project is not implemented yet (S10). Local iOS builds require macOS and Xcode.');
  const ports = args.filter(arg => arg.startsWith('--port='));
  const port = ports.length ? Number(ports[0].slice(7)) : 5173;
  if (ports.length > 1 || port < 1024 || port > 65535 || [8085, 9099, 4400, 4500, 9150].includes(port)) throw new Error('Choose one web port between 1024 and 65535 that is not reserved for Firebase.');
  return { mode: args.includes('--demo') ? 'demo' : 'emulator', open: !args.includes('--no-open'), help: args.includes('--help'), port };
}

export async function assertPortsFree(ports) {
  for (const port of ports) {
    await new Promise((resolve, reject) => {
      const server = net.createServer();
      server.once('error', () => reject(new Error(`Port ${port} is already in use. Stop the other local service or reuse its terminal; no process was stopped.`)));
      server.listen(port, '127.0.0.1', () => server.close(resolve));
    });
  }
}

export async function waitUntil(check, { timeoutMs = 90000, intervalMs = 300, signal } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (signal?.aborted) throw new Error('Startup cancelled.');
    if (await check()) return;
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  throw new Error('Local service did not become ready in time. Check the launcher logs.');
}

// Dependencies are passed explicitly so startup/failure/cleanup can be regression-tested without touching real services.
export async function startSolution(config, services) {
  const owned = [];
  try {
    await services.prerequisites(config.mode);
    await services.ports(config.mode);
    await services.dependencies();
    if (config.mode === 'emulator') {
      owned.push(await services.startEmulators());
      await services.emulatorsReady();
      await services.seed();
    }
    owned.push(await services.startWeb(config.mode));
    await services.webReady();
    await services.ready(config);
    await services.untilStopped();
  } finally {
    for (const service of owned.reverse()) await services.stop(service);
  }
}
