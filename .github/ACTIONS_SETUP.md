# GitHub Actions 配置指南

## 设置 Docker Hub Secrets

要启用自动构建和推送到 Docker Hub，需要在 GitHub 仓库中配置以下 Secrets：

### 步骤 1: 创建 Docker Hub Access Token

1. 登录 [Docker Hub](https://hub.docker.com/)
2. 点击右上角头像 → **Account Settings**
3. 选择 **Security** 标签
4. 点击 **New Access Token**
5. 输入描述（如 "GitHub Actions"）
6. 选择权限：**Read, Write, Delete**
7. 点击 **Generate**
8. **重要**: 复制生成的 token（只显示一次）

### 步骤 2: 在 GitHub 添加 Secrets

1. 打开 GitHub 仓库
2. 进入 **Settings** → **Secrets and variables** → **Actions**
3. 点击 **New repository secret**

添加以下两个 secrets：

#### DOCKER_USERNAME
- **Name**: `DOCKER_USERNAME`
- **Secret**: 你的 Docker Hub 用户名（例如：`shindouhiro`）

#### DOCKER_PASSWORD
- **Name**: `DOCKER_PASSWORD`
- **Secret**: 刚才创建的 Docker Hub Access Token

## 工作流触发条件

### 自动触发

1. **推送到 main 分支**
   ```bash
   git push origin main
   ```
   - 构建并推送 `latest` 标签
   - 构建并推送 `main-<commit-sha>` 标签

2. **创建版本标签**
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
   - 构建并推送 `v1.0.0` 标签
   - 构建并推送 `v1.0` 标签
   - 构建并推送 `v1` 标签
   - 构建并推送 `latest` 标签
   - 构建 macOS / Windows 桌面安装包，并上传到对应的 GitHub Release

3. **Pull Request**
   - 仅构建，不推送镜像
   - 桌面安装包只作为 GitHub Actions artifact 提供下载，不会更新 GitHub Release
   - 用于验证 PR 是否能成功构建

### 手动触发

1. 进入 GitHub 仓库的 **Actions** 标签
2. 选择 **Build and Push Docker Image** 工作流
3. 点击 **Run workflow**
4. 选择分支并点击 **Run workflow**

## 镜像标签说明

工作流会自动生成以下标签：

| 触发条件 | 生成的标签 | 示例 |
|---------|-----------|------|
| Push to main | `latest`, `main-<sha>` | `latest`, `main-abc123` |
| Tag v1.2.3 | `v1.2.3`, `v1.2`, `v1`, `latest` | 所有版本标签 |
| PR #123 | 不推送，仅构建 | - |

## 验证构建

### 查看工作流状态

1. 进入 GitHub 仓库的 **Actions** 标签
2. 查看最新的工作流运行
3. 点击查看详细日志

### 检查 Docker Hub

1. 访问 https://hub.docker.com/r/shindouhiro/calendar-todo
2. 查看 **Tags** 标签
3. 确认新标签已推送

### 本地测试

```bash
# 拉取最新镜像
docker pull shindouhiro/calendar-todo:latest

# 运行容器
docker run -d -p 3000:80 shindouhiro/calendar-todo:latest

# 访问应用
open http://localhost:3000
```

## 故障排查

### 构建失败

1. **检查 Secrets 配置**
   - 确认 `DOCKER_USERNAME` 和 `DOCKER_PASSWORD` 已正确设置
   - 验证 Docker Hub token 仍然有效

2. **查看构建日志**
   - 在 Actions 标签中查看详细错误信息
   - 检查是否有依赖安装失败

3. **本地测试构建**
   ```bash
   docker build -t test .
   ```

### 推送失败

1. **验证 Docker Hub 权限**
   - 确认 token 有 Write 权限
   - 检查仓库名称是否正确

2. **检查镜像大小**
   - Docker Hub 免费账户有存储限制
   - 考虑清理旧镜像

### 多架构构建问题

1. **QEMU 设置失败**
   - 通常是临时问题，重新运行工作流

2. **特定架构构建失败**
   - 检查依赖是否支持所有架构
   - 查看构建日志中的具体错误

## 优化建议

### 加速构建

1. **使用缓存**
   - 工作流已配置 GitHub Actions 缓存
   - 后续构建会更快

2. **并行构建**
   - 多架构构建已并行执行

### 减小镜像大小

1. **清理构建缓存**
   ```dockerfile
   RUN pnpm install --frozen-lockfile && pnpm store prune
   ```

2. **使用 .dockerignore**
   - 已配置排除不必要的文件

## 安全最佳实践

1. **使用 Access Token 而非密码**
   - ✅ 已配置使用 token
   - Token 可以随时撤销

2. **最小权限原则**
   - Token 仅授予必要的权限

3. **定期轮换 Token**
   - 建议每 3-6 个月更新一次

4. **保护 Secrets**
   - 不要在代码中硬编码
   - 不要在日志中输出

## 监控和通知

### GitHub Actions 通知

- 构建失败时会收到邮件通知
- 可在 GitHub 设置中配置通知偏好

### Docker Hub Webhooks（可选）

1. 在 Docker Hub 仓库设置中配置 Webhook
2. 镜像推送成功后触发自动部署

## 版本发布流程

### 发布新版本

```bash
# 1. 确保代码已提交
git add .
git commit -m "Release v1.0.0"

# 2. 创建标签
git tag -a v1.0.0 -m "Release version 1.0.0"

# 3. 推送代码和标签
git push origin main
git push origin v1.0.0

# 4. 等待 GitHub Actions 完成构建
# 5. 验证镜像已推送到 Docker Hub
# 6. 打开 GitHub Release，确认 macOS / Windows 桌面安装包已作为 Assets 上传
```

> 注意：GitHub Release 只会在推送 `v*` 标签时更新。PR 或普通分支构建成功后，下载包位于对应 Actions run 页面底部的 **Artifacts** 区域，不会自动出现在 Release 页面。

### 语义化版本

遵循 [Semantic Versioning](https://semver.org/)：

- **MAJOR** (v1.0.0 → v2.0.0): 不兼容的 API 变更
- **MINOR** (v1.0.0 → v1.1.0): 向后兼容的功能新增
- **PATCH** (v1.0.0 → v1.0.1): 向后兼容的问题修复

## 回滚

如果需要回滚到之前的版本：

```bash
# 1. 拉取旧版本镜像
docker pull shindouhiro/calendar-todo:v1.0.0

# 2. 重新标记为 latest
docker tag shindouhiro/calendar-todo:v1.0.0 shindouhiro/calendar-todo:latest

# 3. 推送（需要本地 Docker Hub 登录）
docker push shindouhiro/calendar-todo:latest
```

或者在 GitHub 上创建新的标签指向旧的提交。

## 相关资源

- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [Docker Hub 文档](https://docs.docker.com/docker-hub/)
- [Docker Buildx 文档](https://docs.docker.com/buildx/working-with-buildx/)
- [语义化版本规范](https://semver.org/)
