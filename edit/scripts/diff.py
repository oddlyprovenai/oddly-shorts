"""Transcript diff: re-transcribes the edit and compares it with the original clips' transcripts. Nothing may be missing.

    python diff.py <edited media> <cuts.json>      exit 0 = every original word is present, 1 = something is missing
"""
import difflib, json, re, sys
from faster_whisper import WhisperModel

media, cuts = sys.argv[1], json.load(open(sys.argv[2]))
norm = lambda w: re.sub(r"[^a-z0-9]", "", w.lower())
orig = [norm(w["w"]) for c in cuts for w in c["words"] if norm(w["w"])]
m = WhisperModel("small", device="cpu", compute_type="int8", cpu_threads=4)
segs, _ = m.transcribe(media, language="en", word_timestamps=True, vad_filter=False)
new = [norm(w.word) for s in segs for w in (s.words or []) if norm(w.word)]
from collections import Counter
miss = Counter(orig) - Counter(new)
extra = list((Counter(new) - Counter(orig)).elements())
lost, variants = [], []
for w in miss.elements():  # exact word counts; a near-identical extra word ("one"/"ones", "16gig"/"16") is a transcriber variant
    close = next((x for x in extra if difflib.SequenceMatcher(None, w, x).ratio() >= 0.75 or (len(w) > 1 and (x.startswith(w) or w.startswith(x)))), None)
    if close: variants.append(f"{w}~{close}"); extra.remove(close)
    else: lost.append(w)
print(json.dumps({"original_words": len(orig), "edited_words": len(new), "missing": lost, "transcriber_variants": variants}, ensure_ascii=False))
sys.exit(1 if lost else 0)
