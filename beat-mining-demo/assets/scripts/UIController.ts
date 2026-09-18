import { _decorator, Button, Color, Component, Graphics, HorizontalTextAlignment, Label, Node, Slider, Sprite, Tween, tween, UIOpacity, UITransform, Vec3, VerticalTextAlignment } from 'cc';
import { BeatJudgement } from './BeatTypes';
import { CalibrationView } from './CalibrationManager';
import { fillRect, makeGraphicsNode } from './PixelArt';
const { ccclass } = _decorator;

export type CompletionRating = 'S' | 'A' | 'B' | 'C';

export interface CompletionSummary {
    seconds: number;
    oreCount: number;
    perfect: number;
    good: number;
    miss: number;
    maxCombo: number;
    averageAbsTimingMs: number;
    accuracyPercent: number;
    rating: CompletionRating;
    nextGoal: string;
    successfulPatterns?: number;
    failedPatterns?: number;
}

@ccclass('UIController')
export class UIController extends Component {
    private feedback!: Label;
    private combo!: Label;
    private ore!: Label;
    private timing!: Label;
    private stats!: Label;
    private help!: Label;
    private progress!: Label;
    private offset!: Label;
    private completionRating!: Label;
    private completionGoal!: Label;
    private hotHandNotice!: Label;
    private modeLabel!: Label;
    private patternPhase!: Label;
    private patternSlots!: Label;
    private patternAttempts!: Label;
    private helpOpacity!: UIOpacity;
    private beatDots: Label[] = [];
    private calibrationOverlay!: Node;
    private calibrationTitle!: Label;
    private calibrationDetail!: Label;
    private calibrationHint!: Label;
    private calibrationValue!: Label;
    private calibrationSliderNode!: Node;
    private calibrationSlider!: Slider;
    private calibrationStartButton!: Node;
    private returnModeButton!: Node;
    private calibrationOffsetChanged: ((offsetMs: number) => void) | null = null;
    private modeSelected: ((mode: 'classic' | 'pattern') => void) | null = null;
    private returnModeRequested: (() => void) | null = null;
    private modeSelection!: Node;
    private calibrationStartRequested: (() => void) | null = null;
    private syncingCalibrationSlider = false;
    private timingVisibilityVersion = 0;
    private helpVisibilityVersion = 0;
    private helpFadedAfterHit = false;
    private hotHandNoticeVersion = 0;
    private readonly comboDefaultColor = new Color(255, 178, 84);
    private readonly hotHandComboColor = new Color(255, 114, 76);

