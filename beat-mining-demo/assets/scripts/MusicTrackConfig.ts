export interface MusicTrackConfig {
    resourcePath: string;
    bpm: number;
    beatsPerBar: number;
    beatOffsetSeconds: number;
    inputOffsetSeconds: number;
    perfectWindowSeconds: number;
    goodWindowSeconds: number;
}

export const MINE_TRACK: Readonly<MusicTrackConfig> = {
    resourcePath: 'audio/mine_loop',
    bpm: 112,
    beatsPerBar: 4,
    beatOffsetSeconds: 0,
    inputOffsetSeconds: 0,
    perfectWindowSeconds: 0.075,
    goodWindowSeconds: 0.18,
};
