import { _decorator, Color, Component, director, EventKeyboard, Graphics, input, Input, KeyCode, Node, profiler, Tween, tween, Vec3 } from 'cc';
import { BeatManager } from './BeatManager';
import { BeatJudgement } from './BeatTypes';
import { CalibrationManager } from './CalibrationManager';
import { AudioManager } from './AudioManager';
import { MiningRangeHint, MiningRock, MiningRockConfig } from './MiningRock';
import { MINE_TRACK } from './MusicTrackConfig';
import { OrePickup } from './OrePickup';
import { fillRect, makeGraphicsNode, setPosition } from './PixelArt';
import { AssistStep, MINING_POINT_OFFSET, Player, SwingPlan } from './Player';
import { CompletionRating, CompletionSummary, UIController } from './UIController';
import { GameModeId } from './modes/MiningGameMode';
import { MiningGameMode } from './modes/MiningGameMode';
import { ClassicMiningMode } from './modes/ClassicMiningMode';
import { PatternReplayMode } from './modes/PatternReplayMode';
const { ccclass } = _decorator;

type DebugApi = { state: () => object; forceSwing: () => void; teleportToRock: () => void };
type RockPlan = MiningRockConfig & { x: number };

const ATTACK_RANGE = 92;
const ASSIST_MARGIN = 24;
const ASSIST_MAX_STEP = 24;

type MiningTargetState = 'none' | 'tooFar' | 'assist' | 'inRange' | 'facingWrong';

function rejectedSwing(): SwingPlan {
    return { accepted: false, impactHoldSeconds: 0, onImpact: () => undefined };
}

@ccclass('GameManager')
export class GameManager extends Component {
    private world!: Node;
    private rhythmRoot!: Node;
    private caveBackground!: Node;
    private player!: Player;
    private beat!: BeatManager;
    private audio!: AudioManager;
    private ui!: UIController;
    private calibration!: CalibrationManager;
    private rocks: MiningRock[] = [];
    private ores: OrePickup[] = [];
    private combo = 0;
    private perfectStreak = 0;
    private hotHand = false;
    private oreCount = 0;
    private lastJudgement = 'Waiting';
    private perfectCount = 0;
    private goodCount = 0;
    private missCount = 0;
    private maxCombo = 0;
    private timingSampleCount = 0;
    private totalAbsTimingMs = 0;
    private lastTimingMs = 0;
    private firstSwingAt: number | null = null;
    private completedSeconds: number | null = null;
    private mineableRock: MiningRock | null = null;
    private highlightedRock: MiningRock | null = null;
    private highlightedRockHint: MiningRangeHint = 'none';
    private targetState: MiningTargetState = 'none';
    private impactPending = false;
    private totalRockCount = 0;
    private brokenRockCount = 0;
    private finalCrystalBroken = false;
    private collectingOres = 0;
    private ignoredInputCount = 0;
    private initialized = false;
    private calibrationInitialized = false;
    private selectedMode: GameModeId | null = null;
    private currentMode: MiningGameMode | null = null;
    private modeSelectionVisible = true;


    start(): void {
        profiler.hideStats();
        this.buildScene();
        this.initialized = true;
        this.installDebugApi();
        const mode = new URLSearchParams(window.location.search).get('mode');
        if (mode === 'classic' || mode === 'pattern') this.selectMode(mode);
        else this.showModeSelection();
        this.publishDebugState();
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    }

    update(): void {
        if (!this.initialized) return;
        this.calibration.update(performance.now());
        this.currentMode?.update(0);
        this.ores = this.ores.filter((ore) => ore.isValid && ore.node.isValid);
        for (const ore of this.ores) {
            if (this.currentMode?.shouldAutoCollect(ore) || Math.abs(ore.node.position.x - this.player.worldX) < 48) {
                this.ores = this.ores.filter((candidate) => candidate !== ore);
                this.collectingOres++;
                this.audio.playCollect();
                ore.collect(() => {
                    this.collectingOres--;
                    this.currentMode?.onOreCollected();
                });
            }
        }
        this.updateBeatPreview();
        this.updateRhythmVisuals();
        this.publishDebugState();
    }

