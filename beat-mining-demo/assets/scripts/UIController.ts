import { _decorator, Color, Component, HorizontalTextAlignment, Label, Node, tween, UITransform, Vec3, VerticalTextAlignment } from 'cc';
import { BeatJudgement } from './BeatTypes';
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
    private beatDots: Label[] = [];

    initialize(bpm: number): void {
        this.makeLabel('Title', 'BEAT MINER', 0, 310, 30, new Color(247, 209, 88));
        this.help = this.makeLabel('Help', `A / D 或 ← / → 移动    SPACE 挥镐    BPM ${bpm}`, 0, -325, 20, new Color(174, 183, 204));
        this.feedback = this.makeLabel('Feedback', '等待节拍…', 0, 210, 38, new Color(174, 183, 204));
        this.timing = this.makeLabel('Timing', '在亮拍时挥镐', 0, 174, 17, new Color(128, 139, 165));
        this.combo = this.makeLabel('Combo', 'COMBO 0', -490, 292, 24, new Color(255, 178, 84));
        this.ore = this.makeLabel('Ore', 'ORE 0', 490, 292, 24, new Color(92, 230, 222));
        this.progress = this.makeLabel('Progress', '矿脉 0 / 6', 0, 292, 16, new Color(143, 151, 179));
        this.stats = this.makeLabel('Stats', 'P 0  G 0  M 0    MAX 0    AVG --', 0, -286, 16, new Color(116, 126, 151));
        for (let i = 0; i < 4; i++) this.beatDots.push(this.makeLabel(`Beat${i + 1}`, '■', -72 + i * 48, 260, 30, new Color(75, 74, 98)));
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

    private makeLabel(name: string, text: string, x: number, y: number, size: number, color: Color): Label {
        const node = new Node(name);
        node.layer = this.node.layer;
        node.setPosition(x, y);
        this.node.addChild(node);
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