    initialize(bpm: number, onCalibrationOffsetChanged: (offsetMs: number) => void, onCalibrationStartRequested: () => void, onModeSelected: (mode: 'classic' | 'pattern') => void, onReturnModeRequested: () => void): void {
        this.calibrationOffsetChanged = onCalibrationOffsetChanged;
        this.calibrationStartRequested = onCalibrationStartRequested;
        this.modeSelected = onModeSelected;
        this.returnModeRequested = onReturnModeRequested;
        this.makeLabel('Title', 'BEAT MINER', 0, 310, 30, new Color(247, 209, 88));
        this.help = this.makeLabel('Help', `A / D 或 ← / → 移动    SPACE 挥镐    BPM ${bpm}`, 0, -325, 20, new Color(174, 183, 204));
        this.helpOpacity = this.help.node.addComponent(UIOpacity);
        this.feedback = this.makeLabel('Feedback', '等待节拍…', 0, 210, 38, new Color(174, 183, 204));
        this.timing = this.makeLabel('Timing', '在亮拍时挥镐', 0, 174, 17, new Color(128, 139, 165));
        this.combo = this.makeLabel('Combo', 'COMBO 0', -490, 292, 24, this.comboDefaultColor);
        this.ore = this.makeLabel('Ore', 'ORE 0', 490, 292, 24, new Color(92, 230, 222));
        this.progress = this.makeLabel('Progress', '矿脉 0 / 6', 0, 292, 16, new Color(143, 151, 179));
        this.offset = this.makeLabel('Offset', 'OFFSET +0 ms', 490, 252, 14, new Color(128, 139, 165));
        this.stats = this.makeLabel('Stats', 'P 0  G 0  M 0    MAX 0    AVG --', 0, -286, 16, new Color(116, 126, 151));
        this.completionRating = this.makeLabel('CompletionRating', '', 0, 120, 48, new Color(255, 221, 92));
        this.completionGoal = this.makeLabel('CompletionGoal', '', 0, -250, 18, new Color(174, 238, 229));
        this.hotHandNotice = this.makeLabel('HotHandNotice', '', 0, 145, 18, this.hotHandComboColor);
        this.modeLabel = this.makeLabel('ModeLabel', '', 0, 335, 16, new Color(174, 238, 229));
        this.patternPhase = this.makeLabel('PatternPhase', '', 0, 116, 25, new Color(255, 221, 92));
        this.patternSlots = this.makeLabel('PatternSlots', '', 0, 70, 31, new Color(210, 217, 235));
        this.patternAttempts = this.makeLabel('PatternAttempts', '', 0, 38, 16, new Color(143, 151, 179));
        this.offset.node.active = false;
        this.stats.node.active = false;
        this.completionRating.node.active = false;
        this.completionGoal.node.active = false;
        this.hotHandNotice.node.active = false;
        this.modeLabel.node.active = false;
        this.patternPhase.node.active = false;
        this.patternSlots.node.active = false;
        this.patternAttempts.node.active = false;
        for (let i = 0; i < 4; i++) this.beatDots.push(this.makeLabel(`Beat${i + 1}`, '■', -72 + i * 48, 260, 30, new Color(75, 74, 98)));
        this.buildCalibrationOverlay();
        this.buildModeSelection();
        this.returnModeButton = this.buildReturnModeButton();
        this.returnModeButton.active = false;
    }

    updateBeatPreview(beatPosition: number, beatsPerBar: number, perfectStreak: number, active: boolean): void {
        const dark = new Color(75, 74, 98);
        if (!active) {
            this.beatDots.forEach((dot) => {
                dot.color = dark;
                dot.node.setScale(Vec3.ONE);
            });
            return;
        }

        const beatIndex = Math.floor(beatPosition);
        const beatPhase = beatPosition - beatIndex;
        const current = ((beatIndex % beatsPerBar) + beatsPerBar) % beatsPerBar;
        const upcoming = (current + 1) % beatsPerBar;
        const flash = Math.pow(1 - beatPhase, 5);
        const streakFlash = Math.min(perfectStreak, 6) * 0.01;
        const yellow = new Color(255, 221, 92);
        const flashColor = new Color(255, 248, 182);

        this.beatDots.forEach((dot, index) => {
            let color = dark;
            let scale = 1;
            if (index === upcoming) {
                scale = 0.85 + 0.30 * beatPhase;
                color = this.mixColor(dark, yellow, beatPhase);
            }
            if (index === current) {
                const downbeatBoost = current === 0 ? 0.08 : 0;
                scale = 1 + (0.16 + downbeatBoost + streakFlash) * flash;
                color = this.mixColor(yellow, flashColor, flash);
            }
            dot.color = color;
            dot.node.setScale(scale, scale, 1);
        });
    }

    get beatPreviewDebug(): { scales: number[]; colors: Array<{ r: number; g: number; b: number }> } {
        return {
            scales: this.beatDots.map((dot) => Number(dot.node.scale.x.toFixed(3))),
            colors: this.beatDots.map((dot) => ({ r: dot.color.r, g: dot.color.g, b: dot.color.b })),
        };
    }

