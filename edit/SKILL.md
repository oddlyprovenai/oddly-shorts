---
name: reel-edit
description: Edit phone recordings or AI talking-head clips into publish-ready vertical reels without ever cutting voice: energy-safe pause removal with a cut report, transcript diff after every step, a phone-voice chain to -14 LUFS, word-by-word captions, Remotion extras (punch-ins, grain, face/shoulder-anchored animated overlays that illustrate what is said, AI tag, end card), a real-frame storyboard, hook/body split with 7 hook variants, and a QA gate. Use when the user says "edita este vídeo", "edit this reel", "monta este clip", or hands over talking-head clips to turn into shorts.
---

# reel-edit

Turns a talking-head recording (phone or AI clips) into a finished 9:16 reel. Run from a Remotion project that has
`src/reel/ReelEdit.tsx` (+ `anchors.ts`, `fx.tsx`, `overlays.tsx`; all in `remotion/`) registered as the composition
`Reel` (copy them if missing) and a Python
with faster-whisper, numpy, scipy, pillow (`REEL_PY`, default `.venv/bin/python`). Scripts live in `scripts/`.

## Rules that never break
- **Never cut voice**: not a syllable, not the start or end of a word. Cuts happen only where the audio energy is below
  the clip's noise floor; edges move outward until they are quiet (final "s", soft onsets).
- **Never remove a sentence** the speaker says. Clear false starts (a sentence started and repeated right after) may go,
  but list them in the cut report and ask before removing them.
- **After every cut, re-transcribe and diff** against the original (`diff.py`): nothing may be missing. Transcriber
  variants ("one" vs "ones") are listed, never counted as passes when a word is really gone.
- **No music or colour filters** unless the user asks. (An original synthesized bed is available when a brief asks for music.)
- **Illustrate, don't repeat.** No full-screen cutaways that hide the speaker. Graphics appear *while* they keep
  talking, above the head or beside a shoulder, and show the idea (a bar growing from 31.9 to 67.0, a padlock clicking
  shut as RAM drops to 0, a receipt printing ticks), never the sentence as text. Never over the face or mouth, never in
  the bottom 20 %, never under the captions. Only real numbers from the facts file, and never "rolled" through
  intermediate values (OCR and viewers would read numbers that are not true).

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
   100 %/112 % every 3-4 s on a word, capped so the chin stays above the captions; light grain; captions right under
   the chin (56-79 % of the height), moved above the head while a chest card is up; anchored overlays (below);
   "AI-generated" tag for 3 s; 1.5 s end card. **Show the storyboard + cut report and wait for OK.**
   `node scripts/still.mjs props.json out.jpg 3.4,7.6 [scale]` renders single frames for a closer look.

## Anchored overlays (`overlays` in series.json)
`scripts/face.swift` (Apple Vision, local, run by build_props.py) tracks the face every 0.2 s; the composition maps it
through each clip's crop and the punch-in, so overlays follow the head. Anchors: `head` (over the hair), `rshoulder` /
`lshoulder` (beside the head, at chin height), `chest` (below the chin; captions jump above the head meanwhile). The
placer tries the preferred anchor, then the others, then shrinks to 70 %; it never covers the face (padded for ears and
chin), the captions, the hook text, the AI tag or the bottom 20 %. The anchor chosen at the pop stays (no jumping).
Entry is a spring pop, exit a 0.25 s shrink-fade, with a 2 px float while on screen.

```json
{"kind": "bar", "at_word": "from", "dur": 4.0, "anchor": "chest",
 "d": {"title": "Medicine · 2,318 questions", "before": 31.9, "after": 67.0, "beforeText": "31.9%", "afterText": "67.0%",
       "beforeCap": "base", "afterCap": "adapter", "afterAt": "to", "pill": "general knowledge −0.62", "pillAt": "general"}}
```
Word references (`"word"` or `"word#2"`) under `at` or any key ending in `At` become seconds from the overlay start.

| kind | shows | data |
|---|---|---|
| `icon` | one big icon (+ pill) popping | `icon`, `color`, `label` |
| `icons` | a row popping one per word; links break (red dashes) at `breakAt` | `items[{icon,label,color,at}]`, `breakAt` |
| `stamp` | ✓ / ✗ rubber stamp slammed on | `text`, `ok` |
| `bar` | before/after bars growing, values appear when each bar lands, optional pill | see above |
| `meter` | RAM meter + padlock; eases between steps, padlock clicks on `locked` | `title`, `max`, `steps[{at,value,text,label,locked}]` |
| `lock` | padlock clicking shut next to an icon, then a pill | `icon`, `label`, `closeAt` |
| `receipt` | paper receipt printing out of thin air, a tick per line | `title`, `lines[{text,at,ok}]` |
| `chip` | glowing chip with a size on it (e.g. 16 GB) + pill + late icon | `big`, `label`, `icon`, `iconAt` |
| `dots` | n dots lighting up around one centre pill, then the real figure | `n`, `center`, `label` |
| `flat` | a curve that wiggles and goes flat (no edge) | `title`, `label` |

Icons: cross, up, down, check, x, coin, habit, heart, folder, laptop, rocket, eye, wifi_off, bot, receipt.
Palette: ink #0E1116, lab green #88D445, cage orange #F0592A, glass cards with blur, soft shadow and a tinted border.
The same library drives the 3D host in oddly-shorts (`kit/Anchored.tsx`: the head is projected through the shot camera).
5. **Hooks + final** `node scripts/render.mjs props.json <outdir> <name> hooks.json`: full reel (1080x1920, 30 fps, H.264
   10 Mbps, AAC), the hook (first sentence, cut between sentences) in 7 versions with different on-screen hook texts,
   the body, and a 1080x1920 thumbnail with hook text 1.
6. **QA** `scripts/qa_reel.py <final.mp4> <cuts.json> <allowed_numbers.txt>`: specs, loudness, black/frozen frames,
   transcript diff on the final file, OCR PII scan, every on-screen number against the allowed list, 3 check frames.
   Then look at a frame in the middle of every overlay (`still.mjs`): no graphic on the face, captions readable.

`scripts/run_series.sh <work> <clips…>` runs phases 1-4 in one go (with both diffs) and stops at the storyboard.

## Clip selection (AI clips)
Transcribe every clip and match it to the script by its dialogue. Discard: other characters, wrong wardrobe, any frame
with a device lid or brand logo you cannot crop out, duplicates (keep the take with the cleaner lip-sync). Report any
missing clip; never fake one.
