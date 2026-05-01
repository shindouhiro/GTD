# Docker 快速参考

## 常用命令

### 拉取和运行

```bash
# 从 Docker Hub 拉取最新镜像
docker pull shindouhiro/calendar-todo:latest

# 运行容器（端口 3000）
docker run -d -p 3000:3001 --name calendar-todo shindouhiro/calendar-todo:latest

# 运行容器（自定义端口）
docker run -d -p 8080:3001 --name calendar-todo shindouhiro/calendar-todo:latest
```

### 容器管理

```bash
# 查看运行中的容器
docker ps

# 查看所有容器（包括停止的）
docker ps -a

# 停止容器
docker stop calendar-todo

# 启动容器
docker start calendar-todo

# 重启容器
docker restart calendar-todo

# 删除容器
docker rm calendar-todo

# 强制删除运行中的容器
docker rm -f calendar-todo
```

### 日志和调试

```bash
# 查看容器日志
docker logs calendar-todo

# 实时查看日志
docker logs -f calendar-todo

# 查看最近 100 行日志
docker logs --tail 100 calendar-todo

# 进入容器 shell
docker exec -it calendar-todo sh

# 查看容器详细信息
docker inspect calendar-todo

# 查看容器资源使用
docker stats calendar-todo
```

### 镜像管理

```bash
# 列出本地镜像
docker images

# 删除镜像
docker rmi shindouhiro/calendar-todo:latest

# 清理未使用的镜像
docker image prune

# 清理所有未使用的资源
docker system prune -a
```

## Docker Compose 命令

```bash
# 启动服务（后台运行）
docker-compose up -d

# 启动服务（前台运行，查看日志）
docker-compose up

# 停止服务
docker-compose down

# 停止并删除卷
docker-compose down -v

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs

# 实时查看日志
docker-compose logs -f

# 重启服务
docker-compose restart

# 重新构建并启动
docker-compose up -d --build

# 拉取最新镜像
docker-compose pull

# 拉取并重启
docker-compose pull && docker-compose up -d
```

## Docker Compose 配置详解

### 基础配置文件 (docker-compose.yml)

项目中的 `docker-compose.yml` 文件配置如下：

```yaml
version: '3.8'

services:
  calendar-todo:
    image: shindouhiro/calendar-todo:latest
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3001"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost/health"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 5s
    environment:
      - NODE_ENV=production
```

### 配置项详细说明

#### 1. version: '3.8'
- **说明**: 指定 Docker Compose 文件格式版本
- **版本 3.8**: 支持 Docker Engine 19.03.0+ 的所有功能
- **兼容性**: 向后兼容 3.x 版本

#### 2. services
定义要运行的服务（容器）。这里只有一个服务：`calendar-todo`

#### 3. image: shindouhiro/calendar-todo:latest
- **说明**: 指定要使用的 Docker 镜像
- **latest**: 使用最新版本的镜像
- **替代方案**: 可以指定具体版本，如 `shindouhiro/calendar-todo:v1.0.0`

#### 4. build
本地构建配置（可选）：

```yaml
build:
  context: .              # 构建上下文目录（当前目录）
  dockerfile: Dockerfile  # Dockerfile 文件名
```

- **使用场景**: 
  - 开发环境：使用 `docker-compose up --build` 本地构建
  - 生产环境：直接使用 `image` 从 Docker Hub 拉取

#### 5. ports: "3000:80"
端口映射配置：

```yaml
ports:
  - "3000:3001"  # 主机端口:容器端口
```

- **3000**: 主机（你的电脑）上的端口
- **3001**: 容器内 Rust/Axum 服务监听的端口
- **访问**: http://localhost:3000

**多端口映射示例**:
```yaml
ports:
  - "3000:3001"   # HTTP
  - "3443:443"  # HTTPS（如果配置了）
```

**动态端口**:
```yaml
ports:
  - "80"  # Docker 自动分配主机端口
```

#### 6. restart: unless-stopped
容器重启策略：

| 策略 | 说明 |
|------|------|
| `no` | 不自动重启（默认） |
| `always` | 总是重启，包括 Docker 守护进程启动时 |
| `on-failure` | 仅在容器异常退出时重启 |
| `unless-stopped` | 总是重启，除非手动停止 |

**推荐**: `unless-stopped` - 服务器重启后自动启动，但手动停止后不会自动启动

#### 7. healthcheck
健康检查配置：

