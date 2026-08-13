# Better Mermaid

> 基于 [Joven Lynn](https://github.com/jovenn) 的 obsidian-better-mermaid 分支维护，在保留原有全部功能的基础上持续改进。

增强 Obsidian 中的 Mermaid 图表体验 —— 点击放大、拖拽平移、缩放控制，并支持**原始大小/适配弹窗**一键切换，解决大图在弹窗中显示过小的问题。

## 功能特性

### 🔍 弹窗查看

阅读模式下点击任意 Mermaid 图表，在独立弹窗中查看大图：

- **缩放**：Ctrl + 滚轮，或从下拉菜单选择固定档位
- **平移**：拖拽鼠标，或 Shift + 滚轮（横向）
- **导出**：一键下载 PNG（2x 分辨率，不受弹窗缩放影响）

### 📐 双尺寸模式

针对不同场景提供两种显示模式：

| 模式 | 行为 | 适用场景 |
|------|------|----------|
| **适配弹窗**（默认） | CSS 限制最大尺寸，图始终完整落入视口 | 快速预览整体结构 |
| **原始大小** | 按 SVG 固有像素显示，取消尺寸上限 | 查看超大图表细节 |

单击底部按钮即可切换，切换时自动重置缩放为 100% 并居中。

### 🎨 自定义样式注入

单独配置一个snippets css文件搭配使用效果更加，相关代码如下

```css
/* =========================================
   Mermaid 图表 — 自适应宽度（不缩放、不拖拽）
   Obsidian 用 CSS Snippet

   规则：
   - 大图：等比缩小到文档宽度，不横向滚动
   - 小图：保持固有尺寸，不被拉伸到文档宽度
   - 取消手动 resize
========================================= */

:root {
  --mermaid-border-color: rgba(128, 128, 128, 0.2);
  --mermaid-accent-color: var(--interactive-accent, #89C4F4);
}

/* =====================
   容器
   - width:fit-content → 按内容定宽，小图不被块级元素撑满
   - max-width:100%    → 大图不超过文档宽度
   - 不设 resize / 不设 max-height，交给 SVG 等比缩放
===================== */
div.mermaid {
  position: relative;
  margin-left: 0;
  margin-bottom: 8px;
  text-align: left;
  box-sizing: border-box;

  display: block;
  width: fit-content;
  height: auto;
  max-width: 100%;

  resize: none;
  overflow: visible;

  /* 浅浅虚线框 */
  border: 1px dashed var(--mermaid-border-color);
  border-radius: 6px;
  padding: 8px;

  transition: border-color 0.25s ease, box-shadow 0.25s ease;
}

div.mermaid:hover {
  border-color: var(--mermaid-accent-color);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--mermaid-accent-color) 12%, transparent);
}

/* =====================
   SVG
   - width:auto      覆盖 Mermaid 的 width:100% / useMaxWidth，按 viewBox 固有尺寸显示
   - max-width:100%  大图等比缩到文档宽度
   - height:auto     宽度被限制时高度跟着等比收缩
   - 不写 width:100%，避免小图被拉伸
===================== */
div.mermaid svg {
  display: block;
  width: auto !important;
  height: auto !important;
  max-width: 100% !important;
  max-height: none !important;
}

/* =====================
   甘特图例外 —— 必须单独放行

   原因：Mermaid 建 SVG 时统一写死 width="100%" 且不写 height；
   之后大部分渲染器（flowchart / sequence / class …）会调 configureSvgSize
   补上 width、height 属性和 style="max-width:…px"，SVG 因此有固有像素尺寸。
   但 gantt 渲染器只做了 setAttribute("viewBox", …)，从头到尾没补尺寸，
   最终 DOM 里是 <svg width="100%" viewBox="0 0 1200 H">，只有比例、没有固有宽高。

   于是上面那条 width:auto + height:auto 把 width="100%" 也一并干掉，
   容器又是 width:fit-content（收缩包裹），两边互相等对方定宽，
   Chromium 只能退回替换元素的默认尺寸 300×150，
   一张按 1200px 画布算好的甘特图被压进 300px —— 就是"渲染不出来"的样子。

   所以甘特图要走 width:100%，让它按 viewBox 比例铺满文档宽度。
   若以后发现 journey、timeline 等也有同样症状，把 roledescription 加进选择器即可。
===================== */
div.mermaid:has(svg[aria-roledescription="gantt"]) {
  width: 100%;
}

div.mermaid svg[aria-roledescription="gantt"] {
  width: 100% !important;
  height: auto !important;
  max-width: 100% !important;
}

/* =====================
   打印 / PDF 导出
===================== */
@media print {
  div.mermaid {
    max-width: 100% !important;
    height: auto !important;
    border: none !important;
    box-shadow: none !important;
    padding: 0 !important;
  }

  div.mermaid svg {
    width: auto !important;
    height: auto !important;
    max-width: 100% !important;
    page-break-inside: avoid;
  }

  /* 打印时同样放行甘特图 */
  div.mermaid svg[aria-roledescription="gantt"] {
    width: 100% !important;
  }
}

/* =====================
   尊重"减少动画"偏好
===================== */
@media (prefers-reduced-motion: reduce) {
  div.mermaid {
    transition: none !important;
  }
}

```



## 安装

### 手动安装（推荐）

1. 确保 Obsidian 已开启「第三方插件」→「安全模式」已关闭
2. 将 `better-mermaid/` 文件夹复制到 `.obsidian/plugins/` 下
3. 重启 Obsidian 或在设置中重载插件
4. 在「社区插件」列表中启用 **Better Mermaid**


## 使用指南

1. 切换到**阅读模式**
2. 点击图表区域 → 弹窗打开
3. 在弹窗中自由查看、缩放、平移

### 控件说明


| 控件 | 说明 |
|------|------|
| **缩放选择** | 下拉菜单：20% / 50% / 75% / 100%（自定义缩放时自动添加精确值） |
| **原始大小 / 适配弹窗** | 切换按钮，两种尺寸模式间切换 |
| **下载 PNG** | 将当前图导出为 2x 分辨率的 PNG 图片 |

### 设置项

| 设置 | 范围 | 默认 | 说明 |
|------|------|------|------|
| 弹窗宽度 | 30% – 100% | 90% | 弹窗占视口宽度的百分比 |
| 弹窗高度 | 30% – 100% | 90% | 弹窗占视口高度的百分比 |
| 默认缩放 | 20% – 200% | 100% | 弹窗打开时的初始缩放倍率 |
| 自定义 CSS | 任意 CSS | — | 注入到 Obsidian 的样式代码 |

## 文件结构

```

better-mermaid/
├── manifest.json     # 插件元信息（id、版本、最低 Obsidian 版本）
├── main.js           # 打包后的主逻辑（插件入口、弹窗、设置面板）
├── styles.css        # 弹窗及控件样式
├── data.json         # 用户配置（自动生成）
└── README.md         # 本文件

```

所有核心逻辑都在 `main.js` 中（esbuild 单文件打包），直接修改后重启插件即可生效。

## 本分支与原版的差异

### 已加入的特性
- [x] **双尺寸模式切换** — 底部新增「原始大小 / 适配弹窗」按钮，解决大图 100% 缩放仍被压小的问题
- [x] 支持 viewBox、width/height 属性、getBBox() 三种方式获取 SVG 固有尺寸（容错降级）
- [x] 切换尺寸时自动重置缩放为 100% 并居中视角
- [x] 中英文完整文案覆盖


## 兼容性

- 最低 Obsidian 版本：v1.0.0
- 桌面端 + 移动端均支持
- 与所有主流 Obsidian 主题兼容
- 与 Mermaid 原生语法完全兼容（graph、flowchart、sequenceDiagram、classDiagram、stateDiagram、erDiagram、gantt、pie、timeline 等）

## 常见问题

**Q: 为什么大图在 100% 缩放时仍然很小？**  
A: 默认「适配弹窗」模式会限制 SVG 尺寸以适应视口。点击「原始大小」按钮即可按真实像素显示。

**Q: 切换模式后缩放会重置吗？**  
A: 会。切换时自动将缩放重置为 100% 并居中，避免"飞出视野"。

**Q: 导出 PNG 是原始分辨率吗？**  
A: 是。导出使用 2x Canvas，不受弹窗内缩放的任何影响，始终以原始 SVG 尺寸的 2 倍导出。

**Q: 这个分支和原版什么关系？**  
A: 基于 Joven Lynn 的 v1.0.5 版本 fork，在原版全部功能基础上独立维护迭代。manifest.json 仍保留原作者信息以示出处。

**Q: 插件更新会覆盖我的修改吗？**  
A: 直接改 `main.js` 的本地补丁会被覆盖。建议从本分支获取更新。

## 许可证

MIT License

```
Copyright (c) 2024 Joven Lynn（原作者）
Copyright (c) 2025 本分支维护者
```

保留原作者的版权声明，本分支的修改部分遵循相同许可证。

---

**原作者**: Joven Lynn · [GitHub](https://github.com/jovenn)  
**本分支维护**  
**原始仓库**: [obsidian-better-mermaid](https://github.com/jovenn/obsidian-better-mermaid)
