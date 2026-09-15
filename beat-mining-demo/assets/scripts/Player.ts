import { _decorator, Color, Component, EventKeyboard, Graphics, input, Input, KeyCode, Node, tween, Vec3 } from 'cc';
import { fillRect, makeGraphicsNode } from './PixelArt';
const { ccclass } = _decorator;

@ccclass('Player')
export class Player extends Component {
    private leftDown = false;
    private rightDown = false;
    private facing = 1;
    private swinging = false;
    private requestMine: (() => void) | null = null;
    private body!: Graphics;
    private pickaxe!: Node;
    private readonly speed = 260;

    initialize(requestMine: () => void): void {
        this.requestMine = requestMine;
        this.draw();
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
    }

    update(dt: number): void {
        const direction = (this.rightDown ? 1 : 0) - (this.leftDown ? 1 : 0);
        if (direction !== 0) {
            this.facing = direction;
            const nextX = Math.max(-540, Math.min(540, this.node.position.x + direction * this.speed * dt));
            this.node.setPosition(nextX, this.node.position.y, 0);
            this.pickaxe.setScale(this.facing, 1, 1);
        }
    }

    get miningPointX(): number { return this.node.position.x + this.facing * 72; }
    get worldX(): number { return this.node.position.x; }

    swing(): void {
        if (this.swinging) return;
        this.swinging = true;
        this.requestMine?.();
        this.pickaxe.setScale(this.facing, 1, 1);
        tween(this.pickaxe)
            .to(0.07, { angle: -55 * this.facing })
            .to(0.09, { angle: 35 * this.facing })
            .to(0.08, { angle: 0 })
            .call(() => { this.swinging = false; })
            .start();
    }

    protected onDestroy(): void {
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
    }

    private onKeyDown(event: EventKeyboard): void {
        if (event.keyCode === KeyCode.KEY_A || event.keyCode === KeyCode.ARROW_LEFT) { this.leftDown = true; this.nudge(-1); }
        if (event.keyCode === KeyCode.KEY_D || event.keyCode === KeyCode.ARROW_RIGHT) { this.rightDown = true; this.nudge(1); }
        if (event.keyCode === KeyCode.SPACE) this.swing();
    }

    private onKeyUp(event: EventKeyboard): void {
        if (event.keyCode === KeyCode.KEY_A || event.keyCode === KeyCode.ARROW_LEFT) this.leftDown = false;
        if (event.keyCode === KeyCode.KEY_D || event.keyCode === KeyCode.ARROW_RIGHT) this.rightDown = false;
    }

    private nudge(direction: number): void {
        this.facing = direction;
        this.node.setPosition(Math.max(-540, Math.min(540, this.node.position.x + direction * 18)), this.node.position.y, 0);
        this.pickaxe.setScale(this.facing, 1, 1);
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
        this.pickaxe.setPosition(30, 15);
        this.pickaxe.setScale(this.facing, 1, 1);
        const g = this.pickaxe.getComponent(Graphics)!;
        fillRect(g, new Color(116, 77, 50), -3, -34, 6, 62);
        fillRect(g, new Color(185, 201, 204), -28, 23, 56, 8);
    }

}
