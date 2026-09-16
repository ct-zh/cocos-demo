import { _decorator, Component } from 'cc';
import { BeatJudgement, BeatResult } from './BeatTypes';
import { MusicTrackConfig } from './MusicTrackConfig';
const { ccclass } = _decorator;

@ccclass('BeatManager')
export class BeatManager extends Component {
    private bpm = 120;
    private beatsPerBar = 4;
    private beatOffsetSeconds = 0;
    private inputOffsetSeconds = 0;
    private perfectWindowSeconds = 0.075;
    private goodWindowSeconds = 0.18;
    private startedAt = 0;
    private lastBeatIndex = -1;
    private onBeatCallback: ((beatInBar: number) => void) | null = null;
    private musicClock: (() => number) | null = null;

    initialize(track: Readonly<MusicTrackConfig>, onBeat: (beatInBar: number) => void): void {
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
    }

    synchronizeToMusic(clock: () => number): void {
        this.musicClock = clock;
        this.lastBeatIndex = -1;
    }

    update(): void {
        const beatIndex = Math.floor(this.elapsed() / this.beatDuration);
        if (beatIndex !== this.lastBeatIndex) {
            this.lastBeatIndex = beatIndex;
            this.onBeatCallback?.(beatIndex % this.beatsPerBar);
        }
    }

    judgeNow(): BeatResult {
        const judgedTime = this.elapsed() - this.inputOffsetSeconds;
        const phase = ((judgedTime % this.beatDuration) + this.beatDuration) % this.beatDuration;
        const offset = phase <= this.beatDuration / 2 ? phase : phase - this.beatDuration;
        const distance = Math.abs(offset);
        if (distance <= this.perfectWindowSeconds) return { judgement: BeatJudgement.Perfect, damage: 2, distanceSeconds: distance, offsetSeconds: offset };
        if (distance <= this.goodWindowSeconds) return { judgement: BeatJudgement.Good, damage: 1, distanceSeconds: distance, offsetSeconds: offset };
        return { judgement: BeatJudgement.Miss, damage: 0, distanceSeconds: distance, offsetSeconds: offset };
    }

    get beatDuration(): number { return 60 / this.bpm; }
    get progress(): number { return (this.elapsed() % this.beatDuration) / this.beatDuration; }
    get beatPosition(): number { return this.elapsed() / this.beatDuration; }

    private elapsed(): number {
        const rawTime = this.musicClock ? this.musicClock() : performance.now() / 1000 - this.startedAt;
        return Math.max(0, rawTime - this.beatOffsetSeconds);
    }
}
