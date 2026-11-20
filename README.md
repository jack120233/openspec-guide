# OpenSpec 中文交互学习手册

核对版本：OpenSpec **v2.1.0**  
核对日期：**2026-11-17**

## 打开

- `OpenSpec-Learning-Guide.html` 是完整的离线单文件版，可直接在浏览器打开。
- `index.html` 是便于维护的拆分版，需要保留同目录的 JS、CSS 与 assets。
- 不依赖构建服务、网络字体或 CDN。只有点击外部资料链接时需要联网。
- 此项目没有安装或初始化 OpenSpec，也不会执行教程里的命令。

## 内容

七个视图：学习路线、功能全景、工作流实验室、命令速查、规范与验收、团队与进阶、资料与版本。

- 6 个学习阶段、12 个 Skills、16 项外围能力。
- 54 条命令/配置入口，区分终端与 AI 对话，可切换 Codex / Claude Code / Cursor。
- 固定案例的逐阶段文件预览、规范格式练习、5 题测验。
- 本机学习进度、关注与笔记，可导出 Markdown。
- 22 项一手来源；官方文档提供 v2.1.0 固定标签入口。

实验室为预设教学演示，不连接 AI。格式练习不是官方解析器，不可替代 `openspec validate`。社区项目依据作者文档整理，未安装或实测第三方服务。

## 维护

内容在 `data.js`，页面与交互在 `app.js`，视觉样式在 `styles.css`。

修改后生成离线单文件版：

```powershell
node build-standalone.mjs
```

浏览器会尽力将进度保存在 localStorage；不同浏览器或 `file:` 路径可能使用不同存储空间。禁用存储时仍可阅读、练习与导出。请不要将敏感信息写入学习笔记。

## 来源与许可

本教程是非官方中文整理，示例和学习建议由教程作者编排。

官方仪表盘图来自 OpenSpec v2.1.0 的 `assets/openspec_dashboard.png`，MIT 许可见 `assets/OpenSpec-LICENSE.txt`。Lucide v0.468.0，ISC 许可；本地发行文件保留了声明。`assets/favicon.svg` 为本教程图标，不是 OpenSpec 官方商标。
