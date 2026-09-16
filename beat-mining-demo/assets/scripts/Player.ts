import { _decorator, Color, Component, EventKeyboard, Graphics, input, Input, KeyCode, Node, tween, Vec3 } from 'cc';
import { fillRect, makeGraphicsNode } from './PixelArt';
const { ccclass } = _decorator;

@ccclass('Player')
export class Player extends Component {
    private leftDown = false;
    private rightDown = false;
    private facing = 1;
    private swinging = false;
    private requestMine: (() => SwingPlan) | null = null;
    private body!: Graphics;
    private pickaxe!: Node;
    private readonly speed = 260;
    private readonly acceleration = 2400;
    private readonly deceleration = 3200;
    private readonly initialMoveSpeed = 120;
    private velocityX = 0;

    initialize(requestMine: () => SwingPlan): void {
        this.requestMine = requestMine;
        this.draw();
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
    }

    update(dt: number): void {
        const direction = (this.rightDown ? 1 : 0) - (this.leftDown ? 1 : 0);
        if (direction !== 0) {
            this.facing = direction;
            this.updateFacingVisual();
        }
        const targetVelocity = direction * this.speed;
        const changeRate = direction === 0 ? this.deceleration : this.acceleration;
        this.velocityX = this.moveToward(this.velocityX, targetVelocity, changeRate * dt);
        const nextX = Math.max(-540, Math.min(540, this.node.position.x + this.velocityX * dt));
        if (nextX === -540 || nextX === 540) this.velocityX = 0;
        this.node.setPosition(nextX, this.node.position.y, 0);
    }

    get miningPointX(): number { return this.node.position.x + this.facing * 72; }
    get worldX(): number { return this.node.position.x; }

    swing(): void {
        if (this.swinging) return;
        this.swinging = true;
        const plan = this.requestMine?.() ?? { impactHoldSeconds: 0, onImpact: () => undefined };
        this.updateFacingVisual();
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
        if ((event.keyCode === KeyCode.KEY_A || event.keyCode === KeyCode.ARROW_LEFT) && !this.leftDown) {
            this.leftDown = true;
            this.velocityX = Math.min(this.velocityX, -this.initialMoveSpeed);
        }
        if ((event.keyCode === KeyCode.KEY_D || event.keyCode === KeyCode.ARROW_RIGHT) && !this.rightDown) {
            this.rightDown = true;
            this.velocityX = Math.max(this.velocityX, this.initialMoveSpeed);
        }
        if (event.keyCode === KeyCode.SPACE) this.swing();
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

    private draw(): void {
        const bodyNode = makeGraphicsNode('Body', this.node, 54, 82);
        this.body = bodyNode.getComponent(Graphics)!;
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

}

export interface SwingPlan {
    impactHoldSeconds: number;
    onImpact: () => void;
}
