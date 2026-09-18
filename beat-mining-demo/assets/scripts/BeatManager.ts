import { _decorator, Component } from 'cc';
import { BeatJudgement, BeatResult, BeatSlotPreview } from './BeatTypes';
import { MusicTrackConfig } from './MusicTrackConfig';
const { ccclass } = _decorator;

@ccclass('BeatManager')
export class BeatManager extends Component {
    private bpm = 120;
    private beatsPerBar = 4;
    private beatOffsetSeconds = 0;
    private inputOffsetSeconds = 0;
    private userInputOffsetSeconds = 0;
    private perfectWindowSeconds = 0.075;
    private goodWindowSeconds = 0.18;
    private startedAt = 0;
    private lastBeatIndex = -1;
    private lastAttemptedBeatIndex = Number.MIN_SAFE_INTEGER;
    private onBeatCallback: ((beatInBar: number, beatIndex: number) => void) | null = null;
    private musicClock: (() => number) | null = null;

    initialize(track: Readonly<MusicTrackConfig>, onBeat: (beatInBar: number, beatIndex: number) => void): void {
        this.bpm = track.bpm;
        this.beatsPerBar = track.beatsPerBar;
        this.beatOffsetSeconds = track.beatOffsetSeconds;
        this.inputOffsetSeconds = track.inputOffsetSeconds;
        this.perfectWindowSeconds = track.perfectWindowSeconds;
        this.goodWindowSeconds = track.goodWindowSeconds;
        this.onBeatCallback = onBeat;
        this.synchronizeNow();
    }

    synchronizeNow(): void {
        this.musicClock = null;
        this.startedAt = performance.now() / 1000;
        this.lastBeatIndex = -1;
        this.lastAttemptedBeatIndex = Number.MIN_SAFE_INTEGER;
    }

    synchronizeToMusic(clock: () => number): void {
        this.musicClock = clock;
        this.lastBeatIndex = -1;
        this.lastAttemptedBeatIndex = Number.MIN_SAFE_INTEGER;
    }

    update(): void {
        const beatIndex = Math.floor(this.elapsed() / this.beatDuration);
        if (beatIndex !== this.lastBeatIndex) {
            this.lastBeatIndex = beatIndex;
            this.onBeatCallback?.(beatIndex % this.beatsPerBar, beatIndex);
        }
    }

    judgeNow(): BeatResult {
        const preview = this.peekNow();
        const { targetBeatIndex, judgement, damage, distanceSeconds: distance, offsetSeconds: offset } = preview;
        if (targetBeatIndex === this.lastAttemptedBeatIndex) {
            return { accepted: false, targetBeatIndex, judgement: BeatJudgement.Miss, damage: 0, distanceSeconds: distance, offsetSeconds: offset };
        }
        this.lastAttemptedBeatIndex = targetBeatIndex;
        return { accepted: true, targetBeatIndex, judgement, damage, distanceSeconds: distance, offsetSeconds: offset };
    }

    previewNow(): BeatSlotPreview {
        return this.peekNow();
    }

    consumeBeatSlot(targetBeatIndex: number): void {
        this.lastAttemptedBeatIndex = targetBeatIndex;
    }

    private peekNow(): BeatSlotPreview {
        const judgedTime = this.elapsed() - this.effectiveInputOffsetSeconds;
        const targetBeatIndex = Math.round(judgedTime / this.beatDuration);
        const offset = judgedTime - targetBeatIndex * this.beatDuration;
        const distance = Math.abs(offset);
        const consumed = targetBeatIndex === this.lastAttemptedBeatIndex;
        if (distance <= this.perfectWindowSeconds) return { targetBeatIndex, consumed, judgement: BeatJudgement.Perfect, damage: 2, distanceSeconds: distance, offsetSeconds: offset };
        if (distance <= this.goodWindowSeconds) return { targetBeatIndex, consumed, judgement: BeatJudgement.Good, damage: 1, distanceSeconds: distance, offsetSeconds: offset };
        return { targetBeatIndex, consumed, judgement: BeatJudgement.Miss, damage: 0, distanceSeconds: distance, offsetSeconds: offset };
    }

    get beatDuration(): number { return 60 / this.bpm; }
    get progress(): number { return (this.elapsed() % this.beatDuration) / this.beatDuration; }
    get beatPosition(): number { return this.elapsed() / this.beatDuration; }
    get attemptedBeatIndex(): number | null {
        return this.lastAttemptedBeatIndex === Number.MIN_SAFE_INTEGER ? null : this.lastAttemptedBeatIndex;
    }
    get effectiveInputOffsetMilliseconds(): number { return Math.round(this.effectiveInputOffsetSeconds * 1000); }

    setUserInputOffsetMilliseconds(offsetMs: number): void {
        this.userInputOffsetSeconds = offsetMs / 1000;
    }

    measureRawOffsetNow(): { targetBeatIndex: number; offsetSeconds: number } {
        const measuredTime = this.elapsed() - this.inputOffsetSeconds;
        const targetBeatIndex = Math.round(measuredTime / this.beatDuration);
        return { targetBeatIndex, offsetSeconds: measuredTime - targetBeatIndex * this.beatDuration };
    }

    private elapsed(): number {
        const rawTime = this.musicClock ? this.musicClock() : performance.now() / 1000 - this.startedAt;
        return Math.max(0, rawTime - this.beatOffsetSeconds);
    }

    private get effectiveInputOffsetSeconds(): number {
        return this.inputOffsetSeconds + this.userInputOffsetSeconds;
    }
}
