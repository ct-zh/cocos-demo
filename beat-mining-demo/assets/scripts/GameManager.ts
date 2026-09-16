import { _decorator, Color, Component, director, EventKeyboard, Graphics, input, Input, KeyCode, Node, profiler, tween, Vec3 } from 'cc';
import { BeatManager } from './BeatManager';
import { BeatJudgement } from './BeatTypes';
import { AudioManager } from './AudioManager';
import { MiningRock, MiningRockConfig } from './MiningRock';
import { MINE_TRACK } from './MusicTrackConfig';
import { OrePickup } from './OrePickup';
import { fillRect, makeGraphicsNode, setPosition } from './PixelArt';
import { Player, SwingPlan } from './Player';
import { UIController } from './UIController';
const { ccclass } = _decorator;

type DebugApi = { state: () => object; forceSwing: () => void; teleportToRock: () => void };
type RockPlan = MiningRockConfig & { x: number };

@ccclass('GameManager')
export class GameManager extends Component {
    private world!: Node;
    private rhythmRoot!: Node;
    private caveBackground!: Node;
    private player!: Player;
    private beat!: BeatManager;
    private audio!: AudioManager;
    private ui!: UIController;
    private rocks: MiningRock[] = [];
    private ores: OrePickup[] = [];
    private combo = 0;
    private perfectStreak = 0;
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
    private impactPending = false;
    private totalRockCount = 0;
    private brokenRockCount = 0;
    private finalCrystalBroken = false;
    private collectingOres = 0;

    start(): void {
        profiler.hideStats();
        this.buildScene();
        this.installDebugApi();
        this.publishDebugState();
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    }

