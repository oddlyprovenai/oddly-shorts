---
name: oddly-shorts
description: Make finished 55-65 s vertical animated shorts (9:16, plus 1:1 and 16:9 exports) with flat bean-head cartoon characters in a colourful inked 3D world, rendered locally with three.js inside Remotion: product ads, devlogs, demos and true-story explainers with a consistent host character, a live-screen tech desk (terminal, code, app screenshots, charts), word-synced subtitles, local neural voice (Kokoro) with word timing (faster-whisper), an original synthesized score + SFX, and a QA gate (loudness, black frames, subtitle sync, PII scan). Use when the user asks for an animated short, a product/feature ad, a "building in public" devlog video, a cartoon explainer, or says "use oddly-shorts".
---

# oddly-shorts

Local, free pipeline for animated vertical shorts. Built on the MIT skill **claude-animated-shorts** by Mr omi (its
toon / ink / lens / grade renderer and synthesized audio), extended with a character kit, tech-ad scene library,
subtitles, overlays, ad formats, one-command tooling and a QA gate. Everything runs on your machine.

## 0. Setup (once per Remotion project)
1. Requirements: Node 18+, Python 3.10+, ffmpeg; optional tesseract (frame PII scan). macOS or Linux, 16 GB RAM+.
2. From the Remotion project root: `path/to/oddly-shorts/tools/oddly init` (copies `kit/` to `src/videos/oddly-kit`,
   pins npm deps, creates `.venv` with kokoro-onnx / faster-whisper / numpy / scipy / pillow, downloads the Kokoro
   voice model into `models/`).
3. Register compositions in `src/Root.tsx`: `<Composition id="MyShort" component={Short} durationInFrames={FRAMES} fps={30} width={1080} height={1920} />`.

## 1. Pick a format (templates/)
| format | shape (55-65 s) |
|---|---|
| `demo` | hook on the product's payoff -> what it is -> 3 features on live screens -> proof number -> CTA end card |
| `problem-solution` | the pain (relatable) -> why it happens -> the product fixes it (screens) -> proof -> CTA |
| `devlog` | "day N building X" -> what I tried -> what broke -> the fix / the number -> next step -> CTA |
| `launch` | "it's out" -> the one new thing -> 2 details -> who it's for -> CTA |
| `benchmark` | the question -> setup (hardware, test) -> numbers revealed one by one (facts file only) -> caveat -> CTA |
| `dialogue` | host + talking cactus buddy banter (the viral "person talks to their AI" shape): pain -> proof on screens -> number reveals -> "Link in bio"; 30-40 s, a camera cut on every line |
| `story` | true surprising story (hook, setting, escalation, snap, "Luckily/Unluckily", analogy, consequence, callback) + a one-line bridge to the product |
Write **three hook variants** at the top of SCRIPT.md for A/B tests; voice the best one.

## 2. Facts first
- Every number in narration, subtitles, overlays, screens or captions must come from a facts file you were given
  (or a source you quote in SCRIPT.md). Never invent benchmarks, users, outputs or commands.
- Terminal screens show only real commands of the product (check its README) and `#` comment lines for results;
  the prompt is always the generic `lab@mac-studio ~ %`. Never real user names, host names, paths, e-mails or keys.
- No real people's likeness and no third-party logos; draw your own cameos (kit/cameos.ts).

## 3. Pipeline (one command per step, from the project root)
1. `oddly new <slug> <format>` -> `episodes/<slug>/` (script, say.json, audio.py, copy.txt, SCRIPT.md) and
   `src/videos/<slug>/` (story.ts, plan.json for ad formats, index.tsx).
2. Script: `episodes/<slug>/voice/script.txt` is the narration as displayed; mark one key word per sentence with
   `*asterisks*` (subtitle highlight); `say.json` maps numbers / acronyms to how they are spoken. 140-190 words.
3. `oddly voice <slug>`: Kokoro (local) -> voice.wav (1.1x pace, pauses capped at 0.32 s, -20 LUFS) ->
   faster-whisper word times -> `captions.json` (1-3 word cards, key word, per-word times). Aim for 50-62 s.
4. Scenes. Ad formats: edit `plan.json` only: `segments` (camera preset per beat: host / medium / screen / side /
   over / wide), `expr` (host expression timeline), `screens` (terminal / code / shot / mock / bars / split per
   screen and time), `overlays` (number reveal, lower third, end card), `images` (screenshots under public/).
   Story format: write sets + cameras in story.ts (see examples/vasa, examples/clever-hans).
