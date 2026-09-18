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
- 2026-09-16 优化移动和挥镐手感：移动改为加减速，进入朝向内的挖掘范围时岩石显示青色边框；节拍判定在按键时立即反馈，伤害、命中音效、碎屑和震动延后到镐头接触时触发，Perfect 与 Good 使用不同的短暂停顿。
- 本轮 Web/H5 构建与真实浏览器复测通过：按键约 25 ms 后已显示 Perfect 且岩石仍为 5 HP，约 155 ms 后接触生效并降至 3 HP；连续三次 Perfect 可碎岩、掉落并收集矿石。离开挖掘范围后挥镐得到 Miss，连击从 3 清零，岩石 HP 保持不变；浏览器控制台无 error 或 warning。
- 2026-09-16 将单关扩展为 6 块固定矿脉，包含普通、硬质和最终水晶三种外观、分阶段裂纹、1/2/3 个固定掉落、矿脉进度与单关结算。使用 Web/H5 构建在真实浏览器通过键盘完整通关：Perfect 造成 2 点伤害、Good 造成 1 点伤害、离开范围挥镐判定 Miss 且不扣血；硬质岩石裂纹、多矿石掉落、最终水晶 `CRYSTAL BREAK!` 强化反馈均正常。收集过程中观测到 `collectingOres=1` 时 `completedSeconds` 仍为空，全部 9 个矿石收集且 `collectingOres=0` 后才显示用时、ORE、MAX 和 AVG 结算；按 R 后恢复到玩家 x=-510、6 块岩石、ORE 0，浏览器控制台无 error 或 warning。
- 2026-09-16 增加由每首音乐配置驱动的视觉律动：BPM 决定实际拍长，配置以拍数声明人物抖腿和背景呼吸周期，并设置世界脉冲、重拍与 Perfect 连击增强幅度；挥镐、命中与收集动画仍保持独立即时反馈。Creator 3.8.8 Web/H5 构建通过，浏览器采样显示音乐启动前各缩放为 1，启动后世界缩放范围 1.0000–1.0048、背景范围 1.0000–1.0060、左右腿抬升约 5 像素；节拍位置与音乐播放时间的最大采样误差小于 0.0005 拍。连续两次 Perfect 后世界脉冲峰值增强到 1.0073，破岩、掉落、移动收集流程正常，控制台无 error 或 warning。
- 2026-09-16 增加防连点判定：输入映射到最近的节拍槽，每拍仅第一次挥镐参与判定，Miss 同样消耗该拍，同拍重复输入显示 `TOO FAST` 且不计入判定或伤害；Player 在完整挥镐期间仍会记录后续空格，避免利用动画锁反复碰撞判定窗口。Perfect/Good 窗口收紧为 ±60/±130 ms。Creator 3.8.8 Web/H5 构建通过；浏览器以约 80 ms 间隔连续输入 40 次时，仅首次得到 Perfect，产生 7 次 Miss、32 次重复输入，连击归零且岩石未碎。重载后按音乐节拍输入两次均得到 Perfect（误差 14/25 ms），正常碎岩和掉落，控制台无 error 或 warning。
- 2026-09-16 增加浏览器输入延迟校准与设置窗口：首次运行可执行 4 拍预备加 12 拍听觉采样，使用去除首尾异常值后的中位数生成 `-300～+300 ms`、5 ms 步进的玩家补偿；按 C 可打开 Slider，支持拖动、方向键微调、T 重测和 0 重置，补偿与首次提示状态保存到 `localStorage`，HUD 显示当前 OFFSET。浏览器完整流程复测中，12 次约 140 ms 晚按样本得到 +160 ms 建议值（包含自动化输入开销），应用后滑块可从 +160 拖至 +95、方向键调至 +100并重置；设置 +140 ms 后，在原始拍点后约 140 ms 输入得到 Perfect、剩余误差 20 ms。页面重载后仍读取 +140 ms，当前构建控制台无 error 或 warning。
- 2026-09-16 将按 C 打开的窗口调整为“设置”容器；当前只提供“节拍输入设置”一项，没有其他配置占位。该项保留手动补偿滑块和快捷键，并新增可点击的“开始输入校准”按钮。Creator 3.8.8 `web-desktop` 构建通过；真实浏览器中点击按钮后进入“准备 4”校准流程，控制台无 warning 或 error。
- 2026-09-16 将校准改为独立提示音流程：2 秒准备后播放短“滴”声，玩家在每声后按空格；只需采集 4 次有效输入，漏按会重复当前声而不会消耗次数。采样中暂停 BGM，使用 4 个延迟样本的中位数生成补偿建议。Creator 3.8.8 `web-desktop` 构建通过；真实浏览器从“校准 1/4”完成到建议补偿结果页，修复旧节拍回调后未产生新的控制台 warning 或 error。
- 2026-09-17 将“无目标空挥”和节奏 Miss 分离：`BeatManager` 新增不写 `lastAttemptedBeatIndex` 的 `previewNow()`、`consumeBeatSlot()`，`GameManager.tryMine()` 先解析目标空间状态（`inRange` / `assist` / `tooFar` / `facingWrong` / `none`）再决定是否正式判定；只有 `inRange` 才消费节拍槽并写入 combo、Perfect streak、P/G/M、平均偏差和首次挥镐计时，其余状态显示 `距离不足` 或 `请面向矿石` 且只播放空挥动画与挥镐音效。调试状态新增 `targetState`、`facing`、`miningPointX` 字段。Creator 3.8.8 `web-desktop` 构建通过；真实浏览器中玩家在最左端按拍连续三次挥镐均显示 `TooFar`，`attemptedBeatIndex`、combo、P/G/M、最大连击、平均偏差和 `playSeconds` 全部保持不变；背对最右侧水晶挥镐得到 `FacingWrong` 且未消费节拍槽，立即转向后同一拍挥镐得到 `Perfect`（偏差 23 ms）并正常扣血；在辅助带边缘挥镐后走近同一拍再次挥镐得到 `Good`；正式判定后同拍重复输入显示 `TOO FAST` 且不产生第二次伤害；范围内晚按 200 ms 得到正式 `Miss`，combo 由 2 清零。控制台无 warning 或 error。辅助带高亮（3.2）与后续手感受益尚未实现。
- 2026-09-17 修复空挥与身后目标的边界：`Player` 的轻量空挥不再设置 `swinging`，正式挥镐开始时会停止残留的空挥镐 tween；正式挥镐期间仍会先传递输入给 `GameManager`，因此同拍重复输入继续显示 `TOO FAST`。`GameManager` 判断身后目标时改用转向后的挖掘点排序和距离判定，中心距离 164 像素的身后岩石在转向后挖掘点距离 92 像素，会正确返回 `facingWrong`。Creator 3.8.8 `web-desktop` 构建通过；真实浏览器中玩家 x=-514、朝左时空挥得到 `FacingWrong` 且 `attemptedBeatIndex` 为空，75 ms 内朝右移动到 x=-506 并在同拍挥镐得到 Perfect（39 ms），第一块岩石 HP 由 3 降到 1，`impactPending=false`；控制台无 warning 或 error。
- 2026-09-17 增加矿石边缘攻击辅助：保留玩家挖掘点到矿石中心 92 像素的正式范围，额外 24 像素显示暗青色辅助提示。辅助带内输入会立即进入正式节拍判定，`Player` 以 60～90 ms、最多 24 像素的水平 tween 移动到原始范围，再在镐头接触时结算伤害；移动期间继续计算正常加减速与朝向，结束后恢复常规位置更新。`MiningRock` 将范围反馈分为无提示、弱提示和正式可挖三档。Creator 3.8.8 `web-desktop` 构建通过；真实浏览器中 x=-530、朝右、辅助带内按拍挥镐后 25 ms 已显示 Perfect、HP 保持 3、`assistMoving=true`，约 95 ms 到达 x=-514，随后接触时 HP 降为 1 且 `impactPending=false`；x=-540、超出辅助带时挥镐保持位置与 HP 不变、combo 不变；控制台无 warning 或 error。
- 2026-09-18 增加下一拍连续视觉预告：顶部四拍方块不再只在拍点瞬间跳变，而是由 `BeatManager.beatPosition` 的实际音乐时钟每帧驱动。下一拍从 85% 缩放、暗色逐渐蓄力到约 115% 黄色；到达拍点后短暂闪亮，首拍额外增强，Perfect streak 只小幅增加该闪光。音乐未开始、校准或设置窗口打开时四个方块恢复暗色、100% 静态；关闭设置后按当前音乐位置恢复。浏览器调试状态新增方块缩放和颜色读数。Creator 3.8.8 `web-desktop` 构建通过；真实浏览器中未开始音乐时四个缩放均为 1、颜色为暗色，播放中 160 ms 采样显示下一拍缩放从 0.903 增至 0.997 且颜色持续变黄，设置窗口中四个方块恢复 1 和暗色，关闭后按实时节拍恢复；控制台无 warning 或 error。
- 2026-09-18 将首拍的预告蓄力峰值收回约 115%，首拍的额外强调仅保留在拍点到达后的闪亮。最终浏览器采样中四拍方块最大缩放为 1.145，未超过该目标。
- 2026-09-18 精简游玩 HUD：游玩阶段隐藏 P/G/M/MAX/AVG 和 OFFSET，内部统计与浏览器调试状态保留；正式判定的 EARLY/LATE 在约 700 ms 后隐藏。首次 Perfect/Good 后底部操作提示以 350 ms 淡出，打开设置时提示与 OFFSET 恢复，关闭后再次淡出；单关结算显示用时、ORE、完整 P/G/M/MAX/AVG 与 R 重玩提示。浏览器调试状态新增 HUD 可见性和帮助透明度。Creator 3.8.8 `web-desktop` 构建通过；真实浏览器中初始 stats/offset 分别为隐藏、隐藏，Perfect 后 timing 可见，800 ms 后 timing 和帮助均隐藏，设置中 offset 与帮助恢复，关闭设置后再次淡出；控制台无 warning 或 error。
- 2026-09-18 修复设置关闭后遗留的帮助淡出任务：关闭设置时安排的 500 ms 回调现在记录 `helpVisibilityVersion`，重新打开设置会递增版本并使旧回调失效。Creator 3.8.8 `web-desktop` 构建通过；真实浏览器中首次 Perfect 后帮助已隐藏，打开设置可恢复帮助与 OFFSET，关闭 150 ms 后再次打开设置并等待 900 ms，设置仍打开且帮助保持可见、透明度 255；控制台无 warning 或 error。
- 2026-09-18 增加 Perfect streak 热手收益：第三次连续 Perfect 后进入热手，COMBO 变为橙红并通过短提示说明下一次 Perfect 造成 3 点；热手的后续 Perfect 使用 3 点伤害、增强碎屑、命中特效与 Perfect 音量，Good 结束热手与 streak 但保留 combo，Miss 同时清空 combo、streak 与热手。调试状态新增 `hotHand`。Creator 3.8.8 `web-desktop` 构建通过；真实浏览器中连续三次 Perfect 后 `hotHand=true`，后续 Perfect 将最终水晶 HP 从 9 降至 6（3 点伤害），随后 Good（114 ms）将 combo 从 4 提至 5、streak 归零且 `hotHand=false`，水晶 HP 从 6 降至 5；控制台无 warning 或 error。
- 2026-09-18 完善单关结算：`GameManager` 以正式判定数计算准确率（Perfect 100、Good 60、Miss 0），按 S/A/B/C 规则生成评级和下一局目标，并写入浏览器调试状态；`UIController` 结构化展示评级、用时、ORE、P/G/M、MAX、AVG、ACC 和目标。Creator 3.8.8 `web-desktop` 构建通过；真实浏览器以 13 次 Perfect 完整破坏 6 块矿石、收集 9 个掉落后才结算，显示 47.2 秒、ACC 100.0%、S 评级与“挑战更低用时或更高最大连击”，且 stats、评级和目标均可见。按 R 后恢复 6 块矿石、ORE 0、P/G/M 0、热手关闭、结算标签隐藏，输入补偿保持 0；控制台无 warning 或 error。
- 2026-09-18 修复触发热手这一拍的时差反馈：热手说明移到独立 `HotHandNotice` 标签，`timing` 继续显示该次 Perfect 的 EARLY/LATE。Creator 3.8.8 `web-desktop` 构建通过；真实浏览器第三次 Perfect 后显示 EARLY 6 ms，热手与独立“下一次 PERFECT 造成 3 点伤害”提示同时可见，约 700 ms 后两者隐藏；控制台无 warning 或 error。
- 2026-09-18 增加经典采矿与节奏复刻的模式选择、mode=classic/mode=pattern URL 直达及菜单点击入口；进入选择页不启动 BGM，选定玩法后才初始化校准与音乐输入。Pattern 使用三块普通/硬质/水晶矿石，先聆听四拍后复刻全按、交替休止和水晶谱面，失败在下一完整小节重试，成功自动收集 1/1/3 个掉落。Web Desktop 构建通过；真实浏览器确认无参数选择页、鼠标选择 Pattern、Classic URL 直达六矿石、Pattern 前两块成功后矿石数由 3 变 1 且 ORE 由 0 变 2，控制台无 warning 或 error。
