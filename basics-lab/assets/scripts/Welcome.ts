import { _decorator, Component, Label, Button, input, Input, EventKeyboard, KeyCode } from 'cc';
const { ccclass, property } = _decorator;

// 回合状态枚举
enum RoundStatus {
    Idle = "idle",
    Running = "running",
    Paused = "paused",
    Finished = "finished"
}

const ROUND_TIME: number = 10;


@ccclass('Welcome')
export class Welcome extends Component {

    // {{{{{{{{{{{ 得分
    private score: number = 0

    @property(Label)
    statusLabel: Label | null = null    // Lebel类型或者null

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

    // 增加得分
    @property(Button)
    addBtn: Button | null = null

    private addScore(): void {
        this.changeScore(1)
    }

    // 减少得分
    @property(Button)
    subBtn: Button | null = null

    private subScore(): void {
        this.changeScore(-1)
    }
    // }}}}}}}}}}}

    // {{{{{{{{{{{ 帮助文字
    private showHelpTxt: boolean = true // 是否显示

    @property(Label)
    helpLable: Label | null = null

    // 刷新帮助文字状态
    private refreshHelpLabelStatus(): void {
        if (this.helpLable) {
            this.helpLable.node.active = this.showHelpTxt
        }
    }

    // 隐藏帮助文字
    @property(Button)
    helpBtn: Button | null = null

    private changeHelpTxtStatus(): void {
        this.showHelpTxt = !this.showHelpTxt
        this.refreshHelpLabelStatus()
    }
    // }}}}}}}}}}}

    // 计时
    @property(Label)
    timeLabel: Label | null = null

    private refreshTimeTxt(): void {
        if (this.timeLabel) {
            this.timeLabel.string = `运行：${Math.floor(this.runTime)} 秒`
        }
    }

    // 重置
    @property(Button)
    resetBtn: Button | null = null

    // bind $this.resetBtn
    private reset(): void {
        this.score = 0
        this.refreshLabelTxt()

        this.runTime = 0
        this.elapsed = 0
        this.refreshTimeTxt()

        this.showHelpTxt = true
        this.refreshHelpLabelStatus()
    }

    // {{{{{{{{{{{ 回合数据
    roundTimer: number = ROUND_TIME // 当前回合时间
    roundStu: RoundStatus = RoundStatus.Idle // 当前回合状态

    // 展示当前回合状态和剩余秒数
    @property(Label)
    roundLabel: Label | null = null

    private refreshRoundLabel(): void {
        this.roundLabel.string = `回合状态：${this.roundStu} 剩余时间：${this.roundTimer}`
    }

    // 回合结束时显示“挑战结束”，其余状态隐藏
    @property(Label)
    finishedLabel: Label | null = null

    private hiddenFinishLabel(): void {
        this.finishedLabel.node.active = false
    }

    private showFinisheLabel(): void {
        this.finishedLabel.node.active = true
    }

    @property(Button)
    startBtn: Button | null = null

    private roundStart(): void {
        if (this.roundStu == RoundStatus.Running || this.roundStu == RoundStatus.Finished) {
            throw new Error("回合状态非法")
        }

        // this.roundTimer = ROUND_TIME // 初始化回合时间
        this.roundStu = RoundStatus.Running
        this.roundBtnRender()
        this.refreshRoundLabel()
        this.hiddenFinishLabel()
    }

    @property(Button)
    pauseBtn: Button | null = null

    private roundPause(): void {
        if (this.roundStu != RoundStatus.Running) {
            throw new Error("回合状态非法")
        }

        this.roundStu = RoundStatus.Paused
        this.roundBtnRender()
        this.refreshRoundLabel()
    }

    @property(Button)
    restartBtn: Button | null = null

    private roundRestart(): void {
        this.roundTimer = ROUND_TIME // 初始化回合时间
        this.roundStu = RoundStatus.Idle
        this.roundElapsed = 0
        this.roundBtnRender()
        this.refreshRoundLabel()
        this.hiddenFinishLabel()
    }

    private roundFinish(): void {
        this.roundStu = RoundStatus.Finished
        this.roundElapsed = 0
        this.roundBtnRender()
        this.refreshRoundLabel()
        this.showFinisheLabel()
    }

