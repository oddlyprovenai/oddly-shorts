# diagram-explain

## Verified Facts (`FACT-SHEET.md`)
- Encrypted vault (`AES-256-GCM`, key wrapped with `scrypt`), listens on `127.0.0.1` only — `cage/README.md`
- RAM: `0 MB` when closed (no background process), `~20 MB` locked, `~23 MB` open — `FACT-SHEET.md`

## Hook variants
- A: Why does a desktop dashboard need a background process eating RAM when you are not looking at it?
- B: Zero megabytes when closed—here is the four-box architecture behind Cage.
- C: How to ship a macOS web app without bundling a 300 MB browser.
