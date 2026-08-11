# 方法参数与得分下限：评估证据

- 评估 ID：`score-parameters-conditions-stage-01-v1`
- 日期：2026-08-11
- 模块：`project.basics-lab.score-parameters-conditions`

## 已检查的实现

- 场景包含并绑定 `AddScoreButton` 与 `SubtractScoreButton`。
- 两个 CLICK 回调分别调用 `changeScore(1)` 与 `changeScore(-1)`。
- `changeScore(delta: number)` 是唯一的得分变更路径：先累加，再通过 `if (this.score < 0)` 使其回到 0，随后刷新 Label。

## 运行与理解证据

- 学习者确认预览中从 0 加一次、再连续减两次的显示依次为 0、1、0、0。
- 学习者说明：共享的 delta 方法避免加减逻辑重复；得分为 0 时减分先到 -1，条件判断将字段重置为 0，再刷新显示。

## 结论

通过。学习者已使用带类型参数的方法和条件判断维护得分下限。
