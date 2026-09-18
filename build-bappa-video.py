"""Rebuild the original instrumental and 18-second portrait festival video.
Requires numpy and imageio-ffmpeg, installed locally in .video-tools.
No song recordings or third-party melodies are used.
"""
from pathlib import Path
import sys, wave, subprocess, json
ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / '.video-tools'))
import numpy as np
import imageio_ffmpeg

SR, DURATION = 44100, 18
rng = np.random.default_rng(2026)
mix = np.zeros((SR * DURATION, 2), dtype=np.float64)
out = ROOT / 'tmp/video'
out.mkdir(parents=True, exist_ok=True)

def add(sound, start, level=1., pan=0.):
    offset = round(start * SR)
    length = min(len(sound), len(mix) - offset)
    if length <= 0: return
    mix[offset:offset+length, 0] += sound[:length] * level * np.sqrt((1-pan)/2)
    mix[offset:offset+length, 1] += sound[:length] * level * np.sqrt((1+pan)/2)

def note(midi): return 440 * 2 ** ((midi - 69) / 12)

def flute(midi, duration):
    t = np.arange(round((duration+.18)*SR)) / SR
    freq = note(midi)
    phase = 2*np.pi*freq*t + .045*np.sin(2*np.pi*4.8*t)*(1-np.exp(-t*4))
    tone = np.sin(phase) + .19*np.sin(2*phase) + .07*np.sin(3*phase)
    envelope = np.minimum(t/.075, 1) * np.clip((duration+.18-t)/.24, 0, 1)
    return tone*envelope*(.95+.05*np.sin(2*np.pi*3.7*t))

# An original pentatonic phrase using the notes C D E G B, with a calm cadence.
melody = [(0,72,1),(1,74,.5),(1.5,76,1.5),(3,79,1),(4,76,1),(5,74,1),
          (6,72,2),(8,74,1),(9,76,1),(10,79,1),(11,83,1),
          (12,84,1.5),(13.5,83,.5),(14,79,1),(15,76,1),
          (16,79,1),(17,76,1),(18,74,1),(19,72,3)]
for beat, midi, length in melody:
    add(flute(midi,length*.72), .65+beat*.72, .24, -.1)

# Soft plucked drone and restrained hand-drum style percussion.
for beat in range(24):
    t = np.arange(int(2.8*SR))/SR
    f = note([48,55,60,55][beat%4])
    drone = sum((1/h**1.5)*np.sin(2*np.pi*f*h*t) for h in range(1,7))
    add(drone*(1-np.exp(-t*70))*np.exp(-t*2.1), beat*.72, .045, .3)
    t = np.arange(int(.32*SR))/SR
    if beat%4 in (0,2):
        drum = np.sin(2*np.pi*(95*t+7*(1-np.exp(-t*35))))*np.exp(-t*17)
        add(drum,beat*.72,.11,-.2)
    else:
        drum = (np.sin(2*np.pi*330*t)+.25*np.sin(2*np.pi*510*t))*np.exp(-t*28)
        add(drum,beat*.72,.055,.2)

for start in [0, 5.76, 11.52, 16.15]:
    t=np.arange(int(2.5*SR))/SR
    bell=sum(g*np.sin(2*np.pi*1046*r*t)*np.exp(-t*d) for r,g,d in [(1,1,2.2),(2.01,.3,3),(2.7,.12,4)])
    add(bell*(1-np.exp(-t*150)),start,.055,.45)

# Short stereo room reflections, fade in/out, and headroom.
dry=mix.copy()
for delay,gain in [(.09,.12),(.17,.09),(.29,.07),(.43,.035)]:
    n=int(delay*SR);mix[n:]+=dry[:-n,::-1]*gain
fade=np.minimum(np.arange(len(mix))/(SR*.65),1)*np.minimum(np.arange(len(mix))[::-1]/(SR*1.45),1)
mix*=fade[:,None]
mix*=.84/max(np.max(np.abs(mix)),.001)
audio=out/'original-devotional-instrumental.wav'
with wave.open(str(audio),'wb') as f:
    f.setnchannels(2);f.setsampwidth(2);f.setframerate(SR)
    f.writeframes((mix*32767).astype('<i2').tobytes())

ffmpeg=imageio_ffmpeg.get_ffmpeg_exe()
video=ROOT/'assets/ganpati-bappa-2026-devotional-18s.mp4'
# Retain the complete portrait with a soft background fill and a subtle centred zoom.
filters=("[0:v]split=2[back][front];"
 "[back]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=35:2,eq=brightness=-0.12[bg];"
 "[front]scale=-2:1920[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,"
 "scale=2160:3840,zoompan=z='1+0.025*on/539':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=540:s=1080x1920:fps=30,"
 "fade=t=in:st=0:d=0.7,fade=t=out:st=17:d=1,format=yuv420p[v]")
subprocess.run([ffmpeg,'-y','-hide_banner','-loglevel','warning',
 '-i',str(ROOT/'assets/ganpati-bappa-2026-mobile-wallpaper.png'),'-i',str(audio),
 '-filter_complex',filters,'-map','[v]','-map','1:a','-t','18',
 '-c:v','libx264','-preset','medium','-crf','21','-pix_fmt','yuv420p',
 '-c:a','aac','-b:a','192k','-ar','44100','-movflags','+faststart',
 '-metadata','title=Sai Vista Ganpati Bappa 2026',
 '-metadata','comment=Original synthesized devotional instrumental; AI-enhanced festival photograph',
 str(video)],check=True)
subprocess.run([ffmpeg,'-y','-hide_banner','-loglevel','error','-ss','8','-i',str(video),'-frames:v','1',str(out/'video-preview.jpg')],check=True)
print(json.dumps({'file':str(video),'seconds':DURATION,'dimensions':'1080x1920','bytes':video.stat().st_size,'audio_peak':float(np.max(np.abs(mix)))}))
