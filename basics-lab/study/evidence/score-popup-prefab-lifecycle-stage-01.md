# 得分飘字：Prefab、动画与生命周期——评估证据

- 模块：`project.basics-lab.score-popup-prefab-lifecycle`
- 评估 ID：`score-popup-prefab-lifecycle-stage-01-v1`
- 日期：2026-08-15

## 已检查的实现

- `assets/prefabs/ScorePopup.prefab` 存在；场景包含 `PopupLayer`，并在 `Welcome` 上绑定 Prefab 与父节点。
- 每次得分实际变化时以 `instantiate` 创建独立实例，挂载到 `PopupLayer` 并设置对应 Label 文字。
- Tween 同时负责节点上移和 `UIOpacity` 淡出，完成后销毁对应实例。
- 结构审计通过，项目清点解析到 Prefab、PopupLayer、Prefab/Node/Tween/UIOpacity 相关脚本引用。

## 运行与理解证据

- 学习者报告预览中：`+1`、有效 `-1`、0 分减分无飘字、连续点击、动画后无残留实例，以及原有控件均符合预期。
- 学习者解释：连续点击时每个 Tween 绑定各自 `instantiate` 得到的临时节点，因此完成时只销毁自己的飘字实例。

## 限制

- 未附截图或控制台日志；运行结论基于学习者报告，未被自动化浏览器独立复现。
