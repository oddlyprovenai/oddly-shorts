# Sound for EP02 (Clever Hans): sly march for the courtyard, hoof taps on every tap, a cheer on "Correct",
# pizzicato for the investigation, a deflating tuba on "wrong", quiz-show sting, reprise for the lab line.
import os, sys
sys.path.insert(0, os.environ.get("ODDLY_TOOLS", os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "tools")))
import numpy as np
import oddaudio as A
EP = os.path.dirname(os.path.abspath(__file__))
DUR = 1892 / 30
s = A.Score(DUR, 1907)
s.plucks(0.0, 4.3, ["F", "C7"], 0.4); s.triangle(4.34)
s.oompah(4.34, 25.8, ["F", "F", "C7", "F", "Bb", "F", "C7", "F"], 0.5); s.melody(6.4, 25.6, "sly")
s.lucky(18.9)
s.plucks(25.84, 35.5, ["Dm", "Dm", "Gm", "A7"], 0.45); s.deflate(31.96)
s.lucky(35.56); s.unlucky(37.44)
s.plucks(39.46, 43.1, ["Am", "Dm"], 0.4)
s.melody(43.12, 46.4, "march", 12, "glock", 0.55); s.button(45.8, "C")
s.pad(46.48, 4.8, "F", 0.35, att=0.8)
s.oompah(51.28, 54.2, ["F", "C7"], 0.45); s.deflate(53.5)
s.pad(54.24, 6.6, "F", 0.35, att=1.0); s.melody(54.3, 60.6, "march", 12, "vibes", 0.4)
s.lucky(60.2); s.button(61.2)
x = A.Sfx(DUR, 1907)
x.bed(x.murmur(21.5, 10), 4.34, 0.5); x.bed(x.breeze(21.5, 0.5), 4.34)
def taps(t0, t1, hz):
    t = t0 + 0.5 / hz
    while t < t1: x.event(x.hoof(), t, 0.5); t += 1 / hz
taps(10.6, 12.3, 3); taps(17.42, 17.42 + 11 / 7.5, 7.5); taps(30.6, 32.5, 3); taps(39.9, 41.3, 3)
x.event(x.cheer(2.2, 24), 18.95, 0.7); x.event(x.cheer(1.6, 10), 21.7, 0.3)
x.event(x.scribble(1.2), 23.4, 0.4); x.event(x.whoa(), 32.1, 0.4)
x.event(x.cheer(1.4, 12), 45.8, 0.5); x.bed(x.murmur(5.0, 6), 51.28, 0.4)
x.event(x.whoosh(), 4.15, 0.5)
for c in (25.84, 35.56, 43.12, 46.48, 51.28, 54.24): x.event(x.whoosh(), c - 0.2, 0.25)
x.event(x.pop(), 60.2, 0.5)
A.mix(EP, s, x)
