# 第一个 Cocos 组件与启动日志：评估证据

- 评估 ID：`component-entry-stage-01-v1`
- 日期：2026-08-11
- 模块：`project.basics-lab.component-entry`

## 已检查的实现

- `assets/scripts/Welcome.ts` 导入 `_decorator` 和 `Component`，以 `@ccclass('Welcome')` 登记并导出 `Welcome extends Component`。
- `Welcome.start()` 调用 `console.log('游戏开始了')`。
- `assets/scenes/Hello.scenes.scene` 的 `Canvas` 节点序列化了 `Welcome` 组件；项目检查器将该组件解析到 `assets/scripts/Welcome.ts`。

## 运行与理解证据

- 学习者报告 Cocos Creator 预览控制台输出“游戏开始了”。
- 学习者解释：Cocos 在组件挂载并启动时自动调用 `start()`；`extends Component` 是 TypeScript 的继承，而 `@ccclass('Welcome')` 用于让 Cocos 识别该组件类。

## 结论

通过。补充运行条件：只有组件已经挂载到激活节点且组件处于启用状态时，Cocos 才会在生命周期中调用其 `start()`。
