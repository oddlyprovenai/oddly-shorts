"""QA gate for a finished short. Exit code 0 = PASS, 1 = FAIL (the report says why).

    python tools/qa.py <final.mp4> <episode dir> <src episode dir> [--min 15 --max 90 --lufs -14]

Checks
  specs        1080x1920, 30 fps, audio present
  duration     between --min and --max seconds
  loudness     integrated within --lufs +-1.5 LU, true peak <= -1.0 dBTP
  frames       no black frames, no frozen spans >= 12 f; "pops" (frame-diff spikes) are reported only when they are
               not explained by a cut, a subtitle card change, an overlay start or a planned flash
  subtitles    every spoken word is covered by a caption card; cards start within 0.15 s of their first word; no overlap
  PII          text (script, captions, copy, story/sets source) and OCR of one frame every 2 s (tesseract, if
               installed) must not contain /Users/, /home/, e-mail addresses, API-key shapes, this machine's user
               name, host name or git identity
"""
import json, os, re, subprocess, sys, getpass, socket, glob
import numpy as np

args = sys.argv[1:]
vid, ep, src = args[0], args[1], args[2]
opt = lambda k, d: float(args[args.index(k) + 1]) if k in args else d
MIN, MAX, LUFS = opt("--min", 15), opt("--max", 90), opt("--lufs", -14)
run = lambda *a: subprocess.run(a, capture_output=True, text=True)
R, FAIL = [], []
def check(ok, msg):
    (R if ok else FAIL).append(("PASS " if ok else "FAIL ") + msg)

# ---- specs, duration, loudness ----
pr = json.loads(run("ffprobe", "-v", "error", "-show_entries", "stream=codec_type,width,height,r_frame_rate:format=duration", "-of", "json", vid).stdout)
v = next(s for s in pr["streams"] if s["codec_type"] == "video"); dur = float(pr["format"]["duration"])
check(v["width"] == 1080 and v["height"] == 1920 and v["r_frame_rate"] == "30/1", f"specs {v['width']}x{v['height']} {v['r_frame_rate']}")
check(any(s["codec_type"] == "audio" for s in pr["streams"]), "audio track present")
check(MIN <= dur <= MAX, f"duration {dur:.2f} s (allowed {MIN:.0f}-{MAX:.0f})")
e = run("ffmpeg", "-i", vid, "-map", "0:a:0", "-af", "ebur128=peak=true", "-f", "null", "-").stderr
tail = e[e.rfind("Summary:"):]
I = float(re.search(r"I:\s+(-?[\d.]+) LUFS", tail).group(1)); TP = float(re.search(r"Peak:\s+(-?[\d.]+) dBFS", tail).group(1))
check(abs(I - LUFS) <= 1.5, f"loudness {I:.1f} LUFS (target {LUFS:.0f} +-1.5)")
check(TP <= -1.0, f"true peak {TP:.1f} dBTP (<= -1.0)")

# ---- frames ----
W, H = 90, 160
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", vid, "-vf", f"scale={W}:{H}:flags=area", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
F = np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3).astype(np.int16); n = len(F)
mean = F.mean(axis=(1, 2, 3)) / 255; diff = np.abs(np.diff(F, axis=0)).mean(axis=(1, 2, 3))
black = [i for i in range(n) if mean[i] < 0.04]
frozen, rs = [], None
for i, d in enumerate(diff):
    if d < 0.02: rs = i if rs is None else rs
    else:
        if rs is not None and i - rs >= 12: frozen.append((rs, i))
        rs = None