    update(): void {
        this.updateMineableRock();
        this.ores = this.ores.filter((ore) => ore.isValid && ore.node.isValid);
        for (const ore of this.ores) {
            if (Math.abs(ore.node.position.x - this.player.worldX) < 48) {
                this.ores = this.ores.filter((candidate) => candidate !== ore);
                this.collectingOres++;
                this.audio.playCollect();
                ore.collect(() => {
                    this.collectingOres--;
                    this.oreCount++;
                    this.ui.setOre(this.oreCount);
                    if (this.rocks.length === 0 && this.ores.length === 0 && this.collectingOres === 0 && this.completedSeconds === null) {
                        this.completedSeconds = this.playSeconds;
                        this.ui.showComplete(this.completedSeconds, this.oreCount, this.maxCombo, this.averageAbsTimingMs);
                    }
                });
            }
        }
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

        const uiNode = new Node('UI');
        uiNode.layer = this.node.layer;
        this.node.addChild(uiNode);
        this.ui = uiNode.addComponent(UIController);
        this.ui.initialize(MINE_TRACK.bpm);
        this.beat.initialize(MINE_TRACK, (active) => this.onBeat(active));

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
            active: this.audio.musicPlaying,
            beatPosition: this.beat.beatPosition,
            tapCycleBeats: MINE_TRACK.visualRhythm.playerTapCycleBeats,
        }));

        const rockPlan: RockPlan[] = [
            { x: -350, kind: 'normal', hp: 3, drops: 1 },
            { x: -165, kind: 'normal', hp: 4, drops: 1 },
            { x: 25, kind: 'hard', hp: 5, drops: 1 },
            { x: 205, kind: 'normal', hp: 4, drops: 1 },
            { x: 365, kind: 'hard', hp: 6, drops: 2 },
            { x: 515, kind: 'crystal', hp: 9, drops: 3 },
        ];
        this.totalRockCount = rockPlan.length;
        this.ui.setProgress(0, this.totalRockCount, true);
        rockPlan.forEach((plan) => this.spawnRock(plan));
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

    private spawnRock(plan: RockPlan): void {
        const node = makeGraphicsNode('MiningRock', this.rhythmRoot, 100, 84);
        setPosition(node, plan.x, -204);
        const rock = node.addComponent(MiningRock);
        rock.initialize(plan, (brokenX) => {
            if (this.mineableRock === rock) this.mineableRock = null;
            this.rocks = this.rocks.filter((candidate) => candidate !== rock);
            this.brokenRockCount++;
            this.ui.setProgress(this.brokenRockCount, this.totalRockCount, this.rocks.some((candidate) => candidate.rockKind === 'crystal'));
            this.audio.playRockBreak();
            for (let i = 0; i < plan.drops; i++) {
                const offset = (i - (plan.drops - 1) / 2) * 25;
                this.spawnOre(brokenX + offset, plan.kind === 'crystal');
            }
            if (plan.kind === 'crystal') {
                this.finalCrystalBroken = true;
                this.ui.showFinalBreak();
                this.shake(14);
                tween(this.world).to(0.06, { scale: new Vec3(1.035, 1.035, 1) }).to(0.2, { scale: Vec3.ONE }).start();
            }
        });
        this.rocks.push(rock);
    }

    private spawnOre(x: number, rich = false): void {
        const node = makeGraphicsNode('OrePickup', this.rhythmRoot, 34, 38);
        setPosition(node, x, -145);
        const ore = node.addComponent(OrePickup);
        ore.initialize(rich);
        this.ores.push(ore);
    }

    private tryMine(): SwingPlan {
        if (this.completedSeconds !== null) return { impactHoldSeconds: 0, onImpact: () => undefined };
        if (this.firstSwingAt === null) this.firstSwingAt = performance.now();
        this.audio.playSwing();
        const result = this.beat.judgeNow();
        const target = this.findMiningTarget();
        const inRange = target && Math.abs(target.node.position.x - this.player.miningPointX) <= 92;
        let judgement = result.judgement;
        if (!inRange) judgement = BeatJudgement.Miss;

        if (judgement === BeatJudgement.Miss) {
            this.combo = 0;
            this.perfectStreak = 0;
            this.missCount++;
        } else {
            this.combo++;
            this.maxCombo = Math.max(this.maxCombo, this.combo);
            this.perfectStreak = judgement === BeatJudgement.Perfect ? this.perfectStreak + 1 : 0;
            if (judgement === BeatJudgement.Perfect) this.perfectCount++;
            else this.goodCount++;
        }
        this.lastTimingMs = Math.round(result.offsetSeconds * 1000);
        this.timingSampleCount++;
        this.totalAbsTimingMs += Math.abs(result.offsetSeconds * 1000);
        this.lastJudgement = judgement;
        this.ui.showJudgement(judgement, this.combo, result.offsetSeconds, !!inRange);
        this.ui.updateStats(this.perfectCount, this.goodCount, this.missCount, this.maxCombo, this.averageAbsTimingMs);
        this.impactPending = judgement !== BeatJudgement.Miss;
        const impactHoldSeconds = judgement === BeatJudgement.Perfect ? 0.03 : judgement === BeatJudgement.Good ? 0.012 : 0;
        return {
            impactHoldSeconds,
            onImpact: () => {
                this.impactPending = false;
                if (judgement === BeatJudgement.Miss || !target?.isValid || !target.node.isValid) return;
                target.takeHit(result.damage, judgement, this.perfectStreak);
                if (judgement === BeatJudgement.Perfect) this.audio.playPerfect();
                else this.audio.playGood();
                this.shake(judgement === BeatJudgement.Perfect ? 8 : 3);
            },
        };
    }

    private findMiningTarget(): MiningRock | undefined {
        return this.rocks
            .filter((rock) => rock.isValid && rock.node.isValid)
            .sort((a, b) => Math.abs(a.node.position.x - this.player.miningPointX) - Math.abs(b.node.position.x - this.player.miningPointX))[0];
    }

    private updateMineableRock(): void {
        const target = this.findMiningTarget();
        const next = target && Math.abs(target.node.position.x - this.player.miningPointX) <= 92 ? target : null;
        if (this.mineableRock === next) return;
        if (this.mineableRock?.isValid && this.mineableRock.node.isValid) this.mineableRock.setMineable(false);
        this.mineableRock = next;
        this.mineableRock?.setMineable(true);
    }

    private onBeat(active: number): void {
        this.ui.showBeat(active, this.perfectStreak);
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
        if (event.keyCode === KeyCode.KEY_R && this.completedSeconds !== null) director.loadScene('Game');
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

    private debugState(): object {
        return {
            combo: this.combo,
            perfectStreak: this.perfectStreak,
            perfectCount: this.perfectCount,
            goodCount: this.goodCount,
            missCount: this.missCount,
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
            inputOffsetMs: Math.round(MINE_TRACK.inputOffsetSeconds * 1000),
            beatPosition: Number(this.beat.beatPosition.toFixed(3)),
            worldRhythmScale: Number(this.rhythmRoot.scale.x.toFixed(4)),
            backgroundRhythmScale: Number(this.caveBackground.scale.x.toFixed(4)),
            playerTapCycleBeats: MINE_TRACK.visualRhythm.playerTapCycleBeats,
            leftLegLift: Number(this.player.leftLegLift.toFixed(2)),
            rightLegLift: Number(this.player.rightLegLift.toFixed(2)),
            rockInRange: this.mineableRock !== null,
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

    private get playSeconds(): number {
        return this.firstSwingAt === null ? 0 : (performance.now() - this.firstSwingAt) / 1000;
    }
}
