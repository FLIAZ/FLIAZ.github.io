---
title: "基于 Hexo 部署本地网页到云端"
description: "用 SSH 公钥和 Git 裸仓库，把 Hexo 生成的静态页面自动部署到云服务器，并支持多服务器发布。"
date: 2025-11-30T13:36:20+08:00
slug: "hexo-web"
image: "cover.jpg"
categories: ["教程"]
tags: ["Hexo", "建站", "Git"]
---

## 0. 本地与服务器之间的SSH公钥验证（免密登录）

这是 Hexo → Git → 服务器 自动部署前必须做的准备步骤

SSH 公钥用于在 **本地 Windows/Linux/macOS** 与 **云服务器** 之间建立安全、免密码的访问，这样才能正常通过命令：

```
git push origin master
```

将 Hexo 网站部署到服务器

### 0.1 在本地生成 SSH 密钥

在本地电脑上打开终端（git bash / wsl / cmd 都可以）输入以下内容

```
ssh-keygen -t ed25519 -C "your_email@example.com"
```

一直回车即可

生成的密钥位置通常为

```
~/.ssh/id_ed25519
~/.ssh/id_ed25519.pub
```

### 0.2 查看本地公钥内容

```
cat ~/.ssh/id_ed25519.pub
```

会看到类似

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIEXAMPLEKEYxxxx your_email@example.com
```

复制整行内容

### 0.3 将公钥添加到云服务器

登录云服务器

```
ssh root@服务器IP
```

创建 SSH 目录

```
mkdir -p ~/.ssh
chmod 700 ~/.ssh
```

编辑授权 key 文件：

```
vim ~/.ssh/authorized_keys
```

将刚才复制的 `id_ed25519.pub` 内容粘贴进去。

保存并设置权限：

```
chmod 600 ~/.ssh/authorized_keys
```

### 0.4 测试 SSH 免密登录

在本地终端输入以下命令，尝试连接到服务器：

```
ssh root@服务器IP
```

如果没有要求输入密码，说明配置成功，可以使用 SSH 免密登录

---

## 1. 本地生成最新静态文件

在 `hexo` 根目录依次执行:

### 1.1 清理旧文件

`hexo clean`

### 1.2 生成新文件

`hexo g`

---

## 2. 进入public目录

`cd public`

⚠ **注意：必须在 public 目录中执行 Git 推送**
因为 Hexo 最终部署的是 public 生成的静态文件

---

## 3. 提交并推送到服务器

将当前目录下“所有文件的变更”添加到 Git 的**暂存区（stage）**

`git add .`

将暂存区中的内容**正式提交到本地 Git 仓库**，创建一个版本快照

`git commit -m "update"`

把本地的最新提交（commit）推送到远程 Git 仓库（origin），推送的分支是 master。

`git push origin master`

---

## 4. 后记：用 Git 部署到其他服务器的操作

流程本质上都是一样的，只需要在 *新服务器* 上重新做一份 **裸仓库 + 自动部署目录 + post-receive 钩子**，然后本地添加新的远程仓库即可

### 4.1. 在新服务器创建裸仓库

假设你服务器 SSH 地址为：

```
root@NEW_SERVER_IP
```

登录：

```
ssh root@NEW_SERVER_IP
```

创建裸仓库：

```
mkdir -p /var/www/hexo.git
cd /var/www/hexo.git
git init --bare
```

### 4.2 创建静态站点部署目录

```
mkdir -p /var/www/hexo-site
```

### 4.3 配置 post-receive 自动部署

编辑钩子：

```
vim /var/www/hexo.git/hooks/post-receive
```

内容

```
#!/bin/bash
GIT_REPO=/var/www/hexo.git
WEB_ROOT=/var/www/hexo-site

git --work-tree=$WEB_ROOT --git-dir=$GIT_REPO checkout -f
```

保存后赋权

```
chmod +x /var/www/hexo.git/hooks/post-receive
```

### 4.4 新服务器配置 Nginx 指向 hexo-site

编辑配置：

```
vim /etc/nginx/sites-available/default
```

找到：

```
root /var/www/html;
```

改为：

```
root /var/www/hexo-site;
```

保存并重启：

```
nginx -t
systemctl restart nginx
```

### 4.5 本地 Hexo 添加新的远程仓库

回到本地：

```
hexo根目录/public
```

进入：

```
cd 网站根目录/public
```

查看已有远程：

```
git remote -v
```

#### 替换旧服务器

```
git remote remove origin
git remote add origin ssh://root@NEW_SERVER_IP/var/www/hexo.git
```

---

#### 多服务器部署

可以同时向多个服务器推送：

```
git remote add server1 ssh://root@OLD_IP/var/www/hexo.git
git remote add server2 ssh://root@NEW_SERVER_IP/var/www/hexo.git
```

然后分别部署：

```
git push server1 master
git push server2 master
```

一次全部推：

```
git push --all
```

### 4.6 以后更新网站的步骤

```
hexo clean
hexo g
cd public
git add .
git commit -m "update"
git push server2 master
```