    get hudDebug(): { timingVisible: boolean; timing: string; statsVisible: boolean; offsetVisible: boolean; helpVisible: boolean; helpOpacity: number; completionRatingVisible: boolean; completionGoalVisible: boolean; completionRating: string; completionGoal: string; hotHandNoticeVisible: boolean; hotHandNotice: string; stats: string } {
        return {
            timingVisible: this.timing.node.active,
            timing: this.timing.string,
            statsVisible: this.stats.node.active,
            offsetVisible: this.offset.node.active,
            helpVisible: this.help.node.active,
            helpOpacity: this.helpOpacity.opacity,
            completionRatingVisible: this.completionRating.node.active,
            completionGoalVisible: this.completionGoal.node.active,
            completionRating: this.completionRating.string,
            completionGoal: this.completionGoal.string,
            hotHandNoticeVisible: this.hotHandNotice.node.active,
            hotHandNotice: this.hotHandNotice.string,
            stats: this.stats.string,
        };
    }

    showJudgement(judgement: BeatJudgement, combo: number, offsetSeconds: number, inRange: boolean): void {
        const colors = { Perfect: new Color(255, 239, 116), Good: new Color(89, 225, 176), Miss: new Color(239, 99, 110) };
        this.feedback.string = judgement.toUpperCase();
        this.feedback.color = colors[judgement];
        this.feedback.node.setScale(1.35, 1.35, 1);
        tween(this.feedback.node).to(0.14, { scale: Vec3.ONE }).start();
        this.combo.string = `COMBO ${combo}`;
        const milliseconds = Math.round(Math.abs(offsetSeconds) * 1000);
        const direction = milliseconds <= 5 ? 'ON BEAT' : offsetSeconds < 0 ? `EARLY ${milliseconds} ms` : `LATE ${milliseconds} ms`;
        this.timing.node.active = true;
        this.timing.string = inRange ? direction : `OUT OF RANGE  ·  ${direction}`;
        this.timing.color = inRange ? colors[judgement] : new Color(239, 99, 110);
        this.hideTimingAfterDelay();
    }

    showTooFast(): void {
        this.feedback.string = 'TOO FAST';
        this.feedback.color = new Color(201, 151, 92);
        this.feedback.node.setScale(1.12, 1.12, 1);
        tween(this.feedback.node).to(0.1, { scale: Vec3.ONE }).start();
        this.timingVisibilityVersion++;
        this.timing.node.active = true;
        this.timing.string = '当前节拍已经挥镐';
        this.timing.color = new Color(201, 151, 92);
    }

    showSpatialHint(state: 'none' | 'tooFar' | 'assist' | 'facingWrong' | 'inRange', offsetSeconds: number): void {
        const hintColor = new Color(148, 158, 186);
        this.feedback.string = state === 'facingWrong' ? '请面向矿石' : '距离不足';
        this.feedback.color = hintColor;
        this.feedback.node.setScale(1.06, 1.06, 1);
        tween(this.feedback.node).to(0.1, { scale: Vec3.ONE }).start();
        this.timingVisibilityVersion++;
        this.timing.node.active = true;
        this.timing.string = this.describeOffset(offsetSeconds);
        this.timing.color = hintColor;
    }

    updateStats(perfect: number, good: number, miss: number, maxCombo: number, averageAbsTimingMs: number): void {
        const average = Number.isFinite(averageAbsTimingMs) ? `${Math.round(averageAbsTimingMs)} ms` : '--';
        this.stats.string = `P ${perfect}  G ${good}  M ${miss}    MAX ${maxCombo}    AVG ${average}`;
    }

    fadeHelpAfterFirstValidHit(): void {
        if (this.helpFadedAfterHit) return;
        this.helpFadedAfterHit = true;
        this.fadeHelp();
    }

    setHotHand(active: boolean): void {
        this.combo.color = active ? this.hotHandComboColor : this.comboDefaultColor;
    }

    showHotHand(): void {
        const version = ++this.hotHandNoticeVersion;
        this.hotHandNotice.string = '热手！下一次 PERFECT 造成 3 点伤害';
        this.hotHandNotice.node.active = true;
        this.scheduleOnce(() => {
            if (version === this.hotHandNoticeVersion) this.hotHandNotice.node.active = false;
        }, 0.7);
    }

    showModeSelection(show: boolean): void { this.modeSelection.active = show; }