```yaml
healthcheck:
  test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost/health"]
  interval: 30s      # 每 30 秒检查一次
  timeout: 3s        # 检查超时时间 3 秒
  retries: 3         # 连续失败 3 次才标记为不健康
  start_period: 5s   # 容器启动后 5 秒才开始健康检查
```

**test 命令说明**:
- `CMD`: 在容器内执行命令
- `wget --spider`: 只检查 URL 是否可访问，不下载内容
- `http://localhost/health`: 健康检查端点

**其他健康检查方式**:
```yaml
# 使用 curl
test: ["CMD", "curl", "-f", "http://localhost/health"]

# 使用 shell 脚本
test: ["CMD-SHELL", "wget --spider http://localhost/health || exit 1"]
```

#### 8. environment
环境变量配置：

```yaml
environment:
  - NODE_ENV=production
  - TZ=Asia/Shanghai  # 设置时区
```

**或使用键值对格式**:
```yaml
environment:
  NODE_ENV: production
  TZ: Asia/Shanghai
```

**从文件加载**:
```yaml
env_file:
  - .env
  - .env.production
```

### 高级配置示例

#### 完整生产环境配置

```yaml
version: '3.8'

services:
  calendar-todo:
    image: shindouhiro/calendar-todo:latest
    container_name: calendar-todo  # 自定义容器名称
    hostname: calendar-todo        # 容器主机名
    
    # 构建配置（开发环境）
    build:
      context: .
      dockerfile: Dockerfile
      args:
        - BUILD_DATE=${BUILD_DATE}
        - VERSION=${VERSION}
    
    # 端口映射
    ports:
      - "3000:3001"
    
    # 网络配置
    networks:
      - frontend
      - monitoring
    
    # 卷挂载
    volumes:
      - ./custom-nginx.conf:/etc/nginx/conf.d/default.conf:ro  # 只读
      - nginx-logs:/var/log/nginx                               # 命名卷
    
    # 环境变量
    environment:
      - NODE_ENV=production
      - TZ=Asia/Shanghai
    
    # 重启策略
    restart: unless-stopped
    
    # 健康检查
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost/health"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 5s
    
    # 资源限制
    deploy:
      resources:
        limits:
          cpus: '1.0'      # 最多使用 1 个 CPU 核心
          memory: 512M     # 最多使用 512MB 内存
        reservations:
          cpus: '0.5'      # 预留 0.5 个 CPU 核心
          memory: 256M     # 预留 256MB 内存
      
      # 副本数（Swarm 模式）
      replicas: 2
      
      # 更新策略
      update_config:
        parallelism: 1
        delay: 10s
        failure_action: rollback
      
      # 回滚策略
      rollback_config:
        parallelism: 1
        delay: 5s
    
    # 日志配置
    logging:
      driver: "json-file"
      options:
        max-size: "10m"    # 单个日志文件最大 10MB
        max-file: "3"      # 最多保留 3 个日志文件
    
    # 依赖关系（如果有其他服务）
    depends_on:
      - redis
      - postgres
    
    # 标签
    labels:
      - "com.example.description=Calendar Todo Application"
      - "com.example.version=1.0.0"
      - "traefik.enable=true"  # Traefik 反向代理

# 网络定义
networks:
  frontend:
    driver: bridge
  monitoring:
    external: true  # 使用外部已存在的网络

# 卷定义
volumes:
  nginx-logs:
    driver: local
```

#### 多服务配置示例

如果需要添加数据库或其他服务：

```yaml
version: '3.8'

services:
  # 前端应用
  calendar-todo:
    image: shindouhiro/calendar-todo:latest
    ports:
      - "3000:3001"
    depends_on:
      - redis
    networks:
      - app-network
    restart: unless-stopped

  # Redis 缓存（示例）
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    networks:
      - app-network
    restart: unless-stopped
    command: redis-server --appendonly yes

  # Nginx 反向代理（示例）
  nginx-proxy:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx-proxy.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - calendar-todo
    networks:
      - app-network
    restart: unless-stopped

networks:
  app-network:
    driver: bridge

volumes:
  redis-data:
```

#### 开发环境配置

```yaml
version: '3.8'

services:
  calendar-todo-dev:
    build:
      context: .
      dockerfile: Dockerfile
      target: development  # 多阶段构建的开发阶段
    ports:
      - "3000:3001"
      - "5173:5173"  # Vite 开发服务器
    volumes:
      - ./src:/app/src:cached  # 源码热重载
      - /app/node_modules      # 不挂载 node_modules
    environment:
      - NODE_ENV=development
      - VITE_API_URL=http://localhost:3001
    command: pnpm run dev
```