5. `oddly keyframes <Comp> <slug>`: one still per camera key with safe-zone guides -> `out/<slug>/keyframes.jpg`.
   Look at it. Fix: subject outside the frame (a 9:16 frame sees only about +-11.6 deg horizontally at fov 40),
   camera inside geometry, props hiding faces, text in the red UI zones. Repeat until clean.
6. `oddly audio <slug>`: original score (march / pizzicato / stingers / music box / button) + SFX on your cue
   times, voice untouched, music ducked 3 dB under speech, SFX -6 dB, -14 LUFS, <= -1.2 dBTP.
7. `oddly render <Comp> <slug> "<NN - Title>" [outdir]`: waits for free RAM and no other render, renders
   1080x1920, muxes, runs the **QA gate** (tools/qa.py) and only if it passes exports 9:16 + 1:1 + 16:9 and copies
   `copy.txt` (title <= 60 chars, description, sources, 3-5 hashtags, an "AI-assisted animation" note).

## 3b. Dialogue ads and voices
- Script lines are `G| ...` (host) and `C| ...` (buddy). `voice/voices.json` gives each speaker a voice profile:
  `{"G": {"engine": "kokoro", "voice": "am_puck", "speed": 1.08, "consent": "stock voice (Kokoro-82M, Apache-2.0)"}}`.
- **Consent is mandatory.** A cloned voice is allowed only with consent `"self"` (your own voice) or
  `"synthetic-owned"` (an AI voice you generated and own). Never clone a creator, a public figure or anyone whose
  video you downloaded: pick the closest stock voice instead. voice.py refuses profiles without consent.
- `oddly voice <slug>` writes `voice/lines.json` (who speaks when). `oddly plan <slug>` turns it plus `beats.json`
  (camera per line, top tags, screens, number reveals, buddy moods) into `plan.json`: a cut on every line.
- The buddy (kit/buddy.ts) lip-syncs to its lines, blinks, waves and can hold a padlock; it is our own cactus, never
  a third-party logo or a real product's mascot. The top `tag` overlay ("STEP 1 · ONE COMMAND") orients the viewer.

## 3c. Funny true-fact shorts (reach)
Absurd claim in the first second, deadpan narrator, escalation with exact sourced numbers, a "Wait. It gets
worse." re-hook around 15 s, one visual gag per beat, a callback punchline, end card. See templates/story.

## 4. The host (kit/character.ts)
Characters live in `kit/characters/<name>.json` (skin, hair style + colour, glasses, top + shirt, trousers, shoes,
pin, pocket prop, build, fixed head seed). `host(out, cam, CHARACTER, pos, t, exprTimeline)` draws the same person
every time; expression changes are hidden behind a 4-frame blink. Presets: `otto` (AI engineer, mustard cardigan,
round glasses, cactus pin, notebook), `guru` (AI guru for ads: messy dark hair, round glasses, stubble, charcoal
overshirt over a cream tee, cactus pin) and `maya` (designer). Never give a bystander the host's colour combination.

## 5. Look rules (kept from the bridge renderer)
Ink pass before lens blur; lens blur per shot (`dof`): close-ups 10-14 px, mediums 7-10, wides 0; bloom only on HDR
emissives (spark fx); every hold creeps (no static hold >= 12 f, or QA flags a freeze); cuts on big reframes,
smootherstep glides of 18-40 f otherwise; impact kicks flip sign every frame for 7 f. Subtitles stay between 55 and
72 % of the height; overlays avoid the top 12 % and bottom 20 % (platform UI).

## 6. Resources
One render at a time. `ODDLY_CONCURRENCY=1` for 16 GB machines (2 is fine on 32 GB+). `ODDLY_MIN_FREE_GB` (4)
gates every render. Bundles go to `~/remotion-tmp` and are deleted after each render. Long renders: run
`oddly render` under `nohup` (it keeps the Mac awake with caffeinate).

## 7. Gotchas
- R3F clamps dpr >= 1: stills at 0.5 still render a 1080x1920 buffer; pixel sizes scale with height / 1920.
- Kids (short build) disappear behind podiums and fences; put them in front.
- A dispose() error on unmount ("fx.ink.dispose is not a function") is guarded in Short.tsx: keep the guard.
- The QA "frame jumps" list ignores cuts, caption changes, overlay starts and the flash; anything left needs your eyes.