    setMode(mode: 'classic' | 'pattern' | null): void {
        this.modeLabel.node.active = mode !== null;
        this.modeLabel.string = mode === 'pattern' ? '节奏复刻' : mode === 'classic' ? '经典采矿' : '';
        const active = mode === 'pattern';
        this.patternPhase.node.active = active;
        this.patternSlots.node.active = active;
        this.patternAttempts.node.active = active;
    }

    showPattern(phase: string, pattern: boolean[], results: string[], attempt: number, rockIndex: number, currentSlot = -1): void {
        this.patternPhase.string = phase + '  ·  矿石 ' + (rockIndex + 1) + ' / 3';
        const slot = (value: boolean, result: string, index: number) => {
            if (index === currentSlot) return value ? '▶' : '▷';
            if (result === 'perfect') return '◆';
            if (result === 'good') return '◇';
            if (result === 'miss' || result === 'wrongRest') return '×';
            if (!value) return '—';
            return '□';
        };
        this.patternSlots.string = pattern.map((value, index) => slot(value, results[index] ?? 'pending', index)).join('   ');
        this.patternAttempts.string = '第 ' + attempt + ' 次尝试';
    }

    showPatternMessage(message: string): void {
        this.feedback.string = message;
        this.feedback.color = new Color(255, 221, 92);
    }

    setProgress(broken: number, total: number, crystalRemaining: boolean): void {
        this.progress.string = broken === total - 1 && crystalRemaining ? `矿脉 ${broken} / ${total}  ·  最终水晶` : `矿脉 ${broken} / ${total}`;
    }

    showFinalBreak(): void {
        this.feedback.string = 'CRYSTAL BREAK!';
        this.feedback.color = new Color(167, 241, 255);
        this.feedback.node.setScale(1.55, 1.55, 1);
        tween(this.feedback.node).to(0.2, { scale: Vec3.ONE }).start();
    }

    showComplete(summary: CompletionSummary): void {
        this.feedback.string = '矿脉清空！';
        this.feedback.color = new Color(92, 230, 222);
        const average = Number.isFinite(summary.averageAbsTimingMs) ? `${Math.round(summary.averageAbsTimingMs)} ms` : '--';
        this.timingVisibilityVersion++;
        this.timing.node.active = true;
        this.timing.string = `用时 ${summary.seconds.toFixed(1)} 秒  ·  ORE ${summary.oreCount}`;
        this.timing.color = new Color(174, 238, 229);
        this.stats.string = `P ${summary.perfect}  G ${summary.good}  M ${summary.miss}    MAX ${summary.maxCombo}    AVG ${average}    ACC ${summary.accuracyPercent.toFixed(1)}%`;
        this.stats.node.active = true;
        this.completionRating.string = `${summary.rating} 评级`;
        this.completionRating.color = this.ratingColor(summary.rating);
        this.completionRating.node.active = true;
        const patternResult = summary.successfulPatterns === undefined ? '' : `  ·  复刻成功 ${summary.successfulPatterns} / 失败 ${summary.failedPatterns ?? 0}`;
        this.completionGoal.string = `下一局目标：${summary.nextGoal}${patternResult}`;
        this.completionGoal.node.active = true;
        this.progress.string = '单关完成';
        this.help.string = '按 R 重新试玩';
        this.showHelp();
        this.returnModeButton.active = true;
    }

    resetRound(mode: 'classic' | 'pattern'): void {
        this.feedback.string = mode === 'pattern' ? '等待音乐…' : '等待节拍…';
        this.timingVisibilityVersion++;
        this.timing.node.active = true;
        this.timing.string = mode === 'pattern' ? '先听节奏，再复刻' : '在亮拍时挥镐';
        this.stats.node.active = false;
        this.completionRating.node.active = false;
        this.completionGoal.node.active = false;
        this.hotHandNotice.node.active = false;
        this.returnModeButton.active = false;
        this.setHotHand(false);
    }

    setOre(count: number): void {
        this.ore.string = `ORE ${count}`;
        this.ore.node.setScale(1.3, 1.3, 1);
        tween(this.ore.node).to(0.14, { scale: Vec3.ONE }).start();
    }

