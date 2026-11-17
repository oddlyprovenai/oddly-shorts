#!/bin/bash
# reel-edit · all phases up to the storyboard for one series (no final render: that waits for the owner's OK).
#   run_series.sh <work dir with series.json [fixes.json] [keys.txt]> <clip1> [clip2 ...]
# Run from the Remotion project root; PY = python with faster-whisper/numpy/scipy/pillow.
set -euo pipefail
S="$(cd "$(dirname "$0")" && pwd)"; W="$1"; shift
PY="${REEL_PY:-.venv/bin/python}"
"$PY" "$S/cuts.py" "$W" "$@" | tee "$W/f1.log"
"$PY" "$S/diff.py" "$W/cut.mov" "$W/cuts.json" | tee "$W/diff_f1.json"          # F1 check: nothing missing
"$PY" "$S/voice.py" "$W/cut.mov" "$W/voice.wav" | tee "$W/f2.json"
FIX=(); [ -f "$W/fixes.json" ] && FIX=(--fix "$W/fixes.json")
KEYS=""; [ -f "$W/keys.txt" ] && KEYS="$(cat "$W/keys.txt")"
"$PY" "$S/captions.py" "$W/voice.wav" "$W/captions.json" ${FIX[@]+"${FIX[@]}"} --keys "$KEYS" | tee "$W/f3.log"
"$PY" "$S/diff.py" "$W/voice.wav" "$W/cuts.json" | tee "$W/diff_f2.json"         # after the voice chain, still nothing missing
"$PY" "$S/build_props.py" "$W" "$W/series.json" .
node "$S/storyboard.mjs" "$W/props.json" "$W/storyboard.jpg"
find "${REMOTION_TMP:-$HOME/remotion-tmp}" -maxdepth 1 -name "remotion-webpack-bundle-*" -mmin -30 -exec rm -rf {} + 2>/dev/null || true
echo "storyboard: $W/storyboard.jpg (waiting for OK before the final render)"
