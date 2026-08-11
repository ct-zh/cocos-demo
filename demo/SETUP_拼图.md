# 3×3 拼图 — 编辑器挂接步骤（Creator 3.8.8）

代码已就绪：`assets/scripts/PuzzleGame.ts`  
示例图：`assets/textures/puzzle_sample.png`（九色块，可先用来试玩）

按下面做完，点预览即可玩。

---

## 1. 打开项目

1. 打开 **Cocos Dashboard**
2. 打开项目目录：`.../cocos-demo/demo`
3. 等资源导入完成（左下角无转圈、控制台无红字）

首次打开会自动为脚本/图片生成 `.meta`，属正常现象。

---

## 2. 新建场景

1. 在资源管理器中进入 `assets/scenes`（没有就右键 `assets` → 新建 → 文件夹 `scenes`）
2. 右键 `scenes` → **新建 → Scene**
3. 命名为 `Game`
4. 双击打开 `Game.scene`

---

## 3. 准备 Canvas（2D）

若层级里**已有** `Canvas` 和 `Camera`，跳过本步。

若是空场景：

1. 层级管理器空白处右键 → **创建 → UI 组件 → Canvas**  
   （会自动带 Camera / Canvas）
2. 选中 `Canvas`，在属性检查器确认有 `Canvas`、`UITransform` 组件

建议设计分辨率（可选）：

- 菜单 **项目 → 项目设置 → 项目数据**
- 设计分辨率：`720 × 1280`（竖屏）或 `1280 × 720`（横屏）
- 适配模式可先用默认

---

## 4. 挂上拼图脚本

1. 选中 **Canvas**（或在 Canvas 下新建空节点 `PuzzleRoot`）
2. 属性检查器底部 **添加组件**
3. 搜索 **`PuzzleGame`** → 添加

---

## 5. 绑定示例图

### 方式 A：什么都不拖（推荐先这样）

示例图已放在 `assets/resources/puzzle_sample.png`。  
**Source Image 留空**，直接预览，脚本会自动加载。

### 方式 B：手动拖 SpriteFrame（很多人卡在这里）

在 Cocos 里，**不能拖最外层的 png 文件**，要拖它的**子资源 spriteFrame**。

```text
资源管理器
└── textures（或 resources）
    └── puzzle_sample.png     ← 这是图片本体，不要拖这个
        └── spriteFrame       ← 点左侧小三角 ▸ 展开后才看得到，拖这个
```

操作步骤：

1. 在资源管理器找到 `puzzle_sample.png`
2. 点击文件名**左侧的小三角 ▸** 展开
3. 看到子项 **spriteFrame**（图标像小图框）
4. 选中挂了 `PuzzleGame` 的节点
5. 把 **spriteFrame** 拖到属性 **Source Image**

或用圆圈选择器：

1. 点 Source Image 右侧的 **○** 圆圈
2. 弹出资源面板后搜索 `puzzle_sample`
3. 选中带 **spriteFrame** 字样的那一项（不要选 texture）

> 若展开后没有 spriteFrame：选中 png → 右侧属性检查器 → **Type** 选 `sprite-frame` → 回车确认，等重新导入。

### 用自己的 AI 图

1. 正方形图拖进 `assets/resources/`（想自动加载）或任意 `assets/` 目录（手动拖 spriteFrame）
2. 展开后拖 **spriteFrame** 到 Source Image
3. 预览即可（脚本会 3×3 运行时裁切）

---

## 6. 设为启动场景并预览

1. 资源管理器中右键 `Game.scene` → **设为启动场景**  
   （或在 项目设置 → 项目数据 → 默认场景 里指定）
2. `Cmd + S` 保存场景
3. 点顶部 **预览（浏览器）**

---

## 7. 怎么玩

| 操作 | 效果 |
|------|------|
| 点第一块 | 高亮选中 |
| 再点另一块 | 两块交换，步数 +1 |
| 再点同一块 | 取消选中 |
| 全部归位 | 弹出「完成！」 |
| 重新开始 / 再来一局 | 重新打乱 |

---

## 8. 可调参数（属性检查器）

| 属性 | 含义 | 默认 |
|------|------|------|
| Source Image | 整张原图 | 可空 |
| Grid Size | 边长，3=3×3 | 3 |
| Tile Size | 单块像素 | 180 |
| Gap | 间距 | 8 |
| Shuffle On Start | 开局打乱 | 勾选 |

改成 4×4：把 **Grid Size** 改为 `4`，**Tile Size** 可改为 `130` 左右。

---

## 常见问题

**预览全黑 / 什么都没有**

- 确认节点在 **Canvas** 下，且场景已保存  
- 确认挂了 `PuzzleGame`  
- 看控制台是否有脚本编译错误  

**有图但切块不对 / 上下颠倒**

- 尽量用整图导入，不要先放进复杂图集  
- 图片在导入设置里用默认 Sprite 即可  

**点了没反应**

- 确认预览窗口焦点在游戏画面上  
- Canvas 的 Render Mode 保持默认  

**脚本列表里找不到 PuzzleGame**

- 等编译完成；看控制台 TS 报错  
- 确认文件在 `assets/scripts/PuzzleGame.ts`  

---

## 下一步（可选）

- 换 AI 生成图做多关卡  
- 加计时、音效  
- **项目 → 构建发布 → Web Mobile** 后部署到你的服务器分享试玩  

需要加「计时 / 多关卡 / 滑动玩法」时直接说即可。
