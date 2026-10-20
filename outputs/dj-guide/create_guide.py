from pathlib import Path
import sys, subprocess, math, wave, json
from PIL import Image, ImageDraw, ImageFont
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'.video-tools'))
import imageio_ffmpeg
OUT=ROOT/'outputs/dj-guide'
W,H=720,1280
fontpath='C:/Windows/Fonts/'
def f(s,b=False):return ImageFont.truetype(fontpath+('arialbd.ttf' if b else 'arial.ttf'),s)
white='#F7F5F9'; muted='#BDBAC9'; pink='#FC477B'; panel='#25252F'
def text(d,xy,s,size=30,color=white,b=False):d.text(xy,s,font=f(size,b),fill=color)
def wrap(d,s,y,size=32,width=610,color=white):
 words=s.split(); line=''
 for word in words:
  trial=(line+' '+word).strip()
  if d.textlength(trial,font=f(size))>width:
   text(d,(55,y),line,size,color);y+=int(size*1.35);line=word
  else:line=trial
 text(d,(55,y),line,size,color)
 return y+int(size*1.35)
def box(d,rect,fill=panel,r=24):d.rounded_rectangle(rect,radius=r,fill=fill)
def button(d,y,label,active=False):
 box(d,(72,y,648,y+66),pink if active else '#33333F',18);text(d,(94,y+18),label,25,b=active)
scenes=[
 (0,4.1,'HELLO, SAI VISTA','Your music. One tap away.','A quick guide to your DJ player'),
 (4.1,8.0,'01 / OPEN THE PLAYER','Let the music begin','Open the website and tap Open DJ player.'),
 (8,15.7,'02 / DAILY SONGS','Your evening, ready to play','Choose a playlist or start tonight\'s planned music. Tap any song to play.'),
 (15.7,23.9,'03 / EXPLORE & MIX','Make it your own','Explore Garba Special. Use saved audio for the full DJ controls.'),
 (23.9,30.9,'04 / SAVE BEFORE YOU GO','Take your playlist along','Open Offline, check readiness, then save your selected playlist.'),
 (30.9,34.7,'05 / KEEP IT HANDY','Minimise. Keep listening.','Use the mini-player for quick playback controls.'),
 (34.7,43.8,'ANYTIME. ANYWHERE.','Bring on the weekend vibes','Saved songs work offline. Online songs need internet.')]
