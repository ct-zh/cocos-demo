import { _decorator, Color, Component, Graphics, tween, Vec3 } from 'cc';
import { BeatJudgement } from './BeatTypes';
import { fillRect, makeGraphicsNode } from './PixelArt';
const { ccclass } = _decorator;

export type RockKind = 'normal' | 'hard' | 'crystal';

export interface MiningRockConfig {
    kind: RockKind;
    hp: number;
    drops: number;
}

@ccclass('MiningRock')
export class MiningRock extends Component {
    private hp = 5;
    private maxHp = 5;
    private kind: RockKind = 'normal';
    private graphics!: Graphics;
    private brokenCallback: ((x: number) => void) | null = null;
    private mineable = false;

    initialize(config: MiningRockConfig, onBroken: (x: number) => void): void {
        this.kind = config.kind;
        this.hp = config.hp;
        this.maxHp = config.hp;
        this.brokenCallback = onBroken;
        this.graphics = this.node.getComponent(Graphics)!;
        this.redraw(false);
    }

    get remainingHp(): number { return this.hp; }
    get rockKind(): RockKind { return this.kind; }

    takeHit(damage: number, judgement: BeatJudgement, perfectStreak: number): void {
        this.hp = Math.max(0, this.hp - damage);
        this.redraw(judgement === BeatJudgement.Perfect);
        if (judgement === BeatJudgement.Perfect) {
            this.scheduleOnce(() => {
                if (this.isValid && this.node.isValid) this.redraw(false);
            }, 0.1);
        }
        this.spawnDebris(judgement === BeatJudgement.Perfect, perfectStreak);
        const crystalBoost = this.kind === 'crystal' ? 0.08 : 0;
        const strength = judgement === BeatJudgement.Perfect ? 1.15 + crystalBoost + Math.min(perfectStreak, 5) * 0.04 : 1.08 + crystalBoost;
        tween(this.node).to(0.06, { scale: new Vec3(strength, 0.9, 1) }).to(0.08, { scale: Vec3.ONE }).start();
        if (this.hp <= 0) {
            const x = this.node.position.x;
            const breakScale = this.kind === 'crystal' ? 1.65 : 1.35;
            tween(this.node).to(0.16, { scale: new Vec3(breakScale, 0.12, 1), angle: this.kind === 'crystal' ? 14 : 8 }).call(() => {
                this.brokenCallback?.(x);
                this.node.destroy();
            }).start();
        }
    }

    setMineable(value: boolean): void {
        if (this.mineable === value) return;
        this.mineable = value;
        if (!this.graphics || !this.graphics.isValid || !this.node.isValid) return;
        this.redraw(false);
        if (value) tween(this.node).to(0.06, { scale: new Vec3(1.04, 1.04, 1) }).to(0.08, { scale: Vec3.ONE }).start();
    }

    private spawnDebris(perfect: boolean, perfectStreak: number): void {
        const parent = this.node.parent;
        if (!parent) return;
        const kindBonus = this.kind === 'crystal' ? 4 : this.kind === 'hard' ? 1 : 0;
        const count = (perfect ? 4 + Math.min(perfectStreak, 4) : 2) + kindBonus;
        for (let i = 0; i < count; i++) {
            const chip = makeGraphicsNode('RockChip', parent, 8, 8);
            chip.setPosition(this.node.position);
            const g = chip.getComponent(Graphics)!;
            const normalChip = this.kind === 'hard' ? new Color(200, 145, 89) : this.kind === 'crystal' ? new Color(112, 235, 255) : new Color(92, 178, 188);
            fillRect(g, perfect ? new Color(255, 238, 128) : normalChip, -4, -4, 8, 8);
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
        if (this.mineable) {
            const edge = new Color(113, 238, 224);
            fillRect(g, edge, -50, -42, 100, 4);
            fillRect(g, edge, -50, 38, 100, 4);
            fillRect(g, edge, -50, -42, 4, 84);
            fillRect(g, edge, 46, -42, 4, 84);
        }
        const outer = this.kind === 'hard' ? new Color(49, 42, 39) : this.kind === 'crystal' ? new Color(34, 35, 62) : new Color(46, 39, 54);
        const inner = this.kind === 'hard' ? new Color(103, 78, 61) : this.kind === 'crystal' ? new Color(59, 68, 102) : new Color(81, 69, 88);
        const ore = this.kind === 'hard' ? new Color(229, 151, 76) : new Color(77, 200, 211);
        const oreLight = this.kind === 'hard' ? new Color(255, 203, 112) : new Color(120, 232, 229);
        fillRect(g, outer, -46, -38, 92, 76);
        fillRect(g, inner, -39, -31, 75, 60);
        if (this.kind === 'crystal') {
            fillRect(g, perfect ? new Color(255, 246, 166) : new Color(84, 219, 239), -12, -25, 24, 51);
            fillRect(g, perfect ? new Color(255, 255, 220) : new Color(168, 250, 255), -4, -18, 8, 34);
            fillRect(g, new Color(127, 105, 232), 16, -5, 13, 27);
            fillRect(g, new Color(81, 69, 177), -29, 5, 12, 20);
        } else {
            fillRect(g, perfect ? new Color(255, 238, 128) : ore, -17, -9, 15, 18);
            fillRect(g, perfect ? new Color(255, 250, 196) : oreLight, 8, 8, 18, 13);
            fillRect(g, new Color(29, 24, 36), -31, 17, 17, 8);
        }
        this.drawCracks(g);
        const segmentWidth = Math.max(4, Math.floor(72 / this.maxHp) - 2);
        const step = Math.floor(72 / this.maxHp);
        for (let i = 0; i < this.hp; i++) fillRect(g, new Color(220, 116, 86), -36 + i * step, -31, segmentWidth, 5);
    }

    private drawCracks(g: Graphics): void {
        const damageRatio = 1 - this.hp / this.maxHp;
        const crack = new Color(25, 22, 31);
        if (damageRatio >= 0.2) {
            fillRect(g, crack, -4, 15, 4, 13);
            fillRect(g, crack, -10, 11, 9, 4);
        }
        if (damageRatio >= 0.45) {
            fillRect(g, crack, 18, -22, 4, 17);
            fillRect(g, crack, 21, -8, 10, 4);
        }
        if (damageRatio >= 0.7) {
            fillRect(g, crack, -27, -18, 4, 19);
            fillRect(g, crack, -23, -2, 9, 4);
        }
    }
}
