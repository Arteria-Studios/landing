"""
Email hero (public/assets/email/pulse.gif): the site's preloader (assets/intro.js)
as a seamless loop.

Fine strands of light open from the centre and breathe; once per loop they give
a soft double beat built from smooth curves, a quick echo ripple runs out along
the line and dies away, and a red flash blooms from the centre. The canvas keeps
a phosphor afterglow (sub-steps accumulate like the site's canvas), so motion
leaves a fading trail. Brand bottom left, "54 BPM" bottom right, as on the intro.

Frame 0 is a calm, complete line, so clients that show only the first frame
(Outlook desktop) still get a finished picture.

    python scripts/make-email-hero.py <DMMono.ttf> <InterTight.ttf>
"""
import math
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "assets", "email", "pulse.gif")
POSTER = os.path.join(ROOT, "public", "assets", "email", "pulse.png")
MONO, SANS = sys.argv[1], sys.argv[2]

W, H = 1000, 368               # ~1.7x of the 600x220 slot in the email
SS = 2                         # supersampling for the strands
FRAMES = 32
FRAME_MS = 70                  # loop = 2.24 s
LOOP = FRAMES * FRAME_MS / 1000
SUB = 4                        # afterglow sub-steps per frame (~16 ms, like the site's rAF)
KEEP = 0.8                     # the site fades the canvas by 0.2 per animation frame
PERIOD = 60 / 54
T_BEAT = 0.42 * LOOP           # the beat lands a little before the middle of the loop
K = 1.2                        # amplitude (the site scales by screen height)
XS = 1.35                      # site px per GIF px, horizontally

STRANDS = [  # delay (s), dy (px), alpha, width (px) — same as intro.js
    (0.000, 0.0, 1.00, 1.8),
    (0.030, 1.6, 0.45, 1.1),
    (0.060, -1.8, 0.30, 1.1),
    (0.095, 3.2, 0.18, 0.9),
    (0.135, -3.6, 0.10, 0.9),
]


def beat_env(tau):
    return 0.0 if tau <= 0 else (1 - math.exp(-tau / 0.03)) * math.exp(-tau / 0.2)


def energy_at(tau):
    return beat_env(tau + 0.03) + 0.55 * beat_env(tau - 0.16 * PERIOD)


def shape(u, tau):
    """Offset of the line at u (site px from the centre), tau s after the beat (intro.js)."""
    s = energy_at(tau)
    y = (-np.exp(-((u / 16) ** 2)) * 118 * K * s
         + np.exp(-(((u - 26) / 20) ** 2)) * 34 * K * s
         - np.exp(-(((u + 60) / 26) ** 2)) * 12 * K * s)
    if tau > 0:
        au = np.abs(u)
        front = 1100 * tau
        inside = np.clip((front - au + 60) / 120, 0, 1)
        y = y + (np.sin(au * 0.05 - tau * 30) * 24 * K
                 * np.exp(-au / (220 + front * 0.4)) * math.exp(-tau / 0.5) * inside)
    return y


def breath(x, t):
    # Periodic in the loop, so the GIF repeats without a seam.
    w = 2 * math.pi / LOOP
    return np.sin(x * 0.009 + t * w) * 2.2 * K + np.sin(x * 0.021 - t * w) * 1.2 * K


def loop_tau(t):
    """Time since the beat, wrapped so the previous loop's beat also fades out."""
    tau = t - T_BEAT
    return tau if tau > -0.5 else tau + LOOP


XG = np.arange(0, W * SS + 1, 2, dtype=float)        # sample every 2 px at 2x
U = (XG / SS - W / 2) * XS
EDGE = np.clip(1 - np.abs(XG / SS - W / 2) / (W * 0.5), 0, 1)
FADE = np.where(EDGE > 0.4, 1.0, EDGE / 0.4) ** 1.2   # strands fade out to the sides
CY = H * 0.47


def strands(t):
    """One draw of all strands as a float RGB array at 2x (additive, like 'lighter')."""
    tau = loop_tau(t)
    e = energy_at(tau)
    acc = np.zeros((H * SS, W * SS, 3), dtype=np.float32)
    glow_layer = None
    for i, (delay, dy, a, w) in enumerate(STRANDS):
        y = CY + dy + shape(U, tau - delay) + breath(XG / SS + i * 40, t) * (1 - 0.6 * e)
        pts = list(zip(XG, y * SS))
        mask = Image.new("L", (W * SS, H * SS), 0)
        d = ImageDraw.Draw(mask)
        d.line(pts, fill=255, width=max(1, int(round(w * SS))), joint="curve")
        m = np.asarray(mask, dtype=np.float32) / 255
        # Brightness along x: fade to the sides; the centre warms to white on the beat.
        col_mid = np.array([255, 90 + 130 * e, 70 + 120 * e], dtype=np.float32)
        col_side = np.array([255, 59, 42], dtype=np.float32)
        mix = np.clip(1 - np.abs(XG / SS - W / 2) / (W * 0.2), 0, 1)
        col = (col_side[None, :] * (1 - mix[:, None]) + col_mid[None, :] * mix[:, None]) * (a * FADE[:, None])
        colx = np.repeat(col, 2, axis=0)[: W * SS]
        layer = m[:, :, None] * colx[None, :, :]
        acc += layer
        if i == 0:
            glow_layer = layer * (0.55 + 1.2 * e)
    return acc, glow_layer, e


