# Shared sound for Oddly Proven episodes: original score building blocks (march, pizzicato tension, stingers, music
# box, button) on the cartoon-3d-short skill's synthesized instruments, simple synthesized SFX, and the mix
# (voice unchanged, music bed ducked 3 dB under speech, SFX -6 dB vs the voice, -14 LUFS, true peak <= -1.2 dBTP).
# An episode's audio.py builds a Score + Sfx for its own cue times, then calls mix(ep_dir, score, sfx).
import os, sys, json
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "audio"))
import numpy as np
from dsp import SR, ns, rng, lp, hp, bp, pan, place, fades, colored, read_wav, write_wav, integrated, true_peak, dbg, norm_to, widen
import instruments as I
import sfx_gen as G

F = I.m2f
Q = 0.5
CH = {"F": [41, 48, 53, 57, 60], "C7": [36, 43, 46, 52, 55], "Bb": [34, 46, 50, 53, 58], "Dm": [38, 45, 50, 53, 57],
      "A7": [33, 45, 49, 52, 55], "Gm": [43, 50, 55, 58, 62], "Am": [33, 45, 48, 52, 57], "G": [43, 50, 55, 59, 62], "C": [36, 48, 52, 55, 60]}
MOTIFS = {
    "march": [(0, 72, 1), (1, 69, 0.5), (1.5, 70, 0.5), (2, 72, 1), (3, 77, 1), (4, 76, 0.5), (4.5, 74, 0.5), (5, 72, 1), (6, 69, 1), (7, 72, 1)],
    "sly": [(0, 69, 0.5), (0.5, 72, 0.5), (1, 76, 1), (2.5, 74, 0.5), (3, 72, 1), (4, 69, 0.5), (4.5, 67, 0.5), (5, 69, 1.5), (7, 64, 1)],
}


