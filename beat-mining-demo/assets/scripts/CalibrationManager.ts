export type CalibrationMode = 'hidden' | 'prompt' | 'countIn' | 'sampling' | 'result' | 'settings';

export interface CalibrationView {
    mode: CalibrationMode;
    offsetMs: number;
    countInRemaining: number;
    sampleIndex: number;
    sampleTotal: number;
    sampleCaptured: boolean;
    capturedCount: number;
    proposedOffsetMs: number;
    resultMessage: string;
}

const OFFSET_STORAGE_KEY = 'beatMiningInputOffsetMs';
const SEEN_STORAGE_KEY = 'beatMiningCalibrationSeen';
const SAMPLE_TOTAL = 12;
const COUNT_IN_BEATS = 4;

export class CalibrationManager {
    private mode: CalibrationMode = 'hidden';
    private offsetMs = 0;
    private countInStartBeat: number | null = null;
    private countInElapsed = 0;
    private samplingStartBeat: number | null = null;
    private currentCueBeat: number | null = null;
    private currentSampleIndex = 0;
    private currentSampleCaptured = false;
    private samplesSeconds: number[] = [];
    private proposedOffsetMs = 0;
    private resultMessage = '';

    constructor(
        private readonly onViewChanged: (view: CalibrationView) => void,
        private readonly onOffsetChanged: (offsetMs: number) => void,
    ) {}

    initialize(): void {
        this.offsetMs = this.readStoredOffset();
        this.onOffsetChanged(this.offsetMs);
        this.mode = this.readSeen() ? 'hidden' : 'prompt';
        this.emit();
    }

    get blocksGameplay(): boolean { return this.mode !== 'hidden'; }
    get isSampling(): boolean { return this.mode === 'sampling'; }
    get currentOffsetMs(): number { return this.offsetMs; }
    get debugState(): object {
        return {
            mode: this.mode,
            offsetMs: this.offsetMs,
            sampleIndex: this.currentSampleIndex,
            sampleCaptured: this.currentSampleCaptured,
            capturedCount: this.samplesSeconds.length,
            proposedOffsetMs: this.proposedOffsetMs,
            resultMessage: this.resultMessage,
        };
    }

    toggleSettings(): boolean {
        if (this.mode === 'hidden') {
            this.mode = 'settings';
            this.markSeen();
            this.emit();
            return true;
        }
        if (this.mode === 'settings') {
            this.mode = 'hidden';
            this.emit();
            return true;
        }
        return false;
    }

    confirm(): boolean {
        if (this.mode === 'prompt') {
            this.startCalibration();
            return true;
        }
        if (this.mode === 'result' && this.resultMessage === '') {
            this.setOffset(this.proposedOffsetMs);
            this.markSeen();
            this.mode = 'hidden';
            this.emit();
            return true;
        }
        return false;
    }

    cancel(): boolean {
        if (this.mode === 'hidden') return false;
        this.markSeen();
        this.mode = 'hidden';
        this.emit();
        return true;
    }

    retry(): boolean {
        if (this.mode !== 'result') return false;
        this.startCalibration();
        return true;
    }

    startFromSettings(): boolean {
        if (this.mode !== 'settings') return false;
        this.startCalibration();
        return true;
    }

    resetOffset(): boolean {
        if (this.mode !== 'settings') return false;
        this.setOffset(0);
        return true;
    }

    adjustOffset(deltaMs: number): boolean {
        if (this.mode !== 'settings') return false;
        this.setOffset(this.offsetMs + deltaMs);
        return true;
    }

    setManualOffset(offsetMs: number): void {
        if (this.mode !== 'settings') return;
        this.setOffset(offsetMs);
    }

