import { Color, Graphics, Node, UITransform, Vec3 } from 'cc';

export function makeGraphicsNode(name: string, parent: Node, width: number, height: number): Node {
    const node = new Node(name);
    node.layer = parent.layer;
    parent.addChild(node);
    node.addComponent(UITransform).setContentSize(width, height);
    node.addComponent(Graphics);
    return node;
}

export function fillRect(graphics: Graphics, color: Color, x: number, y: number, width: number, height: number): void {
    graphics.fillColor = color;
    graphics.rect(x, y, width, height);
    graphics.fill();
}

export function setPosition(node: Node, x: number, y: number): void {
    node.setPosition(new Vec3(x, y, 0));
}
