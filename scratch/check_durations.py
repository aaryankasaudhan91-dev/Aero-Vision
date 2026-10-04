import os
import subprocess
import json

for i in range(1, 9):
    path = os.path.join('brag-output', 'composition', 'assets', 'voice', f'scene{i}.mp3')
    cmd = ['ffprobe', '-v', 'quiet', '-print_format', 'json', '-show_format', path]
    res = subprocess.check_output(cmd)
    data = json.loads(res)
    dur = float(data['format']['duration'])
    print(f"Scene {i}: {dur:.2f}s")