    showCalibration(view: CalibrationView): void {
        this.offset.string = `OFFSET ${this.formatOffset(view.offsetMs)}`;
        this.offset.node.active = view.mode !== 'hidden';
        this.calibrationOverlay.active = view.mode !== 'hidden';
        if (view.mode === 'hidden') {
            this.scheduleHelpFadeAfterSettings();
            return;
        }
        const nextProgress = (view.offsetMs + 300) / 600;
        if (Math.abs(this.calibrationSlider.progress - nextProgress) > 0.0001) {
            this.syncingCalibrationSlider = true;
            this.calibrationSlider.progress = nextProgress;
            this.syncingCalibrationSlider = false;
        }
        this.calibrationSliderNode.active = view.mode === 'settings';
        this.calibrationStartButton.active = view.mode === 'settings';
        this.calibrationValue.string = `当前补偿 ${this.formatOffset(view.offsetMs)}`;

        if (view.mode === 'prompt') {
            this.calibrationTitle.string = '输入延迟校准';
            this.calibrationDetail.string = '听到“滴”声后按 SPACE，共 4 次';
            this.calibrationHint.string = 'ENTER 开始校准    ESC 跳过    之后可按 C 重新设置';
        } else if (view.mode === 'countIn') {
            this.calibrationTitle.string = `准备  ${view.countInRemaining}`;
            this.calibrationDetail.string = '即将播放独立的“滴”声提示';
            this.calibrationHint.string = '每次听到滴声后按 SPACE    ESC 取消';
        } else if (view.mode === 'sampling') {
            this.calibrationTitle.string = `校准 ${view.sampleIndex} / ${view.sampleTotal}`;
            this.calibrationDetail.string = view.sampleCaptured ? '已记录，等待下一声滴声…' : '听到滴声后按 SPACE';
            this.calibrationHint.string = `已采集 ${view.capturedCount} / ${view.sampleTotal} 次    ESC 取消`;
        } else if (view.mode === 'result') {
            this.calibrationTitle.string = view.resultMessage === '' ? '校准完成' : '校准未完成';
            this.calibrationDetail.string = view.resultMessage === ''
                ? `建议输入补偿 ${this.formatOffset(view.proposedOffsetMs)}`
                : view.resultMessage;
            this.calibrationHint.string = view.resultMessage === ''
                ? 'ENTER 应用    R 重新校准    ESC 取消'
                : 'R 重新校准    ESC 取消';
        } else {
            this.calibrationTitle.string = '设置';
            this.calibrationDetail.string = '节拍输入设置';
            this.calibrationHint.string = '拖动滑块或 ←/→ 微调    T 开始校准    0 重置    C/ESC 关闭';
            this.showHelp();
        }
    }

    private buildModeSelection(): void {
        this.modeSelection = new Node('ModeSelection');
        this.modeSelection.layer = this.node.layer;
        this.node.addChild(this.modeSelection);
        this.modeSelection.addComponent(UITransform).setContentSize(1280, 720);
        const shade = makeGraphicsNode('ModeShade', this.modeSelection, 1280, 720);
        fillRect(shade.getComponent(Graphics)!, new Color(4, 5, 12, 220), -640, -360, 1280, 720);
        this.makeLabel('ModeTitle', '选择玩法', 0, 145, 36, new Color(255, 221, 92), this.modeSelection);
        this.buildModeButton('ClassicMode', '经典采矿', '自由移动，在拍点挥镐，清空六块矿脉', 95, 'classic');
        this.buildModeButton('PatternMode', '节奏复刻', '先听四拍节奏，再用空格复刻，共三块矿石', -80, 'pattern');
    }

    private buildReturnModeButton(): Node {
        const button = makeGraphicsNode('ReturnModeSelection', this.node, 280, 38);
        button.setPosition(0, -210);
        const g = button.getComponent(Graphics)!;
        fillRect(g, new Color(92, 230, 222), -140, -19, 280, 38);
        fillRect(g, new Color(24, 25, 43), -136, -15, 272, 30);
        this.makeLabel('Label', '返回模式选择', 0, 0, 17, new Color(255, 221, 92), button);
        button.addComponent(Button);
        const returnToSelection = () => this.returnModeRequested?.();
        button.on(Node.EventType.TOUCH_END, returnToSelection, this);
        return button;
    }