    private runRound(): void {
        if (this.roundStu != RoundStatus.Running) {
            return
        }
        this.roundTimer--
        if (this.roundTimer <= 0) {
            this.roundTimer = 0
            this.roundFinish()
        } else {
            this.refreshRoundLabel()
        }
    }

    // 必须在修改完状态后调用
    private roundBtnRender(): void {
        switch (this.roundStu) {
            case RoundStatus.Idle: // 未开始状态（重开状态） 
                this.startBtn.interactable = true
                this.pauseBtn.interactable = false
                this.restartBtn.interactable = true
                break
            case RoundStatus.Running:
                this.pauseBtn.interactable = true
                this.startBtn.interactable = false
                this.restartBtn.interactable = true
                break
            case RoundStatus.Paused:
                this.pauseBtn.interactable = false
                this.startBtn.interactable = true
                this.restartBtn.interactable = true
                break
            case RoundStatus.Finished:
                this.pauseBtn.interactable = false
                this.startBtn.interactable = false
                this.restartBtn.interactable = true
                break
            default:
                throw new Error("状态非法")
        }
    }

    // }}}}}}}}}}} 回合数据


    start() {
        console.log('start')
        this.refreshLabelTxt()

        this.refreshHelpLabelStatus()

        if (this.addBtn) {
            this.addBtn.node.on(Button.EventType.CLICK, this.addScore, this)
        }
        if (this.subBtn) {
            this.subBtn.node.on(Button.EventType.CLICK, this.subScore, this)
        }
        if (this.helpBtn) {
            this.helpBtn.node.on(Button.EventType.CLICK, this.changeHelpTxtStatus, this)
        }
        if (this.resetBtn) {
            this.resetBtn.node.on(Button.EventType.CLICK, this.reset, this)
        }
        if (this.timeLabel) {
            this.refreshTimeTxt()
        }

        this.refreshRoundLabel()
        if (this.startBtn) {
            this.startBtn.node.on(Button.EventType.CLICK, this.roundStart, this)
        }
        if (this.pauseBtn) {
            this.pauseBtn.node.on(Button.EventType.CLICK, this.roundPause, this)
        }
        if (this.restartBtn) {
            this.restartBtn.node.on(Button.EventType.CLICK, this.roundRestart, this)
        }
        this.roundBtnRender()
        this.hiddenFinishLabel()
    }

    onDestroy(): void {
        if (this.addBtn) {
            this.addBtn.node.off(Button.EventType.CLICK, this.addScore, this)
        }
        if (this.subBtn) {
            this.subBtn.node.off(Button.EventType.CLICK, this.subScore, this)
        }
        if (this.helpBtn) {
            this.helpBtn.node.off(Button.EventType.CLICK, this.changeHelpTxtStatus, this)
        }
        if (this.resetBtn) {
            this.resetBtn.node.off(Button.EventType.CLICK, this.reset, this)
        }

        if (this.startBtn) {
            this.startBtn.node.off(Button.EventType.CLICK, this.roundStart, this)
        }
        if (this.pauseBtn) {
            this.pauseBtn.node.off(Button.EventType.CLICK, this.roundPause, this)
        }
        if (this.restartBtn) {
            this.restartBtn.node.off(Button.EventType.CLICK, this.roundRestart, this)
        }
    }

    private onKeyDown(event: EventKeyboard): void {
        if (event.keyCode == KeyCode.SPACE) {
            if (this.roundStu == RoundStatus.Paused || this.roundStu == RoundStatus.Idle) {
                this.roundStart()
            } else if (this.roundStu == RoundStatus.Running) {
                this.roundPause()
            }
        }

        if (event.keyCode == KeyCode.KEY_R) {
            if (this.restartBtn.interactable) {
                this.roundRestart()
            }
        }
    }

    onEnable(): void {
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this)
    }

    onDisable(): void {
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this)
    }

    // 运行时间
    private runTime: number = 0

    // 每累计1秒触发if内的逻辑
    private elapsed = 0

    private roundElapsed = 0

    update(deltaTime: number) {
        this.runTime += deltaTime
        this.elapsed += deltaTime

        if (this.elapsed >= 1) {
            this.elapsed -= 1
            this.refreshTimeTxt()
        }

        if (this.roundStu == RoundStatus.Running) {
            this.roundElapsed += deltaTime
            if (this.roundElapsed >= 1) {
                this.roundElapsed -= 1
                this.runRound()
            }
        }
    }
}



