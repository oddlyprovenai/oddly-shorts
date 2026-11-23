# generated-by: gemini-ultra
# Synthesized original score + beat-synced SFX for 2D/SVG templates (reads ../../src/videos/<slug>/plan.json).
import os, sys, json
EP = os.path.dirname(os.path.abspath(__file__)); SLUG = os.path.basename(EP)
sys.path.insert(0, os.environ.get("ODDLY_TOOLS", os.path.join(EP, "..", "..", "tools")))
import oddaudio as A
P = json.load(open(os.environ.get("ODDLY_PLAN", os.path.join(EP, "..", "..", "src", "videos", SLUG, "plan.json"))))
DUR = P["total"]
s = A.Score(DUR, 7)
end = next((o["from"] for o in P.get("overlays", []) if o["kind"] == "end"), DUR - 3.0)
s.plucks(0.0, 2.0, ["Dm", "F"], 0.32)
s.oompah(2.0, max(2.5, end - 0.1), ["Dm", "F", "C", "Am", "Dm", "Bb", "C7", "F"], 0.36)
s.button(end, "F"); s.pad(end, max(0.5, DUR - end), "F", 0.32, att=0.25)
x = A.Sfx(DUR, 7)
for seg in P.get("segments", [])[1:]:
    x.event(x.pop(), max(0.0, seg["from"]), 0.45)
x.bed(x.breeze(DUR, 0.22), 0.0, 0.25)
A.mix(EP, s, x, music_lu=-11.5)
