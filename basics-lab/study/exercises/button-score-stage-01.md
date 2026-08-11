# 第 3 关：按钮点击与状态更新

## 目标

把“点击按钮”转换成一次明确的状态变化，再把新状态显示到画面。

## 你需要完成

1. 在 `Canvas` 下创建一个 UI Button，命名为 `AddScoreButton`，按钮文字改为“加 1 分”。
2. 在 `Welcome.ts` 中导入 `Button`，并用 `@property(Button)` 声明一个可绑定的 Button 字段；在 Inspector 把 `AddScoreButton` 绑定进去。
3. 在 `start()` 中为该 Button 注册 `Button.EventType.CLICK` 事件。注册形式是 `button.node.on(事件类型, 方法, this)`；方法名由你定义。
4. 在点击方法中让 `score` 增加 `1`，然后复用已有的刷新 Label 逻辑。
5. 将刷新逻辑改为直接读取 `this.score`，而不是由调用方传递最终显示文字。

## 验收

- 预览初始显示 `得分：0`。
- 每点一次“加 1 分”，得分依次变为 `得分：1`、`得分：2`、`得分：3`。
- Button 与 Label 都通过 Inspector 绑定，控制台无异常。

## 暂不涉及

- 事件解绑、按钮禁用、动画、音效、每帧 `update()`、保存分数。