    private buildModeButton(name: string, title: string, detail: string, y: number, mode: 'classic' | 'pattern'): void {
        const button = makeGraphicsNode(name, this.modeSelection, 700, 110);
        button.setPosition(0, y);
        const g = button.getComponent(Graphics)!;
        fillRect(g, new Color(92, 230, 222), -350, -55, 700, 110);
        fillRect(g, new Color(24, 25, 43), -346, -51, 692, 102);
        this.makeLabel(name + 'Title', title, 0, 17, 26, new Color(255, 221, 92), button);
        this.makeLabel(name + 'Detail', detail, 0, -22, 16, new Color(174, 183, 204), button);
        button.addComponent(Button);
        const select = () => this.modeSelected?.(mode);
        button.on(Node.EventType.TOUCH_END, select, this);
    }

    private buildCalibrationOverlay(): void {
        this.calibrationOverlay = new Node('CalibrationOverlay');
        this.calibrationOverlay.layer = this.node.layer;
        this.node.addChild(this.calibrationOverlay);
        this.calibrationOverlay.addComponent(UITransform).setContentSize(1280, 720);

        const shade = makeGraphicsNode('Shade', this.calibrationOverlay, 1280, 720);
        fillRect(shade.getComponent(Graphics)!, new Color(4, 5, 12, 220), -640, -360, 1280, 720);
        const panel = makeGraphicsNode('Panel', this.calibrationOverlay, 780, 360);
        const panelGraphics = panel.getComponent(Graphics)!;
        fillRect(panelGraphics, new Color(24, 25, 43, 250), -390, -180, 780, 360);
        fillRect(panelGraphics, new Color(92, 230, 222), -390, 174, 780, 6);

        this.calibrationTitle = this.makeLabel('CalibrationTitle', '输入延迟校准', 0, 112, 34, new Color(255, 221, 92), this.calibrationOverlay);
        this.calibrationDetail = this.makeLabel('CalibrationDetail', '', 0, 56, 20, new Color(210, 217, 235), this.calibrationOverlay);
        this.calibrationValue = this.makeLabel('CalibrationValue', '当前补偿 +0 ms', 0, -8, 25, new Color(92, 230, 222), this.calibrationOverlay);
        this.calibrationHint = this.makeLabel('CalibrationHint', '', 0, -124, 17, new Color(151, 161, 188), this.calibrationOverlay);

        this.calibrationStartButton = this.buildCalibrationStartButton();

        this.calibrationSliderNode = makeGraphicsNode('CalibrationSlider', this.calibrationOverlay, 560, 44);
        this.calibrationSliderNode.setPosition(0, -70);
        const trackGraphics = this.calibrationSliderNode.getComponent(Graphics)!;
        fillRect(trackGraphics, new Color(65, 69, 91), -270, -4, 540, 8);
        fillRect(trackGraphics, new Color(112, 120, 151), -2, -12, 4, 24);
        const handle = new Node('Handle');
        handle.layer = this.calibrationSliderNode.layer;
        this.calibrationSliderNode.addChild(handle);
        handle.addComponent(UITransform).setContentSize(26, 38);
        const handleVisual = makeGraphicsNode('HandleVisual', handle, 26, 38);
        const handleGraphics = handleVisual.getComponent(Graphics)!;
        fillRect(handleGraphics, new Color(255, 221, 92), -11, -17, 22, 34);
        this.calibrationSlider = this.calibrationSliderNode.addComponent(Slider);
        this.calibrationSlider.handle = handle.addComponent(Sprite);
        this.calibrationSlider.progress = 0.5;
        this.calibrationSliderNode.on('slide', this.onCalibrationSlide, this);
        this.calibrationOverlay.active = false;
    }

