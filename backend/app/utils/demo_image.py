"""Procedural PNG generation for the scripted demo scenario.

The demo needs a genuine image file so the multimodal stage exercises the real
Gemini vision path rather than being skipped. Rather than shipping a
photograph we cannot licence or verify, we render a synthetic scene: a sky
gradient, a horizon, an industrial stack, and an advecting plume.

It is unmistakably synthetic, and the platform labels it as such. Encoding is
done with `zlib` and `struct` alone, so there is no image-library dependency.
"""

from __future__ import annotations

import math
import struct
import zlib
from typing import List, Tuple

Pixel = Tuple[int, int, int]


def _chunk(tag: bytes, payload: bytes) -> bytes:
    return (
        struct.pack(">I", len(payload))
        + tag
        + payload
        + struct.pack(">I", zlib.crc32(tag + payload) & 0xFFFFFFFF)
    )


def _encode_png(rows: List[List[Pixel]]) -> bytes:
    height = len(rows)
    width = len(rows[0])

    raw = bytearray()
    for row in rows:
        raw.append(0)  # filter type 0 (None)
        for r, g, b in row:
            raw += bytes((r & 0xFF, g & 0xFF, b & 0xFF))

    header = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)  # 8-bit RGB
    return (
        b"\x89PNG\r\n\x1a\n"
        + _chunk(b"IHDR", header)
        + _chunk(b"IDAT", zlib.compress(bytes(raw), 6))
        + _chunk(b"IEND", b"")
    )


def _mix(a: Pixel, b: Pixel, t: float) -> Pixel:
    t = max(0.0, min(1.0, t))
    return (
        int(a[0] + (b[0] - a[0]) * t),
        int(a[1] + (b[1] - a[1]) * t),
        int(a[2] + (b[2] - a[2]) * t),
    )


def _noise(x: int, y: int, salt: float = 0.0) -> float:
    value = math.sin(x * 12.9898 + y * 78.233 + salt) * 43758.5453
    return value - math.floor(value)


def render_industrial_plume(width: int = 640, height: int = 420) -> bytes:
    """Render a synthetic industrial smoke scene as PNG bytes."""
    horizon = int(height * 0.72)
    stack_x, stack_w = int(width * 0.27), int(width * 0.045)
    stack_top = int(height * 0.34)

    sky_top: Pixel = (150, 168, 188)
    sky_bottom: Pixel = (206, 205, 196)
    ground_near: Pixel = (86, 88, 78)
    ground_far: Pixel = (128, 126, 112)
    smoke: Pixel = (92, 92, 96)

    rows: List[List[Pixel]] = []
    for y in range(height):
        row: List[Pixel] = []
        for x in range(width):
            if y < horizon:
                # Sky, hazier toward the horizon.
                pixel = _mix(sky_top, sky_bottom, (y / horizon) ** 0.8)
                haze = 0.10 + 0.16 * (y / horizon)
                pixel = _mix(pixel, (198, 196, 186), haze)
            else:
                t = (y - horizon) / max(1, height - horizon)
                pixel = _mix(ground_far, ground_near, t)
                if _noise(x, y, 3.1) > 0.86:
                    pixel = _mix(pixel, (68, 70, 62), 0.5)

            # Industrial stack silhouette.
            if stack_top <= y < horizon and stack_x <= x < stack_x + stack_w:
                shade = 0.55 + 0.35 * ((x - stack_x) / stack_w)
                pixel = _mix((74, 74, 78), (108, 106, 104), shade)
                if (y - stack_top) % 34 < 3:
                    pixel = _mix(pixel, (58, 58, 60), 0.6)

            # A second, shorter stack for depth.
            if int(height * 0.46) <= y < horizon and int(width * 0.19) <= x < int(width * 0.213):
                pixel = _mix((88, 88, 90), (112, 110, 108), 0.5)

            row.append(pixel)
        rows.append(row)

    # Plume: emitted at the stack mouth, rising then shearing downwind.
    origin_x = stack_x + stack_w / 2
    origin_y = stack_top
    for step in range(340):
        progress = step / 340.0
        # Rise dominates early, horizontal advection dominates later.
        drift = progress**1.35 * width * 0.62
        lift = math.sin(progress * math.pi * 0.55) * height * 0.20
        cx = origin_x + drift
        cy = origin_y - lift + progress * height * 0.05
        radius = 9.0 + progress * 46.0
        density = (1.0 - progress) ** 0.75

        for blob in range(26):
            angle = _noise(step, blob, 1.7) * math.tau
            spread = _noise(step, blob + 91, 5.3) ** 0.5
            px = int(cx + math.cos(angle) * radius * spread)
            py = int(cy + math.sin(angle) * radius * spread * 0.72)
            if not (0 <= px < width and 0 <= py < horizon):
                continue
            alpha = density * (1.0 - spread) * 0.55
            if alpha <= 0.01:
                continue
            tint = _mix(smoke, (146, 143, 138), _noise(px, py, 9.4) * 0.6)
            rows[py][px] = _mix(rows[py][px], tint, min(0.85, alpha))

    return _encode_png(rows)
