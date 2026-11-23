"""YouTube thumbnail (1280x720) from one of the ten text-free templates in thumbnails/ (own palette, vector, no
third-party art). Writes an SVG with the title set in the template's free area and, when a Chromium is available
(Remotion's chrome-headless-shell, or ODDLY_CHROME), a PNG next to it. Offline; no fonts are downloaded.

    python tools/thumbnail.py <01..10> "Title line one|line two" out.png [--hi word] [--tag "LAB RECEIPT"]

Rules: 2-6 words per line, at most 3 lines; only numbers from your facts file; `--hi` paints one word in the accent.
"""
import argparse, html, os, shutil, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
TPL = os.path.join(os.path.dirname(HERE), "thumbnails")
INK, PAPER, GREEN, ORANGE, BLUE, RED = "#0E1116", "#F7F5EF", "#88D445", "#F0592A", "#3B82F6", "#E5484D"
# free text area per template: x, y (first baseline), width, text colour, accent
AREA = {
    "01": (112, 250, 640, PAPER, GREEN), "02": (112, 250, 600, INK, RED), "03": (70, 160, 1080, PAPER, BLUE),
    "04": (70, 220, 760, INK, GREEN), "05": (112, 250, 640, PAPER, ORANGE), "06": (112, 250, 660, PAPER, ORANGE),
    "07": (112, 250, 700, PAPER, RED), "08": (70, 200, 1120, INK, GREEN), "09": (112, 250, 600, PAPER, BLUE),
    "10": (112, 250, 640, PAPER, GREEN),
}
FONT = '"Montserrat", "Arial Black", "Helvetica Neue", Arial, sans-serif'


def build(n: str, title: str, hi: str | None, tag: str | None) -> str:
    svg = open(os.path.join(TPL, f"tpl_{n}.svg"), encoding="utf-8").read()
    x, y, w, col, acc = AREA[n]
    lines = [l.strip() for l in title.split("|") if l.strip()][:3]
    size = min(96, int(w / max(6, max(len(l) for l in lines) * 0.62)))   # fit the longest line to the area
    parts = []
    if tag:
        parts.append(f'<text x="{x}" y="{y - size - 10}" font-family={html.escape(FONT, quote=True)!r} font-size="26" font-weight="800" '
                     f'letter-spacing="4" fill="{acc}">{html.escape(tag.upper())}</text>')
    for i, line in enumerate(lines):
        spans = "".join(
            f'<tspan fill="{acc if hi and w_.strip(".,!?").lower() == hi.lower() else col}">{html.escape(w_)} </tspan>' for w_ in line.split())
        parts.append(f'<text x="{x}" y="{y + i * int(size * 1.08)}" font-family={html.escape(FONT, quote=True)!r} font-size="{size}" '
                     f'font-weight="900" letter-spacing="-1">{spans}</text>')
    return svg.replace("</svg>", "\n".join(parts) + "\n</svg>")


def chrome() -> str | None:
    cands = [os.environ.get("ODDLY_CHROME"), "node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell",
             "/usr/bin/chromium", shutil.which("chromium") or "", shutil.which("google-chrome") or ""]
    return next((os.path.abspath(c) for c in cands if c and os.path.exists(c)), None)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("template"); ap.add_argument("title"); ap.add_argument("out")
    ap.add_argument("--hi"); ap.add_argument("--tag")
    a = ap.parse_args()
    n = a.template.zfill(2)
    if n not in AREA:
        print(f"template must be 01-10, got {a.template}", file=sys.stderr); return 2
    svg = build(n, a.title, a.hi, a.tag)
    out_svg = os.path.splitext(a.out)[0] + ".svg"
    open(out_svg, "w", encoding="utf-8").write(svg)
    exe = chrome()
    if not exe or not a.out.lower().endswith(".png"):
        print(f"wrote {out_svg}" + ("" if exe else " (no Chromium found: convert the SVG yourself)")); return 0
    with tempfile.TemporaryDirectory() as d:
        page = os.path.join(d, "t.html")
        open(page, "w").write(f'<html><body style="margin:0;background:{INK}">{svg}</body></html>')
        subprocess.run([exe, "--headless", "--disable-gpu", "--hide-scrollbars", f"--screenshot={os.path.abspath(a.out)}",
                        "--window-size=1280,720", f"file://{page}"], check=True, capture_output=True, timeout=60)
    if not os.path.exists(a.out):
        print(f"Chromium wrote no PNG; the SVG is at {out_svg}", file=sys.stderr); return 1
    print(f"wrote {out_svg} and {a.out}"); return 0


if __name__ == "__main__":
    sys.exit(main())
