# 节拍采矿 Demo 项目地图

- Cocos Creator：3.8.8
- 入口场景：`assets/scenes/Game.scene`
- 核心玩法：在 112 BPM 固定 4/4 拍节奏中移动、挥镐、破坏岩石并收集矿石。
- 场景结构：静态场景只包含 Canvas、Camera 和 GameManager；游戏节点由 GameManager 在运行时创建。
- 明确排除：关卡、随机地图、背包、商店、剧情、敌人、复杂 UI 和 Steam 功能。

## 输入到反馈

`Player` 接收键盘输入，空格触发 `GameManager.tryMine()`；`BeatManager` 返回 Perfect、Good 或 Miss；有效命中交给 `MiningRock` 扣除生命值，碎裂后创建 `OrePickup`；`UIController` 显示节拍、判定、连击和矿石数量。

## 运行验证

- 2026-09-15 使用 Cocos Creator 3.8.8 命令行完成 `web-desktop` 调试构建，输出位于 `build/web-desktop`；构建日志显示 `build Task (web-desktop) Finished`。
- 初版通过本地 HTTP 服务在真实浏览器运行构建产物，确认 A/D 移动、120 BPM 四拍提示、挥镐动画和判定反馈可见。
- 实际键盘流程得到 Miss、Good、Perfect；Good 后连击为 1，连续两次 Perfect 后连击为 3、Perfect 连续数为 2。
- 第一块岩石生命值按 1 + 2 + 2 伤害归零，岩石数由 3 变为 2并掉落 1 个矿石；移动接触后矿石被收集，HUD 的 ORE 从 0 变为 1。
- 加入原创 8-bit 音频后再次运行 Web/H5 构建：音频资源全部加载完成；首次键盘输入前背景音乐未播放，按键后进入循环播放，符合浏览器自动播放限制。
- 音频版本的真实键盘复测得到连续两次 Perfect 和一次 Good，连击为 3，岩石被挖碎并掉落矿石，移动收集后矿石数为 1；挥镐、判定、碎裂和收集流程均触发各自音效调用。
- 修复音乐与判定时钟的启动相位：首次按键启动背景音乐时同步重置 `BeatManager`。2026-09-15 在 Chrome 中连续采样 12 次，音乐拍点与游戏判定拍点的偏差稳定约为 9 ms；在同步拍点挥镐得到 Perfect。
- 2026-09-15 将 BGM 重新编排为 112 BPM、固定 4/4、8 小节循环；每小节采用“强、弱、次强、弱”的稳定重音，主旋律从四分音符正拍起音，避免听感上出现中途变拍。旧版音乐备份为 `tools/audio-backups/mine_loop_120bpm_original_20260915.wav`。
- 曲目 `audio/mine_loop` 与 `MusicTrackConfig.ts` 中的 BPM、拍号、拍点偏移和 Perfect/Good 判定窗口绑定；浏览器连续 12 次采样中，音乐播放时间与判定拍点计算偏差为 0 ms。
- 新版构建在 Chrome 中再次使用真实键盘复测：D 键移动并启动 BGM，连续三次正拍空格均得到 Perfect，连击达到 3；第一块岩石被挖碎并掉落矿石，继续移动后矿石数从 0 增至 1，岩石数从 3 降至 2。HUD 显示 BPM 112，浏览器状态读取到 `bpm: 112`、`beatsPerBar: 4`。
- 浏览器控制台最终无 error 或 warning。