    onBeat(beatIndex: number): void {
        if (this.mode === 'countIn') {
            if (this.countInStartBeat === null) this.countInStartBeat = beatIndex;
            const elapsed = beatIndex - this.countInStartBeat;
            this.countInElapsed = elapsed;
            if (elapsed < COUNT_IN_BEATS) {
                this.emit();
                return;
            }
            this.mode = 'sampling';
            this.samplingStartBeat = beatIndex;
            this.setCurrentCue(beatIndex, 1);
            return;
        }
        if (this.mode !== 'sampling' || this.samplingStartBeat === null) return;
        const sampleIndex = beatIndex - this.samplingStartBeat + 1;
        if (sampleIndex > SAMPLE_TOTAL) {
            this.finishCalibration();
            return;
        }
        this.setCurrentCue(beatIndex, sampleIndex);
    }

    recordTap(targetBeatIndex: number, offsetSeconds: number): boolean {
        if (this.mode !== 'sampling' || this.currentCueBeat !== targetBeatIndex || this.currentSampleCaptured) return false;
        this.currentSampleCaptured = true;
        this.samplesSeconds.push(offsetSeconds);
        this.emit();
        return true;
    }

    private startCalibration(): void {
        this.mode = 'countIn';
        this.countInStartBeat = null;
        this.countInElapsed = 0;
        this.samplingStartBeat = null;
        this.currentCueBeat = null;
        this.currentSampleIndex = 0;
        this.currentSampleCaptured = false;
        this.samplesSeconds = [];
        this.proposedOffsetMs = this.offsetMs;
        this.resultMessage = '';
        this.emit();
    }

    private setCurrentCue(beatIndex: number, sampleIndex: number): void {
        if (this.currentCueBeat === beatIndex) return;
        this.currentCueBeat = beatIndex;
        this.currentSampleIndex = sampleIndex;
        this.currentSampleCaptured = false;
        this.emit();
    }

    private finishCalibration(): void {
        this.mode = 'result';
        if (this.samplesSeconds.length < 6) {
            this.resultMessage = `有效输入不足（${this.samplesSeconds.length}/${SAMPLE_TOTAL}）`;
            this.emit();
            return;
        }
        const sortedMs = this.samplesSeconds.map((seconds) => seconds * 1000).sort((a, b) => a - b);
        const trimmed = sortedMs.length >= 10 ? sortedMs.slice(1, -1) : sortedMs;
        const middle = Math.floor(trimmed.length / 2);
        const median = trimmed.length % 2 === 0 ? (trimmed[middle - 1] + trimmed[middle]) / 2 : trimmed[middle];
        this.proposedOffsetMs = this.normalizeOffset(median);
        this.resultMessage = '';
        this.emit();
    }

    private setOffset(offsetMs: number): void {
        this.offsetMs = this.normalizeOffset(offsetMs);
        this.onOffsetChanged(this.offsetMs);
        try { window.localStorage.setItem(OFFSET_STORAGE_KEY, String(this.offsetMs)); } catch {}
        this.emit();
    }

    private normalizeOffset(offsetMs: number): number {
        return Math.max(-300, Math.min(300, Math.round(offsetMs / 5) * 5));
    }

    private readStoredOffset(): number {
        try {
            const value = Number(window.localStorage.getItem(OFFSET_STORAGE_KEY));
            return Number.isFinite(value) ? this.normalizeOffset(value) : 0;
        } catch {
            return 0;
        }
    }

    private readSeen(): boolean {
        try { return window.localStorage.getItem(SEEN_STORAGE_KEY) === '1'; } catch { return false; }
    }

    private markSeen(): void {
        try { window.localStorage.setItem(SEEN_STORAGE_KEY, '1'); } catch {}
    }

    private emit(): void {
        const countInRemaining = this.mode === 'countIn' ? Math.max(1, COUNT_IN_BEATS - this.countInElapsed) : COUNT_IN_BEATS;
        this.onViewChanged({
            mode: this.mode,
            offsetMs: this.offsetMs,
            countInRemaining,
            sampleIndex: this.currentSampleIndex,
            sampleTotal: SAMPLE_TOTAL,
            sampleCaptured: this.currentSampleCaptured,
            capturedCount: this.samplesSeconds.length,
            proposedOffsetMs: this.proposedOffsetMs,
            resultMessage: this.resultMessage,
        });
    }
}
