# 事件监听与组件销毁清理：阶段 1 证据

- 模块：`project.basics-lab.event-lifecycle-cleanup`
- 验收版本：`event-lifecycle-cleanup-stage-01-v1`
- 日期：2026-08-13

## 已检查的实现

`assets/scripts/Welcome.ts` 将三个按钮点击监听改为具名组件方法：

- 加分：`addScore`
- 减分：`subScore`
- 帮助文字切换：`changeHelpTxtStatus`

在 `start()` 中，每个监听均使用 `node.on(Button.EventType.CLICK, method, this)` 注册；在 `onDestroy()` 中，使用完全相同的事件类型、方法引用和 `this` 通过 `node.off(...)` 解绑。

## 验证与理解

- 学习者报告预览中的加分、减分及帮助文字切换均正常。
- 静态检查确认 `onDestroy()` 生命周期方法存在，且三组 `on()`/`off()` 配对一致。
- 学习者说明：若 `Welcome` 已销毁，而仍存活的事件来源继续触发其回调，会有失效调用与报错风险，因此销毁前应解绑。

## 边界

本证据不把静态检查当作销毁流程的运行时演示；预览正常性来自学习者报告。