    protected onDestroy(): void {
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        delete (window as unknown as { __beatMiningDebug?: DebugApi }).__beatMiningDebug;
        delete document.documentElement.dataset.beatMiningState;
    }

    private buildScene(): void {
        this.world = new Node('World');
        this.world.layer = this.node.layer;
        this.node.addChild(this.world);
        this.rhythmRoot = new Node('RhythmRoot');
        this.rhythmRoot.layer = this.node.layer;
        this.world.addChild(this.rhythmRoot);
        this.drawCave();

        const beatNode = new Node('BeatManager');
        this.node.addChild(beatNode);
        this.beat = beatNode.addComponent(BeatManager);
        this.beat.initialize(MINE_TRACK, (active, beatIndex) => this.onBeat(active, beatIndex));
        this.calibration = new CalibrationManager(
            (view) => this.ui.showCalibration(view),
            (offsetMs) => this.beat.setUserInputOffsetMilliseconds(offsetMs),
            () => this.audio.playCalibrationBeep(),
            (active) => active ? this.audio.beginCalibration() : this.audio.endCalibration(),
        );

        const uiNode = new Node('UI');
        uiNode.layer = this.node.layer;
        this.node.addChild(uiNode);
        this.ui = uiNode.addComponent(UIController);
        this.ui.initialize(
            MINE_TRACK.bpm,
            (offsetMs) => this.calibration.setManualOffset(offsetMs),
            () => this.calibration.startFromSettings(),
            (mode) => this.selectMode(mode),
            () => this.returnToModeSelection(),
        );

        const audioNode = new Node('AudioManager');
        this.node.addChild(audioNode);
        this.audio = audioNode.addComponent(AudioManager);
        this.audio.initialize(MINE_TRACK, () => this.beat.synchronizeToMusic(() => this.audio.musicTime));

        const playerNode = new Node('Player');
        playerNode.layer = this.node.layer;
        this.rhythmRoot.addChild(playerNode);
        setPosition(playerNode, -510, -205);
        this.player = playerNode.addComponent(Player);
        this.player.initialize(() => this.tryMine(), () => ({
            active: this.audio?.musicPlaying ?? false,
            beatPosition: this.beat.beatPosition,
            tapCycleBeats: MINE_TRACK.visualRhythm.playerTapCycleBeats,
        }), () => this.playerControlState());

    }

    private drawCave(): void {
        this.caveBackground = makeGraphicsNode('CaveBackground', this.rhythmRoot, 1280, 720);
        const g = this.caveBackground.getComponent(Graphics)!;
        fillRect(g, new Color(13, 14, 25), -640, -360, 1280, 720);
        fillRect(g, new Color(25, 25, 43), -640, -280, 1280, 160);
        fillRect(g, new Color(40, 35, 48), -640, -300, 1280, 70);
        fillRect(g, new Color(19, 20, 34), -640, 80, 1280, 12);
        fillRect(g, new Color(30, 29, 47), -640, 95, 1280, 7);
        for (let x = -600; x <= 600; x += 90) {
            const h = 25 + Math.abs((x * 17) % 45);
            fillRect(g, new Color(32, 30, 45), x, 250, 58, h);
            fillRect(g, new Color(57, 50, 65), x + 14, 264, 14, 8);
        }
        for (let x = -560; x <= 560; x += 140) fillRect(g, new Color(55, 47, 58), x, -265, 70, 16);
        for (const x of [-430, -60, 305]) {
            fillRect(g, new Color(61, 49, 59), x, -260, 14, 500);
            fillRect(g, new Color(91, 71, 71), x - 7, 220, 28, 14);
        }
        fillRect(g, new Color(46, 80, 91), 470, -276, 16, 31);
        fillRect(g, new Color(70, 139, 152), 486, -276, 12, 45);
        fillRect(g, new Color(109, 208, 211), 498, -276, 9, 26);
    }

