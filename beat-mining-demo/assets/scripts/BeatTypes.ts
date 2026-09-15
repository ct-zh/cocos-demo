export enum BeatJudgement {
    Perfect = 'Perfect',
    Good = 'Good',
    Miss = 'Miss',
}

export interface BeatResult {
    judgement: BeatJudgement;
    damage: number;
    distanceSeconds: number;
}
