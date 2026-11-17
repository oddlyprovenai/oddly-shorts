"""F3 · Word-by-word captions timed on the EDITED audio.

    python captions.py <edited audio> <out captions.json> [--fix fixes.json] [--keys word1,word2]

One word per card at the exact moment it is said. A card shorter than 6 frames (0.2 s at 30 fps) is paired with the
next word (two words), but never across the end of a sentence (. ? !). If a sentence-final word is still short, it
stays on screen into the following pause (up to the next word). One key word per sentence is marked for the accent
colour: a word with a digit first, then any word from --keys, then the longest word.
--fix maps transcriber spellings to the real words without touching timing, e.g. {"Lincoln Bio.": "Link in bio."}.
"""
import json, re, sys
from faster_whisper import WhisperModel

src, dst = sys.argv[1], sys.argv[2]
opt = lambda k: sys.argv[sys.argv.index(k) + 1] if k in sys.argv else None
FIX = json.load(open(opt("--fix"))) if opt("--fix") else {}
KEYS = {k.lower() for k in (opt("--keys") or "").split(",") if k}
MIN = 6 / 30
m = WhisperModel("small", device="cpu", compute_type="int8", cpu_threads=4)
segs, _ = m.transcribe(src, language="en", word_timestamps=True, vad_filter=False)
W = [{"w": w.word.strip(), "s": float(w.start), "e": float(w.end)} for s in segs for w in (s.words or []) if w.word.strip()]
# spelling fixes over word pairs / singles (timing kept: merged words take the span of their parts)
text = " ".join(w["w"] for w in W)
for bad, good in FIX.items():
    bw = bad.split()
    for i in range(len(W) - len(bw) + 1):
        if [x["w"] for x in W[i:i + len(bw)]] == bw:
            gw = good.split()
            span = W[i:i + len(bw)]
            s, e = span[0]["s"], span[-1]["e"]
            step = (e - s) / len(gw)
            W[i:i + len(bw)] = [{"w": g, "s": s + k * step, "e": s + (k + 1) * step} for k, g in enumerate(gw)]
            break
end_of_sentence = lambda w: bool(re.search(r"[.?!]$", w))
cards, i = [], 0
while i < len(W):
    w = W[i]; nxt = W[i + 1]["s"] if i + 1 < len(W) else w["e"] + 0.4
    if nxt - w["s"] < MIN and not end_of_sentence(w["w"]) and i + 1 < len(W):
        b = W[i + 1]; nn = W[i + 2]["s"] if i + 2 < len(W) else b["e"] + 0.4
        cards.append({"words": [w["w"], b["w"]], "start": w["s"], "end": max(nn, w["s"] + MIN), "eos": end_of_sentence(b["w"])})
        i += 2
    else:
        cards.append({"words": [w["w"]], "start": w["s"], "end": max(nxt, w["s"] + MIN), "eos": end_of_sentence(w["w"])})
        i += 1
for a, b in zip(cards, cards[1:]):  # no overlaps
    a["end"] = min(a["end"], b["start"])
# key word per sentence
sent, out = [], []
def flush():
    if not sent: return
    flat = [(ci, wi, w) for ci, c in sent for wi, w in enumerate(c["words"])]
    clean = lambda w: re.sub(r"[^\w%]", "", w)
    pick = next((x for x in flat if re.search(r"\d", x[2])), None) or next((x for x in flat if clean(x[2]).lower() in KEYS), None) \
        or max(flat, key=lambda x: len(clean(x[2])))
    for ci, c in sent: c["key"] = pick[1] if ci == pick[0] else -1
    sent.clear()
for ci, c in enumerate(cards):
    sent.append((ci, c))
    if c["eos"]: flush()
flush()
json.dump([{"words": c["words"], "key": c.get("key", -1), "start": round(c["start"], 3), "end": round(c["end"], 3)} for c in cards], open(dst, "w"), indent=1)
short = [c for c in cards if c["end"] - c["start"] < MIN - 1e-6]
print(f"{len(W)} words -> {len(cards)} cards; shorter than 6 frames: {len(short)}")
