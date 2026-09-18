# Beat Mining Demo 双模式重构与最小玩法实验计划

- 编写日期：2026-09-18
- 目标项目：`beat-mining-demo`
- Cocos Creator：3.8.8
- 入口场景：`assets/scenes/Game.scene`
- 经典模式基线提交：`87559c3`
- 经典模式基线标签：`beat-mining-classic-baseline-20260918`
- 文档用途：供后续开发 Agent 直接实施、验证和交付

## 1. 重构目标

在同一个项目和入口场景中支持两种可切换玩法：

1. **经典采矿模式（Classic）**
   - 完整保留基线版本的六块矿石玩法。
   - 保留自由移动、节拍判定、边缘辅助、热手、掉落、收集和评级结算。
   - 重构后玩家可见行为、数值和手感不得发生非预期变化。
2. **节奏复刻实验模式（Pattern Replay）**
   - 使用三块矿石验证“先聆听节奏，再复刻节奏”的核心玩法。
   - 只验证预期、记忆、执行压力和重玩意愿，不追求内容量。
   - 复用音乐时钟、输入校准、判定窗口、音效、矿石表现、掉落和结算。

不得复制整个项目目录，也不得维护两套重复的 `GameManager`、`BeatManager` 或校准实现。

## 2. 基线与保护要求

开发前必须执行并记录：

```bash
git status --short
git show --no-patch --oneline --decorate beat-mining-classic-baseline-20260918
```

要求：

- 基线必须解析到提交 `87559c3`。
- 开发前工作区应为干净状态；否则先报告现有差异，不得覆盖。
- 不得移动、删除或重建标签 `beat-mining-classic-baseline-20260918`。
- 不得编辑 `library/`、`temp/`、`local/`、`profiles/`、`node_modules/` 或 `build/`。
- 不升级 Creator，不更换入口场景，不新增独立 Cocos 项目。
- 未经用户明确要求，不提交、不创建新标签、不推送远端。

## 3. 非目标

本轮不实现：

- 背包、商店、装备、成长、货币、排行榜或账户；
- 随机地图、关卡选择、剧情、敌人或联网；
- 自定义谱面、谱面编辑器或自动作曲；
- 超过三块矿石的 Pattern 内容；
- Classic 与 Pattern 之外的第三种模式；
- 改变现有判定窗口、输入补偿、Classic 矿石 HP、掉落数或评级公式。

## 4. 目标结构

### 4.1 玩法模式接口

新增 `assets/scripts/modes/MiningGameMode.ts` 或等价文件：

```ts
export type GameModeId = 'classic' | 'pattern';

export interface MiningGameMode {
    readonly id: GameModeId;
    start(): void;
    update(dt: number): void;
    handleMineInput(): SwingPlan;
    handleBeat(beatInBar: number, beatIndex: number): void;
    restart(): void;
    dispose(): void;
    debugState(): object;
}
```

允许补充必要方法，但不得把两套规则重新堆回 `GameManager.tryMine()`。不得形成不断扩张的 `if (mode === ...)` 玩法分支。

### 4.2 GameManager 职责

重构后的 `GameManager` 只负责：

- 创建共用场景节点和管理器；
- 模式选择和模式实例生命周期；
- 将 `update`、空格输入和节拍事件委托给当前模式；
- 提供受控的矿石、掉落、震动和设置等共用能力；
- 发布合并后的浏览器调试状态；
- 处理当前模式重开和返回模式选择。

`GameManager` 不再直接保存 Classic 专属的矿石布局、热手、combo、评级，也不直接保存 Pattern 的谱面阶段和输入记录。

### 4.3 共用宿主接口

新增 `MiningModeHost` 或等价接口，仅暴露：

- `player`、`beat`、`audio`、`ui` 的必要引用；
- 创建和清理模式所属矿石、矿石掉落；
- 设置玩家位置和移动/挖掘权限；
- 播放共用震动、破碎和收集反馈；
- 通知模式完成并显示结算；
- 查询设置或校准是否阻止玩法输入。

模式不得直接查找全局场景节点，也不得通过 `window` 传递正式玩法状态。

### 4.4 推荐文件

建议新增：

- `assets/scripts/modes/MiningGameMode.ts`
- `assets/scripts/modes/ClassicMiningMode.ts`
- `assets/scripts/modes/PatternReplayMode.ts`
- `assets/scripts/modes/PatternTypes.ts`

允许新增对应 `.meta`。模式选择可由 `UIController` 创建，也可拆为 `ModeSelectionController.ts`；不得复制完整 HUD。

## 5. Classic 模式要求

