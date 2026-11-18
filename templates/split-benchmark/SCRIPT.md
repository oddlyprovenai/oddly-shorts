# split-benchmark

## Verified Facts (`FACT-SHEET.md`)
- 16 GB CPU only: `6.2 tok/s` at 1K prompt, `5.1 tok/s` at 8K; first token `52 s` at 1K, `13 min` at 8K — `README.md`
- Apple M4 Max: `82 tok/s` at 1K, `80 tok/s` at 8K, `3.6 GiB` RSS — `README.md`

## Hook variants
- A: What does local AI actually feel like on a 16 GB CPU laptop versus Apple Silicon?
- B: Nobody shows the 8K prompt wait time on CPU-only laptops—so we measured it.
- C: Two machines, one 4B model, zero cloud GPUs.
