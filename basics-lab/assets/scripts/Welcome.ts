import { _decorator, Component, Label } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Welcome')
export class Welcome extends Component {
    @property(Label)
    statusLabel: Label | null = null

    start() {
        console.log('游戏开始了')
    }

    update(deltaTime: number) {

    }
}



