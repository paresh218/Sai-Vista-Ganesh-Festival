from pathlib import Path
import sys,subprocess,json,re
root=Path.cwd();sys.path.insert(0,str(root/'.video-tools'));import imageio_ffmpeg
ff=imageio_ffmpeg.get_ffmpeg_exe();src=Path(r'C:\Users\ASUS\Downloads\Dandiya 2026 Marathi & Hindi Garba 2026 Nonstop Garba Dj Song Trending Songs Dj Maddy.mp3');out=root/'outputs/audio-enhanced'
eq='highpass=f=35:p=2,equalizer=f=110:t=q:w=0.7:g=-1.5,equalizer=f=300:t=q:w=0.8:g=-2.5,equalizer=f=2800:t=q:w=0.8:g=1.2'
r=subprocess.run([ff,'-hide_banner','-i',str(src),'-vn','-af',eq+',loudnorm=I=-15:TP=-2:LRA=11:print_format=json','-f','null','-'],capture_output=True,text=True)
(out/'analysis.log').write_text(r.stderr)
assert r.returncode==0
m=json.loads(re.findall(r'\{\s*"input_i"[\s\S]*?\}',r.stderr)[-1]);print(m,flush=True)
norm=f"loudnorm=I=-15:TP=-2:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true:print_format=json"
dst=out/'Dandiya-2026-Clarity-Enhanced.mp3'
r=subprocess.run([ff,'-y','-hide_banner','-i',str(src),'-map','0:a:0','-af',eq+','+norm,'-ar','44100','-c:a','libmp3lame','-b:a','160k','-map_metadata','-1','-metadata','title=Dandiya 2026 - Clarity Enhanced','-id3v2_version','3',str(dst)],capture_output=True,text=True)
(out/'processing.log').write_text(r.stderr);assert r.returncode==0;assert dst.stat().st_size<40_000_000
print(json.dumps({'output':str(dst),'bytes':dst.stat().st_size}),flush=True)
r=subprocess.run([ff,'-hide_banner','-i',str(dst),'-af','loudnorm=I=-15:TP=-2:LRA=11:print_format=json','-f','null','-'],capture_output=True,text=True)
(out/'verification.log').write_text(r.stderr);assert r.returncode==0
print(r.stderr[-1000:],flush=True)
