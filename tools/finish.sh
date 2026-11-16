#!/bin/bash
# Render, mux, QA and deliver one episode.  usage: estudio/tools/finish.sh <Comp> <episode dir> "<NN - Title>"
# Safeguards: one render at a time, >= 4 GB of free+inactive RAM, render bundles in ~/remotion-tmp (deleted after).
set -euo pipefail
cd "$(dirname "$0")/../.."
COMP="$1"; EP="$2"; NAME="$3"; OUT="out/${COMP}"
export PATH="$PWD/node/bin:$PATH" TMPDIR="$HOME/remotion-tmp"
mkdir -p "$OUT" "$TMPDIR"
free_gb() { vm_stat | awk '/page size/{ps=$8} /Pages free/{f=$3} /Pages inactive/{i=$3} END{printf "%d", (f+i)*ps/1073741824}'; }
for n in $(seq 1 30); do
  if pgrep -f "remotion render" >/dev/null; then echo "$(date) another render is running, waiting"; sleep 60; continue; fi
  if [ "$(free_gb)" -lt 4 ]; then echo "$(date) free RAM $(free_gb) GB < 4, waiting"; sleep 60; continue; fi
  break
done
if pgrep -f "remotion render" >/dev/null || [ "$(free_gb)" -lt 4 ]; then echo "$(date) SKIP $COMP: resources busy"; exit 3; fi
touch "$OUT/.start"
caffeinate -i nice -n 5 npx remotion render src/index.ts "$COMP" "$OUT/video.mp4" --codec h264 --crf 18 --scale 1 --concurrency=2 --gl=angle --timeout=180000 --log=error
ffmpeg -v error -y -i "$OUT/video.mp4" -i "$EP/audio/mix.wav" -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 256k -ar 48000 -shortest -movflags +faststart "$OUT/final.mp4"
.venv/bin/python - "$COMP" <<'PY'
import re, json, sys, glob
comp = sys.argv[1]; d = "src/videos/ep-" + comp[2:].lower() if comp.startswith("Ep") else ""
src = open(glob.glob(f"src/videos/ep-{comp[2:]}/story.ts")[0]).read()
total = int(re.search(r"TOTAL = (\d+)", src).group(1))
shots = [{"id": int(i), "a": int(a), "b": int(b) if b != "TOTAL" else total} for i, a, b in re.findall(r"\{ id: (\d+), a: (\d+), b: (\w+),", src)]
xf = {int(k): int(v) for k, v in re.findall(r"(\d+): (\d+)", re.search(r"xfade: \{([^}]*)\}", src).group(1))}
flash = int(re.search(r"flashAt: (\d+)", src).group(1))
cuts = [[int(f), int(f)] for f in re.findall(r"cutTo\((\d+),", src)]
json.dump({"shots": shots, "xfade": [[s["a"] - xf[s["id"]] // 2, s["a"] + xf[s["id"]] // 2] for s in shots if s["id"] in xf],
           "flash": [flash, flash + 4], "planned": cuts}, open(f"out/{comp}/shots.json", "w"))
PY
.venv/bin/python scripts/short_qa.py "$OUT/final.mp4" "$OUT/qa" "$OUT/shots.json" > "$OUT/qa.txt" 2>&1 || true
cp "$OUT/final.mp4" "Vídeos listos/$NAME.mp4"
[ -f "$EP/copy.txt" ] && cp "$EP/copy.txt" "Vídeos listos/$NAME.txt"
find "$TMPDIR" -maxdepth 1 -name "remotion-webpack-bundle-*" -newer "$OUT/.start" -exec rm -rf {} + # only bundles this run created
echo "$(date) DONE $COMP -> Vídeos listos/$NAME.mp4"; head -6 "$OUT/qa.txt"
