import { _decorator, Color, Component, EventKeyboard, Graphics, input, Input, KeyCode, Node, Tween, tween, Vec3 } from 'cc';
import { fillRect, makeGraphicsNode } from './PixelArt';
const { ccclass } = _decorator;

export const MINING_POINT_OFFSET = 72;

@ccclass('Player')
export class Player extends Component {
    private leftDown = false;
    private rightDown = false;
    private facing = 1;
    private swinging = false;
    private requestMine: (() => SwingPlan) | null = null;
    private rhythmClock: (() => PlayerRhythmState) | null = null;
    private controlState: (() => PlayerControlState) | null = null;
    private bodyNode!: Node;
    private body!: Graphics;
    private leftLeg!: Node;
    private rightLeg!: Node;
    private pickaxe!: Node;
    private readonly speed = 260;
    private readonly acceleration = 2400;
    private readonly deceleration = 3200;
    private readonly initialMoveSpeed = 120;
    private velocityX = 0;
    private assistActive = false;

    initialize(requestMine: () => SwingPlan, rhythmClock: () => PlayerRhythmState, controlState: () => PlayerControlState): void {
        this.requestMine = requestMine;
        this.rhythmClock = rhythmClock;
        this.controlState = controlState;
        this.draw();
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
    }

    update(dt: number): void {
        const direction = this.controlState?.().canMove === false ? 0 : (this.rightDown ? 1 : 0) - (this.leftDown ? 1 : 0);
        if (direction !== 0) {
            this.facing = direction;
            this.updateFacingVisual();
        }
        const targetVelocity = direction * this.speed;
        const changeRate = direction === 0 ? this.deceleration : this.acceleration;
        this.velocityX = this.moveToward(this.velocityX, targetVelocity, changeRate * dt);
        if (!this.assistActive) {
            const nextX = Math.max(-540, Math.min(540, this.node.position.x + this.velocityX * dt));
            if (nextX === -540 || nextX === 540) this.velocityX = 0;
            this.node.setPosition(nextX, this.node.position.y, 0);
        }
        this.updateRhythmVisuals();
    }

    get miningPointX(): number { return this.node.position.x + this.facing * MINING_POINT_OFFSET; }
    get worldX(): number { return this.node.position.x; }
    get facingDirection(): 1 | -1 { return this.facing >= 0 ? 1 : -1; }
    get isAssisting(): boolean { return this.assistActive; }
    get leftLegLift(): number { return this.leftLeg.position.y + 43; }
    get rightLegLift(): number { return this.rightLeg.position.y + 43; }

    swing(): void {
        const plan = this.requestMine?.() ?? { accepted: false, impactHoldSeconds: 0, onImpact: () => undefined };
        if (this.swinging) return;
        this.updateFacingVisual();
        if (!plan.accepted) {
            Tween.stopAllByTarget(this.pickaxe);
            tween(this.pickaxe)
                .to(0.04, { angle: -8 * this.facing })
                .to(0.07, { angle: 0 })
                .start();
            return;
        }
        this.swinging = true;
        Tween.stopAllByTarget(this.pickaxe);
        if (plan.assistStep) this.startAssist(plan.assistStep);
        tween(this.node)
            .to(0.04, { scale: new Vec3(0.96, 1.04, 1) })
            .to(0.08, { scale: new Vec3(1.03, 0.97, 1) })
            .to(0.12, { scale: Vec3.ONE })
            .start();
        tween(this.pickaxe)
            .to(0.045, { angle: -48 * this.facing })
            .to(0.065, { angle: 42 * this.facing })
            .call(() => plan.onImpact())
            .delay(plan.impactHoldSeconds)
            .to(0.11, { angle: 0 })
            .call(() => { this.swinging = false; })
            .start();
    }

    protected onDestroy(): void {
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
    }

    private onKeyDown(event: EventKeyboard): void {
        const control = this.controlState?.() ?? { canMove: true, canMine: true };
        if (event.keyCode === KeyCode.SPACE) {
            if (control.canMine) this.swing();
            else this.requestMine?.();
            return;
        }
        if (!control.canMove) return;
        if ((event.keyCode === KeyCode.KEY_A || event.keyCode === KeyCode.ARROW_LEFT) && !this.leftDown) {
            this.leftDown = true;
            this.velocityX = Math.min(this.velocityX, -this.initialMoveSpeed);
        }
        if ((event.keyCode === KeyCode.KEY_D || event.keyCode === KeyCode.ARROW_RIGHT) && !this.rightDown) {
            this.rightDown = true;
            this.velocityX = Math.max(this.velocityX, this.initialMoveSpeed);
        }
    }

