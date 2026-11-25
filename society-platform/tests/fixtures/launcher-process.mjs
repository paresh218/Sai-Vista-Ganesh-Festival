import { main } from '../../scripts/run-local.mjs';

process.on('message', message => { if (message === 'stop') process.emit('SIGINT'); });
try { await main(process.argv.slice(2)); }
catch (error) { console.error(error.message); process.exitCode = 1; }
finally { process.disconnect(); }
