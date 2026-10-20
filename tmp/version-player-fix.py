from pathlib import Path
for name in ['index.html','service-worker.js']:
 p=Path(name);s=p.read_text(encoding='utf-8').replace('v120','v121').replace('2026-10-16-player-offline-layout-1','2026-10-16-player-seek-audio-1');p.write_text(s,encoding='utf-8')
p=Path('PLAYER_TESTING.md');s=p.read_text(encoding='utf-8');s+='''
## Seek and silent-output regression (16 October 2026)

- Pink/grey seek progress updates during playback, manual seeking, online Garba and Stop.
- Saved-song Play creates/unlocks Web Audio before asynchronous storage reads, preserving the user gesture.
- Simulated suspended and interrupted sound output recovers without toggling playback or replacing the track. Paused tracks remain paused. Failed recovery requests a tap and uses a cooldown.
- Regression tests failed before the fix. These simulations do not establish physical-device audible output or OS lock behaviour.
''';p.write_text(s,encoding='utf-8')
