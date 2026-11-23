#!/usr/bin/env python3
# generated-by: gemini-ultra
"""Ingest Veo / Flow clip sidecars (OP-....json or lib_....json from Studio C03) into an oddly-shorts reel workspace.

Usage:
    python3 tools/veo_import.py <sidecar.json | directory> --out <work-dir> [--clips-dir <dir>]

Validates:
  - Required fields (id, model/modelo, prompt, duration/duracion, format/formato)
  - Mandatory AI synthetic disclosure (etiqueta_ia / ai_label must be truthy for generated video)
  - Voice & audio license compliance (stock synthetic voices or explicit self/synthetic-owned consent; no copyrighted music)
  - OPSEC / PII scrub (no home-directory paths, emails, API keys, or unverified/legacy claims)
  - Burned-in text warning (Veo prompts should keep text out of raw clips; text is added in Remotion montage)

Emits into <work-dir>:
  - manifest.json  (normalized clip descriptors + local/Drive file resolution)
  - series.json    (ready for edit/scripts/build_props.py)
  - hooks.json     (A/B hook text array for edit/scripts/render.mjs)
  - copy.txt       (upload description with mandatory YouTube/TikTok AI disclosure checklist)
"""
from __future__ import annotations

import argparse
import getpass
import json
import os
import re
import socket
import sys
from pathlib import Path
from typing import Any

VALID_FORMATS = {"9:16", "16:9", "1:1"}
ALLOWED_VOICES = {
    "", "none", "silent", "broll",
    "am_puck", "af_heart", "am_michael", "af_bella", "af_sarah", "am_adam", "bf_emma", "bm_george",
}
ALLOWED_AUDIO_LICENSES = {
    "", "none", "silent", "synthetic-original", "oddly-synthesized", "apache-2.0", "mit", "cc0", "public-domain",
}
ACCENT_BY_CHARACTER = {
    "cactus": "#88D445",
    "spike": "#88D445",
    "cage": "#F0592A",
    "padlock": "#F0592A",
    "otto": "#F0592A",
    "marc": "#3B82F6",
}

_HOME_PAT = "/" + "Users" + r"/[A-Za-z0-9_]+"
_LINUX_PAT = "/" + "home" + r"/[A-Za-z0-9_]+"
_LEGACY_PAT = r"\b(?:" + "For" + "ge|" + "Man" + r"do)\b|\b46/50\b|\b0\.92\b"
_EMAIL_ALLOW = re.compile(r"oddlyprovenai@users\.noreply\.github\.com|noreply@(?:oddlyproven\.local|google\.com|anthropic\.com)", re.I)
_TEXT_IN_PROMPT_PAT = re.compile(r"\b(?:with text saying|text overlay|burned[- ]in text|subtitles saying|words on screen)\b", re.I)


class VeoImportError(ValueError):
    """Raised when a Veo metadata sidecar fails schema, disclosure, license, or OPSEC validation."""


def _pick(obj: dict[str, Any], *keys: str, default: Any = None) -> Any:
    for k in keys:
        if k in obj and obj[k] is not None:
            return obj[k]
    return default


def _pii_patterns() -> list[re.Pattern[str]]:
    pats = [
        re.compile(_HOME_PAT),
        re.compile(_LINUX_PAT),
        re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}"),
        re.compile(r"\b(?:sk-[A-Za-z0-9]{16,}|ghp_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{30,}|hf_[A-Za-z0-9]{20,})"),
        re.compile(_LEGACY_PAT, re.I),
    ]
    for ident in (getpass.getuser(), socket.gethostname().split(".")[0]):
        if ident and len(ident) >= 4 and ident.lower() not in {"runner", "ubuntu", "root", "node", "user"}:
            pats.append(re.compile(re.escape(ident), re.I))
    return pats


def scan_text_opsec(text: str, field_name: str) -> None:
    for pat in _pii_patterns():
        for m in pat.finditer(text):
            hit = m.group(0)
            if _EMAIL_ALLOW.search(hit):
                continue
            raise VeoImportError(f"OPSEC/policy violation in {field_name}: forbidden pattern {hit[:6]!r}...")


