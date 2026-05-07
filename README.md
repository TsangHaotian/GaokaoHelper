# GaokaoAI · 高考志愿填报助手

基于 AI 大语言模型的高考志愿填报辅助对话工具，支持多角色对话与 AI 群聊。

## 功能

- **AI 对话** — 基于 DeepSeek V4 Flash 模型，支持流式输出
- **角色扮演** — 内置张雪峰等角色 SKILL，模拟不同风格回答
- **AI 群聊** — 多人同时回答模式，支持多轮讨论和提问者机制
- **多模型支持** — 可切换 DeepSeek、Moonshot、MiniMax、GLM-4-Flash 等多个 API 提供商

## 快速开始

1. 打开 `index.html`（或部署到静态服务器）
2. 点击左下角「设置」，选择 AI 服务商并填入 API Key
3. 选择角色开始对话

### 获取 API Key

| 服务商 | 价格 | 获取地址 |
|--------|------|---------|
| DeepSeek | 付费 | [platform.deepseek.com](https://platform.deepseek.com) |
| Moonshot 月之暗面 | 付费 | [platform.moonshot.cn](https://platform.moonshot.cn/console) |
| MiniMax | 付费 | [platform.minimaxi.com](https://platform.minimaxi.com) |
| GLM-4-Flash | 完全免费 | [bigmodel.cn](https://bigmodel.cn) |

> 经测试，GLM-4-Flash 由于模型参数量较小，效果并非最佳，建议优先选择 DeepSeek。

## 角色 SKILL

角色由 SKILL 定义文件驱动，存放在 `skill/` 目录下。当前内置角色：

| 角色 | 来源仓库 |
|------|---------|
| 张雪峰 | [alchaincyf/zhangxuefeng-skill](https://github.com/alchaincyf/zhangxuefeng-skill) |
| 张雪峰 V2.0 | [a18515373115-droid/ZhangXueFeng-skill](https://github.com/a18515373115-droid/ZhangXueFeng-skill) |

SKILL 角色定义源自开源社区，欢迎贡献新的角色定义。

## 技术栈

- 纯前端，无后端依赖
- 原生 JavaScript（ES5），兼容性良好
- 流式 SSE 输出
- localStorage 持久化消息和配置

## 免责声明

本页面为 AI 对话工具，所有内容由人工智能生成，仅供参考。不构成高考志愿填报、学业规划等专业建议。用户有义务自行核实所有信息，并以官方渠道发布的信息为准。