将提交 `87559c3` 的 Classic 专属逻辑原样迁入 `ClassicMiningMode`：

- 六块固定矿石及原有坐标、HP、类型和掉落数；
- A/D 或方向键自由移动；
- 92 px 正式范围和 24 px 辅助带；
- 空挥与正式判定分离；
- Perfect、Good、Miss、`TOO FAST` 和输入偏差；
- combo、Perfect streak 和热手；
- 破碎、掉落和手动移动收集；
- P/G/M/MAX/AVG/ACC、S/A/B/C 评级与下一局目标；
- 当前调试字段与完成条件。

不得改变判定窗口、伤害、矿石数值、热手规则、帮助淡出、设置、校准或结算布局。不得把 Classic 改成自动移动或自动收集。

完成接口抽离后，必须先通过 Classic 浏览器回归，再开始 Pattern。

## 6. 模式选择

### 6.1 启动流程

进入 `Game.scene` 后先显示模式选择，不立即启动 BGM，也不立即弹出首次校准。

提供两个可点击选项：

- **经典采矿**：自由移动，在拍点挥镐，清空六块矿脉。
- **节奏复刻**：先听四拍节奏，再用空格复刻，共三块矿石。

可以提供数字键 1/2 作为菜单快捷键。选择完成后才初始化当前模式，并继续首次校准或正常游戏。

现有 `AudioManager` 会在首次键盘输入时尝试启动音乐。必须避免按 1/2 选择模式时提前启动 BGM。应在选择完成后再启用音乐输入监听，或增加明确的 armed 状态；不得启动后立即停止来掩盖相位问题。

### 6.2 URL 直达

支持：

- `?mode=classic`
- `?mode=pattern`

合法参数直接进入模式；缺少或非法参数时显示选择页。URL 直达仍需经过正常校准初始化。

### 6.3 重玩和返回

- `R` 重开当前模式，不返回选择页。
- 结算提供可点击的“返回模式选择”。
- 返回时清理当前模式节点、回调、统计和临时 tween。
- 输入补偿与“已看过首次校准提示”状态跨模式共享。

## 7. Pattern Replay 最小玩法

### 7.1 核心循环

每块矿石执行：

1. 玩家自动移动到固定攻击位置；
2. 等待下一个完整小节；
3. **聆听阶段**：系统用一个四拍小节演示节奏；
4. **复刻阶段**：玩家在下一个四拍小节用空格复刻；
5. 小节结束后结算本次复刻；
6. 成功则破坏矿石、自动收集并前往下一块；
7. 失败则显示原因，在下一完整小节重试当前矿石。

Pattern 不允许 A/D 或方向键自由移动。方向键在设置中仍用于调整补偿。

### 7.2 三块固定矿石

`true` 表示该拍需要空格，`false` 表示休止：

```ts
const PATTERN_LEVEL = [
    { kind: 'normal', pattern: [true, true, true, true], drops: 1 },
    { kind: 'hard', pattern: [true, false, true, false], drops: 1 },
    { kind: 'crystal', pattern: [true, false, true, true], drops: 3 },
];
```

三块矿石从左到右排列，复用当前普通、硬质和水晶外观。矿石是否破坏由整段复刻决定，不沿用 Classic 的逐击 HP 平衡。

### 7.3 状态机

至少包含：

```ts
type PatternPhase =
    | 'positioning'
    | 'waitingForBar'
    | 'listening'
    | 'repeating'
    | 'resolving'
    | 'collecting'
    | 'transitioning'
    | 'complete'
    | 'suspended';
```

状态转换必须由 `BeatManager` 的实际音乐节拍索引驱动。不得使用独立 `setInterval` 或与 BGM 无关的累计计时器模拟四拍小节。

### 7.4 聆听阶段

- 从小节第 1 拍开始演示四个槽位。
- `true` 槽位播放短提示音并高亮；第 1 拍可稍强。
- `false` 槽位保持安静，但继续显示播放头。
- 聆听期间空格不进入正式判定、不增加 P/G/M、不消费槽位，并提示“先听节奏”。
- 提示音不得改变 BGM 相位。

建议在 `AudioManager` 增加 `playPatternCue(accent: boolean)`，复用或抽取现有短提示音能力，不要求增加外部音频。

### 7.5 复刻阶段输入

- 从完整小节第 1 拍开始。
- 每个槽位只接受第一次空格。
- `true` 槽位使用现有 Perfect/Good 窗口；超出 Good 窗口或整拍未输入记 Miss。
- `false` 槽位不输入才正确；输入记 Miss，不能同槽修正。
- 进入下一槽位时必须自动结算上一槽位尚未完成的必按输入。
- 复刻开始前和结束后的输入不进入正式统计。
- 空挥、重复输入、错误休止和漏按在调试状态中必须有不同原因。

