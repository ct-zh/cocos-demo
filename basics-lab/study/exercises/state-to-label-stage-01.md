# 第 2 关：组件状态与 Label 显示

## 目标

让 `Welcome` 组件持有一个数值状态，并在启动时显示为画面文字。

## 你需要完成

1. 在 `Canvas` 下创建一个 Label 节点，命名为 `StatusLabel`。
2. 在 `Welcome.ts` 中导入 `Label`，声明一个可在 Inspector 中绑定的 `Label` 属性；初始值应允许为空。
3. 将场景的 `StatusLabel` 拖到该属性槽位。
4. 在组件中声明一个私有的数值字段，初始值为 `0`。
5. 在 `start()` 中把 Label 显示为 `得分：0`（全角冒号）。可用一个单独方法完成状态到文字的更新。

## 验收

- `Canvas` 上的 `Welcome` Inspector 有已绑定的 Label 属性。
- 预览画面可见 `得分：0`。
- Console 没有 `null`、`undefined` 或脚本异常。

## 暂不涉及

- 点击事件、按钮、动画、资源加载、每帧 `update()`。
