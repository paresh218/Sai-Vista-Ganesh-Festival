import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { access, open, readFile, readdir, stat, unlink, mkdir } from 'node:fs/promises';
import { constants } from 'node:fs';
import { assertPortsFree, claimLauncher, parseMode, startSolution, waitUntil } from './launcher-core.mjs';

const execute = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const local = join(root, '.local');
const projectId = 'demo-society-platform';
const exists = async path => access(path, constants.F_OK).then(() => true, () => false);
const alive = pid => { try { process.kill(pid, 0); return true; } catch { return false; } };
const getJson = async url => {
  try { const response = await fetch(url, { signal: AbortSignal.timeout(1500) }); return response.ok ? response.json() : null; } catch { return null; }
};

async function findJava(env) {
  const directories = await readdir(join(root, '.tools'), { withFileTypes: true }).catch(() => []);
  const suffix = process.platform === 'win32' ? 'java.exe' : 'java';
  const candidates = directories.filter(entry => entry.isDirectory() && /jre|jdk/i.test(entry.name)).map(entry => join(root, '.tools', entry.name, 'bin', suffix));
  candidates.push('java');
  for (const command of candidates) {
    try {
      const output = await execute(command, ['-version'], { env, windowsHide: true });
      const major = Number((output.stderr + output.stdout).match(/version "(\d+)/)?.[1]);
      if (major >= 21) {
        if (command !== 'java') env.PATH = `${dirname(command)}${process.platform === 'win32' ? ';' : ':'}${env.PATH ?? ''}`;
        return;
      }
    } catch { /* Try the next local runtime. */ }
  }
  throw new Error('Java 21+ is required for Firebase. Put a runtime in .tools or install Java 21+. Demo mode works with run-local.cmd --demo.');
}

async function npmCommand(env) {
  const candidates = [process.env.npm_execpath, join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js')].filter(Boolean);
  if (process.platform !== 'win32') {
    try { candidates.push((await execute('which', ['npm'])).stdout.trim()); } catch { /* Explain missing npm below. */ }
  }
  for (const command of candidates) if (await exists(command)) return command;
  throw new Error('npm is missing from this Node.js installation. Reinstall the supported Node.js distribution.');
}

async function webReady(webUrl) {
  try {
    const response = await fetch(webUrl, { signal: AbortSignal.timeout(1500) });
    return response.ok && (await response.text()).includes('name="society-platform-local"');
  } catch { return false; }
}

export async function main(args = process.argv.slice(2)) {
  const config = parseMode(args);
  const webUrl = `http://127.0.0.1:${config.port}/`;
  if (config.help) {
    console.log('run-local.cmd [--demo] [--no-open] [--port=5173]\nDefault: start Firebase Auth/Firestore, synthetic fixtures and web app.\n--demo: web preview only. Ctrl+C stops only services started by this launcher.\nAndroid/iOS native projects are pending S10. No deployment or billing actions.');
    return;
  }
  await mkdir(local, { recursive: true });
  const lockPath = join(local, 'launcher.lock');
  const acquired = await claimLauncher(lockPath, { pid: process.pid, root, mode: config.mode, port: config.port }, { isAlive: alive, isReady: () => webReady(webUrl) });
  if (!acquired) {
    console.log(`This project's ${config.mode} solution is already running at ${webUrl}\nUse Ctrl+C in its original launcher window to stop it. No services were restarted or reseeded.`);
    return;
  }
  const env = { ...process.env, FIREBASE_EMULATORS_PATH: join(root, '.tools', 'firebase-emulators'), FIREBASE_CLI_DISABLE_UPDATE_CHECK: 'true' };
  const controller = new AbortController();
  let stopResolve;
  const stopped = new Promise(resolveStop => { stopResolve = resolveStop; });
  const stop = () => { controller.abort(); stopResolve(); for (const child of children) void stopChild(child); };
  process.once('SIGINT', stop); process.once('SIGTERM', stop);
  let npm;
  let failure;
  const children = [];
  const stopping = new Map();

  async function command(name, executable, arguments_, service = false) {
    const logPath = join(local, `${name}.log`);
    const log = await open(logPath, 'w');
    const child = spawn(executable, arguments_, { cwd: root, env, windowsHide: true, stdio: ['ignore', log.fd, log.fd] });
    await log.close();
    children.push(child);
    if (service) {
      child.once('error', error => { failure = new Error(`${name}: ${error.message}. See ${logPath}`); stop(); });
      child.once('exit', code => { if (!controller.signal.aborted && !stopping.has(child)) { failure = new Error(`${name} stopped (${code}). See ${logPath}`); stop(); } });
      return child;
    }
    await new Promise((resolveCommand, reject) => {
      child.once('error', reject);
      child.once('exit', code => code === 0 ? resolveCommand() : reject(new Error(`${name} failed (${code}). See ${logPath}`)));
    });
    return child;
  }
  async function stopChild(child) {
    if (stopping.has(child)) return stopping.get(child);
    if (child.exitCode !== null || child.signalCode !== null || !child.pid) return;
    const completion = (async () => {
      if (process.platform === 'win32') await execute('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true }).catch(() => {});
      else child.kill('SIGTERM');
    })();
    stopping.set(child, completion);
    return completion;
  }
  const waitOptions = { signal: controller.signal };
  try {
    await startSolution(config, {
      prerequisites: async mode => {
        const [major, minor] = process.versions.node.split('.').map(Number);
        if (major < 22 || (major === 22 && minor < 12)) throw new Error('Node.js 22.12+ is required.');
        npm = await npmCommand(env);
        if (mode === 'emulator') await findJava(env);
      },
      ports: mode => assertPortsFree(mode === 'emulator' ? [config.port, 8085, 9099, 4400, 4500, 9150] : [config.port]),
      dependencies: async () => {
        const installed = join(root, 'node_modules', '.package-lock.json');
        const missing = !await exists(installed) || !await exists(join(root, 'node_modules', 'vite', 'bin', 'vite.js'));
        const stale = !missing && (await stat(installed)).mtimeMs < (await stat(join(root, 'package-lock.json'))).mtimeMs;
        if (missing || stale) { console.log('Restoring pinned app dependencies…'); await command('dependencies', process.execPath, [npm, 'ci', '--no-fund', '--no-audit']); }
      },
      startEmulators: () => {
        console.log('Starting local Firebase Auth and Firestore…');
        return command('emulators', process.execPath, [join(root, 'node_modules', 'firebase-tools', 'lib', 'bin', 'firebase.js'), 'emulators:start', '--only', 'auth,firestore', '--project', projectId], true);
      },
      emulatorsReady: () => waitUntil(async () => {
        const hub = await getJson('http://127.0.0.1:4400/emulators');
        const output = await readFile(join(local, 'emulators.log'), 'utf8').catch(() => '');
        return hub?.auth?.port === 9099 && hub?.firestore?.port === 8085 && output.includes('All emulators ready!')
          && Boolean(await getJson(`http://127.0.0.1:9099/emulator/v1/projects/${projectId}/config`));
      }, waitOptions),
      seed: () => command('seed', process.execPath, ['backend/seed.mjs']),
      startWeb: mode => command('web', process.execPath, [join(root, 'node_modules', 'vite', 'bin', 'vite.js'), 'web', '--host', '127.0.0.1', '--port', String(config.port), '--strictPort', ...(mode === 'emulator' ? ['--mode', 'emulator'] : [])], true),
      webReady: () => waitUntil(() => webReady(webUrl), waitOptions),
      ready: async () => {
        console.log(`\nReady: ${webUrl}\nMode: ${config.mode}. Logs: ${local}\nKeep this window open. Ctrl+C stops this launcher's services.`);
        if (config.mode === 'emulator') console.log('Account preview: superadmin@example.test / admin@example.test / owner@example.test / resident@example.test\nLocal test password for all four: Local-demo-only-123! Never reuse it elsewhere.');
        if (config.open && process.platform === 'win32') await execute('rundll32.exe', ['url.dll,FileProtocolHandler', webUrl], { windowsHide: true }).catch(() => console.log(`Open ${webUrl} in your browser.`));
      },
      untilStopped: () => stopped,
      stop: stopChild,
    });
    if (failure) throw failure;
  } catch (error) {
    if (failure) throw failure;
    if (!controller.signal.aborted) throw error;
  } finally {
    controller.abort();
    for (const child of children.reverse()) await stopChild(child);
    process.removeListener('SIGINT', stop); process.removeListener('SIGTERM', stop);
    await unlink(lockPath).catch(() => {});
    console.log('Local launcher stopped.');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { console.error(`\nLocal startup failed: ${error.message}`); process.exitCode = 1; });
}
