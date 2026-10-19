# F1iAz · 数字花园

个人博客，基于 [Hugo](https://gohugo.io/) 和 [Hugo Theme Stack](https://github.com/CaiJimmy/hugo-theme-stack)。

- 中文（默认）：`/`
- English：`/en/`
- 线上地址：<https://fliaz.github.io/>

## 本地开发

需要 **Hugo extended**（>= 0.146）：

```bash
hugo server -D
```

打开 <http://localhost:1313/>。构建静态文件：

```bash
hugo --gc --minify
```

产物在 `public/`。

## 目录结构

```text
config/_default/
  hugo.toml          # 站点基础配置、Markdown 渲染、永久链接
  languages.toml     # 中英双语、导航菜单、社交链接
  params.toml        # 主题参数（侧栏、组件、配色、图片处理…）
content/
  post/<slug>/       # 文章（page bundle，中英同目录）
    index.zh.md
    index.en.md
    cover.jpg        # 文章封面（同时用于 OG 图）
  page/              # 关于、归档、搜索
assets/
  img/               # 头像、favicon
  scss/custom.scss   # 配色与样式微调
static/fonts/        # 自托管 Lato 字体（不依赖 Google Fonts）
themes/
  hugo-theme-stack/  # 主题源码（vendored，CI 无需额外拉取）
layouts/
  _partials/head/custom-font.html  # 本地字体预加载（覆盖主题默认的 Google Fonts）
```

## 写新文章

```bash
hugo new post/my-post/index.zh.md
hugo new post/my-post/index.en.md
```

文章头部字段示例：

```yaml
---
title: "标题"
description: "摘要"
date: 2026-10-19
slug: "my-post"
image: "cover.jpg"
categories: ["笔记"]
tags: ["Hugo"]
---
```

封面图放在同一目录下，命名为 `cover.jpg` 即可。

## 部署

推送到 `main` 分支后，GitHub Actions 会自动构建并发布到 GitHub Pages：

- 工作流：`.github/workflows/deploy.yml`
- Pages 构建方式需为 **GitHub Actions**（当前已配置）

## 说明

- 字体：Lato（SIL Open Font License），自托管于 `static/fonts/`。
- 主题：[Hugo Theme Stack](https://github.com/CaiJimmy/hugo-theme-stack)，GPL-3.0。
- 文章内容：© F1iAz。
