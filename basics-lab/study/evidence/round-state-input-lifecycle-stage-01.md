# 挑战回合：状态机、输入与生命周期——评估证据

- 模块：`project.basics-lab.round-state-input-lifecycle`
- 评估 ID：`round-state-input-lifecycle-stage-01-v1`
- 日期：2026-08-14

## 已检查的实现

- `Welcome.ts` 定义 `RoundStatus`，并使用 `idle`、`running`、`paused`、`finished` 管理回合状态。
- 场景已绑定 `RoundLabel`、`StartButton`、`PauseButton`、`RestartButton` 与 `FinishedLabel`。
- 按钮矩阵由集中渲染方法设置；运行中禁用开始，暂停中禁用暂停，重开在四种状态均可用。
- 全局 `input` 在 `onEnable()` 注册、在 `onDisable()` 使用同一回调与 `this` 注销；Space 与 R 分别复用回合业务方法。
- 回合倒计时仅在 `running` 状态累计独立的 `roundElapsed`；重开与结束都会重置该累加器，旧重置不会影响回合节拍。
- 静态结构审计通过；项目结构清点解析到新增节点、组件绑定和生命周期方法。

## 运行与理解证据

- 学习者报告 Cocos 预览中：开始、暂停、重开、倒计时结束、组件禁用后重新启用时的键盘输入均符合预期。
- 学习者解释：暂停应保留冻结的回合进度；重开必须清零已累计的小数时间，避免新回合提前扣秒，同时将剩余时间恢复为 10 秒。

## 限制

- 本次未附截图或控制台日志；运行结果基于学习者报告，未被自动化浏览器独立复现。
