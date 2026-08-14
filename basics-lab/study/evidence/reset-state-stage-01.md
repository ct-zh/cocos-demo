# 集中重置多个组件状态：阶段 1 证据

- 模块：`project.basics-lab.reset-state`
- 验收版本：`reset-state-stage-01-v1`
- 日期：2026-08-14

## 已检查的实现

- 场景新增 `ResetButton`，包含 `cc.Button`。
- `Welcome.ts` 用 `@property(Button)` 绑定 `resetBtn`。
- `start()` 使用具名 `reset` 回调注册 CLICK；`onDestroy()` 使用相同方法引用和 `this` 解绑。
- `reset()` 恢复 `score`、`runTime`、`elapsed` 与 `showHelpTxt` 的初始状态，并复用已有得分、计时和帮助文字刷新方法。

## 验证与理解

- 学习者报告预览正常。
- 学习者预测：得分为 3、运行 2 秒、帮助文字隐藏时重置，会显示得分 0、运行 0 秒与可见的帮助文字。
- 学习者解释：字段重新赋值只改变组件中的本地状态，必须调用刷新方法才会更新对应的界面组件内容。

## 边界

预览结果来自学习者报告；静态检查不代替实际交互运行的证明。
