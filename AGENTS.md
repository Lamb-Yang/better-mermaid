# AGENTS.md

面向 AI 编码代理的仓库指南。在本仓库做任何修改前，请完整阅读本文件。

## 项目概述

Better Mermaid 是一个 Obsidian 插件（fork 自 joven-lynn/obsidian-better-mermaid）：
在阅读模式点击 Mermaid 图表，弹出可缩放、拖拽、捏合的大图预览，支持 PNG 导出与自定义 CSS 注入。
插件通过 GitHub Releases / BRAT 分发（fork 本身未提交 Obsidian 官方市场）。

- 插件 ID：`better-mermaid`（见 `manifest.json`），`minAppVersion: 1.0.0`
- 运行环境：Obsidian 桌面端（Electron/Chromium）+ 移动端（iOS WKWebView / Android WebView），`isDesktopOnly: false`，改动必须兼顾移动端
- 远程：`origin` = Lamb-Yang/better-mermaid（fork）；`upstream` 指向原作者仓库，**永远不要向上游推送**

## ⚠️ 最重要的约定：仓库只有构建产物，没有源码

- `main.js` 是 esbuild 打包产物；TypeScript 源码（src/*.ts）与全部构建配置
  （package.json、tsconfig.json、esbuild.config.mjs）在提交 `d7d9810` 中被整体删除。
- 因此**不要**尝试 `npm install`、`npm run dev` 或任何"重新构建"——没有这套东西。
- 所有逻辑修改直接编辑 `main.js`（它是可读的打包后 JS），并保持打包产物的代码风格。
- `styles.css` 和 `manifest.json` 是源文件，可直接编辑。

## main.js 结构（按内部分段注释定位）

| 分段注释 | 内容 |
| --- | --- |
| `// src/settings.ts` | `DEFAULT_SETTINGS`、`STRINGS` 双语字典（en/zh）、`BetterMermaidSettingTab` |
| `// src/modal.ts` | `MermaidImageModal`：缩放弹窗（Pointer Events 拖拽/捏合、滚轮缩放、尺寸模式、PNG 导出） |
| `// src/main.ts` | `BetterMermaidPlugin`：设置加载、CSS 注入、全局点击处理、卸载清理 |

以下机制都曾出过 bug，改动前先理解其存在的原因：

1. **缩放锚点**：弹窗内 SVG 由 flex 居中，且 `transform-origin: 0 0` 指 SVG 自身左上角。
   所有缩放公式（滚轮 `onWheel`、下拉 `setZoom`、捏合 `startPinch`/`onPointerMove`）
   必须使用 `getSvgOrigin()` 返回的布局偏移修正坐标，否则每次缩放图表都会跳动。
2. **点击处理**：`BetterMermaidPlugin` 在 workspace 容器上注册捕获阶段 click 监听，匹配 `div.mermaid`。
   必须保留三道守卫：
   - 带修饰键（ctrl/cmd/shift/alt）直接跳过；
   - 在 `.cm-editor` 内、且不在 `.markdown-embed` 内直接跳过——否则 Live Preview 里点击渲染图
     会"打开弹窗 + 切入源码编辑"同时发生（嵌入渲染的内容仍应弹窗）；
   - 已有弹窗打开（DOM 中存在 `.better-mermaid-modal-size`）时跳过。
3. **CSS 注入**：优先 `CSSStyleSheet` + `document.adoptedStyleSheets`，必须保留 `<style>`
   元素回退（iOS Safari < 16.4 没有该 API），且不允许空 catch——至少 `console.warn`。
4. **移动端交互**：弹窗只用 Pointer Events（配合 styles.css 的 `touch-action: none`），
   不要退回 mouse/wheel-only；滚轮缩放系数用 `Math.exp`（放大/缩小必须互为倒数，
   线性系数 `1 - deltaY*k` 会导致来回缩放回不到原倍率），并按 `deltaMode` 归一化行滚动。
5. **PNG 导出**：导出克隆必须 `removeAttribute("style")`（清除 mermaid 写入的内联
   `max-width`，否则导出图会被压在画布一角）；viewBox 分量校验 > 0；画布边长上限 8192px；
   失败时用 `Notice` 提示用户，不能只写 console。

## 代码风格与兼容性约束

- main.js 目标语法约 ES2017：不要引入 `?.`、`??`、`static` 类字段等新语法
  （现有代码中这些都被 esbuild 降级过）；保持 `var X = class extends ...` 的打包风格。
- 文案改动：`STRINGS` 里 en 和 zh 两个字典都要加，运行时用 `t(key)` 取值。
- 默认设置只改 `DEFAULT_SETTINGS`（main.js 内），不要依赖根目录 `data.json`。
- 不新增第三方依赖——没有打包管线来装载它们。Obsidian API 参考官方文档
  （docs.obsidian.md / obsidian-api 仓库的 obsidian.d.ts），本地没有类型文件。

## 验证与测试

仓库没有测试设施，改动后按以下流程验证：

1. 语法门禁：`node --check main.js`。
2. 无头浏览器冒烟测试（本仓库的标准做法，在 /tmp 下临时搭建即可）：
   - 写一个 test.html：
     ① polyfill Obsidian 的 DOM 扩展（`addClass`/`removeClass`/`empty`/`createDiv`/`createEl`/`setText`），
        stub `Modal`/`Plugin`/`PluginSettingTab`/`Setting`/`Notice`，并提供
        `require("obsidian")` 垫片与 `var module = { exports: {} }`；
     ② 内联 styles.css + main.js（构造大尺寸弹窗布局，让 SVG 的居中偏移显著）；
     ③ 用合成事件（MouseEvent/PointerEvent/WheelEvent）驱动插件并断言结果。
   - 必须覆盖：点击开弹窗、缩放锚点不变性、拖拽平移、双指捏合、三类点击守卫、
     svgToPng 返回 data URL、CSS 回退、onunload 清理。
   - 测量倍率要读弹窗实例的 `scale` 属性，**不要**解析 `style.transform` 字符串——
     Chromium 的 CSSOM 会把其中的数值重新序列化成约 4 位小数，足以让断言误报。
   - 运行：`"<Chrome/Edge 路径>" --headless=new --disable-gpu --virtual-time-budget=10000 --dump-dom file:///tmp/<目录>/test.html`，从输出 grep PASS/FAIL。
3. 手工验收：把 main.js / manifest.json / styles.css 拷进 Vault 的
   `.obsidian/plugins/better-mermaid/` 并重载插件，重点试 Live Preview 点击与触屏捏合。

## 发布流程

1. 把 `manifest.json` 的 `version` 升一位，提交到 main。
2. `git tag <版本号>`（如 `1.0.7`，允许 `v` 前缀）并 `git push origin <tag>`。
3. `.github/workflows/release.yml` 自动完成：校验标签 == manifest 版本 → 检查必需文件 →
   生成 versions.json → 创建 GitHub Release（附 main.js / manifest.json / styles.css / versions.json）。

标签与 manifest 版本不一致时流水线会故意失败，这是保护而非故障。
注意上游已发布到 1.0.7；若在意"从上游迁移来的用户看到版本回退"，可直接跳过上游用过的版本号。

## Git 约定

- 分支命名：`fix/...`、`feat/...`；提交信息用中文 + conventional 前缀（`fix:` / `feat:` / `ci:` / `chore:`）。
- 默认分支 main；小改动可直接提交 main，功能改动走功能分支合并。
- 提交前 `git status` 检查，不带临时文件（测试脚本放 /tmp，不入库）。
- 打新标签前先 `git tag -l`：本地可能残留上游的旧 tags（指向不在 main 历史里的提交）。

## 已知但接受的问题（不要当 bug 顺手修，除非用户要求）

- 仓库缺 src/ 源码与构建配置（历史原因，见上）。
- 根目录 `data.json`（zh + 75% 弹窗尺寸）是有意提交的运行时数据，与代码默认值
  `DEFAULT_SETTINGS`（en + 90%）不一致：标准安装（Release 资产）走代码默认值。
- ZOOM_OPTIONS 下拉最高只有 100%，超过只能靠滚轮或"默认缩放级别"设置——现状如此。
