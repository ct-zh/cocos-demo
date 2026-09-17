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
const SAMPLE_TOTAL = 4;
const COUNT_IN_SECONDS = 2;
const CUE_INTERVAL_MS = 1000;
const CAPTURE_WINDOW_MS = 850;

export class CalibrationManager {
    private mode: CalibrationMode = 'hidden';
    private offsetMs = 0;
    private countInEndsAtMs: number | null = null;
    private cueStartedAtMs: number | null = null;
    private nextCueAtMs: number | null = null;
    private currentSampleIndex = 0;
    private currentSampleCaptured = false;
    private samplesSeconds: number[] = [];
    private proposedOffsetMs = 0;
    private resultMessage = '';

    constructor(
        private readonly onViewChanged: (view: CalibrationView) => void,
        private readonly onOffsetChanged: (offsetMs: number) => void,
        private readonly onCue: () => void,
        private readonly onSessionChanged: (active: boolean) => void,
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

    update(nowMs: number): void {
        if (this.mode === 'countIn' && this.countInEndsAtMs !== null) {
            if (nowMs >= this.countInEndsAtMs) {
                this.mode = 'sampling';
                this.currentSampleIndex = 1;
                this.playCue(nowMs);
            } else {
                this.emit();
            }
            return;
        }
        if (this.mode !== 'sampling' || this.nextCueAtMs === null || nowMs < this.nextCueAtMs) return;
        if (this.currentSampleCaptured) {
            if (this.currentSampleIndex >= SAMPLE_TOTAL) {
                this.finishCalibration();
                return;
            }
            this.currentSampleIndex++;
        }
        this.playCue(nowMs);
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
            this.closeCalibration();
            return true;
        }
        return false;
    }

    cancel(): boolean {
        if (this.mode === 'hidden') return false;
        if (this.mode === 'countIn' || this.mode === 'sampling' || this.mode === 'result') {
            this.closeCalibration();
            return true;
        }
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

    recordTap(nowMs: number): boolean {
        if (this.mode !== 'sampling' || this.cueStartedAtMs === null || this.currentSampleCaptured) return false;
        const elapsedMs = nowMs - this.cueStartedAtMs;
        if (elapsedMs < 0 || elapsedMs > CAPTURE_WINDOW_MS) return false;
        this.currentSampleCaptured = true;
        this.samplesSeconds.push(elapsedMs / 1000);
        this.emit();
        return true;
    }

    private startCalibration(): void {
        this.mode = 'countIn';
        this.countInEndsAtMs = performance.now() + COUNT_IN_SECONDS * 1000;
        this.cueStartedAtMs = null;
        this.nextCueAtMs = null;
        this.currentSampleIndex = 0;
        this.currentSampleCaptured = false;
        this.samplesSeconds = [];
        this.proposedOffsetMs = this.offsetMs;
        this.resultMessage = '';
        this.onSessionChanged(true);
        this.emit();
    }

    private playCue(nowMs: number): void {
        this.cueStartedAtMs = nowMs;
        this.nextCueAtMs = nowMs + CUE_INTERVAL_MS;
        this.currentSampleCaptured = false;
        this.onCue();
        this.emit();
    }

    private finishCalibration(): void {
        this.mode = 'result';
        if (this.samplesSeconds.length !== SAMPLE_TOTAL) {
            this.resultMessage = `有效输入不足（${this.samplesSeconds.length}/${SAMPLE_TOTAL}）`;
            this.emit();
            return;
        }
        const sortedMs = this.samplesSeconds.map((seconds) => seconds * 1000).sort((a, b) => a - b);
        const middle = Math.floor(sortedMs.length / 2);
        const median = (sortedMs[middle - 1] + sortedMs[middle]) / 2;
        this.proposedOffsetMs = this.normalizeOffset(median);
        this.resultMessage = '';
        this.emit();
    }

    private closeCalibration(): void {
        this.markSeen();
        this.mode = 'hidden';
        this.countInEndsAtMs = null;
        this.cueStartedAtMs = null;
        this.nextCueAtMs = null;
        this.onSessionChanged(false);
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
        const countInRemaining = this.mode === 'countIn' && this.countInEndsAtMs !== null
            ? Math.max(1, Math.ceil((this.countInEndsAtMs - performance.now()) / 1000))
            : COUNT_IN_SECONDS;
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
