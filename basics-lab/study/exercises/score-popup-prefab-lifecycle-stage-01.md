# 第 10 关加速包：得分飘字的 Prefab、动画与生命周期

## 结果

这是约 3 倍知识量的加速包。把现有加减分改成有即时反馈的 UI：每次**实际**得分变化时，生成独立的飘字；它上移、淡出并自行销毁。

## 已验证前置

- Inspector 绑定 Label、Button；Button 回调与得分下限；
- Node 的 `active`、集中状态刷新；
- 回调生命周期与 `onDestroy()` 清理；
- 回合状态机和 `update(deltaTime)` 的适用边界。

## 新知识

| 概念 | 本包边界 |
| --- | --- |
| Prefab | assets 中可反复实例化的节点模板；不是场景里唯一的那个节点。 |
| `instantiate` 与挂载 | 每次调用创建独立 Node，必须设为 `PopupLayer` 的子节点才会显示在该 UI 容器。 |
| UI 本地坐标 | 飘字位置相对 `PopupLayer`，不依赖 Canvas 的世界坐标。 |
| Tween | 用声明式序列完成上移/淡出；不在 `update` 手写该动画。 |
| 临时节点生命周期 | Tween 完成后销毁对应实例；多次点击的实例互不共享或互相销毁。 |

## 微阶段

1. **Prefab 预测**：从同一 Prefab 连续创建两个实例，修改第一个实例的 Label，第二个是否改变？说明原因。
2. **父节点检查**：实例创建后不设父节点时，为什么可能看不到它？写出本关实例应挂到哪个节点。
3. **生命周期预测**：快速点击三次加分，三个 Tween 完成时各应销毁什么？为什么不能复用一个“当前飘字”字段？

## 集成实现（你来写）

### 编辑器

1. 在 `Canvas` 下创建 `PopupLayer`，作为所有飘字的父节点。
2. 创建一个只有 Label 的 `ScorePopup` 节点，设置适合的初始文字和透明度；将它保存为 `assets/prefabs/ScorePopup.prefab`。
3. 不要把这个模板节点保留为 Canvas 下永久可见的飘字；在 `Welcome` Inspector 中绑定 Prefab 和 `PopupLayer`。

### `Welcome.ts`

1. 用 `@property(Prefab)` 与 `@property(Node)` 接收这两个绑定；处理未绑定时不应使现有得分功能报错。
2. 只在分数真实改变时生成飘字：加分显示 `+1`；分数已经为 0 时再减分不得生成 `-1`。
3. 每次飘字都 `instantiate` 一个新实例、设为 `PopupLayer` 子节点、设置其 Label 与本地初始位置。
4. 使用 `tween` 让该实例在约 0.5–1 秒内向上移动并淡出；Tween 完成后销毁**该实例**。
5. 连点加分时，每个飘字均独立上移、淡出和销毁；已有回合、键盘、重置、帮助功能保持可用。

## 验收与证据

运行结构检查：

```bash
python3 study/auditors/score_popup_prefab_lifecycle_stage_01.py --script assets/scripts/Welcome.ts
```

再在 Cocos 预览中验证：加分飘 `+1`、有效减分飘 `-1`、0 分减分无飘字、快速连点、动画结束后层级没有残留实例，以及原有控件仍可用。

提交 `Welcome.ts`、Prefab/Inspector 绑定截图、三道微阶段回答和预览记录或完整报错。

## 不包含

- 资源动态加载、对象池、粒子系统；
- 世界坐标跟随、3D 特效；
- 将本关飘字改造成通用 UI 框架。
