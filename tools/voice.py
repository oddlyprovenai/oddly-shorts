"""Voice + word timings + subtitle cards for one Oddly Proven episode.

    .venv/bin/python estudio/tools/voice.py estudio/episodes/NN-slug

Reads   voice/script.txt  narration as displayed; *word* marks a highlighted key word in the subtitles
        voice/say.json    {"41,000": "forty-one thousand", ...}  how display tokens are spoken (numbers, years)
Writes  voice/tts.txt, voice/raw.wav, voice/voice.wav (kokoro am_michael speed 1.02, then 1.1x, pauses <= 0.32 s,
        -20 LUFS, 48 kHz mono), voice/words.json (spoken tokens, faster-whisper word times),
        voice/captions.json (display cards of 1-3 words with start/end and key index)
"""
import json, os, re, subprocess, sys, difflib

EP = os.path.abspath(sys.argv[1])
V = os.path.join(EP, "voice")
ROOT = os.path.abspath(os.getcwd())  # run from the Remotion project root
MODELS = os.environ.get("ODDLY_VOICE_MODELS", os.path.join(ROOT, "models"))
norm = lambda w: re.sub(r"[^a-z0-9]", "", w.lower())

display = open(os.path.join(V, "script.txt"), encoding="utf-8").read().split()
say = json.load(open(os.path.join(V, "say.json"), encoding="utf-8")) if os.path.exists(os.path.join(V, "say.json")) else {}


def spoken(tok):
    core = tok.replace("*", "")
    m = re.match(r"^(.*?)([.,!?;:]*)$", core)
    word, punct = m.group(1), m.group(2)
    return (say[word] + punct) if word in say else core


groups = [spoken(t).split() for t in display]                 # spoken tokens per display token
tts = " ".join(" ".join(g) for g in groups)
open(os.path.join(V, "tts.txt"), "w", encoding="utf-8").write(tts)

if "--no-tts" not in sys.argv:
    import soundfile as sf
    from kokoro_onnx import Kokoro
    k = Kokoro(os.path.join(MODELS, "kokoro-v1.0.onnx"), os.path.join(MODELS, "voices-v1.0.bin"))
    s, sr = k.create(tts, voice=os.environ.get("ODDLY_VOICE", "am_michael"), speed=float(os.environ.get("ODDLY_SPEED", "1.02")), lang=os.environ.get("ODDLY_LANG", "en-us"))
    sf.write(os.path.join(V, "raw.wav"), s, sr)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", os.path.join(V, "raw.wav"), "-af",
                    "silenceremove=start_periods=1:start_threshold=-45dB:stop_periods=-1:stop_duration=0.32:stop_threshold=-45dB,"
                    f"atempo={os.environ.get('ODDLY_TEMPO', '1.1')},loudnorm=I=-20:TP=-2:LRA=11", "-ar", "48000", "-ac", "1", os.path.join(V, "voice.wav")], check=True)

wav = os.path.join(V, "voice.wav")
dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", wav], capture_output=True, text=True).stdout)
from faster_whisper import WhisperModel
m = WhisperModel("small", device="cpu", compute_type="int8", cpu_threads=4)
segs, _ = m.transcribe(wav, language=os.environ.get("ODDLY_WHISPER_LANG", "en"), word_timestamps=True, vad_filter=False, condition_on_previous_text=False, initial_prompt=tts)
heard = [(w.word.strip(), w.start, w.end) for s in segs for w in (s.words or []) if w.word.strip()]
words = tts.split()
a, b = [norm(w) for w in words], [norm(w) for w, _, _ in heard]
T = [None] * len(a)
for blk in difflib.SequenceMatcher(None, a, b, autojunk=False).get_matching_blocks():
    for i in range(blk.size):
        T[blk.a + i] = heard[blk.b + i][1:]
clear = sum(x is not None for x in T)
i = 0
while i < len(a):
    if T[i] is None:
        j = i
        while j < len(a) and T[j] is None:
            j += 1
        t0 = T[i - 1][1] if i else 0.0
        t1 = T[j][0] if j < len(a) else dur
        st = max(t1 - t0, 0.05) / (j - i)
        for k2 in range(i, j):
            T[k2] = (t0 + st * (k2 - i), t0 + st * (k2 - i + 1))
        i = j
    else:
        i += 1
json.dump({"duration": round(dur, 3), "words": [{"w": w, "start": round(s, 3), "end": round(e, 3)} for w, (s, e) in zip(words, T)]},
          open(os.path.join(V, "words.json"), "w"), indent=1)

# display tokens -> times (first/last spoken token), then cards of 1-3 words broken at punctuation
times, n = [], 0
for g in groups:
    times.append((T[n][0], T[n + len(g) - 1][1]))
    n += len(g)
cards, cur = [], []
for idx, tok in enumerate(display):
    cur.append(idx)
    if len(cur) == 3 or re.search(r"[.,!?;:]$", tok.replace("*", "")) or idx == len(display) - 1:
        cards.append(cur)
        cur = []
out = []
for ci, c in enumerate(cards):
    ws = [display[i].replace("*", "").rstrip(",;:") for i in c]
    key = next((k for k, i in enumerate(c) if "*" in display[i]), -1)
    start = times[c[0]][0] - 0.04
    end = times[c[-1]][1] + 0.25
    if ci + 1 < len(cards):
        end = min(end, times[cards[ci + 1][0]][0] - 0.04) if times[cards[ci + 1][0]][0] - times[c[-1]][1] < 0.45 else end
    out.append({"words": ws, "key": key, "start": round(start, 3), "end": round(end, 3), "times": [round(times[i][0], 3) for i in c]})
json.dump(out, open(os.path.join(V, "captions.json"), "w"), indent=1)
print(f"{len(display)} display words, {len(words)} spoken, {clear}/{len(words)} heard, {dur:.2f} s, {len(out)} caption cards")