### 7.6 整段结果

小节结束时：

- 所有必按槽为 Perfect/Good，所有休止槽未输入：成功。
- 成功且全部必按均为 Perfect：显示“完美复刻”。
- 成功但包含 Good：显示“复刻成功”。
- 任意漏按、超窗或休止误按：显示“复刻失败”，矿石不破坏，下一个完整小节重试。

失败只重试当前矿石，不重置整关。失败可触发短暂裂纹或抖动，但不得永久削减到可通过失败次数堆死。

成功时一次性触发当前矿石破碎、碎屑、音效和震动。完美复刻可增强反馈，但不得复用 Classic 热手。

### 7.7 自动移动与收集

- 每块矿石前以 250～350 ms 水平 tween 自动定位。
- 自动移动期间忽略玩法空格。
- 破碎后仍生成配置的掉落。
- Pattern 使用自动吸附收集，触发现有收集音效和 ORE 计数。
- 全部掉落完成收集后才能进入下一块或最终结算。
- Pattern 不得依赖 A/D 才能完成。

### 7.8 设置与校准中断

设置或校准打开时：

- Pattern 进入 `suspended`；
- 不结算漏按、不推进谱面结果；
- 四拍预告恢复静态；
- 校准继续使用现有提示音和补偿存储。

关闭后不得从中间槽继续。必须清空未完成尝试，并在下一个完整小节重新聆听当前矿石。Classic 保持现有行为。

## 8. Player 输入权限重构

将当前单一 `canControl` 拆为：

```ts
interface PlayerControlState {
    canMove: boolean;
    canMine: boolean;
}
```

- Classic 正常游戏：两者为 `true`。
- Pattern positioning/listening/resolving/collecting：两者为 `false`。
- Pattern repeating：`canMove=false`、`canMine=true`。
- 设置或校准：两者为 `false`。

不得让 `Player` 自己识别当前模式；权限由模式和 `GameManager` 组合后传入。

## 9. UI 要求

### 9.1 共用 HUD

继续复用四拍预告、中央反馈、timing、ORE、设置/校准和结构化结算组件。

### 9.2 Pattern 专属 HUD

新增：

- 模式标签“节奏复刻”；
- “矿石 1 / 3”进度；
- “聆听”“轮到你”“复刻成功/失败”阶段提示；
- 四槽谱面，区分必按、休止、播放头、正确、错误和漏按；
- 当前矿石尝试次数。

Pattern 节点在 Classic 中必须 inactive，不得占据布局或遮挡现有 HUD。

### 9.3 Pattern 结算

复用当前结构：

- P/G/M：复刻阶段正式槽位判定；
- MAX：连续正确必按输入的最大 combo；
- AVG：实际按键的平均绝对偏差；
- ACC：Perfect 100、Good 60、Miss 0；漏按和休止误按均计 Miss；
- 评级沿用 S/A/B/C；
- 额外显示成功复刻数和失败尝试数。

Classic 结算不得改变。

## 10. 重玩与状态清理

按 `R` 必须重置当前模式的矿石、掉落、临时节点、统计、计时、延迟回调和 tween。Classic 热手及 Pattern 阶段、槽位结果、尝试次数、矿石索引均需恢复初始值。输入补偿和首次校准状态不得重置。

返回模式选择时必须调用 `dispose()`，并确保不会出现：

- 两套矿石同时存在；
- Classic 输入仍处理 Pattern 空格；
- 上个模式的回调修改新模式 UI；
- 旧调试字段继续变化；
- 两个 AudioSource 或 BGM 重复播放。

## 11. 浏览器调试状态

保留 `window.__beatMiningDebug` 和 `data-beat-mining-state`，新增：

```ts
{
    selectedMode: 'classic' | 'pattern' | null,
    modeSelectionVisible: boolean,
    modeState: object
}
```

Classic 现有字段应进入 `modeState` 或保留兼容镜像，不得无说明删除自动化已使用字段。

Pattern 的 `modeState` 至少包含：

- `phase`、`currentRockIndex`、`pattern`；
- `listenStartBeatIndex`、`repeatStartBeatIndex`、`currentSlot`；
- `slotResults`、`attemptCount`、`successfulPatterns`、`failedPatterns`；
- `formalJudgementCount`、P/G/M、ACC 和 rating；
- `suspendedReason`；
- 当前矿石和掉落数量。

## 12. 实施顺序

