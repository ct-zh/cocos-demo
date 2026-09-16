export enum BeatJudgement {
    Perfect = 'Perfect',
    Good = 'Good',
    Miss = 'Miss',
}

export interface BeatResult {
    accepted: boolean;
    targetBeatIndex: number;
    judgement: BeatJudgement;
    damage: number;
    distanceSeconds: number;
    offsetSeconds: number;
}
