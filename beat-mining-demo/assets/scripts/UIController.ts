import { _decorator, Button, Color, Component, Graphics, HorizontalTextAlignment, Label, Node, Slider, Sprite, tween, UITransform, Vec3, VerticalTextAlignment } from 'cc';
import { BeatJudgement } from './BeatTypes';
import { CalibrationView } from './CalibrationManager';
import { fillRect, makeGraphicsNode } from './PixelArt';
const { ccclass } = _decorator;

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
    private beatDots: Label[] = [];
    private calibrationOverlay!: Node;
    private calibrationTitle!: Label;
    private calibrationDetail!: Label;
    private calibrationHint!: Label;
    private calibrationValue!: Label;
    private calibrationSliderNode!: Node;
    private calibrationSlider!: Slider;
    private calibrationStartButton!: Node;
    private calibrationOffsetChanged: ((offsetMs: number) => void) | null = null;
    private calibrationStartRequested: (() => void) | null = null;
    private syncingCalibrationSlider = false;

    initialize(bpm: number, onCalibrationOffsetChanged: (offsetMs: number) => void, onCalibrationStartRequested: () => void): void {
        this.calibrationOffsetChanged = onCalibrationOffsetChanged;
        this.calibrationStartRequested = onCalibrationStartRequested;
        this.makeLabel('Title', 'BEAT MINER', 0, 310, 30, new Color(247, 209, 88));
        this.help = this.makeLabel('Help', `A / D 或 ← / → 移动    SPACE 挥镐    BPM ${bpm}`, 0, -325, 20, new Color(174, 183, 204));
        this.feedback = this.makeLabel('Feedback', '等待节拍…', 0, 210, 38, new Color(174, 183, 204));
        this.timing = this.makeLabel('Timing', '在亮拍时挥镐', 0, 174, 17, new Color(128, 139, 165));
        this.combo = this.makeLabel('Combo', 'COMBO 0', -490, 292, 24, new Color(255, 178, 84));
        this.ore = this.makeLabel('Ore', 'ORE 0', 490, 292, 24, new Color(92, 230, 222));
        this.progress = this.makeLabel('Progress', '矿脉 0 / 6', 0, 292, 16, new Color(143, 151, 179));
        this.offset = this.makeLabel('Offset', 'OFFSET +0 ms', 490, 252, 14, new Color(128, 139, 165));
        this.stats = this.makeLabel('Stats', 'P 0  G 0  M 0    MAX 0    AVG --', 0, -286, 16, new Color(116, 126, 151));
        for (let i = 0; i < 4; i++) this.beatDots.push(this.makeLabel(`Beat${i + 1}`, '■', -72 + i * 48, 260, 30, new Color(75, 74, 98)));
        this.buildCalibrationOverlay();
    }

    showBeat(active: number, intensity: number): void {
        this.beatDots.forEach((dot, index) => {
            dot.color = index === active ? new Color(255, 221, 92) : new Color(75, 74, 98);
            dot.node.setScale(index === active ? 1.15 + intensity * 0.04 : 1, index === active ? 1.15 + intensity * 0.04 : 1, 1);
        });
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
        this.timing.string = inRange ? direction : `OUT OF RANGE  ·  ${direction}`;
        this.timing.color = inRange ? colors[judgement] : new Color(239, 99, 110);
    }

    showTooFast(): void {
        this.feedback.string = 'TOO FAST';
        this.feedback.color = new Color(201, 151, 92);
        this.feedback.node.setScale(1.12, 1.12, 1);
        tween(this.feedback.node).to(0.1, { scale: Vec3.ONE }).start();
        this.timing.string = '当前节拍已经挥镐';
        this.timing.color = new Color(201, 151, 92);
    }

    updateStats(perfect: number, good: number, miss: number, maxCombo: number, averageAbsTimingMs: number): void {
        const average = Number.isFinite(averageAbsTimingMs) ? `${Math.round(averageAbsTimingMs)} ms` : '--';
        this.stats.string = `P ${perfect}  G ${good}  M ${miss}    MAX ${maxCombo}    AVG ${average}`;
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

    showComplete(seconds: number, oreCount: number, maxCombo: number, averageAbsTimingMs: number): void {
        this.feedback.string = '矿脉清空！';
        this.feedback.color = new Color(92, 230, 222);
        const average = Number.isFinite(averageAbsTimingMs) ? `${Math.round(averageAbsTimingMs)} ms` : '--';
        this.timing.string = `用时 ${seconds.toFixed(1)} 秒  ·  ORE ${oreCount}  ·  MAX ${maxCombo}  ·  AVG ${average}`;
        this.timing.color = new Color(174, 238, 229);
        this.progress.string = '单关完成';
        this.help.string = '按 R 重新试玩';
    }

    setOre(count: number): void {
        this.ore.string = `ORE ${count}`;
        this.ore.node.setScale(1.3, 1.3, 1);
        tween(this.ore.node).to(0.14, { scale: Vec3.ONE }).start();
    }

    showCalibration(view: CalibrationView): void {
        this.offset.string = `OFFSET ${this.formatOffset(view.offsetMs)}`;
        this.calibrationOverlay.active = view.mode !== 'hidden';
        if (view.mode === 'hidden') return;
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
        }
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
