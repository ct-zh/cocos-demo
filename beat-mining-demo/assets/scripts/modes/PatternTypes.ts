import { RockKind } from '../MiningRock';

export type PatternPhase = 'positioning' | 'waitingForBar' | 'listening' | 'repeating' | 'resolving' | 'collecting' | 'transitioning' | 'complete' | 'suspended';
export type PatternSlotResult = 'pending' | 'perfect' | 'good' | 'miss' | 'rest' | 'wrongRest' | 'tooFast';

export interface PatternLevelEntry { kind: RockKind; pattern: boolean[]; drops: number; x: number; }
export const PATTERN_LEVEL: PatternLevelEntry[] = [
    { kind: 'normal', pattern: [true, true, true, true], drops: 1, x: -260 },
    { kind: 'hard', pattern: [true, false, true, false], drops: 1, x: 80 },
    { kind: 'crystal', pattern: [true, false, true, true], drops: 3, x: 400 },
];
