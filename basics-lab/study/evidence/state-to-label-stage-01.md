# 组件状态与 Label 显示：评估证据

- 评估 ID：`state-to-label-stage-01-v1`
- 日期：2026-08-11
- 模块：`project.basics-lab.state-to-label`

## 已检查的实现

- `Welcome` 声明了 `@property(Label) statusLabel: Label | null`，并在场景的 `Canvas` 组件序列化数据中绑定到 `StatusLabel`。
- `Welcome` 以 `private score: number = 0` 保存数值状态。
- `start()` 将模板字符串 ``得分：${this.score}`` 传给带空值保护的刷新方法，后者更新 `statusLabel.string`。

## 运行与理解证据

- 学习者报告保存并预览后，画面显示“得分：0”。
- 学习者说明：改变 `score` 不会自动改动 `statusLabel.string`；显示字段必须再被刷新。

## 结论

通过。当前刷新发生在 `start()`；若运行中修改 `score`，应在合适的状态变化点再次调用刷新逻辑。
