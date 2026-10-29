# 开拍小笺 · AI 与内容创作产品作业

帮助独立咖啡店主，把已有素材和确认的商品事实整理成可编辑、可局部改写的 15 秒拍摄脚本。

## 提交入口

- [在线 Demo（无需登录）](https://largepineapple.github.io/shadow6/demo/)
- [5 页产品说明 PDF](output/product-brief.pdf)
- [备用操作视频（含中文讲解字幕，无配音）](output/demo-walkthrough.webm)
- [AI 使用记录](docs/ai-usage.md)
- [可编辑产品说明](docs/product-brief.md) / [截图及操作说明](docs/walkthrough.md)

网页提供交互流程；视频为真实浏览器操作录制。若在线部署尚未就绪，下载本仓库后直接打开 demo/index.html 即可体验，素材和功能不依赖外部网络。

## 核心演示

首页使用示例 → 整理三张照片和商品信息 → 核对事实并确认 → 生成三段脚本 → 单段改写/撤回/直接编辑 → 分镜预览 → 保存本机草稿或导出文本 → 继续修改或制作下一条。

确认页展开演示设置，可触发一次可恢复失败。清空价格再生成，不会补造价格。修改开头不会改变其他两段。草稿在同一浏览器可刷新恢复文字；自己的照片只在当前页面会话中保留，示例插画可恢复。

## 本地启动与检查

零安装：打开 demo/index.html。复制到剪贴板能力受浏览器上下文限制，失败时可用文本导出。

本地 HTTP：

```sh
python -m http.server 3100 --bind 127.0.0.1
# 打开 http://localhost:3100/demo/
```

可选开发验证（Node.js 22）：

```sh
npm ci
npx playwright install --with-deps chromium
npm run check
npm test
# 录制带讲解字幕的实际操作视频，约 3 分钟
npm run record
```

已有 Chromium 时可设置 CHROME_PATH。浏览器脚本会自行启动临时 HTTP 服务，结束后关闭；不会覆盖其他运行项目。PDF 生成脚本 scripts/make_pdf.py 使用 Python ReportLab、pypdf、pypdfium2；中文字体通过 CJK_FONT 环境变量指定，Windows 默认 simhei.ttf。

## 实现和边界

独立静态 HTML/CSS/JavaScript；无后台、无登录、无付费 API。AI 采用本地规则模拟，不做图像识别。分镜预览没有配音或真实视频合成；15 秒是建议节奏，不是经过 TTS 校准的口播时长。没有用户研究、商业指标或真实 AI 质量验证。

用户素材不上传。文案草稿仅保存在当前浏览器 localStorage，可通过清除站点数据移除。价格、特点由用户提供并确认。原创 SVG 是示例，不是商品实拍。没有将候选人简历或联系方式公开入库。

## 验证及来源

浏览器覆盖空输入、价格格式、失败保留与重试、局部改写与撤回、本地图片读取、草稿恢复、文本导出、不编造缺失价格、小屏、减少动态效果、取消生成和独立浏览器隔离；实际结果见 output/verification.json，截图见 output/screenshots。

所有界面和 SVG 为新建；Playwright 为开发验证依赖。AI 的具体贡献和人的输入见 AI 使用记录，不将 AI 起草的研究假设称为已经本人验证的事实。

GitHub Actions 在 push/PR 执行浏览器回归。main 分支通过后部署 GitHub Pages；不依赖上一份全栈作业。
