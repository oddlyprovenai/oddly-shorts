# Thumbnail templates

Ten text-free 1280x720 YouTube thumbnail layouts in the Oddly Proven palette (ink #0E1116, paper #F7F5EF, lab green
#88D445, cage orange #F0592A, signal blue #3B82F6, warning red #E5484D). Pure vector, no fonts, images or third-party
art inside. `tools/thumbnail.py` sets the title in each template's free area and exports a PNG with a local Chromium.

| # | layout | use it for |
|---|---|---|
| 01 | lab receipt card + cactus (green) | a measured SPIKE result |
| 02 | paper + red falling line + X stamp | "we got it wrong" / a rejected run |
| 03 | split screen blue vs green, title bar on top | hardware or before/after comparisons |
| 04 | paper card + host portrait badge | host-led explainers |
| 05 | Cage padlock (orange) | Cage, privacy, local-only |
| 06 | three-step pipeline | how something works |
| 07 | red bars + cactus | numbers that look too good |
| 08 | paper + code card | developer / repo topics |
| 09 | router graph (blue) | routing, specialists |
| 10 | wrong -> right cards | corrections, myths |

```bash
python tools/thumbnail.py 02 "We rejected|our own|medical AI" thumb.png --hi rejected --tag "we got it wrong"
```
Only numbers from your facts file. Made by Gemini for Oddly Proven Lab, reviewed and adopted here (MIT, like the repo).
