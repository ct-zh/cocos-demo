import { _decorator, Color, Component, Graphics, tween, Vec3 } from 'cc';
import { BeatJudgement } from './BeatTypes';
import { fillRect, makeGraphicsNode } from './PixelArt';
const { ccclass } = _decorator;

@ccclass('MiningRock')
export class MiningRock extends Component {
    private hp = 5;
    private graphics!: Graphics;
    private brokenCallback: ((x: number) => void) | null = null;

    initialize(onBroken: (x: number) => void): void {
        this.brokenCallback = onBroken;
        this.graphics = this.node.getComponent(Graphics)!;
        this.redraw(false);
    }

    takeHit(damage: number, judgement: BeatJudgement, perfectStreak: number): void {
        this.hp -= damage;
        this.redraw(judgement === BeatJudgement.Perfect);
        this.spawnDebris(judgement === BeatJudgement.Perfect, perfectStreak);
        const strength = judgement === BeatJudgement.Perfect ? 1.15 + Math.min(perfectStreak, 5) * 0.04 : 1.08;
        tween(this.node).to(0.06, { scale: new Vec3(strength, 0.9, 1) }).to(0.08, { scale: Vec3.ONE }).start();
        if (this.hp <= 0) {
            const x = this.node.position.x;
            tween(this.node).to(0.16, { scale: new Vec3(1.35, 0.15, 1), angle: 8 }).call(() => {
                this.brokenCallback?.(x);
                this.node.destroy();
            }).start();
        }
    }

    private spawnDebris(perfect: boolean, perfectStreak: number): void {
        const parent = this.node.parent;
        if (!parent) return;
        const count = perfect ? 4 + Math.min(perfectStreak, 4) : 2;
        for (let i = 0; i < count; i++) {
            const chip = makeGraphicsNode('RockChip', parent, 8, 8);
            chip.setPosition(this.node.position);
            const g = chip.getComponent(Graphics)!;
            fillRect(g, perfect ? new Color(255, 238, 128) : new Color(92, 178, 188), -4, -4, 8, 8);
            const direction = i % 2 === 0 ? -1 : 1;
            const spread = 18 + (i % 3) * 11;
            tween(chip)
                .to(0.18, {
                    position: new Vec3(this.node.position.x + direction * spread, this.node.position.y + 24 + (i % 3) * 12, 0),
                    scale: new Vec3(0.2, 0.2, 1),
                    angle: direction * 35,
                })
                .call(() => chip.destroy())
                .start();
        }
    }

    private redraw(perfect: boolean): void {
        const g = this.graphics;
        g.clear();
        fillRect(g, new Color(46, 39, 54), -46, -38, 92, 76);
        fillRect(g, new Color(81, 69, 88), -39, -31, 75, 60);
        fillRect(g, perfect ? new Color(255, 238, 128) : new Color(77, 200, 211), -17, -9, 15, 18);
        fillRect(g, perfect ? new Color(255, 250, 196) : new Color(120, 232, 229), 8, 8, 18, 13);
        fillRect(g, new Color(29, 24, 36), -31, 17, 17, 8);
        for (let i = 0; i < Math.max(0, this.hp); i++) fillRect(g, new Color(220, 116, 86), -38 + i * 15, -31, 10, 5);
    }
}
