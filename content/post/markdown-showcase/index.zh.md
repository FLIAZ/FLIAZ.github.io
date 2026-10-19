---
title: "Markdown 写作速查"
description: "这个博客支持的 Markdown 写法一览：从标题、列表到代码块和表格。"
date: 2026-10-10
slug: "markdown-showcase"
image: "cover.jpg"
categories: ["笔记"]
tags: ["Markdown", "写作"]
---

这篇文章当作写作时的速查表：展示这个博客里 Markdown 的各种常见写法，顺便验证一下排版效果。

## 文本样式

普通段落。**加粗**、*斜体*、~~删除线~~、`行内代码`，还有[链接](https://gohugo.io/)。

一段引用：

> 记录的意义，大概就是让未来的自己少踩一次同样的坑。
>
> —— 某位记性不好的人

## 列表

无序列表：

- 学习笔记
- CTF 题解
- 折腾日志
  - 嵌套一项也可以

有序列表：

1. 先复现问题
2. 再定位原因
3. 最后写下来

## 代码

行内代码比如 `const answer = 42`。

代码块（会自动适配亮暗主题）：

```python
def is_prime(n: int) -> bool:
    """判断素数——面试经典，但这个版本只用来演示。"""
    if n < 2:
        return False
    for i in range(2, int(n**0.5) + 1):
        if n % i == 0:
            return False
    return True
```

```bash
# 一些常用命令
grep -r "TODO" ./src --include="*.ts"
find . -name "*.log" -mtime +7 -delete
```

## 表格

| 工具 | 用途 | 熟练度 |
| ---- | ---- | ------ |
| Burp Suite | Web 抓包改包 | 入门 |
| nmap | 端口扫描 | 会基本扫描 |
| Ghidra | 逆向分析 | 刚上手 |

## 分隔线

---

以上就是速查的全部内容。写新文章时我会回来对照着用。
