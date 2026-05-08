# GaokaoAI · AI 智聊

基于 AI 大语言模型的多角色对话工具，专注高考志愿填报辅助。支持单聊和群聊模式，可同时召唤多个 AI 角色围绕同一话题展开讨论。

## 功能

- **多角色单聊** — 内置多个角色 SKILL，切换即用
- **AI 群聊** — 同时召集多个角色参与对话，支持多轮讨论 + 提问者总结追问
- **流式输出** — 实时流式 SSE 输出，对话体验流畅
- **停止打断** — 群聊太长时可随时停止 AI 回复
- **多模型支持** — 兼容 DeepSeek、Moonshot、MiniMax、GLM-4-Flash
- **PWA 离线缓存** — 首次访问后离线也可查看历史记录
- **纯前端** — 无需后端服务器，浏览器直连 API

## 角色

| 角色 | 定位 |
|------|------|
| 张雪峰 | 实用主义、就业导向，帮普通家庭看清现实 |
| 张雪峰 V2.0 | 同款升级版 |
| 平衡者 | 提供与张雪峰互补的另一面视角 |
| 家长 | 普通父母的声音，关心稳定、学费和距离 |
| 心理辅导员 | 缓解焦虑，处理"怕选错"的心理 |
| 职业规划师 | 长远发展视角，关注10年后的职业路径 |
| 数据分析师 | 指导用户去哪找数据、帮用户解读数据 |

## 快速开始

1. 打开 `index.html`（或部署到任何静态服务器）
2. 点击左下角「设置」，选择 AI 服务商，填入 API Key
3. 点击左侧角色开始对话
4. 开启「群聊」勾选多个角色，体验多角色讨论

### 获取 API Key

| 服务商 | 价格 | 获取地址 |
|--------|------|---------|
| DeepSeek | 付费 | [platform.deepseek.com](https://platform.deepseek.com) |
| Moonshot 月之暗面 | 付费 | [platform.moonshot.cn](https://platform.moonshot.cn/console) |
| MiniMax | 付费 | [platform.minimaxi.com](https://platform.minimaxi.com) |
| GLM-4-Flash | 完全免费 | [bigmodel.cn](https://bigmodel.cn) |

> 群聊场景下建议使用 DeepSeek 模型。其他模型在复杂指令下表现不稳定。

## 角色 SKILL

角色由 `skill/` 目录下的 SKILL 定义文件驱动。每个 SKILL 包含完整的心智模型、决策启发式和表达 DNA。当前内置 7 个角色，均位于 `skill/` 目录下。

SKILL 参考了开源社区的角色定义规范，欢迎创建新的 SKILL 文件贡献角色。

## 项目结构

```
├── index.html          主页面
├── manifest.json       PWA 清单
├── service-worker.js   PWA 离线缓存
├── chat/
│   ├── app.js          核心逻辑
│   └── style.css       样式
├── skill/
│   ├── index.json      角色注册表
│   ├── zhangxuefeng/   张雪峰 SKILL
│   ├── ZhangXueFeng-skill-main/
│   ├── balancer/       平衡者
│   ├── parent/         家长
│   ├── counselor/      心理辅导员
│   ├── career/         职业规划师
│   └── data-analyst/   数据分析师
└── guide/
    ├── deepseek.html   各服务商 API Key 获取教程
    ├── moonshot.html
    ├── minimax.html
    └── img_*/
```

## 技术栈

- **纯前端** — 无后端依赖，浏览器直连 API
- **原生 JavaScript (ES5)** — 兼容主流浏览器
- **SSE 流式输出** — `fetch` + `ReadableStream` 实时渲染
- **localStorage** — 持久化配置和聊天记录
- **PWA** — Service Worker + manifest，支持离线缓存和桌面安装

## 免责声明

本工具为 AI 对话辅助工具，所有回答由人工智能生成，仅供参考。因参考本工具内容而产生滑档、退档等后果，作者概不负责，请以官方渠道信息为准。