    private spawnRock(plan: RockPlan, onModeBroken?: (rock: MiningRock, x: number) => void): MiningRock {
        const node = makeGraphicsNode('MiningRock', this.rhythmRoot, 100, 84);
        setPosition(node, plan.x, -204);
        const rock = node.addComponent(MiningRock);
        rock.initialize(plan, (brokenX) => {
            this.rocks = this.rocks.filter((candidate) => candidate !== rock);
            onModeBroken?.(rock, brokenX);
        });
        this.rocks.push(rock);
        return rock;
    }

    private spawnOre(x: number, rich = false): void {
        const node = makeGraphicsNode('OrePickup', this.rhythmRoot, 34, 38);
        setPosition(node, x, -145);
        const ore = node.addComponent(OrePickup);
        ore.initialize(rich);
        this.ores.push(ore);
    }

    private createModeHost() {
        const manager = this;
        return {
            get player() { return manager.player; },
            get beat() { return manager.beat; },
            get audio() { return manager.audio; },
            get ui() { return manager.ui; },
            get calibration() { return manager.calibration; },
            get rocks() { return manager.rocks; },
            get ores() { return manager.ores; },
            get collectingOres() { return manager.collectingOres; },
            spawnRock: (config: RockPlan, onBroken: (rock: MiningRock, x: number) => void) => manager.spawnRock(config, onBroken),
            spawnOre: (x: number, rich = false) => manager.spawnOre(x, rich),
            clearEntities: () => {
                manager.rocks.forEach((rock) => rock.node.destroy());
                manager.ores.forEach((ore) => ore.node.destroy());
                manager.rocks = [];
                manager.ores = [];
                manager.collectingOres = 0;
            },
            setPlayerPosition: (x: number) => manager.player.node.setPosition(x, -205, 0),
            shake: (amount: number) => manager.shake(amount),
            complete: (summary: CompletionSummary) => { manager.completedSeconds = summary.seconds; manager.ui.showComplete(summary); },
            resetUi: (mode: GameModeId) => { manager.completedSeconds = null; manager.ui.setOre(0); manager.ui.resetRound(mode); },
        };
    }

    private tryMine(): SwingPlan { return this.currentMode?.handleMineInput() ?? rejectedSwing(); }

    private onBeat(active: number, beatIndex: number): void { this.currentMode?.handleBeat(active, beatIndex); }

    private updateBeatPreview(): void {
        this.ui.updateBeatPreview(
            this.beat.beatPosition,
            MINE_TRACK.beatsPerBar,
            this.perfectStreak,
            this.audio.musicPlaying && !this.calibration.blocksGameplay && this.selectedMode !== null,
        );
    }

    private updateRhythmVisuals(): void {
        if (!this.audio.musicPlaying) {
            this.rhythmRoot.setScale(Vec3.ONE);
            this.caveBackground.setScale(Vec3.ONE);
            return;
        }
        const visual = MINE_TRACK.visualRhythm;
        const beatPosition = this.beat.beatPosition;
        const beatIndex = Math.floor(beatPosition);
        const beatPhase = beatPosition - beatIndex;
        const downbeat = beatIndex % MINE_TRACK.beatsPerBar === 0;
        const pulseDecay = Math.pow(1 - beatPhase, 4);
        const accent = downbeat ? visual.downbeatMultiplier : 1;
        const streakBoost = Math.min(this.perfectStreak, 6) * visual.perfectStreakPulseScale;
        const worldScale = 1 + (visual.worldPulseScale + streakBoost) * accent * pulseDecay;
        this.rhythmRoot.setScale(worldScale, worldScale, 1);

        const breathProgress = (beatPosition % visual.backgroundBreathCycleBeats) / visual.backgroundBreathCycleBeats;
        const breath = (1 - Math.cos(breathProgress * Math.PI * 2)) * 0.5;
        const backgroundScale = 1 + visual.backgroundBreathScale * breath;
        this.caveBackground.setScale(backgroundScale, backgroundScale, 1);
    }

