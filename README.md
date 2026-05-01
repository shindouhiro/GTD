# 日历待办事项 (Calendar Todo App) - Monorepo

一个现代化的全栈待办事项管理系统，采用 Monorepo 架构，集成了交互式日历与高效的任务列表。

## ✨ 核心特性

- 📅 **智能日历视图**：支持按月查看任务，深度集成**农历（Lunar Calendar）**，完美支持中国传统节气和节日。
- 📋 **列表表格视图**：一键切换至高效的表格模式，支持任务的快速预览、筛选与管理。
- 🏷️ **全中文化分类**：内置工作、生活、学习等多种中文分类，支持自定义颜色与图标。
- 📊 **多维统计分析**：直观展示任务完成趋势，实时把控工作效率。
- 🎨 **多套皮肤主题**：内置 Default、Ocean、Forest、Cyberpunk 等多种精美皮肤，支持一键切换并自动保存偏好。
- 📝 **自动变更日志**：基于 **changelogithub** 规范，自动生成版本更新日志，确保项目透明度与规范性。
- 🛡️ **安全认证**：基于 JWT 的用户认证体系，保障数据安全。

## 📸 项目预览

<div align="center">
  <img src="https://i0.hdslb.com/bfs/openplatform/174f18a1842f3279d4623abd3d34044782074b05.png" width="800" alt="日历视图" />
  <p><i>智能日历视图 - 为您呈现清晰的日程安排</i></p>

  <br />

  <img src="https://i0.hdslb.com/bfs/openplatform/00af6f4f722630d955520616cda617a5555e58a2.png" width="800" alt="表格视图" />
  <p><i>列表表格视图 - 高效管理繁杂任务</i></p>

  <br />

  <img src="https://i0.hdslb.com/bfs/openplatform/105472907c134172351d6fc0ee33dd088163e331.png" width="800" alt="移动端适配" />
  <p><i>统计分析与移动端适配 - 随时随地把控进度</i></p>
</div>

## 📁 项目结构

```
calendar-todo-app/
├── packages/
20: │   ├── client/          # React 前端 (Vite + Tailwind CSS)
15: │   └── server/          # 旧版 TypeScript 后端（已由 Rust 后端替代）
22: ├── pnpm-workspace.yaml  # Monorepo 工作区配置 (PNPM Catalogs)
24: ├── Dockerfile           # 极致优化的多阶段构建脚本
25: └── docker-compose.yml   # 一键启动配置
```

## 🚀 快速开始

### 前置要求

- Node.js >= 20
- pnpm >= 10

### 安装依赖

```bash
pnpm install
```

### 开发环境启动

```bash
# 同时运行前端和后端
pnpm dev

# 前端地址: http://localhost:3000
# 后端地址: http://localhost:3001
```

### 构建与打包

```bash
# 全局编译
pnpm build
```

### 桌面端打包 (Tauri)

项目已支持将前端 + Rust 后端一起打包到桌面应用（macOS / Windows）。

```bash
# 1) 准备打包资源（构建前端静态资源）
pnpm tauri:prepare

# 2) 执行桌面打包（默认 targets=all）
pnpm tauri:build
```

说明：

- 桌面端后端由 Tauri 进程内的 Rust/Axum 服务提供，不再打包 Node runtime。
- 生产数据库默认写入系统应用数据目录（`app_data_dir/todo.db`），不会污染项目目录。
- 桌面端默认免登录；Web/Docker 模式仍保留注册、登录和 JWT 鉴权。
- 如仅需 macOS `.app`，可执行 `node scripts/run-tauri.mjs build --bundles app`。

## 🐳 Docker 生产部署 (推荐)

本项目采用了极致的体积优化（~200MB），并支持一键通过 Docker Compose 部署。

### 1. 快速启动

```bash
# 构建镜像并后台运行
docker-compose up --build -d
```

启动后可访问: `http://localhost:3003`

### 2. 配置文件参考 (`docker-compose.yml`)

您可以直接参考或复制以下配置：

```yaml
version: '3.8'

services:
  calendar-todo:
    image: shindouhiro/calendar-todo:latest
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - '3003:3001'
    volumes:
      - ./data:/app/data
    restart: unless-stopped
    healthcheck:
      test: [CMD, wget, --no-verbose, --tries=1, --spider, 'http://localhost:3001/health']
      interval: 30s
      timeout: 3s
      retries: 3
    environment:
      - NODE_ENV=production
      - DB_PATH=/app/data/todo.db
```

### 3. 数据持久化 (Persistence)

为了确保您的待办事项在容器更新或重启时不丢失，项目默认开启了**卷挂载（Volume Mapping）**：

- **宿主机目录**: `./data`
- **容器内路径**: `/app/data`
- **数据库文件**: `todo.db` (SQLite)

> [!IMPORTANT]
> 部署前请确保当前目录下有 `data` 文件夹写权限，或者手动创建：`mkdir -p data && chmod 777 data`。

### 3. 常用管理命令

```bash
# 查看运行日志
docker-compose logs -f

# 停止并移除容器
docker-compose down

# 重启服务
docker-compose restart
```

## 📦 技术栈详情

### 前端 (@todo-app/client)

- **框架**: React 19 + TypeScript
- **路由**: TanStack Router
- **样式**: Tailwind CSS (Lucide Icons)
- **日历库**: date-fns + lunar-javascript (农历支持)
- **状态管理**: TanStack Query / React Hooks

### 后端 (Rust / src-tauri)

- **运行环境**: Rust + Axum + Tokio
- **数据库**: SQLite (sqlx)
- **架构**: RESTful API，桌面内置 HTTP 服务，Web/Docker 独立服务二进制
- **认证**: Web/Docker 使用 JWT + bcrypt，桌面端使用本地免登录模式

## 📝 开源协议

MIT
