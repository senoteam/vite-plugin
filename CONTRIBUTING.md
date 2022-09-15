# 贡献指南

这篇指南会指导你如何为该项目贡献一份自己的力量，请在你要提问题反馈或者 pull request 之前花几分钟来阅读一遍这篇指南。

## 透明的开发

我们所有的工作都会放在 GitHub 上。不管是核心团队的成员还是外部贡献者的 pull request 都需要经过同样流程的 review。

## 分支管理

我们长期维护三个分支：

### v[\d]

> 例如：`v0` `v1` `v2` 等

此系列分支为每个大版本的最新正式版，主要是存档用。

### main

此分支为最新正式版，如果你要做 patch 级别的变更（如：修一个 bug、做一些优化等），请发 pull request 到该分支，当 PR 被 approve 并 merge 之后，GitHub Action 会自动发布新的正式版本。

### next

此分支为最新 RC 版，如果你要做 minor 或 major 级别的变更（如：新增一个功能、重构一个模块等），请基于该分支来做，测试完成并明确可以发布后，再发 pull request 到该分支，当 PR 被 approve 并 merge 之后，GitHub Action 会自动发布新的 RC 版本。

> **注意**  
> 在测试完成并明确可以发布之前，请勿提 pull request 到该分支，如需发布测试版本，请在开发分支发布快照版本。

此分支内容稳定后，将会被合并进 `main` 分支并发布新的正式版本。

## Bugs

我们使用 ONES Project 来做 bug 追踪。
在你报告一个 bug 之前，请先确保已经搜索过已有的问题反馈和阅读了我们的常见问题。

## 第一次贡献

如果你还不清楚怎么在 GitHub 上提 Pull Request ，可以阅读这篇文章来学习：[如何优雅地在 GitHub 上贡献代码](https://segmentfault.com/a/1190000000736629)

如果你打算开始处理一个问题反馈，请先检查一下问题反馈的流转状态和评论以确保没有别人正在处理这个问题反馈。如果当前没有人在处理的话你可以流转状态告知其他人你将会处理这个问题反馈，以免别人重复劳动。

如果之前有人流转了状态但是一两个星期都没有动静，那么你也可以接手处理这个问题反馈，当然还是要先告知其他人。

## 开发流程

在你 clone 了代码并且使用 `npm install` 安装完依赖后，你还可以运行下面几个常用的命令：

- `npm run docs` 在本地运行开发文档站点
- `npm run watch` 构建打包并监听文件改动
- `npm test` 执行测试（包括类型检查、单元测试等）

## 提交规范

我们采用 [约定式提交 v1.0.0](https://www.conventionalcommits.org/zh-hans/v1.0.0/) 作为 Git 提交规范，不规范提交的 PR 将会被我们拒绝。

Commit Message 的结构如下所示：

```
<type>[optional scope]: [optional emoji] <description>
[optional body]
[optional footer(s)]
```

1. 一个 commit 应当只包含一个改动
2. 如果 commit 需要在 changelog 中体现，则必须包含 emoji，否则不应该包含
3. 如果是子模块的改动，description 应以加粗的子模块名开头
4. 使用 markdown 书写 description，内容应当简洁明了

下面是可用的 type 及其对应的 emoji 说明：

| **type** | **emoji** | **说明**           | **对应语义化版本** |
| -------- | --------- | ------------------ | ------------------ |
| feat     | 🔥        | 新功能及重大特性   | minor              |
|          | 🌟        | 新特性             | minor              |
| refactor | 🛠         | 重构               | minor              |
| fix      | 🐞        | Bug 修复           | patch              |
| revert   | 💊        | 回滚               | patch              |
| perf     | 🧊        | 性能改进、样式更新 | patch              |
|          | 🗑         | 移除冗余代码       | patch              |
| build    | 🌏        | 浏览器兼容性调整   | patch              |
|          | 📦        | 依赖更新           | patch              |
|          |           | 构建相关           |                    |
| docs     |           | 文档相关           |                    |
| style    |           | 编码风格相关       |                    |
| test     |           | 测试相关           |                    |
| ci       |           | 持续集成相关       |                    |
| chore    |           | 其他杂项           |                    |

### 示例

不包含范围与 emoji 的提交：

```
fix: eslint error
```

带 emoji 的提交：

```
perf: 📦 upgrade antd to 4.16.2
```

包含范围与 emoji 的提交：

```
refactor(Loading): 🛠 使用 React Hooks 重构组件
```

包含范围及子范围的提交：

```
fix(User): 🐞 **User.Select** 修复 `dropdownClassName` 属性不生效的问题
```

更多示例可以参考 [ONES Design Changelog](https://bangwork.github.io/ones-design/?path=/story/changelog-core--page)

## Pull Request

我们会关注所有的 pull request，以及 review 并合并你的代码，也有可能要求你做一些修改或者告诉你我们为什么不能接受这样的修改。

**在你发送 Pull Request 之前**，请确认你是按照下面的步骤来做的：

1. 基于 [正确的分支](#分支管理) 做修改
2. 如果你修复了一个 bug 或者新增了一个功能，请确保写了相应的测试，这很重要
3. `npm test` 确认所有的测试都是通过的
4. 确保你的代码通过了 Lint 检查，Lint 会在你 `git commit` 的时候自动运行（通过 [Git Hooks](https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks)）

一个 Pull Request 应当只包含同一个改动相关的 commit，标题规范同 [提交规范](#提交规范)，因为通常合并后将只保留一个 message 为 Pull Request 标题的 commit。