### 常用配置组合

#### 1. 最小化配置（快速启动）

```yaml
version: '3.8'
services:
  calendar-todo:
    image: shindouhiro/calendar-todo:latest
    ports:
      - "3000:3001"
```

#### 2. 生产环境推荐配置

```yaml
version: '3.8'
services:
  calendar-todo:
    image: shindouhiro/calendar-todo:latest
    container_name: calendar-todo
    ports:
      - "3000:3001"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--spider", "http://localhost/health"]
      interval: 30s
      timeout: 3s
      retries: 3
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
    logging:
      options:
        max-size: "10m"
        max-file: "3"
```

#### 3. 带 HTTPS 的配置（使用 Traefik）

```yaml
version: '3.8'

services:
  calendar-todo:
    image: shindouhiro/calendar-todo:latest
    networks:
      - traefik-public
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.calendar.rule=Host(`todo.example.com`)"
      - "traefik.http.routers.calendar.entrypoints=websecure"
      - "traefik.http.routers.calendar.tls.certresolver=letsencrypt"
      - "traefik.http.services.calendar.loadbalancer.server.port=80"

networks:
  traefik-public:
    external: true
```

### 使用技巧

#### 1. 环境变量替换

在 `docker-compose.yml` 中使用环境变量：

```yaml
services:
  calendar-todo:
    image: shindouhiro/calendar-todo:${VERSION:-latest}
    ports:
      - "${PORT:-3000}:80"
```

创建 `.env` 文件：
```env
VERSION=v1.0.0
PORT=8080
```

#### 2. 配置文件覆盖

基础配置 `docker-compose.yml`:
```yaml
services:
  calendar-todo:
    image: shindouhiro/calendar-todo:latest
    ports:
      - "3000:3001"
```

生产环境覆盖 `docker-compose.prod.yml`:
```yaml
services:
  calendar-todo:
    restart: always
    deploy:
      resources:
        limits:
          memory: 512M
```

使用：
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

#### 3. 扩展服务

```bash
# 运行 3 个实例（需要负载均衡器）
docker-compose up -d --scale calendar-todo=3
```

### 验证配置

```bash
# 验证配置文件语法
docker-compose config

# 查看最终合并的配置
docker-compose config --services

# 查看环境变量
docker-compose config --env-file .env
```

### 最佳实践

1. **使用版本固定**: 生产环境使用具体版本而非 `latest`
2. **设置资源限制**: 防止容器消耗过多资源
3. **配置健康检查**: 自动检测和重启不健康的容器
4. **日志轮转**: 防止日志文件占满磁盘
5. **使用网络隔离**: 不同服务使用不同网络提高安全性
6. **敏感信息**: 使用 secrets 或环境变量文件，不要硬编码

### 故障排查

```bash
# 查看服务配置
docker-compose config

# 验证并查看配置
docker-compose config --quiet

# 查看服务日志
docker-compose logs calendar-todo

# 查看服务状态
docker-compose ps

# 重新创建服务
docker-compose up -d --force-recreate
```

## 本地构建

```bash
# 构建镜像
docker build -t calendar-todo .

# 构建时不使用缓存
docker build --no-cache -t calendar-todo .

# 构建并指定标签
docker build -t calendar-todo:v1.0.0 .

# 多架构构建（需要 buildx）
docker buildx create --use
docker buildx build --platform linux/amd64,linux/arm64 -t calendar-todo .
```

## 健康检查

```bash
# 检查容器健康状态
docker inspect --format='{{.State.Health.Status}}' calendar-todo

# 手动测试健康检查端点
curl http://localhost:3000/health

# 在容器内测试
docker exec calendar-todo wget --spider http://localhost/health
```

## 更新应用

### 方法 1: 使用 Docker 命令

```bash
# 1. 拉取最新镜像
docker pull shindouhiro/calendar-todo:latest

# 2. 停止并删除旧容器
docker stop calendar-todo && docker rm calendar-todo

# 3. 启动新容器
docker run -d -p 3000:3001 --name calendar-todo shindouhiro/calendar-todo:latest
```

### 方法 2: 使用 Docker Compose

```bash
# 一键更新
docker-compose pull && docker-compose up -d
```

### 方法 3: 使用脚本

