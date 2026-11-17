---
name: reel-edit
description: Edit phone recordings or AI talking-head clips into publish-ready vertical reels without ever cutting voice: energy-safe pause removal with a cut report, transcript diff after every step, a phone-voice chain to -14 LUFS, word-by-word captions, Remotion extras (punch-ins, grain, lab cards, AI tag, end card), a real-frame storyboard, hook/body split with 7 hook variants, and a QA gate. Use when the user says "edita este vídeo", "edit this reel", "monta este clip", or hands over talking-head clips to turn into shorts.
---

# reel-edit

Turns a talking-head recording (phone or AI clips) into a finished 9:16 reel. Run from a Remotion project that has
`src/reel/ReelEdit.tsx` registered as the composition `Reel` (copy it from oddly-shorts/edit if missing) and a Python
with faster-whisper, numpy, scipy, pillow (`REEL_PY`, default `.venv/bin/python`). Scripts live in `scripts/`.

## Rules that never break
- **Never cut voice**: not a syllable, not the start or end of a word. Cuts happen only where the audio energy is below
  the clip's noise floor; edges move outward until they are quiet (final "s", soft onsets).
- **Never remove a sentence** the speaker says. Clear false starts (a sentence started and repeated right after) may go,
  but list them in the cut report and ask before removing them.
- **After every cut, re-transcribe and diff** against the original (`diff.py`): nothing may be missing. Transcriber
  variants ("one" vs "ones") are listed, never counted as passes when a word is really gone.
- **No music or colour filters** unless the user asks. (An original synthesized bed is available when a brief asks for music.)

## Phases (stop after the storyboard and wait for the user's OK before the final render)
0. **Tools**: ffmpeg (cut, mix, measure), Python + faster-whisper (word timestamps, local), numpy/scipy (energy, DSP),
   Pillow (contact sheets), Remotion (graphics, captions, render), tesseract (optional: OCR for the PII check).
   Install what is missing only with the user's permission.
1. **Cuts** `scripts/cuts.py <work> <clips…>`: word timestamps + 10 ms energy; removes pauses (70 ms kept after the
   last word, 60 ms before the next, 8 ms fades), starts each clip 60 ms before the real voice onset, joins clips with
   0.1 s on a held frame. Writes `cut.mov`, `cuts.json`, `cut_report.md` (what, how long, context). Then `diff.py`.
2. **Voice** `scripts/voice.py <in> <out.wav>`: HPF 70 Hz -> plosive control (dynamic cut < 150 Hz) -> -2.5 dB at
   280 Hz -> +2.5 dB at 3.8 kHz -> 2.5:1 compression -> two-pass loudnorm -14 LUFS, TP -1.5 dBTP. Prints before/after
   (LUFS, true peak, LRA, band energies). Then `diff.py` again on the processed voice.
3. **Captions** `scripts/captions.py <voice.wav> <captions.json> [--fix fixes.json] [--keys a,b]`: one word per card
   at the exact moment it is said; cards under 6 frames are paired (never across a period); one key word per sentence
   in the accent colour; spelling fixes never move timing.
4. **Template** `scripts/build_props.py <work> <series.json> .` then `node scripts/storyboard.mjs props.json storyboard.jpg`:
   per-clip framing (`zoom`, `ox`, `oy`) to keep devices, logos and laptop lids out of shot; punch-in alternating
   100 %/112 % every 3-4 s on a word; light grain; captions at 61-75 % of the height (under the face, out of the bottom
   20 %); lab cards (1.5 s, `at_word` = the word they illustrate, numbers only from the facts file); "AI-generated" tag
   for 3 s; 1.5 s end card. **Show the storyboard + cut report and wait for OK.**
5. **Hooks + final** `node scripts/render.mjs props.json <outdir> <name> hooks.json`: full reel (1080x1920, 30 fps, H.264
   10 Mbps, AAC), the hook (first sentence, cut between sentences) in 7 versions with different on-screen hook texts,
   the body, and a 1080x1920 thumbnail with hook text 1.
6. **QA** `scripts/qa_reel.py <final.mp4> <cuts.json> <allowed_numbers.txt>`: specs, loudness, black/frozen frames,
   transcript diff on the final file, OCR PII scan, every on-screen number against the allowed list, 3 check frames.

`scripts/run_series.sh <work> <clips…>` runs phases 1-4 in one go (with both diffs) and stops at the storyboard.

## Clip selection (AI clips)
Transcribe every clip and match it to the script by its dialogue. Discard: other characters, wrong wardrobe, any frame
with a device lid or brand logo you cannot crop out, duplicates (keep the take with the cleaner lip-sync). Report any
missing clip; never fake one.
