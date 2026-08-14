# 逐帧更新与 `deltaTime`：阶段 1 证据

- 模块：`project.basics-lab.update-deltatime-timer`
- 验收版本：`update-deltatime-timer-stage-01-v1`
- 日期：2026-08-13

## 已检查的实现

`assets/scripts/Welcome.ts`：

- 以 `@property(Label)` 暴露并绑定 `timeLabel`；场景中存在 `TimeLabel` 节点及 `cc.Label` 组件。
- `runTime: number` 用于累计经过时间。
- `update(deltaTime)` 将每帧的 `deltaTime` 累加到 `runTime`。
- `refreshTimeTxt()` 使用 `Math.floor(runTime)` 显示完整秒数，并保护未绑定的 `timeLabel`。
- 额外的 `elapsed` 字段使文本约每秒刷新一次，而非每帧刷新。

## 验证与理解

- 学习者报告预览约 3 秒后显示“运行：3 秒”，加分、减分与帮助按钮均正常。
- 学习者解释：`deltaTime` 是上一帧到当前帧的实际秒数，不能把每一帧都当作一秒并直接加 `1`。

## 边界

预览结果来自学习者报告；静态检查不替代真实运行时计时精度验证。
