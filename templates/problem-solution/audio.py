# Generic sound for a plan-driven ad: light march bed under the talk, a whoosh on every camera change, typing on
# terminal screens, a pop on each number reveal, a stinger on the end card. Reads ../../src/videos/<slug>/plan.json.
import os, sys, json
EP = os.path.dirname(os.path.abspath(__file__)); SLUG = os.path.basename(EP)
sys.path.insert(0, os.environ.get("ODDLY_TOOLS", os.path.join(EP, "..", "..", "tools")))
import oddaudio as A
P = json.load(open(os.environ.get("ODDLY_PLAN", os.path.join(EP, "..", "..", "src", "videos", SLUG, "plan.json"))))
DUR = P["total"]
s = A.Score(DUR, 7)
end = next((o["from"] for o in P["overlays"] if o["kind"] == "end"), DUR - 3)
s.plucks(0.0, 2.0, ["F", "C7"], 0.35); s.oompah(2.0, end - 0.1, ["F", "Bb", "C7", "F", "Dm", "Bb", "C7", "F"], 0.4)
s.melody(4.0, end - 0.4, "march", 12, "vibes", 0.35); s.button(end, "F"); s.pad(end, DUR - end, "F", 0.35, att=0.3)
x = A.Sfx(DUR, 7)
for seg in P["segments"][1:]: x.event(x.whoosh(), seg["from"] - 0.2, 0.25)
for sc in P["screens"]:
    if sc["kind"] == "terminal":
        n = sum(len(l) for l in sc.get("lines", [])); d = min(sc["to"] - sc["from"], n / sc.get("cps", 24))
        x.event(x.keys(d), sc["from"], 0.35, -0.2)
for o in P["overlays"]:
    if o["kind"] == "number": x.event(x.pop(), o["from"] + 0.7, 0.6)
x.bed(x.breeze(DUR, 0.25), 0.0, 0.3)
A.mix(EP, s, x, music_lu=-11.0)
