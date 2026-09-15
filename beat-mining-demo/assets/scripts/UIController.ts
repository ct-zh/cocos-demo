import { _decorator, Color, Component, HorizontalTextAlignment, Label, Node, tween, UITransform, Vec3, VerticalTextAlignment } from 'cc';
import { BeatJudgement } from './BeatTypes';
const { ccclass } = _decorator;

@ccclass('UIController')
export class UIController extends Component {
    private feedback!: Label;
    private combo!: Label;
    private ore!: Label;
    private beatDots: Label[] = [];

    initialize(bpm: number): void {
        this.makeLabel('Title', 'BEAT MINER', 0, 310, 30, new Color(247, 209, 88));
        this.makeLabel('Help', `A / D 或 ← / → 移动    SPACE 挥镐    BPM ${bpm}`, 0, -325, 20, new Color(174, 183, 204));
        this.feedback = this.makeLabel('Feedback', '等待节拍…', 0, 210, 38, new Color(174, 183, 204));
        this.combo = this.makeLabel('Combo', 'COMBO 0', -490, 292, 24, new Color(255, 178, 84));
        this.ore = this.makeLabel('Ore', 'ORE 0', 490, 292, 24, new Color(92, 230, 222));
        for (let i = 0; i < 4; i++) this.beatDots.push(this.makeLabel(`Beat${i + 1}`, '■', -72 + i * 48, 260, 30, new Color(75, 74, 98)));
    }

    showBeat(active: number, intensity: number): void {
        this.beatDots.forEach((dot, index) => {
            dot.color = index === active ? new Color(255, 221, 92) : new Color(75, 74, 98);
            dot.node.setScale(index === active ? 1.15 + intensity * 0.04 : 1, index === active ? 1.15 + intensity * 0.04 : 1, 1);
        });
    }

    showJudgement(judgement: BeatJudgement, combo: number): void {
        const colors = { Perfect: new Color(255, 239, 116), Good: new Color(89, 225, 176), Miss: new Color(239, 99, 110) };
        this.feedback.string = judgement.toUpperCase();
        this.feedback.color = colors[judgement];
        this.feedback.node.setScale(1.35, 1.35, 1);
        tween(this.feedback.node).to(0.14, { scale: Vec3.ONE }).start();
        this.combo.string = `COMBO ${combo}`;
    }

    setOre(count: number): void { this.ore.string = `ORE ${count}`; }

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