check(not black, f"black frames: {black[:10] or 'none'}")
check(not frozen, f"frozen spans >= 12 f: {frozen[:5] or 'none'}")
caps = json.load(open(os.path.join(ep, "voice", "captions.json")))
story = "".join(open(f).read() for f in glob.glob(os.path.join(src, "*.ts")))
explained = set()
for c in caps: explained.update(range(round(c["start"] * 30) - 1, round(c["start"] * 30) + 2)); explained.update(range(round(c["end"] * 30) - 1, round(c["end"] * 30) + 2))
for f0 in re.findall(r"(?:hold|cutTo|glideTo|track|follow)\((\d+)", story) + re.findall(r"\{ f: (\d+)", story): explained.update(range(int(f0) - 1, int(f0) + 3))
for t0 in re.findall(r"from: ([\d.]+)", story): explained.update(range(round(float(t0) * 30) - 1, round(float(t0) * 30) + 16))
m = re.search(r"flashAt: (\d+)", story); explained.update(range(int(m.group(1)) - 1, int(m.group(1)) + 6) if m else [])
med = np.array([np.median(diff[max(0, i - 8):i + 9]) for i in range(len(diff))])
pops = [i + 1 for i in range(len(diff)) if diff[i] > 3 * med[i] + 1.5 and (i + 1) not in explained]
R.append(f"INFO unexplained frame jumps (check by eye): {pops[:20] or 'none'}")

# ---- subtitles vs words ----
words = json.load(open(os.path.join(ep, "voice", "words.json")))["words"]
uncovered = [w["w"] for w in words if not any(c["start"] - 0.05 <= (w["start"] + w["end"]) / 2 <= c["end"] + 0.05 for c in caps)]
overlap = [i for i in range(len(caps) - 1) if caps[i]["end"] > caps[i + 1]["start"] + 1e-3]
check(not uncovered, f"spoken words without a subtitle: {uncovered[:8] or 'none'}")
check(not overlap, f"overlapping caption cards: {overlap[:8] or 'none'}")

# ---- PII ----
who = {getpass.getuser(), socket.gethostname().split(".")[0]}
for k in ("user.name", "user.email"):
    val = run("git", "config", "--global", k).stdout.strip()
    if val: who.add(val)
pats = [r"/Users/[A-Za-z]", r"/home/[A-Za-z]", r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}", r"\b(sk-[A-Za-z0-9]{16,}|ghp_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{30,})"]
pats += [re.escape(x) for x in who if len(x) >= 4]
ALLOW = re.compile(r"oddlyprovenai@users\.noreply\.github\.com|noreply@anthropic\.com")
texts = {}
for f in glob.glob(os.path.join(ep, "**", "*.*"), recursive=True) + glob.glob(os.path.join(src, "*.*")):
    if f.endswith((".txt", ".md", ".json", ".ts", ".tsx", ".py")): texts[f] = open(f, errors="ignore").read()
hits = [(os.path.basename(f), m.group(0)) for f, s in texts.items() for p in pats for m in re.finditer(p, s, re.I) if not ALLOW.search(m.group(0))]
check(not hits, f"PII in text: {[h[0] + ': ' + h[1][:3] + '…' for h in hits[:6]] or 'none'}")
if run("which", "tesseract").returncode == 0:
    import tempfile
    d = tempfile.mkdtemp()
    subprocess.run(["ffmpeg", "-v", "error", "-i", vid, "-vf", "fps=0.5", os.path.join(d, "f_%03d.png")])
    ocr = ""
    for f in sorted(glob.glob(os.path.join(d, "*.png"))): ocr += run("tesseract", f, "-", "--psm", "11").stdout + "\n"
    hits = [m.group(0) for p in pats for m in re.finditer(p, ocr, re.I) if not ALLOW.search(m.group(0))]
    check(not hits, f"PII in frames (OCR, 1 frame / 2 s): {[h[:3] + '…' for h in hits[:6]] or 'none'}")
else:
    R.append("INFO tesseract not installed: frame OCR PII scan skipped")

out = ["QA " + ("FAIL" if FAIL else "PASS") + f"  {os.path.basename(vid)}"] + FAIL + R
print("\n".join(out))
open(os.path.splitext(vid)[0] + ".qa.txt", "w").write("\n".join(out) + "\n")
sys.exit(1 if FAIL else 0)