    private onKeyUp(event: EventKeyboard): void {
        if (event.keyCode === KeyCode.KEY_A || event.keyCode === KeyCode.ARROW_LEFT) this.leftDown = false;
        if (event.keyCode === KeyCode.KEY_D || event.keyCode === KeyCode.ARROW_RIGHT) this.rightDown = false;
    }

    private updateFacingVisual(): void {
        this.pickaxe.setScale(this.facing, 1, 1);
        this.pickaxe.setPosition(30 * this.facing, 15);
    }

    private moveToward(current: number, target: number, maxDelta: number): number {
        if (Math.abs(target - current) <= maxDelta) return target;
        return current + Math.sign(target - current) * maxDelta;
    }

    private startAssist(step: AssistStep): void {
        const targetX = Math.max(-540, Math.min(540, step.targetX));
        this.assistActive = true;
        tween(this.node)
            .to(step.durationSeconds, { position: new Vec3(targetX, this.node.position.y, this.node.position.z) })
            .call(() => { this.assistActive = false; })
            .start();
    }

    private draw(): void {
        this.leftLeg = makeGraphicsNode('LeftLeg', this.node, 16, 22);
        this.leftLeg.setPosition(-11, -43);
        const leftLegGraphics = this.leftLeg.getComponent(Graphics)!;
        fillRect(leftLegGraphics, new Color(32, 25, 35), -6, -10, 12, 20);
        fillRect(leftLegGraphics, new Color(90, 155, 173), -6, -10, 12, 7);

        this.rightLeg = makeGraphicsNode('RightLeg', this.node, 16, 22);
        this.rightLeg.setPosition(11, -43);
        const rightLegGraphics = this.rightLeg.getComponent(Graphics)!;
        fillRect(rightLegGraphics, new Color(32, 25, 35), -6, -10, 12, 20);
        fillRect(rightLegGraphics, new Color(90, 155, 173), -6, -10, 12, 7);

        this.bodyNode = makeGraphicsNode('Body', this.node, 54, 82);
        this.body = this.bodyNode.getComponent(Graphics)!;
        fillRect(this.body, new Color(32, 25, 35), -22, -36, 44, 48);
        fillRect(this.body, new Color(226, 151, 87), -17, 12, 34, 28);
        fillRect(this.body, new Color(230, 184, 58), -24, 35, 48, 11);
        fillRect(this.body, new Color(90, 155, 173), -22, -31, 44, 20);
        fillRect(this.body, new Color(241, 217, 154), 8, 20, 5, 5);

        this.pickaxe = makeGraphicsNode('Pickaxe', this.node, 80, 80);
        this.updateFacingVisual();
        const g = this.pickaxe.getComponent(Graphics)!;
        fillRect(g, new Color(116, 77, 50), -3, -34, 6, 62);
        fillRect(g, new Color(185, 201, 204), -28, 23, 56, 8);
    }

    private updateRhythmVisuals(): void {
        const rhythm = this.rhythmClock?.();
        if (!rhythm?.active) {
            this.leftLeg.setPosition(-11, -43);
            this.rightLeg.setPosition(11, -43);
            this.bodyNode.setPosition(0, 0);
            return;
        }
        const cycle = rhythm.beatPosition / rhythm.tapCycleBeats;
        const wave = Math.sin(cycle * Math.PI * 2);
        const leftLift = Math.max(0, wave) * 5;
        const rightLift = Math.max(0, -wave) * 5;
        this.leftLeg.setPosition(-11, -43 + leftLift);
        this.rightLeg.setPosition(11, -43 + rightLift);
        this.bodyNode.setPosition(0, Math.abs(wave) * 1.5);
    }

}

export interface PlayerControlState {
    canMove: boolean;
    canMine: boolean;
}

export interface PlayerRhythmState {
    active: boolean;
    beatPosition: number;
    tapCycleBeats: number;
}

export interface SwingPlan {
    accepted: boolean;
    impactHoldSeconds: number;
    onImpact: () => void;
    assistStep?: AssistStep;
}

export interface AssistStep {
    targetX: number;
    durationSeconds: number;
}
