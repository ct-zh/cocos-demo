import { _decorator, Color, Component, Graphics, tween, Vec3 } from 'cc';
import { fillRect } from './PixelArt';
const { ccclass } = _decorator;

@ccclass('OrePickup')
export class OrePickup extends Component {
    initialize(rich = false): void {
        const g = this.node.getComponent(Graphics)!;
        fillRect(g, rich ? new Color(107, 105, 235) : new Color(49, 212, 224), -13, -15, 26, 30);
        fillRect(g, rich ? new Color(193, 190, 255) : new Color(153, 252, 240), -5, 1, 10, 11);
        this.node.setScale(0, 0, 1);
        tween(this.node).to(0.22, { scale: Vec3.ONE, position: new Vec3(this.node.position.x, -205, 0) }).start();
    }

    collect(onDone: () => void): void {
        tween(this.node).to(0.12, { scale: new Vec3(1.5, 1.5, 1) }).to(0.1, { scale: Vec3.ZERO }).call(() => {
            onDone();
            this.node.destroy();
        }).start();
    }
}