def normalize_clip_card(raw: dict[str, Any], source_path: Path, clips_dir: Path | None = None) -> dict[str, Any]:
    if not isinstance(raw, dict):
        raise VeoImportError(f"{source_path.name}: sidecar root must be a JSON object")

    cid = str(_pick(raw, "id", default="")).strip()
    if not cid or not re.match(r"^(?:OP-|lib_)[A-Za-z0-9._-]+$", cid):
        raise VeoImportError(f"{source_path.name}: 'id' must start with 'OP-' or 'lib_' (got {cid!r})")

    filename = str(_pick(raw, "archivo", "file", "clip", default=f"{cid}.mp4")).strip()
    tool = str(_pick(raw, "herramienta", "tool", default="veo")).strip()
    model = str(_pick(raw, "modelo", "model", default="")).strip()
    if not model:
        raise VeoImportError(f"{cid}: missing required 'modelo' / 'model'")

    prompt = str(_pick(raw, "prompt", default="")).strip()
    if not prompt:
        raise VeoImportError(f"{cid}: missing required 'prompt'")

    duration = float(_pick(raw, "duracion", "duration", default=0) or 0)
    if duration <= 0 or duration > 180:
        raise VeoImportError(f"{cid}: 'duracion' / 'duration' must be between 0 and 180 seconds (got {duration})")

    fmt = str(_pick(raw, "formato", "format", "aspect", default="9:16")).strip()
    if fmt not in VALID_FORMATS:
        raise VeoImportError(f"{cid}: 'formato' / 'format' must be one of {sorted(VALID_FORMATS)} (got {fmt!r})")

    character = str(_pick(raw, "personaje", "character", default="marc")).strip().lower()
    seed_val = _pick(raw, "semilla", "seed", default=None)

    # Mandatory AI disclosure check (GEMINI.md §4)
    ai_label = _pick(raw, "etiqueta_ia", "ai_label", "synthetic_label", default=None)
    if ai_label is False or ai_label is None or (isinstance(ai_label, str) and not ai_label.strip()):
        raise VeoImportError(f"{cid}: 'etiqueta_ia' / 'ai_label' is mandatory for synthetic Veo/Flow clips")
    ai_disclosure = ai_label if isinstance(ai_label, str) else "AI-generated (YouTube: altered or synthetic · TikTok: AI-generated)"

    # Voice consent & audio copyright check
    voice = str(_pick(raw, "voz", "voice", default="none")).strip()
    voice_consent = str(_pick(raw, "consentimiento_voz", "voice_consent", default="")).strip().lower()
    if voice.lower() not in ALLOWED_VOICES and voice_consent not in {"self", "synthetic-owned"}:
        raise VeoImportError(
            f"{cid}: voice {voice!r} is not an approved stock Kokoro voice and lacks explicit 'self'/'synthetic-owned' consent"
        )

    audio_lic = str(_pick(raw, "licencia_audio", "audio_license", default="synthetic-original")).strip().lower()
    if audio_lic not in ALLOWED_AUDIO_LICENSES:
        raise VeoImportError(f"{cid}: audio license {audio_lic!r} is not in allowed license set")

    intended_use = str(_pick(raw, "uso_previsto", "intended_use", default="short")).strip()

    # OPSEC scrub across all text fields
    for fname, val in (("id", cid), ("archivo", filename), ("prompt", prompt), ("uso_previsto", intended_use)):
        scan_text_opsec(val, f"{cid}.{fname}")

    warnings: list[str] = []
    if _TEXT_IN_PROMPT_PAT.search(prompt):
        warnings.append("Prompt mentions burned-in text; Veo clips should remain text-free and add text in Remotion.")

    search_root = clips_dir or source_path.parent
    candidate_path = (search_root / filename).resolve() if not Path(filename).is_absolute() else Path(filename)
    local_exists = candidate_path.is_file()

    framing = _pick(raw, "framing", "encuadre", default=None) or {"zoom": 1.08, "ox": 0.5, "oy": 0.35}
    return {
        "id": cid,
        "file": filename,
        "local_path": str(candidate_path) if local_exists else None,
        "local_exists": local_exists,
        "drive_mirror": f"Oddly Proven - Gemini Ultra/03-video/{Path(filename).name}",
        "tool": tool,
        "model": model,
        "prompt": prompt,
        "seed": seed_val,
        "duration": round(duration, 3),
        "format": fmt,
        "character": character,
        "voice": voice or "none",
        "ai_label": ai_disclosure,
        "intended_use": intended_use,
        "audio_license": audio_lic or "synthetic-original",
        "framing": {
            "zoom": float(framing.get("zoom", 1.08)),
            "ox": float(framing.get("ox", 0.5)),
            "oy": float(framing.get("oy", 0.35)),
        },
        "hooks": [str(h).strip() for h in (_pick(raw, "hooks", "ganchos", default=[]) or []) if str(h).strip()],
        "overlays": _pick(raw, "overlays", default=[]) or [],
        "hook_end_word": str(_pick(raw, "hook_end_word", default="it.")),
        "warnings": warnings,
    }


