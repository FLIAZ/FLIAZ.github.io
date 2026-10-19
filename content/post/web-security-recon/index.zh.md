---
title: "Web 安全入门笔记：信息收集先走一遍"
description: "打 CTF 时整理的一遍信息收集流程——从目录扫描到指纹识别，附常用命令。"
date: 2026-10-06
slug: "web-security-recon"
image: "cover.jpg"
categories: ["安全"]
tags: ["CTF", "Web安全"]
---

最近在补 Web 安全的基础，把练习时用到的信息收集流程整理了一遍。都是很常规的操作，但每次按顺序走一遍，心里会踏实很多。

> **提醒**：以下内容仅用于授权环境（比如 CTF 比赛、自己的靶机）。未授权的扫描和测试都可能违法。

## 为什么要先做信息收集

刚入门时最容易犯的错：拿到 URL 就直接试 payload。实际上先把"这是个什么站"搞清楚，后面会省很多力气：

- 用的什么语言、什么框架？
- 有哪些路径是暴露的？
- 有没有明显的入口点，比如登录框、上传点？

## 第一步：看首页和响应头

打开浏览器开发者工具，或者直接：

```bash
curl -I https://target.example.com
```

重点看：

- `Server` 头——nginx？Apache？还是没去掉的中间件信息；
- `Set-Cookie`——经常能透露框架，比如 `PHPSESSID`、`JSESSIONID`。

## 第二步：目录扫描

用常见的字典跑一遍：

```bash
ffuf -u https://target.example.com/FUZZ \
     -w /usr/share/wordlists/dirb/common.txt \
     -mc 200,301,302,403
```

观察点：

1. `robots.txt` 和 `sitemap.xml`——有时候直接把敏感路径写脸上了；
2. `.git/`、`.env`、备份文件——存在就是大礼包；
3. 状态码不是 404 的都值得点进去看看。

## 第三步：指纹识别

```bash
whatweb https://target.example.com
```

或者手动对比：favicon 的 hash、报错页面的样式、静态资源的路径特征，基本就能确定框架和版本。

## 小结

流程其实很朴素：

> 看头 → 扫目录 → 认指纹 → 找入口

每次按这个顺序走一遍，再决定从哪里下手。目前还在练习阶段，有新的心得再补充。

*（本文是学习笔记，水平有限，欢迎指正。）*
