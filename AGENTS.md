# Cocos 学习工作区规则

## 工作区概览

- 此仓库是 Cocos Creator 学习工作区，包含独立项目 `Airplane`（Creator 3.3.2）、`basics-lab` 与 `demo`（均为 Creator 3.8.8）。请使用各项目 `package.json` 声明的版本打开；未经明确说明不要升级 Creator。
- 各项目没有声明 npm 的构建、测试或 lint 脚本；以 Cocos Creator 编辑器打开入口场景进行运行验证。修改前先阅读 `<项目目录>/study/project-map.md`；`demo` 的设置说明见 `demo/SETUP_拼图.md`。
- 不要编辑 Cocos 生成目录：`library/`、`temp/`、`local/`、`profiles/` 和 `node_modules/`；游戏代码与资源位于各项目 `assets/`。

## 目录职责

- `.agents/skills/`：学习技能定义、自动化脚本及参考资料；不属于 Cocos Creator 项目代码。
- `study/`：工作区级学习档案、项目注册表、路线图、进度和跨项目证据；不属于单个 Cocos Creator 项目。
- 根目录中除 `.agents/`、`study/`、隐藏的工具目录及版本控制目录外，包含 Cocos Creator 项目清单的一级目录均视为独立 Cocos Creator 项目。
- `<项目目录>/study/`：该项目专属的学习记录、练习、审计脚本和证据；不得用作其他项目的学习记录。

## Cocos 项目识别与边界

一个目录只有在包含 `package.json`，且其中声明 `creator.version` 时，才登记为 Cocos Creator 项目。

- 每个项目独立维护其场景、脚本、资源、`settings/` 和项目级学习记录。
- 修改某个项目时，不得无关修改其他项目、根目录 `study/` 或 `.agents/skills/`。
- 项目应使用其 `package.json` 中 `creator.version` 声明的 Cocos Creator 版本打开和维护；升级版本前应明确说明兼容性影响。
- 新增、移动、删除或重命名 Cocos Creator 项目后，必须同步更新根目录 `PROJECTS.md` 与 `study/demos.json`。

## 项目列表维护

- `PROJECTS.md` 是人工可读的 Cocos Creator 项目总览。
- `study/demos.json` 是结构化项目注册表。
- 两者中的项目目录、项目名称和 Creator 版本应保持一致。
- 新项目完成可打开的最小 Cocos Creator 工程后，才可登记到项目列表。
- 每个已登记项目至少记录：目录名、项目名称、Creator 版本、项目类型、学习重点、入口场景和当前状态。
- 项目列表只描述已存在的项目；不得把计划、临时目录或生成目录登记为项目。