def to_img(arr):
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGB")


# Static background: a faint crimson field, like the site's gradients.
bg = Image.new("RGB", (W, H), (0, 0, 0))
g = Image.new("RGB", (W, H), (0, 0, 0))
gd = ImageDraw.Draw(g)
gd.ellipse((W * 0.2, H * 0.05, W * 0.8, H * 0.95), fill=(26, 0, 4))
BG = np.asarray(g.filter(ImageFilter.GaussianBlur(110)), dtype=np.float32)

f_mono = ImageFont.truetype(MONO, 22)
f_sans = ImageFont.truetype(SANS, 26)
try:
    f_sans.set_variation_by_axes([500])
except Exception:
    pass


def overlay(img, e):
    d = ImageDraw.Draw(img)
    grey = (150, 150, 150)
    d.text((40, H - 58), "ArteriaStudios", font=f_sans, fill=grey)
    label = "54 BPM"
    tw = d.textlength(label, font=f_mono)
    x, y = W - 40 - tw, H - 54
    d.text((x, y), label, font=f_mono, fill=grey)
    r = 6 * (1 + 0.9 * min(1, e))                     # the dot beats, as on the intro
    cx, cy = x - 20, y + 12
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(255, 59, 42))


# Accumulate with afterglow; run one loop first so frame 0 already has its trail.
canvas = np.zeros((H * SS, W * SS, 3), dtype=np.float32)
frames = []
dt = FRAME_MS / 1000 / SUB
for pass_ in range(2):
    for f in range(FRAMES):
        glow_acc = None
        for s in range(SUB):
            t = (f * SUB + s) * dt
            layer, glow, e = strands(t)
            canvas = canvas * KEEP + layer
        if pass_ == 0:
            continue
        small = to_img(canvas).resize((W, H), Image.LANCZOS)
        glow_img = to_img(glow).resize((W, H), Image.BILINEAR)
        halo = (np.asarray(glow_img.filter(ImageFilter.GaussianBlur(8)), dtype=np.float32) * 1.1
                + np.asarray(glow_img.filter(ImageFilter.GaussianBlur(26)), dtype=np.float32) * 0.9)
        # Beat flash: a red bloom from the centre (intro .intro-flash).
        tau = loop_tau(f * FRAME_MS / 1000)
        flash = 0.0 if tau < -0.1 else 0.8 * math.exp(-max(0, tau) / 0.35) * min(1, (tau + 0.1) / 0.13)
        yy, xx = np.mgrid[0:H, 0:W]
        rr = np.sqrt(((xx - W / 2) / (W * 0.62)) ** 2 + ((yy - CY) / (H * 1.1)) ** 2)
        bloom = np.clip(1 - rr, 0, 1)[:, :, None] * np.array([255, 59, 42], dtype=np.float32) * 0.42 * flash
        img = to_img(BG + bloom + halo + np.asarray(small, dtype=np.float32))
        overlay(img, energy_at(tau))
        frames.append(img)

# One palette from all frames (no dither shimmer between frames).
hw, hh = W // 2, H // 2
mosaic = Image.new("RGB", (hw, hh * FRAMES + 64))
for k, fr in enumerate(frames):
    mosaic.paste(fr.resize((hw, hh), Image.BILINEAR), (0, hh * k))
# Neutral greys for the labels, so they don't pick up the red of the palette.
md = ImageDraw.Draw(mosaic)
for i in range(16):
    v = 30 + i * 12
    md.rectangle((i * hw // 16, hh * FRAMES, (i + 1) * hw // 16, hh * FRAMES + 64), fill=(v, v, v))
pal = mosaic.quantize(colors=128, method=Image.Quantize.MEDIANCUT)
q = [fr.quantize(palette=pal, dither=Image.Dither.NONE) for fr in frames]

os.makedirs(os.path.dirname(OUT), exist_ok=True)
q[0].save(OUT, save_all=True, append_images=q[1:], duration=FRAME_MS, loop=0, optimize=True, disposal=1)
frames[0].save(POSTER, optimize=True)
print("gif", os.path.getsize(OUT) // 1024, "KB; png", os.path.getsize(POSTER) // 1024, "KB")
