# 节拍采矿 H5 Demo

一个使用 Cocos Creator 3.8.8 制作的最小 2D 像素风节拍采矿试玩。包含移动、112 BPM 四拍节拍器、Perfect/Good/Miss 判定、挥镐反馈、连击、岩石破坏、矿石掉落与收集。

音乐采用原创 112 BPM、4/4、8 小节 8-bit Chiptune 循环，并配有挥镐、Good、Perfect、岩石碎裂和矿石收集音效。每首音乐通过独立配置声明 BPM、拍号、节拍偏移、输入延迟补偿和判定窗口，游戏持续使用音乐播放时间进行判定。受浏览器自动播放策略限制，背景音乐会在玩家首次按键后开始。

## 打开项目

1. 打开 Cocos Dashboard。
2. 使用 **导入**，选择本目录 `beat-mining-demo`。
3. 确认使用 Cocos Creator **3.8.8** 打开，不要升级项目版本。
4. 打开 `assets/scenes/Game.scene`。

## 运行预览

1. 在编辑器顶部选择浏览器预览。
2. 点击运行按钮。
3. 使用 `A/D` 或左右方向键移动，按空格键挥镐。
4. 靠近岩石，并在顶部黄色节拍方块亮起时挥镐。
5. 判定下方会显示本次输入偏早或偏晚的毫秒数；底部显示 Perfect、Good、Miss、最大连击和平均绝对偏差，供试玩调参使用。
6. 玩家朝向并进入可挖范围时，岩石会显示青色高亮边框；挥镐判定在按键时完成，伤害、碎屑、音效和震动会在镐头接触岩石时触发。

## 构建 Web/H5

1. 打开菜单 **项目 → 构建发布**。
2. 发布平台选择 **Web Mobile**（移动 H5）或 **Web Desktop**。
3. 将启动场景设置为 `Game.scene`。
4. 点击 **构建**。构建输出默认位于项目的 `build/` 目录。
5. 使用构建面板的 **运行** 按钮或静态 HTTP 服务访问构建产物；不要直接双击 `index.html`。

## 代码职责

- `GameManager.ts`：组装场景、统筹玩法流程、掉落与收集。
- `BeatManager.ts`：BPM 时钟、四拍循环和判定窗口。
- `Player.ts`：移动、朝向、挥镐动画和音效占位。
- `MiningRock.ts`：岩石生命值、受击与碎裂。
- `OrePickup.ts`：矿石表现与收集动画。
- `UIController.ts`：节拍、判定、连击和矿石数量。
- `AudioManager.ts`：加载并播放循环音乐和各类操作音效。
- `MusicTrackConfig.ts`：保存当前 BGM 对应的 BPM、拍号、偏移和判定窗口。

`MusicTrackConfig.ts` 中的 `inputOffsetSeconds` 用于设备或玩家输入延迟校准：试玩数据长期显示 `LATE` 时填写正值，长期显示 `EARLY` 时填写负值。例如平均晚 35 ms，可设为 `0.035`。

音频由 `tools/generate_chiptune.py` 生成；需要重新生成时，在项目目录执行 `python3 tools/generate_chiptune.py`。旧版 120 BPM 音乐备份在 `tools/audio-backups/mine_loop_120bpm_original_20260915.wav`。

范围刻意保持为单场景最小玩法，不含关卡、随机地图、背包、商店、剧情、敌人或平台功能。
