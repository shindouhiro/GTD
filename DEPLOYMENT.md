# Docker 部署指南

## 概述

Calendar Todo 应用已配置为使用 Docker 进行部署，支持多架构（amd64, arm64, arm/v7），并通过 GitHub Actions 自动构建和推送到 Docker Hub。

## 快速开始

### 使用 Docker Hub 镜像

```bash
# 拉取最新镜像
docker pull shindouhiro/calendar-todo:latest

# 运行容器
docker run -d -p 3000:3001 --name calendar-todo shindouhiro/calendar-todo:latest
```

访问 http://localhost:3000 查看应用。

### 使用 Docker Compose

```bash
# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

## 本地构建

### 构建镜像

```bash
# 单架构构建（本地架构）
docker build -t calendar-todo .

# 多架构构建（需要 buildx）
docker buildx create --use
docker buildx build --platform linux/amd64,linux/arm64,linux/arm/v7 -t shindouhiro/calendar-todo:latest --push .
```

### 测试镜像

```bash
# 运行容器
docker run -d -p 3000:3001 --name calendar-todo-test calendar-todo

# 健康检查
docker exec calendar-todo-test wget --spider http://localhost/health

# 查看日志
docker logs calendar-todo-test

# 停止并删除
docker stop calendar-todo-test && docker rm calendar-todo-test
```

## GitHub Actions 自动部署

### 配置 Secrets

在 GitHub 仓库设置中添加以下 Secrets：

1. `DOCKER_USERNAME` - Docker Hub 用户名
2. `DOCKER_PASSWORD` - Docker Hub 访问令牌（推荐使用 Access Token 而非密码）

### 触发构建

自动触发条件：
- **Push to main** - 推送到 main 分支时构建并推送 `latest` 标签
- **Create tag** - 创建版本标签（如 v1.0.0）时构建并推送版本标签
- **Pull Request** - PR 时仅构建不推送
- **Manual** - 手动触发工作流

### 镜像标签策略

- `latest` - 最新的 main 分支构建
- `v1.0.0` - 语义化版本标签
- `v1.0` - 主版本.次版本标签
- `v1` - 主版本标签
- `main-sha-abc123` - 分支名-提交 SHA

## 生产部署

### 环境变量

后端使用 Rust/Axum + SQLite。生产部署至少应配置持久化数据库路径和 JWT 密钥：

- `GTD_MODE=server`
- `DB_PATH=/app/data/todo.db`
- `JWT_SECRET=<your-production-secret>`
- `CLIENT_DIST_PATH=/app/client/dist`

### 资源要求

- **CPU**: 0.5 核心（推荐 1 核心）
- **内存**: 256MB（推荐 512MB）
- **存储**: 100MB

### Kubernetes 部署示例

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: calendar-todo
spec:
  replicas: 2
  selector:
    matchLabels:
      app: calendar-todo
  template:
    metadata:
      labels:
        app: calendar-todo
      annotations:
        traefik.http.services.calendar.loadbalancer.server.port: "3001"
    spec:
      containers:
      - name: calendar-todo
        image: shindouhiro/calendar-todo:latest
        ports:
        - containerPort: 3001
        resources:
          requests:
            memory: "256Mi"
            cpu: "500m"
          limits:
            memory: "512Mi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 3
          periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: calendar-todo
spec:
  selector:
    app: calendar-todo
  ports:
  - port: 3001
    targetPort: 3001
  type: LoadBalancer
```

### Docker Swarm 部署示例

```yaml
version: '3.8'

services:
  calendar-todo:
    image: shindouhiro/calendar-todo:latest
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
    ports:
      - "${PORT:-3000}:3001"
    healthcheck:
      test: ["CMD", "wget", "--spider", "http://localhost/health"]
      interval: 30s
      timeout: 3s
      retries: 3
```

## 架构支持

支持的平台：
- `linux/amd64` - x86_64 架构（Intel/AMD）
- `linux/arm64` - ARM 64位架构（Apple Silicon, AWS Graviton）
- `linux/arm/v7` - ARM 32位架构（Raspberry Pi）

## 性能优化

### Nginx 配置

- **Gzip 压缩** - 自动压缩文本资源
- **静态资源缓存** - 1年缓存期
- **安全头** - X-Frame-Options, X-Content-Type-Options, X-XSS-Protection

### Docker 镜像优化

- **多阶段构建** - 减小最终镜像大小
- **Alpine Linux** - 使用轻量级基础镜像
- **层缓存** - 利用 GitHub Actions 缓存加速构建

## 故障排查

### 容器无法启动

```bash
# 查看容器日志
docker logs calendar-todo

# 检查容器状态
docker ps -a

# 进入容器调试
docker exec -it calendar-todo sh
```

### 健康检查失败

```bash
# 手动测试健康检查
docker exec calendar-todo wget --spider http://localhost/health

# 查看 nginx 错误日志
docker exec calendar-todo cat /var/log/nginx/error.log
```

### 构建失败

```bash
# 清理 Docker 缓存
docker builder prune -a

# 重新构建（不使用缓存）
docker build --no-cache -t calendar-todo .
```

## 更新应用

```bash
# 拉取最新镜像
docker pull shindouhiro/calendar-todo:latest

# 停止旧容器
docker stop calendar-todo

# 删除旧容器
docker rm calendar-todo

# 启动新容器
docker run -d -p 3000:3001 --name calendar-todo shindouhiro/calendar-todo:latest
```

或使用 Docker Compose：

```bash
docker-compose pull
docker-compose up -d
```

## 备份和恢复

由于应用使用浏览器本地存储，数据存储在用户浏览器中。可以使用应用内置的导出/导入功能进行数据备份。

## 安全建议

1. **使用 HTTPS** - 在生产环境中使用反向代理（如 Nginx, Traefik）配置 SSL/TLS
2. **限制访问** - 使用防火墙规则限制访问
3. **定期更新** - 及时更新镜像以获取安全补丁
4. **资源限制** - 设置容器资源限制防止资源耗尽

## 监控

### 健康检查端点

- `GET /health` - 返回 200 状态码表示服务健康

### 日志

```bash
# 实时查看日志
docker logs -f calendar-todo

# 查看最近100行日志
docker logs --tail 100 calendar-todo
```

## 许可证

本项目使用 MIT 许可证。

## 支持

如有问题，请在 GitHub 仓库提交 Issue。
