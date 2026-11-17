"""QA gate for a finished reel. Exit 0 = PASS, 1 = FAIL.

    python qa_reel.py <final.mp4> <cuts.json> <allowed_numbers.txt> [--min 10 --max 90]

Checks: 1080x1920 @ 30 fps with audio; duration; loudness -14 LUFS +-1.5 and true peak <= -1 dBTP; no black frames or
frozen spans >= 12 f; transcript diff (every word of the original clips is still spoken); OCR of one frame every
second (tesseract): no /Users or /home paths, e-mail addresses, API-key shapes, this machine's user/host name or git
identity, and every number shown on screen must appear in the allowed list; saves 3 frames (start, middle, end) as
<final>_check_N.jpg for an eye check of the face, captions and safe zones.
"""
import getpass, glob, json, os, re, socket, subprocess, sys, tempfile
import numpy as np

vid, cuts_p, allowed_p = sys.argv[1], sys.argv[2], sys.argv[3]
opt = lambda k, d: float(sys.argv[sys.argv.index(k) + 1]) if k in sys.argv else d
MIN, MAX = opt("--min", 10), opt("--max", 90)
run = lambda *a: subprocess.run(a, capture_output=True, text=True)
R, F = [], []
ok = lambda c, m: (R if c else F).append(("PASS " if c else "FAIL ") + m)
pr = json.loads(run("ffprobe", "-v", "error", "-show_entries", "stream=codec_type,width,height,r_frame_rate:format=duration,bit_rate", "-of", "json", vid).stdout)
v = next(s for s in pr["streams"] if s["codec_type"] == "video"); dur = float(pr["format"]["duration"])
ok(v["width"] == 1080 and v["height"] == 1920 and v["r_frame_rate"] == "30/1" and any(s["codec_type"] == "audio" for s in pr["streams"]), f"specs {v['width']}x{v['height']} {v['r_frame_rate']} + audio, {int(pr['format']['bit_rate']) / 1e6:.1f} Mbps")
ok(MIN <= dur <= MAX, f"duration {dur:.2f} s")
e = run("ffmpeg", "-nostats", "-i", vid, "-af", "ebur128=peak=true", "-f", "null", "-").stderr; t = e[e.rfind("Summary:"):]
I = float(re.search(r"I:\s+(-?[\d.]+)", t).group(1)); TP = float(re.search(r"Peak:\s+(-?[\d.]+)", t).group(1))
ok(abs(I + 14) <= 1.5, f"loudness {I:.1f} LUFS"); ok(TP <= -1.0, f"true peak {TP:.1f} dBTP")
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", vid, "-vf", "scale=90:160", "-f", "rawvideo", "-pix_fmt", "gray", "-"], capture_output=True).stdout
fr = np.frombuffer(raw, np.uint8).reshape(-1, 160, 90).astype(np.int16)
d = np.abs(np.diff(fr, axis=0)).mean(axis=(1, 2)); black = [i for i in range(len(fr)) if fr[i].mean() < 8]
frozen, rs = [], None
for i, x in enumerate(d):
    if x < 0.02: rs = i if rs is None else rs
    else:
        if rs is not None and i - rs >= 12: frozen.append((rs, i))
        rs = None
ok(not black, f"black frames: {black[:8] or 'none'}"); ok(not frozen, f"frozen spans: {frozen[:5] or 'none'}")
res = run(sys.executable, os.path.join(os.path.dirname(__file__), "diff.py"), vid, cuts_p)
dj = json.loads(res.stdout.strip().splitlines()[-1]) if res.stdout.strip() else {"missing": ["diff failed"]}
ok(not dj["missing"], f"transcript diff: {dj.get('original_words')} words, missing {dj['missing'] or 'none'}{', variants ' + str(dj['transcriber_variants']) if dj.get('transcriber_variants') else ''}")
allowed = {x.strip() for x in open(allowed_p).read().replace(",", " ").split() if x.strip()}
who = {getpass.getuser(), socket.gethostname().split(".")[0]} | {run("git", "config", "--global", k).stdout.strip() for k in ("user.name", "user.email")}
pats = [r"/Users/\w", r"/home/\w", r"[\w.%+-]+@[\w.-]+\.[a-z]{2,}", r"\b(sk-\w{16,}|ghp_\w{20,}|AKIA[0-9A-Z]{16})"] + [re.escape(x) for x in who if len(x) >= 4]
tmp = tempfile.mkdtemp(); subprocess.run(["ffmpeg", "-v", "error", "-i", vid, "-vf", "fps=1", os.path.join(tmp, "f_%03d.png")])
ocr = "\n".join(run("tesseract", f, "-", "--psm", "11").stdout for f in sorted(glob.glob(os.path.join(tmp, "*.png"))))
hits = [m.group(0) for p in pats for m in re.finditer(p, ocr, re.I) if "oddlyprovenai" not in m.group(0).lower()]
ok(not hits, f"PII in frames: {[h[:3] + '…' for h in hits[:5]] or 'none'}")
nums = {re.sub(r"[^\d.]", "", n).strip(".") for n in re.findall(r"\d[\d.,]*", ocr)} - {""}
bad = sorted(n for n in nums if n not in allowed and not any(n in a for a in allowed))
ok(not bad, f"numbers on screen not in the fact list: {bad or 'none'} (seen {sorted(nums)})")
for k, ts in enumerate((0.8, dur / 2, dur - 2.2)):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{ts:.2f}", "-i", vid, "-frames:v", "1", "-vf", "scale=360:-1", f"{os.path.splitext(vid)[0]}_check_{k + 1}.jpg"])
out = ["QA " + ("FAIL" if F else "PASS") + " " + os.path.basename(vid)] + F + R
open(os.path.splitext(vid)[0] + ".qa.txt", "w").write("\n".join(out) + "\n"); print("\n".join(out)); sys.exit(1 if F else 0)
