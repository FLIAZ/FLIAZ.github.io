---
title: "Markdown Showcase"
description: "A quick tour of every Markdown element this blog supports — headings, lists, code blocks and tables."
date: 2026-10-08
slug: "markdown-showcase"
image: "cover.jpg"
categories: ["Notes"]
tags: ["Markdown", "Writing"]
---

This post doubles as a cheat sheet: it shows how Markdown renders on this blog and lets me check the typography along the way.

## Text styles

A normal paragraph. **Bold**, *italic*, ~~strikethrough~~, `inline code`, and a [link](https://gohugo.io).

A blockquote:

> The point of writing things down is to save your future self from the same mistake.
>
> — Someone with a terrible memory

## Lists

Unordered:

- Study notes
- CTF writeups
- Tinkering logs
  - Nested works too

Ordered:

1. Reproduce the problem
2. Find the root cause
3. Write it down

## Code

Inline code, like `const answer = 42`.

Code blocks (they adapt to light/dark themes):

```typescript
interface Post {
  title: string;
  date: Date;
  tags: string[];
}

function isPublished(post: Post, now = new Date()): boolean {
  return post.date <= now;
}
```

```bash
# Handy commands
grep -r "TODO" ./src --include="*.ts"
find . -name "*.log" -mtime +7 -delete
```

## Tables

| Tool | Purpose | Level |
| ---- | ------- | ----- |
| Burp Suite | Web traffic inspection | Beginner |
| nmap | Port scanning | Basic |
| Ghidra | Reverse engineering | Just started |

## Divider

---

That's the full tour. I'll come back here whenever I forget a syntax detail.
