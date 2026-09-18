import { AudioManager } from '../AudioManager';
import { BeatManager } from '../BeatManager';
import { CalibrationManager } from '../CalibrationManager';
import { MiningRock, MiningRockConfig } from '../MiningRock';
import { OrePickup } from '../OrePickup';
import { Player, PlayerControlState, SwingPlan } from '../Player';
import { CompletionSummary, UIController } from '../UIController';

export type GameModeId = 'classic' | 'pattern';

export interface MiningGameMode {
    readonly id: GameModeId;
    start(): void;
    update(dt: number): void;
    handleMineInput(): SwingPlan;
    handleBeat(beatInBar: number, beatIndex: number): void;
    restart(): void;
    dispose(): void;
    controlState(): PlayerControlState;
    shouldAutoCollect(ore: OrePickup): boolean;
    onOreCollected(): void;
    debugState(): object;
}

export interface MiningModeHost {
    readonly player: Player;
    readonly beat: BeatManager;
    readonly audio: AudioManager;
    readonly ui: UIController;
    readonly calibration: CalibrationManager;
    readonly rocks: readonly MiningRock[];
    readonly ores: readonly OrePickup[];
    readonly collectingOres: number;
    spawnRock(config: MiningRockConfig & { x: number }, onBroken: (rock: MiningRock, x: number) => void): MiningRock;
    spawnOre(x: number, rich?: boolean): void;
    clearEntities(): void;
    setPlayerPosition(x: number): void;
    shake(amount: number): void;
    complete(summary: CompletionSummary): void;
    resetUi(mode: GameModeId): void;
}
