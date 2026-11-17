"""Assemble the render: video + mixed audio into the Remotion project's public/ folder, and the props JSON.

    python build_props.py <work dir> <series.json> <remotion project dir>

series.json: {"id": "A", "accent": "#88D445", "frames": [{"zoom": 1.4, "ox": 0.7, "oy": 0.0}, ...]  (one per clip, keeps
devices/logos out of shot), "cards": [{"after_word": "shipped", "text": "...", "sub": "..."}], "hook_end_word": "medicine.",
"end": {"title": "Oddly Proven Lab", "line": "Link in @oddlyprovenai bio"}, "bed_db": -24}
Needs <work>/cut.mov, voice.wav, cuts.json, captions.json. Writes <work>/props.json and <work>/mix.wav; the bed is an
original synthesized ambient pad (no third-party music), about 10 LU under the voice; mix at -14 LUFS, TP < -1 dBTP.
"""
import json, os, re, shutil, subprocess, sys

work, series, proj = sys.argv[1], json.load(open(sys.argv[2])), sys.argv[3]
S = series["id"]
cuts, caps = json.load(open(os.path.join(work, "cuts.json"))), json.load(open(os.path.join(work, "captions.json")))
dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", os.path.join(work, "cut.mov")], capture_output=True, text=True).stdout)
END = 1.5
# clip boundaries in edit time (spans + 0.1 s joins, as written by cuts.py)
clips, t = [], 0.0
for i, c in enumerate(cuts):
    d = sum(b - a for a, b in c["spans"]) + (0.1 if i < len(cuts) - 1 else 0)
    fr = series["frames"][i]
    clips.append({"start": round(t, 3), "end": round(t + d, 3), **fr}); t += d
clips[-1]["end"] = dur + END + 1
# punch-in toggles every 3-4 s, snapped to a caption start so the change lands on a word
punch, nxt = [], 3.4
for c in caps:
    if c["start"] >= nxt: punch.append(c["start"]); nxt = c["start"] + 3.4
clean = lambda w: re.sub(r"[^\w%]", "", w).lower()
cards = []
for cd in series.get("cards", []):
    key = cd.get("at_word") or cd["after_word"]           # at_word: the card appears while that word is said
    hit = next((c for c in caps if any(clean(w) == clean(key) for w in c["words"])), None)
    if hit: cards.append({"from": round(hit["start"] if cd.get("at_word") else hit["end"], 3), "dur": 1.5, "text": cd["text"], **({"sub": cd["sub"]} if cd.get("sub") else {})})
hook_until = next((c["end"] for c in caps if any(w.lower() == series["hook_end_word"].lower() for w in c["words"])), 3.0)
# audio: voice + original ambient bed, then loudness to -14 LUFS, TP -1.5
sys.path.insert(0, os.environ.get("ODDLY_TOOLS", os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "tools")))
import oddaudio as A
from dsp import read_wav, write_wav, place, integrated, dbg, norm_to
import numpy as np
v, sr = read_wav(os.path.join(work, "voice.wav"))
N = int((dur + END) * sr)
voice = np.zeros((2, N)); place(voice, v if v.shape[0] == 2 else np.vstack([v[0], v[0]]), 0.0)
sc = A.Score(dur + END, 7)
for k, ch in enumerate(["Dm", "F", "C", "Am"] * 8):
    if k * 4.0 < dur + END: sc.pad(k * 4.0, 4.4, ch, 0.3, att=1.2)
bed = norm_to(sc.render()[:, :N], integrated(voice) + series.get("bed_db", -24) + 14, "integrated")
mix = voice + bed
mix *= dbg(-14.0 - integrated(mix))
for _ in range(3): mix = A.limiter(mix, -2.0)
write_wav(os.path.join(work, "mix.wav"), mix)
pub = os.path.join(proj, "public", "reel", S); os.makedirs(pub, exist_ok=True)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", os.path.join(work, "cut.mov"), "-an", "-c:v", "libx264", "-crf", "14", "-pix_fmt", "yuv420p", os.path.join(pub, "video.mp4")], check=True)
shutil.copy(os.path.join(work, "mix.wav"), os.path.join(pub, "mix.wav"))
props = {"video": f"reel/{S}/video.mp4", "audio": f"reel/{S}/mix.wav", "fps": 30, "duration": round(dur + END, 3), "voiceEnd": round(dur, 3),
         "accent": series["accent"], "clips": clips, "punch": punch, "captions": caps, "cards": cards, "end": series["end"], "hook": None,
         "hookUntil": round(hook_until, 3)}
json.dump(props, open(os.path.join(work, "props.json"), "w"), indent=1)
print(f"props: {len(clips)} clips, {len(punch)} punch toggles, {len(cards)} cards, hook ends {hook_until:.2f} s, total {dur + END:.2f} s")