    private shake(amount: number): void {
        tween(this.world).by(0.035, { position: new Vec3(amount, 2, 0) }).by(0.035, { position: new Vec3(-amount * 2, -4, 0) }).by(0.035, { position: new Vec3(amount, 2, 0) }).start();
    }

    private onKeyDown(event: EventKeyboard): void {
        if (this.modeSelectionVisible && event.keyCode === KeyCode.DIGIT_1) { this.selectMode('classic'); return; }
        if (this.modeSelectionVisible && event.keyCode === KeyCode.DIGIT_2) { this.selectMode('pattern'); return; }
        if (event.keyCode === KeyCode.KEY_C && this.calibration.toggleSettings()) return;
        if (event.keyCode === KeyCode.ENTER && this.calibration.confirm()) return;
        if (event.keyCode === KeyCode.ESCAPE && this.calibration.cancel()) return;
        if (event.keyCode === KeyCode.KEY_T && this.calibration.startFromSettings()) return;
        if (event.keyCode === KeyCode.DIGIT_0 && this.calibration.resetOffset()) return;
        if (event.keyCode === KeyCode.ARROW_LEFT && this.calibration.adjustOffset(-5)) return;
        if (event.keyCode === KeyCode.ARROW_RIGHT && this.calibration.adjustOffset(5)) return;
        if (event.keyCode === KeyCode.KEY_R && this.calibration.retry()) return;
        if (event.keyCode === KeyCode.KEY_R && this.selectedMode !== null) this.restartCurrentMode();
    }

    private installDebugApi(): void {
        (window as unknown as { __beatMiningDebug?: DebugApi }).__beatMiningDebug = {
            state: () => this.debugState(),
            forceSwing: () => this.player.swing(),
            teleportToRock: () => { const rock = this.rocks[0]; if (rock) this.player.node.setPosition(rock.node.position.x - 72, -205); },
        };
    }

    private publishDebugState(): void {
        document.documentElement.dataset.beatMiningState = JSON.stringify(this.debugState());
    }

    private showModeSelection(): void {
        this.modeSelectionVisible = true;
        this.ui.setMode(null);
        this.ui.showModeSelection(true);
        this.ui.showPatternMessage('选择玩法  ·  按 1 经典采矿  /  按 2 节奏复刻');
    }

    private selectMode(mode: GameModeId): void {
        this.currentMode?.dispose();
        this.selectedMode = mode;
        this.modeSelectionVisible = false;
        if (!this.calibrationInitialized) { this.calibration.initialize(); this.calibrationInitialized = true; }
        this.audio.armMusicInput();
        this.ui.showModeSelection(false);
        this.ui.setMode(mode);
        if (mode === 'classic') {
            this.currentMode = new ClassicMiningMode(this.createModeHost());
            this.ui.showPatternMessage('经典采矿  ·  在亮拍时挥镐');
        } else {
            this.currentMode = new PatternReplayMode(this.createModeHost());
        }
        this.currentMode.start();
    }

    private playerControlState(): { canMove: boolean; canMine: boolean } {
        if (this.calibration.blocksGameplay || !this.currentMode) return { canMove: false, canMine: false };
        return this.currentMode.controlState();
    }

    private restartCurrentMode(): void { this.currentMode?.restart(); }

    private returnToModeSelection(): void {
        const url = new URL(window.location.href);
        url.searchParams.delete('mode');
        window.history.replaceState({}, '', url);
        director.loadScene('Game');
    }

