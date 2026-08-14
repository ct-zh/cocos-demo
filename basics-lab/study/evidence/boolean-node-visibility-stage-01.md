# 布尔状态与节点显示：评估证据

- 评估 ID：`boolean-node-visibility-stage-01-v1`
- 日期：2026-08-13
- 模块：`project.basics-lab.boolean-node-visibility`

## 已检查的实现

- 场景中 `HelpLabel` 与 `ToggleHelpButton` 已绑定到 `Welcome`。
- `showHelpTxt: boolean = true` 是帮助文字可见状态。
- 点击回调只将 `showHelpTxt` 取反，再调用 `refreshHelpLabelStatus()`。
- `refreshHelpLabelStatus()` 只在 Label 非空时，将其所在节点的 `active` 同步为 `showHelpTxt`。

## 运行与理解证据

- 学习者确认预览初始显示帮助文字，第一次点击隐藏，第二次点击再次显示；加减分保持正常。
- 学习者说明：显示时取反后字段和节点 `active` 都变为 `false`；状态变更与渲染分开是因为一个函数只承担一件事情。

## 结论

通过。学习者已将布尔状态通过 Cocos 节点 active 属性渲染为可见性。
