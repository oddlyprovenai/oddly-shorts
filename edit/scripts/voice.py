"""F2 · Voice chain for a phone / AI-clip voice, with before/after numbers.

    python voice.py <in media> <out.wav> [--lufs -14] [--tp -1.5]

Chain: high-pass 70 Hz -> plosive control (dynamic cut below 150 Hz, only when a "p"/"b" burst exceeds the threshold)
-> low-mid cut 2.5 dB at 280 Hz (boom) -> presence +2.5 dB at 3.8 kHz -> gentle compression (2.5:1, -20 dB, 8/120 ms)
-> two-pass loudness normalisation to -14 LUFS integrated, true peak below -1 dBTP. No music, no effects.
Prints integrated loudness, true peak, loudness range and the energy in three bands, before and after.
"""
import json, re, subprocess, sys
import numpy as np

src, dst = sys.argv[1], sys.argv[2]
arg = lambda k, d: float(sys.argv[sys.argv.index(k) + 1]) if k in sys.argv else d
LUFS, TP = arg("--lufs", -14.0), arg("--tp", -1.5)
CHAIN = ("highpass=f=70:poles=2,"
         "adynamicequalizer=dfrequency=110:dqfactor=0.8:tfrequency=110:tqfactor=0.8:threshold=0.06:ratio=3:attack=1:release=40:mode=cutabove,"
         "equalizer=f=280:t=q:w=1.1:g=-2.5,equalizer=f=3800:t=q:w=1.0:g=2.5,"
         "acompressor=threshold=-20dB:ratio=2.5:attack=8:release=120:makeup=1.5")


def stats(path):
    e = subprocess.run(["ffmpeg", "-nostats", "-i", path, "-map", "0:a:0", "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
    t = e[e.rfind("Summary:"):]
    g = lambda k: float(re.search(k + r":\s+(-?[\d.]+)", t).group(1))
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", "48000", "-f", "s16le", "-"], capture_output=True).stdout
    x = np.frombuffer(raw, np.int16).astype(np.float32) / 32768
    X = np.abs(np.fft.rfft(x)) ** 2; f = np.fft.rfftfreq(len(x), 1 / 48000); tot = X.sum() + 1e-12
    band = lambda a, b: round(float(10 * np.log10(X[(f >= a) & (f < b)].sum() / tot + 1e-12)), 1)
    return {"LUFS": g("I"), "true_peak_dBTP": g("Peak"), "LRA_LU": g("LRA"), "below_100Hz_dB": band(20, 100), "boom_200_400Hz_dB": band(200, 400), "presence_3_5kHz_dB": band(3000, 5000)}


before = stats(src)
m = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", src, "-af", f"{CHAIN},loudnorm=I={LUFS}:TP={TP}:LRA=11:print_format=json", "-f", "null", "-"], capture_output=True, text=True).stderr
j = json.loads(m[m.rfind("{"):m.rfind("}") + 1])
ln = (f"loudnorm=I={LUFS}:TP={TP}:LRA=11:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}"
      f":measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-vn", "-af", f"{CHAIN},{ln},aresample=48000", "-ar", "48000", "-ac", "2", "-c:a", "pcm_s24le", dst], check=True)
after = stats(dst)
print(json.dumps({"before": before, "after": after}, indent=1))