class Score:
    def __init__(self, dur, seed=1):
        self.dur, self.N, self.R = dur, ns(dur), rng(seed)
        self.b = {k: np.zeros((2, self.N)) for k in ("bass", "chords", "mel", "perc")}

    def oompah(self, t0, t1, prog, vel=0.55):
        k, t = 0, t0
        while t < t1 - 1e-6:
            ch = CH[prog[(k // 4) % len(prog)]]
            if k % 2 == 0:
                place(self.b["bass"], pan(I.brass(F(ch[0] + (0 if k % 4 == 0 else 7)), Q * 0.8, vel, self.R, "tuba"), -0.1), t)
            else:
                for m in ch[2:]:
                    place(self.b["chords"], pan(I.brass(F(m), Q * 0.35, vel * 0.45, self.R, "stab"), 0.25), t, 0.6)
                place(self.b["perc"], pan(I.snare(vel * 0.35, self.R, 0.2, snappy=0.6), 0.1), t, 0.5)
            k += 1
            t += Q

    def melody(self, t0, t1, motif="march", transpose=0, fn="glock", vel=0.5):
        t = t0
        while t < t1 - 1e-6:
            for beat, m, _ in MOTIFS[motif]:
                tm = t + beat * Q
                if tm >= t1:
                    break
                x = {"glock": lambda: I.glock(F(m + transpose), vel, self.R, 1.2), "musicbox": lambda: I.musicbox(F(m + transpose), vel, self.R, 1.4),
                     "vibes": lambda: I.vibes(F(m + transpose), vel, self.R, 1.4)}[fn]()
                place(self.b["mel"], pan(x, 0.2), tm)
            t += 8 * Q

    def plucks(self, t0, t1, prog, vel=0.45):
        t, k = t0, 0
        while t < t1 - 1e-6:
            ch = CH[prog[(k // 8) % len(prog)]]
            m = ch[[0, 3, 2, 3, 1, 3, 2, 4][k % 8]] + (12 if k % 8 in (3, 5) else 0)
            place(self.b["chords"], pan(I.pluck(F(m), vel * (1.0 if k % 2 == 0 else 0.7), self.R, 0.5), -0.2 + 0.4 * (k % 2)), t)
            t += Q / 2
            k += 1

    def lucky(self, t):      # rising glock arpeggio
        for k, m in enumerate((74, 77, 81, 86)):
            place(self.b["mel"], pan(I.glock(F(m), 0.6, self.R, 1.0), 0.3), t + k * 0.06)

    def unlucky(self, t):    # two falling tuba notes
        place(self.b["bass"], pan(I.brass(F(45), 0.55, 0.7, self.R, "tuba", fall=-5.0), -0.1), t)
        place(self.b["bass"], pan(I.brass(F(44), 0.7, 0.7, self.R, "tuba", fall=-7.0), -0.1), t + 0.5)

    def roll_to_crash(self, t0, t_hit):
        for tm, v in I.snare_roll(t0, t_hit - 0.04, 0.15, 0.9, self.R):
            place(self.b["perc"], pan(I.snare(v, self.R, 0.2, buzz=True), 0.05), tm, 0.7)
        place(self.b["perc"], I.cymbal(0.9, self.R, 2.6), t_hit)
        place(self.b["bass"], pan(I.timpani(F(38), 0.95, self.R, 2.0), 0), t_hit)

    def pad(self, t, dur, chord="F", vel=0.45, att=0.5):
        place(self.b["chords"], I.pad([F(m) for m in CH[chord][1:]], dur, vel, self.R, att=att, rel=0.9), t)

    def triangle(self, t, vel=0.45):
        place(self.b["perc"], pan(I.triangle(vel, self.R, 1.3), 0), t)

    def deflate(self, t):    # sad trombone-ish tuba fall
        place(self.b["bass"], pan(I.brass(F(41), 0.9, 0.75, self.R, "tuba", fall=-12.0), 0), t)

    def button(self, t, chord="F"):
        for m in CH[chord]:
            place(self.b["chords"], pan(I.brass(F(m + 12 if m < 40 else m), 0.9, 0.7, self.R, "horn"), 0), t, 0.7)
        place(self.b["perc"], I.cymbal(0.45, self.R, 1.8, bright=0.8), t)

    def render(self):
        b = self.b
        return fades(lp(b["bass"] + b["chords"] * 0.8 + b["mel"] * 0.7 + b["perc"] * 0.6, 12000, 1), 0.01, 0.6)


class Sfx:
    def __init__(self, dur, seed=7):
        self.N, self.R = ns(dur), rng(seed)
        self.beds, self.ev = np.zeros((2, self.N)), np.zeros((2, self.N))

    def bed(self, x, t, g=1.0):
        place(self.beds, x if np.ndim(x) == 2 else widen(x, self.R), t, g)

    def event(self, x, t, g=1.0, p=0.0):
        place(self.ev, pan(x, p) if np.ndim(x) == 1 else x, t, g)

    # generators
    def breeze(self, dur, level=0.6):
        return G.breeze(dur, self.R, level)

    def water(self, dur, close=1.0):
        return G.water_bed(dur, self.R, close)

    def murmur(self, dur, voices=10):
        out = np.zeros((2, ns(dur)))
        for v in range(voices):
            base, scale = (self.R.uniform(100, 150), 1.0) if v % 3 else (self.R.uniform(260, 320), 1.3)
            y = G.babble(dur, self.R, base, scale, self.R.uniform(3.6, 4.8), self.R.uniform(0.55, 0.8), fmax=3400)
            out += pan(lp(y, 3000, 1) * self.R.uniform(0.3, 1.0), self.R.uniform(-0.8, 0.8))
        return fades(out, 0.3, 0.6)

    def whoosh(self, dur=0.4, peak=0.2):
        return G.whoosh(dur, self.R, peak, 500, 2600)

    def cheer(self, dur=2.0, people=20):
        return G.applause(dur, self.R, people) * 0.6

    def oof(self):
        return G.oof(self.R)

    def whoa(self):
        return G.whoa(self.R)

    def creak(self, dur=1.2):
        return G.creak(dur, self.R)

    def crack(self):
        return G.wood_crack(self.R)

    def splash(self):
        return G.splash_big(self.R)

    def thump(self):
        return G.push_thump(self.R)

    def clink(self, f0=2100):
        return G.clink(self.R, f0, 0.12)

    def hoof(self):
        return G.hammer_hit(self.R, 0.4)

    def scribble(self, dur=0.6):
        n = ns(dur)
        x = bp(colored(n, self.R, 0.0), 2500, 7000) * (0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 9 * np.arange(n) / SR)))
        return fades(x * 0.5, 0.01, 0.05)

    def pop(self):
        return G.clink(self.R, 900, 0.08)

    def keys(self, dur, rate=11.0):
        """keyboard typing: short filtered clicks at a jittered rate"""
        out = np.zeros(ns(dur)); t = 0.0
        while t < dur - 0.05:
            n = ns(0.03); c = bp(colored(n, self.R, 0.0), 1800, 6000) * np.exp(-np.arange(n) / ns(0.006)) * self.R.uniform(0.5, 1.0)
            i = ns(t); m = min(n, len(out) - i); out[i:i + m] += c[:m]; t += self.R.uniform(0.5, 1.5) / rate
        return out * 0.6


def duck(N, words, depth=-3.0):
    t = np.arange(N) / SR
    g = np.ones(N)
    for w in words:
        g[(t >= w["start"] - 0.08) & (t < w["end"] + 0.12)] = dbg(depth)
    k = ns(0.15)
    return np.convolve(g, np.ones(k) / k, mode="same")


def limiter(x, ceil_db=-1.7):
    from scipy.ndimage import minimum_filter1d, uniform_filter1d
    pk = np.max(np.abs(x), axis=0)
    need = np.minimum(1.0, dbg(ceil_db) / np.maximum(pk, 1e-9))
    w = ns(0.004)
    return x * uniform_filter1d(minimum_filter1d(need, 2 * w + 1), 2 * w + 1)


TARGET_LUFS = float(os.environ.get("ODDLY_LUFS", "-14"))  # platforms normalise to about -14


def mix(ep_dir, score, sfx, music_lu=-9.0):
    """writes audio/mix.wav + stems; returns (LUFS, dBTP)"""
    V, A = os.path.join(ep_dir, "voice"), os.path.join(ep_dir, "audio")
    os.makedirs(A, exist_ok=True)
    words = json.load(open(os.path.join(V, "words.json")))["words"]
    v, sr = read_wav(os.path.join(V, "voice.wav"))
    assert sr == SR
    N = score.N
    voice = np.zeros((2, N)); place(voice, v[0], 0.0)
    vl = integrated(voice)
    music = norm_to(score.render(), vl + music_lu + 3.0, "integrated") * duck(N, words)
    beds = norm_to(sfx.beds, vl - 16.0, "integrated") if np.any(sfx.beds) else sfx.beds
    ev = norm_to(sfx.ev, vl - 6.0, "momentary") if np.any(sfx.ev) else sfx.ev
    m = voice + music + beds + ev
    m *= dbg(TARGET_LUFS - integrated(m))
    for _ in range(3):
        m = limiter(m)
    write_wav(os.path.join(A, "mix.wav"), m)
    for k, x in (("music", music), ("sfx_beds", beds), ("sfx_events", ev)):
        write_wav(os.path.join(A, f"stem_{k}.wav"), x)
    lu, tp = integrated(m), true_peak(m)
    print(f"mix {lu:.2f} LUFS | true peak {tp:.2f} dBTP | {N / SR:.3f} s")
    return lu, tp
