"use client";

import type {
  SystemMessageSoundPreset,
  SystemMessageTone,
  SystemMessageVolumePreset,
} from "@/theme/system-message-preferences";

type OscillatorKind = OscillatorType;

type ToneStep = {
  frequency: number;
  durationMs: number;
  gain: number;
  type: OscillatorKind;
  delayMs?: number;
};

type TonePattern = ToneStep[];

type SoundPlaybackPreferences = {
  soundEnabled: boolean;
  soundPreset: SystemMessageSoundPreset;
  soundVolume: SystemMessageVolumePreset;
};

const VOLUME_SCALE: Record<SystemMessageVolumePreset, number> = {
  low: 0.18,
  medium: 0.28,
  high: 0.4,
};

const CLASSIC_PATTERNS: Record<SystemMessageTone, TonePattern> = {
  success: [
    { frequency: 660, durationMs: 90, gain: 0.7, type: "sine" },
    { frequency: 880, durationMs: 150, gain: 0.9, type: "triangle", delayMs: 70 },
  ],
  error: [
    { frequency: 240, durationMs: 130, gain: 0.85, type: "sawtooth" },
    { frequency: 180, durationMs: 180, gain: 0.95, type: "square", delayMs: 85 },
  ],
  warning: [
    { frequency: 520, durationMs: 100, gain: 0.75, type: "triangle" },
    { frequency: 420, durationMs: 110, gain: 0.85, type: "triangle", delayMs: 120 },
  ],
  info: [
    { frequency: 560, durationMs: 95, gain: 0.65, type: "sine" },
    { frequency: 720, durationMs: 120, gain: 0.7, type: "triangle", delayMs: 80 },
  ],
  neutral: [{ frequency: 430, durationMs: 90, gain: 0.45, type: "sine" }],
  loading: [
    { frequency: 390, durationMs: 70, gain: 0.38, type: "sine" },
    { frequency: 470, durationMs: 70, gain: 0.34, type: "sine", delayMs: 95 },
  ],
};

const SOFT_PATTERNS: Record<SystemMessageTone, TonePattern> = {
  success: [
    { frequency: 610, durationMs: 75, gain: 0.45, type: "sine" },
    { frequency: 770, durationMs: 130, gain: 0.55, type: "sine", delayMs: 65 },
  ],
  error: [
    { frequency: 250, durationMs: 100, gain: 0.5, type: "triangle" },
    { frequency: 205, durationMs: 135, gain: 0.55, type: "triangle", delayMs: 75 },
  ],
  warning: [
    { frequency: 500, durationMs: 85, gain: 0.46, type: "sine" },
    { frequency: 435, durationMs: 95, gain: 0.52, type: "sine", delayMs: 105 },
  ],
  info: [
    { frequency: 520, durationMs: 85, gain: 0.42, type: "sine" },
    { frequency: 650, durationMs: 100, gain: 0.46, type: "sine", delayMs: 72 },
  ],
  neutral: [{ frequency: 405, durationMs: 75, gain: 0.28, type: "sine" }],
  loading: [
    { frequency: 360, durationMs: 60, gain: 0.26, type: "sine" },
    { frequency: 430, durationMs: 60, gain: 0.24, type: "sine", delayMs: 85 },
  ],
};

const PATTERN_SETS: Record<SystemMessageSoundPreset, Record<SystemMessageTone, TonePattern>> = {
  classic: CLASSIC_PATTERNS,
  soft: SOFT_PATTERNS,
};

let sharedAudioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") {
    return null;
  }

  const AudioContextCtor =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextCtor) {
    return null;
  }

  if (!sharedAudioContext) {
    sharedAudioContext = new AudioContextCtor();
  }

  return sharedAudioContext;
}

export function playSystemMessageSound(
  tone: SystemMessageTone,
  preferences: SoundPlaybackPreferences,
) {
  if (!preferences.soundEnabled) {
    return;
  }

  const context = getAudioContext();
  if (!context) {
    return;
  }

  if (context.state === "suspended") {
    void context.resume().catch(() => undefined);
  }

  const patternSet = PATTERN_SETS[preferences.soundPreset] ?? PATTERN_SETS.classic;
  const pattern = patternSet[tone] ?? patternSet.info;
  const volumeScale = VOLUME_SCALE[preferences.soundVolume] ?? VOLUME_SCALE.medium;
  const now = context.currentTime;

  pattern.forEach((step) => {
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    const startAt = now + (step.delayMs ?? 0) / 1000;
    const endAt = startAt + step.durationMs / 1000;
    const peakGain = step.gain * volumeScale;

    oscillator.type = step.type;
    oscillator.frequency.setValueAtTime(step.frequency, startAt);

    gainNode.gain.setValueAtTime(0.0001, startAt);
    gainNode.gain.exponentialRampToValueAtTime(Math.max(peakGain, 0.0001), startAt + 0.018);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, endAt);

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    oscillator.start(startAt);
    oscillator.stop(endAt + 0.03);
  });
}
