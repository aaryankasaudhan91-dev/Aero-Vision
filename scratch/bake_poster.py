import subprocess
import os

cmd = [
    'ffmpeg', '-y',
    '-i', os.path.join('brag-output', 'brag.mp4'),
    '-i', os.path.join('brag-output', 'brag.jpg'),
    '-filter_complex', "[0:v][1:v]overlay=0:0:enable='eq(n,0)'[v]",
    '-map', '[v]',
    '-map', '0:a?',
    '-c:v', 'libx264',
    '-crf', '18',
    '-preset', 'fast',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'copy',
    '-movflags', '+faststart',
    os.path.join('brag-output', 'brag.poster.mp4')
]

res = subprocess.run(cmd, check=True)
poster_mp4 = os.path.join('brag-output', 'brag.poster.mp4')
final_mp4 = os.path.join('brag-output', 'brag.mp4')
if os.path.exists(poster_mp4):
    os.replace(poster_mp4, final_mp4)
    print("Successfully baked brag.jpg as frame 0 of brag.mp4!")
