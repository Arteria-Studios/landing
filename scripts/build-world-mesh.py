"""
Builds public/assets/world.bin, the wireframe world map for the "Around the world"
section (public/assets/world.js).

Land becomes a regular mesh, the same construction as the hero's artery wall:
a 2.5° grid clipped to the continents, drawn as rows ("rings"), columns ("ribs")
and one diagonal per cell. Coastlines are kept as a separate, slightly brighter
outline. Everything is projected with the Natural Earth projection and stored
as int16 pairs for gl.LINES.

    python scripts/build-world-mesh.py ne_110m_land.geojson
    (Natural Earth 1:110m land, public domain: github.com/nvkelso/natural-earth-vector)

Format (little-endian): uint32 meshVerts, uint32 coastVerts, then int16 x,y
pairs; x/y in [-1, 1] as x / X_MAX and y / Y_MAX (see world.js).
"""
import json
import math
import os
import struct
import sys

import numpy as np

SRC = sys.argv[1]
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "assets", "world.bin")
STEP = 2.5                 # grid step, degrees
LAT_MIN, LAT_MAX = -56.0, 84.0
X_MAX, Y_MAX = 2.75, 1.45  # projection bounds used for quantisation (shared with world.js)


def natural_earth(lon, lat):
    l, p = np.radians(lon), np.radians(lat)
    p2 = p * p
    p4 = p2 * p2
    x = l * (0.870700 - 0.131979 * p2 + p4 * (-0.013791 + p4 * (0.003971 * p2 - 0.001529 * p4)))
    y = p * (1.007226 + p2 * (0.015085 + p4 * (-0.044475 + 0.028874 * p2 - 0.005916 * p4)))
    return x, y


# Land rings (outer and holes); even-odd filling handles lakes and seas cut out.
rings = []
for f in json.load(open(SRC, encoding="utf-8"))["features"]:
    g = f["geometry"]
    polys = [g["coordinates"]] if g["type"] == "Polygon" else g["coordinates"]
    for poly in polys:
        for ring in poly:
            rings.append(np.array(ring, dtype=float))


def on_land(lon, lat):
    lon, lat = np.asarray(lon, float), np.asarray(lat, float)
    inside = np.zeros(lon.shape, bool)
    for r in rings:
        x0, y0 = r[:-1, 0], r[:-1, 1]
        x1, y1 = r[1:, 0], r[1:, 1]
        # Ray casting to the east, vectorised over points (rows) and edges (columns).
        cond = (y0[None, :] > lat[:, None]) != (y1[None, :] > lat[:, None])
        with np.errstate(divide="ignore", invalid="ignore"):
            xi = x0[None, :] + (lat[:, None] - y0[None, :]) * (x1 - x0)[None, :] / (y1 - y0)[None, :]
        hits = cond & (lon[:, None] < xi)
        inside ^= (hits.sum(axis=1) % 2).astype(bool)
    return inside


lons = np.arange(-180, 180 + 1e-9, STEP)
lats = np.arange(LAT_MIN, LAT_MAX + 1e-9, STEP)
LO, LA = np.meshgrid(lons, lats)
land = on_land(LO.ravel(), LA.ravel()).reshape(LO.shape)

segments = []   # (lon0, lat0, lon1, lat1)


def edge(i0, j0, i1, j1):
    if not (land[i0, j0] and land[i1, j1]):
        return
    mlon, mlat = (LO[i0, j0] + LO[i1, j1]) / 2, (LA[i0, j0] + LA[i1, j1]) / 2
    segments.append((LO[i0, j0], LA[i0, j0], LO[i1, j1], LA[i1, j1], mlon, mlat))


rows, cols = land.shape
for i in range(rows):
    for j in range(cols):
        if j + 1 < cols:
            edge(i, j, i, j + 1)          # ring
        if i + 1 < rows:
            edge(i, j, i + 1, j)          # rib
        if i + 1 < rows and j + 1 < cols:
            edge(i, j, i + 1, j + 1)      # diagonal

seg = np.array(segments)
keep = on_land(seg[:, 4], seg[:, 5])      # drop edges that cross water (bays, straits)
seg = seg[keep]

mx0, my0 = natural_earth(seg[:, 0], seg[:, 1])
mx1, my1 = natural_earth(seg[:, 2], seg[:, 3])
mesh = np.stack([mx0, my0, mx1, my1], axis=1).reshape(-1, 2)

# Coastlines (skip Antarctica), as line segments.
coast = []
for r in rings:
    if r[:, 1].max() < -58:
        continue
    cx, cy = natural_earth(r[:, 0], np.clip(r[:, 1], -90, 90))
    pts = np.stack([cx, cy], axis=1)
    coast.append(np.stack([pts[:-1], pts[1:]], axis=1).reshape(-1, 2))
coast = np.concatenate(coast)


def q(a):
    s = np.array([X_MAX, Y_MAX])
    return np.clip(np.round(a / s * 32767), -32767, 32767).astype("<i2")


os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "wb") as fh:
    fh.write(struct.pack("<II", len(mesh), len(coast)))
    fh.write(q(mesh).tobytes())
    fh.write(q(coast).tobytes())
print(f"mesh edges {len(mesh) // 2}, coast segments {len(coast) // 2}, {os.path.getsize(OUT) // 1024} KB")