创建 `update.sh`:

```bash
#!/bin/bash
docker pull shindouhiro/calendar-todo:latest
docker stop calendar-todo
docker rm calendar-todo
docker run -d -p 3000:3001 --name calendar-todo shindouhiro/calendar-todo:latest
echo "Updated to latest version"
```

运行：
```bash
chmod +x update.sh
./update.sh
```

## 故障排查

### 容器无法启动

```bash
# 查看错误日志
docker logs calendar-todo

# 检查端口是否被占用
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# 使用不同端口
docker run -d -p 8080:3001 --name calendar-todo shindouhiro/calendar-todo:latest
```

### 无法访问应用

```bash
# 检查容器是否运行
docker ps

# 检查容器健康状态
docker inspect calendar-todo | grep Health -A 10

# 测试容器内部
docker exec calendar-todo wget -O- http://localhost/

# 检查防火墙设置
```

### 镜像拉取失败

```bash
# 检查网络连接
ping hub.docker.com

# 使用镜像加速器（中国用户）
# 编辑 /etc/docker/daemon.json
{
  "registry-mirrors": [
    "https://mirror.ccs.tencentyun.com"
  ]
}

# 重启 Docker
sudo systemctl restart docker
```

## 性能优化

### 资源限制

```bash
# 限制内存和 CPU
docker run -d \
  --memory="512m" \
  --cpus="1.0" \
  -p 3000:3001 \
  --name calendar-todo \
  shindouhiro/calendar-todo:latest
```

### 使用 Docker Compose 设置资源限制

```yaml
services:
  calendar-todo:
    image: shindouhiro/calendar-todo:latest
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

## 备份和恢复

### 导出容器

```bash
# 导出容器为 tar 文件
docker export calendar-todo > calendar-todo-backup.tar

# 从 tar 文件导入
docker import calendar-todo-backup.tar calendar-todo:backup
```

### 保存镜像

```bash
# 保存镜像为 tar 文件
docker save shindouhiro/calendar-todo:latest > calendar-todo-image.tar

# 加载镜像
docker load < calendar-todo-image.tar
```

## 网络配置

### 自定义网络

```bash
# 创建网络
docker network create calendar-network

# 在自定义网络中运行
docker run -d \
  --network calendar-network \
  --name calendar-todo \
  -p 3000:3001 \
  shindouhiro/calendar-todo:latest

# 查看网络
docker network ls

# 查看网络详情
docker network inspect calendar-network
```

## 环境变量

Rust 后端建议显式设置运行模式、数据库路径和 JWT 密钥：

```bash
# 设置环境变量
docker run -d \
  -e GTD_MODE=server \
  -e NODE_ENV=production \
  -e DB_PATH=/app/data/todo.db \
  -e JWT_SECRET=change-this-secret-before-production \
  -v $(pwd)/data:/app/data \
  -p 3000:3001 \
  --name calendar-todo \
  shindouhiro/calendar-todo:latest
```

## 卷挂载

如果需要持久化数据：

```bash
docker run -d \
  -e GTD_MODE=server \
  -e DB_PATH=/app/data/todo.db \
  -e JWT_SECRET=change-this-secret-before-production \
  -v $(pwd)/data:/app/data \
  -p 3000:3001 \
  --name calendar-todo \
  shindouhiro/calendar-todo:latest
```

## 有用的别名

添加到 `~/.bashrc` 或 `~/.zshrc`:

```bash
# Calendar Todo 别名
alias ctd-start='docker start calendar-todo'
alias ctd-stop='docker stop calendar-todo'
alias ctd-restart='docker restart calendar-todo'
alias ctd-logs='docker logs -f calendar-todo'
alias ctd-update='docker pull shindouhiro/calendar-todo:latest && docker stop calendar-todo && docker rm calendar-todo && docker run -d -p 3000:3001 --name calendar-todo shindouhiro/calendar-todo:latest'
```

使用：
```bash
ctd-start    # 启动
ctd-stop     # 停止
ctd-restart  # 重启
ctd-logs     # 查看日志
ctd-update   # 更新到最新版本
```

## 相关链接

- [Docker Hub 仓库](https://hub.docker.com/r/shindouhiro/calendar-todo)
- [GitHub 仓库](https://github.com/shindouhiro/calendar-todo)
- [详细部署文档](./DEPLOYMENT.md)
- [GitHub Actions 设置](./.github/ACTIONS_SETUP.md)