logo=Image.open(ROOT/'assets/sai-vista-logo.png').convert('RGBA');logo.thumbnail((100,100))
def frame(t):
 im=Image.new('RGB',(W,H),'#12121B');d=ImageDraw.Draw(im)
 # restrained festive lights
 for x,y,r in [(660,140,210),(-70,720,170)]:d.ellipse((x-r,y-r,x+r,y+r),fill='#221828')
 im.paste(logo,(48,36),logo);text(d,(166,58),'SAI VISTA',32,b=True);text(d,(166,100),'NAVRATRI  /  MUSIC',19,muted)
 i=next((j for j,s in enumerate(scenes) if s[0]<=t<s[1]),6);a,z,k,title,caption=scenes[i]
 text(d,(55,185),k,21,pink,True);wrap(d,title,231,43)
 box(d,(48,360,672,946),'#1D1D28',32)
 if i in (0,6):
  cx,cy=360,560
  for r,c in [(136,'#2E2638'),(113,'#14141C'),(100,'#25232F'),(54,pink),(15,'#17171F')]:d.ellipse((cx-r,cy-r,cx+r,cy+r),fill=c)
  ang=t*.65
  d.line((cx+80*math.cos(ang),cy+80*math.sin(ang),cx+103*math.cos(ang),cy+103*math.sin(ang)),fill='#5C4C68',width=5)
  text(d,(112,744),'YOUR COMMUNITY. YOUR MUSIC.',26,b=True)
  if i==6:
   text(d,(100,808),'Suggestions? Reach out to Priyank.',27,pink,True)
   text(d,(192,862),'Happy listening, Sai Vista!',25)
  else:text(d,(150,814),'Play  /  Save  /  Mix  /  Enjoy',27,muted)
 elif i==1:
  text(d,(92,408),'SAI VISTA NAVRATRI',29,b=True)
  wrap(d,'Ready for weekend vibes?',477,34,520)
  button(d,620,'Open DJ player',True)
  text(d,(92,750),'Your music lives here',27,muted)
 elif i==2:
  text(d,(80,395),'DAILY SONGS',28,pink,True)
  button(d,455,"Start tonight's music",True)
  button(d,541,'Choose day / playlist')
  for n,label in enumerate(['1   Your planned playlist','2   Choose a song to play','3   Search for your favourites']):text(d,(92,650+n*58),label,25)
  text(d,(98,862),'Previous     Play / Pause     Next',26,pink,True)
 elif i==3:
  text(d,(80,395),'GARBA SPECIAL',28,pink,True);button(d,450,'Choose a Garba collection',True)
  text(d,(91,554),'SOUND',21,muted,True)
  for j,h in enumerate([40,75,110,67,95,50,83,110,64,44]):
   x=104+j*51;d.line((x,610,x,730),fill='#373542',width=6);box(d,(x-10,730-h,x+10,748-h),pink,6)
  text(d,(91,790),'DJ STUDIO',21,muted,True)
  text(d,(91,836),'Two decks  /  Mix  /  Effects',28,b=True)
  text(d,(91,885),'Full DJ tools use your saved audio',23,muted)
 elif i==4:
  text(d,(80,395),'OFFLINE',28,pink,True)
  button(d,468,'Check offline readiness',True)
  button(d,558,'Save selected playlist',True)
  wrap(d,'Save supported audio while connected, then enjoy it without internet.',690,30,530,muted)
 elif i==5:
  text(d,(82,412),'MINIMISE PLAYER',28,pink,True)
  text(d,(90,490),'Keep playback within reach',29)
  box(d,(76,640,644,798),'#34313F',24)
  text(d,(102,666),'Now playing',28,b=True);text(d,(102,728),'Pause    /    Open player    /    Stop',25,pink)
  text(d,(90,860),'Quick controls, less clutter',28,muted)
 wrap(d,caption,991,31,610)
 text(d,(55,1175),'saivistaculturalcommittee.in',25,muted)
 d.rounded_rectangle((55,1230,665,1236),radius=3,fill='#3E3546');d.rounded_rectangle((55,1230,55+max(3,610*t/43.8),1236),radius=3,fill=pink)
 return im
ff=imageio_ffmpeg.get_ffmpeg_exe()
cmd=[ff,'-y','-f','rawvideo','-vcodec','rawvideo','-s','720x1280','-pix_fmt','rgb24','-r','15','-i','-','-i',str(OUT/'narration.wav'),'-af','apad,afade=t=out:st=43.1:d=0.7','-t','43.8','-c:v','libx264','-preset','fast','-crf','23','-pix_fmt','yuv420p','-c:a','aac','-b:a','128k','-movflags','+faststart',str(OUT/'Sai-Vista-DJ-Player-Guide.mp4')]
p=subprocess.Popen(cmd,stdin=subprocess.PIPE,stderr=open(OUT/'encode.log','w'))
for n in range(657):p.stdin.write(frame(n/15).tobytes())
p.stdin.close();assert p.wait()==0
shots=[frame(t).resize((240,427)) for t in [2,6,11,19,27,32,39]]
contact=Image.new('RGB',(240*4,427*2),'#11111a')
for i,im in enumerate(shots):contact.paste(im,((i%4)*240,(i//4)*427))
contact.save(OUT/'review.jpg')
result=subprocess.run([ff,'-i',str(OUT/'Sai-Vista-DJ-Player-Guide.mp4'),'-f','null','-'],capture_output=True,text=True)
(OUT/'verify.log').write_text(result.stderr)
print(json.dumps({'decode_exit':result.returncode,'seconds':43.8,'bytes':(OUT/'Sai-Vista-DJ-Player-Guide.mp4').stat().st_size}))
