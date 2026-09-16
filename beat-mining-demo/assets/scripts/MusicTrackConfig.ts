export interface MusicVisualRhythmConfig {
    playerTapCycleBeats: number;
    backgroundBreathCycleBeats: number;
    backgroundBreathScale: number;
    worldPulseScale: number;
    downbeatMultiplier: number;
    perfectStreakPulseScale: number;
}

export interface MusicTrackConfig {
    resourcePath: string;
    bpm: number;
    beatsPerBar: number;
    beatOffsetSeconds: number;
    inputOffsetSeconds: number;
    perfectWindowSeconds: number;
    goodWindowSeconds: number;
    visualRhythm: MusicVisualRhythmConfig;
}

export const MINE_TRACK: Readonly<MusicTrackConfig> = {
    resourcePath: 'audio/mine_loop',
    bpm: 112,
    beatsPerBar: 4,
    beatOffsetSeconds: 0,
    inputOffsetSeconds: 0,
    perfectWindowSeconds: 0.06,
    goodWindowSeconds: 0.13,
    visualRhythm: {
        playerTapCycleBeats: 1,
        backgroundBreathCycleBeats: 4,
        backgroundBreathScale: 0.006,
        worldPulseScale: 0.0035,
        downbeatMultiplier: 1.45,
        perfectStreakPulseScale: 0.0015,
    },
};