### 阶段 A：模式边界

1. 新增模式类型、宿主接口和选择 UI。
2. 将当前逻辑迁移为 Classic。
3. 实现 `?mode=classic`。
4. 完成 Classic 全流程浏览器回归。

阶段 A 未通过前不得实现 Pattern。

### 阶段 B：Pattern 状态机

1. 建立三块矿石配置。
2. 自动定位并等待完整小节。
3. 实现聆听提示音。
4. 实现复刻槽位、漏按和休止误按。
5. 实现整段成功、失败和重试。

### 阶段 C：反馈与完整流程

1. 接入破碎、掉落和自动收集。
2. 接入 Pattern HUD、结算和调试状态。
3. 实现设置/校准中断恢复。
4. 实现 R 重开和返回选择。

### 阶段 D：对比验证

分别运行 Classic 和 Pattern，记录完成时间、P/G/M、ACC、失败原因和重玩行为。不得依据单次开发者试玩直接宣布 Pattern 更有趣。

## 13. 验收矩阵

### 13.1 模式选择

1. 无参数时显示两个选项，BGM 未启动。
2. Classic 进入六矿石玩法，Pattern 进入三矿石玩法。
3. `?mode=classic`、`?mode=pattern` 可直达。
4. 非法参数回到选择页。

### 13.2 Classic 回归

验证：

1. A/D 移动、范围高亮和 24 px 辅助；
2. Perfect/Good/Miss、空挥、方向错误和 `TOO FAST`；
3. 热手进入、增伤、Good/Miss 清理；
4. 六块矿石、9 个掉落、手动收集和完整结算；
5. R 重开、非零 OFFSET 保存、调试字段兼容；
6. 控制台无 error 或 warning。

### 13.3 Pattern 第一块

1. 自动定位后完整演示 `[true,true,true,true]`。
2. 聆听期间空格不计正式判定。
3. 下一小节进入复刻。
4. 四次正确输入后破碎并自动收集 1 个掉落。
5. 漏按则失败并重试，不永久削减矿石。

### 13.4 Pattern 休止槽

1. 第二块演示 `[true,false,true,false]`。
2. 只在第 1、3 拍输入可成功。
3. 第 2/4 拍输入或第 1/3 拍漏按均计 Miss 并失败。

### 13.5 Pattern 水晶

1. 第三块演示 `[true,false,true,true]`。
2. 全 Perfect 显示“完美复刻”，包含 Good 显示“复刻成功”。
3. 水晶掉落 3 个，全部自动收集后才结算。

### 13.6 中断、重开和切换

1. 聆听或复刻中打开设置，不产生漏按。
2. 关闭设置或校准后从下一完整小节重新聆听。
3. R 重开并保留非零 OFFSET。
4. 返回选择再切换模式，无节点、回调、音乐或统计残留。

### 13.7 结算公式

使用可控输入验证 S/A/B/C 四档及三种下一局目标，不能只验证全 Perfect 的 S 评级。

## 14. 构建与验证要求

- 使用 Cocos Creator 3.8.8。
- 构建 Web Desktop，启动场景为 `Game.scene`。
- 使用 HTTP 服务运行 `build/web-desktop`，不得直接双击 `index.html`。
- 必须用真实浏览器键盘和点击验证，不能只依据代码检查或构建成功。
- 每个模式至少在全新页面完成一次完整流程。
- 同一页面会话中完成一次模式切换验证。
- 最终 console 不得有新增 error 或 warning。
- 执行 `git diff --check`。
- 更新 `README.md` 和 `study/project-map.md`，记录最终规则和实际证据。

## 15. 对比观察记录

分别记录 Classic 和 Pattern：

- 第一次和第二次通关时间；
- P/G/M、ACC、最大 combo；
- Pattern 失败次数和主要失败原因；
- 玩家是否主动立即重玩；
- 玩家能否描述失败原因；
- 玩家更愿意继续哪种模式及原因。

不要求新增远端分析或持久化埋点。

## 16. 交付要求

开发 Agent 完成后必须提供：

1. 新增和修改文件清单；
2. 模式接口、宿主边界和输入权限实现；
3. Classic 与基线 `87559c3` 的行为回归结果；
4. Pattern 三块矿石逐项验收结果；
5. 模式选择、URL 直达、重开、返回选择和中断恢复结果；
6. Creator 构建结果与实际输出路径；
7. 真实浏览器证据和 console 状态；
8. 对比观察记录；
9. 未完成项、手感参数和已知限制；
10. 当前 Git 状态，明确是否提交和推送。

不得仅以“构建成功”作为完成结论。
