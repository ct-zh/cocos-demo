# 拼图 Demo 项目地图

## 结论边界

本文档基于项目清单、序列化场景、脚本、资源元数据和说明文档生成。当前只确认了静态结构，没有在本检查点中启动 Cocos Creator、运行浏览器预览或执行构建，因此不把“能运行”记录为已验证事实。

## 项目入口

- Cocos Creator 版本：`3.8.8`，来源：[package.json](../package.json)。
- 项目 UUID：`c05d45b8-f363-45aa-872d-ae7dcb8ad232`。
- 唯一场景：[Game.scene](../assets/scenes/Game.scene)。
- 唯一自定义脚本：[PuzzleGame.ts](../assets/scripts/PuzzleGame.ts)。
- 场景通过脚本 `.meta` UUID 对应的序列化 type ID，把 `PuzzleGame` 组件挂在 `Canvas` 节点上。
- 当前稳定项目文件不足以证明哪个场景被设为预览启动场景；说明文档要求用户手动将 `Game.scene` 设为启动场景。

## 编辑器中的静态场景

序列化场景只有两个节点：

```text
Scene(Game)
└── Canvas
    └── Camera
```

`Canvas` 已挂载：

- `cc.UITransform`
- `cc.Canvas`
- `cc.Widget`
- 自定义 `PuzzleGame`

`Camera` 已挂载 `cc.Camera`。`PuzzleGame` 在场景中保存的属性包括 `gridSize=3`、`tileSize=180`、`gap=8`、`shuffleOnStart=true`、`autoLoadPath=puzzle_ai/spriteFrame`，`sourceImage` 为空。

标题、步数、按钮、棋盘、图块和胜利面板不在静态场景中；它们由 `PuzzleGame.start()` 之后动态创建。理解编辑器静态节点树和运行时节点树的区别，是这个项目的第一个关键点。

## 启动与初始化调用链

```text
Cocos 激活 PuzzleGame 组件
└── start()
    ├── 规范化 gridSize，最小为 2
    ├── _buildUI()
    │   ├── 创建标题、提示和步数 Label
    │   ├── 创建 Board 节点
    │   ├── 创建重新开始 Button
    │   └── 创建初始隐藏的 WinPanel
    └── _bootstrap()
        ├── sourceImage 已绑定 -> _initBoard()
        └── sourceImage 为空 -> 按候选路径异步加载 SpriteFrame
            └── _initBoard()
                ├── _prepareFrames()
                ├── _createTiles()
                └── restart()
```

资源加载是异步回调，但 UI 外壳先同步创建。棋盘初始化要等图片加载成功或所有候选路径失败后才继续。

## 运行时节点与事件

`_createTiles()` 根据 `gridSize * gridSize` 创建图块。每个图块包含：

```text
Tile_n (UITransform + Graphics + TOUCH_END)
├── Image  (UITransform + Sprite)
├── Num    (UITransform + Label + LabelOutline)
└── Select (UITransform + Graphics)
```

触摸回调捕获循环中的 `slot`，设置 `event.propagationStopped = true`，然后调用 `_onTileClick(slot)`。按钮使用 `Button.EventType.CLICK`。代码没有独立 `onDestroy()` 解绑逻辑；这些监听都注册在该组件创建的子节点上，节点随整个场景销毁时会一同释放，但若以后改成全局输入或长期存活节点，需要重新评估生命周期与解绑。

## 核心状态模型

| 字段 | 语义 |
|---|---|
| `_tiles[slot]` | 某个棋盘槽位对应的显示节点 |
| `_order[slot]` | 当前位于该槽位的图块正确编号 `pieceId` |
| `_frames[pieceId]` | 该编号对应的裁切 SpriteFrame |
| `_selectedSlot` | 第一次点击选中的槽位，未选中时为 `null` |
| `_steps` | 已完成的交换次数 |
| `_locked` | 胜利后阻止继续操作 |

胜利条件是对每个下标 `i` 都满足 `_order[i] === i`。当前玩法允许交换任意两块，因此任意排列都可以恢复，不需要传统滑块拼图的奇偶可解性判断；`_shuffleSolvable()` 实际保证的是随机排列且不等于完成状态。

## 一次交互的数据流

```text
TOUCH_END(slot)
└── _onTileClick(slot)
    ├── 第一次点击：记录 selectedSlot，显示选中框
    ├── 再点同一格：取消选择
    └── 点击另一格
        ├── 交换 _order[a] / _order[b]
        ├── steps + 1
        ├── _refreshAllTiles()
        │   └── _applyPieceToSlot(slot, pieceId)
        └── _isSolved()
            └── _onWin()：锁定输入、更新文字、显示 WinPanel
```

这里的状态源是 `_order`，节点位置本身不交换；刷新时只是把对应 `pieceId` 的颜色或 SpriteFrame 应用到槽位节点。

## 图片资源与裁切

- `assets/resources/puzzle_ai.jpg`
- `assets/resources/puzzle_sample.png`
- `assets/textures/puzzle_sample.png`

`_prepareFrames()` 读取整图的 `SpriteFrame.rect`，按行列计算子矩形，对源 SpriteFrame 做 `clone()` 和 `reset()`，生成 `_frames[pieceId]`。自动加载只会访问 `assets/resources/` 中的资源；`assets/textures/` 下的图片只能通过编辑器属性绑定或其他加载机制使用。

## 已发现的不一致

1. [SETUP_拼图.md](../SETUP_拼图.md) 的“什么都不拖”部分说会自动加载 `puzzle_sample.png`。
2. 实际代码和场景属性优先尝试 `puzzle_ai/spriteFrame`，之后才回退到 `puzzle_sample`。
3. 脚本属性 tooltip 也写的是自动加载 `puzzle_ai`。

因此当前真实优先级以代码为准；文档没有与实现完全同步。后续学习任务可以要求用户解释并修复这类边界，但本项目地图不擅自选择应该保留哪张图。

## 可测试性与设计观察

- `_isSolved()`、交换、打乱和状态转换本质上是纯游戏规则，但当前与 `Component` 私有状态耦合，无法方便地脱离 Cocos 运行时单测。
- 一个 545 行组件同时承担资源加载、UI 构建、输入、游戏状态和渲染刷新，适合代码考古，但不适合作为所有基础概念的最小示例。
- `tsconfig.json` 当前设置 `strict: false`；不应为了教学直接全局开启严格模式，应该先在隔离练习或抽出的纯逻辑模块中验证影响。
- 当前没有 Prefab；所有运行时 UI 都靠代码创建，适合对比“编辑器组装”和“代码生成”两种方式。

## 尚未验证

- `Game.scene` 是否已在本机编辑器中设为当前预览启动场景。
- TypeScript 是否在当前 Creator 环境中无错误编译。
- 浏览器预览是否能正确加载图片、交换图块并触发胜利。
- Web Mobile 或其他平台构建是否成功。
- 运行时资源释放、重复进入场景和长期运行表现。

## 候选学习模块

1. **运行入口与组件绑定**：从 `Game.scene` 追到 `PuzzleGame.start()`，理解 Node、Component、装饰器和属性序列化。
2. **静态场景与动态 UI**：手动画出预览后的节点树，解释 `UITransform`、Canvas 和运行时 `addComponent()`。
3. **资源加载与 SpriteFrame 裁切**：解释 `resources` 路径、图片子资源、异步回调和子矩形计算。
4. **事件与状态流**：追踪两次点击如何改变 `_order`、显示和胜利状态。
5. **纯逻辑抽离与测试**：由用户抽出棋盘模型并编写测试，保持现有游戏行为不变。

这些模块目前都只是候选路线，尚未开始或通过。