    private debugState(): object {
        return {
            selectedMode: this.selectedMode,
            modeSelectionVisible: this.modeSelectionVisible,
            modeState: this.currentMode?.debugState() ?? {},
            combo: this.combo,
            perfectStreak: this.perfectStreak,
            hotHand: this.hotHand,
            perfectCount: this.perfectCount,
            goodCount: this.goodCount,
            missCount: this.missCount,
            formalJudgementCount: this.formalJudgementCount,
            accuracyPercent: Number(this.accuracyPercent.toFixed(1)),
            rating: this.rating,
            nextGoal: this.nextGoal,
            maxCombo: this.maxCombo,
            lastTimingMs: this.lastTimingMs,
            averageAbsTimingMs: Math.round(this.averageAbsTimingMs),
            playSeconds: Number(this.playSeconds.toFixed(2)),
            completedSeconds: this.completedSeconds,
            oreCount: this.oreCount,
            rocks: this.rocks.length,
            ores: this.ores.length,
            judgement: this.lastJudgement,
            playerX: Math.round(this.player.worldX),
            beatProgress: this.beat.progress,
            audioReady: this.audio.ready,
            musicPlaying: this.audio.musicPlaying,
            musicTime: this.audio.musicTime,
            bpm: MINE_TRACK.bpm,
            beatsPerBar: MINE_TRACK.beatsPerBar,
            trackInputOffsetMs: Math.round(MINE_TRACK.inputOffsetSeconds * 1000),
            userInputOffsetMs: this.calibration.currentOffsetMs,
            effectiveInputOffsetMs: this.beat.effectiveInputOffsetMilliseconds,
            calibration: this.calibration.debugState,
            beatPosition: Number(this.beat.beatPosition.toFixed(3)),
            beatPreview: this.ui.beatPreviewDebug,
            hud: this.ui.hudDebug,
            worldRhythmScale: Number(this.rhythmRoot.scale.x.toFixed(4)),
            backgroundRhythmScale: Number(this.caveBackground.scale.x.toFixed(4)),
            playerTapCycleBeats: MINE_TRACK.visualRhythm.playerTapCycleBeats,
            attemptedBeatIndex: this.beat.attemptedBeatIndex,
            ignoredInputCount: this.ignoredInputCount,
            leftLegLift: Number(this.player.leftLegLift.toFixed(2)),
            rightLegLift: Number(this.player.rightLegLift.toFixed(2)),
            rockInRange: this.mineableRock !== null,
            targetState: this.targetState,
            facing: this.player.facingDirection,
            miningPointX: Math.round(this.player.miningPointX),
            assistMoving: this.player.isAssisting,
            impactPending: this.impactPending,
            rockHp: this.rocks.map((rock) => rock.remainingHp),
            rockKinds: this.rocks.map((rock) => rock.rockKind),
            totalRocks: this.totalRockCount,
            brokenRocks: this.brokenRockCount,
            finalCrystalBroken: this.finalCrystalBroken,
            collectingOres: this.collectingOres,
        };
    }

    private get averageAbsTimingMs(): number {
        return this.timingSampleCount === 0 ? Number.NaN : this.totalAbsTimingMs / this.timingSampleCount;
    }

    private get formalJudgementCount(): number {
        return this.perfectCount + this.goodCount + this.missCount;
    }

    private get accuracyPercent(): number {
        if (this.formalJudgementCount === 0) return 0;
        return (this.perfectCount * 100 + this.goodCount * 60) / this.formalJudgementCount;
    }

    private get rating(): CompletionRating {
        if (this.accuracyPercent >= 90 && this.missCount === 0) return 'S';
        if (this.accuracyPercent >= 80) return 'A';
        if (this.accuracyPercent >= 65) return 'B';
        return 'C';
    }

    private get nextGoal(): string {
        if (this.missCount > 0) return '减少 Miss';
        if (this.accuracyPercent < 90) return '提高 Perfect 比例';
        return '挑战更低用时或更高最大连击';
    }

    private createCompletionSummary(seconds: number): CompletionSummary {
        return {
            seconds,
            oreCount: this.oreCount,
            perfect: this.perfectCount,
            good: this.goodCount,
            miss: this.missCount,
            maxCombo: this.maxCombo,
            averageAbsTimingMs: this.averageAbsTimingMs,
            accuracyPercent: this.accuracyPercent,
            rating: this.rating,
            nextGoal: this.nextGoal,
        };
    }

    private get playSeconds(): number {
        return this.firstSwingAt === null ? 0 : (performance.now() - this.firstSwingAt) / 1000;
    }
}
