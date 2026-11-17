"""F1 · Energy-safe cuts. Removes silent pauses only, never voice.

    python cuts.py <out_dir> <clip1.mp4> [clip2.mp4 ...]   (clips joined in this order)

For each clip: word timestamps (faster-whisper) + 10 ms RMS energy. A pause is removed only when the gap between two
words is silent (energy below the clip's noise floor + 6 dB for its whole length). Each kept span ends 70 ms after the
last word and starts 60 ms before the next; if the energy at a cut edge is still above the voice threshold (final
"s", soft onsets), the edge moves outward until it is quiet. 8 ms fades at every audio cut (no clicks). The clip
starts on its first word (60 ms pre-roll) and ends 70 ms after its last; clips are joined with 0.1 s of silence on
a held frame, no visual fade. Writes: <out>/cut.mp4, <out>/cuts.json (kept spans), <out>/cut_report.md.
"""
import json, os, subprocess, sys
import numpy as np

OUT = sys.argv[1]; CLIPS = sys.argv[2:]
os.makedirs(OUT, exist_ok=True)
PRE, POST, FADE, GAP, MIN_PAUSE = 0.060, 0.070, 0.008, 0.10, 0.18
SR = 16000


def audio(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"], capture_output=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768


def rms_db(x, hop=0.010):
    n = int(hop * SR); k = len(x) // n
    r = np.sqrt(np.mean(x[: k * n].reshape(k, n) ** 2, axis=1) + 1e-12)
    return 20 * np.log10(r)


from faster_whisper import WhisperModel
M = WhisperModel(os.environ.get("REEL_WHISPER", "small"), device="cpu", compute_type="int8", cpu_threads=4)


def words_of(path):
    segs, _ = M.transcribe(path, language=os.environ.get("REEL_LANG", "en"), word_timestamps=True, vad_filter=False)
    return [{"w": w.word.strip(), "s": float(w.start), "e": float(w.end)} for s in segs for w in (s.words or []) if w.word.strip()]


plan, report, total_in, total_out = [], [], 0.0, 0.0
for ci, clip in enumerate(CLIPS):
    x = audio(clip); db = rms_db(x); dur = len(x) / SR
    floor = np.percentile(db, 10); voice = np.percentile(db, 70)
    quiet = floor + max(6.0, 0.25 * (voice - floor))          # below this = no voice
    q = lambda t: db[min(len(db) - 1, max(0, int(t / 0.010)))] < quiet
    W = words_of(clip)
    if not W:
        report.append(f"- {os.path.basename(clip)}: no speech found, skipped"); continue

    def out_edge(t, step):  # move an edge outward until the energy there is quiet (protects "s" endings, soft onsets)
        for _ in range(30):
            if q(t): return t
            t += step
        return t
    # the clip starts 60 ms before the real voice onset (energy), not the first word's timestamp (often 0.00)
    i0 = int(W[0]["s"] / 0.01)
    onset = next((i * 0.01 for i in range(i0, min(len(db), int((W[0]["e"] + 0.6) / 0.01))) if db[i] >= quiet), W[0]["s"])
    spans, start = [], max(0.0, out_edge(onset - PRE, -0.01))
    for a, b in zip(W, W[1:]):
        # the longest continuous quiet run inside the pause (word timestamps are approximate, the energy is not)
        lo, hi = int(max(start, a["e"] - 0.05) / 0.01), int((b["s"] + 0.05) / 0.01)
        best, run0 = (0, 0), None
        for i in range(lo, hi + 1):
            if i < hi and i < len(db) and db[i] < quiet:
                run0 = i if run0 is None else run0
            elif run0 is not None:
                if i - run0 > best[1] - best[0]: best = (run0, i)
                run0 = None
        r0, r1 = best[0] * 0.01, best[1] * 0.01
        e, s2 = r0 + POST, r1 - PRE                      # 70 ms after the voice stops, 60 ms before it resumes
        if r1 - r0 >= MIN_PAUSE + POST + PRE and s2 - e >= 0.05:
            spans.append([start, e])
            report.append(f"- {os.path.basename(clip)[:34]} · removed {s2 - e:.2f} s pause between «{a['w']}» and «{b['w']}» ({e:.2f}–{s2:.2f} s, energy < {quiet:.0f} dBFS)")
            start = s2
    end = min(dur, out_edge(W[-1]["e"] + POST, 0.01))
    spans.append([start, end])
    lead, tail = spans[0][0], dur - end
    report.append(f"- {os.path.basename(clip)[:34]} · trimmed {lead:.2f} s before the first word and {tail:.2f} s after the last")
    total_in += dur; total_out += sum(b - a for a, b in spans)
    plan.append({"clip": clip, "spans": [[round(a, 3), round(b, 3)] for a, b in spans], "words": W})

# render: per span trim + 8 ms audio fades; held frame + silence between clips
parts, fc, n = [], [], 0
for ci, p in enumerate(plan):
    for si, (a, b) in enumerate(p["spans"]):
        last = ci < len(plan) - 1 and si == len(p["spans"]) - 1
        hold = GAP if last else 0.0
        parts += ["-ss", f"{a:.3f}", "-to", f"{b:.3f}", "-i", p["clip"]]
        d = b - a
        fc.append(f"[{n}:v]fps=30,scale=720:1280,setsar=1,tpad=stop_mode=clone:stop_duration={hold:.3f}[v{n}];"
                  f"[{n}:a]aresample=48000,afade=t=in:d={FADE},afade=t=out:st={max(0, d - FADE):.3f}:d={FADE},apad=pad_dur={hold:.3f}[a{n}]")
        n += 1
fc.append("".join(f"[v{i}][a{i}]" for i in range(n)) + f"concat=n={n}:v=1:a=1[v][a]")
subprocess.run(["ffmpeg", "-v", "error", "-y", *parts, "-filter_complex", ";".join(fc), "-map", "[v]", "-map", "[a]",
                "-c:v", "libx264", "-crf", "16", "-preset", "medium", "-c:a", "pcm_s16le", os.path.join(OUT, "cut.mov")], check=True)
json.dump(plan, open(os.path.join(OUT, "cuts.json"), "w"), indent=1)
open(os.path.join(OUT, "cut_report.md"), "w").write(
    f"# Cut report\n\nInput {total_in:.2f} s -> kept {total_out:.2f} s of speech spans (+{GAP:.1f} s joins). Removed {total_in - total_out:.2f} s of silence.\n"
    f"Rules: cuts only where the energy is below the noise floor; {int(POST*1000)} ms kept after the last word, {int(PRE*1000)} ms before the next; {int(FADE*1000)} ms fades.\n\n"
    + "\n".join(report) + "\n")
print(open(os.path.join(OUT, "cut_report.md")).read())