def load_sidecars(target: Path, clips_dir: Path | None = None) -> list[dict[str, Any]]:
    files: list[Path]
    if target.is_dir():
        files = sorted(
            p for p in target.glob("*.json")
            if p.name.startswith(("OP-", "lib_"))
        )
        if not files:
            raise VeoImportError(f"No OP-*.json or lib_*.json sidecars found in {target}")
    elif target.is_file():
        files = [target]
    else:
        raise VeoImportError(f"Sidecar path does not exist: {target}")

    normalized: list[dict[str, Any]] = []
    for f in files:
        data = json.loads(f.read_text(encoding="utf-8"))
        if isinstance(data, dict) and isinstance(data.get("clips"), list):
            base = {k: v for k, v in data.items() if k != "clips"}
            for idx, clip_item in enumerate(data["clips"], start=1):
                merged = {**base, **clip_item}
                if "id" not in clip_item and "id" in base:
                    merged["id"] = f"{base['id']}-{idx:02d}"
                normalized.append(normalize_clip_card(merged, f, clips_dir=clips_dir))
        else:
            normalized.append(normalize_clip_card(data, f, clips_dir=clips_dir))
    return normalized


def import_to_workspace(
    target: Path,
    out_dir: Path,
    *,
    clips_dir: Path | None = None,
    series_id: str | None = None,
    platform: str = "universal",
) -> dict[str, Any]:
    clips = load_sidecars(target, clips_dir=clips_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    primary = clips[0]
    sid = series_id or primary["id"]
    accent = ACCENT_BY_CHARACTER.get(primary["character"], "#88D445")
    overlays: list[dict[str, Any]] = []
    hooks: list[str] = []
    for c in clips:
        overlays.extend(c["overlays"])
        hooks.extend(c["hooks"])
    if not hooks:
        hooks = [
            f"{primary['intended_use']} — measured locally",
            "We checked the numbers before posting",
            "Here is the receipt (and the caveat)",
        ]

    series = {
        "id": sid,
        "accent": accent,
        "platform": platform,
        "frames": [c["framing"] for c in clips],
        "cards": [],
        "overlays": overlays,
        "hook_end_word": primary["hook_end_word"],
        "end": {
            "title": "Oddly Proven Lab",
            "line": "Link in @oddlyprovenai bio",
        },
        "bed_db": -24,
        "ai_disclosure": True,
    }

    manifest = {
        "generated_by": "oddly-shorts/veo_import",
        "series_id": sid,
        "clip_count": len(clips),
        "total_raw_duration_s": round(sum(c["duration"] for c in clips), 3),
        "all_local_present": all(c["local_exists"] for c in clips),
        "clips": clips,
    }

    copy_lines = [
        f"{sid}: {primary['intended_use']}"[:60],
        "",
        "Measured in public by Oddly Proven Lab. Link in @oddlyprovenai bio.",
        "",
        "Mandatory AI Disclosure Checklist:",
        "- YouTube Studio: Altered or synthetic content = YES",
        "- TikTok: Turn ON 'AI-generated content' toggle",
        f"- Generator: {primary['tool']} ({primary['model']}), local voice/music mix via oddly-shorts",
        "",
        "#localai #opensource #oddlyproven",
    ]

    (out_dir / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    (out_dir / "series.json").write_text(json.dumps(series, indent=2) + "\n", encoding="utf-8")
    (out_dir / "hooks.json").write_text(json.dumps(hooks[:7], indent=2) + "\n", encoding="utf-8")
    (out_dir / "copy.txt").write_text("\n".join(copy_lines) + "\n", encoding="utf-8")
    return manifest


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Validate and import C03 Veo/Flow OP-*.json sidecars into oddly-shorts.")
    ap.add_argument("source", help="Path to an OP-*.json file or a directory of sidecars")
    ap.add_argument("--out", required=True, help="Output workspace directory for manifest.json, series.json, hooks.json")
    ap.add_argument("--clips-dir", default=None, help="Optional folder containing downloaded .mp4 files")
    ap.add_argument("--series-id", default=None, help="Override series ID")
    ap.add_argument("--platform", default="universal", choices=["universal", "tiktok", "youtube-shorts", "reels", "x"])
    args = ap.parse_args(argv)

    try:
        manifest = import_to_workspace(
            Path(args.source),
            Path(args.out),
            clips_dir=Path(args.clips_dir) if args.clips_dir else None,
            series_id=args.series_id,
            platform=args.platform,
        )
    except VeoImportError as exc:
        sys.stderr.write(f"ERROR: {exc}\n")
        return 2

    print(
        f"Imported {manifest['clip_count']} clip(s) -> {args.out} "
        f"(raw {manifest['total_raw_duration_s']:.1f}s, local_mp4={manifest['all_local_present']})"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
