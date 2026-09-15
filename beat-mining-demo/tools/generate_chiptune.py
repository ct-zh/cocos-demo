#!/usr/bin/env python3
"""Generate the original 8-bit music and sound effects used by the demo."""

from array import array
import math
import random
import wave
from pathlib import Path
from typing import Optional

RATE = 44100
OUTPUT = Path(__file__).resolve().parents[1] / "assets" / "resources" / "audio"
TAU = math.tau
BPM = 112
BEAT = 60.0 / BPM
BAR = BEAT * 4


def buffer(seconds: float) -> array:
    return array("f", [0.0]) * int(seconds * RATE)


def osc(kind: str, phase: float) -> float:
    phase %= 1.0
    if kind == "square":
        return 1.0 if phase < 0.25 else -1.0
    if kind == "triangle":
        return 1.0 - 4.0 * abs(phase - 0.5)
    return math.sin(TAU * phase)


def add_tone(out: array, start: float, duration: float, frequency: float,
             volume: float, kind: str = "square", attack: float = 0.008,
             release: float = 0.04, end_frequency: Optional[float] = None) -> None:
    begin = int(start * RATE)
    count = min(int(duration * RATE), len(out) - begin)
    if count <= 0:
        return
    phase = 0.0
    for i in range(count):
        t = i / RATE
        progress = i / max(1, count - 1)
        frequency_now = frequency + ((end_frequency or frequency) - frequency) * progress
        phase += frequency_now / RATE
        envelope = min(1.0, t / attack) * min(1.0, (duration - t) / release)
        out[begin + i] += osc(kind, phase) * volume * max(0.0, envelope)


def add_noise(out: array, start: float, duration: float, volume: float,
              seed: int, decay: float = 7.0) -> None:
    rng = random.Random(seed)
    begin = int(start * RATE)
    count = min(int(duration * RATE), len(out) - begin)
    held = 0.0
    for i in range(count):
        if i % 5 == 0:
            held = rng.uniform(-1.0, 1.0)
        progress = i / max(1, count - 1)
        out[begin + i] += held * volume * math.exp(-decay * progress)


def write_wav(name: str, samples: array) -> None:
    peak = max(1.0, max(abs(value) for value in samples))
    pcm = array("h", (int(max(-1.0, min(1.0, value / peak)) * 32767) for value in samples))
    OUTPUT.mkdir(parents=True, exist_ok=True)
    with wave.open(str(OUTPUT / name), "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(RATE)
        wav.writeframes(pcm.tobytes())


def make_music() -> None:
    # A steady 112 BPM, 4/4 groove. Every bar uses the same rhythmic skeleton
    # so the mining judgement remains easy to hear without watching the HUD.
    out = buffer(BAR * 8)
    eighth = BEAT / 2
    melody = [
        523.25, 622.25, 659.25, 622.25,
        523.25, 466.16, 523.25, 622.25,
        392.00, 523.25, 622.25, 523.25,
        466.16, 523.25, 622.25, 523.25,
        523.25, 659.25, 783.99, 659.25,
        523.25, 622.25, 783.99, 622.25,
        783.99, 659.25, 622.25, 523.25,
        392.00, 466.16, 523.25, 392.00,
    ]
    bass_roots = [130.81, 116.54, 98.00, 116.54, 130.81, 155.56, 116.54, 98.00]

    for step, note in enumerate(melody):
        add_tone(out, step * BEAT, BEAT * 0.42, note, 0.11, "square", release=0.05)

    for beat in range(32):
        root = bass_roots[beat // 4]
        beat_in_bar = beat % 4
        start = beat * BEAT
        add_tone(out, start, BEAT * 0.68, root, 0.15, "triangle", release=0.09)

        # Clear strong, weak, medium, weak quarter-note accents.
        click_volume = (0.18, 0.09, 0.13, 0.09)[beat_in_bar]
        add_tone(out, start, 0.045, 1760, click_volume, "square", attack=0.001, release=0.025)
        if beat_in_bar in (0, 2):
            kick_volume = 0.34 if beat_in_bar == 0 else 0.27
            add_tone(out, start, 0.12, 110, kick_volume, "sine", attack=0.001, release=0.07, end_frequency=45)
        else:
            add_noise(out, start, 0.12, 0.13, 1000 + beat, decay=10.0)

    for step in range(64):
        # Quiet eighth-note hats add motion while keeping quarter-note beats dominant.
        volume = 0.028 if step % 2 == 0 else 0.016
        add_noise(out, step * eighth, 0.028, volume, 2000 + step, decay=13.0)

    write_wav("mine_loop.wav", out)


def make_sfx() -> None:
    swing = buffer(0.14)
    add_noise(swing, 0, 0.12, 0.32, 11, decay=5.0)
    add_tone(swing, 0, 0.12, 260, 0.16, "square", end_frequency=90)
    write_wav("swing.wav", swing)

    good = buffer(0.18)
    add_tone(good, 0, 0.10, 392.00, 0.34, "square")
    add_tone(good, 0.07, 0.11, 523.25, 0.28, "square")
    write_wav("good.wav", good)

    perfect = buffer(0.30)
    for offset, note in ((0.00, 523.25), (0.055, 659.25), (0.11, 783.99), (0.165, 1046.50)):
        add_tone(perfect, offset, 0.13, note, 0.28, "square", release=0.055)
    write_wav("perfect.wav", perfect)

    broken = buffer(0.38)
    add_noise(broken, 0, 0.36, 0.48, 31, decay=4.5)
    add_tone(broken, 0, 0.30, 120, 0.26, "triangle", end_frequency=45)
    write_wav("rock_break.wav", broken)

    collect = buffer(0.28)
    for offset, note in ((0.00, 659.25), (0.065, 783.99), (0.13, 1046.50)):
        add_tone(collect, offset, 0.14, note, 0.30, "square", release=0.06)
    write_wav("collect.wav", collect)


if __name__ == "__main__":
    make_music()
    make_sfx()
    print(f"Generated audio in {OUTPUT}")
