from pathlib import Path
p=Path('song-popup.js');s=p.read_text(encoding='utf-8').replace("const controls=content.querySelector('.player-controls');","// Garba has its own transport before the main player in the document.\n const controls=content.querySelector('.advanced-player .player-controls');");p.write_text(s,encoding='utf-8')
p=Path('song-popup.test.cjs');s=p.read_text(encoding='utf-8').replace("'.player-controls':controls","'.advanced-player .player-controls':controls");p.write_text(s,encoding='utf-8')
for name in ['index.html','service-worker.js']:
 p=Path(name);s=p.read_text(encoding='utf-8').replace('v122','v123').replace('v=122','v=123').replace('2026-10-16-player-seek-audio-1','2026-10-16-player-cue-controls-1');p.write_text(s,encoding='utf-8')
p=Path('PLAYER_TESTING.md');s=p.read_text(encoding='utf-8');s+='''
## Cue panel regression (16 October 2026)

Garba inserts its own transport before the main player. Cue controls must be attached specifically to the advanced player's transport before layout moves them into the expandable panel. The integration test checks all eight buttons, repeated expansion, cue recall, jumps, timed/custom loops and clearing, with both transports present. It failed with an empty panel before this fix.
''';p.write_text(s,encoding='utf-8')
