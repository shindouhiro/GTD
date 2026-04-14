import { execSync } from 'node:child_process'
import { chmodSync, copyFileSync, cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

const RESOURCES_DIR = path.join(repoRoot, 'src-tauri', 'resources')
const SERVER_RESOURCE_DIR = path.join(RESOURCES_DIR, 'server')
const CLIENT_RESOURCE_DIR = path.join(RESOURCES_DIR, 'client')
const RUNTIME_RESOURCE_DIR = path.join(RESOURCES_DIR, 'runtime')
const API_BASE_URL = 'http://127.0.0.1:3001/api'

function run(cmd, cwd = repoRoot, env = process.env) {
  console.log(`Running: ${cmd} in ${cwd}`)
  execSync(cmd, {
    cwd,
    env,
    stdio: 'inherit',
  })
}

// 清理旧资源
rmSync(RESOURCES_DIR, { recursive: true, force: true })
mkdirSync(SERVER_RESOURCE_DIR, { recursive: true })
mkdirSync(CLIENT_RESOURCE_DIR, { recursive: true })
mkdirSync(RUNTIME_RESOURCE_DIR, { recursive: true })

// 1. 构建并准备 Server 资源 (替代不稳定的 pnpm deploy)
console.log('Building server...')
run('pnpm --filter @todo-app/server build')

// 准备导出的 package.json (将 catalog: 转换为真实版本)
console.log('Preparing server resources (resolving catalogs)...')
const serverPkgPath = path.join(repoRoot, 'packages', 'server', 'package.json')
const serverPkg = JSON.parse(readFileSync(serverPkgPath, 'utf8'))
const workspaceYaml = readFileSync(path.join(repoRoot, 'pnpm-workspace.yaml'), 'utf8')

// 一个简单的正则解析器，用于从 pnpm-workspace.yaml 提取 catalog
const resolveVersion = (name) => {
  const regex = new RegExp(`^\\s+${name}:\\s+["']?(.+?)["']?\\s*$`, 'm')
  const match = workspaceYaml.match(regex)
  return match ? match[1] : null
}

const resolveDeps = (deps) => {
  if (!deps) return
  for (const [name, version] of Object.entries(deps)) {
    if (version.startsWith('catalog:')) {
      const resolved = resolveVersion(name)
      if (resolved) deps[name] = resolved
    }
  }
}

resolveDeps(serverPkg.dependencies)
resolveDeps(serverPkg.devDependencies)

cpSync(path.join(repoRoot, 'packages', 'server', 'dist'), path.join(SERVER_RESOURCE_DIR, 'dist'), { recursive: true })
writeFileSync(path.join(SERVER_RESOURCE_DIR, 'package.json'), JSON.stringify(serverPkg, null, 2))

// 在资源目录安装生产依赖
run('pnpm install --prod --no-frozen-lockfile', SERVER_RESOURCE_DIR)

// 2. 构建并准备 Client 资源
console.log('Building client...')
run('pnpm --filter @todo-app/client build', repoRoot, {
  ...process.env,
  VITE_API_URL: API_BASE_URL,
})

cpSync(path.join(repoRoot, 'packages', 'client', 'dist'), path.join(CLIENT_RESOURCE_DIR, 'dist'), {
  recursive: true,
  force: true,
})

// 3. 准备 Node 运行时
console.log('Preparing runtime...')
const nodeBinaryName = process.platform === 'win32' ? 'node.exe' : 'node'
const nodeTargetPath = path.join(RUNTIME_RESOURCE_DIR, nodeBinaryName)
copyFileSync(process.execPath, nodeTargetPath)

if (process.platform !== 'win32')
  chmodSync(nodeTargetPath, 0o755)

console.log('Tauri resources prepared successfully!')
