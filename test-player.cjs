const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=__dirname;
const tests=fs.readdirSync(root).filter(name=>/^(?:dj-|deck-|navratri-player|navratri-songs|playlist-time|song-|garba-|music-|player-|site-updates)/.test(name)&&name.endsWith('.test.cjs')).sort();
const sources=['navratri-songs.js','dj-decks.js','dj-studio.js','dj-studio-loader.js','dj-analysis-worker.js','garba-special.js','garba-dj-controls.js','music-evening.js','player-modern.js','song-layout.js','song-mini.js','song-offline.js','song-popup.js','song-retro.js','playlist-time.js','service-worker.js'];
for(const file of sources){const result=spawnSync(process.execPath,['--check',path.join(root,file)],{stdio:'inherit'});if(result.status!==0)process.exit(result.status||1);}
console.log(`Player regression: ${sources.length} syntax checks and ${tests.length} test files.`);
const result=spawnSync(process.execPath,['--test',...tests],{cwd:root,stdio:'inherit'});process.exit(result.status??1);
