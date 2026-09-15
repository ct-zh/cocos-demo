import { _decorator, Color, Component, Graphics, Node, profiler, tween, Vec3 } from 'cc';
import { BeatManager } from './BeatManager';
import { BeatJudgement } from './BeatTypes';
import { AudioManager } from './AudioManager';
import { MiningRock } from './MiningRock';
import { MINE_TRACK } from './MusicTrackConfig';
import { OrePickup } from './OrePickup';
import { fillRect, makeGraphicsNode, setPosition } from './PixelArt';
import { Player } from './Player';
import { UIController } from './UIController';
const { ccclass } = _decorator;

type DebugApi = { state: () => object; forceSwing: () => void; teleportToRock: () => void };

@ccclass('GameManager')
export class GameManager extends Component {
    private world!: Node;
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

    start(): void {
        profiler.hideStats();
        this.buildScene();
        this.installDebugApi();
        this.publishDebugState();
    }

    update(): void {
        this.ores = this.ores.filter((ore) => ore.isValid && ore.node.isValid);
        for (const ore of this.ores) {
            if (Math.abs(ore.node.position.x - this.player.worldX) < 48) {
                this.ores = this.ores.filter((candidate) => candidate !== ore);
                this.audio.playCollect();
                ore.collect(() => { this.oreCount++; this.ui.setOre(this.oreCount); });
            }
        }
        this.publishDebugState();
    }

    protected onDestroy(): void {
        delete (window as unknown as { __beatMiningDebug?: DebugApi }).__beatMiningDebug;
        delete document.documentElement.dataset.beatMiningState;
    }

    private buildScene(): void {
        this.world = new Node('World');
        this.world.layer = this.node.layer;
        this.node.addChild(this.world);
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
        this.world.addChild(playerNode);
        setPosition(playerNode, -300, -205);
        this.player = playerNode.addComponent(Player);
        this.player.initialize(() => this.tryMine());

        [-120, 120, 360].forEach((x) => this.spawnRock(x));
    }

    private drawCave(): void {
        const bg = makeGraphicsNode('CaveBackground', this.world, 1280, 720);
        const g = bg.getComponent(Graphics)!;
        fillRect(g, new Color(13, 14, 25), -640, -360, 1280, 720);
        fillRect(g, new Color(25, 25, 43), -640, -280, 1280, 160);
        fillRect(g, new Color(40, 35, 48), -640, -300, 1280, 70);
        for (let x = -600; x <= 600; x += 90) {
            const h = 25 + Math.abs((x * 17) % 45);
            fillRect(g, new Color(32, 30, 45), x, 250, 58, h);
            fillRect(g, new Color(57, 50, 65), x + 14, 264, 14, 8);
        }
        for (let x = -560; x <= 560; x += 140) fillRect(g, new Color(55, 47, 58), x, -265, 70, 16);
    }

    private spawnRock(x: number): void {
        const node = makeGraphicsNode('MiningRock', this.world, 100, 84);
        setPosition(node, x, -204);
        const rock = node.addComponent(MiningRock);
        rock.initialize((brokenX) => {
            this.rocks = this.rocks.filter((candidate) => candidate !== rock);
            this.audio.playRockBreak();
            this.spawnOre(brokenX);
        });
        this.rocks.push(rock);
    }

    private spawnOre(x: number): void {
        const node = makeGraphicsNode('OrePickup', this.world, 34, 38);
        setPosition(node, x, -145);
        const ore = node.addComponent(OrePickup);
        ore.initialize();
        this.ores.push(ore);
    }

    private tryMine(): void {
        this.audio.playSwing();
        const result = this.beat.judgeNow();
        const target = this.rocks
            .filter((rock) => rock.isValid && rock.node.isValid)
            .sort((a, b) => Math.abs(a.node.position.x - this.player.miningPointX) - Math.abs(b.node.position.x - this.player.miningPointX))[0];
        const inRange = target && Math.abs(target.node.position.x - this.player.miningPointX) <= 92;
        let judgement = result.judgement;
        if (!inRange) judgement = BeatJudgement.Miss;

        if (judgement === BeatJudgement.Miss) {
            this.combo = 0;
            this.perfectStreak = 0;
        } else {
            this.combo++;
            this.perfectStreak = judgement === BeatJudgement.Perfect ? this.perfectStreak + 1 : 0;
            target.takeHit(result.damage, judgement, this.perfectStreak);
            if (judgement === BeatJudgement.Perfect) this.audio.playPerfect();
            else this.audio.playGood();
        }
        this.lastJudgement = judgement;
        this.ui.showJudgement(judgement, this.combo);
        this.shake(judgement === BeatJudgement.Perfect ? 8 : 4);
    }

    private onBeat(active: number): void {
        this.ui.showBeat(active, this.perfectStreak);
        if (this.perfectStreak >= 2) {
            const scale = 1.005 + Math.min(this.perfectStreak, 6) * 0.003;
            tween(this.world).to(0.05, { scale: new Vec3(scale, scale, 1) }).to(0.12, { scale: Vec3.ONE }).start();
        }
    }

    private shake(amount: number): void {
        tween(this.world).by(0.035, { position: new Vec3(amount, 2, 0) }).by(0.035, { position: new Vec3(-amount * 2, -4, 0) }).by(0.035, { position: new Vec3(amount, 2, 0) }).start();
    }

    private installDebugApi(): void {
        (window as unknown as { __beatMiningDebug?: DebugApi }).__beatMiningDebug = {
            state: () => ({ combo: this.combo, perfectStreak: this.perfectStreak, oreCount: this.oreCount, rocks: this.rocks.length, ores: this.ores.length, judgement: this.lastJudgement, playerX: Math.round(this.player.worldX), beatProgress: this.beat.progress }),
            forceSwing: () => this.player.swing(),
            teleportToRock: () => { const rock = this.rocks[0]; if (rock) this.player.node.setPosition(rock.node.position.x - 72, -205); },
        };
    }

    private publishDebugState(): void {
        document.documentElement.dataset.beatMiningState = JSON.stringify({
            combo: this.combo,
            perfectStreak: this.perfectStreak,
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
        });
    }
}