    private buildCalibrationStartButton(): Node {
        const buttonNode = makeGraphicsNode('StartInputCalibration', this.calibrationOverlay, 260, 42);
        buttonNode.setPosition(0, 20);
        const graphics = buttonNode.getComponent(Graphics)!;
        fillRect(graphics, new Color(92, 230, 222), -130, -21, 260, 42);
        fillRect(graphics, new Color(24, 25, 43), -126, -17, 252, 34);
        const label = this.makeLabel('Label', '开始输入校准', 0, 0, 19, new Color(255, 221, 92), buttonNode);
        label.node.getComponent(UITransform)!.setContentSize(252, 34);
        buttonNode.addComponent(Button);
        buttonNode.on(Button.EventType.CLICK, this.onCalibrationStartClick, this);
        return buttonNode;
    }

    private onCalibrationSlide(): void {
        if (this.syncingCalibrationSlider) return;
        const rawOffset = -300 + this.calibrationSlider.progress * 600;
        const offsetMs = Math.round(rawOffset / 5) * 5;
        this.calibrationValue.string = `当前补偿 ${this.formatOffset(offsetMs)}`;
        this.calibrationOffsetChanged?.(offsetMs);
    }

    private onCalibrationStartClick(): void {
        this.calibrationStartRequested?.();
    }

    private formatOffset(offsetMs: number): string {
        return `${offsetMs >= 0 ? '+' : ''}${offsetMs} ms`;
    }

    private describeOffset(offsetSeconds: number): string {
        const milliseconds = Math.round(Math.abs(offsetSeconds) * 1000);
        if (milliseconds <= 5) return 'ON BEAT';
        return offsetSeconds < 0 ? `EARLY ${milliseconds} ms` : `LATE ${milliseconds} ms`;
    }

    private hideTimingAfterDelay(): void {
        const version = ++this.timingVisibilityVersion;
        this.scheduleOnce(() => {
            if (version === this.timingVisibilityVersion) this.timing.node.active = false;
        }, 0.7);
    }

    private showHelp(): void {
        this.helpVisibilityVersion++;
        Tween.stopAllByTarget(this.helpOpacity);
        this.help.node.active = true;
        this.helpOpacity.opacity = 255;
    }

    private fadeHelp(): void {
        if (!this.helpFadedAfterHit) return;
        const version = ++this.helpVisibilityVersion;
        tween(this.helpOpacity)
            .to(0.35, { opacity: 0 })
            .call(() => {
                if (version === this.helpVisibilityVersion) this.help.node.active = false;
            })
            .start();
    }

    private scheduleHelpFadeAfterSettings(): void {
        if (!this.helpFadedAfterHit) return;
        const version = ++this.helpVisibilityVersion;
        this.scheduleOnce(() => {
            if (version === this.helpVisibilityVersion) this.fadeHelp();
        }, 0.5);
    }

    private ratingColor(rating: CompletionRating): Color {
        if (rating === 'S') return new Color(255, 221, 92);
        if (rating === 'A') return new Color(92, 230, 222);
        if (rating === 'B') return new Color(127, 207, 132);
        return new Color(204, 157, 119);
    }

    private mixColor(from: Color, to: Color, progress: number): Color {
        const amount = Math.max(0, Math.min(1, progress));
        return new Color(
            Math.round(from.r + (to.r - from.r) * amount),
            Math.round(from.g + (to.g - from.g) * amount),
            Math.round(from.b + (to.b - from.b) * amount),
            Math.round(from.a + (to.a - from.a) * amount),
        );
    }

    private makeLabel(name: string, text: string, x: number, y: number, size: number, color: Color, parent: Node = this.node): Label {
        const node = new Node(name);
        node.layer = parent.layer;
        node.setPosition(x, y);
        parent.addChild(node);
        node.addComponent(UITransform).setContentSize(640, size + 12);
        const label = node.addComponent(Label);
        label.string = text;
        label.fontSize = size;
        label.lineHeight = size + 4;
        label.color = color;
        label.horizontalAlign = HorizontalTextAlignment.CENTER;
        label.verticalAlign = VerticalTextAlignment.CENTER;
        label.isBold = true;
        return label;
    }
}
