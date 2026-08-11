import { _decorator, Component, Label, Button } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Welcome')
export class Welcome extends Component {
    @property(Label)
    statusLabel: Label | null = null    // Lebel类型或者null

    private score: number = 0

    @property(Button)
    addBtn: Button | null = null

    @property(Button)
    subBtn: Button | null = null

    start() {
        console.log('游戏开始了')
        this.refreshLabelTxt()

        if (this.addBtn) {
            this.addBtn.node.on(Button.EventType.CLICK, (event: Event) => {
                this.changeScore(1)
            }, this)
        }
        if (this.subBtn) {
            this.subBtn.node.on(Button.EventType.CLICK, (event: Event) => {
                this.changeScore(-1)
            }, this)
        }
    }

    private refreshLabelTxt(): void {
        if (this.statusLabel) { // 可能为null，需要判断
            this.statusLabel.string = `得分：${this.score}`
        }
    }

    private changeScore(delta: number): void {
        this.score += delta
        if (this.score < 0) {
            this.score = 0
        }
        this.refreshLabelTxt()
    }

    update(deltaTime: number) {

    }
}



