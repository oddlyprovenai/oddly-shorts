"""Build plan.json for a dialogue ad from voice/lines.json plus a small beat sheet.

    python tools/dialogue_plan.py <episode dir> <src dir> <beats.json>

beats.json: {"accent": "#88D445", "title": "SPIKE", "promise": "...", "prop": null,
             "cams": {"3": "screen", ...},          # line index -> camera preset (default: G host/two, C buddy)
             "tags": {"5": ["STEP 1 ·", "ONE COMMAND"]},
             "screens": [{"line": 5, "to_line": 6, "screen": "main", "kind": "terminal", "lines": [...]}, ...],
             "numbers": [{"line": 7, "before": "6.2", "after": "tok/s", "label": "...", "note": "..."}],
             "moods": {"3": "worried"}, "waves": [0], "expr": {"0": "nervous"}}
Lines alternate speakers; every camera change lands on a line start, so the picture cuts on the dialogue.
"""
import json, os, sys

ep, src, beats = sys.argv[1], sys.argv[2], json.load(open(sys.argv[3]))
L = json.load(open(os.path.join(ep, "voice", "lines.json")))
W = json.load(open(os.path.join(ep, "voice", "words.json")))
end = W["duration"] + 0.15
cams, segs = beats.get("cams", {}), []
for i, l in enumerate(L):
    default = "buddy" if l["speaker"] == "C" else ("two" if i % 3 == 2 else "host")
    segs.append({"from": round(max(0.0, l["start"] - 0.08), 2) if i else 0.0, "cam": cams.get(str(i), default)})
segs.append({"from": round(end, 2), "cam": "two"})
seg = lambda i: L[int(i)]
plan = {
    "total": round(end + 3.6, 2), "accent": beats["accent"], "cameo": "none", "subStyle": "pop",
    "segments": segs,
    "expr": [[0, beats.get("expr", {}).get("0", "smile")]] + [[seg(k)["start"], v] for k, v in beats.get("expr", {}).items() if k != "0"],
    "buddy": {"mood": [[0, "happy"]] + [[seg(k)["start"], v] for k, v in beats.get("moods", {}).items()],
              "prop": beats.get("prop"), "wave": [seg(i)["start"] for i in beats.get("waves", [])]},
    "screens": [{**{k: v for k, v in s.items() if k not in ("line", "to_line")}, "from": seg(s["line"])["start"] - 0.1,
                 "to": seg(s["to_line"])["end"] + 0.4 if "to_line" in s else end + 4} for s in beats.get("screens", [])],
    "overlays": [{"kind": "tag", "from": seg(k)["start"], "to": seg(k)["end"] + 0.3, "text": v[0], "hi": v[1]} for k, v in beats.get("tags", {}).items()]
    + [{"kind": "number", "from": seg(n["line"])["start"] + 0.2, "to": seg(n["line"])["end"] + 0.6, "before": n["before"], "after": n["after"],
        "label": n["label"], **({"note": n["note"]} if n.get("note") else {})} for n in beats.get("numbers", [])]
    + [{"kind": "end", "from": round(end, 2), "title": beats["title"], "lines": [beats["promise"], "Made with oddly-shorts (free)", "github.com/oddlyprovenai/oddly-shorts"],
        "handle": "Link in @oddlyprovenai bio"}],
}
json.dump(plan, open(os.path.join(src, "plan.json"), "w"), indent=1)
print(f"plan: {len(segs)} segments, total {plan['total']} s")
